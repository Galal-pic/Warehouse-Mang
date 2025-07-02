from datetime import datetime
from ..models import Invoice, Warehouse, ItemLocations, InvoiceItem, Prices, InvoicePriceDetail, ReturnSales
from .. import db
from sqlalchemy.exc import SQLAlchemyError
from ..utils import operation_result

from datetime import datetime
from ..models import Invoice, Warehouse, ItemLocations, InvoiceItem, Prices, InvoicePriceDetail, ReturnSales
from .. import db
from sqlalchemy.exc import SQLAlchemyError
from ..utils import operation_result

def Return_Operations(data, machine, mechanism, supplier, employee, machine_ns, warehouse_ns, invoice_ns, mechanism_ns, item_location_n, supplier_ns):
    """
    Create a return invoice (مرتجع type).
    Return operations add inventory back to the system and properly restore price records using FIFO order.
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
                db.session.rollback()
                return operation_result(404, "error", f"Item '{item_data['item_name']}' not found in warehouse", None)
            
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
                db.session.rollback()
                return operation_result(400, "error", f"Item '{item_data['item_name']}' already added to invoice", None)
            
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
            
            # For returns, restore price records based on original sales invoice
            price_updated = False
            
            if 'original_invoice_id' in data and data['original_invoice_id']:
                # Get price details for this specific item from the original sales invoice
                original_invoice_details = InvoicePriceDetail.query.filter_by(
                    invoice_id=data['original_invoice_id'],
                    item_id=warehouse_item.id  # Filter by item_id here too
                ).order_by(InvoicePriceDetail.id.asc()).all()  # Maintain FIFO order
                
                if original_invoice_details:
                    # Check for old return invoices
                    total_sales_items = sum([
                        detail.quantity for detail in original_invoice_details
                    ])
                    old_return_invoices = ReturnSales.query.filter_by(
                        sales_invoice_id=data['original_invoice_id']
                    ).all()
                    
                    total_returned_quantity = 0
                    if old_return_invoices:
                        for old_invoice in old_return_invoices:
                            old_invoice_items = InvoiceItem.query.filter_by(
                                invoice_id=old_invoice.return_invoice_id,
                                item_id=warehouse_item.id
                            ).all()
                            for old_invoice_item in old_invoice_items:
                                total_returned_quantity += old_invoice_item.quantity
                                
                    if total_returned_quantity + item_data['quantity'] > total_sales_items:
                        db.session.rollback()
                        return operation_result(400, "error", f"Return quantity exceeds the total sales quantity for item '{item_data['item_name']}'", None)
                    
                    # FIXED: Restore quantities proportionally based on FIFO consumption
                    remaining_to_return = item_data['quantity']
                    
                    # Process price details in FIFO order (same order as original consumption)
                    for detail in original_invoice_details:
                        if remaining_to_return <= 0:
                            break
                            
                        # Find the corresponding price record
                        price = Prices.query.filter_by(
                            invoice_id=detail.source_price_invoice_id,
                            item_id=detail.source_price_item_id
                        ).first()
                        
                        if price:
                            # Calculate how much to return to this specific price record
                            # Return proportionally based on how much was originally consumed
                            quantity_to_return = min(remaining_to_return, detail.quantity)
                            
                            # Update the price record
                            price.quantity += quantity_to_return
                            db.session.add(price)
                            
                            # Reduce remaining quantity to return
                            remaining_to_return -= quantity_to_return
                            price_updated = True
                    
                    # If there's still quantity left to return (shouldn't happen with proper validation)
                    if remaining_to_return > 0:
                        db.session.rollback()
                        return operation_result(400, "error", f"Cannot properly restore all returned quantities for item '{item_data['item_name']}'", None)
            
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
            
        # Create a return sales record if original_invoice_id is provided
        if 'original_invoice_id' in data and data['original_invoice_id']:
            return_sales_invoice = ReturnSales(
                sales_invoice_id=data['original_invoice_id'],
                return_invoice_id=new_invoice.id
            )
            db.session.add(return_sales_invoice)
        
        # Update invoice totals
        new_invoice.total_amount = total_invoice_amount
        new_invoice.residual = total_invoice_amount - new_invoice.paid
        
        db.session.commit()
        return operation_result(200, "success", "Invoice created successfully", new_invoice)
        
    except SQLAlchemyError as e:
        db.session.rollback()
        return operation_result(500, "error", f"Database error: {str(e)}", None)
    except Exception as e:
        db.session.rollback()
        return operation_result(500, "error", f"Error processing return: {str(e)}", None)

def delete_return(invoice, invoice_ns):
    # Check if it's a return invoice
    if invoice.type != 'مرتجع':
        db.session.rollback()
        return operation_result(400, "error", "Can only delete return invoices with this method")

    try:
        # Get the original sales invoice information
        return_sales_record = ReturnSales.query.filter_by(return_invoice_id=invoice.id).first()
        original_sales_invoice_id = None
        
        if return_sales_record:
            original_sales_invoice_id = return_sales_record.sales_invoice_id

        # Process each item in the return invoice
        for invoice_item in invoice.items:
            warehouse_item = invoice_item.warehouse
            
            # Step 1: Check if we need to revert price changes made to existing price records
            if original_sales_invoice_id:
                # Get the price details from the original sales invoice for this item
                original_price_details = InvoicePriceDetail.query.filter_by(
                    invoice_id=original_sales_invoice_id,
                    item_id=warehouse_item.id
                ).order_by(InvoicePriceDetail.id.asc()).all()
                
                # Calculate how much quantity was returned to each price record
                remaining_to_revert = invoice_item.quantity
                
                for detail in original_price_details:
                    if remaining_to_revert <= 0:
                        break
                    
                    # Find the price record that was restored
                    price_record = Prices.query.filter_by(
                        invoice_id=detail.source_price_invoice_id,
                        item_id=detail.source_price_item_id
                    ).first()
                    
                    if price_record:
                        # Calculate how much was returned to this price record
                        quantity_returned_to_this_record = min(remaining_to_revert, detail.quantity)
                        
                        # Check if this quantity has been consumed again since the return
                        if price_record.quantity < quantity_returned_to_this_record:
                            db.session.rollback()
                            return operation_result(400, "error", 
                                f"Cannot delete return invoice: {quantity_returned_to_this_record - price_record.quantity} units of "
                                f"'{warehouse_item.item_name}' from the returned stock have already been sold again. "
                                f"Available in price record: {price_record.quantity}, trying to remove: {quantity_returned_to_this_record}")
                        
                        # Subtract the returned quantity back from the price record
                        price_record.quantity -= quantity_returned_to_this_record
                        remaining_to_revert -= quantity_returned_to_this_record
                        
                        # FIXED: Only delete price records if they have no references AND are empty
                        if price_record.quantity <= 0:
                            # Check if this price record is referenced by any invoice_price_detail records
                            referencing_details = InvoicePriceDetail.query.filter_by(
                                source_price_invoice_id=price_record.invoice_id,
                                source_price_item_id=price_record.item_id
                            ).first()
                            
                            # Only delete if no references exist
                            if not referencing_details:
                                db.session.delete(price_record)
                            # If there are references, leave the record with 0 quantity
            
            # Step 2: Handle price records that were created specifically by this return invoice
            return_created_prices = Prices.query.filter_by(
                invoice_id=invoice.id,
                item_id=warehouse_item.id
            ).all()
            
            for price_record in return_created_prices:
                # Check if any quantity from these price records has been consumed
                price_details_consuming_this = InvoicePriceDetail.query.filter_by(
                    source_price_invoice_id=price_record.invoice_id,
                    source_price_item_id=price_record.item_id
                ).all()
                
                consumed_from_return_price = sum(detail.quantity for detail in price_details_consuming_this)
                
                if consumed_from_return_price > 0:
                    db.session.rollback()
                    return operation_result(400, "error", 
                        f"Cannot delete return invoice: {consumed_from_return_price} units of "
                        f"'{warehouse_item.item_name}' from the returned stock have already been sold again.")
            
            # Step 3: Restore inventory quantities (subtract the returned quantity)
            item_location = ItemLocations.query.filter_by(
                item_id=invoice_item.item_id,
                location=invoice_item.location
            ).first()
            
            if not item_location:
                raise ValueError(
                    f"Item {warehouse_item.item_name} not found in location {invoice_item.location}"
                )

            # Subtract the returned quantity (since we're deleting the return)
            item_location.quantity -= invoice_item.quantity
            
            # Check for negative quantity
            if item_location.quantity < 0:
                db.session.rollback()
                return operation_result(400, "error", 
                    f"Cannot delete return invoice: Not enough quantity for item "
                    f"'{warehouse_item.item_name}' in location '{invoice_item.location}'. "
                    f"Available: {item_location.quantity + invoice_item.quantity}, "
                    f"trying to remove: {invoice_item.quantity}. "
                    f"Some items may have already been moved or sold.")

        # Step 4: Delete price records created specifically by this return invoice
        # FIXED: Only delete if they have no references
        return_created_prices = Prices.query.filter_by(invoice_id=invoice.id).all()
        for price_record in return_created_prices:
            # Check if this price record is referenced by any invoice_price_detail records
            referencing_details = InvoicePriceDetail.query.filter_by(
                source_price_invoice_id=price_record.invoice_id,
                source_price_item_id=price_record.item_id
            ).first()
            
            # Only delete if no references exist
            if not referencing_details:
                db.session.delete(price_record)
            else:
                # If there are references, we cannot delete this return invoice
                # because it would leave orphaned price detail records
                db.session.rollback()
                return operation_result(400, "error", 
                    f"Cannot delete return invoice: Items from this return have already been sold again. "
                    f"Delete the subsequent sales invoices first.")
        
        # Step 5: Delete invoice items
        InvoiceItem.query.filter_by(invoice_id=invoice.id).delete()
        
        # Step 6: Delete the return_sales record
        if return_sales_record:
            db.session.delete(return_sales_record)
        
        # Step 7: Delete the invoice itself
        db.session.delete(invoice)
        
        db.session.commit()
        return {"message": "Return invoice deleted and stock adjusted successfully"}, 200

    except SQLAlchemyError as e:
        db.session.rollback()
        return operation_result(500, "error", f"Database error: {str(e)}", None)
    except Exception as e:
        db.session.rollback()
        return operation_result(500, "error", f"Error deleting return invoice: {str(e)}", None)

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
                    db.session.rollback()
                    return operation_result(404, "error", f"Item '{item_data['item_name']}' not found in warehouse")
                
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
                    db.session.rollback()
                    return operation_result(400, "error",  f"Cannot update return invoice: Not enough quantity for item " +
                        f"'{item_data['item_name']}' in location '{location}'. " +
                        f"Some items may have already been moved or sold.")

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
                            db.session.rollback()
                            return operation_result(400, "error",  f"Cannot update return invoice: {consumed} units of " +
                                f"'{item_data['item_name']}' have already been sold again. " +
                                f"Cannot reduce quantity below {consumed}.")
                        
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
                        db.session.rollback()
                        return operation_result(400, "error",  f"Cannot remove item: {consumed} units of " +
                            f"'{item.warehouse.item_name}' have already been sold again.")
                    
                    if item_location:
                        # For returns, we subtract when removing items
                        item_location.quantity -= item.quantity
                        
                        # Check for negative quantity
                        if item_location.quantity < 0:
                            db.session.rollback()
                            return operation_result(400, "error",  f"Cannot remove item: Not enough quantity for " +
                                f"'{item.warehouse.item_name}' in location '{location}'. " +
                                f"Some items may have already been moved or sold.")
                    
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
        return operation_result(500, "error", f"Database error: {str(e)}")
        
    except Exception as e:
        db.session.rollback()
        return operation_result(500, "error", f"Unexpected error: {str(e)}")