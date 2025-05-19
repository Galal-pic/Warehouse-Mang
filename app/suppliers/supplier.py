from flask_restx import Namespace, Resource, fields
from flask_jwt_extended import jwt_required
from .. import db
from ..models import Supplier
from ..utils import parse_bool

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

pagination_parser.add_argument('all',
                               type=parse_bool,
                               required=False, 
                               default=True, 
                               help='Get all items (default: True) \naccepts values [\'true\', \'false\', \'1\', \'0\', \'t\', \'f\', \'y\', \'n\', \'yes\', \'no\']')
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
    'total_items': fields.Integer(required=True),
    'all': fields.Boolean(required=True)
})

@supplier_ns.route('/excel')
class MachineExcel(Resource):
    @jwt_required()
    def post(self):
        """Import suppliers data from Excel"""
        payload = supplier_ns.payload
        if not payload or 'data' not in payload:
            supplier_ns.abort(400, "Invalid payload format")
        errors = []
        success_count = 0
        try:
            for item in payload['data']:
                if 'name' not in item:
                    supplier_ns.abort(400, "Supplier name is required")
                if 'description' not in item:
                    supplier_ns.abort(400, "Supplier description is required")
                
                # Check if supplier already exists
                existing_supplier = Supplier.query.filter_by(name=item['name'], description=item['description']).first()
                    
                if existing_supplier:
                    errors.append(f"Supplier '{item['name']}' already exists")
                    continue
                    
                # Create new supplier
                try:
                    new_supplier = Supplier(
                        name=item['name'],
                        description=item['description']  
                    )
                    db.session.add(new_supplier)
                    success_count += 1
                except Exception as e:
                    errors.append(f"Error adding supplier '{item['name']}': {str(e)}")
                
            # Commit if there are no errors, rollback otherwise
            if not errors:
                db.session.commit()
                return {
                    'status': 'success',
                    'message': f'Successfully imported {success_count} suppliers'
                }, 200
            else:
                db.session.rollback()
                return {
                    'status': 'error',
                    'message': 'Some suppliers could not be imported',
                    'errors': errors
                }, 400
        except Exception as e:
            db.session.rollback()
            supplier_ns.abort(400, f"Error processing import for suppliers: {str(e)}")


    
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
        all_results = bool(args['all'])
        if page < 1 or page_size < 1:
            supplier_ns.abort(400, "Page and page_size must be positive integers")
        offset = (page - 1) * page_size
        
        query = Supplier.query
        if not all_results:
            suppliers = query.limit(page_size).offset(offset).all()
        else: 
            suppliers = query.all()
        total_count = query.count()
        return {
            'suppliers': suppliers,
            'page': page,
            'page_size': page_size,
            'total_pages': (total_count + page_size - 1) // page_size,
            'total_items': total_count,
            'all': all_results
            
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
