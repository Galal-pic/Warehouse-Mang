from flask_restx import Namespace, Resource, fields
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity
from werkzeug.security import generate_password_hash, check_password_hash
from . import db
from .models import Employee
from .utils import parse_bool
# Create namespace
auth_ns = Namespace('auth', description='Authentication operations')


pagination_parser = auth_ns.parser()
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
# Create Invoice Permissions
create_invoice_model = auth_ns.model('CreateInvoicePermissions', {
    'create_inventory_operations': fields.Boolean(default=False, description='Permission to create inventory operations'),
    'create_additions': fields.Boolean(default=False, description='Permission to create additions')
})

# Manage Operations Permissions
manage_operations_model = auth_ns.model('ManageOperationsPermissions', {
    'view_additions': fields.Boolean(default=False, description='Permission to view additions'),
    'view_withdrawals': fields.Boolean(default=False, description='Permission to view withdrawals'),
    'view_deposits': fields.Boolean(default=False, description='Permission to view deposits'),
    'view_returns': fields.Boolean(default=False, description='Permission to view returns'),
    'view_damages': fields.Boolean(default=False, description='Permission to view damages'),
    'view_reservations': fields.Boolean(default=False, description='Permission to view reservations'),
    'view_prices': fields.Boolean(default=False, description='Permission to view prices'),
    'view_purchase_requests': fields.Boolean(default=False, description='Permission to view purchase requests'),
    'view_reports': fields.Boolean(default=False, description='Permission to view reports'),
    'can_edit': fields.Boolean(default=False, description='Permission to edit operations'),
    'can_delete': fields.Boolean(default=False, description='Permission to delete operations'),
    'can_confirm_withdrawal': fields.Boolean(default=False, description='Permission to confirm withdrawals'),
    'can_withdraw': fields.Boolean(default=False, description='Permission to withdraw'),
    'can_update_prices': fields.Boolean(default=False, description='Permission to update prices'),
    'can_recover_deposits': fields.Boolean(default=False, description='Permission to recover deposits'),
    'can_confirm_purchase_requests': fields.Boolean(default=False, description='Permission to confirm purchase requests')
})

# Items Permissions
items_model = auth_ns.model('ItemsPermissions', {
    'items_can_edit': fields.Boolean(default=False, description='Permission to edit items'),
    'items_can_delete': fields.Boolean(default=False, description='Permission to delete items'),
    'items_can_add': fields.Boolean(default=False, description='Permission to add items')
})

# Machines Permissions
machines_model = auth_ns.model('MachinesPermissions', {
    'machines_can_edit': fields.Boolean(default=False, description='Permission to edit machines'),
    'machines_can_delete': fields.Boolean(default=False, description='Permission to delete machines'),
    'machines_can_add': fields.Boolean(default=False, description='Permission to add machines')
})

# Mechanism Permissions
mechanism_model = auth_ns.model('MechanismPermissions', {
    'mechanism_can_edit': fields.Boolean(default=False, description='Permission to edit mechanisms'),
    'mechanism_can_delete': fields.Boolean(default=False, description='Permission to delete mechanisms'),
    'mechanism_can_add': fields.Boolean(default=False, description='Permission to add mechanisms')
})

# Suppliers Permissions
suppliers_model = auth_ns.model('SuppliersPermissions', {
    'suppliers_can_edit': fields.Boolean(default=False, description='Permission to edit suppliers'),
    'suppliers_can_delete': fields.Boolean(default=False, description='Permission to delete suppliers'),
    'suppliers_can_add': fields.Boolean(default=False, description='Permission to add suppliers')
})

# Permissions model
permissions_model = auth_ns.model('Permissions', {
    'createInvoice': fields.Nested(create_invoice_model, description='Create invoice permissions'),
    'manageOperations': fields.Nested(manage_operations_model, description='Manage operations permissions'),
    'items': fields.Nested(items_model, description='Items permissions'),
    'machines': fields.Nested(machines_model, description='Machines permissions'),
    'mechanism': fields.Nested(mechanism_model, description='Mechanism permissions'),
    'suppliers': fields.Nested(suppliers_model, description='Suppliers permissions')
})

