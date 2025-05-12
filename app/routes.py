from flask_restx import Namespace, Resource, fields
from flask_jwt_extended import jwt_required, get_jwt_identity
from datetime import datetime
from . import db
from .operations.booking import Booking_Operations, delete_booking, put_booking
from .operations.returns import Return_Operations, delete_return, put_return
from .operations.sales import Sales_Operations, delete_sales, put_sales
from .operations.warranty import Warranty_Operations, delete_warranty, put_warranty
from .operations.void import Void_Operations, delete_void, put_void
from .purchases.purchase import Purchase_Operations, delete_purchase, put_purchase
from .operations.purchase_request import PurchaseRequest_Operations, put_purchase_request, delete_purchase_request
from .warehouses.warehouse import warehouse_ns, item_location_ns
from .machines.machine import machine_ns
from .mechanisms.mechanism import mechanism_ns
from .suppliers.supplier import supplier_ns
from .models import (
    Employee, Machine, Mechanism, Warehouse, ItemLocations, Invoice, InvoiceItem,
    Supplier, Prices, InvoicePriceDetail, PurchaseRequests
)
from sqlalchemy import desc
from sqlalchemy.exc import SQLAlchemyError
from .utils import parse_bool

invoice_ns = Namespace('invoice', description='Invoice operations')

# Parser for query parameters
pagination_parser = invoice_ns.parser()
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
                               help='Get all invoices (default: True) \naccepts values [\'true\', \'false\', \'1\', \'0\', \'t\', \'f\', \'y\', \'n\', \'yes\', \'no\']')

# Price Detail Model (for FIFO tracking)
price_detail_model = invoice_ns.model('PriceDetail', {
    'source_invoice_id': fields.Integer(description='ID of the source invoice'),
    'source_price_id': fields.Integer(description='ID of the source price'),
    'quantity': fields.Integer(description='Quantity from this price point'),
    'unit_price': fields.Float(description='Unit price at this price point'),
    'subtotal': fields.Float(description='Subtotal for this price point')
})

# InvoiceItem Model
invoice_item_model = invoice_ns.model('InvoiceItem', {
    'item_name': fields.String(required=True),
    'barcode': fields.String(required=True),
    'quantity': fields.Integer(required=True),
    'location': fields.String(required=True),
    'total_price': fields.Float(required=True),  # total price
    'unit_price': fields.Float(required=True),   # unit price
    'description': fields.String(required=False),
    'price_details': fields.List(fields.Nested(price_detail_model), description='FIFO price breakdown')
})

# Invoice Model
invoice_model = invoice_ns.model('Invoice', {
    'id': fields.Integer(required=True),
    'original_invoice_id': fields.Integer(required=False),
    'type': fields.String(required=True),
    'client_name': fields.String(required=False),
    'warehouse_manager': fields.String(required=False),
    'accreditation_manager': fields.String(required=False),
    'total_amount': fields.Float(required=False),
    'paid': fields.Float(required=False),
    'residual': fields.Float(required=False),
    'comment': fields.String(required=False),
    'status': fields.String(required=False),
    'employee_name': fields.String(required=True),
    'machine_name': fields.String(required=True),
    'mechanism_name': fields.String(required=True),
    'supplier_name': fields.String(required=False),
    "created_at": fields.String(required=False),
    'items': fields.List(fields.Nested(invoice_item_model)),
    
})

# Model for pagination
pagination_model = invoice_ns.model('InvoicesPagination', {
    'invoices': fields.List(fields.Nested(invoice_model)),
    'page': fields.Integer(required=True),
    'page_size': fields.Integer(required=True),
    'total_pages': fields.Integer(required=True),
    'total_items': fields.Integer(required=True),
    'all': fields.Boolean(required=True)
})


