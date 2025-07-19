from flask_restx import Namespace, Resource, fields
from flask_jwt_extended import jwt_required
from sqlalchemy import or_, and_, desc
from ..models import (
    Mechanism,
    Employee,
    Supplier,
    Machine,
    Invoice,
    InvoiceItem,
    Warehouse,
    ItemLocations,
    Prices,
    InvoicePriceDetail,
    PurchaseRequests,
    ReturnSales,
    WarrantyReturn,
)
from datetime import datetime
from ..utils import parse_bool

reports_ns = Namespace("reports", description="Reports operations")

# Define marshalling models for responses
location_model = reports_ns.model('ItemLocation', {
    'location': fields.String(description='Item location'),
    'quantity': fields.Integer(description='Quantity in location')
})

price_model = reports_ns.model('Price', {
    'invoice_id': fields.Integer(description='Invoice ID'),
    'quantity': fields.Integer(description='Quantity'),
    'unit_price': fields.Float(description='Unit price'),
    'created_at': fields.String(description='Created date and time')
})

# Updated invoice item model to include supplier information per item
invoice_item_model = reports_ns.model('InvoiceItem', {
    'item_name': fields.String(description='Item name'),
    'item_bar': fields.String(description='Item barcode'),
    'location': fields.String(description='Item location'),
    'quantity': fields.Integer(description='Quantity'),
    'unit_price': fields.Float(description='Unit price'),
    'total_price': fields.Float(description='Total price'),
    'description': fields.String(description='Description'),
    'supplier_name': fields.String(description='Supplier name for this item'),
    'supplier_id': fields.Integer(description='Supplier ID for this item')
})

invoice_history_model = reports_ns.model('InvoiceHistory', {
    'invoice_id': fields.Integer(description='Invoice ID'),
    'invoice_type': fields.String(description='Invoice type'),
    'invoice_date': fields.String(description='Invoice date'),
    'location': fields.String(description='Location'),
    'quantity': fields.Integer(description='Quantity'),
    'unit_price': fields.Float(description='Unit price'),
    'total_price': fields.Float(description='Total price'),
    'status': fields.String(description='Invoice status'),
    'supplier_name': fields.String(description='Supplier name for this item'),
    'supplier_id': fields.Integer(description='Supplier ID for this item')
})

purchase_request_model = reports_ns.model('PurchaseRequest', {
    'id': fields.Integer(description='Request ID'),
    'status': fields.String(description='Request status'),
    'requested_quantity': fields.Integer(description='Requested quantity'),
    'created_at': fields.String(description='Created date'),
    'updated_at': fields.String(description='Updated date'),
    'subtotal': fields.Float(description='Subtotal'),
    'machine': fields.String(description='Machine name'),
    'mechanism': fields.String(description='Mechanism name'),
    'employee': fields.String(description='Employee username')
})

item_model = reports_ns.model('Item', {
    'id': fields.Integer(description='Item ID'),
    'item_name': fields.String(description='Item name'),
    'item_bar': fields.String(description='Item barcode'),
    'created_at': fields.String(description='Created date'),
    'updated_at': fields.String(description='Updated date'),
    'locations': fields.List(fields.Nested(location_model), description='Item locations'),
    'prices': fields.List(fields.Nested(price_model), description='Price history'),
    'invoice_history': fields.List(fields.Nested(invoice_history_model), description='Invoice history'),
    'purchase_requests': fields.List(fields.Nested(purchase_request_model), description='Purchase requests')
})

# Updated invoice model to remove invoice-level supplier and add suppliers summary
invoice_model = reports_ns.model('Invoice', {
    'id': fields.Integer(description='Invoice ID'),
    'type': fields.String(description='Invoice type'),
    'created_at': fields.String(description='Created date'),
    'client_name': fields.String(description='Client name'),
    'warehouse_manager': fields.String(description='Warehouse manager'),
    'accreditation_manager': fields.String(description='Accreditation manager'),
    'total_amount': fields.Float(description='Total amount'),
    'paid': fields.Float(description='Paid amount'),
    'residual': fields.Float(description='Residual amount'),
    'comment': fields.String(description='Comment'),
    'status': fields.String(description='Status'),
    'employee_name': fields.String(description='Employee name'),
    'machine': fields.String(description='Machine name'),
    'mechanism': fields.String(description='Mechanism name'),
    'suppliers_summary': fields.List(fields.String, description='List of unique suppliers used in this invoice'),
    'items': fields.List(fields.Nested(invoice_item_model), description='Invoice items'),
    'return_sales_info': fields.Raw(description='Return sales information (for مرتجع invoices)')
})

# Create parsers
pagination_parser = reports_ns.parser()
pagination_parser.add_argument(
    "page", type=int, required=False, default=1, help="Page number (default: 1)"
)
pagination_parser.add_argument(
    "page_size",
    type=int,
    required=False,
    default=10,
    help="Number of items per page (default: 10)",
)
pagination_parser.add_argument(
    "all",
    type=parse_bool,
    required=False,
    default=True,
    help="Get all items (default: True) \naccepts values [\'true\', \'false\', \'1\', \'0\', \'t\', \'f\', \'y\', \'n\', \'yes\', \'no\']",
)

# Updated filter parser (removed machine and mechanism filters)
filter_parser = pagination_parser.copy()
filter_parser.add_argument("type", type=str, required=True, help="Report type (invoice, item)")
filter_parser.add_argument("invoice_id", type=int, required=False, help="Filter by specific invoice ID")
filter_parser.add_argument("warehouse_manager", type=str, required=False, help="Filter by warehouse manager")
filter_parser.add_argument("machine", type=str, required=False, help="Filter by machine name")
filter_parser.add_argument("mechanism", type=str, required=False, help="Filter by mechanism name")
filter_parser.add_argument("client_name", type=str, required=False, help="Filter by client name")
filter_parser.add_argument("accreditation_manager", type=str, required=False, help="Filter by accreditation manager")
filter_parser.add_argument("employee_name", type=str, required=False, help="Filter by employee name")
filter_parser.add_argument("supplier", type=str, required=False, help="Filter by supplier name")
filter_parser.add_argument("status", type=str, required=False, help="Filter by invoice status")
filter_parser.add_argument("invoice_type", type=str, required=False, help="Filter by invoice type")
filter_parser.add_argument("item_name", type=str, required=False, help="Filter by item name")
filter_parser.add_argument("item_bar", type=str, required=False, help="Filter by item barcode")
filter_parser.add_argument("location", type=str, required=False, help="Filter by item location")
filter_parser.add_argument("start_date", type=str, required=False, help="Start date (YYYY-MM-DD)")
filter_parser.add_argument("end_date", type=str, required=False, help="End date (YYYY-MM-DD)")

