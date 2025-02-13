from flask_restx import Namespace, Resource, fields
from flask_jwt_extended import jwt_required
from .. import db
from ..models import Machine

machine_ns = Namespace('machine', description='Machine operations')

machine_model = machine_ns.model('Machine', {
    "id": fields.Integer(required=True),
    'name': fields.String(required=True),
    'description': fields.String(required=False),
})

@machine_ns.route('/excel')
class MachineExcel(Resource):

    @machine_ns.marshal_with(machine_model)
    @jwt_required()
    def post(self):
        """Create a new machine"""
        data = machine_ns.payload
        print(data)
        
# Machine Endpoints
@machine_ns.route('/')
class MachineList(Resource):
    @machine_ns.marshal_list_with(machine_model)
    @jwt_required()
    def get(self):
        """Get all machines"""
        machines = Machine.query.all()
        return machines

    # @machine_ns.expect(machine_model)
    @machine_ns.marshal_with(machine_model)
    @jwt_required()
    def post(self):
        """Create a new machine"""
        data = machine_ns.payload
        if Machine.query.filter_by(name=data['name']).first():
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