@invoice_ns.route('/<string:type>')
class invoices_get(Resource):
    @invoice_ns.marshal_list_with(pagination_model)
    @jwt_required()
    @invoice_ns.expect(pagination_parser)
    def get(self, type):
        """Get invoices by type"""
        args = pagination_parser.parse_args()
        page = int(args['page'])
        page_size = int(args['page_size'])
        all_results = bool(args['all'])
        if page < 1 or page_size < 1:
            invoice_ns.abort(400, "Page and page_size must be positive integers")
        
        offset = (page - 1) * page_size
        # Building a query
        
        query = Invoice.query.filter_by(type=type)
        
        # Applying pagination
        if not all_results:
            invoices = query.limit(page_size).offset(offset).all()
        else:
            invoices = query.all()
        total_count = query.count()
        
        result = []
        for invoice in invoices:
            # Fetch related machine, mechanism and supplier data
            machine = Machine.query.get(invoice.machine_id) if invoice.machine_id else None
            mechanism = Mechanism.query.get(invoice.mechanism_id) if invoice.mechanism_id else None
            supplier = Supplier.query.get(invoice.supplier_id) if invoice.supplier_id else None

            # Fetch related items data
            items = InvoiceItem.query.filter_by(invoice_id=invoice.id).all()
            
            # Prepare items with price details for FIFO transactions
            item_list = []
            for item in items:
                # Get price details if this is a sales or void or warranty type invoice (FIFO consumer)
                price_details = []
                if type in ['صرف', 'توالف', 'أمانات']:
                    details = InvoicePriceDetail.query.filter_by(
                        invoice_id=invoice.id,
                        item_id=item.item_id
                    ).all()
                    
                    for detail in details:
                        # Get source invoice information
                        source_invoice = Invoice.query.get(detail.source_price_id)
                        price_details.append({
                            'source_invoice_id': detail.source_price_id,
                            'source_price_id': detail.source_price_id,
                            'quantity': detail.quantity,
                            'unit_price': detail.unit_price,
                            'subtotal': detail.subtotal
                        })

                item_data = {
                    "item_name": Warehouse.query.get(item.item_id).item_name,
                    "barcode": Warehouse.query.get(item.item_id).item_bar,
                    "quantity": item.quantity,
                    "location": item.location,
                    "total_price": item.total_price,
                    'unit_price': item.unit_price,
                    "description": item.description,
                }
                
                # Add price details if they exist
                if price_details:
                    item_data['price_details'] = price_details
                    
                item_list.append(item_data)
            
            # Serialize the invoice with related data
            invoice_data = {
                "id": invoice.id,
                "type": invoice.type,
                "client_name": invoice.client_name,
                "warehouse_manager": invoice.warehouse_manager,
                'accreditation_manager': invoice.accreditation_manager,
                "total_amount": invoice.total_amount,
                'paid': invoice.paid,
                'residual': invoice.residual,
                'comment': invoice.comment,
                'status': invoice.status,
                "employee_name": invoice.employee_name,
                "machine_name": machine.name if machine else None,
                "mechanism_name": mechanism.name if mechanism else None,
                "supplier_name": supplier.name if supplier else None,
                "created_at": invoice.created_at,
                "items": item_list
            }
            result.append(invoice_data)
            
        final_result = {
            'invoices': result,
            'page': page,
            'page_size': page_size,
            'total_pages': (total_count + page_size - 1) // page_size,
            'total_items': total_count,
            'all': all_results 
        }
        return final_result


