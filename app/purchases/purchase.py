
from ..models import Invoice,Warehouse,ItemLocations,InvoiceItem
from .. import db

def Purchase_Operations(data, machine, mechanism,supplier,employee, machine_ns,warehouse_ns,invoice_ns,mechanism_ns,item_location_n,supplier_ns):
    # Sales operations logic here
    new_invoice = Invoice(
            type=data["type"],
            client_name=data.get("client_name"),
            warehouse_manager=data.get("warehouse_manager"),
            total_amount=data.get("total_amount", 0),  
            paid=data.get("paid", 0),  
            residual=data.get("residual", 0),  
            comment=data.get("comment"),
            status=data.get("status"),
            supplier_id = supplier.id,
            employee_name = data.get('employee_name'),
            employee_id=employee.id,  
            machine_id=machine.id, 
            mechanism_id=mechanism.id,
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
