
from ..models import Invoice,Warehouse,ItemLocations,InvoiceItem
from .. import db
from sqlalchemy.exc import SQLAlchemyError

def Warranty_Operations(data, machine, mechanism,supplier,employee, machine_ns,warehouse_ns,invoice_ns,mechanism_ns,item_location_n,supplier_ns):
    # Sales operations logic here
    new_invoice = Invoice(
            type=data["type"],
            client_name=data.get("client_name"),
            warehouse_manager=data.get("warehouse_manager"),
            accreditation_manager = data.get("accreditation_manager"),
            total_amount=data.get("total_amount", 0),  
            paid=data.get("paid", 0),  
            residual=data.get("residual", 0),  
            comment=data.get("comment"),
            status=data.get("status"),
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

        if (warehouse_item.id,item_data['location']) in item_ids:
            invoice_ns.abort(400, f"Item '{item_data['item_name']}' already added to invoice")
            
        item_ids.append((warehouse_item.id,item_data['location']))
        # If quantity is not enough, abort with 400
        if item_details.quantity < item_data["quantity"]:
            invoice_ns.abort(400, f"Not enough quantity for item '{item_data['item_name']}' in location '{item_data['location']}'")
        
        # Update the quantity in the warehouse
        item_details.quantity -= item_data["quantity"]
        
            # Create the invoice item
        new_item = InvoiceItem(
                invoice=new_invoice, 
                warehouse=warehouse_item, 
                quantity=item_data["quantity"],
                location=item_data["location"],
                unit_price=item_data["unit_price"],
                total_price=item_data['total_price'],  
                description=item_data.get("description"),
            )
        db.session.add(new_item)
    
    db.session.add(new_invoice)
    db.session.commit()
    return new_invoice, 201

def delete_warranty(invoice,invoice_ns):
    
    # 2. Check if it's a sales invoice
    if invoice.type != 'أمانات':
        invoice_ns.abort(400, "Can only delete warranty invoices with this method")

    try:
        # 3. Restore quantities for each item
        for invoice_item in invoice.items:
            # Find the item location
            item_location = ItemLocations.query.filter_by(
                item_id=invoice_item.item_id,
                location=invoice_item.location
            ).first()
            if not item_location:
                raise ValueError(
                    f"Item {invoice_item.warehouse.item_name} not found in location {invoice_item.location}"
                )

            # Restore the quantity
            item_location.quantity += invoice_item.quantity

        # 4. Delete associated invoice items and the invoice
        InvoiceItem.query.filter_by(invoice_id=invoice.id).delete()
        db.session.delete(invoice)
        
        db.session.commit()
        return {"message": "Invoice deleted and stock restored successfully"}, 200

    except Exception as e:
        db.session.rollback()
        invoice_ns.abort(500, f"Error deleting invoice: {str(e)}")

def put_warranty(data, invoice, machine, mechanism, invoice_ns):
    try:
        with db.session.begin_nested():
            original_items = {(item.item_id, item.location): item for item in invoice.items}
            updated_items = {}

            # Process updates and new items
            for item_data in data["items"]:
                warehouse_item = Warehouse.query.filter_by(item_name=item_data["item_name"]).first()
                location = item_data["location"]
                key = (warehouse_item.id, location)
                
                item_location = ItemLocations.query.filter_by(
                    item_id=warehouse_item.id,
                    location=location
                ).first()

                if not item_location:
                    invoice_ns.abort(404, f"Item location not found")

                # Calculate quantity difference
                if key in original_items:
                    old_quantity = original_items[key].quantity
                    new_quantity = item_data["quantity"]
                    quantity_diff = new_quantity - old_quantity
                else:
                    old_quantity = 0
                    new_quantity = item_data["quantity"]
                    quantity_diff = new_quantity

                # Check stock availability for increases
                if quantity_diff > 0 and item_location.quantity < quantity_diff:
                    invoice_ns.abort(400, f"Insufficient stock for {item_data['item_name']}")

                # Update inventory
                item_location.quantity -= quantity_diff

                # Update or create invoice item
                if key in original_items:
                    item = original_items[key]
                    item.quantity = new_quantity
                else:
                    item = InvoiceItem(
                        invoice_id=invoice.id,
                        item_id=warehouse_item.id,
                        quantity=new_quantity,
                        location=location,
                        unit_price = item_location.price_unit,
                        total_price=new_quantity * item_location.price_unit,
                        description=item_data.get("description")
                    )
                    db.session.add(item)

                updated_items[key] = item

            # Restore removed items
            for key, item in original_items.items():
                if key not in updated_items:
                    item_location = ItemLocations.query.filter_by(
                        item_id=item.item_id,
                        location=item.location
                    ).first()
                    
                    if item_location:
                        item_location.quantity += item.quantity
                    
                    db.session.delete(item)

            # Update invoice fields
            invoice.type = data["type"]
            # ... (update other fields)
            
            db.session.commit()
        
        return {"message": "Invoice edit successfully"}, 200

    except SQLAlchemyError as e:
        db.session.rollback()
        invoice_ns.abort(500, f"Database error: {str(e)}")