from datetime import datetime
from ..models import Invoice, Warehouse, ItemLocations, InvoiceItem, Prices, InvoicePriceDetail
from .. import db
from sqlalchemy.exc import SQLAlchemyError
from ..utils import operation_result


def Purchase_Operations(data, machine, mechanism, supplier, employee, machine_ns, warehouse_ns, invoice_ns, mechanism_ns, item_location_n, supplier_ns):
    """
    Create a purchase invoice (اضافه type).
    Purchase operations add inventory and create price records for FIFO consumption.
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
            supplier_id=supplier.id if supplier else None,
            employee_name=data.get('employee_name'),
            employee_id=employee.id,
            machine_id=machine.id if machine else None,
            mechanism_id=mechanism.id if mechanism else None,
        )
        
        db.session.add(new_invoice)
        db.session.flush()  # Flush to get the invoice ID
        
        item_ids = []
        total_invoice_amount = 0
        
        # FIXED: Group items by item_id to handle same item in multiple locations
        item_price_aggregation = {}  # Track total quantity per item for price records
        
        for item_data in data["items"]:
            # Look up the warehouse item by name
            warehouse_item = Warehouse.query.filter_by(item_name=item_data["item_name"]).first()
            if not warehouse_item:
                db.session.rollback()
                return operation_result(404, "error", f"Item '{item_data['item_name']}' not found in warehouse")
            
            # Verify the location exists
            item_location = ItemLocations.query.filter_by(
                item_id=warehouse_item.id,
                location=item_data['location']
            ).first()
            
            if not item_location:
                # For purchases, we might want to create a new location if it doesn't exist
                item_location = ItemLocations(
                    item_id=warehouse_item.id,
                    location=item_data['location'],
                    quantity=0
                )
                db.session.add(item_location)
            
            # Check for duplicate items IN THE SAME LOCATION (this should still be prevented)
            location_key = (warehouse_item.id, item_data['location'])
            if location_key in item_ids:
                db.session.rollback()
                return operation_result(400, "error", f"Item '{item_data['item_name']}' already added to location '{item_data['location']}' in this invoice")
            
            item_ids.append(location_key)
            
            # Get quantity and price data
            quantity = item_data["quantity"]
            unit_price = item_data["unit_price"]
            total_price = item_data.get('total_price', quantity * unit_price)
            
            # Update the quantity in the warehouse (increase for purchase)
            item_location.quantity += quantity
            
            # Create the invoice item (one per location)
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
            
            # FIXED: Aggregate quantities and prices for the same item across different locations
            item_key = warehouse_item.id
            if item_key not in item_price_aggregation:
                item_price_aggregation[item_key] = {
                    'total_quantity': 0,
                    'weighted_unit_price': 0,
                    'total_value': 0
                }
            
            # Accumulate quantities and calculate weighted average price
            item_price_aggregation[item_key]['total_quantity'] += quantity
            item_price_aggregation[item_key]['total_value'] += total_price
            
            total_invoice_amount += total_price
        
        # FIXED: Create ONE price record per unique item (not per location)
        for item_id, price_data in item_price_aggregation.items():
            # Calculate weighted average unit price
            if price_data['total_quantity'] > 0:
                weighted_unit_price = price_data['total_value'] / price_data['total_quantity']
            else:
                weighted_unit_price = 0
            
            # Create a single price record for FIFO inventory valuation
            price = Prices(
                invoice_id=new_invoice.id,
                item_id=item_id,
                quantity=price_data['total_quantity'],  # Total quantity across all locations
                unit_price=weighted_unit_price,  # Weighted average price
                created_at=datetime.now()  # Explicitly set creation time for FIFO ordering
            )
            db.session.add(price)
        
        # Update invoice totals
        new_invoice.total_amount = total_invoice_amount
        new_invoice.residual = total_invoice_amount - new_invoice.paid
        
        db.session.commit()
        return operation_result(201, "success", "Purchase invoice created successfully", invoice=new_invoice)        
    except SQLAlchemyError as e:
        db.session.rollback()
        return operation_result(500, "error", f"Error processing purchase: {str(e)}")
    except Exception as e:
        db.session.rollback()
        return operation_result(500, "error", f"Error processing purchase: {str(e)}")

def delete_purchase(invoice, invoice_ns):
    # Check if it's a purchase invoice
    if invoice.type != 'اضافه':
        return operation_result(400, "error", "Can only delete purchase invoices with this method")

    try:
        # First check if any items have been consumed in sales
        for invoice_item in invoice.items:
            # Get the price record for this item
            price_record = Prices.query.filter_by(
                invoice_id=invoice.id,
                item_id=invoice_item.item_id
            ).first()
            
            if price_record:
                # If original quantity doesn't match current quantity, some has been consumed
                if price_record.quantity < invoice_item.quantity:
                    db.session.rollback()
                    return operation_result(400, "error",  f"Cannot delete purchase invoice: Item '{invoice_item.warehouse.item_name}' " +
                        f"has already been partially sold using FIFO pricing. " +
                        f"Original: {invoice_item.quantity}, Remaining: {price_record.quantity}"
                        )
        
        # Restore quantities for each item (decrease for purchase deletion)
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

            # Restore the quantity (subtract for purchase deletion)
            item_location.quantity -= invoice_item.quantity
            
            # Check for negative quantity
            if item_location.quantity < 0:
                db.session.rollback()
                return operation_result(400, "error",  f"Cannot delete purchase invoice: Not enough quantity for item " +
                    f"'{invoice_item.warehouse.item_name}' in location '{invoice_item.location}'. " +
                    f"Some items may have already been moved or sold."
                    )

        # Delete price records first
        Prices.query.filter_by(invoice_id=invoice.id).delete()
        
        # Delete invoice items and the invoice
        InvoiceItem.query.filter_by(invoice_id=invoice.id).delete()
        db.session.delete(invoice)
        
        db.session.commit()
        return {"message": "Purchase invoice deleted and stock adjusted successfully"}, 200

    except SQLAlchemyError as e:
        db.session.rollback()
        return operation_result(500, "error", f"Database error: {str(e)}")
    except Exception as e:
        db.session.rollback()
        return operation_result(500, "error", f"Error deleting purchase invoice: {str(e)}")

def put_purchase(data, invoice, machine, mechanism, invoice_ns):
    """
    Update an existing purchase invoice with new data and adjust inventory accordingly.
    
    Args:
        data: New invoice data including items
        invoice: The invoice to update
        machine, mechanism: Related entities
        invoice_ns: Namespace for error handling
        
    Returns:
        tuple: (message, status code)
    """
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
                    return operation_result(404, "error", f"Item '{item_data['item_name']}' not found in warehouse")
                    
                location = item_data["location"]
                key = (warehouse_item.id, location)
                
                # Get or create the item location
                item_location = ItemLocations.query.filter_by(
                    item_id=warehouse_item.id,
                    location=location
                ).first()

                if not item_location:
                    # For purchases, create the location if it doesn't exist
                    item_location = ItemLocations(
                        item_id=warehouse_item.id,
                        location=location,
                        quantity=0
                    )
                    db.session.add(item_location)

                # Get the new item data
                new_quantity = item_data["quantity"]
                new_unit_price = item_data["unit_price"]
                new_total_price = item_data.get("total_price", new_quantity * new_unit_price)
                
                # Check if this is an update to an existing item or a new item
                if key in original_items:
                    old_quantity = original_items[key].quantity
                    quantity_diff = new_quantity - old_quantity
                else:
                    quantity_diff = new_quantity

                # Update inventory (for purchase, we add the difference)
                item_location.quantity += quantity_diff
                
                # Check for negative quantity after adjustment
                if item_location.quantity < 0:
                    db.session.rollback()
                    return operation_result(400, "error",  f"Cannot update purchase invoice: Not enough quantity for item " +
                        f"'{item_data['item_name']}' in location '{location}'. " +
                        f"Some items may have already been moved or sold."
                        )

                # Update or create invoice item
                if key in original_items:
                    item = original_items[key]
                    item.quantity = new_quantity
                    item.unit_price = new_unit_price
                    item.total_price = new_total_price
                    item.description = item_data.get("description", item.description)
                else:
                    # Create new invoice item
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
                
                # Check if we can update the price record
                price_record = Prices.query.filter_by(
                    invoice_id=invoice.id,
                    item_id=warehouse_item.id
                ).first()
                
                if price_record:
                    # Store original values for proper calculations
                    original_price_quantity = original_items[key].quantity if key in original_items else 0
                    
                    # Get price details related to THIS specific item - FIXED VERSION
                    price_details = InvoicePriceDetail.query.filter_by(
                        source_price_invoice_id=invoice.id,  # Changed from source_price_id
                        source_price_item_id=warehouse_item.id  # Changed from item_id to source_price_item_id
                    ).all()
                    
                    # Calculate consumed quantity from price details
                    consumed_quantity = sum(detail.quantity for detail in price_details)
                    
                    # FIX: Calculate available quantity correctly
                    if consumed_quantity > 0:
                        # Check if we're reducing quantity below what's already consumed
                        if new_quantity < consumed_quantity:
                            db.session.rollback()
                            return operation_result(400, "error", f"Cannot update purchase invoice: {consumed_quantity} units of " +
                                f"'{item_data['item_name']}' have already been sold using FIFO pricing. " +
                                f"Cannot reduce quantity below {consumed_quantity}."
                                )
                        
                        # FIX: Set available quantity correctly - the new total minus what's been consumed
                        price_record.quantity = new_quantity - consumed_quantity
                    else:
                        # No consumption has occurred, can fully update
                        price_record.quantity = new_quantity
                    
                    # Get the old unit price for comparison
                    old_unit_price = price_record.unit_price
                    
                    # Always update the unit price in the price record
                    price_record.unit_price = new_unit_price
                    
                    # Update price details and related invoice items if unit price changed
                    if old_unit_price != new_unit_price and price_details:
                        # Track affected sales invoices to avoid double processing
                        processed_invoices = set()
                        
                        # Loop through all price details that use this specific item's price
                        for detail in price_details:
                            # Update the detail unit price and subtotal
                            detail.unit_price = new_unit_price
                            detail.subtotal = detail.quantity * new_unit_price
                            
                            # Get the sales invoice this detail belongs to
                            sales_invoice_id = detail.invoice_id
                            
                            # Skip if we've already processed this invoice
                            if sales_invoice_id in processed_invoices:
                                continue
                                
                            sales_invoice = Invoice.query.get(sales_invoice_id)
                            if sales_invoice:
                                # Mark this invoice as processed
                                processed_invoices.add(sales_invoice_id)
                                
                                # Find items in this invoice that match our current item
                                sales_invoice_items = InvoiceItem.query.filter_by(
                                    invoice_id=sales_invoice_id,
                                    item_id=warehouse_item.id
                                ).all()
                                
                                # Update unit price and total price for each matching item
                                for sales_item in sales_invoice_items:
                                    sales_item.unit_price = new_unit_price
                                    sales_item.total_price = sales_item.quantity * new_unit_price
                                
                                # Recalculate the total invoice amount
                                all_invoice_items = InvoiceItem.query.filter_by(invoice_id=sales_invoice_id).all()
                                sales_invoice.total_amount = sum(item.total_price for item in all_invoice_items)
                                sales_invoice.residual = sales_invoice.total_amount - sales_invoice.paid
                else:
                    # Create a new price record
                    price_record = Prices(
                        invoice_id=invoice.id,
                        item_id=warehouse_item.id,
                        quantity=new_quantity,
                        unit_price=new_unit_price,
                        created_at=datetime.now()
                    )
                    db.session.add(price_record)

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
                    
                    # Get price details to check consumption - FIXED VERSION
                    price_details = InvoicePriceDetail.query.filter_by(
                        source_price_invoice_id=invoice.id,  # Changed from source_price_id
                        source_price_item_id=item_id  # Changed from item_id to source_price_item_id
                    ).all()
                    
                    consumed_quantity = sum(detail.quantity for detail in price_details) if price_details else 0
                    
                    # Check if items have been consumed
                    if consumed_quantity > 0:
                        db.session.rollback()
                        return operation_result(400, "error", f"Cannot remove item: {consumed_quantity} units of " +
                            f"'{item.warehouse.item_name}' have already been sold using FIFO pricing."
                            )
                    
                    if item_location:
                        # For purchases, we subtract when removing items
                        item_location.quantity -= item.quantity
                        
                        # Check for negative quantity
                        if item_location.quantity < 0:
                            db.session.rollback()
                            return operation_result(400, "error", f"Cannot remove item: Not enough quantity for " +
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
        
        return {"message": "Purchase invoice updated successfully"}, 200

    except SQLAlchemyError as e:
        db.session.rollback()
        return operation_result(500, "error", f"Database error: {str(e)}")
    except Exception as e:
        db.session.rollback()
        return operation_result(500, "error", f"Unexpected error: {str(e)}")