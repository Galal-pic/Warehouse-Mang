from flask_restx import Namespace, Resource, fields
from flask_jwt_extended import jwt_required
from .. import db
from ..models import Supplier
from ..utils import parse_bool
from datetime import datetime
from ..redis_config import cache_result

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
class SupplierExcelUltra(Resource):
    @jwt_required()
    def post(self):
        """Ultra-optimized supplier import using bulk_insert_mappings"""
        try:
            payload = supplier_ns.payload
            if not payload or 'data' not in payload:
                supplier_ns.abort(400, "Invalid payload format")
            
            errors = []
            success_count = 0
            
            # Data validation and deduplication
            valid_suppliers = []
            supplier_names = []
            supplier_ids = []
            
            for i, item in enumerate(payload['data']):
                if not item.get('name') or not item.get('id'):
                    continue
                
                supplier_name = str(item['name']).strip()
                supplier_id = item['id']
                description = item.get('description', None)
                if description:
                    description = str(description).strip()
                
                valid_suppliers.append({
                    'name': supplier_name,
                    'id': supplier_id,
                    'description': description
                })
                
                supplier_names.append(supplier_name)
                supplier_ids.append(supplier_id)
            
            # Duplicate check
            existing_suppliers_query = db.session.query(
                Supplier.name, Supplier.id, Supplier.description
            ).filter(
                db.or_(
                    Supplier.name.in_(supplier_names),
                    Supplier.id.in_(supplier_ids)
                )
            )
            
            existing_names = set()
            existing_ids = set()
            existing_combinations = set()
            
            for name, supplier_id, description in existing_suppliers_query:
                existing_names.add(name)
                existing_ids.add(supplier_id)
                existing_combinations.add((name, supplier_id, description))
            
            # Remove duplicates
            unique_suppliers = []
            seen_names = set()
            seen_ids = set()
            
            for supplier in valid_suppliers:
                if (supplier['name'] not in existing_names and 
                    supplier['id'] not in existing_ids and
                    supplier['name'] not in seen_names and
                    supplier['id'] not in seen_ids):
                    
                    seen_names.add(supplier['name'])
                    seen_ids.add(supplier['id'])
                    unique_suppliers.append(supplier)
                    success_count += 1
            
            # SUPER-FAST: Use bulk_insert_mappings
            if unique_suppliers:
                try:
                    # Prepare data for bulk insert
                    current_time = datetime.now()
                    supplier_data = []
                    
                    for supplier in unique_suppliers:
                        supplier_record = {
                            'name': supplier['name'],
                            'id': supplier['id'],
                            'description': supplier['description']
                        }
                        # Add timestamp if your model has it
                        if hasattr(Supplier, 'created_at'):
                            supplier_record['created_at'] = current_time
                        
                        supplier_data.append(supplier_record)
                    
                    # Ultra-fast bulk insert
                    db.session.bulk_insert_mappings(Supplier, supplier_data)
                    db.session.commit()

                    
                    return {
                        'status': 'success',
                        'message': f'Ultra-optimized import: {success_count} suppliers imported',
                        'total_submitted': len(payload['data']),
                        'successful_suppliers': success_count
                    }, 200
                    
                except Exception as e:
                    db.session.rollback()
                    return {
                        'status': 'error',
                        'message': f'Ultra-optimized bulk operation failed: {str(e)}'
                    }, 500
            else:
                return {
                    'status': 'error',
                    'message': 'No unique suppliers to import'
                }, 400
                
        except Exception as e:
            db.session.rollback()
            return {
                'status': 'error',
                'message': f'Unexpected error: {str(e)}'
            }, 500

@supplier_ns.route('/')
class SupplierList(Resource):
    @supplier_ns.marshal_list_with(pagination_model)
    @supplier_ns.expect(pagination_parser)
    @jwt_required()
    @cache_result(timeout=300, key_prefix="supplier_list")
    def get(self):
        """Get all suppliers (cached)"""
        args = pagination_parser.parse_args()
        page = int(args['page'])
        page_size = int(args['page_size'])
        all_results = bool(args['all'])
        if page < 1 or page_size < 1:
            supplier_ns.abort(400, "Page and page_size must be positive integers")
        
        query = Supplier.query.with_entities(Supplier.id, Supplier.name, Supplier.description)
        if all_results:
            suppliers = query.all()
            total_count = len(suppliers)
            total_pages = 1
        else:
            suppliers = query.limit(page_size).offset((page-1)*page_size).all()
            total_count = query.count()
            total_pages = (total_count + page_size - 1) // page_size

        result = [
            {"id": s.id, "name": s.name, "description": s.description}
            for s in suppliers
        ]
        return {
            'suppliers': result,
            'page': page if not all_results else None,
            'page_size': page_size if not all_results else None,
            'total_pages': total_pages if not all_results else None,
            'total_items': total_count,
            'all': all_results
        }, 200

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
        
        # Invalidate cache after creation
        
        
        return new_supplier, 201

@supplier_ns.route('/<int:supplier_id>')
class SupplierDetail(Resource):
    @supplier_ns.marshal_with(supplier_model)
    @jwt_required()
    @cache_result(timeout=300, key_prefix="supplier_detail")
    def get(self, supplier_id):
        """Get a supplier by ID (cached)"""
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
        
        # Invalidate cache after update
        
        
        return supplier

    @jwt_required()
    def delete(self, supplier_id):
        """Delete a supplier"""
        supplier = Supplier.query.get_or_404(supplier_id)
        db.session.delete(supplier)
        db.session.commit()
        
        # Invalidate cache after deletion
        
        
        return {"message": "supplier deleted successfully"}, 200