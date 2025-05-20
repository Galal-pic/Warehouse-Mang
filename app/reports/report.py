from flask_restx import Namespace, Resource
from flask_jwt_extended import jwt_required
from ..models import (
    Mechanism,
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
)
import datetime
from ..utils import parse_bool
reports_ns = Namespace("reports", description="Mechanism operations")
pagination_parser = reports_ns.parser()
filter_parser = reports_ns.parser()
pagination_parser.add_argument(
    "page", type=str, required=False, default=1, help="Page number (default: 1)"
)

pagination_parser.add_argument(
    "page_size",
    type=str,
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
filter_parser.add_argument(
    "page", type=str, required=False, default=1, help="Page number (default: 1)"
)

filter_parser.add_argument(
    "page_size",
    type=str,
    required=False,
    default=10,
    help="Number of items per page (default: 10)",
)

filter_parser.add_argument(
    "all",
    type=parse_bool,
    required=False,
    default=True,
    help="Get all items (default: True) \naccepts values [\'true\', \'false\', \'1\', \'0\', \'t\', \'f\', \'y\', \'n\', \'yes\', \'no\']",
)

filter_parser.add_argument("type", type=str, required=True, help="Report type (invoice, item, etc.)")

filter_parser.add_argument("warehouse_manager", type=str, required=False, help="Filter by warehouse manager")
filter_parser.add_argument("machine", type=str, required=False, help="Filter by machine name")
filter_parser.add_argument("mechanism", type=str, required=False, help="Filter by mechanism name")
filter_parser.add_argument("client_name", type=str, required=False, help="Filter by client name")
filter_parser.add_argument("accreditation_manager", type=str, required=False, help="Filter by accreditation manager")
filter_parser.add_argument("employee_name", type=str, required=False, help="Filter by employee name")
filter_parser.add_argument("supplier", type=str, required=False, help="Filter by supplier name")
filter_parser.add_argument("status", type=str, required=False, help="Filter by invoice status")
filter_parser.add_argument("invoice_type", type=str, required=False, help="Filter by invoice type")

# Item filters
filter_parser.add_argument("item_name", type=str, required=False, help="Filter by item name")
filter_parser.add_argument("item_bar", type=str, required=False, help="Filter by item barcode")
filter_parser.add_argument("location", type=str, required=False, help="Filter by item location")

# Date filters
filter_parser.add_argument("start_date", type=str, required=False, help="Start date (YYYY-MM-DD)")
filter_parser.add_argument("end_date", type=str, required=False, help="End date (YYYY-MM-DD)")
def serialize_value(value):
    if isinstance(value, datetime.datetime):
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
            if not all_results:
                row_data = [
                    {col: serialize_value(getattr(row, col)) for col in columns}
                    for row in model.query.limit(page_size).offset(offset).all()
                ]
            else:
                row_data = [
                    {col: serialize_value(getattr(row, col)) for col in columns}
                    for row in model.query.all()
                ]
            full_report[table_name] = row_data
            rows_data.append({table_name: row_data})
            
        return full_report, 200

@reports_ns.route("/filter")
class FilterReports(Resource):
    @reports_ns.expect(filter_parser)
    @jwt_required()
    def get(self):
        """Filter reports based on query parameters"""
        args = filter_parser.parse_args()
        report_type = args["type"]
        page = args["page"]
        page_size = args["page_size"]
        all_results = args["all"]
        
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
    
    def _filter_invoices(self, args, start_date, end_date, page_size, offset, all_results):
        """Filter invoices based on provided parameters"""
        # Start with base query
        query = Invoice.query
        
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
            
        if args["supplier"]:
            query = query.join(Supplier).filter(Supplier.name.ilike(f"%{args['supplier']}%"))
            
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
        
        # Serialize results
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
                "supplier": invoice.supplier.name if invoice.supplier else None,
                
                # Add related items
                "items": [{
                    "item_name": item.warehouse.item_name,
                    "item_bar": item.warehouse.item_bar,
                    "location": item.location,
                    "quantity": item.quantity,
                    "unit_price": item.unit_price,
                    "total_price": item.total_price,
                    "description": item.description
                } for item in invoice.items]
            }
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
        # Start with base query
        query = Warehouse.query
        
        # Apply filters if they exist
        if args["item_name"]:
            query = query.filter(Warehouse.item_name.ilike(f"%{args['item_name']}%"))
            
        if args["item_bar"]:
            query = query.filter(Warehouse.item_bar.ilike(f"%{args['item_bar']}%"))
        
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
            invoice_items_query = InvoiceItem.query.filter(InvoiceItem.item_id == item.id).join(Invoice)
            
            if args["invoice_type"]:
                invoice_items_query = invoice_items_query.filter(Invoice.type == args["invoice_type"])
                
            if start_date:
                invoice_items_query = invoice_items_query.filter(Invoice.created_at >= start_date)
                
            if end_date:
                invoice_items_query = invoice_items_query.filter(Invoice.created_at <= end_date)
                
            if args["location"]:
                invoice_items_query = invoice_items_query.filter(InvoiceItem.location.ilike(f"%{args['location']}%"))
            
            invoice_items = invoice_items_query.all()
            
            # Get pricing history
            prices = [{
                "invoice_id": price.invoice_id,
                "quantity": price.quantity,
                "unit_price": price.unit_price,
                "created_at": serialize_value(price.created_at)
            } for price in item.prices]
            
            # Build item data with all relevant information
            item_data = {
                "id": item.id,
                "item_name": item.item_name,
                "item_bar": item.item_bar,
                "created_at": serialize_value(item.created_at),
                "updated_at": serialize_value(item.updated_at),
                "locations": locations,
                "prices": prices,
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
                    "id": req.id,
                    "status": req.status,
                    "requested_quantity": req.requested_quantity,
                    "created_at": serialize_value(req.created_at),
                    "updated_at": serialize_value(req.updated_at),
                    "subtotal": req.subtotal,
                    "machine": req.machine.name if req.machine else None,
                    "mechanism": req.mechanism.name if req.mechanism else None,
                    "employee": req.employee.username if req.employee else None
                } for req in item.purchase_requests]
            }
            
            result.append(item_data)
        
        return {
            "total": total_count,
            "page": args["page"],
            "page_size": page_size,
            "pages": (total_count + page_size - 1) // page_size,
            "results": result
        }, 200