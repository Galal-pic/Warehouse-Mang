from flask_restx import Namespace, Resource, fields
from flask_jwt_extended import jwt_required
from .. import db
from ..models import Mechanism
from ..utils import parse_bool
from datetime import datetime
mechanism_ns = Namespace('mechanism', description='Mechanism operations')
pagination_parser = mechanism_ns.parser()
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
                               help='Get all mechanisms (default: True) \naccepts values [\'true\', \'false\', \'1\', \'0\', \'t\', \'f\', \'y\', \'n\', \'yes\', \'no\']')
mechanism_model = mechanism_ns.model('Mechanism', {
    "id": fields.Integer(required=True),
    'name': fields.String(required=True),
    'description': fields.String(required=False),
})

pagination_model = mechanism_ns.model('MechanismPagination', {
    'mechanisms': fields.List(fields.Nested(mechanism_model)),
    'page': fields.Integer(required=True),
    'page_size': fields.Integer(required=True),
    'total_pages': fields.Integer(required=True),
    'total_items': fields.Integer(required=True),
    'all': fields.Boolean(required=True)
})
@mechanism_ns.route('/excel')
class MechanismExcelUltra(Resource):
    @jwt_required()
    def post(self):
        """Ultra-optimized mechanism import using bulk_insert_mappings"""
        try:
            payload = mechanism_ns.payload
            if not payload or 'data' not in payload:
                mechanism_ns.abort(400, "Invalid payload format")
            
            print(f"Processing {len(payload['data'])} mechanisms with ultra-optimized method")
            
            errors = []
            success_count = 0
            
            # Data validation and preparation
            valid_mechanisms = []
            
            for i, item in enumerate(payload['data']):
                if not item.get('name') or not item.get('description'):
                    continue
                
                mechanism_name = str(item['name']).strip()
                mechanism_description = str(item['description']).strip()
                
                valid_mechanisms.append({
                    'name': mechanism_name,
                    'description': mechanism_description
                })
            
            if not valid_mechanisms:
                return {
                    'status': 'error',
                    'message': 'No valid mechanisms to process'
                }, 400
            
            # Comprehensive duplicate check
            all_existing_mechanisms = db.session.query(
                Mechanism.name, Mechanism.description
            ).all()
            
            existing_combinations = set()
            for name, description in all_existing_mechanisms:
                existing_combinations.add((name, description))
            
            # Remove duplicates
            unique_mechanisms = []
            seen_combinations = set()
            
            for mechanism in valid_mechanisms:
                combination_key = (mechanism['name'], mechanism['description'])
                
                # Check for any duplicates
                if (combination_key not in existing_combinations and
                    combination_key not in seen_combinations):
                    
                    seen_combinations.add(combination_key)
                    unique_mechanisms.append(mechanism)
                    success_count += 1
            
            # SUPER-FAST: Use bulk_insert_mappings
            if unique_mechanisms:
                try:
                    # Prepare data for bulk insert
                    current_time = datetime.now()
                    mechanism_data = []
                    
                    for mechanism in unique_mechanisms:
                        mechanism_record = {
                            'name': mechanism['name'],
                            'description': mechanism['description']
                        }
                        
                        # Add timestamp if your model has it
                        if hasattr(Mechanism, 'created_at'):
                            mechanism_record['created_at'] = current_time
                        
                        mechanism_data.append(mechanism_record)
                    
                    # Ultra-fast bulk insert
                    db.session.bulk_insert_mappings(Mechanism, mechanism_data)
                    db.session.commit()
                    
                    return {
                        'status': 'success',
                        'message': f'Ultra-optimized import: {success_count} mechanisms imported',
                        'total_submitted': len(payload['data']),
                        'successful_mechanisms': success_count
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
                    'message': 'No unique mechanisms to import'
                }, 400
                
        except Exception as e:
            db.session.rollback()
            return {
                'status': 'error',
                'message': f'Unexpected error: {str(e)}'
            }, 500
            

# Mechanism Endpoints
@mechanism_ns.route('/')
class MechanismList(Resource):
    @mechanism_ns.marshal_list_with(pagination_model)
    @mechanism_ns.expect(pagination_parser)
    @jwt_required()
    def get(self):
        """Get all mechanisms"""
        args = pagination_parser.parse_args()
        page = int(args['page'])
        page_size = int(args['page_size'])
        all_results = bool(args['all'])
        if page < 1 or page_size < 1:
            mechanism_ns.abort(400, "Page and page_size must be positive integers")
        offset = (page - 1) * page_size
        query = Mechanism.query
        if not all_results:
            mechanisms = query.limit(page_size).offset(offset).all()
        else: 
            mechanisms = query.all()
        total_count = query.count()
        
        return {
            'mechanisms': mechanisms,
            'page': page,
            'page_size': page_size,
            'total_pages': (total_count + page_size - 1) // page_size,
            'total_items': total_count,
            'all': all_results
        }

    # @mechanism_ns.expect(mechanism_model)
    @mechanism_ns.marshal_with(mechanism_model)
    @jwt_required()
    def post(self):
        """Create a new mechanism"""
        data = mechanism_ns.payload
        print(data)
        if Mechanism.query.filter_by(name=data['name']).first() or Mechanism.query.filter_by(description=data["description"]).first():
            return mechanism_ns.abort(400, "Mechanism already exists")

        new_mechanism = Mechanism(
            name=data["name"],
            description=data.get("description")
        )
        db.session.add(new_mechanism)
        db.session.commit()
        return new_mechanism, 201

@mechanism_ns.route('/<int:mechanism_id>')
class MechanismDetail(Resource):
    @mechanism_ns.marshal_with(mechanism_model)
    @jwt_required()
    def get(self, mechanism_id):
        """Get a mechanism by ID"""
        mechanism = Mechanism.query.get_or_404(mechanism_id)
        return mechanism

    # @mechanism_ns.expect(mechanism_model)
    @mechanism_ns.marshal_with(mechanism_model)
    @jwt_required()
    def put(self, mechanism_id):
        """Update a mechanism"""
        data = mechanism_ns.payload
        mechanism = Mechanism.query.get_or_404(mechanism_id)

        mechanism.name = data["name"]
        mechanism.description = data.get("description")

        db.session.commit()
        return mechanism

    @jwt_required()
    def delete(self, mechanism_id):
        """Delete a mechanism"""
        mechanism = Mechanism.query.get_or_404(mechanism_id)
        db.session.delete(mechanism)
        db.session.commit()
        return {"message": "Mechanism deleted successfully"}, 200

