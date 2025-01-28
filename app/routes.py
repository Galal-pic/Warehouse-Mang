from flask_restx import Namespace, Resource, fields
from flask_jwt_extended import jwt_required, get_jwt_identity
from . import db
from .operations.booking import Booking_Operations,delete_booking,put_booking
from .operations.returns import Return_Operations,delete_return,put_return
from .operations.sales import Sales_Operations,delete_sales,put_sales
from .operations.warranty import Warranty_Operations,delete_warranty,put_warranty
from .operations.void import Void_Operations,delete_void,put_avoid
from .purchases.purchase import Purchase_Operations,delete_purchase,put_purchase
from .warehouses.warehouse import warehouse_ns,item_location_ns
from .machines.machine import machine_ns
from .mechanisms.mechanism import mechanism_ns
from .suppliers.supplier import supplier_ns
from .models import (
    Employee, Machine, Mechanism, Warehouse, ItemLocations, Invoice, InvoiceItem,Supplier
)

invoice_ns = Namespace('invoice', description='Invoice operations')

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
    'warehouse_manager': fields.String(required=False),
    'total_amount': fields.Float(required=False),
    'paid': fields.Float(required=False),
    'residual':fields.Float(required=False),
    'comment':fields.String(required=False),
    'status':fields.String(required=False),
    'employee_name': fields.String(required=True),
    'machine_name': fields.String(required=True),
    'mechanism_name': fields.String(required=True),
    'supplier_name': fields.String(required=False),
    "created_at":fields.String(required=False),
    'items': fields.List(fields.Nested(invoice_item_model)),
})
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
            supplier = Supplier.query.get(invoice.supplier_id) if invoice.supplier_id else None

            # Fetch related items data
            items = InvoiceItem.query.filter_by(invoice_id=invoice.id).all()
            # Serialize the invoice with related data
            invoice_data = {
                "id": invoice.id,
                "type": invoice.type,
                "client_name": invoice.client_name,
                "warehouse_manager": invoice.warehouse_manager,
                "total_amount": invoice.total_amount,
                'paid': invoice.paid,
                'residual': invoice.residual,
                'comment': invoice.comment,
                'status': invoice.status,
                "employee_name": invoice.employee_name,
                "machine_name": machine.name if machine else None,
                "mechanism_name": mechanism.name if mechanism else None,
                "supplier_name": supplier.name if supplier else None,
                "created_at":invoice.created_at,
                "items": [
                    {
                        "item_name": Warehouse.query.get(item.item_id).item_name,
                        "barcode":  Warehouse.query.get(item.item_id).item_bar,
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
        supplier = Supplier.query.filter_by(name=data['supplier_name']).first() # Get the Supplier object

        if not machine or not mechanism:
            invoice_ns.abort(404, "Machine or Mechanism or supplier not found")

        if data['type'] == 'صرف':
            Sales_Operations(data, machine, mechanism,supplier, employee, machine_ns, warehouse_ns, invoice_ns, mechanism_ns, item_location_ns,supplier_ns)
        elif data['type'] == 'اضافه':
            Purchase_Operations(data, machine, mechanism, supplier,employee, machine_ns, warehouse_ns, invoice_ns, mechanism_ns, item_location_ns,supplier_ns)
        elif data['type'] =='أمانات':
            Warranty_Operations(data, machine, mechanism, supplier, employee, machine_ns, warehouse_ns, invoice_ns, mechanism_ns, item_location_ns, supplier_ns)
        elif data['type'] == 'مرتجع':
            Return_Operations(data, machine, mechanism, supplier, employee, machine_ns, warehouse_ns, invoice_ns, mechanism_ns, item_location_ns, supplier_ns)
        elif data['type'] == 'توالف':
            Void_Operations(data, machine, mechanism, supplier, employee, machine_ns, warehouse_ns, invoice_ns, mechanism_ns, item_location_ns, supplier_ns)
        elif data['type'] == 'حجز':
            Booking_Operations(data, machine, mechanism, supplier, employee, machine_ns, warehouse_ns, invoice_ns, mechanism_ns, item_location_ns, supplier_ns)
    
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
                "Warehouse_manager": invoice.warehouse_manager,
                "total_amount": invoice.total_amount,
                'paid': invoice.paid,
                'residual': invoice.residual,
                'comment': invoice.comment,
                'status': invoice.status,
                "employee_name": invoice.employee_name,
                "machine_name": machine.name if machine else None,
                "mechanism_name": mechanism.name if mechanism else None,
                "created_at":invoice.created_at,
            "items": [
                {
                    "item_name": Warehouse.query.get(item.item_id).item_name,
                    "barcode":  Warehouse.query.get(item.item_id).item_bar,
                    "quantity": item.quantity,
                    "location": item.location,
                    "total_price": item.total_price,
                    "description": item.description
                }
                for item in items
            ]
        }
        return invoice_data

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
        
        if invoice.type =='صرف':
            put_sales(data,invoice,machine,mechanism,invoice_ns)
        elif invoice.type =='اضافه':
            put_purchase(data,invoice,machine,mechanism,invoice_ns)
        elif invoice.type =='أمانات':
            put_warranty(data,invoice,machine,mechanism,invoice_ns)
        elif invoice.type =='مرتجع':
            put_return(data,invoice,machine,mechanism,invoice_ns)
        elif invoice.type =='توالف':
            put_avoid(data,invoice,machine,mechanism,invoice_ns)
        elif invoice.type =='حجز':
            put_booking(data,invoice,machine,mechanism,invoice_ns)

        return {"message": "Invoice edit successfully"}, 200

        
    @jwt_required()
    def delete(self, invoice_id):
        """Delete an invoice"""
        invoice = Invoice.query.get_or_404(invoice_id)
        if invoice.type  =='صرف':
            delete_sales(invoice,invoice_ns)
        elif invoice.type =='اضافه':
            delete_purchase(invoice, invoice_ns)
        elif invoice.type =='أمانات':
            delete_warranty(invoice, invoice_ns)
        elif invoice.type =='مرتجع':
            delete_return(invoice, invoice_ns)
        elif invoice.type =='تالف':
            delete_void(invoice, invoice_ns)
        elif invoice.type =='حجز':
            delete_booking(invoice, invoice_ns)
        
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
    
@invoice_ns.route('/<int:invoice_id>/confirm')
class ConfirmInvoice(Resource):
    @invoice_ns.doc('confirm_invoice')
    @jwt_required()
    def post(self, invoice_id):
        invoice = Invoice.query.get_or_404(invoice_id)
        if invoice.type != 'صرف' or invoice.status != 'draft':
            invoice_ns.abort(400, "Invoice cannot be confirmed")
        # Update invoice status to confirmed
        invoice.status = 'confirmed'
        employee = Employee.query.get(get_jwt_identity())
        invoice.warehouse_manager = employee.username
        db.session.commit()
        return {"message": "Invoice confirmed successfully"}, 200