from flask_restx import Namespace, Resource, fields
from flask_jwt_extended import jwt_required, get_jwt_identity
from . import db
from .models import (
    Employee, Machine, Mechanism, Warehouse, ItemLocations, Invoice, InvoiceItem
)
from datetime import datetime
from .utils import Sales_Operations

# Namespaces
machine_ns = Namespace('machine', description='Machine operations')
mechanism_ns = Namespace('mechanism', description='Mechanism operations')
warehouse_ns = Namespace('warehouse', description='Warehouse operations')
item_location_ns = Namespace('item_location', description='Item Location operations')
invoice_ns = Namespace('invoice', description='Invoice operations')

# Models for API documentation
machine_model = machine_ns.model('Machine', {
    "id": fields.Integer(required=True),
    'name': fields.String(required=True),
    'description': fields.String(required=False),
})

mechanism_model = mechanism_ns.model('Mechanism', {
    "id": fields.Integer(required=True),
    'name': fields.String(required=True),
    'description': fields.String(required=False),
})

# ItemLocation Model
item_location_model = item_location_ns.model('ItemLocation', {
    'location': fields.String(required=True, description='Location of the item in the warehouse'),
    'price_unit': fields.Float(required=True, description='Price per unit of the item', example=0.0),
    'quantity': fields.Integer(required=True, description='Quantity of the item', example=0)
})

# Warehouse Model
warehouse_model = warehouse_ns.model('Warehouse', {
    'id': fields.Integer(required=True),
    'item_name': fields.String(required=True, description='Name of the warehouse item'),
    'item_bar': fields.String(required=True, description='Barcode of the warehouse item'),
    'locations': fields.List(fields.Nested(item_location_model), description='List of locations for the item')
})

# InvoiceItem Model
invoice_item_model = invoice_ns.model('InvoiceItem', {
    'item_name': fields.String(required=True),
    'barcode': fields.String(required=True),
    'quantity': fields.Integer(required=True),
    'location': fields.String(required=True),
    'total_price': fields.Float(required=True),  # pre unit
    'description': fields.String(required=False),
})

# Invoice Model
invoice_model = invoice_ns.model('Invoice', {
    'id': fields.Integer(required=True),
    'type': fields.String(required=True),
    'client_name': fields.String(required=False),
    'Warehouse_manager': fields.String(required=False),
    'total_amount': fields.Float(required=False),
    'employee_name': fields.String(required=True),
    'machine_name': fields.String(required=True),
    'mechanism_name': fields.String(required=True),
    'items': fields.List(fields.Nested(invoice_item_model)),
})

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

# Warehouse Endpoints
@warehouse_ns.route('/')
class WarehouseList(Resource):
    @warehouse_ns.marshal_list_with(warehouse_model)
    @jwt_required()
    def get(self):
        """Get all warehouse items with their locations"""
        warehouse_items = Warehouse.query.all()
        result = []

        for item in warehouse_items:
            # Get all locations for the current warehouse item
            locations = ItemLocations.query.filter_by(item_id=item.id).all()
            

            # Prepare the response for this item
            item_data = {
                "id": item.id,  # Include the id field
                "item_name": item.item_name,
                "item_bar": item.item_bar,
                "locations": [
                    {
                        "location": loc.location,
                        "price_unit": loc.price_unit,
                        "quantity": loc.quantity
                    }
                    for loc in locations
                ]
            }
            result.append(item_data)

        return result, 200

    # @warehouse_ns.expect(warehouse_model)
    @warehouse_ns.marshal_with(warehouse_model)
    @jwt_required()
    def post(self):
        """Create a new warehouse item"""
        data = warehouse_ns.payload
        # Check if item with the same name or barcode already exists
        existing_item = (Warehouse.query.filter_by(item_name=data['item_name']).first()) or (Warehouse.query.filter_by(item_bar=data['item_bar']).first())

        # If the item exists, check if the location already exists for the same item
        if existing_item:
            existing_location = ItemLocations.query.filter_by(
                location=data['locations'][0]['location'],  # Check the location in the payload
                item_id=existing_item.id
            ).first()
        else:
            existing_location = None

        # If the item and location already exist, abort
        if existing_item and existing_location:
            warehouse_ns.abort(400, "Item with the same name or barcode and same location already exists")

        # If the item exists but the location is new, add the new location
        if existing_item and not existing_location:
            new_location = ItemLocations(
                item_id=existing_item.id,  # Use the ID of the existing warehouse item
                location=data["locations"][0]["location"],
                price_unit=data["locations"][0]["price_unit"],
                quantity=data["locations"][0]["quantity"]
            )
            db.session.add(new_location)
            db.session.commit()

            # Prepare the response
            response = {
                "id": existing_item.id,  # Include the id field
                "item_name": existing_item.item_name,
                "item_bar": existing_item.item_bar,
                "locations": [
                    {
                        "location": new_location.location,
                        "price_unit": new_location.price_unit,
                        "quantity": new_location.quantity
                    }
                ]
            }
            return response, 201

        # If the item does not exist, create both the item and the location
        if not existing_item:
            new_item = Warehouse(
                item_name=data["item_name"],
                item_bar=data["item_bar"]
            )
            db.session.add(new_item)
            db.session.commit()

            new_location = ItemLocations(
                item_id=new_item.id,  # Use the ID of the newly created warehouse item
                location=data["locations"][0]["location"],
                price_unit=data["locations"][0]["price_unit"],
                quantity=data["locations"][0]["quantity"]
            )
            db.session.add(new_location)
            db.session.commit()

            # Prepare the response
            response = {
                "id": new_item.id,  # Include the id field
                "item_name": new_item.item_name,
                "item_bar": new_item.item_bar,
                "locations": [
                    {
                        "location": new_location.location,
                        "price_unit": new_location.price_unit,
                        "quantity": new_location.quantity
                    }
                ]
            }
            return response, 201

