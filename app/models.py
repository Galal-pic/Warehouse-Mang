from datetime import datetime
from . import db

# Employee Model
class Employee(db.Model):
    __tablename__ = 'employee'
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False, index=True)
    password_hash = db.Column(db.String(120), nullable=False)
    phone_number = db.Column(db.String(20))
    job_name = db.Column(db.String(100), nullable=False)

    # Relationship with Invoice
    invoices = db.relationship('Invoice', back_populates='employee', lazy=True)

class Supplier(db.Model):
    __tablename__ = 'supplier'
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(255), unique=True, nullable=False, index=True)
    description = db.Column(db.Text)

    # Relationship with Invoice
    invoices = db.relationship('Invoice', back_populates='supplier', lazy=True)

# Machine Model
class Machine(db.Model):
    __tablename__ = 'machine'
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(255), unique=True, nullable=False, index=True)
    description = db.Column(db.Text)

    # Relationship with Invoice
    invoices = db.relationship('Invoice', back_populates='machine', lazy=True)

# Mechanism Model
class Mechanism(db.Model):
    __tablename__ = 'mechanism'
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(255), unique=True, nullable=False, index=True)
    description = db.Column(db.Text)

    # Relationship with Invoice
    invoices = db.relationship('Invoice', back_populates='mechanism', lazy=True)

# Invoice Model
class Invoice(db.Model):
    __tablename__ = 'invoice'
    id = db.Column(db.Integer, primary_key=True)
    type = db.Column(db.String(50), nullable=False,index=True)
    created_at = db.Column(db.DateTime, default=datetime.now, index=True)
    client_name = db.Column(db.String(50))
    warehouse_manager = db.Column(db.String(255))
    total_amount = db.Column(db.Float)
    paid = db.Column(db.Float)
    residual = db.Column(db.Float)
    comment = db.Column(db.String(255))
    status = db.Column(db.String(50),default="Done")
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

    items = db.relationship('InvoiceItem', back_populates='invoice', cascade='all, delete-orphan')

class InvoiceItem(db.Model):
    __tablename__ = 'invoice_item'
    invoice_id = db.Column(db.Integer, db.ForeignKey('invoice.id'), primary_key=True)
    item_id = db.Column(db.Integer, db.ForeignKey('warehouse.id'), primary_key=True)
    location = db.Column(db.String(255),primary_key=True)
    quantity = db.Column(db.Integer, nullable=False)
    total_price = db.Column(db.Float, nullable=False)
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

# ItemLocations Model
class ItemLocations(db.Model):
    __tablename__ = 'item_locations'
    item_id = db.Column(db.Integer, db.ForeignKey('warehouse.id'), primary_key=True)
    location = db.Column(db.String(255), nullable=False, primary_key=True, index=True)
    price_unit = db.Column(db.Float, nullable=False, default=0)
    quantity = db.Column(db.Integer, nullable=False, default=0)

    # Relationships
    warehouse = db.relationship('Warehouse', back_populates='item_locations')