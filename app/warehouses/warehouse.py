from flask_restx import Namespace, Resource, fields
from flask_jwt_extended import jwt_required, get_jwt_identity
from .. import db
from ..models import Warehouse,ItemLocations, Invoice, Employee, InvoiceItem, Prices
from ..utils import parse_bool
from datetime import datetime

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
pagination_parser.add_argument('all',
                               type=parse_bool,
                               required=False, 
                               default=True, 
                               help='Get all items (default: True) \naccepts values [\'true\', \'false\', \'1\', \'0\', \'t\', \'f\', \'y\', \'n\', \'yes\', \'no\']')
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
    'total_items': fields.Integer(required=True),
    'all': fields.Boolean(required=True)
})

@warehouse_ns.route('/excel')
class WarehouseExcelUltraFast(Resource):
    @jwt_required()
    def post(self):
        """Ultra-fast import using bulk_save_objects"""
        try:
            payload = warehouse_ns.payload
            if not payload or 'data' not in payload:
                warehouse_ns.abort(400, "Invalid payload format")
            if 'warehouse_manager' not in payload:
                warehouse_ns.abort(400, "warehouse_manager is required")
            
            print(f"Processing {len(payload['data'])} items with ultra-fast method")
            
            errors = []
            success_count = 0
            employee_id = get_jwt_identity()
            employee = Employee.query.filter_by(id=employee_id).first()
            
            if not employee:
                warehouse_ns.abort(400, "Employee not found")
            
            # Data validation and deduplication (same as above)
            valid_items = []
            item_names = []
            item_bars = []
            
            for i, item in enumerate(payload['data']):
                if not item.get('item_name') or not item.get('item_bar') or 'quantity' not in item:
                    continue
                
                item_name = str(item['item_name']).strip()
                item_bar = str(item['item_bar']).strip()
                quantity = int(item['quantity'])
                location = item.get('location', 'raf1')
                
                valid_items.append({
                    'item_name': item_name,
                    'item_bar': item_bar,
                    'quantity': quantity,
                    'location': location
                })
                
                item_names.append(item_name)
                item_bars.append(item_bar)
            
            # Duplicate check (same as above)
            existing_items_query = db.session.query(
                Warehouse.item_name, Warehouse.item_bar
            ).filter(
                db.or_(
                    Warehouse.item_name.in_(item_names),
                    Warehouse.item_bar.in_(item_bars)
                )
            )
            
            existing_names = {name for name, _ in existing_items_query}
            existing_bars = {bar for _, bar in existing_items_query}
            
            unique_items = []
            seen_names = set()
            seen_bars = set()
            
            for item in valid_items:
                if (item['item_name'] not in existing_names and 
                    item['item_bar'] not in existing_bars and
                    item['item_name'] not in seen_names and
                    item['item_bar'] not in seen_bars):
                    
                    seen_names.add(item['item_name'])
                    seen_bars.add(item['item_bar'])
                    unique_items.append(item)
            
            # ULTRA-FAST PROCESSING: Create all objects in memory first
            ITEMS_PER_INVOICE = 10
            current_time = datetime.now()
            
            all_warehouse_items = []
            all_invoices = []
            all_item_locations = []
            all_invoice_items = []
            all_prices = []
            
            # Create invoices and items in batches
            for chunk_start in range(0, len(unique_items), ITEMS_PER_INVOICE):
                chunk_end = min(chunk_start + ITEMS_PER_INVOICE, len(unique_items))
                chunk_items = unique_items[chunk_start:chunk_end]
                
                # Create invoice
                invoice = Invoice(
                    type="اضافه",
                    client_name="",
                    warehouse_manager=payload.get("warehouse_manager"),
                    accreditation_manager=payload.get("warehouse_manager"),
                    total_amount=0,
                    paid=0,
                    residual=0,
                    comment=f"Bulk import - Items {chunk_start+1} to {chunk_end}",
                    status="draft",
                    supplier_id=None,
                    employee_name=employee.username,
                    employee_id=employee.id,
                    machine_id=None,
                    mechanism_id=None,
                    created_at=current_time
                )
                all_invoices.append(invoice)
                
                # Create warehouse items for this chunk
                for item in chunk_items:
                    warehouse_item = Warehouse(
                        item_name=item['item_name'],
                        item_bar=item['item_bar'],
                        created_at=current_time
                    )
                    all_warehouse_items.append(warehouse_item)
                    
                    # We'll need to link these after getting IDs
                    item['warehouse_item_obj'] = warehouse_item
                    item['invoice_obj'] = invoice
            
            # BULK SAVE ALL OBJECTS
            try:
                # Save all invoices
                db.session.bulk_save_objects(all_invoices, return_defaults=True)
                db.session.flush()
                
                # Save all warehouse items
                db.session.bulk_save_objects(all_warehouse_items, return_defaults=True)
                db.session.flush()
                
                # Now create dependent objects with the generated IDs
                for item in unique_items:
                    warehouse_item = item['warehouse_item_obj']
                    invoice = item['invoice_obj']
                    
                    all_item_locations.append(ItemLocations(
                        item_id=warehouse_item.id,
                        location=item['location'],
                        quantity=item['quantity']
                    ))
                    
                    all_invoice_items.append(InvoiceItem(
                        invoice_id=invoice.id,
                        item_id=warehouse_item.id,
                        quantity=item['quantity'],
                        location=item['location'],
                        unit_price=0,
                        total_price=0,
                        description=""
                    ))
                    
                    all_prices.append(Prices(
                        invoice_id=invoice.id,
                        item_id=warehouse_item.id,
                        quantity=item['quantity'],
                        unit_price=0,
                        created_at=current_time
                    ))
                    
                    success_count += 1
                
                # Bulk save dependent objects
                db.session.bulk_save_objects(all_item_locations)
                db.session.bulk_save_objects(all_invoice_items)
                db.session.bulk_save_objects(all_prices)
                
                db.session.commit()
                
                invoice_ids = [invoice.id for invoice in all_invoices]
                
                return {
                    'status': 'success',
                    'message': f'Ultra-fast import: {success_count} items across {len(invoice_ids)} invoices',
                    'total_submitted': len(payload['data']),
                    'successful_items': success_count,
                    'invoices_created': len(invoice_ids),
                    'invoice_ids': invoice_ids,
                    'items_per_invoice': ITEMS_PER_INVOICE
                }, 200
                
            except Exception as e:
                db.session.rollback()
                return {
                    'status': 'error',
                    'message': f'Ultra-fast bulk operation failed: {str(e)}'
                }, 500
                
        except Exception as e:
            db.session.rollback()
            return {
                'status': 'error',
                'message': f'Unexpected error: {str(e)}'
            }, 500

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
        all_results = bool(args['all'])
        if page < 1 or page_size < 1:
            warehouse_ns.abort(400, "Page and page_size must be positive integers")
        offset = (page - 1) * page_size
        query = Warehouse.query
        if not all_results:
            warehouse_items = query.limit(page_size).offset(offset).all()
        else:
            warehouse_items = query.all()
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
            'total_items': total_count,
            'all': all_results
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
