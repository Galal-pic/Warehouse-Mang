from flask_restx import Namespace, Resource, fields
from flask_jwt_extended import jwt_required
from .. import db
from ..models import Mechanism

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
    'total_items': fields.Integer(required=True)
})
@mechanism_ns.route('/excel')
class MachineExcel(Resource):

    @mechanism_ns.marshal_with(mechanism_model)
    @jwt_required()
    def post(self):
        """Create a new mechanism"""
        data = mechanism_ns.payload
        data = data.get("data",[])
        for mechanism in data:
            if Mechanism.query.filter_by(name=mechanism["name"]).first() or Mechanism.query.filter_by(name=mechanism["description"]).first():
                return mechanism_ns.abort(400, "mechanism already exists")
            new_mechanism = Mechanism(
                name=mechanism["name"],
                description=str(mechanism.get("description"))
            )
            db.session.add(new_mechanism)
            db.session.commit()
        return new_mechanism, 201

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
        if page < 1 or page_size < 1:
            mechanism_ns.abort(400, "Page and page_size must be positive integers")
        offset = (page - 1) * page_size
        query = Mechanism.query
        mechanisms = query.limit(page_size).offset(offset).all()
        total_count = query.count()
        
        return {
            'mechanisms': mechanisms,
            'page': page,
            'page_size': page_size,
            'total_pages': (total_count + page_size - 1) // page_size,
            'total_items': total_count
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

