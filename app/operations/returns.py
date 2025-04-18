from datetime import datetime
from ..models import Invoice, Warehouse, ItemLocations, InvoiceItem, Prices, InvoicePriceDetail
from .. import db
from sqlalchemy.exc import SQLAlchemyError

def Return_Operations(data, machine, mechanism, supplier, employee, machine_ns, warehouse_ns, invoice_ns, mechanism_ns, item_location_n, supplier_ns):
    """
    Create a return invoice (مرتجع type).
    Return operations add inventory back to the system and potentially create new price records.
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
        db.session.flush()  # Get the new_invoice.id
        
        item_ids = []
        total_invoice_amount = 0
        
        for item_data in data["items"]:
            # Look up the warehouse item by name
            warehouse_item = Warehouse.query.filter_by(item_name=item_data["item_name"]).first()
            if not warehouse_item:
                invoice_ns.abort(404, f"Item '{item_data['item_name']}' not found in warehouse")
            
            # Verify or create the location
            item_location = ItemLocations.query.filter_by(
                item_id=warehouse_item.id,
                location=item_data['location']
            ).first()
            
            if not item_location:
                # For returns, create the location if it doesn't exist
                item_location = ItemLocations(
                    item_id=warehouse_item.id,
                    location=item_data['location'],
                    quantity=0
                )
                db.session.add(item_location)
            
            # Check for duplicate items
            if (warehouse_item.id, item_data['location']) in item_ids:
                invoice_ns.abort(400, f"Item '{item_data['item_name']}' already added to invoice")
            
            item_ids.append((warehouse_item.id, item_data['location']))
            
            # Get quantity and price data
            quantity = item_data["quantity"]
            unit_price = item_data.get("unit_price", 0)
            total_price = item_data.get('total_price', quantity * unit_price)
            
            # Update the quantity in the warehouse (increase for return)
            item_location.quantity += quantity
            
            # Create the invoice item
            invoice_item = InvoiceItem(
                invoice_id=new_invoice.id,
                item_id=warehouse_item.id,
                quantity=quantity,
                location=item_data["location"],
                unit_price=unit_price,
                total_price=total_price,
                description=item_data.get("description", "")
            )
            db.session.add(invoice_item)
            
            # For returns, create or update a price record if a unit price is provided
            # This allows the returned items to re-enter the FIFO system
            price_updated = False
            
            if 'original_invoice_id' in data and data['original_invoice_id']:
                # Try to find and update prices from the original invoice
                original_invoice_details = InvoicePriceDetail.query.filter_by(
                    invoice_id=data['original_invoice_id']
                ).all()
                
                for detail in original_invoice_details:
                    if detail.item_id == warehouse_item.id:
                        price = Prices.query.filter_by(
                            invoice_id=detail.source_price_id,
                            item_id=detail.item_id
                        ).first()
                        
                        if price:
                            # Update the existing price record
                            price.quantity += quantity
                            db.session.add(price)
                            price_updated = True
                            break
            
            # If no price was updated from original invoice, create a new price record
            if not price_updated and unit_price > 0:
                new_price = Prices(
                    invoice_id=new_invoice.id,
                    item_id=warehouse_item.id,
                    quantity=quantity,
                    unit_price=unit_price,
                    created_at=datetime.now()
                )
                db.session.add(new_price)
                    
            total_invoice_amount += total_price
        
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
        invoice_ns.abort(500, f"Error processing return: {str(e)}")

def delete_return(invoice, invoice_ns):
    # Check if it's a return invoice
    if invoice.type != 'مرتجع':
        invoice_ns.abort(400, "Can only delete return invoices with this method")

    try:
        # Check if any of the returned items have been sold again
        price_records = Prices.query.filter_by(invoice_id=invoice.id).all()
        for price_record in price_records:
            # Check if some have been consumed (original quantity > current quantity)
            # This is the correct comparison - not comparing price_record.quantity to itself
            original_quantity = sum([item.quantity for item in invoice.items 
                                   if item.item_id == price_record.item_id])
            if price_record.quantity < original_quantity:
                invoice_ns.abort(400, 
                    f"Cannot delete return invoice: Some returned items have already been sold again."
                )
        
        # Restore quantities for each item (decrease for return deletion)
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

            # Restore the quantity (subtract for return deletion)
            item_location.quantity -= invoice_item.quantity
            
            # Check for negative quantity
            if item_location.quantity < 0:
                invoice_ns.abort(400, 
                    f"Cannot delete return invoice: Not enough quantity for item " +
                    f"'{invoice_item.warehouse.item_name}' in location '{invoice_item.location}'. " +
                    f"Some items may have already been moved or sold."
                )
        
        # Delete price records
        Prices.query.filter_by(invoice_id=invoice.id).delete()
        
        # Delete invoice items and the invoice
        InvoiceItem.query.filter_by(invoice_id=invoice.id).delete()
        db.session.delete(invoice)
        
        db.session.commit()
        return {"message": "Return invoice deleted and stock adjusted successfully"}, 200

    except SQLAlchemyError as e:
        db.session.rollback()
        invoice_ns.abort(500, f"Database error: {str(e)}")
    except Exception as e:
        db.session.rollback()
        invoice_ns.abort(500, f"Error deleting return invoice: {str(e)}")

def put_return(data, invoice, machine, mechanism, invoice_ns):
    try:
        with db.session.begin_nested():
            # Get original items for comparison
            original_items = {(item.item_id, item.location): item for item in invoice.items}
            updated_items = {}
            total_invoice_amount = 0

            # Process updates and new items
            for item_data in data["items"]:
                warehouse_item = Warehouse.query.filter_by(item_name=item_data["item_name"]).first()
                if not warehouse_item:
                    invoice_ns.abort(404, f"Item '{item_data['item_name']}' not found in warehouse")
                
                location = item_data["location"]
                key = (warehouse_item.id, location)
                
                # Get or create the item location
                item_location = ItemLocations.query.filter_by(
                    item_id=warehouse_item.id,
                    location=location
                ).first()

                if not item_location:
                    # For returns, create the location if it doesn't exist
                    item_location = ItemLocations(
                        item_id=warehouse_item.id,
                        location=location,
                        quantity=0
                    )
                    db.session.add(item_location)

                # Calculate quantity difference
                new_quantity = item_data["quantity"]
                new_unit_price = item_data.get("unit_price", 0)
                new_total_price = item_data.get("total_price", new_quantity * new_unit_price)
                
                if key in original_items:
                    old_quantity = original_items[key].quantity
                    quantity_diff = new_quantity - old_quantity
                else:
                    quantity_diff = new_quantity

                # Update inventory (for returns, we add the difference)
                item_location.quantity += quantity_diff
                
                # Check for negative quantity after adjustment
                if item_location.quantity < 0:
                    invoice_ns.abort(400, 
                        f"Cannot update return invoice: Not enough quantity for item " +
                        f"'{item_data['item_name']}' in location '{location}'. " +
                        f"Some items may have already been moved or sold."
                    )

                # Update or create invoice item
                if key in original_items:
                    item = original_items[key]
                    item.quantity = new_quantity
                    item.unit_price = new_unit_price
                    item.total_price = new_total_price
                    if "description" in item_data:
                        item.description = item_data["description"]
                else:
                    item = InvoiceItem(
                        invoice_id=invoice.id,
                        item_id=warehouse_item.id,
                        quantity=new_quantity,
                        location=location,
                        unit_price=new_unit_price,
                        total_price=new_total_price,
                        description=item_data.get("description", "")
                    )
                    db.session.add(item)

                updated_items[key] = item
                total_invoice_amount += new_total_price
                
                # Update price records if they exist
                price_record = Prices.query.filter_by(
                    invoice_id=invoice.id,
                    item_id=warehouse_item.id
                ).first()
                
                if price_record:
                    # Check if items have been consumed
                    original_qty = original_items[key].quantity if key in original_items else 0
                    if price_record.quantity < original_qty:
                        # Some items have been sold again, calculate how many
                        consumed = original_qty - price_record.quantity
                        
                        # Cannot reduce below the consumed amount
                        if new_quantity < consumed:
                            invoice_ns.abort(400, 
                                f"Cannot update return invoice: {consumed} units of " +
                                f"'{item_data['item_name']}' have already been sold again. " +
                                f"Cannot reduce quantity below {consumed}."
                            )
                        
                        # Update price record with remaining available quantity
                        price_record.quantity = new_quantity - consumed
                    else:
                        # No consumption has occurred, can fully update
                        price_record.quantity = new_quantity
                    
                    # Always update the unit price if provided
                    if new_unit_price > 0:
                        price_record.unit_price = new_unit_price
                elif new_unit_price > 0:
                    # Create a new price record if one doesn't exist and price is provided
                    new_price = Prices(
                        invoice_id=invoice.id,
                        item_id=warehouse_item.id,
                        quantity=new_quantity,
                        unit_price=new_unit_price,
                        created_at=datetime.now()
                    )
                    db.session.add(new_price)

            # Handle removed items
            for key, item in original_items.items():
                if key not in updated_items:
                    item_id, location = key
                    item_location = ItemLocations.query.filter_by(
                        item_id=item_id,
                        location=location
                    ).first()
                    
                    # Get the price record for this item
                    price_record = Prices.query.filter_by(
                        invoice_id=invoice.id,
                        item_id=item_id
                    ).first()
                    
                    # Check if this price record has been partially consumed
                    if price_record and price_record.quantity < item.quantity:
                        # Items have been consumed, cannot remove
                        consumed = item.quantity - price_record.quantity
                        invoice_ns.abort(400, 
                            f"Cannot remove item: {consumed} units of " +
                            f"'{item.warehouse.item_name}' have already been sold again."
                        )
                    
                    if item_location:
                        # For returns, we subtract when removing items
                        item_location.quantity -= item.quantity
                        
                        # Check for negative quantity
                        if item_location.quantity < 0:
                            invoice_ns.abort(400, 
                                f"Cannot remove item: Not enough quantity for " +
                                f"'{item.warehouse.item_name}' in location '{location}'. " +
                                f"Some items may have already been moved or sold."
                            )
                    
                    # Delete the price record if it exists
                    if price_record:
                        db.session.delete(price_record)
                    
                    # Delete the invoice item
                    db.session.delete(item)

            # Update invoice fields
            invoice.type = data["type"]
            invoice.client_name = data.get("client_name", invoice.client_name)
            invoice.warehouse_manager = data.get("warehouse_manager", invoice.warehouse_manager)
            invoice.accreditation_manager = data.get("accreditation_manager", invoice.accreditation_manager)
            invoice.total_amount = data.get("total_amount", total_invoice_amount)
            invoice.paid = data.get("paid", invoice.paid)
            invoice.residual = invoice.total_amount - invoice.paid
            invoice.comment = data.get("comment", invoice.comment)
            invoice.status = data.get("status", invoice.status)
            invoice.employee_name = data.get("employee_name", invoice.employee_name)
            
            # Update related entities if provided
            if machine:
                invoice.machine_id = machine.id
            if mechanism:
                invoice.mechanism_id = mechanism.id
            if "supplier_id" in data and data["supplier_id"] is not None:
                invoice.supplier_id = data["supplier_id"]
            
            db.session.commit()
        
        return {"message": "Return invoice updated successfully"}, 200

    except SQLAlchemyError as e:
        db.session.rollback()
        invoice_ns.abort(500, f"Database error: {str(e)}")
    except Exception as e:
        db.session.rollback()
        invoice_ns.abort(500, f"Unexpected error: {str(e)}")