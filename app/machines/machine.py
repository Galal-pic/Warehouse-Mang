from flask_restx import Namespace, Resource, fields
from flask_jwt_extended import jwt_required
from .. import db
from ..models import Machine
from ..utils import parse_bool

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
pagination_parser.add_argument('all',
                               type=parse_bool,
                               required=False, 
                               default=True, 
                               help='Get all items (default: True) \naccepts values [\'true\', \'false\', \'1\', \'0\', \'t\', \'f\', \'y\', \'n\', \'yes\', \'no\']')
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
    'total_items': fields.Integer(required=True),
    'all': fields.Boolean(required=True)
})
@machine_ns.route('/excel')
class MachineExcel(Resource):
    @jwt_required()
    def post(self):
        payload = machine_ns.payload
        if not payload or 'data' not in payload:
            machine_ns.abort(400, "Invalid payload format")
        errors = []
        success_count = 0
        try:
            for item in payload['data']:
                if 'name' not in item:
                    machine_ns.abort(400, "Machine name is required")
                if 'description' not in item:
                    machine_ns.abort(400, "Machine description is required")
                
                # Check if mechanism already exists
                existing_supplier = Machine.query.filter_by(name=item['name'], description=item['description']).first()
                    
                if existing_supplier:
                    errors.append(f"Machine '{item['name']}' already exists")
                    continue
                    
                # Create new supplier
                try:
                    new_supplier = Machine(
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
                    'message': f'Successfully imported {success_count} machines'
                }, 200
            else:
                db.session.rollback()
                return {
                    'status': 'error',
                    'message': 'Some machines could not be imported',
                    'errors': errors
                }, 400
        except Exception as e:
            db.session.rollback()
            machine_ns.abort(400, f"Error processing import for machines: {str(e)}")


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
        all_results = bool(args['all'])
        if page < 1 or page_size < 1:
            machine_ns.abort(400, "Page and page_size must be positive integers")
        offset = (page - 1) * page_size
        query = Machine.query
        if not all_results:
            machines = query.limit(page_size).offset(offset).all()
        else: 
            machines = query.all()
        return {
            'machines': machines,
            'page': page,
            'page_size': page_size,
            'total_pages': (query.count() + page_size - 1) // page_size,
            'total_items': query.count(),
            'all': all_results
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