# Invoice Endpoints
@invoice_ns.route('/')
class InvoiceList(Resource):
    @invoice_ns.marshal_list_with(pagination_model)
    @invoice_ns.expect(pagination_parser)
    @jwt_required()
    def get(self):
        """Get all invoices with related machine, mechanism, and item data"""
        args = pagination_parser.parse_args()
        page = int(args['page'])
        page_size = int(args['page_size'])
        all_results = bool(args['all'])
        if page < 1 or page_size < 1:
            invoice_ns.abort(400, "Page and page_size must be positive integers")
        
        offset = (page - 1) * page_size
        # Fetch all invoices
        query = Invoice.query
        if not all_results:
            invoices = query.limit(page_size).offset(offset).all()
        else: 
            invoices = query.all()
        total_count = query.count()


        # Prepare the response data
        result = []
        for invoice in invoices:
            # Fetch related machine, mechanism and supplier data
            machine = Machine.query.get(invoice.machine_id) if invoice.machine_id else None
            mechanism = Mechanism.query.get(invoice.mechanism_id) if invoice.mechanism_id else None
            supplier = Supplier.query.get(invoice.supplier_id) if invoice.supplier_id else None

            # Fetch related items data
            items = InvoiceItem.query.filter_by(invoice_id=invoice.id).all()
            
            # Prepare items with price details for FIFO transactions
            item_list = []
            for item in items:
                # Get price details if this is a sales or void or warranty type invoice (FIFO consumer)
                price_details = []
                if invoice.type in ['صرف', 'توالف', 'أمانات']:
                    details = InvoicePriceDetail.query.filter_by(
                        invoice_id=invoice.id,
                        item_id=item.item_id
                    ).all()
                    
                    for detail in details:
                        # Get source invoice information
                        price_details.append({
                            'source_invoice_id': detail.source_price_id,
                            'source_price_id': detail.source_price_id,
                            'quantity': detail.quantity,
                            'unit_price': detail.unit_price,
                            'subtotal': detail.subtotal
                        })

                item_data = {
                    "item_name": Warehouse.query.get(item.item_id).item_name,
                    "barcode": Warehouse.query.get(item.item_id).item_bar,
                    "quantity": item.quantity,
                    "location": item.location,
                    "total_price": item.total_price,
                    'unit_price': item.unit_price,
                    "description": item.description,
                }
                
                # Add price details if they exist
                if price_details:
                    item_data['price_details'] = price_details
                    
                item_list.append(item_data)
            
            # Serialize the invoice with related data
            invoice_data = {
                "id": invoice.id,
                "type": invoice.type,
                "client_name": invoice.client_name,
                "warehouse_manager": invoice.warehouse_manager,
                "accreditation_manager": invoice.accreditation_manager,
                "total_amount": invoice.total_amount,
                'paid': invoice.paid,
                'residual': invoice.residual,
                'comment': invoice.comment,
                'status': invoice.status,
                "employee_name": invoice.employee_name,
                "machine_name": machine.name if machine else None,
                "mechanism_name": mechanism.name if mechanism else None,
                "supplier_name": supplier.name if supplier else None,
                "created_at": invoice.created_at,
                "items": item_list
            }
            result.append(invoice_data)

        return {
            'invoices': result,
            'page': page,
            'page_size': page_size,
            'total_pages': (total_count + page_size - 1) // page_size,
            'total_items': total_count,
            'all': all_results 
        }, 200

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
        supplier = None
        
        # Get supplier if name provided
        if 'supplier_name' in data and data['supplier_name']:
            supplier = Supplier.query.filter_by(name=data['supplier_name']).first()

        if not machine or not mechanism:
            invoice_ns.abort(404, "Machine or Mechanism not found")
            
        # If supplier is required for certain types but not provided
        if data['type'] == 'اضافه' and not supplier:
            invoice_ns.abort(404, "Supplier is required for purchase invoices")

        # Create the invoice based on its type
        result = None
        if data['type'] == 'صرف':
            result = Sales_Operations(data, machine, mechanism, supplier, employee, machine_ns, warehouse_ns, invoice_ns, mechanism_ns, item_location_ns, supplier_ns)
        elif data['type'] == 'اضافه':
            result = Purchase_Operations(data, machine, mechanism, supplier, employee, machine_ns, warehouse_ns, invoice_ns, mechanism_ns, item_location_ns, supplier_ns)
        elif data['type'] == 'أمانات':
            result = Warranty_Operations(data, machine, mechanism, supplier, employee, machine_ns, warehouse_ns, invoice_ns, mechanism_ns, item_location_ns, supplier_ns)
        elif data['type'] == 'مرتجع':
            result = Return_Operations(data, machine, mechanism, supplier, employee, machine_ns, warehouse_ns, invoice_ns, mechanism_ns, item_location_ns, supplier_ns)
        elif data['type'] == 'توالف':
            result = Void_Operations(data, machine, mechanism, supplier, employee, machine_ns, warehouse_ns, invoice_ns, mechanism_ns, item_location_ns, supplier_ns)
        elif data['type'] == 'حجز':
            result = Booking_Operations(data, machine, mechanism, supplier, employee, machine_ns, warehouse_ns, invoice_ns, mechanism_ns, item_location_ns, supplier_ns)
        elif data['type'] == 'طلب شراء':
            result = PurchaseRequest_Operations(data, machine, mechanism, supplier, employee, machine_ns, warehouse_ns, invoice_ns, mechanism_ns, item_location_ns, supplier_ns)
        else:
            invoice_ns.abort(400, f"Invalid invoice type: {data['type']}")
            
        # Return the created invoice
        if result:
            return result[0], result[1]
        return {"message": "Invoice created"}, 201
    
