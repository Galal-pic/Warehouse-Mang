from datetime import datetime
from ..models import Invoice, Warehouse, ItemLocations, InvoiceItem
from .. import db
from sqlalchemy.exc import SQLAlchemyError
from ..utils import operation_result

def Transfer_Operations(data, machine, mechanism, supplier, employee, machine_ns, warehouse_ns, invoice_ns, mechanism_ns, item_location_n, supplier_ns):
    """
    Create a transfer invoice (تحويل type).
    Transfer operations move inventory from one location to another without changing quantities or prices.
    They maintain the same total inventory but change the distribution across locations.
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
            
            # For transfer invoices, unit_price and total_price are typically 0
            # since no financial transaction occurs
            unit_price = item_data.get("unit_price", 0)
            total_price = item_data.get("total_price", 0)
            
            # Create the invoice item with both source and destination location info
            # We'll store the destination location in the description field for reference
            invoice_item = InvoiceItem(
                invoice_id=new_invoice.id,
                item_id=warehouse_item.id,
                quantity=requested_quantity,
                location=item_data["location"],  # Source location
                unit_price=unit_price,
                total_price=total_price,
                description=f"Transfer from '{item_data['location']}' to '{new_location}'. {item_data.get('description', '')}"
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
    """
    # Check if it's a transfer invoice
    if invoice.type != 'تحويل':
        db.session.rollback()
        return operation_result(400, "error", "Can only delete transfer invoices with this method")

    try:
        # Reverse all location transfers
        for invoice_item in invoice.items:
            # Extract destination location from description
            # Format: "Transfer from 'source' to 'destination'. description"
            description = invoice_item.description or ""
            destination_location_name = None
            
            # Parse the destination location from description
            if "Transfer from" in description and " to " in description:
                try:
                    # Extract destination location between quotes after "to '"
                    start_idx = description.find(" to '") + 5
                    end_idx = description.find("'", start_idx)
                    if start_idx > 4 and end_idx > start_idx:
                        destination_location_name = description[start_idx:end_idx]
                except:
                    pass
            
            if not destination_location_name:
                db.session.rollback()
                return operation_result(400, "error", f"Could not determine destination location for item transfer")
            
            # Find source location (this is stored in invoice_item.location)
            source_location = ItemLocations.query.filter_by(
                item_id=invoice_item.item_id,
                location=invoice_item.location
            ).first()
            
            # Find destination location
            destination_location = ItemLocations.query.filter_by(
                item_id=invoice_item.item_id,
                location=destination_location_name
            ).first()
            
            if not destination_location:
                db.session.rollback()
                return operation_result(404, "error", f"Destination location '{destination_location_name}' not found for reversal")
            
            # Check if destination has enough quantity to reverse
            if destination_location.quantity < invoice_item.quantity:
                db.session.rollback()
                return operation_result(400, "error", f"Not enough quantity in destination location '{destination_location_name}' to reverse transfer. Available: {destination_location.quantity}, Required: {invoice_item.quantity}")
            
            # Reverse the transfer
            # Remove from destination
            destination_location.quantity -= invoice_item.quantity
            
            # Add back to source
            if not source_location:
                # Recreate source location if it was deleted
                source_location = ItemLocations(
                    item_id=invoice_item.item_id,
                    location=invoice_item.location,
                    quantity=0
                )
                db.session.add(source_location)
            
            source_location.quantity += invoice_item.quantity
            
            # Clean up empty locations
            if destination_location.quantity == 0:
                db.session.delete(destination_location)
        
        # Delete invoice items and the invoice
        InvoiceItem.query.filter_by(invoice_id=invoice.id).delete()
        db.session.delete(invoice)
        
        db.session.commit()
        return {"message": "Transfer invoice deleted and locations restored successfully"}, 200

    except Exception as e:
        db.session.rollback()
        return operation_result(500, "error", message=f"Error deleting transfer invoice: {str(e)}")

def put_transfer(data, invoice, machine, mechanism, invoice_ns):
    """
    Update a transfer invoice by reversing previous transfers and applying new ones.
    """
    try:
        with db.session.begin_nested():
            # First, reverse all existing transfers
            for item in invoice.items:
                # Extract destination location from description
                description = item.description or ""
                destination_location_name = None
                
                if "Transfer from" in description and " to " in description:
                    try:
                        start_idx = description.find(" to '") + 5
                        end_idx = description.find("'", start_idx)
                        if start_idx > 4 and end_idx > start_idx:
                            destination_location_name = description[start_idx:end_idx]
                    except:
                        pass
                
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
                    description=f"Transfer from '{item_data['location']}' to '{new_location}'. {item_data.get('description', '')}"
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