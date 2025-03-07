from datetime import datetime
from ..models import Invoice, Warehouse, ItemLocations, InvoiceItem, Prices, InvoicePriceDetail
from .. import db
from sqlalchemy.exc import SQLAlchemyError

def Booking_Operations(data, machine, mechanism, supplier, employee, machine_ns, warehouse_ns, invoice_ns, mechanism_ns, item_location_n, supplier_ns):
    """
    Create a booking invoice (حجز type).
    Unlike Sales Operations, booking doesn't use FIFO pricing from the Prices table.
    It uses the price provided in the request.
    """
    try:
        # Create new invoice
        new_invoice = Invoice(
            type=data["type"],
            client_name=data.get("client_name"),
            warehouse_manager=data.get("warehouse_manager"),
            accreditation_manager=data.get("accreditation_manager"),
            total_amount=data.get("total_amount", 0),
            paid=data.get("paid", 0),
            residual=data.get("residual", 0),
            comment=data.get("comment"),
            status=data.get("status", "draft"),  # Default to draft if not provided
            employee_name=data.get('employee_name'),
            employee_id=employee.id,
            machine_id=machine.id if machine else None,
            mechanism_id=mechanism.id if mechanism else None,
            supplier_id=supplier.id if supplier else None,
        )
        
        db.session.add(new_invoice)
        item_ids = []
        total_invoice_amount = 0
        
        for item_data in data["items"]:
            # Look up the warehouse item by name
            warehouse_item = Warehouse.query.filter_by(item_name=item_data["item_name"]).first()
            if not warehouse_item:
                invoice_ns.abort(404, f"Item '{item_data['item_name']}' not found in warehouse")
            
            # Verify the location exists and has enough quantity
            item_location = ItemLocations.query.filter_by(
                item_id=warehouse_item.id,
                location=item_data['location']
            ).first()
            
            if not item_location:
                invoice_ns.abort(404, f"Item '{item_data['item_name']}' not found in location '{item_data['location']}'")
            
            # Check for duplicate items
            if (warehouse_item.id, item_data['location']) in item_ids:
                invoice_ns.abort(400, f"Item '{item_data['item_name']}' already added to invoice")
            
            item_ids.append((warehouse_item.id, item_data['location']))
            
            # Check if enough quantity available
            requested_quantity = item_data["quantity"]
            if item_location.quantity < requested_quantity:
                invoice_ns.abort(400, f"Not enough quantity for item '{item_data['item_name']}' in location '{item_data['location']}'. Available: {item_location.quantity}, Requested: {requested_quantity}")
            
            # Update physical inventory in ItemLocations
            item_location.quantity -= requested_quantity
            
            # For bookings, we use the price provided in the request rather than FIFO pricing
            unit_price = item_data.get("unit_price", 0)
            total_price = item_data.get("total_price", unit_price * requested_quantity)
            
            # Create the invoice item
            invoice_item = InvoiceItem(
                invoice_id=new_invoice.id,
                item_id=warehouse_item.id,
                quantity=requested_quantity,
                location=item_data["location"],
                unit_price=unit_price,
                total_price=total_price,
                description=item_data.get("description", "")
            )
            
            db.session.add(invoice_item)
            total_invoice_amount += total_price
            
            # Also create a price record for this booking if a price is provided
            # This allows future sales to reference this booking's price
            if unit_price > 0:
                existing_price = Prices.query.filter_by(
                    invoice_id=new_invoice.id,
                    item_id=warehouse_item.id
                ).first()
                
                if existing_price:
                    # Update existing price entry
                    existing_price.quantity += requested_quantity
                    # Only update unit price if higher to avoid devaluing inventory
                    if unit_price > existing_price.unit_price:
                        existing_price.unit_price = unit_price
                else:
                    # Create new price entry
                    new_price = Prices(
                        invoice_id=new_invoice.id,
                        item_id=warehouse_item.id,
                        quantity=requested_quantity,
                        unit_price=unit_price,
                        created_at=datetime.now()
                    )
                    db.session.add(new_price)
        
        # Update invoice totals
        new_invoice.total_amount = total_invoice_amount
        new_invoice.residual = total_invoice_amount - new_invoice.paid
        
        db.session.commit()
        return new_invoice, 201
        
    except SQLAlchemyError as e:
        db.session.rollback()
        invoice_ns.abort(500, f"Database error: {str(e)}")
    except Exception as e:
        db.session.rollback()
        invoice_ns.abort(500, f"Error processing booking: {str(e)}")