@warehouse_ns.route('/<int:item_id>')
class WarehouseDetail(Resource):
    @warehouse_ns.marshal_with(warehouse_model)
    @jwt_required()
    def get(self, item_id):
        """Get a warehouse item by ID with its locations"""
        item = Warehouse.query.get_or_404(item_id)
        locations = ItemLocations.query.filter_by(item_id=item.id).all()

        # Prepare the response
        response = {
            "id": item.id,  # Include the id field
            "item_name": item.item_name,
            "item_bar": item.item_bar,
            "locations": [
                {
                    "location": loc.location,
                    "price_unit": loc.price_unit,
                    "quantity": loc.quantity
                }
                for loc in locations
            ]
        }
        return response, 200

    # @warehouse_ns.expect(warehouse_model)
    @warehouse_ns.marshal_with(warehouse_model)
    @jwt_required()
    def put(self, item_id):
        """Update a warehouse item and its locations"""
        data = warehouse_ns.payload
        item = Warehouse.query.get_or_404(item_id)

        # Update warehouse item fields
        item.item_name = data["item_name"]
        item.item_bar = data["item_bar"]

        # Get existing locations for the item
        existing_locations = ItemLocations.query.filter_by(item_id=item.id).all()

        # Create a set of incoming locations for easy comparison
        incoming_locations = {loc_data["location"] for loc_data in data["locations"]}

        # Delete locations that are not in the incoming data
        for existing_loc in existing_locations:
            if existing_loc.location not in incoming_locations:
                db.session.delete(existing_loc)

        # Update or add locations
        for loc_data in data["locations"]:
            location = ItemLocations.query.filter_by(
                item_id=item.id,
                location=loc_data["location"]
            ).first()

            if location:
                # Update existing location
                location.price_unit = loc_data["price_unit"]
                location.quantity = loc_data["quantity"]
            else:
                # Add new location
                new_location = ItemLocations(
                    item_id=item.id,
                    location=loc_data["location"],
                    price_unit=loc_data["price_unit"],
                    quantity=loc_data["quantity"]
                )
                db.session.add(new_location)

        db.session.commit()

        # Prepare the response
        response = {
            "id": item.id,  # Include the id field
            "item_name": item.item_name,
            "item_bar": item.item_bar,
            "locations": [
                {
                    "location": loc_data["location"],
                    "price_unit": loc_data["price_unit"],
                    "quantity": loc_data["quantity"]
                }
                for loc_data in data["locations"]
            ]
        }
        return response, 200

    @jwt_required()
    def delete(self, item_id):
        """Delete a warehouse item and its associated locations"""
        item = Warehouse.query.get_or_404(item_id)

        # Delete all associated locations
        ItemLocations.query.filter_by(item_id=item.id).delete()

        # Delete the warehouse item
        db.session.delete(item)
        db.session.commit()

        return {"message": "Warehouse item and its locations deleted successfully"}, 200

