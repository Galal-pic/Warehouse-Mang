from flask_restx import Namespace, Resource, fields
from flask_jwt_extended import jwt_required
from .. import db
from ..models import Mechanism

mechanism_ns = Namespace('mechanism', description='Mechanism operations')

mechanism_model = mechanism_ns.model('Mechanism', {
    "id": fields.Integer(required=True),
    'name': fields.String(required=True),
    'description': fields.String(required=False),
})



@mechanism_ns.route('/excel')
class MechanismExcel(Resource):

    @mechanism_ns.marshal_with(mechanism_model)
    @jwt_required()
    def post(self):
        """Create a new Mechanism"""
        data = mechanism_ns.payload
        data = data.get("data",[])
        for Mechanism in data:
            if Mechanism.query.filter_by(name=Mechanism["name"]).first() or Mechanism.query.filter_by(name=Mechanism["description"]).first():
                return mechanism_ns.abort(400, "Mechanism already exists")
            new_Mechanism = Mechanism(
                name=Mechanism["name"],
                description=Mechanism.get("description")
            )
            db.session.add(new_Mechanism)
            db.session.commit()

# Mechanism Endpoints
@mechanism_ns.route('/')
class MechanismList(Resource):
    @mechanism_ns.marshal_list_with(mechanism_model)
    @jwt_required()
    def get(self):
        """Get all mechanisms"""
        mechanisms = Mechanism.query.all()
        return mechanisms

    # @mechanism_ns.expect(mechanism_model)
    @mechanism_ns.marshal_with(mechanism_model)
    @jwt_required()
    def post(self):
        """Create a new mechanism"""
        data = mechanism_ns.payload
        if Mechanism.query.filter_by(name=data['name']).first():
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

