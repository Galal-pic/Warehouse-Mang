from .models import (
    Employee, Machine, Mechanism, Warehouse, ItemLocations, Invoice, InvoiceItem
)
from . import db

def validate_inventory_data(data):
    required_fields = ['name', 'quantity', 'price']
    return all(field in data for field in required_fields)

def validate_invoice_data(data):
    required_fields = ['type', 'Employee_Name', 'items']
    if not all(field in data for field in required_fields):
        return False
    for item in data['items']:
        if 'name' not in item:
            return False
    return True

def Sales_Operations(data, machine, mechanism,employee, machine_ns,warehouse_ns,invoice_ns,mechanism_ns,item_location_ns):
    # Sales operations logic here
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
    item_ids = []
    
    for item_data in data["items"]:
        # Look up the warehouse item by ID
        warehouse_item = Warehouse.query.filter_by(item_name = item_data["item_name"]).first()
        item_details = ItemLocations.query.filter_by(item_id = warehouse_item.id,location =item_data['location']).first()

        # Create the invoice item
        # If item not found in warehouse or location, abort with 404
        if not warehouse_item or not item_details :
            invoice_ns.abort(404, f"Item with ID '{item_data['item_name']}' not found in warehouse")  

        if warehouse_item.id in item_ids:
            invoice_ns.abort(400, f"Item '{item_data['item_name']}' already added to invoice")
            
        item_ids.append(warehouse_item.id)
        # If quantity is not enough, abort with 400
        if item_details.quantity < item_data["quantity"]:
            invoice_ns.abort(400, f"Not enough quantity for item '{item_data['item_name']}' in location '{item_data['location']}'")
        
        # Update the quantity in the warehouse
        item_details.quantity -= item_data["quantity"]
        
            # Create the invoice item
        new_item = InvoiceItem(
                invoice=new_invoice,  # Link to the invoice
                warehouse=warehouse_item,  # Link to the warehouse item
                quantity=item_data["quantity"],
                location=item_data["location"],
                total_price=item_data['total_price'],  # Calculate total price
                description=item_data.get("description"),
            )
        db.session.add(new_item)
    
    db.session.add(new_invoice)
    db.session.commit()
    return new_invoice, 201

def Purchase_Operations(data, machine, mechanism,employee, machine_ns,warehouse_ns,invoice_ns,mechanism_ns,item_location_ns):
    # Sales operations logic here
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
    item_ids = []
    
    for item_data in data["items"]:
        # Look up the warehouse item by ID
        warehouse_item = Warehouse.query.filter_by(item_name = item_data["item_name"]).first()
        item_details = ItemLocations.query.filter_by(item_id = warehouse_item.id,location =item_data['location']).first()

        # Create the invoice item
        # If item not found in warehouse or location, abort with 404
        if not warehouse_item or not item_details :
            invoice_ns.abort(404, f"Item with ID '{item_data['item_name']}' not found in warehouse")  

        if warehouse_item.id in item_ids:
            invoice_ns.abort(400, f"Item '{item_data['item_name']}' already added to invoice")
            
        # item_ids.append(warehouse_item.id)
        # # If quantity is not enough, abort with 400
        # if item_details.quantity < item_data["quantity"]:
        #     invoice_ns.abort(400, f"Not enough quantity for item '{item_data['item_name']}' in location '{item_data['location']}'")
        
        # Update the quantity in the warehouse
        item_details.quantity += item_data["quantity"]
        
            # Create the invoice item
        new_item = InvoiceItem(
                invoice=new_invoice,  # Link to the invoice
                warehouse=warehouse_item,  # Link to the warehouse item
                quantity=item_data["quantity"],
                location=item_data["location"],
                total_price=item_data['total_price'],  # Calculate total price
                description=item_data.get("description"),
            )
        db.session.add(new_item)
    
    db.session.add(new_invoice)
    db.session.commit()
    return new_invoice, 201


