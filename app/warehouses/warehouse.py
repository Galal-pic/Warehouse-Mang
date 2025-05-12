from flask_restx import Namespace, Resource, fields
from flask_jwt_extended import jwt_required
from .. import db
from ..models import Warehouse,ItemLocations

warehouse_ns = Namespace('warehouse', description='Warehouse operations')
item_location_ns = Namespace('item_location', description='Item Location operations')
pagination_parser = warehouse_ns.parser()
pagination_parser.add_argument('page',
                               type=str,
                               required=False,
                               default=1, 
                               help='Page number (default: 1)')
pagination_parser.add_argument('page_size',
                               type=str,
                               required=False, 
                               default=10, 
                               help='Number of items per page (default: 10)')
item_location_model = item_location_ns.model('ItemLocation', {
    'location': fields.String(required=True, description='Location of the item in the warehouse'),
    'quantity': fields.Integer(required=True, description='Quantity of the item', example=0)
})

# Warehouse Model
warehouse_model = warehouse_ns.model('Warehouse', {
    'id': fields.Integer(required=True),
    'item_name': fields.String(required=True, description='Name of the warehouse item'),
    'item_bar': fields.String(required=True, description='Barcode of the warehouse item'),
    'locations': fields.List(fields.Nested(item_location_model), description='List of locations for the item')
})


pagination_model = warehouse_ns.model('WarehousePagination', {
    'warehouses': fields.List(fields.Nested(warehouse_model)),
    'page': fields.Integer(required=True),
    'page_size': fields.Integer(required=True),
    'total_pages': fields.Integer(required=True),
    'total_items': fields.Integer(required=True)
})
# Warehouse Endpoints
@warehouse_ns.route('/')
class WarehouseList(Resource):
    @warehouse_ns.marshal_list_with(pagination_model)
    @warehouse_ns.expect(pagination_parser)
    @jwt_required()
    def get(self):
        """Get all warehouse items with their locations"""
        args = pagination_parser.parse_args()
        page = int(args['page'])
        page_size = int(args['page_size'])
        if page < 1 or page_size < 1:
            warehouse_ns.abort(400, "Page and page_size must be positive integers")
        offset = (page - 1) * page_size
        query = Warehouse.query
        warehouse_items = query.limit(page_size).offset(offset).all()
        total_count = query.count()
        
        # warehouse_items = Warehouse.query.all()
        result = []

        for item in warehouse_items:
            # Get all locations for the current warehouse item
            locations = ItemLocations.query.filter_by(item_id=item.id).all()
            

            # Prepare the response for this item
            item_data = {
                "id": item.id,  # Include the id field
                "item_name": item.item_name,
                "item_bar": item.item_bar,
                "locations": [
                    {
                        "location": loc.location,
                        "quantity": loc.quantity
                    }
                    for loc in locations
                ]
            }
            result.append(item_data)

        return {
            'warehouses': result,
            'page': page,
            'page_size': page_size,
            'total_pages': (total_count + page_size - 1) // page_size,
            'total_items': total_count
        }, 200

    # @warehouse_ns.expect(warehouse_model)
    @warehouse_ns.marshal_with(warehouse_model)
    @jwt_required()
    def post(self):
        """Create a new warehouse item"""
        data = warehouse_ns.payload
        # Check if item with the same name or barcode already exists
        existing_item = (Warehouse.query.filter_by(item_name=data['item_name']).first()) or (Warehouse.query.filter_by(item_bar=data['item_bar']).first())

        # If the item and location already exist, abort
        if existing_item :
            warehouse_ns.abort(400, "Item with the same name or barcode and same location already exists")

        # If the item does not exist, create both the item and the location
        elif not existing_item:
            new_item = Warehouse(
                item_name=data["item_name"],
                item_bar=data["item_bar"]
            )
            db.session.add(new_item)
            db.session.commit()

            new_location = ItemLocations(
                item_id=new_item.id,  # Use the ID of the newly created warehouse item
                location=data["locations"][0]["location"],
                quantity=data["locations"][0]["quantity"]
            )
            db.session.add(new_location)
            db.session.commit()

            # Prepare the response
            response = {
                "id": new_item.id,  # Include the id field
                "item_name": new_item.item_name,
                "item_bar": new_item.item_bar,
                "locations": [
                    {
                        "location": new_location.location,
                        "quantity": new_location.quantity
                    }
                ]
            }
            return response, 201

@warehouse_ns.route('/<int:item_id>')
class WarehouseDetail(Resource):
    @warehouse_ns.marshal_with(warehouse_model)
    @jwt_required()
    def get(self, item_id):
        """Get a warehouse item by ID with its locations"""
        item = Warehouse.query.get_or_404(item_id)
        locations = ItemLocations.query.filter_by(item_id=item.id).all()

        # Prepare the response
        response = {
            "id": item.id,  # Include the id field
            "item_name": item.item_name,
            "item_bar": item.item_bar,
            "locations": [
                {
                    "location": loc.location,
                    "quantity": loc.quantity
                }
                for loc in locations
            ]
        }
        return response, 200

    # @warehouse_ns.expect(warehouse_model)
    @warehouse_ns.marshal_with(warehouse_model)
    @jwt_required()
    def put(self, item_id):
        """Update a warehouse item and its locations"""
        data = warehouse_ns.payload
        item = Warehouse.query.get_or_404(item_id)

        # Update warehouse item fields
        item.item_name = data["item_name"]
        item.item_bar = data["item_bar"]

        # Get existing locations for the item
        existing_locations = ItemLocations.query.filter_by(item_id=item.id).all()

        # Create a set of incoming locations for easy comparison
        incoming_locations = {loc_data["location"] for loc_data in data["locations"]}

        # Delete locations that are not in the incoming data
        for existing_loc in existing_locations:
            if existing_loc.location not in incoming_locations:
                db.session.delete(existing_loc)

        # Update or add locations
        for loc_data in data["locations"]:
            location = ItemLocations.query.filter_by(
                item_id=item.id,
                location=loc_data["location"]
            ).first()

            if location:
                # Update existing location
                location.quantity = loc_data["quantity"]
            else:
                # Add new location
                new_location = ItemLocations(
                    item_id=item.id,
                    location=loc_data["location"],
                    quantity=loc_data["quantity"]
                )
                db.session.add(new_location)

        db.session.commit()

        # Prepare the response
        response = {
            "id": item.id,  # Include the id field
            "item_name": item.item_name,
            "item_bar": item.item_bar,
            "locations": [
                {
                    "location": loc_data["location"],
                    "quantity": loc_data["quantity"]
                }
                for loc_data in data["locations"]
            ]
        }
        return response, 200

    @jwt_required()
    def delete(self, item_id):
        """Delete a warehouse item and its associated locations"""
        item = Warehouse.query.get_or_404(item_id)

        # Delete all associated locations
        ItemLocations.query.filter_by(item_id=item.id).delete()

        # Delete the warehouse item
        db.session.delete(item)
        db.session.commit()

        return {"message": "Warehouse item and its locations deleted successfully"}, 200
