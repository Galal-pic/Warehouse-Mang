from datetime import datetime
from ..models import Invoice, Warehouse, ItemLocations, InvoiceItem, Prices, InvoicePriceDetail
from .. import db
from sqlalchemy.exc import SQLAlchemyError
from ..utils import operation_result

def Warranty_Operations(data, machine, mechanism, supplier, employee, machine_ns, warehouse_ns, invoice_ns, mechanism_ns, item_location_n, supplier_ns):
    """
    Create a warranty invoice (أمانات type).
    Warranty operations remove inventory temporarily, similar to sales but with different accounting.
    They should follow FIFO pricing to properly account for the cost.
    Updated to work with new Prices table schema that includes location.
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
        db.session.flush()  # Flush to get the invoice ID
        
        item_ids = []
        total_invoice_amount = 0
        
        for item_data in data["items"]:
            # Look up the warehouse item by name
            warehouse_item = Warehouse.query.filter_by(item_name=item_data["item_name"]).first()
            if not warehouse_item:
                db.session.rollback()
                return operation_result(404, "error", f"Item '{item_data['item_name']}' not found in warehouse")
            
            # Verify the location exists and has enough quantity
            item_location = ItemLocations.query.filter_by(
                item_id=warehouse_item.id,
                location=item_data['location']
            ).first()
            
            if not item_location:
                db.session.rollback()
                return operation_result(404, "error", f"Item '{item_data['item_name']}' not found in location '{item_data['location']}'")
            
            # Check for duplicate items
            if (warehouse_item.id, item_data['location']) in item_ids:
                db.session.rollback()
                return operation_result(400, "error", f"Item '{item_data['item_name']}' already added to invoice")
            
            item_ids.append((warehouse_item.id, item_data['location']))
            
            # Check if enough quantity available in location
            requested_quantity = item_data["quantity"]
            if item_location.quantity < requested_quantity:
                db.session.rollback()
                return operation_result(400, "error", f"Not enough quantity for item '{item_data['item_name']}' in location '{item_data['location']}'. Available: {item_location.quantity}, Requested: {requested_quantity}")
            
            # Update physical inventory in ItemLocations
            item_location.quantity -= requested_quantity
            
            # For warranty invoices, we can either:
            # 1. Use the price provided in the request (if available)
            # 2. Or calculate using FIFO from available price records
            
            # Check if unit price is provided
            unit_price = item_data.get("unit_price")
            total_price = item_data.get("total_price")
            
            # If no price is provided, calculate using FIFO
            if not unit_price or not total_price:
                # Now handle pricing using FIFO from the Prices table (UPDATED: with location support)
                remaining_to_process = requested_quantity
                calculated_total_price = 0
                
                # Get all price records for this item and location ordered by creation date (oldest first for FIFO)
                price_entries = Prices.query.filter_by(
                    item_id=warehouse_item.id,
                    location=item_data['location']  # NEW: Filter by location
                ).filter(Prices.quantity > 0).order_by(Prices.invoice_id.asc()).all()
                
                if not price_entries:
                    # If no price records for this location, try to get from any location for this item
                    # This is a fallback behavior - you might want to handle this differently
                    price_entries = Prices.query.filter_by(
                        item_id=warehouse_item.id
                    ).filter(Prices.quantity > 0).order_by(Prices.invoice_id.asc()).all()
                    
                    if not price_entries:
                        # If no price records at all, use zero (or a default price)
                        unit_price = 0
                        total_price = 0
                    else:
                        # Use prices from other locations but track in price details with actual location
                        price_details = []
                        entries_to_update = []
                        
                        for price_entry in price_entries:
                            if remaining_to_process <= 0:
                                break
                            
                            # Calculate how much we can take from this price entry
                            quantity_from_this_entry = min(remaining_to_process, price_entry.quantity)
                            
                            # Calculate price for this portion
                            subtotal = round(quantity_from_this_entry * price_entry.unit_price, 3)
                            
                            # Create a price detail record (NEW: with location support)
                            price_detail = InvoicePriceDetail(
                                invoice_id=new_invoice.id,
                                item_id=warehouse_item.id,
                                source_price_invoice_id=price_entry.invoice_id,
                                source_price_item_id=price_entry.item_id,
                                source_price_location=price_entry.location,  # NEW: Track source location
                                quantity=quantity_from_this_entry,
                                unit_price=round(price_entry.unit_price, 3),
                                subtotal=subtotal
                            )
                            
                            db.session.add(price_detail)
                            price_details.append(price_detail)
                            
                            # Update our running totals
                            calculated_total_price += subtotal
                            remaining_to_process -= quantity_from_this_entry
                            
                            # Update the price entry quantity (but DON'T delete)
                            price_entry.quantity -= quantity_from_this_entry
                            entries_to_update.append(price_entry)
                            
                            # FIXED: Don't delete empty price entries to avoid foreign key violations
                            # Keep them with quantity = 0 for referential integrity
                        
                        # Check if we've accounted for the entire requested quantity
                        if remaining_to_process > 0:
                            # For warranty operations, we might want to use the most recent price for the remainder
                            if price_details:
                                # Use the most recent price for the remainder
                                latest_price = price_entries[-1].unit_price if price_entries else 0
                                remainder_price = round(remaining_to_process * latest_price, 3)
                                calculated_total_price += remainder_price
                                
                                # Create a price detail for the remainder (NEW: with location support)
                                remainder_detail = InvoicePriceDetail(
                                    invoice_id=new_invoice.id,
                                    item_id=warehouse_item.id,
                                    source_price_invoice_id=price_entries[-1].invoice_id,
                                    source_price_item_id=price_entries[-1].item_id,
                                    source_price_location=price_entries[-1].location,  # NEW: Source location
                                    quantity=remaining_to_process,
                                    unit_price=round(latest_price, 3),
                                    subtotal=remainder_price
                                )
                                db.session.add(remainder_detail)
                            else:
                                # No price records with quantity, use default or zero
                                pass
                        
                        # Calculate effective unit price
                        if requested_quantity > 0:
                            unit_price = round(calculated_total_price / requested_quantity, 3)
                        else:
                            unit_price = 0
                        
                        total_price = round(calculated_total_price, 3)
                else:
                    # Process price entries from the same location (preferred path)
                    price_details = []
                    entries_to_update = []
                    
                    for price_entry in price_entries:
                        if remaining_to_process <= 0:
                            break
                        
                        # Calculate how much we can take from this price entry
                        quantity_from_this_entry = min(remaining_to_process, price_entry.quantity)
                        
                        # Calculate price for this portion
                        subtotal = round(quantity_from_this_entry * price_entry.unit_price, 3)
                        
                        # Create a price detail record (NEW: with location support)
                        price_detail = InvoicePriceDetail(
                            invoice_id=new_invoice.id,
                            item_id=warehouse_item.id,
                            source_price_invoice_id=price_entry.invoice_id,
                            source_price_item_id=price_entry.item_id,
                            source_price_location=price_entry.location,  # NEW: Track source location
                            quantity=quantity_from_this_entry,
                            unit_price=round(price_entry.unit_price, 3),
                            subtotal=subtotal
                        )
                        
                        db.session.add(price_detail)
                        price_details.append(price_detail)
                        
                        # Update our running totals
                        calculated_total_price += subtotal
                        remaining_to_process -= quantity_from_this_entry
                        
                        # Update the price entry quantity (but DON'T delete)
                        price_entry.quantity -= quantity_from_this_entry
                        entries_to_update.append(price_entry)
                        
                        # FIXED: Don't delete empty price entries to avoid foreign key violations
                        # Keep them with quantity = 0 for referential integrity
                    
                    # Check if we've accounted for the entire requested quantity
                    if remaining_to_process > 0:
                        # For warranty operations, we might want to use the most recent price for the remainder
                        if price_details:
                            # Use the most recent price for the remainder
                            latest_price = price_entries[-1].unit_price if price_entries else 0
                            remainder_price = round(remaining_to_process * latest_price, 3)
                            calculated_total_price += remainder_price
                            
                            # Create a price detail for the remainder (NEW: with location support)
                            remainder_detail = InvoicePriceDetail(
                                invoice_id=new_invoice.id,
                                item_id=warehouse_item.id,
                                source_price_invoice_id=price_entries[-1].invoice_id,
                                source_price_item_id=price_entries[-1].item_id,
                                source_price_location=price_entries[-1].location,  # NEW: Source location
                                quantity=remaining_to_process,
                                unit_price=round(latest_price, 3),
                                subtotal=remainder_price
                            )
                            db.session.add(remainder_detail)
                        else:
                            # No price records with quantity, use default or zero
                            pass
                    
                    # Calculate effective unit price
                    if requested_quantity > 0:
                        unit_price = round(calculated_total_price / requested_quantity, 3)
                    else:
                        unit_price = 0
                    
                    total_price = round(calculated_total_price, 3)
            
            # Create the invoice item
            invoice_item = InvoiceItem(
                invoice_id=new_invoice.id,
                item_id=warehouse_item.id,
                quantity=requested_quantity,
                location=item_data["location"],
                unit_price=round(unit_price, 3),
                total_price=round(total_price, 3),
                description=item_data.get("description", "")
            )
            
            db.session.add(invoice_item)
            total_invoice_amount += total_price
        
        # Update invoice totals with rounding
        total_invoice_amount = round(total_invoice_amount, 3)
        new_invoice.total_amount = total_invoice_amount
        new_invoice.residual = round(total_invoice_amount - new_invoice.paid, 3)
        
        db.session.commit()
        return operation_result(201, "success", "Invoice created successfully", new_invoice)
        
    except SQLAlchemyError as e:
        db.session.rollback()
        return operation_result(500, "error", f"Database error: {str(e)}")

    except Exception as e:
        db.session.rollback()
        return operation_result(500, "error", f"Error processing warranty: {str(e)}")

def delete_warranty(invoice, invoice_ns):
    """Delete a warranty invoice and restore inventory (updated with location support)"""
    # Check if it's a warranty invoice
    if invoice.type != 'أمانات':
        return operation_result(400, "error", "Can only delete warranty invoices with this method")

    try:
        # Get price details to restore prices - FIXED VERSION with location support
        price_details = InvoicePriceDetail.query.filter_by(invoice_id=invoice.id).all()
        
        # Dictionary to track price restorations by source (including location)
        price_restorations = {}
        
        # Process each price detail to prepare for restoring - FIXED VERSION with location
        for detail in price_details:
            key = (detail.source_price_invoice_id, detail.source_price_item_id, detail.source_price_location)  # NEW: Include location
            if key in price_restorations:
                price_restorations[key]['quantity'] += detail.quantity
            else:
                price_restorations[key] = {
                    'invoice_id': detail.source_price_invoice_id,
                    'item_id': detail.source_price_item_id,
                    'location': detail.source_price_location,  # NEW: Include location
                    'quantity': detail.quantity,
                    'unit_price': detail.unit_price
                }
        
        # Restore prices - either update existing or create new price entries
        for key, restoration in price_restorations.items():
            # Check if the price entry still exists (NEW: include location)
            price_entry = Prices.query.filter_by(
                invoice_id=restoration['invoice_id'],
                item_id=restoration['item_id'],
                location=restoration['location']  # NEW: Match location
            ).first()
            
            if price_entry:
                # Update existing price entry
                price_entry.quantity += restoration['quantity']
            else:
                # Create a new price entry (NEW: include location)
                new_price = Prices(
                    invoice_id=restoration['invoice_id'],
                    item_id=restoration['item_id'],
                    location=restoration['location'],  # NEW: Include location
                    quantity=restoration['quantity'],
                    unit_price=restoration['unit_price'],
                    created_at=datetime.now()  # Use current time for FIFO ordering
                )
                db.session.add(new_price)
        
        # Restore quantities for each item
        for invoice_item in invoice.items:
            # Find the item location
            item_location = ItemLocations.query.filter_by(
                item_id=invoice_item.item_id,
                location=invoice_item.location
            ).first()
            
            if not item_location:
                # Create the location if it doesn't exist anymore
                item_location = ItemLocations(
                    item_id=invoice_item.item_id,
                    location=invoice_item.location,
                    quantity=0
                )
                db.session.add(item_location)
            
            # Restore the quantity
            item_location.quantity += invoice_item.quantity
        
        # Delete price detail records
        InvoicePriceDetail.query.filter_by(invoice_id=invoice.id).delete()
        
        # Delete invoice items and the invoice
        InvoiceItem.query.filter_by(invoice_id=invoice.id).delete()
        db.session.delete(invoice)
        
        db.session.commit()
        return {"message": "Warranty invoice deleted and inventory restored successfully"}, 200

    except Exception as e:
        db.session.rollback()
        return operation_result(500, "error", f"Error deleting warranty invoice: {str(e)}")

def put_warranty(data, invoice, machine, mechanism, invoice_ns):
    """Update a warranty invoice (updated with location support)"""
    try:
        with db.session.begin_nested():
            # First, restore everything as if we're deleting the invoice
            # But keep the invoice itself
            
            # 1. Restore prices based on price details - FIXED VERSION with location
            price_details = InvoicePriceDetail.query.filter_by(invoice_id=invoice.id).all()
            price_restorations = {}
            
            for detail in price_details:
                key = (detail.source_price_invoice_id, detail.source_price_item_id, detail.source_price_location)  # NEW: Include location
                if key in price_restorations:
                    price_restorations[key]['quantity'] += detail.quantity
                else:
                    price_restorations[key] = {
                        'invoice_id': detail.source_price_invoice_id,
                        'item_id': detail.source_price_item_id,
                        'location': detail.source_price_location,  # NEW: Include location
                        'quantity': detail.quantity,
                        'unit_price': detail.unit_price
                    }
            
            for key, restoration in price_restorations.items():
                price_entry = Prices.query.filter_by(
                    invoice_id=restoration['invoice_id'],
                    item_id=restoration['item_id'],
                    location=restoration['location']  # NEW: Match location
                ).first()
                
                if price_entry:
                    price_entry.quantity += restoration['quantity']
                else:
                    new_price = Prices(
                        invoice_id=restoration['invoice_id'],
                        item_id=restoration['item_id'],
                        location=restoration['location'],  # NEW: Include location
                        quantity=restoration['quantity'],
                        unit_price=restoration['unit_price'],
                        created_at=datetime.now()
                    )
                    db.session.add(new_price)
            
            # 2. Restore quantities in ItemLocations
            for item in invoice.items:
                location = ItemLocations.query.filter_by(
                    item_id=item.item_id,
                    location=item.location
                ).first()
                
                if location:
                    location.quantity += item.quantity
            
            # 3. Delete existing invoice items and price details
            InvoiceItem.query.filter_by(invoice_id=invoice.id).delete()
            InvoicePriceDetail.query.filter_by(invoice_id=invoice.id).delete()
            
            # 4. Now process the updated items just like in Warranty_Operations
            item_ids = []
            total_invoice_amount = 0
            
            for item_data in data["items"]:
                # Look up the warehouse item by name
                warehouse_item = Warehouse.query.filter_by(item_name=item_data["item_name"]).first()
                if not warehouse_item:
                    db.session.rollback()
                    return operation_result(404, "error", f"Item '{item_data['item_name']}' not found in warehouse")
                
                # Verify the location exists and has enough quantity
                item_location = ItemLocations.query.filter_by(
                    item_id=warehouse_item.id,
                    location=item_data['location']
                ).first()
                
                if not item_location:
                    db.session.rollback()
                    return operation_result(404, "error", f"Item '{item_data['item_name']}' not found in location '{item_data['location']}'")
                
                # Check for duplicate items
                if (warehouse_item.id, item_data['location']) in item_ids:
                    db.session.rollback()
                    return operation_result(400, "error", f"Item '{item_data['item_name']}' already added to invoice")
                
                item_ids.append((warehouse_item.id, item_data['location']))
                
                # Check if enough quantity available in location
                requested_quantity = item_data["quantity"]
                if item_location.quantity < requested_quantity:
                    db.session.rollback()
                    return operation_result(400, "error", f"Not enough quantity for item '{item_data['item_name']}' in location '{item_data['location']}'. Available: {item_location.quantity}, Requested: {requested_quantity}")
                
                # Update physical inventory in ItemLocations
                item_location.quantity -= requested_quantity
                
                # Check if unit price is provided
                unit_price = item_data.get("unit_price")
                total_price = item_data.get("total_price")
                
                # If no price is provided, calculate using FIFO (similar to create operation)
                if not unit_price or not total_price:
                    # Handle pricing using FIFO from the Prices table (UPDATED: with location support)
                    remaining_to_process = requested_quantity
                    calculated_total_price = 0
                    
                    # Get all price records for this item and location ordered by creation date
                    price_entries = Prices.query.filter_by(
                        item_id=warehouse_item.id,
                        location=item_data['location']  # NEW: Filter by location
                    ).filter(Prices.quantity > 0).order_by(Prices.invoice_id.asc()).all()
                    
                    if not price_entries:
                        # Fallback: try other locations
                        price_entries = Prices.query.filter_by(
                            item_id=warehouse_item.id
                        ).filter(Prices.quantity > 0).order_by(Prices.invoice_id.asc()).all()
                    
                    if not price_entries:
                        # If no price records, use zero (or a default price)
                        unit_price = 0
                        total_price = 0
                    else:
                        # Process each price entry using FIFO
                        price_details = []
                        entries_to_update = []
                        
                        for price_entry in price_entries:
                            if remaining_to_process <= 0:
                                break
                            
                            # Calculate how much we can take from this price entry
                            quantity_from_this_entry = min(remaining_to_process, price_entry.quantity)
                            
                            # Calculate price for this portion
                            subtotal = quantity_from_this_entry * price_entry.unit_price
                            
                            # Create a price detail record - FIXED VERSION with location
                            price_detail = InvoicePriceDetail(
                                invoice_id=invoice.id,
                                item_id=warehouse_item.id,
                                source_price_invoice_id=price_entry.invoice_id,
                                source_price_item_id=price_entry.item_id,
                                source_price_location=price_entry.location,  # NEW: Include source location
                                quantity=quantity_from_this_entry,
                                unit_price=price_entry.unit_price,
                                subtotal=subtotal
                            )
                            
                            db.session.add(price_detail)
                            price_details.append(price_detail)
                            
                            # Update our running totals
                            calculated_total_price += subtotal
                            remaining_to_process -= quantity_from_this_entry
                            
                            # Update the price entry quantity
                            price_entry.quantity -= quantity_from_this_entry
                            entries_to_update.append(price_entry)
                            
                            # If the price entry is now empty, delete it
                            if price_entry.quantity <= 0:
                                db.session.delete(price_entry)
                        
                        # Check if we've accounted for the entire requested quantity
                        if remaining_to_process > 0:
                            # For warranty operations, we might want to use the most recent price for the remainder
                            if price_details:
                                # Use the most recent price for the remainder
                                latest_price = price_entries[-1].unit_price
                                remainder_price = remaining_to_process * latest_price
                                calculated_total_price += remainder_price
                                
                                # Create a price detail for the remainder - FIXED VERSION with location
                                remainder_detail = InvoicePriceDetail(
                                    invoice_id=invoice.id,
                                    item_id=warehouse_item.id,
                                    source_price_invoice_id=price_entries[-1].invoice_id,
                                    source_price_item_id=price_entries[-1].item_id,
                                    source_price_location=price_entries[-1].location,  # NEW: Include source location
                                    quantity=remaining_to_process,
                                    unit_price=latest_price,
                                    subtotal=remainder_price
                                )
                                db.session.add(remainder_detail)
                            else:
                                # No price records with quantity, use default or zero
                                pass
                        
                        # Calculate average unit price
                        if requested_quantity > 0:
                            unit_price = calculated_total_price / requested_quantity
                        else:
                            unit_price = 0
                        
                        total_price = calculated_total_price
                
                # Create the invoice item
                invoice_item = InvoiceItem(
                    invoice_id=invoice.id,
                    item_id=warehouse_item.id,
                    quantity=requested_quantity,
                    location=item_data["location"],
                    unit_price=unit_price,
                    total_price=total_price,
                    description=item_data.get("description", "")
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
        
        return {"message": "Warranty invoice updated successfully"}, 200

    except SQLAlchemyError as e:
        db.session.rollback()
        return operation_result(500, "error", f"Database error: {str(e)}")
    except Exception as e:
        db.session.rollback()
        return operation_result(500, "error", f"Unexpected error: {str(e)}")