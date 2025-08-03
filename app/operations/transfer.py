from datetime import datetime
from ..models import Invoice, Warehouse, ItemLocations, InvoiceItem, Prices, InvoicePriceDetail
from .. import db
from sqlalchemy.exc import SQLAlchemyError
from ..utils import operation_result


def Transfer_Operations(data, machine, mechanism, supplier, employee, machine_ns, warehouse_ns, invoice_ns, mechanism_ns, item_location_n, supplier_ns):
    """
    Create a transfer invoice (تحويل type).
    Transfer operations move inventory from one location to another without changing quantities or prices.
    They maintain the same total inventory but change the distribution across locations.
    FIXED: Properly handles foreign key constraints with InvoicePriceDetail records and supplier names.
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
            status=data.get("status", "draft"),
            employee_name=data.get('employee_name'),
            employee_id=employee.id,
            machine_id=machine.id if machine else None,
            mechanism_id=mechanism.id if mechanism else None,
            supplier_id=supplier.id if supplier else None,
        )
        
        db.session.add(new_invoice)
        db.session.flush()  # Flush to get the invoice ID
        
        item_ids = []
        total_invoice_amount = 0
        
        for item_data in data["items"]:
            # Look up the warehouse item by name
            warehouse_item = Warehouse.query.filter_by(item_name=item_data["item_name"]).first()
            if not warehouse_item:
                db.session.rollback()
                return operation_result(404, "error", f"Item '{item_data['item_name']}' not found in warehouse")
            
            # Verify the source location exists and has enough quantity
            source_location = ItemLocations.query.filter_by(
                item_id=warehouse_item.id,
                location=item_data['location']
            ).first()
            
            if not source_location:
                db.session.rollback()
                return operation_result(404, "error", f"Item '{item_data['item_name']}' not found in source location '{item_data['location']}'")
            
            # Check for duplicate items (same item, same source location)
            if (warehouse_item.id, item_data['location']) in item_ids:
                db.session.rollback()
                return operation_result(400, "error", f"Item '{item_data['item_name']}' from location '{item_data['location']}' already added to invoice")
            
            item_ids.append((warehouse_item.id, item_data['location']))
            
            # Check if enough quantity available in source location
            requested_quantity = item_data["quantity"]
            if source_location.quantity < requested_quantity:
                db.session.rollback()
                return operation_result(400, "error", f"Not enough quantity for item '{item_data['item_name']}' in location '{item_data['location']}'. Available: {source_location.quantity}, Requested: {requested_quantity}")
            
            # Validate new_location is provided
            new_location = item_data.get("new_location")
            if not new_location:
                db.session.rollback()
                return operation_result(400, "error", f"New location must be specified for item '{item_data['item_name']}'")
            
            # Check if source and destination locations are the same
            if item_data['location'] == new_location:
                db.session.rollback()
                return operation_result(400, "error", f"Source and destination locations cannot be the same for item '{item_data['item_name']}'")
            
            # Update source location inventory (reduce quantity)
            source_location.quantity -= requested_quantity
            
            # Find or create destination location
            destination_location = ItemLocations.query.filter_by(
                item_id=warehouse_item.id,
                location=new_location
            ).first()
            
            if not destination_location:
                # Create new location if it doesn't exist
                destination_location = ItemLocations(
                    item_id=warehouse_item.id,
                    location=new_location,
                    quantity=0
                )
                db.session.add(destination_location)
                db.session.flush()  # Flush to ensure the location is created
            
            # Update destination location inventory (add quantity)
            destination_location.quantity += requested_quantity
            
            # Handle price record splitting and invoice item updates using FIFO
            remaining_to_transfer = requested_quantity
            
            # Get all price records for this item in the source location (FIFO order)
            source_price_records = Prices.query.filter_by(
                item_id=warehouse_item.id,
                location=item_data['location']
            ).order_by(Prices.invoice_id.asc()).all()
            
            if not source_price_records:
                db.session.rollback()
                return operation_result(400, "error", f"No price records found for item '{item_data['item_name']}' in source location '{item_data['location']}'")
            
            # Track which purchase invoices are affected for invoice item updates
            affected_purchase_invoices = {}
            
            # Process each price record using FIFO and split them
            for source_price in source_price_records:
                if remaining_to_transfer <= 0:
                    break
                
                # Calculate how much to transfer from this price record
                quantity_to_transfer = min(remaining_to_transfer, source_price.quantity)
                
                # Get the source invoice item to preserve supplier information
                source_invoice_item = InvoiceItem.query.filter_by(
                    invoice_id=source_price.invoice_id,
                    item_id=warehouse_item.id,
                    location=item_data['location']
                ).first()
                
                # Track the affected purchase invoice
                purchase_invoice_id = source_price.invoice_id
                if purchase_invoice_id not in affected_purchase_invoices:
                    affected_purchase_invoices[purchase_invoice_id] = {
                        'transferred_quantities': {},
                        'unit_price': source_price.unit_price,
                        'supplier_id': source_invoice_item.supplier_id if source_invoice_item else None,
                        'supplier_name': source_invoice_item.supplier_name if source_invoice_item else None,
                        'description': source_invoice_item.description if source_invoice_item else None
                    }
                
                # Track transferred quantity for this purchase invoice by location
                if new_location not in affected_purchase_invoices[purchase_invoice_id]['transferred_quantities']:
                    affected_purchase_invoices[purchase_invoice_id]['transferred_quantities'][new_location] = 0
                affected_purchase_invoices[purchase_invoice_id]['transferred_quantities'][new_location] += quantity_to_transfer
                
                # FIXED: Check if this price record is referenced by InvoicePriceDetail before modifying
                price_detail_references = InvoicePriceDetail.query.filter_by(
                    source_price_invoice_id=source_price.invoice_id,
                    source_price_item_id=source_price.item_id,
                    source_price_location=source_price.location
                ).first()
                
                # Reduce the source price record quantity
                source_price.quantity -= quantity_to_transfer
                
                # Check if destination price record already exists for this purchase invoice
                dest_price = Prices.query.filter_by(
                    invoice_id=source_price.invoice_id,  # Same purchase invoice
                    item_id=warehouse_item.id,
                    location=new_location
                ).first()
                
                if dest_price:
                    # If destination price record exists for this purchase invoice, add to it
                    dest_price.quantity += quantity_to_transfer
                else:
                    # Create new price record in destination location for the SAME purchase invoice
                    dest_price = Prices(
                        invoice_id=source_price.invoice_id,  # Keep the same purchase invoice ID
                        item_id=warehouse_item.id,
                        location=new_location,
                        quantity=quantity_to_transfer,
                        unit_price=source_price.unit_price,  # Same price from original purchase
                        created_at=source_price.created_at   # Keep original creation date for FIFO
                    )
                    db.session.add(dest_price)
                
                remaining_to_transfer -= quantity_to_transfer
                
                # FIXED: Only delete source price record if it's empty AND not referenced by InvoicePriceDetail
                if source_price.quantity <= 0:
                    if not price_detail_references:
                        # Safe to delete - no foreign key references
                        db.session.delete(source_price)
                    else:
                        # Keep the record with zero quantity to maintain foreign key integrity
                        # The price record will remain but with 0 quantity
                        pass
            
            # Check if we transferred all requested quantity
            if remaining_to_transfer > 0:
                db.session.rollback()
                return operation_result(400, "error", f"Insufficient price records for transferring {requested_quantity} units of '{item_data['item_name']}' from '{item_data['location']}'. Missing price data for {remaining_to_transfer} units.")
            
            # Update the original purchase invoice items
            for purchase_invoice_id, transfer_data in affected_purchase_invoices.items():
                unit_price = transfer_data['unit_price']
                supplier_id = transfer_data['supplier_id']
                supplier_name = transfer_data['supplier_name']
                original_description = transfer_data['description']
                
                for dest_location, transferred_qty in transfer_data['transferred_quantities'].items():
                    # Update the source invoice item (reduce quantity)
                    source_invoice_item = InvoiceItem.query.filter_by(
                        invoice_id=purchase_invoice_id,
                        item_id=warehouse_item.id,
                        location=item_data['location']  # Source location
                    ).first()
                    
                    if source_invoice_item:
                        source_invoice_item.quantity -= transferred_qty
                        source_invoice_item.total_price = source_invoice_item.quantity * source_invoice_item.unit_price
                        
                        # FIXED: Only delete invoice item if it's empty AND the corresponding price record was deleted
                        if source_invoice_item.quantity <= 0:
                            # Check if there's still a price record (even with 0 quantity)
                            remaining_price = Prices.query.filter_by(
                                invoice_id=purchase_invoice_id,
                                item_id=warehouse_item.id,
                                location=item_data['location']
                            ).first()
                            
                            if not remaining_price:
                                # Safe to delete invoice item since price record was also deleted
                                db.session.delete(source_invoice_item)
                            # If price record still exists (with 0 quantity), keep invoice item with 0 quantity too
                    
                    # Create or update destination invoice item in the same purchase invoice
                    dest_invoice_item = InvoiceItem.query.filter_by(
                        invoice_id=purchase_invoice_id,
                        item_id=warehouse_item.id,
                        location=dest_location
                    ).first()
                    
                    if dest_invoice_item:
                        # FIXED: Update existing destination invoice item and append supplier names
                        dest_invoice_item.quantity += transferred_qty
                        dest_invoice_item.total_price = dest_invoice_item.quantity * dest_invoice_item.unit_price
                        
                        # Append supplier name if different and not already included
                        if supplier_name and supplier_name.strip():
                            existing_supplier_name = dest_invoice_item.supplier_name or ""
                            supplier_names = [name.strip() for name in existing_supplier_name.split(',') if name.strip()]
                            
                            if supplier_name not in supplier_names:
                                supplier_names.append(supplier_name)
                                dest_invoice_item.supplier_name = ', '.join(supplier_names)
                        
                        # Update description to reflect transfer
                        if original_description:
                            if dest_invoice_item.description and "Transferred from" not in dest_invoice_item.description:
                                dest_invoice_item.description = f"{dest_invoice_item.description}; Transferred from {item_data['location']}"
                            elif not dest_invoice_item.description:
                                dest_invoice_item.description = f"{original_description}; Transferred from {item_data['location']}"
                    else:
                        # Create new invoice item in destination location
                        dest_invoice_item = InvoiceItem(
                            invoice_id=purchase_invoice_id,
                            item_id=warehouse_item.id,
                            quantity=transferred_qty,
                            location=dest_location,
                            unit_price=unit_price,
                            total_price=transferred_qty * unit_price,
                            description=f"{original_description}; Transferred from {item_data['location']}" if original_description else f"Transferred from {item_data['location']}",
                            supplier_id=supplier_id,
                            supplier_name=supplier_name
                        )
                        db.session.add(dest_invoice_item)
            
            # For transfer invoices, unit_price and total_price are typically 0
            # since no financial transaction occurs
            unit_price = item_data.get("unit_price", 0)
            total_price = item_data.get("total_price", 0)
            
            # Create the transfer invoice item with both source and destination location info
            invoice_item = InvoiceItem(
                invoice_id=new_invoice.id,
                item_id=warehouse_item.id,
                quantity=requested_quantity,
                location=item_data["location"],  # Source location
                unit_price=unit_price,
                total_price=total_price,
                description=data.get("description", ""),
                new_location=new_location
            )
            
            db.session.add(invoice_item)
            total_invoice_amount += total_price
        
        # Update invoice totals
        new_invoice.total_amount = total_invoice_amount
        new_invoice.residual = total_invoice_amount - new_invoice.paid
        
        db.session.commit()
        return operation_result(201, "success", invoice=new_invoice)
        
    except SQLAlchemyError as e:
        db.session.rollback()
        return operation_result(500, "error", message=f"Database error: {str(e)}")
    except Exception as e:
        db.session.rollback()
        return operation_result(500, "error", message=f"Error processing transfer: {str(e)}")

def delete_transfer(invoice, invoice_ns):
    """
    Delete a transfer invoice and reverse all location changes.
    ENHANCED: Also reverses the invoice item changes in original purchase invoices and handles supplier names properly.
    """
    # Check if it's a transfer invoice
    if invoice.type != 'تحويل':
        db.session.rollback()
        return operation_result(400, "error", "Can only delete transfer invoices with this method")

    try:
        # Track affected purchase invoices for invoice item restoration
        affected_purchase_invoices = {}
        
        # Reverse all location transfers
        for invoice_item in invoice.items:
            new_location = invoice_item.new_location
            source_location_name = invoice_item.location
            
            if not new_location:
                db.session.rollback()
                return operation_result(400, "error", f"Could not determine destination location for item transfer")
            
            # Find source location
            source_location = ItemLocations.query.filter_by(
                item_id=invoice_item.item_id,
                location=source_location_name
            ).first()
            
            # Find destination location
            destination_location = ItemLocations.query.filter_by(
                item_id=invoice_item.item_id,
                location=new_location
            ).first()
            
            if not destination_location:
                db.session.rollback()
                return operation_result(404, "error", f"Destination location '{new_location}' not found for reversal")
            
            # Check if destination has enough quantity to reverse
            if destination_location.quantity < invoice_item.quantity:
                db.session.rollback()
                return operation_result(400, "error", f"Not enough quantity in destination location '{new_location}' to reverse transfer. Available: {destination_location.quantity}, Required: {invoice_item.quantity}")
            
            # Reverse the physical inventory transfer
            destination_location.quantity -= invoice_item.quantity
            
            if not source_location:
                # Recreate source location if it was deleted
                source_location = ItemLocations(
                    item_id=invoice_item.item_id,
                    location=source_location_name,
                    quantity=0
                )
                db.session.add(source_location)
            
            source_location.quantity += invoice_item.quantity
            
            # Reverse the price record splits and track affected purchase invoices
            dest_price_records = Prices.query.filter_by(
                item_id=invoice_item.item_id,
                location=new_location
            ).order_by(Prices.invoice_id.asc()).all()
            
            remaining_to_reverse = invoice_item.quantity
            
            for dest_price in dest_price_records:
                if remaining_to_reverse <= 0:
                    break
                
                # Calculate how much to reverse from this price record
                quantity_to_reverse = min(remaining_to_reverse, dest_price.quantity)
                purchase_invoice_id = dest_price.invoice_id
                
                # Get supplier information from the destination invoice item before reversing
                dest_invoice_item = InvoiceItem.query.filter_by(
                    invoice_id=purchase_invoice_id,
                    item_id=invoice_item.item_id,
                    location=new_location
                ).first()
                
                # Track affected purchase invoice
                if purchase_invoice_id not in affected_purchase_invoices:
                    affected_purchase_invoices[purchase_invoice_id] = {
                        'reversed_quantities': {},
                        'unit_price': dest_price.unit_price,
                        'supplier_id': dest_invoice_item.supplier_id if dest_invoice_item else None,
                        'supplier_name': dest_invoice_item.supplier_name if dest_invoice_item else None,
                        'description': dest_invoice_item.description if dest_invoice_item else None
                    }
                
                if new_location not in affected_purchase_invoices[purchase_invoice_id]['reversed_quantities']:
                    affected_purchase_invoices[purchase_invoice_id]['reversed_quantities'][new_location] = 0
                affected_purchase_invoices[purchase_invoice_id]['reversed_quantities'][new_location] += quantity_to_reverse
                
                # Find or recreate the corresponding source price record
                source_price = Prices.query.filter_by(
                    invoice_id=dest_price.invoice_id,  # Same purchase invoice
                    item_id=invoice_item.item_id,
                    location=source_location_name
                ).first()
                
                if source_price:
                    # Add back to existing source price record
                    source_price.quantity += quantity_to_reverse
                else:
                    # Recreate source price record
                    source_price = Prices(
                        invoice_id=dest_price.invoice_id,
                        item_id=invoice_item.item_id,
                        location=source_location_name,
                        quantity=quantity_to_reverse,
                        unit_price=dest_price.unit_price,
                        created_at=dest_price.created_at
                    )
                    db.session.add(source_price)
                
                # Reduce destination price record
                dest_price.quantity -= quantity_to_reverse
                remaining_to_reverse -= quantity_to_reverse
                
                # Delete empty destination price record
                if dest_price.quantity <= 0:
                    db.session.delete(dest_price)
            
            # Clean up empty locations
            if destination_location.quantity == 0:
                db.session.delete(destination_location)
        
        # ENHANCED: Reverse the invoice item changes in original purchase invoices with proper supplier name handling
        for purchase_invoice_id, reversal_data in affected_purchase_invoices.items():
            unit_price = reversal_data['unit_price']
            supplier_id = reversal_data['supplier_id']
            supplier_name = reversal_data['supplier_name']
            original_description = reversal_data['description']
            
            for dest_location, reversed_qty in reversal_data['reversed_quantities'].items():
                # Remove or update destination invoice item
                dest_invoice_item = InvoiceItem.query.filter_by(
                    invoice_id=purchase_invoice_id,
                    item_id=invoice_item.item_id,
                    location=dest_location
                ).first()
                
                if dest_invoice_item:
                    dest_invoice_item.quantity -= reversed_qty
                    dest_invoice_item.total_price = dest_invoice_item.quantity * dest_invoice_item.unit_price
                    
                    # If destination invoice item is empty, delete it
                    if dest_invoice_item.quantity <= 0:
                        db.session.delete(dest_invoice_item)
                
                # Restore or create source invoice item
                source_invoice_item = InvoiceItem.query.filter_by(
                    invoice_id=purchase_invoice_id,
                    item_id=invoice_item.item_id,
                    location=source_location_name
                ).first()
                
                if source_invoice_item:
                    # Update existing source invoice item
                    source_invoice_item.quantity += reversed_qty
                    source_invoice_item.total_price = source_invoice_item.quantity * source_invoice_item.unit_price
                    
                    # FIXED: Restore supplier name if it was part of the original item
                    if supplier_name and supplier_name.strip():
                        existing_supplier_name = source_invoice_item.supplier_name or ""
                        supplier_names = [name.strip() for name in existing_supplier_name.split(',') if name.strip()]
                        
                        if supplier_name not in supplier_names:
                            supplier_names.append(supplier_name)
                            source_invoice_item.supplier_name = ', '.join(supplier_names)
                else:
                    # Recreate source invoice item with original supplier information
                    # Clean description to remove transfer references
                    clean_description = original_description
                    if original_description and "Transferred from" in original_description:
                        clean_description = original_description.split(";")[0].strip()
                    
                    source_invoice_item = InvoiceItem(
                        invoice_id=purchase_invoice_id,
                        item_id=invoice_item.item_id,
                        quantity=reversed_qty,
                        location=source_location_name,
                        unit_price=unit_price,
                        total_price=reversed_qty * unit_price,
                        description=clean_description,
                        supplier_id=supplier_id,
                        supplier_name=supplier_name
                    )
                    db.session.add(source_invoice_item)
        
        # Delete invoice items and the invoice
        InvoiceItem.query.filter_by(invoice_id=invoice.id).delete()
        db.session.delete(invoice)
        
        db.session.commit()
        return {"message": "Transfer invoice deleted and all records restored successfully"}, 200

    except Exception as e:
        db.session.rollback()
        return operation_result(500, "error", message=f"Error deleting transfer invoice: {str(e)}")

def put_transfer(data, invoice, machine, mechanism, invoice_ns):
    """
    Update a transfer invoice by reversing previous transfers and applying new ones.
    FIXED: Properly handles supplier names during updates.
    """
    try:
        with db.session.begin_nested():
            # First, reverse all existing transfers
            for item in invoice.items:
                # Extract destination location from description
                destination_location_name = item.new_location
                
                if destination_location_name:
                    # Find locations
                    source_location = ItemLocations.query.filter_by(
                        item_id=item.item_id,
                        location=item.location
                    ).first()
                    
                    destination_location = ItemLocations.query.filter_by(
                        item_id=item.item_id,
                        location=destination_location_name
                    ).first()
                    
                    if destination_location and destination_location.quantity >= item.quantity:
                        # Reverse the transfer
                        destination_location.quantity -= item.quantity
                        
                        if not source_location:
                            source_location = ItemLocations(
                                item_id=item.item_id,
                                location=item.location,
                                quantity=0
                            )
                            db.session.add(source_location)
                        
                        source_location.quantity += item.quantity
                        
                        if destination_location.quantity == 0:
                            db.session.delete(destination_location)
            
            # Delete existing invoice items
            InvoiceItem.query.filter_by(invoice_id=invoice.id).delete()
            
            # Now process the updated items just like in Transfer_Operations
            item_ids = []
            total_invoice_amount = 0
            
            for item_data in data["items"]:
                # Look up the warehouse item by name
                warehouse_item = Warehouse.query.filter_by(item_name=item_data["item_name"]).first()
                if not warehouse_item:
                    db.session.rollback()
                    return operation_result(404, "error", f"Item '{item_data['item_name']}' not found in warehouse")
                
                # Verify the source location exists and has enough quantity
                source_location = ItemLocations.query.filter_by(
                    item_id=warehouse_item.id,
                    location=item_data['location']
                ).first()
                
                if not source_location:
                    db.session.rollback()
                    return operation_result(404, "error", f"Item '{item_data['item_name']}' not found in source location '{item_data['location']}'")
                
                # Check for duplicate items
                if (warehouse_item.id, item_data['location']) in item_ids:
                    db.session.rollback()
                    return operation_result(400, "error", f"Item '{item_data['item_name']}' from location '{item_data['location']}' already added to invoice")
                
                item_ids.append((warehouse_item.id, item_data['location']))
                
                # Check if enough quantity available in source location
                requested_quantity = item_data["quantity"]
                if source_location.quantity < requested_quantity:
                    db.session.rollback()
                    return operation_result(400, "error", f"Not enough quantity for item '{item_data['item_name']}' in location '{item_data['location']}'. Available: {source_location.quantity}, Requested: {requested_quantity}")
                
                # Validate new_location is provided
                new_location = item_data.get("new_location")
                if not new_location:
                    db.session.rollback()
                    return operation_result(400, "error", f"New location must be specified for item '{item_data['item_name']}'")
                
                # Check if source and destination locations are the same
                if item_data['location'] == new_location:
                    db.session.rollback()
                    return operation_result(400, "error", f"Source and destination locations cannot be the same for item '{item_data['item_name']}'")
                
                # Update source location inventory (reduce quantity)
                source_location.quantity -= requested_quantity
                
                # Find or create destination location
                destination_location = ItemLocations.query.filter_by(
                    item_id=warehouse_item.id,
                    location=new_location
                ).first()
                
                if not destination_location:
                    # Create new location if it doesn't exist
                    destination_location = ItemLocations(
                        item_id=warehouse_item.id,
                        location=new_location,
                        quantity=0
                    )
                    db.session.add(destination_location)
                    db.session.flush()
                
                # Update destination location inventory (add quantity)
                destination_location.quantity += requested_quantity
                
                # For transfer invoices, prices are typically 0
                unit_price = item_data.get("unit_price", 0)
                total_price = item_data.get("total_price", 0)
                
                # Create the invoice item
                invoice_item = InvoiceItem(
                    invoice_id=invoice.id,
                    item_id=warehouse_item.id,
                    quantity=requested_quantity,
                    location=item_data["location"],  # Source location
                    unit_price=unit_price,
                    total_price=total_price,
                    description=item_data.get("description", ""),
                    new_location=new_location
                )
                
                db.session.add(invoice_item)
                total_invoice_amount += total_price
            
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
            invoice.employee_name = data.get("employee_name", invoice.employee_name)
            
            # Update related entities if provided
            if machine:
                invoice.machine_id = machine.id
            if mechanism:
                invoice.mechanism_id = mechanism.id
            if "supplier_id" in data and data["supplier_id"] is not None:
                invoice.supplier_id = data["supplier_id"]
            
            db.session.commit()
        
        return {"message": "Transfer invoice updated successfully"}, 200

    except SQLAlchemyError as e:
        db.session.rollback()
        return operation_result(500, "error", f"Database error: {str(e)}")
    except Exception as e:
        db.session.rollback()
        return operation_result(500, "error", f"Unexpected error: {str(e)}")