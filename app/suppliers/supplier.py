from flask_restx import Namespace, Resource, fields
from flask_jwt_extended import jwt_required
from .. import db
from ..models import Supplier

supplier_ns = Namespace('supplier', description='supplier operations')

# Models for API documentation
supplier_model = supplier_ns.model('Supplier', {
    "id": fields.Integer(required=True),
    'name': fields.String(required=True),
    'description': fields.String(required=False),
})


@supplier_ns.route('/excel')
class MechanismExcel(Resource):

    @supplier_ns.marshal_with(supplier_model)
    @jwt_required()
    def post(self):
        """Create a new supplier"""
        data = supplier_ns.payload
        data = data.get("data",[])
        for Supplier in data:
            if Supplier.query.filter_by(name=Supplier["name"]).first() or Supplier.query.filter_by(name=Supplier["description"]).first():
                return supplier_ns.abort(400, "supplier already exists")
            new_Supplier = Supplier(
                name=Supplier["name"],
                description=Supplier.get("description")
            )
            db.session.add(new_Supplier)
            db.session.commit()
# Supplier Endpoints
@supplier_ns.route('/')
class SupplierList(Resource):
    @supplier_ns.marshal_list_with(supplier_model)
    @jwt_required()
    def get(self):
        """Get all suppliers"""
        suppliers = Supplier.query.all()
        return suppliers

    # @Supplier_ns.expect(Supplier_model)
    @supplier_ns.marshal_with(supplier_model)
    @jwt_required()
    def post(self):
        """Create a new supplier"""
        data = supplier_ns.payload
        if Supplier.query.filter_by(name=data['name']).first():
            return supplier_ns.abort(400, "supplier already exists")

        new_supplier = Supplier(
            name=data["name"],
            description=data.get("description")
        )
        db.session.add(new_supplier)
        db.session.commit()
        return new_supplier, 201

@supplier_ns.route('/<int:supplier_id>')
class SupplierDetail(Resource):
    @supplier_ns.marshal_with(supplier_model)
    @jwt_required()
    def get(self, supplier_id):
        """Get a supplier by ID"""
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
        return supplier

    @jwt_required()
    def delete(self, supplier_id):
        """Delete a supplier"""
        supplier = Supplier.query.get_or_404(supplier_id)
        db.session.delete(supplier)
        db.session.commit()
        return {"message": "supplier deleted successfully"}, 200