def serialize_value(value):
    if isinstance(value, datetime):
        return value.strftime("%Y-%m-%d %H:%M:%S")  
    return value

@reports_ns.route("/")
class Reports(Resource):
    @reports_ns.expect(pagination_parser)
    @jwt_required()
    def get(self):
        """Get all reports"""
        args = pagination_parser.parse_args()
        page = int(args["page"])
        page_size = int(args["page_size"])
        all_results = bool(args["all"])
        
        if page < 1 or page_size < 1:
            reports_ns.abort(400, "Page and page_size must be positive integers")
            
        offset = (page - 1) * page_size
        
        models = [
            Employee,
            Supplier,
            Machine,
            Mechanism,
            Invoice,
            InvoiceItem,
            Warehouse,
            ItemLocations,
            Prices,
            InvoicePriceDetail,
            PurchaseRequests,
        ]
        
        full_report = {}
        rows_data = []
        
        for model in models:
            table_name = model.__tablename__
            columns = [col.name for col in model.__table__.columns if col.name not in ["password", "password_hash"]]
            
            # Add DESC ordering by id if the model has an id column
            query = model.query
            if hasattr(model, 'id'):
                query = query.order_by(desc(model.id))
            
            if not all_results:
                row_data = [
                    {col: serialize_value(getattr(row, col)) for col in columns}
                    for row in query.limit(page_size).offset(offset).all()
                ]
            else:
                row_data = [
                    {col: serialize_value(getattr(row, col)) for col in columns}
                    for row in query.all()
                ]
                
            full_report[table_name] = row_data
            rows_data.append({table_name: row_data})
            
        return full_report, 200

