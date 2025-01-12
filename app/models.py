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
    invoices = db.relationship('Invoice', back_populates='employee', lazy=True, cascade='all, delete-orphan')

# Machine Model
class Machine(db.Model):
    __tablename__ = 'machine'
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(255), unique=True, nullable=False, index=True)  # Machine name
    description = db.Column(db.Text)  # Optional description

    # Relationship with Invoice
    invoices = db.relationship('Invoice', back_populates='machine', lazy=True, cascade='all, delete-orphan')

# Mechanism Model
class Mechanism(db.Model):
    __tablename__ = 'mechanism'
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(255), unique=True, nullable=False, index=True)  # Mechanism name
    description = db.Column(db.Text)  # Optional description

    # Relationship with Invoice
    invoices = db.relationship('Invoice', back_populates='mechanism', lazy=True, cascade='all, delete-orphan')

# Invoice Model
class Invoice(db.Model):
    __tablename__ = 'invoice'
    id = db.Column(db.Integer, primary_key=True)
    type = db.Column(db.String(50), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, index=True)
    client_name = db.Column(db.String(50))
    Warehouse_manager = db.Column(db.String(255))
    total_amount = db.Column(db.Float)
    employee_name = db.Column(db.String(50), nullable=False)
    employee_id = db.Column(db.Integer, db.ForeignKey('employee.id'), nullable=False)
    machine_id = db.Column(db.Integer, db.ForeignKey('machine.id'), nullable=True)  # ForeignKey to Machine
    mechanism_id = db.Column(db.Integer, db.ForeignKey('mechanism.id'), nullable=True)  # ForeignKey to Mechanism

    # Relationships
    employee = db.relationship('Employee', back_populates='invoices')  # Many-to-One with Employee
    machine = db.relationship('Machine', back_populates='invoices')  # Many-to-One with Machine
    mechanism = db.relationship('Mechanism', back_populates='invoices')  # Many-to-One with Mechanism
    items = db.relationship('InvoiceItem', back_populates='invoice', cascade='all, delete-orphan')  # One-to-Many with InvoiceItem

class InvoiceItem(db.Model):
    __tablename__ = 'invoice_item'
    invoice_id = db.Column(db.Integer, db.ForeignKey('invoice.id'), primary_key=True)  # Composite primary key
    item_id = db.Column(db.Integer, db.ForeignKey('warehouse.id'), primary_key=True)  # Composite primary key
    quantity = db.Column(db.Integer, nullable=False)  # Quantity of the item in the invoice
    location = db.Column(db.String(255), nullable=False)  # Location of the item in the invoice
    total_price = db.Column(db.Float, nullable=False)  # Total price (quantity * price_unit)
    description = db.Column(db.Text)  # Optional description

    # Relationships
    invoice = db.relationship('Invoice', back_populates='items')  # Many-to-One with Invoice
    warehouse = db.relationship('Warehouse', back_populates='invoice_items')  # Many-to-One with Warehouse

# Warehouse Model
class Warehouse(db.Model):
    __tablename__ = 'warehouse'
    id = db.Column(db.Integer, primary_key=True)  # Item ID
    item_name = db.Column(db.String(120), nullable=False, index=True, unique=True)
    item_bar = db.Column(db.String(100), nullable=False, unique=True)  # Barcode
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    invoice_items = db.relationship('InvoiceItem', back_populates='warehouse', cascade='all, delete-orphan')  # One-to-Many with InvoiceItem
    item_locations = db.relationship('ItemLocations', back_populates='warehouse', cascade='all, delete-orphan')  # One-to-Many with ItemLocations

# ItemLocations Model
class ItemLocations(db.Model):
    __tablename__ = 'item_locations'
    item_id = db.Column(db.Integer, db.ForeignKey('warehouse.id'), primary_key=True)  # Composite primary key
    location = db.Column(db.String(255), nullable=False, primary_key=True, index=True)  # Location of the item in the warehouse
    price_unit = db.Column(db.Float, nullable=False, default=0)  # Price per unit
    quantity = db.Column(db.Integer, nullable=False, default=0)  # Available quantity in the warehouse

    # Relationships
    warehouse = db.relationship('Warehouse', back_populates='item_locations')  # Many-to-One with Warehouse

# InvoiceItem Model (Association Table with Composite Primary Key)