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
        """Ultra-fast import with multi-location support - rewritten from scratch"""
        try:
            payload = warehouse_ns.payload
            if not payload or 'data' not in payload:
                warehouse_ns.abort(400, "Invalid payload format")
            
            print(f"Starting fresh import of {len(payload['data'])} items")
            
            # Get employee info
            employee_id = get_jwt_identity()
            employee = Employee.query.filter_by(id=employee_id).first()
            if not employee:
                warehouse_ns.abort(400, "Employee not found")
            
            # Step 1: Parse and validate all input data
            parsed_items = []
            errors = []
            
            for i, raw_item in enumerate(payload['data']):
                row_num = i + 1
                
                # Validate required fields
                if not raw_item.get('item_name') or not raw_item.get('item_bar'):
                    errors.append(f"Row {row_num}: Missing item_name or item_bar")
                    continue
                    
                if 'quantity' not in raw_item:
                    errors.append(f"Row {row_num}: Missing quantity")
                    continue
                
                try:
                    quantity = int(raw_item['quantity'])
                    if quantity <= 0:
                        errors.append(f"Row {row_num}: Quantity must be positive")
                        continue
                except (ValueError, TypeError):
                    errors.append(f"Row {row_num}: Invalid quantity")
                    continue
                
                # Parse price
                unit_price = 0
                if 'price_unit' in raw_item:
                    try:
                        unit_price = float(raw_item['price_unit'])
                    except (ValueError, TypeError):
                        unit_price = 0
                elif 'unit_price' in raw_item:
                    try:
                        unit_price = float(raw_item['unit_price'])
                    except (ValueError, TypeError):
                        unit_price = 0
                
                parsed_items.append({
                    'row_num': row_num,
                    'item_name': str(raw_item['item_name']).strip(),
                    'item_bar': str(raw_item['item_bar']).strip(),
                    'location': str(raw_item.get('location', 'raf1')).strip(),
                    'quantity': quantity,
                    'unit_price': unit_price
                })
            
            if not parsed_items:
                return {
                    'status': 'error',
                    'message': f'No valid items to process. Errors: {errors}'
                }, 400
            
            print(f"Parsed {len(parsed_items)} valid items")
            
            # Step 2: Group items by (name, barcode) to handle multi-location items
            item_groups = {}
            for item in parsed_items:
                key = (item['item_name'], item['item_bar'])
                if key not in item_groups:
                    item_groups[key] = []
                item_groups[key].append(item)
            
            print(f"Found {len(item_groups)} unique item types")
            for key, group in item_groups.items():
                print(f"  {key[0]} | {key[1]} -> {len(group)} locations")
            
            # Step 3: Check which items already exist in database
            all_item_names = [item['item_name'] for item in parsed_items]
            all_item_bars = [item['item_bar'] for item in parsed_items]
            
            existing_items = db.session.query(
                Warehouse.id, Warehouse.item_name, Warehouse.item_bar
            ).filter(
                db.or_(
                    Warehouse.item_name.in_(all_item_names),
                    Warehouse.item_bar.in_(all_item_bars)
                )
            ).all()
            
            existing_by_name_bar = {}  # (name, bar) -> warehouse_id
            existing_by_bar = {}       # bar -> warehouse_id
            
            for existing in existing_items:
                key = (existing.item_name, existing.item_bar)
                existing_by_name_bar[key] = existing.id
                existing_by_bar[existing.item_bar] = existing.id
            
            print(f"Found {len(existing_items)} existing items in database")
            
            # Step 4: Get existing locations for existing items
            existing_locations = {}
            if existing_items:
                locations_query = db.session.query(
                    ItemLocations.item_id, ItemLocations.location, ItemLocations.quantity
                ).filter(ItemLocations.item_id.in_([item.id for item in existing_items]))
                
                for loc in locations_query:
                    if loc.item_id not in existing_locations:
                        existing_locations[loc.item_id] = {}
                    existing_locations[loc.item_id][loc.location] = loc.quantity
            
            # Step 5: Categorize each item group
            new_item_groups = []          # Groups that need new warehouse items
            existing_item_updates = []    # Items for existing warehouse items
            
            for (item_name, item_bar), group in item_groups.items():
                key = (item_name, item_bar)
                
                if key in existing_by_name_bar:
                    # Item exists - add to existing item updates
                    warehouse_id = existing_by_name_bar[key]
                    for item in group:
                        item['warehouse_id'] = warehouse_id
                        item['is_existing'] = True
                        existing_item_updates.append(item)
                        
                elif item_bar in existing_by_bar:
                    # Same barcode, different name - use existing item but warn
                    warehouse_id = existing_by_bar[item_bar]
                    errors.append(f"Warning: Barcode {item_bar} already exists with different name")
                    for item in group:
                        item['warehouse_id'] = warehouse_id
                        item['is_existing'] = True
                        existing_item_updates.append(item)
                        
                else:
                    # Completely new item
                    new_item_groups.append(group)
            
            print(f"Categorization complete:")
            print(f"  New item groups: {len(new_item_groups)}")
            print(f"  Existing item updates: {len(existing_item_updates)}")
            
            # Step 6: Process everything in a transaction
            current_time = datetime.now()
            success_count = 0
            created_invoices = []
            
            # Create new warehouse items first
            new_warehouse_items = []
            for group in new_item_groups:
                # One warehouse item per group
                first_item = group[0]
                warehouse_item = Warehouse(
                    item_name=first_item['item_name'],
                    item_bar=first_item['item_bar'],
                    created_at=current_time
                )
                new_warehouse_items.append(warehouse_item)
                
                # Link all items in group to this warehouse item
                for item in group:
                    item['warehouse_item_obj'] = warehouse_item
                    item['is_existing'] = False
            
            # Bulk save new warehouse items
            if new_warehouse_items:
                db.session.bulk_save_objects(new_warehouse_items, return_defaults=True)
                db.session.flush()
                print(f"Created {len(new_warehouse_items)} new warehouse items")
            
            # Create invoices and process all items
            ITEMS_PER_INVOICE = 10
            all_items_to_process = []
            
            # Add new items
            for group in new_item_groups:
                all_items_to_process.extend(group)
            
            # Add existing items
            all_items_to_process.extend(existing_item_updates)
            
            print(f"Processing {len(all_items_to_process)} total item entries")
            
            # Process in chunks
            invoice_totals = {}
            prices_tracker = {}  # (invoice_id, item_id) -> price_info
            
            for chunk_start in range(0, len(all_items_to_process), ITEMS_PER_INVOICE):
                chunk_end = min(chunk_start + ITEMS_PER_INVOICE, len(all_items_to_process))
                chunk_items = all_items_to_process[chunk_start:chunk_end]
                
                # Create invoice for this chunk
                invoice = Invoice(
                    type="اضافه",
                    client_name="",
                    accreditation_manager=employee.username,
                    total_amount=0,
                    paid=0,
                    residual=0,
                    comment=f"Excel import items {chunk_start+1}-{chunk_end}",
                    status="draft",
                    supplier_id=None,
                    employee_name=employee.username,
                    employee_id=employee.id,
                    machine_id=None,
                    mechanism_id=None,
                    created_at=current_time
                )
                db.session.add(invoice)
                db.session.flush()  # Get invoice ID
                created_invoices.append(invoice)
                invoice_totals[invoice.id] = 0
                
                # Process each item in chunk
                for item in chunk_items:
                    # Get warehouse ID
                    if item['is_existing']:
                        warehouse_id = item['warehouse_id']
                    else:
                        warehouse_id = item['warehouse_item_obj'].id
                    
                    total_price = item['quantity'] * item['unit_price']
                    invoice_totals[invoice.id] += total_price
                    
                    # Handle locations
                    if item['is_existing']:
                        # Check if location exists
                        if (warehouse_id in existing_locations and 
                            item['location'] in existing_locations[warehouse_id]):
                            # Update existing location quantity
                            existing_qty = existing_locations[warehouse_id][item['location']]
                            new_qty = existing_qty + item['quantity']
                            
                            db.session.query(ItemLocations).filter_by(
                                item_id=warehouse_id,
                                location=item['location']
                            ).update({'quantity': new_qty})
                        else:
                            # Create new location for existing item
                            new_location = ItemLocations(
                                item_id=warehouse_id,
                                location=item['location'],
                                quantity=item['quantity']
                            )
                            db.session.add(new_location)
                    else:
                        # Create new location for new item
                        new_location = ItemLocations(
                            item_id=warehouse_id,
                            location=item['location'],
                            quantity=item['quantity']
                        )
                        db.session.add(new_location)
                    
                    # Create invoice item
                    invoice_item = InvoiceItem(
                        invoice_id=invoice.id,
                        item_id=warehouse_id,
                        quantity=item['quantity'],
                        location=item['location'],
                        unit_price=item['unit_price'],
                        total_price=total_price,
                        description=""
                    )
                    db.session.add(invoice_item)
                    
                    # Track prices (consolidate by invoice+item)
                    price_key = (invoice.id, warehouse_id)
                    if price_key not in prices_tracker:
                        prices_tracker[price_key] = {
                            'invoice_id': invoice.id,
                            'item_id': warehouse_id,
                            'total_quantity': 0,
                            'unit_price': item['unit_price'],
                            'created_at': current_time
                        }
                    prices_tracker[price_key]['total_quantity'] += item['quantity']
                    
                    success_count += 1
            
            # Create consolidated price records
            for price_info in prices_tracker.values():
                price_record = Prices(
                    invoice_id=price_info['invoice_id'],
                    item_id=price_info['item_id'],
                    quantity=price_info['total_quantity'],
                    unit_price=price_info['unit_price'],
                    created_at=price_info['created_at']
                )
                db.session.add(price_record)
            
            # Update invoice totals
            for invoice_id, total_amount in invoice_totals.items():
                db.session.query(Invoice).filter_by(id=invoice_id).update({
                    'total_amount': total_amount,
                    'residual': total_amount
                })
            
            # Commit everything
            db.session.commit()
            
            print(f"Successfully processed {success_count} items across {len(created_invoices)} invoices")
            
            return {
                'status': 'success',
                'message': f'Import complete: {success_count} items across {len(created_invoices)} invoices',
                'total_submitted': len(payload['data']),
                'successful_items': success_count,
                'new_warehouse_items': len(new_warehouse_items),
                'existing_item_updates': len(existing_item_updates),
                'invoices_created': len(created_invoices),
                'invoice_ids': [inv.id for inv in created_invoices],
                'errors': errors if errors else None,
                'warnings': len([e for e in errors if 'Warning' in e])
            }, 200
            
        except Exception as e:
            db.session.rollback()
            print(f"Error in import: {str(e)}")
            import traceback
            traceback.print_exc()
            return {
                'status': 'error',
                'message': f'Import failed: {str(e)}',
                'errors': errors if 'errors' in locals() else []
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