@reports_ns.route("/filter")
class FilterReports(Resource):
    @reports_ns.expect(filter_parser)
    @reports_ns.expect(pagination_parser)
    @jwt_required()
    def get(self):
        """Filter reports based on query parameters"""
        args = filter_parser.parse_args()
        report_type = args["type"]
        page = int(args["page"])
        page_size = int(args["page_size"])
        all_results = bool(args["all"])
        
        if page < 1 or page_size < 1:
            reports_ns.abort(400, "Page and page_size must be positive integers")
            
        offset = (page - 1) * page_size
        
        # Parse dates if provided
        start_date = None
        end_date = None
        
        if args["start_date"]:
            try:
                start_date = datetime.strptime(args["start_date"], "%Y-%m-%d")
            except ValueError:
                reports_ns.abort(400, "Invalid start_date format. Use YYYY-MM-DD")
                
        if args["end_date"]:
            try:
                end_date = datetime.strptime(args["end_date"], "%Y-%m-%d")
                # Set to end of day
                end_date = end_date.replace(hour=23, minute=59, second=59)
            except ValueError:
                reports_ns.abort(400, "Invalid end_date format. Use YYYY-MM-DD")
        
        if report_type == "invoice":
            return self._filter_invoices(args, start_date, end_date, page_size, offset, all_results)
        elif report_type == "item":
            return self._filter_items(args, start_date, end_date, page_size, offset, all_results)
        else:
            reports_ns.abort(400, f"Unsupported report type: {report_type}")
    
    
            
    def _filter_machines(self, args, start_date, end_date, page_size, offset, all_results):
        """Filter machines and get related data with nested pagination"""
        # Start with base query
        query = Machine.query
        
        # Apply filters with exact matching
        if args["machine"]:
            query = query.filter(Machine.name == args["machine"])
        
        # Get total count for pagination info
        total_count = query.count()
        
        # Apply pagination or get all
        if all_results:
            machines = query.all()
        else:
            machines = query.limit(page_size).offset(offset).all()
        
        # Use existing pagination parameters for nested lists
        nested_page = int(args["page"])
        nested_page_size = int(args["page_size"])
        nested_offset = (nested_page - 1) * nested_page_size
        
        # Prepare results
        result = []
        for machine in machines:
            # Get related invoices with pagination
            invoices_query = Invoice.query.filter(Invoice.machine_id == machine.id)
            
            # Apply invoice_id filter if provided
            if args["invoice_id"]:
                invoices_query = invoices_query.filter(Invoice.id == args["invoice_id"])
            
            # Apply invoice_type filter if provided
            if args["invoice_type"]:
                invoices_query = invoices_query.filter(Invoice.type == args["invoice_type"])
            
            # Apply other invoice filters if provided
            if args["status"]:
                invoices_query = invoices_query.filter(Invoice.status == args["status"])
                
            if args["warehouse_manager"]:
                invoices_query = invoices_query.filter(Invoice.warehouse_manager.ilike(f"%{args['warehouse_manager']}%"))
                
            if args["client_name"]:
                invoices_query = invoices_query.filter(Invoice.client_name.ilike(f"%{args['client_name']}%"))
                
            if args["accreditation_manager"]:
                invoices_query = invoices_query.filter(Invoice.accreditation_manager.ilike(f"%{args['accreditation_manager']}%"))
                
            if args["employee_name"]:
                invoices_query = invoices_query.filter(Invoice.employee_name.ilike(f"%{args['employee_name']}%"))
            
            # Apply date filters if provided
            if start_date:
                invoices_query = invoices_query.filter(Invoice.created_at >= start_date)
            if end_date:
                invoices_query = invoices_query.filter(Invoice.created_at <= end_date)
            
            # Count total invoices for this machine
            total_invoices = invoices_query.count()
            
            # Apply nested pagination to invoices
            if all_results:
                invoices = invoices_query.all()
            else:
                invoices = invoices_query.limit(nested_page_size).offset(nested_offset).all()
            
            # Get related purchase requests with pagination
            purchase_requests_query = PurchaseRequests.query.filter(PurchaseRequests.machine_id == machine.id)
            
            # Apply date filters if provided
            if start_date:
                purchase_requests_query = purchase_requests_query.filter(PurchaseRequests.created_at >= start_date)
            if end_date:
                purchase_requests_query = purchase_requests_query.filter(PurchaseRequests.created_at <= end_date)
            
            # Count total purchase requests
            total_purchase_requests = purchase_requests_query.count()
            
            # Apply nested pagination to purchase requests
            if all_results:
                purchase_requests = purchase_requests_query.all()
            else:
                purchase_requests = purchase_requests_query.limit(nested_page_size).offset(nested_offset).all()
            
            # Get warranty returns for this machine
            warranty_returns_query = WarrantyReturn.query.join(Invoice).filter(Invoice.machine_id == machine.id)
            
            # Apply date filters to warranty returns
            if start_date:
                warranty_returns_query = warranty_returns_query.filter(WarrantyReturn.return_date >= start_date)
            if end_date:
                warranty_returns_query = warranty_returns_query.filter(WarrantyReturn.return_date <= end_date)
                
            # Apply warranty invoice filter if provided
            if args["invoice_id"]:
                warranty_returns_query = warranty_returns_query.filter(WarrantyReturn.warranty_invoice_id == args["invoice_id"])
                
            total_warranty_returns = warranty_returns_query.count()
            
            # Apply nested pagination to warranty returns
            if all_results:
                warranty_returns = warranty_returns_query.all()
            else:
                warranty_returns = warranty_returns_query.limit(nested_page_size).offset(nested_offset).all()
            
            # Get items related to this machine through BOTH purchase requests AND invoices
            item_ids_from_prs = [pr.item_id for pr in purchase_requests_query.all()]  # Get all PR item IDs
            
            # Get item IDs from invoices for this machine (applying same filters)
            invoice_items_query = InvoiceItem.query.join(Invoice).filter(Invoice.machine_id == machine.id)
            
            # Apply the same filters to get consistent item IDs
            if args["invoice_id"]:
                invoice_items_query = invoice_items_query.filter(Invoice.id == args["invoice_id"])
            if args["invoice_type"]:
                invoice_items_query = invoice_items_query.filter(Invoice.type == args["invoice_type"])
            if args["status"]:
                invoice_items_query = invoice_items_query.filter(Invoice.status == args["status"])
            if start_date:
                invoice_items_query = invoice_items_query.filter(Invoice.created_at >= start_date)
            if end_date:
                invoice_items_query = invoice_items_query.filter(Invoice.created_at <= end_date)
                
            item_ids_from_invoices = [ii.item_id for ii in invoice_items_query.all()]
            
            # Combine both sets of item IDs
            all_item_ids = list(set(item_ids_from_prs + item_ids_from_invoices))
            
            # Get the actual items
            if all_item_ids:
                related_items_query = Warehouse.query.filter(Warehouse.id.in_(all_item_ids))
            else:
                related_items_query = Warehouse.query.filter(False)  # No items
            
            # Count total related items
            total_items = related_items_query.count() if all_item_ids else 0
            
            # Apply nested pagination to items
            if all_results:
                related_items = related_items_query.all() if all_item_ids else []
            else:
                related_items = related_items_query.limit(nested_page_size).offset(nested_offset).all() if all_item_ids else []
            
            # Serialize data
            serialized_invoices = self._serialize_invoices(invoices)
            serialized_items = self._serialize_items_for_machine(related_items, purchase_requests, machine, args)
            serialized_prs = self._serialize_purchase_requests(purchase_requests)
            
            # Serialize warranty returns
            serialized_warranty_returns = [{
                "id": wr.id,
                "warranty_invoice_id": wr.warranty_invoice_id,
                "item_id": wr.item_id,
                "item_name": wr.item.item_name,
                "item_bar": wr.item.item_bar,
                "location": wr.location,
                "returned_quantity": wr.returned_quantity,
                "return_date": serialize_value(wr.return_date),
                "returned_by": wr.returned_by.username,
                "notes": wr.notes,
                "warranty_invoice_client": wr.warranty_invoice.client_name,
                "warranty_invoice_status": wr.warranty_invoice.status
            } for wr in warranty_returns]
            
            # Build machine data with pagination info for nested lists
            machine_data = {
                "id": machine.id,
                "name": machine.name,
                "description": machine.description,
                "invoices": {
                    "total": total_invoices,
                    "page": nested_page,
                    "page_size": nested_page_size,
                    "pages": (total_invoices + nested_page_size - 1) // nested_page_size,
                    "results": serialized_invoices
                },
                "items": {
                    "total": total_items,
                    "page": nested_page,
                    "page_size": nested_page_size,
                    "pages": (total_items + nested_page_size - 1) // nested_page_size,
                    "results": serialized_items
                },
                "purchase_requests": {
                    "total": total_purchase_requests,
                    "page": nested_page,
                    "page_size": nested_page_size,
                    "pages": (total_purchase_requests + nested_page_size - 1) // nested_page_size,
                    "results": serialized_prs
                },
                "warranty_returns": {
                    "total": total_warranty_returns,
                    "page": nested_page,
                    "page_size": nested_page_size,
                    "pages": (total_warranty_returns + nested_page_size - 1) // nested_page_size,
                    "results": serialized_warranty_returns
                }
            }
            result.append(machine_data)
        
        return {
            "total": total_count,
            "page": args["page"],
            "page_size": page_size,
            "pages": (total_count + page_size - 1) // page_size,
            "results": result
        }, 200
    
    def _filter_mechanisms(self, args, start_date, end_date, page_size, offset, all_results):
        """Filter mechanisms and get related data with nested pagination"""
        # Start with base query
        query = Mechanism.query
        
        # Apply filters with exact matching
        if args["mechanism"]:
            query = query.filter(Mechanism.name == args["mechanism"])
        
        # Get total count for pagination info
        total_count = query.count()
        
        # Apply pagination or get all
        if all_results:
            mechanisms = query.all()
        else:
            mechanisms = query.limit(page_size).offset(offset).all()
        
        # Use existing pagination parameters for nested lists
        nested_page = int(args["page"])
        nested_page_size = int(args["page_size"])
        nested_offset = (nested_page - 1) * nested_page_size
        
        # Prepare results
        result = []
        for mechanism in mechanisms:
            # Get related invoices with pagination
            invoices_query = Invoice.query.filter(Invoice.mechanism_id == mechanism.id)
            
            # Apply invoice_id filter if provided
            if args["invoice_id"]:
                invoices_query = invoices_query.filter(Invoice.id == args["invoice_id"])
            
            # Apply invoice_type filter if provided
            if args["invoice_type"]:
                invoices_query = invoices_query.filter(Invoice.type == args["invoice_type"])
            
            # Apply other invoice filters if provided
            if args["status"]:
                invoices_query = invoices_query.filter(Invoice.status == args["status"])
                
            if args["warehouse_manager"]:
                invoices_query = invoices_query.filter(Invoice.warehouse_manager.ilike(f"%{args['warehouse_manager']}%"))
                
            if args["client_name"]:
                invoices_query = invoices_query.filter(Invoice.client_name.ilike(f"%{args['client_name']}%"))
                
            if args["accreditation_manager"]:
                invoices_query = invoices_query.filter(Invoice.accreditation_manager.ilike(f"%{args['accreditation_manager']}%"))
                
            if args["employee_name"]:
                invoices_query = invoices_query.filter(Invoice.employee_name.ilike(f"%{args['employee_name']}%"))
            
            # Apply date filters if provided
            if start_date:
                invoices_query = invoices_query.filter(Invoice.created_at >= start_date)
            if end_date:
                invoices_query = invoices_query.filter(Invoice.created_at <= end_date)
            
            # Count total invoices for this mechanism
            total_invoices = invoices_query.count()
            
            # Apply nested pagination to invoices
            if all_results:
                invoices = invoices_query.all()
            else:
                invoices = invoices_query.limit(nested_page_size).offset(nested_offset).all()
            
            # Get related purchase requests with pagination
            purchase_requests_query = PurchaseRequests.query.filter(PurchaseRequests.mechanism_id == mechanism.id)
            
            # Apply date filters if provided
            if start_date:
                purchase_requests_query = purchase_requests_query.filter(PurchaseRequests.created_at >= start_date)
            if end_date:
                purchase_requests_query = purchase_requests_query.filter(PurchaseRequests.created_at <= end_date)
            
            # Count total purchase requests
            total_purchase_requests = purchase_requests_query.count()
            
            # Apply nested pagination to purchase requests
            if all_results:
                purchase_requests = purchase_requests_query.all()
            else:
                purchase_requests = purchase_requests_query.limit(nested_page_size).offset(nested_offset).all()
            
            # Get warranty returns for this mechanism
            warranty_returns_query = WarrantyReturn.query.join(Invoice).filter(Invoice.mechanism_id == mechanism.id)
            
            # Apply date filters to warranty returns
            if start_date:
                warranty_returns_query = warranty_returns_query.filter(WarrantyReturn.return_date >= start_date)
            if end_date:
                warranty_returns_query = warranty_returns_query.filter(WarrantyReturn.return_date <= end_date)
                
            # Apply warranty invoice filter if provided
            if args["invoice_id"]:
                warranty_returns_query = warranty_returns_query.filter(WarrantyReturn.warranty_invoice_id == args["invoice_id"])
                
            total_warranty_returns = warranty_returns_query.count()
            
            # Apply nested pagination to warranty returns
            if all_results:
                warranty_returns = warranty_returns_query.all()
            else:
                warranty_returns = warranty_returns_query.limit(nested_page_size).offset(nested_offset).all()
            
            # Get items related to this mechanism through BOTH purchase requests AND invoices
            item_ids_from_prs = [pr.item_id for pr in purchase_requests_query.all()]  # Get all PR item IDs
            
            # Get item IDs from invoices for this mechanism (applying same filters)
            invoice_items_query = InvoiceItem.query.join(Invoice).filter(Invoice.mechanism_id == mechanism.id)
            
            # Apply the same filters to get consistent item IDs
            if args["invoice_id"]:
                invoice_items_query = invoice_items_query.filter(Invoice.id == args["invoice_id"])
            if args["invoice_type"]:
                invoice_items_query = invoice_items_query.filter(Invoice.type == args["invoice_type"])
            if args["status"]:
                invoice_items_query = invoice_items_query.filter(Invoice.status == args["status"])
            if start_date:
                invoice_items_query = invoice_items_query.filter(Invoice.created_at >= start_date)
            if end_date:
                invoice_items_query = invoice_items_query.filter(Invoice.created_at <= end_date)
                
            item_ids_from_invoices = [ii.item_id for ii in invoice_items_query.all()]
            
            # Combine both sets of item IDs
            all_item_ids = list(set(item_ids_from_prs + item_ids_from_invoices))
            
            # Get the actual items
            if all_item_ids:
                related_items_query = Warehouse.query.filter(Warehouse.id.in_(all_item_ids))
            else:
                related_items_query = Warehouse.query.filter(False)  # No items
            
            # Count total related items
            total_items = related_items_query.count() if all_item_ids else 0
            
            # Apply nested pagination to items
            if all_results:
                related_items = related_items_query.all() if all_item_ids else []
            else:
                related_items = related_items_query.limit(nested_page_size).offset(nested_offset).all() if all_item_ids else []
            
            # Serialize data
            serialized_invoices = self._serialize_invoices(invoices)
            serialized_items = self._serialize_items_for_mechanism(related_items, purchase_requests, mechanism, args)
            serialized_prs = self._serialize_purchase_requests(purchase_requests)
            
            # Serialize warranty returns
            serialized_warranty_returns = [{
                "id": wr.id,
                "warranty_invoice_id": wr.warranty_invoice_id,
                "item_id": wr.item_id,
                "item_name": wr.item.item_name,
                "item_bar": wr.item.item_bar,
                "location": wr.location,
                "returned_quantity": wr.returned_quantity,
                "return_date": serialize_value(wr.return_date),
                "returned_by": wr.returned_by.username,
                "notes": wr.notes,
                "warranty_invoice_client": wr.warranty_invoice.client_name,
                "warranty_invoice_status": wr.warranty_invoice.status
            } for wr in warranty_returns]
            
            # Build mechanism data with pagination info for nested lists
            mechanism_data = {
                "id": mechanism.id,
                "name": mechanism.name,
                "description": mechanism.description,
                "invoices": {
                    "total": total_invoices,
                    "page": nested_page,
                    "page_size": nested_page_size,
                    "pages": (total_invoices + nested_page_size - 1) // nested_page_size,
                    "results": serialized_invoices
                },
                "items": {
                    "total": total_items,
                    "page": nested_page,
                    "page_size": nested_page_size,
                    "pages": (total_items + nested_page_size - 1) // nested_page_size,
                    "results": serialized_items
                },
                "purchase_requests": {
                    "total": total_purchase_requests,
                    "page": nested_page,
                    "page_size": nested_page_size,
                    "pages": (total_purchase_requests + nested_page_size - 1) // nested_page_size,
                    "results": serialized_prs
                },
                "warranty_returns": {
                    "total": total_warranty_returns,
                    "page": nested_page,
                    "page_size": nested_page_size,
                    "pages": (total_warranty_returns + nested_page_size - 1) // nested_page_size,
                    "results": serialized_warranty_returns
                }
            }
            result.append(mechanism_data)
        
        return {
            "total": total_count,
            "page": args["page"],
            "page_size": page_size,
            "pages": (total_count + page_size - 1) // page_size,
            "results": result
        }, 200
    
    def _filter_invoices(self, args, start_date, end_date, page_size, offset, all_results):
        """Filter invoices based on provided parameters"""
        # Start with base query with DESC ordering
        query = Invoice.query.order_by(desc(Invoice.id))
        
        # Apply invoice_id filter if provided (exact match)
        if args["invoice_id"]:
            query = query.filter(Invoice.id == args["invoice_id"])
        
        # Apply filters if they exist
        if args["warehouse_manager"]:
            query = query.filter(Invoice.warehouse_manager.ilike(f"%{args['warehouse_manager']}%"))
            
        if args["client_name"]:
            query = query.filter(Invoice.client_name.ilike(f"%{args['client_name']}%"))
            
        if args["accreditation_manager"]:
            query = query.filter(Invoice.accreditation_manager.ilike(f"%{args['accreditation_manager']}%"))
            
        if args["employee_name"]:
            query = query.filter(Invoice.employee_name.ilike(f"%{args['employee_name']}%"))
            
        if args["status"]:
            query = query.filter(Invoice.status == args["status"])
            
        if args["invoice_type"]:
            query = query.filter(Invoice.type == args["invoice_type"])
            
        # Join with other tables for related filters
        if args["machine"]:
            query = query.join(Machine).filter(Machine.name.ilike(f"%{args['machine']}%"))
            
        if args["mechanism"]:
            query = query.join(Mechanism).filter(Mechanism.name.ilike(f"%{args['mechanism']}%"))
            
        # Updated supplier filter to check item-level suppliers
        if args["supplier"]:
            # Filter invoices that have items with the specified supplier
            query = query.join(InvoiceItem).join(Supplier, InvoiceItem.supplier_id == Supplier.id).filter(
                Supplier.name.ilike(f"%{args['supplier']}%")
            ).distinct()
            
        # Apply date filters
        if start_date:
            query = query.filter(Invoice.created_at >= start_date)
            
        if end_date:
            query = query.filter(Invoice.created_at <= end_date)
        
        # Get total count for pagination info
        total_count = query.count()
        
        # Apply pagination or get all
        if all_results:
            invoices = query.all()
        else:
            invoices = query.limit(page_size).offset(offset).all()
        
        # Serialize results with warranty return information and supplier per item
        result = []
        for invoice in invoices:
            invoice_data = {
                "id": invoice.id,
                "type": invoice.type,
                "created_at": serialize_value(invoice.created_at),
                "client_name": invoice.client_name,
                "warehouse_manager": invoice.warehouse_manager,
                "accreditation_manager": invoice.accreditation_manager,
                "total_amount": invoice.total_amount,
                "paid": invoice.paid,
                "residual": invoice.residual,
                "comment": invoice.comment,
                "status": invoice.status,
                "employee_name": invoice.employee_name,
                
                # Add related entities
                "machine": invoice.machine.name if invoice.machine else None,
                "mechanism": invoice.mechanism.name if invoice.mechanism else None,
                # Remove invoice-level supplier since it's now per item
            }
            
            # Enhanced items with warranty return information and supplier info
            items_with_return_info = []
            suppliers_used = set()  # Track unique suppliers for summary
            
            for item in invoice.items:
                # Get supplier information for this item
                supplier_name = None
                supplier_id = None
                if hasattr(item, 'supplier_id') and item.supplier_id:
                    supplier = Supplier.query.get(item.supplier_id)
                    if supplier:
                        supplier_name = supplier.name
                        supplier_id = supplier.id
                        suppliers_used.add(supplier_name)
                elif hasattr(item, 'supplier_name') and item.supplier_name:
                    supplier_name = item.supplier_name
                    suppliers_used.add(supplier_name)
                
                # Get return history for this specific item in this invoice
                returned_quantity = 0
                return_history = []
                
                if invoice.type == 'أمانات':  # Only for warranty invoices
                    item_returns = WarrantyReturn.query.filter_by(
                        warranty_invoice_id=invoice.id,
                        item_id=item.item_id,
                        location=item.location
                    ).all()
                    
                    returned_quantity = sum(wr.returned_quantity for wr in item_returns)
                    return_history = [{
                        "id": wr.id,
                        "returned_quantity": wr.returned_quantity,
                        "return_date": serialize_value(wr.return_date),
                        "returned_by": wr.returned_by.username,
                        "notes": wr.notes
                    } for wr in item_returns]
                
                item_data = {
                    "item_name": item.warehouse.item_name,
                    "item_bar": item.warehouse.item_bar,
                    "location": item.location,
                    "quantity": item.quantity,
                    "unit_price": item.unit_price,
                    "total_price": item.total_price,
                    "description": item.description,
                    "supplier_name": supplier_name,  # NEW: supplier per item
                    "supplier_id": supplier_id,      # NEW: supplier ID per item
                    "returned_quantity": returned_quantity,
                    "remaining_quantity": item.quantity - returned_quantity,
                    "return_history": return_history
                }
                items_with_return_info.append(item_data)
            
            invoice_data["items"] = items_with_return_info
            invoice_data["suppliers_summary"] = list(suppliers_used)  # NEW: Summary of suppliers used
            
            # Add warranty return summary for warranty invoices
            if invoice.type == 'أمانات':
                all_warranty_returns = WarrantyReturn.query.filter_by(warranty_invoice_id=invoice.id).all()
                
                items_with_returns = len(set((wr.item_id, wr.location) for wr in all_warranty_returns))
                fully_returned_items = 0
                partially_returned_items = 0
                
                # Calculate return statistics
                for item in invoice.items:
                    item_returns = [wr for wr in all_warranty_returns 
                                if wr.item_id == item.item_id and wr.location == item.location]
                    if item_returns:
                        total_returned = sum(wr.returned_quantity for wr in item_returns)
                        if total_returned >= item.quantity:
                            fully_returned_items += 1
                        else:
                            partially_returned_items += 1
                
                invoice_data["warranty_return_summary"] = {
                    "total_returns": len(all_warranty_returns),
                    "total_returned_items": sum(wr.returned_quantity for wr in all_warranty_returns),
                    "items_with_returns": items_with_returns,
                    "fully_returned_items": fully_returned_items,
                    "partially_returned_items": partially_returned_items
                }
            
            # Add ReturnSales information if invoice type is "مرتجع"
            if invoice.type == "مرتجع":
                return_sales_record = ReturnSales.query.filter_by(return_invoice_id=invoice.id).first()
                if return_sales_record:
                    # Get the original sales invoice
                    original_invoice = return_sales_record.sales_invoice
                    invoice_data['return_sales_info'] = {
                        'original_invoice_id': return_sales_record.sales_invoice_id,
                        'original_invoice_type': original_invoice.type if original_invoice else None,
                        'original_invoice_date': serialize_value(original_invoice.created_at) if original_invoice else None,
                        'original_client_name': original_invoice.client_name if original_invoice else None,
                        'original_total_amount': original_invoice.total_amount if original_invoice else None,
                        'original_employee_name': original_invoice.employee_name if original_invoice else None,
                        'original_status': original_invoice.status if original_invoice else None
                    }
                else:
                    invoice_data['return_sales_info'] = None
            
            result.append(invoice_data)
        
        return {
            "total": total_count,
            "page": args["page"],
            "page_size": page_size,
            "pages": (total_count + page_size - 1) // page_size,
            "results": result
        }, 200
        
    def _filter_items(self, args, start_date, end_date, page_size, offset, all_results):
        """Filter warehouse items based on provided parameters"""
        # Start with base query with DESC ordering
        query = Warehouse.query.order_by(desc(Warehouse.id))
        
        # Apply filters if they exist - using exact matching by default
        if args["item_name"]:
            query = query.filter(Warehouse.item_name == args["item_name"])
            
        if args["item_bar"]:
            query = query.filter(Warehouse.item_bar == args["item_bar"])
        
        # Get total count for pagination info
        total_count = query.count()
        
        # Apply pagination or get all
        if all_results:
            items = query.all()
        else:
            items = query.limit(page_size).offset(offset).all()
        
        # Prepare results
        result = []
        for item in items:
            # Get all locations for this item
            locations = [{
                "location": loc.location,
                "quantity": loc.quantity
            } for loc in item.item_locations]
            
            # Get all invoices for this item, applying filters if needed
            invoice_items_query = InvoiceItem.query.filter(InvoiceItem.item_id == item.id).join(Invoice).order_by(desc(Invoice.id))
            
            # Apply invoice_id filter if provided
            if args["invoice_id"]:
                invoice_items_query = invoice_items_query.filter(Invoice.id == args["invoice_id"])
            
            if args["invoice_type"]:
                invoice_items_query = invoice_items_query.filter(Invoice.type == args["invoice_type"])
                
            if start_date:
                invoice_items_query = invoice_items_query.filter(Invoice.created_at >= start_date)
                
            if end_date:
                invoice_items_query = invoice_items_query.filter(Invoice.created_at <= end_date)
                
            if args["location"]:
                invoice_items_query = invoice_items_query.filter(InvoiceItem.location.ilike(f"%{args['location']}%"))
            
            invoice_items = invoice_items_query.all()
            
            # Get pricing history (filter by invoice_id if provided) with DESC ordering
            if args["invoice_id"]:
                prices = [price for price in item.prices if price.invoice_id == args["invoice_id"]]
            else:
                prices = sorted(item.prices, key=lambda x: x.invoice_id, reverse=True)
            
            prices_serialized = [{
                "invoice_id": price.invoice_id,
                "quantity": price.quantity,
                "unit_price": price.unit_price,
                "created_at": serialize_value(price.created_at)
            } for price in prices]
            
            # Get warranty returns for this item with DESC ordering
            warranty_returns_query = WarrantyReturn.query.filter(WarrantyReturn.item_id == item.id).order_by(desc(WarrantyReturn.id))
            
            # Apply date filters to warranty returns
            if start_date:
                warranty_returns_query = warranty_returns_query.filter(WarrantyReturn.return_date >= start_date)
            if end_date:
                warranty_returns_query = warranty_returns_query.filter(WarrantyReturn.return_date <= end_date)
            if args["location"]:
                warranty_returns_query = warranty_returns_query.filter(WarrantyReturn.location.ilike(f"%{args['location']}%"))
                
            warranty_returns = warranty_returns_query.all()
            
            # Build enhanced invoice history with warranty return information and supplier info
            invoice_history = []
            for inv_item in invoice_items:
                # Get supplier information for this item
                supplier_name = None
                supplier_id = None
                if hasattr(inv_item, 'supplier_id') and inv_item.supplier_id:
                    supplier = Supplier.query.get(inv_item.supplier_id)
                    if supplier:
                        supplier_name = supplier.name
                        supplier_id = supplier.id
                elif hasattr(inv_item, 'supplier_name') and inv_item.supplier_name:
                    supplier_name = inv_item.supplier_name
                
                # Calculate warranty return info for this specific invoice item
                returned_quantity = 0
                if inv_item.invoice.type == 'أمانات':
                    item_returns = WarrantyReturn.query.filter_by(
                        warranty_invoice_id=inv_item.invoice_id,
                        item_id=item.id,
                        location=inv_item.location
                    ).all()
                    returned_quantity = sum(wr.returned_quantity for wr in item_returns)
                
                invoice_history.append({
                    "invoice_id": inv_item.invoice_id,
                    "invoice_type": inv_item.invoice.type,
                    "invoice_date": serialize_value(inv_item.invoice.created_at),
                    "location": inv_item.location,
                    "quantity": inv_item.quantity,
                    "unit_price": inv_item.unit_price,
                    "total_price": inv_item.total_price,
                    "status": inv_item.invoice.status,
                    "supplier_name": supplier_name,  # NEW: supplier per item
                    "supplier_id": supplier_id,      # NEW: supplier ID per item
                    "returned_quantity": returned_quantity,
                    "remaining_quantity": inv_item.quantity - returned_quantity
                })
            
            # Build item data with all relevant information including warranty returns
            item_data = {
                "id": item.id,
                "item_name": item.item_name,
                "item_bar": item.item_bar,
                "created_at": serialize_value(item.created_at),
                "updated_at": serialize_value(item.updated_at),
                "locations": locations,
                "prices": prices_serialized,
                "invoice_history": invoice_history,
                "warranty_returns": [{
                    "id": wr.id,
                    "warranty_invoice_id": wr.warranty_invoice_id,
                    "location": wr.location,
                    "returned_quantity": wr.returned_quantity,
                    "return_date": serialize_value(wr.return_date),
                    "returned_by": wr.returned_by.username,
                    "notes": wr.notes,
                    "warranty_invoice_type": wr.warranty_invoice.type,
                    "warranty_invoice_client": wr.warranty_invoice.client_name
                } for wr in warranty_returns],
                "purchase_requests": [{
                    "id": req.id,
                    "status": req.status,
                    "requested_quantity": req.requested_quantity,
                    "created_at": serialize_value(req.created_at),
                    "updated_at": serialize_value(req.updated_at),
                    "subtotal": req.subtotal,
                    "machine": req.machine.name if req.machine else None,
                    "mechanism": req.mechanism.name if req.mechanism else None,
                    "employee": req.employee.username if req.employee else None
                } for req in sorted(item.purchase_requests, key=lambda x: x.id, reverse=True)]
            }
            
            result.append(item_data)
        
        return {
            "total": total_count,
            "page": args["page"],
            "page_size": page_size,
            "pages": (total_count + page_size - 1) // page_size,
            "results": result
        }, 200
        
    def _get_warranty_returns_for_entity(self, entity_type, entity_id, start_date=None, end_date=None):
        """Get warranty returns for a specific machine or mechanism"""
        if entity_type == 'machine':
            warranty_returns_query = WarrantyReturn.query.join(Invoice).filter(Invoice.machine_id == entity_id)
        else:  # mechanism
            warranty_returns_query = WarrantyReturn.query.join(Invoice).filter(Invoice.mechanism_id == entity_id)
        
        # Apply date filters
        if start_date:
            warranty_returns_query = warranty_returns_query.filter(WarrantyReturn.return_date >= start_date)
        if end_date:
            warranty_returns_query = warranty_returns_query.filter(WarrantyReturn.return_date <= end_date)
        
        return warranty_returns_query.order_by(desc(WarrantyReturn.id)).all()

    def _serialize_invoices(self, invoices):
        """Serialize invoices data with warranty return information and supplier per item"""
        serialized_invoices = []
        for invoice in invoices:
            invoice_data = {
                "id": invoice.id,
                "type": invoice.type,
                "created_at": serialize_value(invoice.created_at),
                "client_name": invoice.client_name,
                "warehouse_manager": invoice.warehouse_manager,
                "accreditation_manager": invoice.accreditation_manager,
                "total_amount": invoice.total_amount,
                "paid": invoice.paid,
                "residual": invoice.residual,
                "comment": invoice.comment,
                "status": invoice.status,
                "employee_name": invoice.employee_name,
                "machine": invoice.machine.name if invoice.machine else None,
                "mechanism": invoice.mechanism.name if invoice.mechanism else None,
                # Remove invoice-level supplier since it's now per item
            }
            
            # Enhanced items with warranty return information and supplier info
            items_with_return_info = []
            suppliers_used = set()  # Track unique suppliers for summary
            
            for item in invoice.items:
                # Get supplier information for this item
                supplier_name = None
                supplier_id = None
                if hasattr(item, 'supplier_id') and item.supplier_id:
                    supplier = Supplier.query.get(item.supplier_id)
                    if supplier:
                        supplier_name = supplier.name
                        supplier_id = supplier.id
                        suppliers_used.add(supplier_name)
                elif hasattr(item, 'supplier_name') and item.supplier_name:
                    supplier_name = item.supplier_name
                    suppliers_used.add(supplier_name)
                
                # Get return history for warranty invoices
                returned_quantity = 0
                return_history = []
                
                if invoice.type == 'أمانات':
                    item_returns = WarrantyReturn.query.filter_by(
                        warranty_invoice_id=invoice.id,
                        item_id=item.item_id,
                        location=item.location
                    ).all()
                    
                    returned_quantity = sum(wr.returned_quantity for wr in item_returns)
                    return_history = [{
                        "returned_quantity": wr.returned_quantity,
                        "return_date": serialize_value(wr.return_date),
                        "returned_by": wr.returned_by.username,
                        "notes": wr.notes
                    } for wr in item_returns]
                
                items_with_return_info.append({
                    "item_name": item.warehouse.item_name,
                    "item_bar": item.warehouse.item_bar,
                    "location": item.location,
                    "quantity": item.quantity,
                    "unit_price": item.unit_price,
                    "total_price": item.total_price,
                    "description": item.description,
                    "supplier_name": supplier_name,  # NEW: supplier per item
                    "supplier_id": supplier_id,      # NEW: supplier ID per item
                    "returned_quantity": returned_quantity,
                    "remaining_quantity": item.quantity - returned_quantity,
                    "return_history": return_history
                })
            
            invoice_data["items"] = items_with_return_info
            invoice_data["suppliers_summary"] = list(suppliers_used)  # NEW: Summary of suppliers used
            
            # Add warranty return summary for warranty invoices
            if invoice.type == 'أمانات':
                all_warranty_returns = WarrantyReturn.query.filter_by(warranty_invoice_id=invoice.id).all()
                invoice_data["warranty_return_summary"] = {
                    "total_returns": len(all_warranty_returns),
                    "total_returned_items": sum(wr.returned_quantity for wr in all_warranty_returns)
                }
            
            # Add ReturnSales information if invoice type is "مرتجع"
            if invoice.type == "مرتجع":
                return_sales_record = ReturnSales.query.filter_by(return_invoice_id=invoice.id).first()
                if return_sales_record:
                    original_invoice = return_sales_record.sales_invoice
                    invoice_data['return_sales_info'] = {
                        'original_invoice_id': return_sales_record.sales_invoice_id,
                        'original_invoice_type': original_invoice.type if original_invoice else None,
                        'original_invoice_date': serialize_value(original_invoice.created_at) if original_invoice else None,
                        'original_client_name': original_invoice.client_name if original_invoice else None,
                        'original_total_amount': original_invoice.total_amount if original_invoice else None
                    }
                else:
                    invoice_data['return_sales_info'] = None
            
            serialized_invoices.append(invoice_data)
        return serialized_invoices

    def _serialize_purchase_requests(self, purchase_requests):
        """Serialize purchase requests data"""
        return [{
            "id": pr.id,
            "status": pr.status,
            "requested_quantity": pr.requested_quantity,
            "created_at": serialize_value(pr.created_at),
            "updated_at": serialize_value(pr.updated_at),
            "subtotal": pr.subtotal,
            "machine": pr.machine.name if pr.machine else None,
            "mechanism": pr.mechanism.name if pr.mechanism else None,
            "employee": pr.employee.username if pr.employee else None
        } for pr in purchase_requests]

    def _serialize_items_for_machine(self, related_items, purchase_requests, machine, args):
        """Serialize items data for machine reports with invoice_id filtering"""
        serialized_items = []
        for item in related_items:
            # Get all locations for this item
            locations = [{
                "location": loc.location,
                "quantity": loc.quantity
            } for loc in item.item_locations]
            
            # Get this machine's purchase requests for this item
            machine_prs = [pr for pr in purchase_requests if pr.item_id == item.id]
            
            # Get all invoices for this item related to this machine
            invoice_items_query = InvoiceItem.query.join(Invoice).filter(
                and_(
                    InvoiceItem.item_id == item.id,
                    Invoice.machine_id == machine.id
                )
            )
            
            # Apply invoice_id filter if provided
            if args["invoice_id"]:
                invoice_items_query = invoice_items_query.filter(Invoice.id == args["invoice_id"])
            
            invoice_items = invoice_items_query.all()
            
            # Get pricing history (filter by invoice_id if provided)
            prices_query = item.prices
            if args["invoice_id"]:
                prices = [price for price in prices_query if price.invoice_id == args["invoice_id"]]
            else:
                prices = list(prices_query)
            
            prices_serialized = [{
                "invoice_id": price.invoice_id,
                "quantity": price.quantity,
                "unit_price": price.unit_price,
                "created_at": serialize_value(price.created_at)
            } for price in prices]
            
            # Build item data
            item_data = {
                "id": item.id,
                "item_name": item.item_name,
                "item_bar": item.item_bar,
                "created_at": serialize_value(item.created_at),
                "updated_at": serialize_value(item.updated_at),
                "locations": locations,
                "prices": prices_serialized,
                "invoice_history": [{
                    "invoice_id": inv_item.invoice_id,
                    "invoice_type": inv_item.invoice.type,
                    "invoice_date": serialize_value(inv_item.invoice.created_at),
                    "location": inv_item.location,
                    "quantity": inv_item.quantity,
                    "unit_price": inv_item.unit_price,
                    "total_price": inv_item.total_price,
                    "status": inv_item.invoice.status
                } for inv_item in invoice_items],
                "purchase_requests": [{
                    "id": pr.id,
                    "status": pr.status,
                    "requested_quantity": pr.requested_quantity,
                    "created_at": serialize_value(pr.created_at),
                    "updated_at": serialize_value(pr.updated_at),
                    "subtotal": pr.subtotal,
                    "machine": pr.machine.name if pr.machine else None,
                    "mechanism": pr.mechanism.name if pr.mechanism else None,
                    "employee": pr.employee.username if pr.employee else None
                } for pr in machine_prs]
            }
            serialized_items.append(item_data)
        return serialized_items

    def _serialize_items_for_mechanism(self, related_items, purchase_requests, mechanism, args):
        """Serialize items data for mechanism reports with invoice_id filtering"""
        serialized_items = []
        for item in related_items:
            # Get all locations for this item
            locations = [{
                "location": loc.location,
                "quantity": loc.quantity
            } for loc in item.item_locations]
            
            # Get this mechanism's purchase requests for this item
            mechanism_prs = [pr for pr in purchase_requests if pr.item_id == item.id]
            
            # Get all invoices for this item related to this mechanism
            invoice_items_query = InvoiceItem.query.join(Invoice).filter(
                and_(
                    InvoiceItem.item_id == item.id,
                    Invoice.mechanism_id == mechanism.id
                )
            )
            
            # Apply invoice_id filter if provided
            if args["invoice_id"]:
                invoice_items_query = invoice_items_query.filter(Invoice.id == args["invoice_id"])
            
            invoice_items = invoice_items_query.all()
            
            # Get pricing history (filter by invoice_id if provided)
            prices_query = item.prices
            if args["invoice_id"]:
                prices = [price for price in prices_query if price.invoice_id == args["invoice_id"]]
            else:
                prices = list(prices_query)
            
            prices_serialized = [{
                "invoice_id": price.invoice_id,
                "quantity": price.quantity,
                "unit_price": price.unit_price,
                "created_at": serialize_value(price.created_at)
            } for price in prices]
            
            # Build item data
            item_data = {
                "id": item.id,
                "item_name": item.item_name,
                "item_bar": item.item_bar,
                "created_at": serialize_value(item.created_at),
                "updated_at": serialize_value(item.updated_at),
                "locations": locations,
                "prices": prices_serialized,
                "invoice_history": [{
                    "invoice_id": inv_item.invoice_id,
                    "invoice_type": inv_item.invoice.type,
                    "invoice_date": serialize_value(inv_item.invoice.created_at),
                    "location": inv_item.location,
                    "quantity": inv_item.quantity,
                    "unit_price": inv_item.unit_price,
                    "total_price": inv_item.total_price,
                    "status": inv_item.invoice.status
                } for inv_item in invoice_items],
                "purchase_requests": [{
                    "id": pr.id,
                    "status": pr.status,
                    "requested_quantity": pr.requested_quantity,
                    "created_at": serialize_value(pr.created_at),
                    "updated_at": serialize_value(pr.updated_at),
                    "subtotal": pr.subtotal,
                    "machine": pr.machine.name if pr.machine else None,
                    "mechanism": pr.mechanism.name if pr.mechanism else None,
                    "employee": pr.employee.username if pr.employee else None
                } for pr in mechanism_prs]
            }
            serialized_items.append(item_data)
        return serialized_items