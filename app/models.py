from datetime import datetime
from . import db

# Add this to your models.py file, replacing the existing Employee model

class Employee(db.Model):
    __tablename__ = 'employee'
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False, index=True)
    password_hash = db.Column(db.String(120), nullable=False)
    job_name = db.Column(db.String(100), nullable=False)
    phone_number = db.Column(db.String(20))
    
    # Create Invoice Permissions
    create_inventory_operations = db.Column(db.Boolean, default=False)
    create_additions = db.Column(db.Boolean, default=False)
    
    # Manage Operations Permissions
    view_additions = db.Column(db.Boolean, default=False)
    view_withdrawals = db.Column(db.Boolean, default=False)
    view_deposits = db.Column(db.Boolean, default=False)
    view_returns = db.Column(db.Boolean, default=False)
    view_damages = db.Column(db.Boolean, default=False)
    view_reservations = db.Column(db.Boolean, default=False)
    view_prices = db.Column(db.Boolean, default=False)
    view_purchase_requests = db.Column(db.Boolean, default=False)
    
    can_edit = db.Column(db.Boolean, default=False)
    can_delete = db.Column(db.Boolean, default=False)
    can_confirm_withdrawal = db.Column(db.Boolean, default=False)
    can_withdraw = db.Column(db.Boolean, default=False)
    can_update_prices = db.Column(db.Boolean, default=False)
    can_recover_deposits = db.Column(db.Boolean, default=False)
    can_confirm_purchase_requests = db.Column(db.Boolean, default=False)
    
    # Items Permissions
    items_can_edit = db.Column(db.Boolean, default=False)
    items_can_delete = db.Column(db.Boolean, default=False)
    items_can_add = db.Column(db.Boolean, default=False)
    
    # Machines Permissions
    machines_can_edit = db.Column(db.Boolean, default=False)
    machines_can_delete = db.Column(db.Boolean, default=False)
    machines_can_add = db.Column(db.Boolean, default=False)
    
    # Mechanism Permissions
    mechanism_can_edit = db.Column(db.Boolean, default=False)
    mechanism_can_delete = db.Column(db.Boolean, default=False)
    mechanism_can_add = db.Column(db.Boolean, default=False)
    
    # Suppliers Permissions
    suppliers_can_edit = db.Column(db.Boolean, default=False)
    suppliers_can_delete = db.Column(db.Boolean, default=False)
    suppliers_can_add = db.Column(db.Boolean, default=False)
    
    # Relationship with Invoice
    invoices = db.relationship('Invoice', back_populates='employee', lazy=True)
    purchase_requests = db.relationship('PurchaseRequests', back_populates='employee', lazy=True)

class Supplier(db.Model):
    __tablename__ = 'supplier'
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(255), unique=True, nullable=False, index=True)
    description = db.Column(db.Text, unique=True, nullable=False)

    # Relationship with Invoice
    invoices = db.relationship('Invoice', back_populates='supplier', lazy=True)

# Machine Model
class Machine(db.Model):
    __tablename__ = 'machine'
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(255), unique=True, nullable=False, index=True)
    description = db.Column(db.Text, unique=True, nullable=False)

    # Relationship with Invoice
    invoices = db.relationship('Invoice', back_populates='machine', lazy=True)
    purchase_requests = db.relationship('PurchaseRequests', back_populates='machine', lazy=True)

# Mechanism Model
class Mechanism(db.Model):
    __tablename__ = 'mechanism'
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(255), unique=True, nullable=False, index=True)
    description = db.Column(db.Text, unique=True, nullable=False)

    # Relationship with Invoice
    invoices = db.relationship('Invoice', back_populates='mechanism', lazy=True)
    purchase_requests = db.relationship('PurchaseRequests', back_populates='mechanism', lazy=True)

# Invoice Model
class Invoice(db.Model):
    __tablename__ = 'invoice'
    id = db.Column(db.Integer, primary_key=True)
    type = db.Column(db.String(50), nullable=False, index=True)
    created_at = db.Column(db.DateTime, default=datetime.now, index=True)
    client_name = db.Column(db.String(50))
    warehouse_manager = db.Column(db.String(255))
    accreditation_manager = db.Column(db.String(255))
    total_amount = db.Column(db.Float, nullable=True)
    paid = db.Column(db.Float)
    residual = db.Column(db.Float)
    comment = db.Column(db.String(255))
    status = db.Column(db.String(50), default="draft")
    employee_name = db.Column(db.String(50), nullable=False)
    employee_id = db.Column(db.Integer, db.ForeignKey('employee.id'), nullable=False)
    machine_id = db.Column(db.Integer, db.ForeignKey('machine.id'), nullable=True)
    mechanism_id = db.Column(db.Integer, db.ForeignKey('mechanism.id'), nullable=True)
    supplier_id = db.Column(db.Integer, db.ForeignKey('supplier.id'), nullable=True)

    # Relationships
    employee = db.relationship('Employee', back_populates='invoices')
    machine = db.relationship('Machine', back_populates='invoices')
    mechanism = db.relationship('Mechanism', back_populates='invoices')
    supplier = db.relationship('Supplier', back_populates='invoices')
    purchase_requests = db.relationship('PurchaseRequests', back_populates='invoice',)

    items = db.relationship('InvoiceItem', back_populates='invoice', cascade='all, delete-orphan')
    prices = db.relationship('Prices', back_populates='invoice', cascade='all, delete-orphan')
    price_details = db.relationship('InvoicePriceDetail', back_populates='invoice', cascade='all, delete-orphan')
    