# User models
registration_model = auth_ns.model('Registration', {
    'username': fields.String(required=True, description='Username'),
    'password': fields.String(required=True, description='Password'),
    'phone_number': fields.String(description='Phone number'),
    'job_name': fields.String(required=True, description='Job title'),
    'permissions': fields.Nested(permissions_model, required=True, description='User permissions')
})

login_model = auth_ns.model('Login', {
    'username': fields.String(required=True, description='Username'),
    'password': fields.String(required=True, description='Password')
})

# Model for returning user data
user_model = auth_ns.model('User', {
    'id': fields.Integer(readOnly=True, description='User ID'),
    'username': fields.String(required=True, description='Username'),
    'phone_number': fields.String(description='Phone number'),
    'job_name': fields.String(required=True, description='Job title'),
    
    # All permissions as flat fields
    'create_inventory_operations': fields.Boolean(description='Permission to create inventory operations'),
    'create_additions': fields.Boolean(description='Permission to create additions'),
    'view_additions': fields.Boolean(description='Permission to view additions'),
    'view_withdrawals': fields.Boolean(description='Permission to view withdrawals'),
    'view_deposits': fields.Boolean(description='Permission to view deposits'),
    'view_returns': fields.Boolean(description='Permission to view returns'),
    'view_damages': fields.Boolean(description='Permission to view damages'),
    'view_reservations': fields.Boolean(description='Permission to view reservations'),
    'view_prices': fields.Boolean(description='Permission to view prices'),
    'view_purchase_requests': fields.Boolean(description='Permission to view purchase requests'),
    'view_reports': fields.Boolean(description='Permission to view reports'),
    'can_edit': fields.Boolean(description='Permission to edit operations'),
    'can_delete': fields.Boolean(description='Permission to delete operations'),
    'can_confirm_withdrawal': fields.Boolean(description='Permission to confirm withdrawals'),
    'can_withdraw': fields.Boolean(description='Permission to withdraw'),
    'can_update_prices': fields.Boolean(description='Permission to update prices'),
    'can_recover_deposits': fields.Boolean(description='Permission to recover deposits'),
    'can_confirm_purchase_requests': fields.Boolean(description='Permission to confirm purchase requests'),
    'items_can_edit': fields.Boolean(description='Permission to edit items'),
    'items_can_delete': fields.Boolean(description='Permission to delete items'),
    'items_can_add': fields.Boolean(description='Permission to add items'),
    'machines_can_edit': fields.Boolean(description='Permission to edit machines'),
    'machines_can_delete': fields.Boolean(description='Permission to delete machines'),
    'machines_can_add': fields.Boolean(description='Permission to add machines'),
    'mechanism_can_edit': fields.Boolean(description='Permission to edit mechanisms'),
    'mechanism_can_delete': fields.Boolean(description='Permission to delete mechanisms'),
    'mechanism_can_add': fields.Boolean(description='Permission to add mechanisms'),
    'suppliers_can_edit': fields.Boolean(description='Permission to edit suppliers'),
    'suppliers_can_delete': fields.Boolean(description='Permission to delete suppliers'),
    'suppliers_can_add': fields.Boolean(description='Permission to add suppliers')
})

# Same structure for update
update_user_model = auth_ns.model('UpdateUser', {
    'username': fields.String(description='Username'),
    'password': fields.String(description='Password'),
    'phone_number': fields.String(description='Phone number'),
    'job_name': fields.String(description='Job title'),
    'permissions': fields.Nested(permissions_model, description='User permissions')
})

pagination_model = auth_ns.model('UsersPagination', {
    'users': fields.List(fields.Nested(user_model)),
    'page': fields.Integer(required=True),
    'page_size': fields.Integer(required=True),
    'total_pages': fields.Integer(required=True),
    'total_items': fields.Integer(required=True),
    'all': fields.Boolean(required=True)
})