def delete_booking(invoice, invoice_ns):
    # Check if it's a booking invoice
    if invoice.type != 'حجز':
        invoice_ns.abort(400, "Can only delete booking invoices with this method")

    try:
        # Restore quantities for each item
        for invoice_item in invoice.items:
            # Find the item location
            item_location = ItemLocations.query.filter_by(
                item_id=invoice_item.item_id,
                location=invoice_item.location
            ).first()
            
            if not item_location:
                item_location = ItemLocations(
                    item_id=invoice_item.item_id,
                    location=invoice_item.location,
                    quantity=0
                )
                db.session.add(item_location)
            
            # Restore the quantity
            item_location.quantity += invoice_item.quantity
        
        # Also check if we need to update or remove any price entries
        price_entries = Prices.query.filter_by(invoice_id=invoice.id).all()
        for price_entry in price_entries:
            # Delete the price entry since the booking is being deleted
            db.session.delete(price_entry)

        # Delete associated invoice items and the invoice
        InvoiceItem.query.filter_by(invoice_id=invoice.id).delete()
        db.session.delete(invoice)
        
        db.session.commit()
        return {"message": "Booking invoice deleted and stock restored successfully"}, 200

    except Exception as e:
        db.session.rollback()
        invoice_ns.abort(500, f"Error deleting booking invoice: {str(e)}")

def put_booking(data, invoice, machine, mechanism, invoice_ns):
    try:
        with db.session.begin_nested():
            # Create a dictionary of original items for easy lookup
            original_items = {(item.item_id, item.location): item for item in invoice.items}
            updated_items = {}
            
            # Track the total amount for the updated invoice
            total_invoice_amount = 0

            # Process updates and new items
            for item_data in data["items"]:
                warehouse_item = Warehouse.query.filter_by(item_name=item_data["item_name"]).first()
                if not warehouse_item:
                    invoice_ns.abort(404, f"Item '{item_data['item_name']}' not found in warehouse")
                
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

                # Get the unit price and total price
                unit_price = item_data.get("unit_price", 0)
                total_price = item_data.get("total_price", unit_price * new_quantity)
                
                # Update or create invoice item
                if key in original_items:
                    item = original_items[key]
                    item.quantity = new_quantity
                    item.unit_price = unit_price
                    item.total_price = total_price
                    if "description" in item_data:
                        item.description = item_data["description"]
                else:
                    item = InvoiceItem(
                        invoice_id=invoice.id,
                        item_id=warehouse_item.id,
                        quantity=new_quantity,
                        location=location,
                        unit_price=unit_price,
                        total_price=total_price,
                        description=item_data.get("description", "")
                    )
                    db.session.add(item)

                updated_items[key] = item
                total_invoice_amount += total_price
                
                # Update price records if needed
                price_entry = Prices.query.filter_by(
                    invoice_id=invoice.id,
                    item_id=warehouse_item.id
                ).first()
                
                if price_entry:
                    # If the price entry exists, update it
                    price_entry.quantity = new_quantity
                    if unit_price > 0:  # Only update if a price is provided
                        price_entry.unit_price = unit_price
                elif unit_price > 0:
                    # If no price entry exists but a price is provided, create one
                    new_price = Prices(
                        invoice_id=invoice.id,
                        item_id=warehouse_item.id,
                        quantity=new_quantity,
                        unit_price=unit_price,
                        created_at=datetime.now()
                    )
                    db.session.add(new_price)

            # Restore removed items
            for key, item in original_items.items():
                if key not in updated_items:
                    item_location = ItemLocations.query.filter_by(
                        item_id=item.item_id,
                        location=item.location
                    ).first()
                    
                    if item_location:
                        item_location.quantity += item.quantity
                    
                    # Also delete any associated price entries
                    Prices.query.filter_by(
                        invoice_id=invoice.id,
                        item_id=item.item_id
                    ).delete()
                    
                    db.session.delete(item)

            # Update invoice fields
            invoice.type = data["type"]
            invoice.client_name = data.get("client_name", invoice.client_name)
            invoice.warehouse_manager = data.get("warehouse_manager", invoice.warehouse_manager)
            invoice.accreditation_manager = data.get("accreditation_manager", invoice.accreditation_manager)
            invoice.total_amount = total_invoice_amount
            invoice.paid = data.get("paid", invoice.paid)
            invoice.residual = total_invoice_amount - invoice.paid
            invoice.comment = data.get("comment", invoice.comment)
            invoice.status = data.get("status", invoice.status)
            
            # Update machine, mechanism and supplier if provided
            if machine:
                invoice.machine_id = machine.id
            if mechanism:
                invoice.mechanism_id = mechanism.id
            if "supplier_id" in data and data["supplier_id"] is not None:
                invoice.supplier_id = data["supplier_id"]
            
            db.session.commit()
        
        return {"message": "Booking invoice updated successfully"}, 200

    except SQLAlchemyError as e:
        db.session.rollback()
        invoice_ns.abort(500, f"Database error: {str(e)}")
    except Exception as e:
        db.session.rollback()
        invoice_ns.abort(500, f"Error updating booking invoice: {str(e)}")