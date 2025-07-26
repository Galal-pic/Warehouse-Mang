from datetime import datetime
from ..models import Invoice, Warehouse, ItemLocations, InvoiceItem, Prices, InvoicePriceDetail, ReturnSales
from .. import db
from sqlalchemy.exc import SQLAlchemyError
from ..utils import operation_result

def Return_Operations(data, machine, mechanism, supplier, employee, machine_ns, warehouse_ns, invoice_ns, mechanism_ns, item_location_n, supplier_ns):
    """
    Create a return invoice (مرتجع type).
    Return operations add inventory back to the system and properly restore price records using FIFO order.
    Now supports returning from both sales invoices (صرف) and purchase invoices (اضافه).
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
            status=data.get("status", "draft"),
            employee_name=data.get('employee_name'),
            employee_id=employee.id,
            machine_id=machine.id if machine else None,
            mechanism_id=mechanism.id if mechanism else None,
            supplier_id=supplier.id if supplier else None,
        )
        
        db.session.add(new_invoice)
        db.session.flush()
        
        item_ids = []
        total_invoice_amount = 0
        
        # Check if we have an original invoice to return from
        original_invoice_id = data.get('original_invoice_id')
        original_invoice = None
        return_type = None  # 'sales' or 'purchase'
        
        if original_invoice_id:
            original_invoice = Invoice.query.get(original_invoice_id)
            if not original_invoice:
                db.session.rollback()
                return operation_result(404, "error", f"Original invoice {original_invoice_id} not found", None)
            
            if original_invoice.type == 'صرف':
                return_type = 'sales'
            elif original_invoice.type == 'اضافه':
                return_type = 'purchase'
            else:
                db.session.rollback()
                return operation_result(400, "error", f"Cannot return from invoice type '{original_invoice.type}'. Only sales (صرف) and purchase (اضافه) invoices can be returned.", None)
        
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
            
            # Update the quantity in the warehouse
            # For sales returns: increase quantity (customer returning items)
            # For purchase returns: decrease quantity (returning items to supplier)
            if return_type == 'sales':
                item_location.quantity += quantity  # Add back to inventory
            elif return_type == 'purchase':
                # Check if we have enough quantity to return
                if item_location.quantity < quantity:
                    db.session.rollback()
                    return operation_result(400, "error", f"Not enough quantity to return for item '{item_data['item_name']}' in location '{item_data['location']}'. Available: {item_location.quantity}, Requested: {quantity}", None)
                item_location.quantity -= quantity  # Remove from inventory
            else:
                # No original invoice - default behavior (increase inventory)
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
            
            # Handle price restoration based on return type
            price_updated = False
            
            if original_invoice_id and return_type == 'sales':
                # RETURNING FROM SALES INVOICE (updated with location support)
                price_updated = handle_sales_return(
                    original_invoice_id, warehouse_item, item_data, 
                    new_invoice, quantity, unit_price
                )
                    
            elif original_invoice_id and return_type == 'purchase':
                # RETURNING FROM PURCHASE INVOICE (updated with location support)
                price_updated = handle_purchase_return(
                    original_invoice_id, warehouse_item, item_data, 
                    new_invoice, quantity, unit_price
                )
            
            # If no price was updated from original invoice, create a new price record
            if not price_updated and unit_price > 0:
                new_price = Prices(
                    invoice_id=new_invoice.id,
                    item_id=warehouse_item.id,
                    location=item_data['location'],  # NEW: Include location
                    quantity=quantity,
                    unit_price=unit_price,
                    created_at=datetime.now()
                )
                db.session.add(new_price)
                    
            total_invoice_amount += total_price
            
        # Create a return sales record if original_invoice_id is provided
        if original_invoice_id:
            return_sales_invoice = ReturnSales(
                sales_invoice_id=original_invoice_id,
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



def handle_sales_return(original_invoice_id, warehouse_item, item_data, new_invoice, quantity, unit_price):
    """Handle returning items from a sales invoice (updated with location support)"""
    # Get price details for this specific item from the original sales invoice
    original_invoice_details = InvoicePriceDetail.query.filter_by(
        invoice_id=original_invoice_id,
        item_id=warehouse_item.id
    ).order_by(InvoicePriceDetail.id.asc()).all()
    
    if not original_invoice_details:
        return False
    
    # Check for old return invoices
    total_sales_items = sum([detail.quantity for detail in original_invoice_details])
    old_return_invoices = ReturnSales.query.filter_by(
        sales_invoice_id=original_invoice_id
    ).all()
    
    total_returned_quantity = 0
    if old_return_invoices:
        for old_invoice in old_return_invoices:
            old_invoice_items = InvoiceItem.query.filter_by(
                invoice_id=old_invoice.return_invoice_id,
                item_id=warehouse_item.id,
                location=item_data['location']  # NEW: Check specific location
            ).all()
            for old_invoice_item in old_invoice_items:
                total_returned_quantity += old_invoice_item.quantity
    
    if total_returned_quantity + item_data['quantity'] > total_sales_items:
        db.session.rollback()
        raise Exception(f"Return quantity exceeds the total sales quantity for item '{item_data['item_name']}' in location '{item_data['location']}'")
    
    # Restore quantities proportionally based on FIFO consumption
    remaining_to_return = item_data['quantity']
    
    for detail in original_invoice_details:
        if remaining_to_return <= 0:
            break
            
        # Find the corresponding price record (NEW: include location)
        price = Prices.query.filter_by(
            invoice_id=detail.source_price_invoice_id,
            item_id=detail.source_price_item_id,
            location=detail.source_price_location  # NEW: Match location
        ).first()
        
        if price:
            quantity_to_return = min(remaining_to_return, detail.quantity)
            price.quantity += quantity_to_return
            db.session.add(price)
            remaining_to_return -= quantity_to_return
    
    if remaining_to_return > 0:
        db.session.rollback()
        raise Exception(f"Cannot properly restore all returned quantities for item '{item_data['item_name']}' in location '{item_data['location']}'")
    
    return True


def handle_purchase_return(original_invoice_id, warehouse_item, item_data, new_invoice, quantity, unit_price):
    """Handle returning items to a purchase invoice (updated with location support)"""
    # Find the original purchase invoice items for this item and location
    original_purchase_items = InvoiceItem.query.filter_by(
        invoice_id=original_invoice_id,
        item_id=warehouse_item.id,
        location=item_data['location']  # NEW: Match specific location
    ).all()
    
    if not original_purchase_items:
        return False
    
    # Calculate total purchased quantity for this location
    total_purchased_quantity = sum([item.quantity for item in original_purchase_items])
    
    # Check for previous returns from this purchase invoice for this location
    old_return_invoices = ReturnSales.query.filter_by(
        sales_invoice_id=original_invoice_id
    ).all()
    
    total_returned_quantity = 0
    if old_return_invoices:
        for old_invoice in old_return_invoices:
            old_invoice_items = InvoiceItem.query.filter_by(
                invoice_id=old_invoice.return_invoice_id,
                item_id=warehouse_item.id,
                location=item_data['location']  # NEW: Check specific location
            ).all()
            for old_invoice_item in old_invoice_items:
                total_returned_quantity += old_invoice_item.quantity
    
    # Validate return quantity doesn't exceed purchased quantity
    if total_returned_quantity + item_data['quantity'] > total_purchased_quantity:
        db.session.rollback()
        raise Exception(f"Return quantity exceeds the total purchased quantity for item '{item_data['item_name']}' in location '{item_data['location']}'")
    
    # For purchase returns, we need to reduce the price record created by the purchase
    price_record = Prices.query.filter_by(
        invoice_id=original_invoice_id,
        item_id=warehouse_item.id,
        location=item_data['location']  # NEW: Match location
    ).first()
    
    if price_record:
        # Check if enough quantity is available in the price record
        if price_record.quantity < item_data['quantity']:
            # Some of the purchased items have already been sold
            available_to_return = price_record.quantity
            already_sold = (total_purchased_quantity - total_returned_quantity) - available_to_return
            
            db.session.rollback()
            raise Exception(f"Cannot return {item_data['quantity']} units of '{item_data['item_name']}' in location '{item_data['location']}'. " +
                          f"Only {available_to_return} units available to return. " +
                          f"{already_sold} units have already been sold.")
        
        # Reduce the price record quantity
        price_record.quantity -= item_data['quantity']
        db.session.add(price_record)
        
        # If the price record becomes empty and has no references, we can delete it
        if price_record.quantity <= 0:
            referencing_details = InvoicePriceDetail.query.filter_by(
                source_price_invoice_id=price_record.invoice_id,
                source_price_item_id=price_record.item_id,
                source_price_location=price_record.location  # NEW: Check location
            ).first()
            
            if not referencing_details:
                db.session.delete(price_record)
        
        return True
    
    return False
def delete_return(invoice, invoice_ns):
    """Delete a return invoice and restore original state for both sales and purchase returns (updated with location support)"""
    # Check if it's a return invoice
    if invoice.type != 'مرتجع':
        db.session.rollback()
        return operation_result(400, "error", "Can only delete return invoices with this method")

    try:
        # Get the original invoice information
        return_sales_record = ReturnSales.query.filter_by(return_invoice_id=invoice.id).first()
        original_invoice_id = None
        original_invoice = None
        return_type = None
        
        if return_sales_record:
            original_invoice_id = return_sales_record.sales_invoice_id
            original_invoice = Invoice.query.get(original_invoice_id)
            
            if original_invoice:
                if original_invoice.type == 'صرف':
                    return_type = 'sales'
                elif original_invoice.type == 'اضافه':
                    return_type = 'purchase'

        # Process each item in the return invoice
        for invoice_item in invoice.items:
            warehouse_item = invoice_item.warehouse
            
            if return_type == 'sales':
                # Handle sales return deletion (updated logic)
                result = handle_sales_return_deletion(
                    invoice_item, warehouse_item, original_invoice_id
                )
                if result is not True:
                    db.session.rollback()
                    return result
                    
            elif return_type == 'purchase':
                # Handle purchase return deletion (updated logic)
                result = handle_purchase_return_deletion(
                    invoice_item, warehouse_item, original_invoice_id
                )
                if result is not True:
                    db.session.rollback()
                    return result
            
            # Handle price records created specifically by this return invoice
            return_created_prices = Prices.query.filter_by(
                invoice_id=invoice.id,
                item_id=warehouse_item.id,
                location=invoice_item.location  # NEW: Match location
            ).all()
            
            for price_record in return_created_prices:
                # Check if any quantity from these price records has been consumed
                price_details_consuming_this = InvoicePriceDetail.query.filter_by(
                    source_price_invoice_id=price_record.invoice_id,
                    source_price_item_id=price_record.item_id,
                    source_price_location=price_record.location  # NEW: Match location
                ).all()
                
                consumed_from_return_price = sum(detail.quantity for detail in price_details_consuming_this)
                
                if consumed_from_return_price > 0:
                    db.session.rollback()
                    return operation_result(400, "error", 
                        f"Cannot delete return invoice: {consumed_from_return_price} units of "
                        f"'{warehouse_item.item_name}' from location '{invoice_item.location}' have already been sold again.")
            
            # Restore inventory quantities (subtract the returned quantity)
            item_location = ItemLocations.query.filter_by(
                item_id=invoice_item.item_id,
                location=invoice_item.location
            ).first()
            
            if not item_location:
                raise ValueError(
                    f"Item {warehouse_item.item_name} not found in location {invoice_item.location}"
                )

            # Restore inventory quantities
            # For sales return deletion: subtract the returned quantity (remove what was added back)
            # For purchase return deletion: add the returned quantity back (restore what was removed)
            if return_type == 'sales':
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
            elif return_type == 'purchase':
                item_location.quantity += invoice_item.quantity  # Add back what was removed
            else:
                # No original invoice - default behavior (subtract)
                item_location.quantity -= invoice_item.quantity
                if item_location.quantity < 0:
                    db.session.rollback()
                    return operation_result(400, "error", 
                        f"Cannot delete return invoice: Not enough quantity for item "
                        f"'{warehouse_item.item_name}' in location '{invoice_item.location}'.")

        # Delete price records created specifically by this return invoice
        return_created_prices = Prices.query.filter_by(invoice_id=invoice.id).all()
        for price_record in return_created_prices:
            # Check if this price record is referenced by any invoice_price_detail records
            referencing_details = InvoicePriceDetail.query.filter_by(
                source_price_invoice_id=price_record.invoice_id,
                source_price_item_id=price_record.item_id,
                source_price_location=price_record.location  # NEW: Check location
            ).first()
            
            # Only delete if no references exist
            if not referencing_details:
                db.session.delete(price_record)
            else:
                db.session.rollback()
                return operation_result(400, "error", 
                    f"Cannot delete return invoice: Items from this return have already been sold again. "
                    f"Delete the subsequent sales invoices first.")
        
        # Delete invoice items
        InvoiceItem.query.filter_by(invoice_id=invoice.id).delete()
        
        # Delete the return_sales record
        if return_sales_record:
            db.session.delete(return_sales_record)
        
        # Delete the invoice itself
        db.session.delete(invoice)
        
        db.session.commit()
        return {"message": "Return invoice deleted and stock adjusted successfully"}, 200

    except SQLAlchemyError as e:
        db.session.rollback()
        return operation_result(500, "error", f"Database error: {str(e)}", None)
    except Exception as e:
        db.session.rollback()
        return operation_result(500, "error", f"Error deleting return invoice: {str(e)}", None)


def handle_sales_return_deletion(invoice_item, warehouse_item, original_invoice_id):
    """Handle deletion of a sales return - restore price records that were increased (updated with location support)"""
    if not original_invoice_id:
        return True
        
    # Get the price details from the original sales invoice for this item
    original_price_details = InvoicePriceDetail.query.filter_by(
        invoice_id=original_invoice_id,
        item_id=warehouse_item.id
    ).order_by(InvoicePriceDetail.id.asc()).all()
    
    # Calculate how much quantity was returned to each price record
    remaining_to_revert = invoice_item.quantity
    
    for detail in original_price_details:
        if remaining_to_revert <= 0:
            break
        
        # Find the price record that was restored (NEW: include location)
        price_record = Prices.query.filter_by(
            invoice_id=detail.source_price_invoice_id,
            item_id=detail.source_price_item_id,
            location=detail.source_price_location  # NEW: Match location
        ).first()
        
        if price_record:
            # Calculate how much was returned to this price record
            quantity_returned_to_this_record = min(remaining_to_revert, detail.quantity)
            
            # Check if this quantity has been consumed again since the return
            if price_record.quantity < quantity_returned_to_this_record:
                return operation_result(400, "error", 
                    f"Cannot delete return invoice: {quantity_returned_to_this_record - price_record.quantity} units of "
                    f"'{warehouse_item.item_name}' from location '{invoice_item.location}' have already been sold again. "
                    f"Available in price record: {price_record.quantity}, trying to remove: {quantity_returned_to_this_record}")
            
            # Subtract the returned quantity back from the price record
            price_record.quantity -= quantity_returned_to_this_record
            remaining_to_revert -= quantity_returned_to_this_record
            
            # Only delete price records if they have no references AND are empty
            if price_record.quantity <= 0:
                # Check if this price record is referenced by any invoice_price_detail records
                referencing_details = InvoicePriceDetail.query.filter_by(
                    source_price_invoice_id=price_record.invoice_id,
                    source_price_item_id=price_record.item_id,
                    source_price_location=price_record.location  # NEW: Check location
                ).first()
                
                # Only delete if no references exist
                if not referencing_details:
                    db.session.delete(price_record)
    
    return True


def handle_purchase_return_deletion(invoice_item, warehouse_item, original_invoice_id):
    """Handle deletion of a purchase return - restore price records that were decreased (updated with location support)"""
    if not original_invoice_id:
        return True
    
    # Find the price record from the original purchase invoice (NEW: include location)
    price_record = Prices.query.filter_by(
        invoice_id=original_invoice_id,
        item_id=warehouse_item.id,
        location=invoice_item.location  # NEW: Match location
    ).first()
    
    if price_record:
        # Restore the quantity that was subtracted during the return
        price_record.quantity += invoice_item.quantity
        db.session.add(price_record)
    else:
        # If the price record was deleted, we need to recreate it
        # Get the original purchase item to get the unit price
        original_purchase_item = InvoiceItem.query.filter_by(
            invoice_id=original_invoice_id,
            item_id=warehouse_item.id,
            location=invoice_item.location  # NEW: Match location
        ).first()
        
        if original_purchase_item:
            # Recreate the price record (NEW: include location)
            new_price_record = Prices(
                invoice_id=original_invoice_id,
                item_id=warehouse_item.id,
                location=invoice_item.location,  # NEW: Include location
                quantity=invoice_item.quantity,
                unit_price=original_purchase_item.unit_price,
                created_at=datetime.now()
            )
            db.session.add(new_price_record)
    
    return True


def put_return(data, invoice, machine, mechanism, invoice_ns):
    """Update a return invoice - supports both sales and purchase returns (updated with location support)"""
    try:
        with db.session.begin_nested():
            # Get the original invoice information to determine return type
            return_sales_record = ReturnSales.query.filter_by(return_invoice_id=invoice.id).first()
            original_invoice_id = None
            original_invoice = None
            return_type = None
            
            if return_sales_record:
                original_invoice_id = return_sales_record.sales_invoice_id
                original_invoice = Invoice.query.get(original_invoice_id)
                
                if original_invoice:
                    if original_invoice.type == 'صرف':
                        return_type = 'sales'
                    elif original_invoice.type == 'اضافه':
                        return_type = 'purchase'

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

                # Update inventory based on return type
                # For sales returns: add the difference
                # For purchase returns: subtract the difference (remove from inventory)
                if return_type == 'sales':
                    item_location.quantity += quantity_diff
                    # Check for negative quantity after adjustment
                    if item_location.quantity < 0:
                        db.session.rollback()
                        return operation_result(400, "error", 
                            f"Cannot update return invoice: Not enough quantity for item " +
                            f"'{item_data['item_name']}' in location '{location}'. " +
                            f"Some items may have already been moved or sold.")
                elif return_type == 'purchase':
                    # For purchase returns, we're removing items from inventory
                    if quantity_diff > 0:  # Increasing return quantity
                        # Need to check if we have enough to remove
                        if item_location.quantity < quantity_diff:
                            db.session.rollback()
                            return operation_result(400, "error", 
                                f"Cannot update return invoice: Not enough quantity for item " +
                                f"'{item_data['item_name']}' in location '{location}'. " +
                                f"Available: {item_location.quantity}, trying to remove: {quantity_diff}")
                    item_location.quantity -= quantity_diff
                    # Check for negative quantity after adjustment
                    if item_location.quantity < 0:
                        db.session.rollback()
                        return operation_result(400, "error", 
                            f"Cannot update return invoice: Not enough quantity for item " +
                            f"'{item_data['item_name']}' in location '{location}'.")
                else:
                    # No original invoice - default behavior (add)
                    item_location.quantity += quantity_diff
                    if item_location.quantity < 0:
                        db.session.rollback()
                        return operation_result(400, "error", 
                            f"Cannot update return invoice: Not enough quantity for item " +
                            f"'{item_data['item_name']}' in location '{location}'.")

                # Handle price adjustments based on return type
                if return_type == 'sales' and original_invoice_id:
                    result = handle_sales_return_update(
                        key, original_items, warehouse_item, item_data, 
                        new_quantity, original_invoice_id, location  # NEW: Pass location
                    )
                    if result != True:
                        db.session.rollback()
                        return result
                        
                elif return_type == 'purchase' and original_invoice_id:
                    result = handle_purchase_return_update(
                        key, original_items, warehouse_item, item_data,
                        new_quantity, original_invoice_id, location  # NEW: Pass location
                    )
                    if result != True:
                        db.session.rollback()
                        return result

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
                
                # Update price records created by this return invoice (NEW: with location support)
                price_record = Prices.query.filter_by(
                    invoice_id=invoice.id,
                    item_id=warehouse_item.id,
                    location=location  # NEW: Match location
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
                            return operation_result(400, "error", 
                                f"Cannot update return invoice: {consumed} units of " +
                                f"'{item_data['item_name']}' in location '{location}' have already been sold again. " +
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
                    # Create a new price record if one doesn't exist and price is provided (NEW: with location)
                    new_price = Prices(
                        invoice_id=invoice.id,
                        item_id=warehouse_item.id,
                        location=location,  # NEW: Include location
                        quantity=new_quantity,
                        unit_price=new_unit_price,
                        created_at=datetime.now()
                    )
                    db.session.add(new_price)

            # Handle removed items
            for key, item in original_items.items():
                if key not in updated_items:
                    item_id, location = key
                    
                    # Handle price restoration based on return type
                    if return_type == 'sales' and original_invoice_id:
                        result = handle_sales_return_item_removal(
                            item, item_id, original_invoice_id, location  # NEW: Pass location
                        )
                        if result != True:
                            db.session.rollback()
                            return result
                            
                    elif return_type == 'purchase' and original_invoice_id:
                        result = handle_purchase_return_item_removal(
                            item, item_id, original_invoice_id, location  # NEW: Pass location
                        )
                        if result != True:
                            db.session.rollback()
                            return result
                    
                    item_location = ItemLocations.query.filter_by(
                        item_id=item_id,
                        location=location
                    ).first()
                    
                    if item_location:
                        # Handle inventory restoration based on return type
                        if return_type == 'sales':
                            # For sales returns, we subtract when removing items (remove what was added back)
                            item_location.quantity -= item.quantity
                            # Check for negative quantity
                            if item_location.quantity < 0:
                                db.session.rollback()
                                return operation_result(400, "error", 
                                    f"Cannot remove item: Not enough quantity for " +
                                    f"'{item.warehouse.item_name}' in location '{location}'. " +
                                    f"Some items may have already been moved or sold.")
                        elif return_type == 'purchase':
                            # For purchase returns, we add when removing items (restore what was removed)
                            item_location.quantity += item.quantity
                        else:
                            # Default behavior
                            item_location.quantity -= item.quantity
                            if item_location.quantity < 0:
                                db.session.rollback()
                                return operation_result(400, "error", 
                                    f"Cannot remove item: Not enough quantity for " +
                                    f"'{item.warehouse.item_name}' in location '{location}'.")
                    
                    # Delete price records created by this return (NEW: with location support)
                    price_record = Prices.query.filter_by(
                        invoice_id=invoice.id,
                        item_id=item_id,
                        location=location  # NEW: Match location
                    ).first()
                    
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


def handle_sales_return_update(key, original_items, warehouse_item, item_data, new_quantity, original_invoice_id):
    """Handle price adjustments when updating a sales return"""
    # Implementation would be similar to the original logic but adjusted for updates
    # This is a placeholder - you'd implement the specific logic based on your needs
    return True


def handle_purchase_return_update(key, original_items, warehouse_item, item_data, new_quantity, original_invoice_id, location):
    """Handle price adjustments when updating a purchase return (updated with location support)"""
    if key in original_items:
        old_quantity = original_items[key].quantity
        quantity_diff = new_quantity - old_quantity
        
        # Find the price record from the original purchase (NEW: include location)
        price_record = Prices.query.filter_by(
            invoice_id=original_invoice_id,
            item_id=warehouse_item.id,
            location=location  # NEW: Match location
        ).first()
        
        if price_record and quantity_diff != 0:
            # Adjust the original purchase price record
            # If increasing return quantity, reduce more from original
            # If decreasing return quantity, restore some to original
            price_record.quantity -= quantity_diff
            
            if price_record.quantity < 0:
                return operation_result(400, "error", 
                    f"Cannot update return: would result in negative inventory for original purchase of '{item_data['item_name']}' in location '{location}'")
            
            db.session.add(price_record)
    
    return True


def handle_sales_return_item_removal(item, item_id, original_invoice_id):
    """Handle price restoration when removing an item from a sales return"""
    # Restore the price records that were increased by this return
    # Similar to the deletion logic but for a single item
    return True


def handle_purchase_return_item_removal(item, item_id, original_invoice_id, location):
    """Handle price restoration when removing an item from a purchase return (updated with location support)"""
    # Restore the quantity to the original purchase price record (NEW: include location)
    price_record = Prices.query.filter_by(
        invoice_id=original_invoice_id,
        item_id=item_id,
        location=location  # NEW: Match location
    ).first()
    
    if price_record:
        price_record.quantity += item.quantity
        db.session.add(price_record)
    else:
        # If the price record was deleted, we need to recreate it
        # Get the original purchase item to get the unit price
        original_purchase_item = InvoiceItem.query.filter_by(
            invoice_id=original_invoice_id,
            item_id=item_id,
            location=location  # NEW: Match location
        ).first()
        
        if original_purchase_item:
            # Recreate the price record (NEW: include location)
            new_price_record = Prices(
                invoice_id=original_invoice_id,
                item_id=item_id,
                location=location,  # NEW: Include location
                quantity=item.quantity,
                unit_price=original_purchase_item.unit_price,
                created_at=datetime.now()
            )
            db.session.add(new_price_record)
    
    return True