change_password_model = auth_ns.model('ChangePassword', {
    'new_password': fields.String(required=True, description='New password'),
    'confirm_new_password': fields.String(required=True, description='Confirm password')
})
# Endpoints
@auth_ns.route('/register')
class Register(Resource):
    @auth_ns.expect(registration_model)
    @auth_ns.response(201, 'Employee registered successfully')
    @auth_ns.response(400, 'Invalid data or username already exists')
    def post(self):
        """Register a new employee"""
        data = auth_ns.payload

        if Employee.query.filter_by(username=data['username']).first():
            auth_ns.abort(400, "Username already exists")

        # Extract permissions from nested structure
        permissions = data.get('permissions', {})
        
        # Create Invoice permissions
        create_invoice = permissions.get('createInvoice', {})
        create_inventory_operations = create_invoice.get('create_inventory_operations', False)
        create_additions = create_invoice.get('create_additions', False)
        
        # Manage Operations permissions
        manage_operations = permissions.get('manageOperations', {})
        view_additions = manage_operations.get('view_additions', False)
        view_withdrawals = manage_operations.get('view_withdrawals', False)
        view_deposits = manage_operations.get('view_deposits', False)
        view_returns = manage_operations.get('view_returns', False)
        view_damages = manage_operations.get('view_damages', False)
        view_reservations = manage_operations.get('view_reservations', False)
        view_prices = manage_operations.get('view_prices', False)
        view_purchase_requests = manage_operations.get('view_purchase_requests', False)
        view_reports = manage_operations.get('view_reports', False)
        can_edit = manage_operations.get('can_edit', False)
        can_delete = manage_operations.get('can_delete', False)
        can_confirm_withdrawal = manage_operations.get('can_confirm_withdrawal', False)
        can_withdraw = manage_operations.get('can_withdraw', False)
        can_update_prices = manage_operations.get('can_update_prices', False)
        can_recover_deposits = manage_operations.get('can_recover_deposits', False)
        can_confirm_purchase_requests = manage_operations.get('can_confirm_purchase_requests', False)
        
        # Items permissions
        items = permissions.get('items', {})
        items_can_edit = items.get('items_can_edit', False)
        items_can_delete = items.get('items_can_delete', False)
        items_can_add = items.get('items_can_add', False)
        
        # Machines permissions
        machines = permissions.get('machines', {})
        machines_can_edit = machines.get('machines_can_edit', False)
        machines_can_delete = machines.get('machines_can_delete', False)
        machines_can_add = machines.get('machines_can_add', False)
        
        # Mechanism permissions
        mechanism = permissions.get('mechanism', {})
        mechanism_can_edit = mechanism.get('mechanism_can_edit', False)
        mechanism_can_delete = mechanism.get('mechanism_can_delete', False)
        mechanism_can_add = mechanism.get('mechanism_can_add', False)
        
        # Suppliers permissions
        suppliers = permissions.get('suppliers', {})
        suppliers_can_edit = suppliers.get('suppliers_can_edit', False)
        suppliers_can_delete = suppliers.get('suppliers_can_delete', False)
        suppliers_can_add = suppliers.get('suppliers_can_add', False)

        new_employee = Employee(
            username=data['username'],
            password_hash=generate_password_hash(data['password']),
            phone_number=data.get('phone_number', ''),
            job_name=data['job_name'],
            
            # Set all the boolean permissions
            create_inventory_operations=create_inventory_operations,
            create_additions=create_additions,
            
            view_additions=view_additions,
            view_withdrawals=view_withdrawals,
            view_deposits=view_deposits,
            view_returns=view_returns,
            view_damages=view_damages,
            view_reservations=view_reservations,
            view_prices=view_prices,
            view_purchase_requests=view_purchase_requests,
            view_reports=view_reports,
            can_edit=can_edit,
            can_delete=can_delete,
            can_confirm_withdrawal=can_confirm_withdrawal,
            can_withdraw=can_withdraw,
            can_update_prices=can_update_prices,
            can_recover_deposits=can_recover_deposits,
            can_confirm_purchase_requests=can_confirm_purchase_requests,
            
            items_can_edit=items_can_edit,
            items_can_delete=items_can_delete,
            items_can_add=items_can_add,
            
            machines_can_edit=machines_can_edit,
            machines_can_delete=machines_can_delete,
            machines_can_add=machines_can_add,
            
            mechanism_can_edit=mechanism_can_edit,
            mechanism_can_delete=mechanism_can_delete,
            mechanism_can_add=mechanism_can_add,
            
            suppliers_can_edit=suppliers_can_edit,
            suppliers_can_delete=suppliers_can_delete,
            suppliers_can_add=suppliers_can_add
        )
        
        db.session.add(new_employee)
        db.session.commit()
        return {"message": "Employee registered successfully"}, 201

