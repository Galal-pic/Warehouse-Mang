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
            payment_method=data.get("payment_method", None),
            custody_person=data.get("custody_person", None),
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
    Enhanced purchase update that properly handles price changes and 
    recalculates affected sales invoices with detailed tracking.
    """
    try:
        with db.session.begin_nested():
            # Track all affected sales invoices for recalculation
            affected_sales_invoices = set()
            
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

                new_quantity = item_data["quantity"]
                new_unit_price = item_data["unit_price"]
                new_total_price = item_data.get("total_price", new_quantity * new_unit_price)
                
                if key in original_items:
                    old_quantity = original_items[key].quantity
                    quantity_diff = new_quantity - old_quantity
                else:
                    quantity_diff = new_quantity

                item_location.quantity += quantity_diff
                
                if item_location.quantity < 0:
                    db.session.rollback()
                    return operation_result(400, "error", f"Cannot update purchase invoice: Not enough quantity for item '{item_data['item_name']}' in location '{location}'.")

                # Update or create invoice item
                if key in original_items:
                    item = original_items[key]
                    old_unit_price = item.unit_price
                    item.quantity = new_quantity
                    item.unit_price = new_unit_price
                    item.total_price = new_total_price
                    item.description = item_data.get("description", item.description)
                    
                    # Track if price changed
                    price_changed = old_unit_price != new_unit_price
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
                    price_changed = True

                updated_items[key] = item
                total_invoice_amount += new_total_price
                
                # Handle price record updates
                price_record = Prices.query.filter_by(
                    invoice_id=invoice.id,
                    item_id=warehouse_item.id
                ).first()
                
                if price_record:
                    original_price_quantity = original_items[key].quantity if key in original_items else 0
                    old_unit_price = price_record.unit_price
                    
                    # Get all price details that reference this price record
                    price_details = InvoicePriceDetail.query.filter_by(
                        source_price_invoice_id=invoice.id,
                        source_price_item_id=warehouse_item.id
                    ).all()
                    
                    consumed_quantity = sum(detail.quantity for detail in price_details)
                    
                    if consumed_quantity > 0:
                        if new_quantity < consumed_quantity:
                            db.session.rollback()
                            return operation_result(400, "error", f"Cannot update purchase invoice: {consumed_quantity} units of '{item_data['item_name']}' have already been sold. Cannot reduce quantity below {consumed_quantity}.")
                        
                        price_record.quantity = new_quantity - consumed_quantity
                    else:
                        price_record.quantity = new_quantity
                    
                    # Update unit price and track affected sales invoices
                    if old_unit_price != new_unit_price:
                        price_record.unit_price = new_unit_price
                        
                        # Update all price details that use this price record
                        for detail in price_details:
                            detail.unit_price = new_unit_price
                            detail.subtotal = detail.quantity * new_unit_price
                            
                            # Track the sales invoice for recalculation
                            affected_sales_invoices.add(detail.invoice_id)
                else:
                    # Create new price record
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
                    
                    # Check for consumption before allowing removal
                    price_details = InvoicePriceDetail.query.filter_by(
                        source_price_invoice_id=invoice.id,
                        source_price_item_id=item_id
                    ).all()
                    
                    consumed_quantity = sum(detail.quantity for detail in price_details) if price_details else 0
                    
                    if consumed_quantity > 0:
                        db.session.rollback()
                        return operation_result(400, "error", f"Cannot remove item: {consumed_quantity} units of '{item.warehouse.item_name}' have already been sold using FIFO pricing.")
                    
                    # Restore inventory
                    item_location = ItemLocations.query.filter_by(
                        item_id=item_id,
                        location=location
                    ).first()
                    
                    if item_location:
                        item_location.quantity -= item.quantity
                        
                        if item_location.quantity < 0:
                            db.session.rollback()
                            return operation_result(400, "error", f"Cannot remove item: Not enough quantity for '{item.warehouse.item_name}' in location '{location}'.")
                    
                    # Delete price record
                    price_record = Prices.query.filter_by(
                        invoice_id=invoice.id,
                        item_id=item_id
                    ).first()
                    
                    if price_record:
                        db.session.delete(price_record)
                    
                    db.session.delete(item)

            # Now recalculate all affected sales invoices
            for sales_invoice_id in affected_sales_invoices:
                sales_invoice = Invoice.query.get(sales_invoice_id)
                if sales_invoice:
                    # Recalculate total for this sales invoice
                    recalculate_sales_invoice_total(sales_invoice)

            # Update main invoice fields
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
            invoice.payment_method = data.get("payment_method", invoice.payment_method)
            invoice.custody_person = data.get("custody_person", invoice.custody_person)
            
            if machine:
                invoice.machine_id = machine.id
            if mechanism:
                invoice.mechanism_id = mechanism.id
            if "supplier_id" in data and data["supplier_id"] is not None:
                invoice.supplier_id = data["supplier_id"]
            
            db.session.commit()
            
            # Return information about affected sales invoices
            message = "Purchase invoice updated successfully"
            if affected_sales_invoices:
                message += f". {len(affected_sales_invoices)} sales invoice(s) were automatically recalculated due to price changes."
        
        return {"message": "Purchase invoice updated successfully"}, 200

    except SQLAlchemyError as e:
        db.session.rollback()
        return operation_result(500, "error", f"Database error: {str(e)}")
    except Exception as e:
        db.session.rollback()
        return operation_result(500, "error", f"Unexpected error: {str(e)}")


def recalculate_sales_invoice_total(sales_invoice):
    """
    Recalculate the total amount for a sales invoice based on updated price details.
    """
    try:
        total_amount = 0
        
        # Get all invoice items for this sales invoice
        for invoice_item in sales_invoice.items:
            # Recalculate item total based on updated price details
            price_details = InvoicePriceDetail.query.filter_by(
                invoice_id=sales_invoice.id,
                item_id=invoice_item.item_id
            ).all()
            
            if price_details:
                # Calculate new total from price details
                item_total = sum(detail.subtotal for detail in price_details)
                new_unit_price = item_total / invoice_item.quantity if invoice_item.quantity > 0 else 0
                
                # Update the invoice item
                invoice_item.unit_price = round(new_unit_price, 3)
                invoice_item.total_price = round(item_total, 3)
                
                total_amount += item_total
            else:
                total_amount += invoice_item.total_price
        
        # Update the sales invoice totals
        sales_invoice.total_amount = round(total_amount, 3)
        sales_invoice.residual = round(sales_invoice.total_amount - sales_invoice.paid, 3)
        
        db.session.add(sales_invoice)
        
    except Exception as e:
        raise Exception(f"Error recalculating sales invoice {sales_invoice.id}: {str(e)}")