@invoice_ns.route('/<int:invoice_id>')
class InvoiceDetail(Resource):
    @invoice_ns.marshal_with(invoice_model)
    @jwt_required()
    def get(self, invoice_id):
        """Get an invoice by ID"""
        invoice = Invoice.query.get_or_404(invoice_id)
        
        # Fetch related machine, mechanism and supplier data
        machine = Machine.query.get(invoice.machine_id) if invoice.machine_id else None
        mechanism = Mechanism.query.get(invoice.mechanism_id) if invoice.mechanism_id else None
        supplier = Supplier.query.get(invoice.supplier_id) if invoice.supplier_id else None
        
        # Fetch related items data
        items = InvoiceItem.query.filter_by(invoice_id=invoice.id).all()
        
        # Prepare items with price details for FIFO transactions
        item_list = []
        for item in items:
            # Get price details if this is a sales or void or warranty type invoice (FIFO consumer)
            price_details = []
            if invoice.type in ['صرف', 'توالف', 'أمانات']:
                details = InvoicePriceDetail.query.filter_by(
                    invoice_id=invoice.id,
                    item_id=item.item_id
                ).all()
                
                for detail in details:
                    # Get source invoice information
                    price_details.append({
                        'source_invoice_id': detail.source_price_id,
                        'source_price_id': detail.source_price_id,
                        'quantity': detail.quantity,
                        'unit_price': detail.unit_price,
                        'subtotal': detail.subtotal
                    })

            item_data = {
                "item_name": Warehouse.query.get(item.item_id).item_name,
                "barcode": Warehouse.query.get(item.item_id).item_bar,
                "quantity": item.quantity,
                "location": item.location,
                "total_price": item.total_price,
                'unit_price': item.unit_price,
                "description": item.description,
            }
            
            # Add price details if they exist
            if price_details:
                item_data['price_details'] = price_details
                
            item_list.append(item_data)
        
        # Serialize the invoice with related data
        invoice_data = {
            "id": invoice.id,
            "type": invoice.type,
            "client_name": invoice.client_name,
            "warehouse_manager": invoice.warehouse_manager,
            "accreditation_manager": invoice.accreditation_manager,
            "total_amount": invoice.total_amount,
            'paid': invoice.paid,
            'residual': invoice.residual,
            'comment': invoice.comment,
            'status': invoice.status,
            "employee_name": invoice.employee_name,
            "machine_name": machine.name if machine else None,
            "mechanism_name": mechanism.name if mechanism else None,
            "supplier_name": supplier.name if supplier else None,
            "created_at": invoice.created_at,
            "items": item_list
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
        supplier = None
        
        # Get supplier if name provided
        if 'supplier_name' in data and data['supplier_name']:
            supplier = Supplier.query.filter_by(name=data['supplier_name']).first()

        if not machine or not mechanism:
            invoice_ns.abort(404, "Machine or Mechanism not found")
            
        # Update supplier ID in the data if supplier is found
        if supplier:
            data["supplier_id"] = supplier.id
            
        # Call the appropriate update function based on invoice type
        if invoice.type == 'صرف':
            put_sales(data, invoice, machine, mechanism, invoice_ns)
        elif invoice.type == 'اضافه':
            put_purchase(data, invoice, machine, mechanism, invoice_ns)
        elif invoice.type == 'أمانات':
            put_warranty(data, invoice, machine, mechanism, invoice_ns)
        elif invoice.type == 'مرتجع':
            put_return(data, invoice, machine, mechanism, invoice_ns)
        elif invoice.type == 'توالف':
            put_void(data, invoice, machine, mechanism, invoice_ns)
        elif invoice.type == 'حجز':
            put_booking(data, invoice, machine, mechanism, invoice_ns)
        elif invoice.type == 'طلب شراء':
            put_purchase_request(data, invoice, machine, mechanism, invoice_ns)

        return {"message": "Invoice updated successfully"}, 200

        
    @jwt_required()
    def delete(self, invoice_id):
        """Delete an invoice"""
        invoice = Invoice.query.get_or_404(invoice_id)
        
        # Call the appropriate delete function based on invoice type
        if invoice.type == 'صرف':
            result = delete_sales(invoice, invoice_ns)
        elif invoice.type == 'اضافه':
            result = delete_purchase(invoice, invoice_ns)
        elif invoice.type == 'أمانات':
            result = delete_warranty(invoice, invoice_ns)
        elif invoice.type == 'مرتجع':
            result = delete_return(invoice, invoice_ns)
        elif invoice.type == "توالف":
            result = delete_void(invoice, invoice_ns)
        elif invoice.type == 'حجز':
            result = delete_booking(invoice, invoice_ns)
        elif invoice.type == 'طلب شراء':
            result = delete_purchase_request(invoice, invoice_ns)
            
        return {"message": "Invoice deleted successfully"}, 200

@invoice_ns.route('/last-id')
class LastInvoiceId(Resource):
    @jwt_required()
    def get(self):
        """Get the last invoice ID"""
        last_invoice = Invoice.query.order_by(Invoice.id.desc()).first()
        if last_invoice:
            return {"last_id": last_invoice.id + 1}, 200
        return {"last_id": 1}, 200  # If no invoices exist, return 1
    
@invoice_ns.route('/<int:invoice_id>/confirm')
class ConfirmInvoice(Resource):
    @invoice_ns.doc('confirm_invoice')
    @jwt_required()
    def post(self, invoice_id):
        """Confirm an invoice through the approval workflow"""
        invoice = Invoice.query.get_or_404(invoice_id)
        
        employee = Employee.query.get(get_jwt_identity())
        
        if invoice.status == 'draft':
            invoice.status = 'accreditation'
            invoice.accreditation_manager = employee.username
        elif invoice.status == 'accreditation':
            invoice.status = 'confirmed'
            invoice.warehouse_manager = employee.username
        else:
            invoice_ns.abort(400, f"Invoice cannot be confirmed from status '{invoice.status}'")
            
        db.session.commit()
        return {"message": f"Invoice status updated to '{invoice.status}'"}, 200

@invoice_ns.route('/fifo-prices/<int:item_id>')
class FifoPriceList(Resource):
    @jwt_required()
    def get(self, item_id):
        """Get FIFO price records for a specific item"""
        # Get the item
        item = Warehouse.query.get_or_404(item_id)
        
        # Get all price records for this item ordered by creation date (oldest first for FIFO)
        price_entries = Prices.query.filter_by(item_id=item_id).order_by(Prices.invoice_id.asc()).all()
        
        result = []
        for price in price_entries:
            if price.quantity > 0:  # Only include records with positive quantity
                # Get source invoice information
                source_invoice = Invoice.query.get(price.invoice_id)
                
                result.append({
                    'price_id': price.invoice_id,  # This is actually a composite primary key
                    'invoice_id': price.invoice_id,
                    'invoice_type': source_invoice.type if source_invoice else 'Unknown',
                    'invoice_date': source_invoice.created_at.strftime('%Y-%m-%d %H:%M:%S') if source_invoice else None,
                    'quantity': price.quantity,
                    'unit_price': price.unit_price,
                    'created_at': price.created_at.strftime('%Y-%m-%d %H:%M:%S')
                })
        
        return {
            'item_id': item_id,
            'item_name': item.item_name,
            'item_bar': item.item_bar,
            'price_records': result
        }, 200
    
@invoice_ns.route('/<int:invoice_id>/ReturnWarranty')
class ReturnWarranty(Resource):
    @invoice_ns.doc('return_warranty')
    @jwt_required()
    def post(self, invoice_id):
        """Return items from a warranty invoice and restore stock"""
        invoice = Invoice.query.get_or_404(invoice_id)

        # Check if it's a warranty invoice
        if invoice.type != 'أمانات':
            invoice_ns.abort(400, "Can only return warranty invoices with this method")
        
        # Check if the invoice is already returned
        if invoice.status == 'returned':
            invoice_ns.abort(400, "This warranty invoice has already been returned")

        try:
            # 1. Restore prices based on price details
            price_details = InvoicePriceDetail.query.filter_by(invoice_id=invoice.id).all()
            price_restorations = {}
            
            for detail in price_details:
                key = (detail.source_price_id, detail.item_id)
                if key in price_restorations:
                    price_restorations[key]['quantity'] += detail.quantity
                else:
                    price_restorations[key] = {
                        'invoice_id': detail.source_price_id,
                        'item_id': detail.item_id,
                        'quantity': detail.quantity,
                        'unit_price': detail.unit_price
                    }
            
            for key, restoration in price_restorations.items():
                price_entry = Prices.query.filter_by(
                    invoice_id=restoration['invoice_id'],
                    item_id=restoration['item_id']
                ).first()
                
                if price_entry:
                    price_entry.quantity += restoration['quantity']
                else:
                    new_price = Prices(
                        invoice_id=restoration['invoice_id'],
                        item_id=restoration['item_id'],
                        quantity=restoration['quantity'],
                        unit_price=restoration['unit_price'],
                        created_at=datetime.now()
                    )
                    db.session.add(new_price)

            # 2. Restore quantities for each item
            for invoice_item in invoice.items:
                # Find the item location
                item_location = ItemLocations.query.filter_by(
                    item_id=invoice_item.item_id,
                    location=invoice_item.location
                ).first()

                if not item_location:
                    # Create the location if it doesn't exist
                    item_location = ItemLocations(
                        item_id=invoice_item.item_id,
                        location=invoice_item.location,
                        quantity=0
                    )
                    db.session.add(item_location)

                # Restore the quantity
                item_location.quantity += invoice_item.quantity

            # 3. Update the invoice status to indicate it has been returned
            invoice.status = 'returned'
            db.session.commit()

            return {"message": "Warranty invoice returned and stock restored successfully"}, 200

        except Exception as e:
            db.session.rollback()
            invoice_ns.abort(500, f"Error returning warranty invoice: {str(e)}")
            
#Purchase Request Confirmation
@invoice_ns.route('/<int:invoice_id>/PurchaseRequestConfirmation')
class PurchaseRequestConfirmation(Resource):
    @invoice_ns.doc('purchase_request_confirmation')
    @jwt_required()
    def post(self, invoice_id):
        invoice = Invoice.query.get_or_404(invoice_id)
        purchase_requests = PurchaseRequests.query.filter_by(invoice_id=invoice.id).all()
        # Check if it's a purchase request invoice
        if invoice.type != 'طلب شراء':
            invoice_ns.abort(400, "Can only confirm purchase request invoices with this method")

        # Check if the invoice is already confirmed
        if invoice.status == 'confirmed':
            invoice_ns.abort(400, "This purchase request invoice has already been confirmed")

        try:
            for request in purchase_requests:
                invoice_item = InvoiceItem.query.filter_by(item_id=request.item_id, invoice_id=invoice.id).first()
                invoice_price_datils = InvoicePriceDetail.query.filter_by(
                    invoice_id=invoice.id,
                    item_id=request.item_id
                ).first()
                
                item_location = ItemLocations.query.filter_by(
                    item_id=request.item_id,
                    location=invoice_item.location
                ).first()
                item_location.quantity += request.requested_quantity
                
                source_price_id = Prices.query.filter_by(
                    invoice_id=invoice_price_datils.source_price_id
                ).first()
                source_price_id.quantity += request.requested_quantity
                request.status = 'confirmed'
                
            #Confirm the invoice
            invoice.status = 'confirmed'
            db.session.commit()
            return {"message": "Purchase request invoice confirmed successfully"}, 200

        except Exception as e:
            db.session.rollback()
            invoice_ns.abort(500, f"Error confirming purchase request invoice: {str(e)}")
            
            
    
@invoice_ns.route('/inventory-value')
class InventoryValue(Resource):
    @invoice_ns.expect(pagination_parser)
    @jwt_required()
    def get(self):
        """Get total inventory value based on FIFO pricing"""
        # Calculate inventory value by item
        args = pagination_parser.parse_args()
        page = int(args['page'])
        page_size = int(args['page_size'])
        all_results = bool(args['all'])
        if page < 1 or page_size < 1:
            invoice_ns.abort(400, "Page and page_size must be positive integers")
        offset = (page - 1) * page_size
        query = Warehouse.query
        if not all_results:
            items = query.limit(page_size).offset(offset).all() 
        else:
            items = query.all()
        total_count = query.count()
        inventory_value = 0
        item_values = []
        
        for item in items:
            # Get all price records for this item
            price_entries = Prices.query.filter_by(item_id=item.id).all()
            
            # Calculate value for this item
            item_value = sum(price.quantity * price.unit_price for price in price_entries if price.quantity > 0)
            inventory_value += item_value
            
            # Get total quantity for this item
            total_quantity = sum(loc.quantity for loc in item.item_locations)
            
            # Add item details to the result
            if total_quantity > 0:
                item_values.append({
                    'item_id': item.id,
                    'item_name': item.item_name,
                    'item_bar': item.item_bar,
                    'total_quantity': total_quantity,
                    'value': item_value,
                    'average_unit_value': item_value / total_quantity if total_quantity > 0 else 0
                })
        result = {
            'total_inventory_value': inventory_value,
            'items': sorted(item_values, key=lambda x: x['value'], reverse=True)
        }
        
        return {
            'result': result,
            'total_count': total_count,
            'page': page,
            'page_size': page_size,
            'total_pages': (total_count + page_size - 1) // page_size,
            'all': all_results 
            }, 200

@invoice_ns.route('/price-report/<int:invoice_id>')
class PriceTrackingReport(Resource):
    @jwt_required()
    def get(self, invoice_id):
        """Get detailed price tracking report for an invoice"""
        invoice = Invoice.query.get_or_404(invoice_id)
        
        # Only FIFO consumers have price details
        if invoice.type not in ['صرف', 'توالف', 'أمانات']:
            return {
                "message": f"Price tracking reports are only available for sales, void, and warranty invoices."
            }, 400
            
        # Get related entities
        machine = Machine.query.get(invoice.machine_id) if invoice.machine_id else None
        mechanism = Mechanism.query.get(invoice.mechanism_id) if invoice.mechanism_id else None
        supplier = Supplier.query.get(invoice.supplier_id) if invoice.supplier_id else None
        employee = Employee.query.get(invoice.employee_id)
        
        # Get invoice items
        items = InvoiceItem.query.filter_by(invoice_id=invoice.id).all()
        
        # Prepare detailed item reports
        item_reports = []
        for item in items:
            warehouse_item = Warehouse.query.get(item.item_id)
            
            # Get price details for this item
            price_details = InvoicePriceDetail.query.filter_by(
                invoice_id=invoice.id,
                item_id=item.item_id
            ).all()
            
            price_breakdowns = []
            for detail in price_details:
                # Get source invoice information
                source_invoice = Invoice.query.get(detail.source_price_id)
                
                # Create detailed breakdown
                breakdown = {
                    'source_invoice_id': detail.source_price_id,
                    'source_invoice_type': source_invoice.type if source_invoice else 'Unknown',
                    'source_invoice_date': source_invoice.created_at.strftime('%Y-%m-%d %H:%M:%S') if source_invoice else None,
                    'source_client': source_invoice.client_name if source_invoice else None,
                    'quantity': detail.quantity,
                    'unit_price': detail.unit_price,
                    'subtotal': detail.subtotal,
                    'percentage_of_total': round((detail.quantity / item.quantity) * 100, 2) if item.quantity > 0 else 0
                }
                price_breakdowns.append(breakdown)
            
            # Create the item report
            item_report = {
                'item_id': item.item_id,
                'item_name': warehouse_item.item_name,
                'barcode': warehouse_item.item_bar,
                'location': item.location,
                'quantity': item.quantity,
                'unit_price': item.unit_price,
                'total_price': item.total_price,
                'price_sources': len(price_breakdowns),
                'price_breakdowns': price_breakdowns
            }
            item_reports.append(item_report)
        
        # Create the full report
        report = {
            'invoice_id': invoice.id,
            'invoice_type': invoice.type,
            'invoice_date': invoice.created_at.strftime('%Y-%m-%d %H:%M:%S'),
            'client_name': invoice.client_name,
            'status': invoice.status,
            'employee': {
                'id': employee.id,
                'name': employee.username
            },
            'machine': {
                'id': machine.id if machine else None,
                'name': machine.name if machine else None
            },
            'mechanism': {
                'id': mechanism.id if mechanism else None,
                'name': mechanism.name if mechanism else None
            },
            'supplier': {
                'id': supplier.id if supplier else None,
                'name': supplier.name if supplier else None
            },
            'total_amount': invoice.total_amount,
            'paid': invoice.paid,
            'residual': invoice.residual,
            'items': item_reports
        }
        
        return report, 200
@invoice_ns.route('/fifo-report')
class FifoInventoryReport(Resource):
    @invoice_ns.expect(pagination_parser)
    @jwt_required()
    def get(self):
        """Get comprehensive FIFO inventory report with price tracking"""
        # Get all warehouse items
        args = pagination_parser.parse_args()
        page = int(args['page'])
        page_size = int(args['page_size'])
        all_results = bool(args['all'])
        if page < 1 or page_size < 1:
            invoice_ns.abort(400, "Page and page_size must be positive integers")
        
        offset = (page - 1) * page_size
        query = Warehouse.query
        if not all_results:
            items = query.limit(page_size).offset(offset).all()
        else:
            items = query.all()
        total_count = query.count()
        
        # Initialize the report
        item_reports = []
        total_inventory_value = 0
        total_inventory_quantity = 0
        
        for item in items:
            # Get price records for this item
            price_entries = Prices.query.filter_by(item_id=item.id).order_by(Prices.invoice_id.asc()).all()
            
            # Get physical inventory
            locations = ItemLocations.query.filter_by(item_id=item.id).all()
            physical_inventory = sum(loc.quantity for loc in locations)
            
            # Calculate priced inventory and value
            price_layers = []
            priced_inventory = 0
            item_value = 0
            
            for price in price_entries:
                if price.quantity > 0:
                    source_invoice = Invoice.query.get(price.invoice_id)
                    layer_value = price.quantity * price.unit_price
                    
                    layer = {
                        'invoice_id': price.invoice_id,
                        'invoice_type': source_invoice.type if source_invoice else 'Unknown',
                        'date': price.created_at.strftime('%Y-%m-%d %H:%M:%S'),
                        'quantity': price.quantity,
                        'unit_price': price.unit_price,
                        'layer_value': layer_value,
                        'percentage_of_item': round((price.quantity / physical_inventory) * 100, 2) if physical_inventory > 0 else 0
                    }
                    price_layers.append(layer)
                    
                    priced_inventory += price.quantity
                    item_value += layer_value
            
            # Calculate discrepancies
            inventory_discrepancy = physical_inventory - priced_inventory
            
            # Skip items with no inventory
            if physical_inventory == 0 and priced_inventory == 0:
                continue
                
            # Create the item report
            item_report = {
                'item_id': item.id,
                'item_name': item.item_name,
                'item_bar': item.item_bar,
                'physical_inventory': physical_inventory,
                'priced_inventory': priced_inventory,
                'inventory_discrepancy': inventory_discrepancy,
                'total_value': item_value,
                'average_unit_price': item_value / priced_inventory if priced_inventory > 0 else 0,
                'location_breakdown': [
                    {
                        'location': loc.location,
                        'quantity': loc.quantity,
                        'percentage': round((loc.quantity / physical_inventory) * 100, 2) if physical_inventory > 0 else 0
                    }
                    for loc in locations if loc.quantity > 0
                ],
                'price_layers': price_layers
            }
            
            item_reports.append(item_report)
            total_inventory_value += item_value
            total_inventory_quantity += physical_inventory
        
        # Sort by value (highest first)
        item_reports.sort(key=lambda x: x['total_value'], reverse=True)
        
        # Create the comprehensive report
        report = {
            'report_date': datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
            'total_items': len(item_reports),
            'total_inventory_quantity': total_inventory_quantity,
            'total_inventory_value': total_inventory_value,
            'items': item_reports
        }
        
        return {
            'report': report,
            'total_items': total_count,
            'page': page,
            'page_size': page_size,
            'total_pages': (total_count + page_size - 1) // page_size,
            'all': all_results     
                }, 200
    

# Define the resource class
@invoice_ns.route('/updateprice/<int:invoice_id>')
class UpdateInvoicePrice(Resource):
    def get(self, invoice_id):
        """
        Update prices for items in an invoice where price is zero.
        Uses the latest available price for each item.
        
        Parameters:
        invoice_id (int): ID of the invoice to update
        
        Returns:
        tuple: (response_data, status_code)
        """
        try:
            # Get the invoice
            invoice = Invoice.query.get(invoice_id)
            if not invoice:
                return {"error": f"Invoice with ID {invoice_id} not found"}, 404
            
            # Track changes for the response
            updated_items = []
            total_price_change = 0
            
            # Find items with zero price
            zero_price_items = InvoiceItem.query.filter_by(invoice_id=invoice_id).filter(InvoiceItem.unit_price == 0).all()
            
            if not zero_price_items:
                return {"message": "No items with zero price found in this invoice"}, 200
            
            # Process each zero-price item
            for item in zero_price_items:
                # Get the latest price for this item - use desc() to get the most recent price
                latest_price = Prices.query.filter_by(item_id=item.item_id).order_by(Prices.invoice_id).first()
                
                if not latest_price:
                    continue  # Skip if no price found
                
                # Store old price for tracking
                old_price = item.unit_price
                old_total = item.total_price
                
                # Update the item price
                item.unit_price = latest_price.unit_price
                item.total_price = item.quantity * latest_price.unit_price
                
                # Calculate price change
                price_change = item.total_price - old_total
                total_price_change += price_change
                
                # Create a price detail record
                price_detail = InvoicePriceDetail(
                    invoice_id=invoice.id,
                    item_id=item.item_id,
                    source_price_id=latest_price.invoice_id,
                    quantity=item.quantity,
                    unit_price=latest_price.unit_price,
                    subtotal=item.total_price
                )
                
                db.session.add(price_detail)
                
                # Track the update
                updated_items.append({
                    "item_id": item.item_id,
                    "old_price": old_price,
                    "new_price": latest_price.unit_price,
                    "quantity": item.quantity,
                    "price_change": price_change
                })
            
            # Update invoice totals
            if updated_items:
                invoice.total_amount += total_price_change
                invoice.residual = invoice.total_amount - invoice.paid
            
            # Commit changes
            db.session.commit()
            
            return {
                "message": f"Updated prices for {len(updated_items)} items",
                "updated_items": updated_items,
                "total_price_change": total_price_change,
                "new_invoice_total": invoice.total_amount
            }, 200
            
        except SQLAlchemyError as e:
            db.session.rollback()
            return {"error": f"Database error: {str(e)}"}, 500
        except Exception as e:
            db.session.rollback()
            return {"error": f"Error updating prices: {str(e)}"}, 500