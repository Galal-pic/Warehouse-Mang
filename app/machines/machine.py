from flask_restx import Namespace, Resource, fields
from flask_jwt_extended import jwt_required
from .. import db
from ..models import Machine, Invoice
from ..utils import parse_bool
from datetime import datetime
from ..redis_config import cache_result

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
class MachineExcelUltra(Resource):
    @jwt_required()
    def post(self):
        """Ultra-optimized machine import using bulk_insert_mappings"""
        try:
            payload = machine_ns.payload
            if not payload or 'data' not in payload:
                machine_ns.abort(400, "Invalid payload format")
            
            errors = []
            success_count = 0
            
            # Data validation and deduplication
            valid_machines = []
            machine_names = []
            
            for i, item in enumerate(payload['data']):
                if not item.get('name'):
                    continue
                
                machine_name = str(item['name']).strip()
                description = item.get('description', None)
                
                if description:
                    description = str(description).strip()
                
                valid_machines.append({
                    'name': machine_name,
                    'description': description
                })
                
                machine_names.append(machine_name)

            # Duplicate check
            filter_conditions = [Machine.name.in_(machine_names)]
            
            existing_machines_query = db.session.query(
                Machine.name, Machine.description
            ).filter(db.or_(*filter_conditions))
            
            existing_names = set()
            existing_ids = set()
            existing_combinations = set()
            
            for name, description in existing_machines_query:
                existing_names.add(name)
                existing_combinations.add((name, description))
            
            # Remove duplicates
            unique_machines = []
            seen_names = set()
            seen_combinations = set()
            
            for machine in valid_machines:
                combination_key = (machine['name'], machine['description'])
                
                # Check for any duplicates
                if (combination_key not in existing_combinations and
                    machine['name'] not in existing_names and
                    machine['name'] not in seen_names and
                    combination_key not in seen_combinations):
                    
                    seen_names.add(machine['name'])
                    seen_combinations.add(combination_key)
                    unique_machines.append(machine)
                    success_count += 1
            
            # SUPER-FAST: Use bulk_insert_mappings
            if unique_machines:
                try:
                    # Prepare data for bulk insert
                    current_time = datetime.now()
                    machine_data = []
                    
                    for machine in unique_machines:
                        machine_record = {
                            'name': machine['name'],
                            'description': machine['description']
                        }
                        # Add timestamp if your model has it
                        if hasattr(Machine, 'created_at'):
                            machine_record['created_at'] = current_time
                        
                        machine_data.append(machine_record)
                    
                    # Ultra-fast bulk insert
                    db.session.bulk_insert_mappings(Machine, machine_data)
                    db.session.commit()

                    
                    return {
                        'status': 'success',
                        'message': f'Ultra-optimized import: {success_count} machines imported',
                        'total_submitted': len(payload['data']),
                        'successful_machines': success_count
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
                    'message': 'No unique machines to import'
                }, 400
                
        except Exception as e:
            db.session.rollback()
            return {
                'status': 'error',
                'message': f'Unexpected error: {str(e)}'
            }, 500

@machine_ns.route('/')
class MachineList(Resource):
    @machine_ns.marshal_list_with(pagination_model)
    @machine_ns.expect(pagination_parser)
    @jwt_required()
    @cache_result(timeout=300, key_prefix="machine_list")
    def get(self):
        """Get all machines (cached)"""
        args = pagination_parser.parse_args()
        page = int(args['page'])
        page_size = int(args['page_size'])
        all_results = bool(args['all'])
        if page < 1 or page_size < 1:
            machine_ns.abort(400, "Page and page_size must be positive integers")
        query = Machine.query.with_entities(Machine.id, Machine.name, Machine.description)
        if all_results:
            machines = query.all()
            total_count = len(machines)
            total_pages = 1
        else:
            machines = query.limit(page_size).offset((page-1)*page_size).all()
            total_count = query.count()
            total_pages = (total_count + page_size - 1) // page_size

        result = [
            {"id": m.id, "name": m.name, "description": m.description}
            for m in machines
        ]
        return {
            'machines': result,
            'page': page if not all_results else None,
            'page_size': page_size if not all_results else None,
            'total_pages': total_pages if not all_results else None,
            'total_items': total_count,
            'all': all_results
        }, 200

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
    @cache_result(timeout=300, key_prefix="machine_detail")
    def get(self, machine_id):
        """Get a machine by ID (cached)"""
        machine = Machine.query.get_or_404(machine_id)
        return machine

    @machine_ns.marshal_with(machine_model)
    @jwt_required()
    def put(self, machine_id):
        """Update a machine"""
        data = machine_ns.payload
        machine = Machine.query.get_or_404(machine_id)

        machine.name = data["name"]
        machine.description = data.get("description")

        db.session.commit()
        
        # Invalidate cache after update
        
        
        return machine

    @jwt_required()
    def delete(self, machine_id):
        """Delete a machine"""
        machine = Machine.query.get_or_404(machine_id)
        if Invoice.query.filter_by(machine_id=machine.id).first():
            machine_ns.abort(400, "Cannot delete machine with associated invoices")
        db.session.delete(machine)
        db.session.commit()

        return {"message": "Machine deleted successfully"}, 200