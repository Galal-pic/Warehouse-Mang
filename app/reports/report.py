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
reports_ns = Namespace("reports", description="Mechanism operations")
pagination_parser = reports_ns.parser()
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
            row_data = [
                {col: serialize_value(getattr(row, col)) for col in columns}
                for row in model.query.limit(page_size).offset(offset).all()
            ]
            full_report[table_name] = row_data
            rows_data.append({table_name: row_data})
            
        return full_report, 200
