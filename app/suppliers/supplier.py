from flask_restx import Namespace, Resource, fields
from flask_jwt_extended import jwt_required
from .. import db
from ..models import Supplier

supplier_ns = Namespace('supplier', description='supplier operations')

# Parser for query parameters
pagination_parser = supplier_ns.parser()
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


# Models for API documentation
supplier_model = supplier_ns.model('Supplier', {
    "id": fields.Integer(required=True),
    'name': fields.String(required=True),
    'description': fields.String(required=False),
})

pagination_model = supplier_ns.model('SupplierPagination', {
    'suppliers': fields.List(fields.Nested(supplier_model)),
    'page': fields.Integer(required=True),
    'page_size': fields.Integer(required=True),
    'total_pages': fields.Integer(required=True),
    'total_items': fields.Integer(required=True)
})

@supplier_ns.route('/excel')
class MachineExcel(Resource):

    @supplier_ns.marshal_with(supplier_model)
    @jwt_required()
    def post(self):
        """Create a new mechanism"""
        data = supplier_ns.payload
        data = data.get("data",[])
        for supplier in data:
            if Supplier.query.filter_by(name=supplier["name"]).first() or Supplier.query.filter_by(description=supplier["description"]).first():
                return supplier_ns.abort(400, "Supplier already exists")
            new_supplier = Supplier(
                name=supplier["name"],
                description=str(supplier.get("description"))
            )
            db.session.add(new_supplier)
            db.session.commit()
        return new_supplier, 201
    
# Machine Endpoints
@supplier_ns.route('/')
class SupplierList(Resource):
    @supplier_ns.marshal_list_with(pagination_model)
    @supplier_ns.expect(pagination_parser)
    @jwt_required()
    def get(self):
        """Get all suppliers"""
        args = pagination_parser.parse_args()
        page = int(args['page'])
        page_size = int(args['page_size'])
        if page < 1 or page_size < 1:
            supplier_ns.abort(400, "Page and page_size must be positive integers")
        offset = (page - 1) * page_size
        
        query = Supplier.query
        suppliers = query.limit(page_size).offset(offset).all()
        total_count = query.count()
        return {
            'suppliers': suppliers,
            'page': page,
            'page_size': page_size,
            'total_pages': (total_count + page_size - 1) // page_size,
            'total_items': total_count
        }

    # @machine_ns.expect(machine_model)
    @supplier_ns.marshal_with(supplier_model)
    @jwt_required()
    def post(self):
        """Create a new supplier"""
        data = supplier_ns.payload
        if Supplier.query.filter_by(name=data['name']).first() or Supplier.query.filter_by(description=data['description']).first():
            return supplier_ns.abort(400, "supplier already exists")

        new_supplier = Supplier(
            name=data["name"],
            description=data.get("description")
        )
        db.session.add(new_supplier)
        db.session.commit()
        return new_supplier, 201

@supplier_ns.route('/<int:supplier_id>')
class SupplierDetail(Resource):
    @supplier_ns.marshal_with(supplier_model)
    @jwt_required()
    def get(self, supplier_id):
        """Get a supplier by ID"""
        
        # Fixed, it was Machine instead of Supplier.
        supplier = Supplier.query.get_or_404(supplier_id)
        return supplier

    @supplier_ns.marshal_with(supplier_model)
    @jwt_required()
    def put(self, supplier_id):
        """Update a supplier"""
        data = supplier_ns.payload
        supplier = Supplier.query.get_or_404(supplier_id)

        supplier.name = data["name"]
        supplier.description = data.get("description")

        db.session.commit()
        return supplier

    @jwt_required()
    def delete(self, supplier_id):
        """Delete a supplier"""
        supplier = Supplier.query.get_or_404(supplier_id)
        db.session.delete(supplier)
        db.session.commit()
        return {"message": "supplier deleted successfully"}, 200