class InvoiceItem(db.Model):
    __tablename__ = 'invoice_item'
    invoice_id = db.Column(db.Integer, db.ForeignKey('invoice.id'), primary_key=True)
    item_id = db.Column(db.Integer, db.ForeignKey('warehouse.id'), primary_key=True)
    location = db.Column(db.String(255), primary_key=True)
    quantity = db.Column(db.Integer, nullable=True)
    total_price = db.Column(db.Float, nullable=True)
    unit_price = db.Column(db.Float, nullable=True)
    description = db.Column(db.Text)

    # Relationships
    invoice = db.relationship('Invoice', back_populates='items')
    warehouse = db.relationship('Warehouse', back_populates='invoice_items')

# Warehouse Model
class Warehouse(db.Model):
    __tablename__ = 'warehouse'
    id = db.Column(db.Integer, primary_key=True)
    item_name = db.Column(db.String(120), nullable=False, index=True, unique=True)
    item_bar = db.Column(db.String(100), nullable=False, unique=True)
    created_at = db.Column(db.DateTime, default=datetime.now)
    updated_at = db.Column(db.DateTime, default=datetime.now, onupdate=datetime.now)

    # Relationships
    invoice_items = db.relationship('InvoiceItem', back_populates='warehouse')
    item_locations = db.relationship('ItemLocations', back_populates='warehouse', cascade='all, delete-orphan')
    prices = db.relationship('Prices', back_populates='warehouse', cascade='all, delete-orphan')
    price_details = db.relationship('InvoicePriceDetail', backref='warehouse')
    
    purchase_requests = db.relationship('PurchaseRequests', back_populates='warehouse') 
    

# ItemLocations Model
class ItemLocations(db.Model):
    __tablename__ = 'item_locations'
    item_id = db.Column(db.Integer, db.ForeignKey('warehouse.id'), primary_key=True)
    location = db.Column(db.String(255), nullable=False, primary_key=True, index=True)
    # price_unit = db.Column(db.Float, nullable=False, default=0)
    quantity = db.Column(db.Integer, nullable=False, default=0)

    # Relationships
    warehouse = db.relationship('Warehouse', back_populates='item_locations')

# Prices Model
class Prices(db.Model):
    __tablename__ = 'prices'
    invoice_id = db.Column(db.Integer, db.ForeignKey('invoice.id'), primary_key=True)
    item_id = db.Column(db.Integer, db.ForeignKey('warehouse.id'), primary_key=True)
    quantity = db.Column(db.Integer, nullable=False)
    unit_price = db.Column(db.Float, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.now, index=True)

    # Relationships
    invoice = db.relationship('Invoice', back_populates='prices')
    warehouse = db.relationship('Warehouse', back_populates='prices')
    price_details = db.relationship('InvoicePriceDetail', 
                                   primaryjoin="and_(Prices.invoice_id==InvoicePriceDetail.source_price_id, "
                                               "Prices.item_id==InvoicePriceDetail.item_id)",
                                   backref="source_price", viewonly=True)

# New model to store price breakdown details
class InvoicePriceDetail(db.Model):
    __tablename__ = 'invoice_price_detail'
    id = db.Column(db.Integer, primary_key=True)
    invoice_id = db.Column(db.Integer, db.ForeignKey('invoice.id'), nullable=False)
    item_id = db.Column(db.Integer, db.ForeignKey('warehouse.id'), nullable=False)
    source_price_id = db.Column(db.Integer, db.ForeignKey('prices.invoice_id'), nullable=False)
    quantity = db.Column(db.Integer, nullable=False)
    unit_price = db.Column(db.Float, nullable=False)
    subtotal = db.Column(db.Float, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.now)
    
    # Relationships
    invoice = db.relationship('Invoice', back_populates='price_details')
    
    # Composite foreign key constraints
    __table_args__ = (
        db.ForeignKeyConstraint(
            ['source_price_id', 'item_id'],
            ['prices.invoice_id', 'prices.item_id']
        ),
    )
    
class PurchaseRequests(db.Model):
    __tablename__ = 'purchase_requests'
    id = db.Column(db.Integer, primary_key=True)
    status = db.Column(db.String(50), nullable=False)
    requested_quantity = db.Column(db.Integer, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.now)
    updated_at = db.Column(db.DateTime, default=datetime.now, onupdate=datetime.now)
    subtotal = db.Column(db.Float, nullable=False)
    
    invoice_id = db.Column(db.Integer, db.ForeignKey('invoice.id'), nullable=False)
    item_id = db.Column(db.Integer, db.ForeignKey('warehouse.id'), nullable=False)
    employee_id = db.Column(db.Integer, db.ForeignKey('employee.id'), nullable=False)
    machine_id = db.Column(db.Integer, db.ForeignKey('machine.id'), nullable=False)
    mechanism_id = db.Column(db.Integer, db.ForeignKey('mechanism.id'), nullable=False)
    
    
    #Relationships
    employee = db.relationship('Employee', back_populates='purchase_requests')
    machine = db.relationship('Machine', back_populates='purchase_requests')
    mechanism = db.relationship('Mechanism', back_populates='purchase_requests')
    warehouse = db.relationship('Warehouse', back_populates='purchase_requests')
    invoice = db.relationship('Invoice', back_populates='purchase_requests')
    
    
# new Table to keep track of returned invoices
class ReturnSales(db.Model):
    __tablename__ = 'return_sales'
    id = db.Column(db.Integer, primary_key=True)
    sales_invoice_id = db.Column(db.Integer, db.ForeignKey('invoice.id'), nullable=False)
    return_invoice_id = db.Column(db.Integer, db.ForeignKey('invoice.id'), nullable=False)
    
    #Relationships
    sales_invoice = db.relationship('Invoice', foreign_keys=[sales_invoice_id], backref='sales_returns')
    return_invoice = db.relationship('Invoice', foreign_keys=[return_invoice_id], backref='return_invoices')