# Invoice Endpoints
@invoice_ns.route('/')
class InvoiceList(Resource):
    @invoice_ns.marshal_list_with(invoice_model)
    @jwt_required()
    def get(self):
        """Get all invoices with related machine, mechanism, and item data"""
        # Fetch all invoices
        invoices = Invoice.query.all()

        # Prepare the response data
        result = []
        for invoice in invoices:
            # Fetch related machine and mechanism data
            machine = Machine.query.get(invoice.machine_id) if invoice.machine_id else None
            mechanism = Mechanism.query.get(invoice.mechanism_id) if invoice.mechanism_id else None

            # Fetch related items data
            items = InvoiceItem.query.filter_by(invoice_id=invoice.id).all()
            # Serialize the invoice with related data
            invoice_data = {
                "id": invoice.id,
                "type": invoice.type,
                "client_name": invoice.client_name,
                "Warehouse_manager": invoice.Warehouse_manager,
                "total_amount": invoice.total_amount,
                "employee_name": invoice.employee_name,
                "machine_name": machine.name if machine else None,
                "mechanism_name": mechanism.name if mechanism else None,
                "items": [
                    {
                        "item_name": Warehouse.query.get(item.item_id).item_name,
                        "barcode":  Warehouse.query.get(item.item_id).item_name,
                        "quantity": item.quantity,
                        "location": item.location,
                        "total_price": item.total_price,
                        "description": item.description
                    }
                    for item in items
                ]
            }
            result.append(invoice_data)

        return result

    # @invoice_ns.expect(invoice_model)
    @invoice_ns.marshal_with(invoice_model)
    @jwt_required()
    def post(self):
        """Create a new invoice"""
        data = invoice_ns.payload

        # Get the employee ID from the JWT token
        employee_id = get_jwt_identity()
        employee = Employee.query.filter_by(id=employee_id).first()  # Get the Employee object

        # Get the machine and mechanism by name
        machine = Machine.query.filter_by(name=data['machine_name']).first()  # Get the Machine object
        mechanism = Mechanism.query.filter_by(name=data['mechanism_name']).first()  # Get the Mechanism object

        if not machine or not mechanism:
            invoice_ns.abort(404, "Machine or Mechanism not found")

        if data['type'] == 'صرف':
            Sales_Operations(data, machine, mechanism, employee, machine_ns, warehouse_ns, invoice_ns, mechanism_ns, item_location_ns)

        # Create the invoice
        new_invoice = Invoice(
            type=data["type"],
            client_name=data.get("client_name"),
            Warehouse_manager=data.get("Warehouse_manager"),
            total_amount=data.get("total_amount", 0),  # Default to 0 if not provided
            employee_name=employee.username,  # Set the employee_name
            employee_id=employee.id,  # Set the employee_id
            machine_id=machine.id,  # Set the machine_id
            mechanism_id=mechanism.id,  # Set the mechanism_id
        )

        # Add invoice items
        for item_data in data["items"]:
            # Look up the warehouse item by name
            warehouse_item = Warehouse.query.filter_by(item_name=item_data["item_name"]).first()
            item_details = ItemLocations.query.filter_by(item_id=warehouse_item.id, location=item_data['location']).first()
            if not warehouse_item or not item_details:
                invoice_ns.abort(404, f"Item with name '{item_data['item_name']}' or location '{item_data['location']}' not found in warehouse")

            # Create the invoice item
            new_item = InvoiceItem(
                invoice=new_invoice,  # Link to the invoice
                warehouse=warehouse_item,  # Link to the warehouse item
                quantity=item_data["quantity"],
                location=item_data["location"],
                total_price=item_data['total_price'],  # Use the provided total price
                description=item_data.get("description"),
            )

            # Add the invoice item to the session
            db.session.add(new_item)

        # Add the invoice to the session and commit
        db.session.add(new_invoice)
        db.session.commit()

        return new_invoice, 201

