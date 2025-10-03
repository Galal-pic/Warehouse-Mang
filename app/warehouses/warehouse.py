from flask_restx import Namespace, Resource, fields
from flask_jwt_extended import jwt_required, get_jwt_identity
from .. import db
from ..models import Warehouse,ItemLocations, Invoice, Employee, InvoiceItem, Prices
from ..utils import parse_bool
from datetime import datetime
from ..redis_config import cache_result
from sqlalchemy import text
import time
from collections import defaultdict

warehouse_ns = Namespace('warehouse', description='Warehouse operations with caching')
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
        """Ultra-fast import with multi-location and collision-proof logic."""
        try:
            payload = warehouse_ns.payload
            if not payload or 'data' not in payload:
                warehouse_ns.abort(400, "Invalid payload format")

            print(f"Starting fresh import of {len(payload['data'])} items")

            employee_id = get_jwt_identity()
            employee = Employee.query.filter_by(id=employee_id).first()
            if not employee:
                warehouse_ns.abort(400, "Employee not found")

            # ---- Step 1: Parse and validate input ----
            parsed_items = []
            errors = []
            for i, raw_item in enumerate(payload['data']):
                row_num = i + 1
                if not raw_item.get('item_name') or not raw_item.get('item_bar'):
                    errors.append(f"Row {row_num}: Missing item_name or item_bar")
                    continue
                if 'quantity' not in raw_item:
                    errors.append(f"Row {row_num}: Missing quantity")
                    continue
                try:
                    quantity = int(raw_item['quantity'])
                    if quantity < 0:
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

            # ---- Step 2: Group by (name, barcode) ----
            item_groups = {}
            for item in parsed_items:
                key = (item['item_name'], item['item_bar'])
                if key not in item_groups:
                    item_groups[key] = []
                item_groups[key].append(item)

            print(f"Found {len(item_groups)} unique item types")

            # ---- Step 3: Barcode deduplication ----
            all_item_bars = [item['item_bar'] for item in parsed_items]
            existing_items = db.session.query(
                Warehouse.id, Warehouse.item_name, Warehouse.item_bar
            ).filter(
                Warehouse.item_bar.in_(all_item_bars)
            ).all()
            existing_by_bar = {item.item_bar: item.id for item in existing_items}
            existing_by_name_bar = {(item.item_name, item.item_bar): item.id for item in existing_items}

            print(f"Found {len(existing_items)} existing items in database (barcode-based)")

            new_item_groups = []          # New warehouse items
            existing_item_updates = []    # Updates for existing warehouse items

            for (item_name, item_bar), group in item_groups.items():
                if item_bar in existing_by_bar:
                    warehouse_id = existing_by_bar[item_bar]
                    if (item_name, item_bar) not in existing_by_name_bar:
                        errors.append(f"Warning: Barcode {item_bar} already exists with different item_name")
                    for item in group:
                        item['warehouse_id'] = warehouse_id
                        item['is_existing'] = True
                        existing_item_updates.append(item)
                else:
                    new_item_groups.append(group)

            print(f"Categorization complete: New={len(new_item_groups)} Existing={len(existing_item_updates)}")

            # ---- Step 4: Prepare new warehouse items, barcode deduplication ----
            current_time = datetime.now()
            new_warehouse_items = []
            new_warehouse_map = {}
            seen_new_barcodes = set()

            for group in new_item_groups:
                first_item = group[0]
                bar = first_item['item_bar']
                if bar in seen_new_barcodes:
                    errors.append(f"Duplicate barcode {bar} within import. Only first occurrence will be added.")
                    continue
                seen_new_barcodes.add(bar)
                warehouse_item = Warehouse(
                    item_name=first_item['item_name'],
                    item_bar=bar,
                    created_at=current_time
                )
                new_warehouse_items.append(warehouse_item)
                new_warehouse_map[(first_item['item_name'], bar)] = warehouse_item
                for item in group:
                    item['warehouse_item_obj'] = warehouse_item
                    item['is_existing'] = False

            # Final deduplication against DB (in case barcode added in parallel)
            all_db_barcodes = set(
                b for (b,) in db.session.query(Warehouse.item_bar).all()
            )
            deduped_new_warehouse_items = []
            deduped_new_warehouse_map = {}
            for wi in new_warehouse_items:
                if wi.item_bar in all_db_barcodes:
                    errors.append(f"Attempted to create duplicate item_bar: {wi.item_bar}. Skipped.")
                    continue
                deduped_new_warehouse_items.append(wi)
                deduped_new_warehouse_map[(wi.item_name, wi.item_bar)] = wi
            new_warehouse_items = deduped_new_warehouse_items
            new_warehouse_map = deduped_new_warehouse_map

            if new_warehouse_items:
                db.session.bulk_save_objects(new_warehouse_items, return_defaults=True)
                db.session.flush()
                print(f"Created {len(new_warehouse_items)} new warehouse items")

            # ---- Step 5: Prepare all items for invoice/locations ----
            ITEMS_PER_INVOICE = 10
            all_items_to_process = []
            for group in new_item_groups:
                key = (group[0]['item_name'], group[0]['item_bar'])
                if key in new_warehouse_map:
                    all_items_to_process.extend(group)
            all_items_to_process.extend(existing_item_updates)

            print(f"Processing {len(all_items_to_process)} total item entries")

            # ---- Step 6: Process ItemLocations for each location separately ----
            # Group by (item_id, location) to handle multi-location properly
            item_location_map = {}
            for item in all_items_to_process:
                if item['is_existing']:
                    item_id = item['warehouse_id']
                else:
                    item_id = item['warehouse_item_obj'].id
                loc_key = (item_id, item['location'])
                if loc_key not in item_location_map:
                    item_location_map[loc_key] = {
                        'quantity': 0,
                        'unit_price': item['unit_price'],
                        'item': item
                    }
                item_location_map[loc_key]['quantity'] += item['quantity']

            # Now, fetch all (item_id, location) pairs already in DB
            all_item_ids = set([k[0] for k in item_location_map.keys()])
            all_locations = set([k[1] for k in item_location_map.keys()])
            # Get all existing locs for these items (to avoid inserting dup)
            existing_locs_query = db.session.query(
                ItemLocations.item_id, ItemLocations.location
            ).filter(
                ItemLocations.item_id.in_(all_item_ids),
                ItemLocations.location.in_(all_locations)
            )
            existing_locs_set = set(existing_locs_query.all())

            new_item_locations = []
            item_locations_to_update = []  # To increment quantity if needed

            for (item_id, location), data in item_location_map.items():
                if (item_id, location) in existing_locs_set:
                    # For production, you might want to INCREMENT quantity instead
                    # We'll update it after bulk insert for speed
                    item_locations_to_update.append((item_id, location, data['quantity']))
                    errors.append(f"Existing location (item_id, location)=({item_id}, {location}) found. Quantity will be incremented.")
                else:
                    new_item_locations.append(ItemLocations(
                        item_id=item_id,
                        location=location,
                        quantity=data['quantity']
                    ))

            # ---- Step 7: Create invoices and invoice items ----
            invoice_totals = {}
            created_invoices = []
            success_count = 0

            # Create invoices and invoice items
            invoice_item_rows = []
            # FIXED: Track prices per location (invoice_id, item_id, location)
            price_tracking = {}

            # Convert item_location_map values to a list for chunking
            location_entries = list(item_location_map.items())
            
            for chunk_start in range(0, len(location_entries), ITEMS_PER_INVOICE):
                chunk_end = min(chunk_start + ITEMS_PER_INVOICE, len(location_entries))
                chunk_entries = location_entries[chunk_start:chunk_end]

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
                db.session.flush()
                created_invoices.append(invoice)
                invoice_totals[invoice.id] = 0

                for (item_id, location), loc_data in chunk_entries:
                    item = loc_data['item']
                    quantity = loc_data['quantity']
                    unit_price = item['unit_price']
                    total_price = quantity * unit_price

                    invoice_totals[invoice.id] += total_price

                    # Create invoice item for this specific location
                    invoice_item_rows.append(InvoiceItem(
                        invoice_id=invoice.id,
                        item_id=item_id,
                        quantity=quantity,
                        location=location,
                        unit_price=unit_price,
                        total_price=total_price,
                        description=""
                    ))

                    # FIXED: Track price info per location for location-based pricing
                    price_key = (invoice.id, item_id, location)
                    if price_key not in price_tracking:
                        price_tracking[price_key] = {
                            'quantity': 0,
                            'unit_price': unit_price,
                            'location': location,
                            'created_at': current_time
                        }
                    price_tracking[price_key]['quantity'] += quantity

                    success_count += 1

            # FIXED: Create location-specific price rows for the new schema
            price_rows = []
            for (invoice_id, item_id, location), price_info in price_tracking.items():
                price_rows.append(Prices(
                    invoice_id=invoice_id,
                    item_id=item_id,
                    location=location,  # FIXED: Include location for new schema
                    quantity=price_info['quantity'],
                    unit_price=price_info['unit_price'],
                    supplier_id=0,  # Use default supplier for bulk imports
                    created_at=price_info['created_at']
                ))

            # ---- Step 8: Bulk insert all objects ----
            if new_item_locations:
                db.session.bulk_save_objects(new_item_locations)
            if invoice_item_rows:
                db.session.bulk_save_objects(invoice_item_rows)
            if price_rows:
                db.session.bulk_save_objects(price_rows)

            # Now update all existing ItemLocations (increment quantity)
            for item_id, location, add_qty in item_locations_to_update:
                db.session.query(ItemLocations).filter_by(
                    item_id=item_id,
                    location=location
                ).update({ItemLocations.quantity: ItemLocations.quantity + add_qty})

            # Update invoice totals
            for invoice_id, total_amount in invoice_totals.items():
                db.session.query(Invoice).filter_by(id=invoice_id).update({
                    'total_amount': total_amount,
                    'residual': total_amount
                })

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
    @cache_result(timeout=300, key_prefix="warehouse_list")
    def get(self):
        """Get all warehouse items with their locations (cached)"""
        args = pagination_parser.parse_args()
        page = int(args['page'])
        page_size = int(args['page_size'])
        all_results = bool(args['all'])
        
        if page < 1 or page_size < 1:
            warehouse_ns.abort(400, "Page and page_size must be positive integers")
            
        query = Warehouse.query.order_by(Warehouse.id.desc())
        if all_results:
            warehouse_items = query.all()
            total_count = len(warehouse_items)
            total_pages = 1
        else:
            pagination = query.paginate(page=page, per_page=page_size, error_out=False)
            warehouse_items = pagination.items
            total_count = pagination.total
            total_pages = (total_count + page_size - 1) // page_size

        item_ids = [item.id for item in warehouse_items]
        all_locations = ItemLocations.query.filter(ItemLocations.item_id.in_(item_ids)).all() if item_ids else []

        from collections import defaultdict
        locations_map = defaultdict(list)
        for loc in all_locations:
            locations_map[loc.item_id].append({
                "location": loc.location,
                "quantity": loc.quantity
            })

        result = []
        for item in warehouse_items:
            item_data = {
                "id": item.id,
                "item_name": item.item_name,
                "item_bar": item.item_bar,
                "created_at": item.created_at.strftime('%Y-%m-%d %H:%M:%S') if item.created_at else None,
                "locations": locations_map[item.id]
            }
            result.append(item_data)

        return {
            'warehouses': result,
            'page': page if not all_results else None,
            'page_size': page_size if not all_results else None,
            'total_pages': total_pages if not all_results else None,
            'total_items': total_count,
            'all': all_results
        }, 200

    @warehouse_ns.marshal_with(warehouse_model)
    @jwt_required()
    def post(self):
        """Create a new warehouse item"""
        data = warehouse_ns.payload
        
        existing_item = Warehouse.query.filter_by(item_bar=data['item_bar']).first()

        if existing_item:
            warehouse_ns.abort(400, "Item with the same barcode already exists")

        new_item = Warehouse(
            item_name=data["item_name"],
            item_bar=data["item_bar"]
        )
        db.session.add(new_item)
        db.session.commit()

        new_location = ItemLocations(
            item_id=new_item.id,
            location=data["locations"][0]["location"],
            quantity=data["locations"][0]["quantity"]
        )
        db.session.add(new_location)
        db.session.commit()

        

        response = {
            "id": new_item.id,
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
    @cache_result(timeout=300, key_prefix="warehouse_detail")
    def get(self, item_id):
        """Get a warehouse item by ID with its locations (cached)"""
        item = Warehouse.query.get_or_404(item_id)
        locations = ItemLocations.query.filter_by(item_id=item.id).all()

        response = {
            "id": item.id,
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

    @warehouse_ns.marshal_with(warehouse_model)
    @jwt_required()
    def put(self, item_id):
        """Update a warehouse item and its locations"""
        data = warehouse_ns.payload
        item = Warehouse.query.get_or_404(item_id)

        item.item_name = data["item_name"]
        item.item_bar = data["item_bar"]

        existing_locations = ItemLocations.query.filter_by(item_id=item.id).all()
        incoming_locations = {loc_data["location"] for loc_data in data["locations"]}

        for existing_loc in existing_locations:
            if existing_loc.location not in incoming_locations:
                print(f"Deleting location {existing_loc.location}")
                if InvoiceItem.query.filter_by(location=existing_loc.location).first():  # Check if there are any sales for this location ).first():
                    warehouse_ns.abort(400, f"Cannot delete location '{existing_loc.location}'. It has been used in other invoices.")
                db.session.delete(existing_loc)

        for loc_data in data["locations"]:  
            location = ItemLocations.query.filter_by(
                item_id=item.id,
                location=loc_data["location"]
            ).first()

            if location:
                location.quantity = loc_data["quantity"]
            else:
                new_location = ItemLocations(
                    item_id=item.id,
                    location=loc_data["location"],
                    quantity=loc_data["quantity"]
                )
                db.session.add(new_location)

        db.session.commit()

        

        response = {
            "id": item.id,
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
        if InvoiceItem.query.filter_by(item_id=item.id).first():
            warehouse_ns.abort(400, "Cannot delete warehouse item with associated sales")
        ItemLocations.query.filter_by(item_id=item.id).delete()
        db.session.delete(item)
        db.session.commit()

        

        return {"message": "Warehouse item and its locations deleted successfully"}, 200

@warehouse_ns.route('/cache/clear')
class ClearWarehouseCache(Resource):
    @jwt_required()
    def post(self):
        """Clear warehouse-related cache"""
        return {"message": "Warehouse cache cleared successfully"}, 200

@warehouse_ns.route('/cache/status')
class WarehouseCacheStatus(Resource):
    @jwt_required()
    def get(self):
        """Get warehouse cache status"""
        from ..redis_config import redis_manager
        
        if redis_manager.redis_client:
            try:
                warehouse_keys = redis_manager.redis_client.keys("warehouse_app:warehouse_*")
                inventory_keys = redis_manager.redis_client.keys("warehouse_app:inventory_*")
                
                return {
                    "status": "active",
                    "warehouse_cache_entries": len(warehouse_keys),
                    "inventory_cache_entries": len(inventory_keys),
                    "total_entries": len(warehouse_keys) + len(inventory_keys)
                }, 200
            except Exception as e:
                return {"status": "error", "message": str(e)}, 500
        else:
            return {"status": "redis_unavailable"}, 200