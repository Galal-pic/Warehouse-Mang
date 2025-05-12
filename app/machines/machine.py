from flask_restx import Namespace, Resource, fields
from flask_jwt_extended import jwt_required
from .. import db
from ..models import Machine

machine_ns = Namespace('machine', description='Machine operations')
pagination_parser = machine_ns.parser()
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
machine_model = machine_ns.model('Machine', {
    "id": fields.Integer(required=True),
    'name': fields.String(required=True),
    'description': fields.String(required=False),
})

pagination_model = machine_ns.model('MachinePagination', {
    'machines': fields.List(fields.Nested(machine_model)),
    'page': fields.Integer(required=True),
    'page_size': fields.Integer(required=True),
    'total_pages': fields.Integer(required=True),
    'total_items': fields.Integer(required=True)
})
@machine_ns.route('/excel')
class MachineExcel(Resource):

    @machine_ns.marshal_with(machine_model)
    @jwt_required()
    def post(self):
        """Create a new machine"""
        data = machine_ns.payload
        data = data.get("data",[])
        for machine in data:
            if Machine.query.filter_by(name=machine["name"]).first() or Machine.query.filter_by(name=machine["description"]).first():
                return machine_ns.abort(400, "Machine already exists")
            new_machine = Machine(
                name=machine["name"],
                description=str(machine.get("description"))
            )
            db.session.add(new_machine)
            db.session.commit()
        return new_machine, 201

# Machine Endpoints
@machine_ns.route('/')
class MachineList(Resource):
    @machine_ns.marshal_list_with(pagination_model)
    @machine_ns.expect(pagination_parser)
    @jwt_required()
    def get(self):
        """Get all machines"""
        args = pagination_parser.parse_args()
        page = int(args['page'])
        page_size = int(args['page_size'])
        if page < 1 or page_size < 1:
            machine_ns.abort(400, "Page and page_size must be positive integers")
        offset = (page - 1) * page_size
        query = Machine.query
        machines = query.limit(page_size).offset(offset).all()
        return {
            'machines': machines,
            'page': page,
            'page_size': page_size,
            'total_pages': (query.count() + page_size - 1) // page_size,
            'total_items': query.count()
        }, 200

    # @machine_ns.expect(machine_model)
    @machine_ns.marshal_with(machine_model)
    @jwt_required()
    def post(self):
        """Create a new machine"""
        data = machine_ns.payload
        if Machine.query.filter_by(name=data['name']).first() or Machine.query.filter_by(description=data['description']).first():
            return machine_ns.abort(400, "Machine already exists")

        new_machine = Machine(
            name=data["name"],
            description=data.get("description")
        )
        db.session.add(new_machine)
        db.session.commit()
        return new_machine, 201

@machine_ns.route('/<int:machine_id>')
class MachineDetail(Resource):
    @machine_ns.marshal_with(machine_model)
    @jwt_required()
    def get(self, machine_id):
        """Get a machine by ID"""
        machine = Machine.query.get_or_404(machine_id)
        return machine

    # @machine_ns.expect(machine_model)
    @machine_ns.marshal_with(machine_model)
    @jwt_required()
    def put(self, machine_id):
        """Update a machine"""
        data = machine_ns.payload
        machine = Machine.query.get_or_404(machine_id)

        machine.name = data["name"]
        machine.description = data.get("description")

        db.session.commit()
        return machine

    @jwt_required()
    def delete(self, machine_id):
        """Delete a machine"""
        machine = Machine.query.get_or_404(machine_id)
        db.session.delete(machine)
        db.session.commit()
        return {"message": "Machine deleted successfully"}, 200