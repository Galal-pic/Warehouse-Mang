from flask_restx import Namespace, Resource, fields
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity
from werkzeug.security import generate_password_hash, check_password_hash
from . import db
from .models import Employee

# Create namespace
auth_ns = Namespace('auth', description='Authentication operations')

# Models for API documentation
registration_model = auth_ns.model('Registration', {
    'username': fields.String(required=True, description='Username'),
    'password': fields.String(required=True, description='Password'),
    'phone_number': fields.String(description='Phone number'),
    'job_name': fields.String(required=True, description='Job title'),
    'create_invoice_status': fields.String(required=True, description='Create invoice status'),
    'manage_operation_status': fields.String(required=True, description='Manage operation status'),
    'items_access_status': fields.String(required=True, description='Items access status'),
    'machine_access_status': fields.String(required=True, description='Machine access status'),
    'mechanism_access_status': fields.String(required=True, description='Mechanism access status'),
    'supplier_access_status': fields.String(required=True, description='Supplier access status'),
})

login_model = auth_ns.model('Login', {
    'username': fields.String(required=True, description='Username'),
    'password': fields.String(required=True, description='Password')
})

user_model = auth_ns.model('User', {
    'id': fields.Integer(readOnly=True, description='User ID'),
    'username': fields.String(description='Username'),
    'phone_number': fields.String(description='Phone number'),
    'job_name': fields.String(description='Job title')
})

update_user_model = auth_ns.model('UpdateUser', {
    'username': fields.String(description='Username'),
    'password': fields.String(description='Password'),
    'phone_number': fields.String(description='Phone number'),
    'job_name': fields.String(description='Job title')
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

        # Check if username already exists
        if Employee.query.filter_by(username=data['username']).first():
            auth_ns.abort(400, "Username already exists")

        # Hash password
        hashed_password = generate_password_hash(data['password'])

        # Create new employee
        new_employee = Employee(
            username=data['username'],
            password_hash=hashed_password,
            phone_number=data.get('phone_number'),
            job_name=data['job_name'],
            create_invoice_status=data['create_invoice_status'],
            manage_operation_status=data['manage_operation_status'],
            items_access_status=data['items_access_status'],
            machine_access_status=data['machine_access_status'],
            mechanism_access_status=data['mechanism_access_status'],
            supplier_access_status=data['supplier_access_status']
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

        access_token = create_access_token(identity=employee.id)
        return {"access_token": access_token}, 200

@auth_ns.route('/user/<int:user_id>')
class UserManagement(Resource):
    @auth_ns.expect(update_user_model)
    @auth_ns.marshal_with(user_model)
    @jwt_required()
    @auth_ns.response(200, 'User updated successfully')
    @auth_ns.response(404, 'User not found')
    def put(self, user_id):
        """Update user data"""
        data = auth_ns.payload
        employee = Employee.query.get_or_404(user_id)

        if 'username' in data:
            employee.username = data['username']
        if 'password' in data:
            employee.password_hash = generate_password_hash(data['password'])
        if 'phone_number' in data:
            employee.phone_number = data['phone_number']
        if 'job_name' in data:
            employee.job_name = data['job_name']
        if 'create_invoice_status' in data:
            employee.create_invoice_status = data['create_invoice_status']
        if 'manage_operation_status' in data:
            employee.manage_operation_status = data['manage_operation_status']
        if 'items_access_status' in data:
            employee.items_access_status = data['items_access_status']
        if 'machine_access_status' in data:
            employee.machine_access_status = data['machine_access_status']
        if 'mechanism_access_status' in data:
            employee.mechanism_access_status = data['mechanism_access_status']
        if 'supplier_access_status' in data:
            employee.supplier_access_status = data['supplier_access_status']
        
        db.session.commit()
        return employee, 200

    @jwt_required()
    @auth_ns.response(200, 'User deleted successfully')
    @auth_ns.response(404, 'User not found')
    def delete(self, user_id):
        """Delete a user"""
        employee = Employee.query.get_or_404(user_id)
        db.session.delete(employee)
        db.session.commit()
        return {"message": "User deleted successfully"}, 200

@auth_ns.route('/users')
class Users(Resource):
    @auth_ns.marshal_list_with(user_model)
    @jwt_required()
    @auth_ns.response(200, 'List of all users')
    def get(self):
        """Get all users"""
        return Employee.query.all()

@auth_ns.route('/user')
class CurrentUser(Resource):
    @jwt_required()
    @auth_ns.marshal_with(user_model)
    @auth_ns.response(200, 'Current user details')
    @auth_ns.response(404, 'User not found')
    def get(self):
        """Get current user details"""
        user_id = get_jwt_identity()
        user = Employee.query.get(user_id)
        if not user:
            auth_ns.abort(404, "User not found")
        return user, 200