@auth_ns.route('/login')
class Login(Resource):
    @auth_ns.expect(login_model)
    @auth_ns.response(200, 'Login successful')
    @auth_ns.response(401, 'Invalid credentials')
    def post(self):
        """Login and get access token"""
        data = auth_ns.payload
        employee = Employee.query.filter_by(username=data['username']).first()
        if not employee or not check_password_hash(employee.password_hash, data['password']):
            auth_ns.abort(401, "Invalid credentials")

        access_token = create_access_token(identity=str(employee.id))
        return {"access_token": access_token}, 200


@auth_ns.route('/user/<int:user_id>/change-password')
class ChangePassword(Resource):
    @auth_ns.expect(change_password_model)
    @auth_ns.response(200, 'Password changed successfully')
    @jwt_required()
    def post(self, user_id):
        """Change user password"""
        data = auth_ns.payload
        employee = Employee.query.get_or_404(user_id)
        if data["new_password"] != data["confirm_new_password"]:
            auth_ns.abort(400, "Passwords do not match")
        employee.password_hash = generate_password_hash(data['new_password'])
        db.session.commit()
        return {"message": "Password changed successfully"}, 200

@auth_ns.route('/user/<int:user_id>')
class UserManagement(Resource):
    @auth_ns.expect(update_user_model)
    @auth_ns.marshal_with(user_model)
    @jwt_required()
    def put(self, user_id):
        """Update user data"""
        data = auth_ns.payload
        employee = Employee.query.get_or_404(user_id)

        # Update basic user information
        if 'username' in data:
            if Employee.query.filter_by(username=data['username']).first() and Employee.query.filter_by(id=get_jwt_identity()).first().username != data['username']:
                auth_ns.abort(400, "Username already exists")
            employee.username = data['username']
        if 'password' in data:
            employee.password_hash = generate_password_hash(data['password'])
        if 'phone_number' in data:
            employee.phone_number = data['phone_number']
        if 'job_name' in data:
            employee.job_name = data['job_name']
        
        # Update permissions if provided
        if 'permissions' in data:
            permissions = data['permissions']
            
            # Create Invoice permissions
            if 'createInvoice' in permissions:
                create_invoice = permissions['createInvoice']
                if 'create_inventory_operations' in create_invoice:
                    employee.create_inventory_operations = create_invoice['create_inventory_operations']
                if 'create_additions' in create_invoice:
                    employee.create_additions = create_invoice['create_additions']
            
            # Manage Operations permissions
            if 'manageOperations' in permissions:
                manage_operations = permissions['manageOperations']
                if 'view_additions' in manage_operations:
                    employee.view_additions = manage_operations['view_additions']
                if 'view_withdrawals' in manage_operations:
                    employee.view_withdrawals = manage_operations['view_withdrawals']
                if 'view_deposits' in manage_operations:
                    employee.view_deposits = manage_operations['view_deposits']
                if 'view_returns' in manage_operations:
                    employee.view_returns = manage_operations['view_returns']
                if 'view_damages' in manage_operations:
                    employee.view_damages = manage_operations['view_damages']
                if 'view_reservations' in manage_operations:
                    employee.view_reservations = manage_operations['view_reservations']
                if 'view_prices' in manage_operations:
                    employee.view_prices = manage_operations['view_prices']
                if 'view_purchase_requests' in manage_operations:
                    employee.view_purchase_requests = manage_operations['view_purchase_requests']
                if 'view_reports' in manage_operations:
                    employee.view_reports = manage_operations['view_reports']
                if 'can_edit' in manage_operations:
                    employee.can_edit = manage_operations['can_edit']
                if 'can_delete' in manage_operations:
                    employee.can_delete = manage_operations['can_delete']
                if 'can_confirm_withdrawal' in manage_operations:
                    employee.can_confirm_withdrawal = manage_operations['can_confirm_withdrawal']
                if 'can_withdraw' in manage_operations:
                    employee.can_withdraw = manage_operations['can_withdraw']
                if 'can_update_prices' in manage_operations:
                    employee.can_update_prices = manage_operations['can_update_prices']
                if 'can_recover_deposits' in manage_operations:
                    employee.can_recover_deposits = manage_operations['can_recover_deposits']
                if 'can_confirm_purchase_requests' in manage_operations:
                    employee.can_confirm_purchase_request = manage_operations['can_confirm_purchase_requests']
            
            # Items permissions
            if 'items' in permissions:
                items = permissions['items']
                if 'items_can_edit' in items:
                    employee.items_can_edit = items['items_can_edit']
                if 'items_can_delete' in items:
                    employee.items_can_delete = items['items_can_delete']
                if 'items_can_add' in items:
                    employee.items_can_add = items['items_can_add']
            
            # Machines permissions
            if 'machines' in permissions:
                machines = permissions['machines']
                if 'machines_can_edit' in machines:
                    employee.machines_can_edit = machines['machines_can_edit']
                if 'machines_can_delete' in machines:
                    employee.machines_can_delete = machines['machines_can_delete']
                if 'machines_can_add' in machines:
                    employee.machines_can_add = machines['machines_can_add']
            
            # Mechanism permissions
            if 'mechanism' in permissions:
                mechanism = permissions['mechanism']
                if 'mechanism_can_edit' in mechanism:
                    employee.mechanism_can_edit = mechanism['mechanism_can_edit']
                if 'mechanism_can_delete' in mechanism:
                    employee.mechanism_can_delete = mechanism['mechanism_can_delete']
                if 'mechanism_can_add' in mechanism:
                    employee.mechanism_can_add = mechanism['mechanism_can_add']
            
            # Suppliers permissions
            if 'suppliers' in permissions:
                suppliers = permissions['suppliers']
                if 'suppliers_can_edit' in suppliers:
                    employee.suppliers_can_edit = suppliers['suppliers_can_edit']
                if 'suppliers_can_delete' in suppliers:
                    employee.suppliers_can_delete = suppliers['suppliers_can_delete']
                if 'suppliers_can_add' in suppliers:
                    employee.suppliers_can_add = suppliers['suppliers_can_add']
            
            
        
        db.session.commit()
        return employee, 200

    @jwt_required()
    def delete(self, user_id):
        """Delete a user"""
        employee = Employee.query.get_or_404(user_id)
        db.session.delete(employee)
        db.session.commit()
        return {"message": "User deleted successfully"}, 200

@auth_ns.route('/users')
class Users(Resource):
    @auth_ns.marshal_list_with(pagination_model)
    @auth_ns.expect(pagination_parser)
    @jwt_required()
    def get(self):
        """Get all users"""
        args = pagination_parser.parse_args()
        page = int(args['page'])
        page_size = int(args['page_size'])
        all_results = bool(args['all'])
        if page < 1 or page_size < 1:
            auth_ns.abort(400, "Page and page_size must be positive integers")
        offset = (page - 1) * page_size
        query = Employee.query
        if not all_results:
            employees = query.limit(page_size).offset(offset).all()
        else:
            employees = query.all()

        total_count = Employee.query.count()
        return {
            'users': employees,
            'page': page,
            'page_size': page_size,
            'total_pages': (total_count + page_size - 1) // page_size,
            'total_items': total_count,
            'all': all_results
        }, 200

@auth_ns.route('/user')
class CurrentUser(Resource):
    @jwt_required()
    @auth_ns.marshal_with(user_model)
    def get(self):
        """Get current user details"""
        user_id = get_jwt_identity()
        user = Employee.query.get(user_id)
        if not user:
            auth_ns.abort(404, "User not found")
        return user, 200
    
    
