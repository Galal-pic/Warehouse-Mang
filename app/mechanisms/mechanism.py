from flask_restx import Namespace, Resource, fields
from flask_jwt_extended import jwt_required
from .. import db
from ..models import Mechanism
from ..utils import parse_bool
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
class MachineExcel(Resource):
    @jwt_required()
    def post(self):
        payload = mechanism_ns.payload
        if not payload or 'data' not in payload:
            mechanism_ns.abort(400, "Invalid payload format")
        errors = []
        success_count = 0
        try:
            for item in payload['data']:
                if 'name' not in item:
                    mechanism_ns.abort(400, "Mechanism name is required")
                if 'description' not in item:
                    mechanism_ns.abort(400, "Mechanism description is required")
                
                # Check if mechanism already exists
                existing_supplier = Mechanism.query.filter_by(name=item['name'], description=item['description']).first()
                    
                if existing_supplier:
                    errors.append(f"Mechanism '{item['name']}' already exists")
                    continue
                    
                # Create new supplier
                try:
                    new_supplier = Mechanism(
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
                        'message': f'Successfully imported {success_count} mechanisms'
                    }, 200
                else:
                    db.session.rollback()
                    return {
                        'status': 'error',
                        'message': 'Some mechanisms could not be imported',
                        'errors': errors
                    }, 400
        except Exception as e:
            db.session.rollback()
            mechanism_ns.abort(400, f"Error processing import for mechanisms: {str(e)}")
            

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

