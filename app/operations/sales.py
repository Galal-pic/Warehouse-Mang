from datetime import datetime
from ..models import Invoice, Warehouse, ItemLocations, InvoiceItem, Prices, InvoicePriceDetail
from .. import db
from sqlalchemy.exc import SQLAlchemyError
from ..utils import operation_result

def Sales_Operations(data, machine, mechanism, supplier, employee, machine_ns, warehouse_ns, invoice_ns, mechanism_ns, item_location_n, supplier_ns):
    try:
        # Create new invoice
        new_invoice = Invoice(
            type=data["type"],
            client_name=data.get("client_name"),
            warehouse_manager=data.get("warehouse_manager"),
            accreditation_manager=data.get("accreditation_manager"),
            total_amount=0,  # Will calculate later
            paid=data.get("paid", 0),
            residual=0,  # Will calculate later
            comment=data.get("comment"),
            status='draft',
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
            # Verify the warehouse item exists
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
            
            # Handle pricing using FIFO from the Prices table (across all locations)
            remaining_to_sell = requested_quantity
            fifo_total = 0  # Track FIFO total across all locations
            price_breakdown = []
            
            # Get all price records for this item across ALL locations ordered by creation date (oldest first for FIFO)
            price_entries = Prices.query.filter_by(
                item_id=warehouse_item.id
            ).order_by(Prices.invoice_id.asc()).all()
            
            if not price_entries:
                db.session.rollback()
                return operation_result(400, "error", f"No price information found for item '{item_data['item_name']}'")
            
            # Process each price entry using FIFO across all locations
            for price_entry in price_entries:
                if remaining_to_sell <= 0:
                    break
                
                # Calculate how much we can take from this price entry
                quantity_from_this_entry = min(remaining_to_sell, price_entry.quantity)
                
                # Calculate price for this portion
                subtotal = round(quantity_from_this_entry * price_entry.unit_price, 3)
                
                # Track this price breakdown for reference
                price_breakdown.append({
                    'quantity': quantity_from_this_entry,
                    'unit_price': round(price_entry.unit_price, 3),
                    'subtotal': subtotal,
                    'source_invoice_id': price_entry.invoice_id,
                    'source_location': price_entry.location
                })
                
                # Create a price detail record
                price_detail = InvoicePriceDetail(
                    invoice_id=new_invoice.id,
                    item_id=warehouse_item.id,
                    source_price_invoice_id=price_entry.invoice_id,
                    source_price_item_id=price_entry.item_id,
                    source_price_location=price_entry.location,
                    source_price_supplier_id=price_entry.supplier_id,
                    quantity=quantity_from_this_entry,
                    unit_price=round(price_entry.unit_price, 3),
                    subtotal=subtotal
                )
                
                db.session.add(price_detail)
                
                # Update our running totals
                fifo_total += subtotal
                remaining_to_sell -= quantity_from_this_entry
                
                # Update the price entry quantity
                price_entry.quantity -= quantity_from_this_entry
            
            # Check if we've fulfilled the entire requested quantity
            if remaining_to_sell > 0:
                db.session.rollback()
                return operation_result(400, "error", f"Insufficient priced inventory for '{item_data['item_name']}'. Missing price data for {remaining_to_sell} units.")
            
            # Calculate effective unit price based on FIFO total
            fifo_total = round(fifo_total, 3)
            effective_unit_price = round(fifo_total / requested_quantity, 3) if requested_quantity > 0 else 0
            
            # Create the invoice item with FIFO prices from all locations
            invoice_item = InvoiceItem(
                invoice_id=new_invoice.id,
                item_id=warehouse_item.id,
                quantity=requested_quantity,
                location=item_data['location'],
                unit_price=effective_unit_price,  # Average unit price across all locations
                total_price=fifo_total,  # Actual FIFO total across all locations
                description=item_data.get('description', f"FIFO pricing across all locations: {len(price_breakdown)} price levels")
            )
            
            db.session.add(invoice_item)
            
            # Add this item's FIFO total to the overall invoice amount
            total_invoice_amount += fifo_total
        
        # Update invoice totals with the actual FIFO totals
        total_invoice_amount = round(total_invoice_amount, 3)
        new_invoice.total_amount = total_invoice_amount
        new_invoice.residual = round(total_invoice_amount - new_invoice.paid, 3)
        
        db.session.commit()
        return operation_result(201, "success", invoice=new_invoice)
        
    except SQLAlchemyError as e:
        db.session.rollback()
        return operation_result(500, "error", message=f"Database error: {str(e)}")
    except Exception as e:
        db.session.rollback()
        return operation_result(500, "error", message=f"Error processing sale: {str(e)}")


def delete_sales(invoice, invoice_ns):
    # Check if it's a sales invoice
    if invoice.type != 'صرف':
        db.session.rollback()
        return operation_result(400, "error", "Can only delete sales invoices with this method")

    try:
        # Start by collecting information about the price details to restore prices
        price_details = InvoicePriceDetail.query.filter_by(invoice_id=invoice.id).all()
        
        # Dictionary to track price restorations by source (including location)
        price_restorations = {}
        
        # Process each price detail to prepare for restoring
        for detail in price_details:
            key = (detail.source_price_invoice_id, detail.source_price_item_id, detail.source_price_location)  # Include location
            if key in price_restorations:
                price_restorations[key]['quantity'] += detail.quantity
            else:
                price_restorations[key] = {
                    'invoice_id': detail.source_price_invoice_id,
                    'item_id': detail.source_price_item_id,
                    'location': detail.source_price_location,  # Include location
                    'quantity': detail.quantity,
                    'unit_price': detail.unit_price
                }
        
        # Restore prices - either update existing or create new price entries
        for key, restoration in price_restorations.items():
            # Check if the price entry still exists (including location)
            price_entry = Prices.query.filter_by(
                invoice_id=restoration['invoice_id'],
                item_id=restoration['item_id'],
                location=restoration['location']  # Include location filter
            ).first()
            
            if price_entry:
                # Update existing price entry
                price_entry.quantity += restoration['quantity']
            else:
                # Create a new price entry
                new_price = Prices(
                    invoice_id=restoration['invoice_id'],
                    item_id=restoration['item_id'],
                    location=restoration['location'],  # Include location
                    quantity=restoration['quantity'],
                    unit_price=restoration['unit_price'],
                    supplier_id=0  # Use default supplier for sales operations
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
        
        # Delete the invoice and all related records (cascade will handle invoice items and price details)
        db.session.delete(invoice)
        
        db.session.commit()
        return {"message": "Invoice deleted and inventory restored successfully"}, 200

    except Exception as e:
        db.session.rollback()
        return operation_result(500, "error", f"Error deleting invoice: {str(e)}")


def put_sales(data, invoice, machine, mechanism, invoice_ns):
    try:
        with db.session.begin_nested():  # Use a savepoint for the complex operation
            # First, restore everything as if we're deleting the invoice
            # But keep the invoice itself
            
            # 1. Restore quantities in ItemLocations
            for item in invoice.items:
                location = ItemLocations.query.filter_by(
                    item_id=item.item_id,
                    location=item.location
                ).first()
                
                if location:
                    location.quantity += item.quantity
            
            # 2. Restore prices based on price details (UPDATED with location)
            price_details = InvoicePriceDetail.query.filter_by(invoice_id=invoice.id).all()
            price_restorations = {}
            
            for detail in price_details:
                key = (detail.source_price_invoice_id, detail.source_price_item_id, detail.source_price_location)  # Include location
                if key in price_restorations:
                    price_restorations[key]['quantity'] += detail.quantity
                else:
                    price_restorations[key] = {
                        'invoice_id': detail.source_price_invoice_id,
                        'item_id': detail.source_price_item_id,
                        'location': detail.source_price_location,  # Include location
                        'quantity': detail.quantity,
                        'unit_price': detail.unit_price
                    }
            
            for key, restoration in price_restorations.items():
                price_entry = Prices.query.filter_by(
                    invoice_id=restoration['invoice_id'],
                    item_id=restoration['item_id'],
                    location=restoration['location']  # Include location filter
                ).first()
                
                if price_entry:
                    price_entry.quantity += restoration['quantity']
                else:
                    new_price = Prices(
                        invoice_id=restoration['invoice_id'],
                        item_id=restoration['item_id'],
                        location=restoration['location'],  # Include location
                        quantity=restoration['quantity'],
                        unit_price=restoration['unit_price']
                    )
                    db.session.add(new_price)
            
            # 3. Delete existing invoice items and price details
            InvoiceItem.query.filter_by(invoice_id=invoice.id).delete()
            InvoicePriceDetail.query.filter_by(invoice_id=invoice.id).delete()
            
            # 4. Now create the new invoice items just like in Sales_Operations
            item_ids = []
            total_invoice_amount = 0
            
            for item_data in data["items"]:
                # Verify the warehouse item exists
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
                
                # UPDATED: Handle pricing using FIFO from the Prices table (location-specific)
                remaining_to_sell = requested_quantity
                total_item_price = 0
                
                # Get all price records for this specific item and location ordered by creation date (oldest first for FIFO)
                price_entries = Prices.query.filter_by(
                    item_id=warehouse_item.id,
                    location=item_data['location']  # FIXED: Filter by specific location
                ).order_by(Prices.invoice_id.asc()).all()
                
                if not price_entries:
                    db.session.rollback()
                    return operation_result(400, "error", f"No price information found for item '{item_data['item_name']}' in location '{item_data['location']}'")
                
                entries_to_delete = []
                
                # Process each price entry using FIFO
                for price_entry in price_entries:
                    if remaining_to_sell <= 0:
                        break
                    
                    # Calculate how much we can take from this price entry
                    quantity_from_this_entry = min(remaining_to_sell, price_entry.quantity)
                    
                    # Calculate price for this portion
                    subtotal = quantity_from_this_entry * price_entry.unit_price
                    
                    # Create a price detail record (UPDATED with location)
                    price_detail = InvoicePriceDetail(
                        invoice_id=invoice.id,
                        item_id=warehouse_item.id,
                        source_price_invoice_id=price_entry.invoice_id,
                        source_price_item_id=price_entry.item_id,
                        source_price_location=price_entry.location,  # Include location
                        source_price_supplier_id=price_entry.supplier_id,  # Include supplier
                        quantity=quantity_from_this_entry,
                        unit_price=price_entry.unit_price,
                        subtotal=subtotal
                    )
                    
                    db.session.add(price_detail)
                    
                    # Update our running totals
                    total_item_price += subtotal
                    remaining_to_sell -= quantity_from_this_entry
                    
                    # Update the price entry quantity
                    price_entry.quantity -= quantity_from_this_entry
                    
                    # If the price entry is now empty, mark it for deletion
                    if price_entry.quantity <= 0:
                        entries_to_delete.append(price_entry)
                
                # Check if we've fulfilled the entire requested quantity
                if remaining_to_sell > 0:
                    db.session.rollback()
                    return operation_result(400, "error", f"Insufficient priced inventory for '{item_data['item_name']}' in location '{item_data['location']}'. Missing price data for {remaining_to_sell} units.")
                
                # Delete the empty price entries (optional)
                # for entry in entries_to_delete:
                #     db.session.delete(entry)
                
                # Calculate the average unit price
                average_unit_price = total_item_price / requested_quantity
                
                # Create the invoice item
                invoice_item = InvoiceItem(
                    invoice_id=invoice.id,
                    item_id=warehouse_item.id,
                    quantity=requested_quantity,
                    location=item_data['location'],
                    unit_price=average_unit_price,
                    total_price=total_item_price,
                    description=item_data.get('description', f"FIFO pricing from location {item_data['location']}")
                )
                
                db.session.add(invoice_item)
                total_invoice_amount += total_item_price
            
            # 5. Update invoice fields
            invoice.type = data["type"]
            invoice.client_name = data.get("client_name")
            invoice.warehouse_manager = data.get("warehouse_manager")
            invoice.accreditation_manager = data.get("accreditation_manager")
            invoice.total_amount = total_invoice_amount
            invoice.paid = data.get("paid", 0)
            invoice.residual = total_invoice_amount - invoice.paid
            invoice.comment = data.get("comment")
            
            # Update machine and mechanism if provided
            if machine:
                invoice.machine_id = machine.id
            if mechanism:
                invoice.mechanism_id = mechanism.id
            
            db.session.commit()
        
        return {"message": "Invoice updated successfully"}, 200

    except SQLAlchemyError as e:
        db.session.rollback()
        return operation_result(500, "error", f"Database error: {str(e)}")
    except Exception as e:
        db.session.rollback()
        return operation_result(500, "error", f"Error updating invoice: {str(e)}")