@invoice_ns.route('/<int:invoice_id>')
class InvoiceDetail(Resource):
    @invoice_ns.marshal_with(invoice_model)
    @jwt_required()
    def get(self, invoice_id):
        """Get an invoice by ID"""
        invoice = Invoice.query.get_or_404(invoice_id)
        # Fetch related machine and mechanism data
        machine = Machine.query.get(invoice.machine_id) if invoice.machine_id else None
        mechanism = Mechanism.query.get(invoice.mechanism_id) if invoice.mechanism_id else None
        # Fetch related items data
        items = InvoiceItem.query.filter_by(invoice_id=invoice.id).all()
        # Serialize the invoice with related data
        invoice_data = {
            "id": invoice.id,
            "type": invoice.type,
            "client_name": invoice.client_name,
            "warehouse_manager": invoice.Warehouse_manager,
            "total_amount": invoice.total_amount,
            "employee_name": invoice.employee_name,
            "employee_id": invoice.employee_id,
            "machine_name": machine.name if machine else None,
            "mechanism_name": mechanism.name if mechanism else None,
            "items": [
                {
                    "item_name": Warehouse.query.get(item.item_id).item_name,
                    "barcode":  Warehouse.query.get(item.item_id).item_name,
                    "quantity": item.quantity,
                    "location": item.location,
                    "total_price": item.total_price,
                    "description": item.description
                }
                for item in items
            ]
        }
        return invoice_data

    # @invoice_ns.expect(invoice_model)
@invoice_ns.route('/<int:invoice_id>')
class InvoiceDetail(Resource):
    @invoice_ns.marshal_with(invoice_model)
    @jwt_required()
    def put(self, invoice_id):
        """Update an invoice"""
        data = invoice_ns.payload
        invoice = Invoice.query.get_or_404(invoice_id)

        # Fetch the machine and mechanism by name
        machine = Machine.query.filter_by(name=data["machine_name"]).first()
        mechanism = Mechanism.query.filter_by(name=data["mechanism_name"]).first()

        if not machine or not mechanism:
            invoice_ns.abort(404, "Machine or Mechanism not found")

        # Update invoice fields
        invoice.type = data["type"]
        invoice.client_name = data.get("client_name")
        invoice.Warehouse_manager = data.get("Warehouse_manager")
        invoice.total_amount = data.get("total_amount")
        invoice.employee_name = data["employee_name"]
        invoice.machine_id = machine.id
        invoice.mechanism_id = mechanism.id

        # Get existing items in the invoice
        existing_items = { (item.item_id, item.location): item for item in invoice.items }

        # Track items to keep (those present in the payload)
        items_to_keep = set()

        # Update or add items
        for item_data in data["items"]:
            # Fetch the warehouse item by name
            warehouse_item = Warehouse.query.filter_by(item_name=item_data["item_name"]).first()
            if not warehouse_item:
                invoice_ns.abort(404, f"Item with name '{item_data['item_name']}' not found in warehouse")

            # Fetch the item location details
            item_location = ItemLocations.query.filter_by(item_id=warehouse_item.id, location=item_data["location"]).first()
            if not item_location:
                invoice_ns.abort(404, f"Item location '{item_data['location']}' not found for item '{item_data['item_name']}'")

            # Check if the item already exists in the invoice
            key = (warehouse_item.id, item_data["location"])
            if key in existing_items:
                # Update existing item
                existing_item = existing_items[key]
                existing_item.quantity = item_data["quantity"]
                existing_item.total_price = item_data["quantity"] * item_location.price_unit
                existing_item.description = item_data.get("description")
            else:
                # Add new item
                new_item = InvoiceItem(
                    invoice_id=invoice.id,
                    item_id=warehouse_item.id,
                    quantity=item_data["quantity"],
                    location=item_data["location"],
                    total_price=item_data["quantity"] * item_location.price_unit,
                    description=item_data.get("description"),
                )
                db.session.add(new_item)

            # Mark this item as "to keep"
            items_to_keep.add(key)

        # Delete items that are not in the payload
        for key, item in existing_items.items():
            if key not in items_to_keep:
                db.session.delete(item)

        db.session.commit()
        return invoice
        
    @jwt_required()
    def delete(self, invoice_id):
        """Delete an invoice"""
        invoice = Invoice.query.get_or_404(invoice_id)
        db.session.delete(invoice)
        db.session.commit()
        return {"message": "Invoice deleted successfully"}, 200

@invoice_ns.route('/last-id')
class LastInvoiceId(Resource):
    @jwt_required()
    def get(self):
        """Get the last invoice ID"""
        last_invoice = Invoice.query.order_by(Invoice.id.desc()).first()
        if last_invoice:
            return {"last_id": last_invoice.id + 1}, 200
        return {"last_id": 0}, 200  # If no invoices exist, return 0