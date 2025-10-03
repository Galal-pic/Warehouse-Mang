from datetime import datetime

from sqlalchemy import func
from ..models import Invoice, Warehouse, ItemLocations, InvoiceItem, Prices, InvoicePriceDetail, Supplier, RentedItems, RentalWarehouseLocations
from .. import db
from sqlalchemy.exc import SQLAlchemyError
from ..utils import operation_result


def Purchase_Operations(data, machine, mechanism, supplier, employee, machine_ns, warehouse_ns, invoice_ns, mechanism_ns, item_location_n, supplier_ns):
    """
    Create a purchase invoice (اضافه type).
    Purchase operations add inventory and create price records for FIFO consumption.
    Now supports individual supplier names per item and location-based pricing.
    """
    try:
        # Ensure default supplier exists (id=0 for items without supplier)
        default_supplier = Supplier.query.filter_by(id=0).first()
        if not default_supplier:
            default_supplier = Supplier(
                id=0,
                name="No Supplier",
                description="Default supplier for items without specified supplier"
            )
            db.session.add(default_supplier)
            db.session.flush()
        # Create new invoice (no longer uses invoice-level supplier)
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
            supplier_id=None,
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
        
        for item_data in data["items"]:
            # Look up the warehouse item by name
            warehouse_item = Warehouse.query.filter_by(item_name=item_data["item_name"]).first()
            if not warehouse_item:
                db.session.rollback()
                return operation_result(404, "error", f"Item '{item_data['item_name']}' not found in warehouse")
            
            # Handle supplier for this specific item
            item_supplier_name = item_data.get("supplier_name", "").strip()
            item_supplier_id = 0  # Default supplier_id for items without supplier
            
            if item_supplier_name:
                item_supplier = Supplier.query.filter_by(name=item_supplier_name).first()
                if not item_supplier:
                    item_supplier = Supplier(
                        name=item_supplier_name,
                        description=f"Auto-created supplier for item {item_data['item_name']}"
                    )
                    db.session.add(item_supplier)
                    db.session.flush()
                
                item_supplier_id = item_supplier.id
            
            # Verify the location exists
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
            
            # Check for duplicate items IN THE SAME LOCATION WITH SAME SUPPLIER
            location_key = (warehouse_item.id, item_data['location'], item_supplier_id)
            if location_key in item_ids:
                db.session.rollback()
                return operation_result(400, "error", f"Item '{item_data['item_name']}' with supplier '{item_supplier_name}' already added to location '{item_data['location']}' in this invoice")
            
            item_ids.append(location_key)
            
            # Get quantity and price data
            quantity = item_data["quantity"]
            unit_price = item_data["unit_price"]
            total_price = item_data.get('total_price', quantity * unit_price)
            
            # Update the quantity in the warehouse (increase for purchase)
            item_location.quantity += quantity
            
            # Handle rental warehouse restocking if items were borrowed
            restock_rental_warehouse(warehouse_item.id, quantity)
            
            # Create the invoice item (one per location)
            invoice_item = InvoiceItem(
                invoice_id=new_invoice.id,
                item_id=warehouse_item.id,
                quantity=quantity,
                location=item_data["location"],
                unit_price=unit_price,
                total_price=total_price,
                description=item_data.get("description", ""),
                supplier_id=item_supplier_id,
                supplier_name=item_supplier_name if item_supplier_name else None
            )
            db.session.add(invoice_item)
            
            # FIXED: Create separate price record for each item-location combination
            # Use a unique identifier that includes location information
            price_record_id = f"{new_invoice.id}_{warehouse_item.id}_{item_data['location']}"
            
            # Create a price record for FIFO inventory valuation per location
            price = Prices(
                invoice_id=new_invoice.id,
                item_id=warehouse_item.id,
                quantity=quantity,
                unit_price=unit_price,
                created_at=datetime.now(),
                # Add location identifier to distinguish price records
                location=item_data['location'],  # This field needs to be added to Prices model
                supplier_id=item_supplier_id  # Include supplier_id for the new primary key
            )
            db.session.add(price)
            
            total_invoice_amount += total_price
        
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
    FIXED: Enhanced purchase update that properly handles location-based pricing.
    Each item-location combination maintains its own price record.
    """
    try:
        with db.session.begin_nested():
            # Track all affected sales invoices for recalculation
            affected_sales_invoices = set()
            
            # Get original items for comparison (now includes supplier_id in key)
            original_items = {(item.item_id, item.location, item.supplier_id): item for item in invoice.items}
            updated_items = {}
            total_invoice_amount = 0

            # Process updates and new items
            for item_data in data["items"]:
                warehouse_item = Warehouse.query.filter_by(item_name=item_data["item_name"]).first()
                if not warehouse_item:
                    return operation_result(404, "error", f"Item '{item_data['item_name']}' not found in warehouse")
                    
                location = item_data["location"]
                
                # Handle supplier for this specific item
                item_supplier_id = 0  # Default supplier_id for items without supplier
                item_supplier_name = item_data.get("supplier_name", "").strip()
                
                if item_supplier_name:
                    item_supplier = Supplier.query.filter_by(name=item_supplier_name).first()
                    if not item_supplier:
                        item_supplier = Supplier(
                            name=item_supplier_name,
                            description=f"Auto-created supplier for item {item_data['item_name']}"
                        )
                        db.session.add(item_supplier)
                        db.session.flush()
                    item_supplier_id = item_supplier.id
                
                key = (warehouse_item.id, location, item_supplier_id)
                
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
                    item.supplier_id = item_supplier_id
                    item.supplier_name = item_supplier_name if item_supplier_name else None
                    
                    price_changed = old_unit_price != new_unit_price
                else:
                    item = InvoiceItem(
                        invoice_id=invoice.id,
                        item_id=warehouse_item.id,
                        quantity=new_quantity,
                        location=location,
                        unit_price=new_unit_price,
                        total_price=new_total_price,
                        description=item_data.get("description", ""),
                        supplier_id=item_supplier_id,
                        supplier_name=item_supplier_name if item_supplier_name else None
                    )
                    db.session.add(item)
                    price_changed = True

                updated_items[key] = item
                total_invoice_amount += new_total_price
                
                # FIXED: Handle price record updates per location
                # Find the specific price record for this item-location combination
                price_record = Prices.query.filter_by(
                    invoice_id=invoice.id,
                    item_id=warehouse_item.id,
                    location=location  # This makes it location-specific
                ).first()
                
                if price_record:
                    original_price_quantity = original_items[key].quantity if key in original_items else 0
                    old_unit_price = price_record.unit_price
                    
                    # Get all price details that reference this specific price record (item + location)
                    price_details = InvoicePriceDetail.query.filter_by(
                        source_price_invoice_id=invoice.id,
                        source_price_item_id=warehouse_item.id,
                        source_price_location=location  # Add location filter
                    ).all()
                    
                    consumed_quantity = sum(detail.quantity for detail in price_details)
                    
                    if consumed_quantity > 0:
                        if new_quantity < consumed_quantity:
                            db.session.rollback()
                            return operation_result(400, "error", f"Cannot update purchase invoice: {consumed_quantity} units of '{item_data['item_name']}' in location '{location}' have already been sold. Cannot reduce quantity below {consumed_quantity}.")
                        
                        price_record.quantity = new_quantity - consumed_quantity
                    else:
                        price_record.quantity = new_quantity
                    
                    # Update unit price and track affected sales invoices
                    if old_unit_price != new_unit_price:
                        price_record.unit_price = new_unit_price
                        
                        # Update all price details that use this specific price record
                        for detail in price_details:
                            detail.unit_price = new_unit_price
                            detail.subtotal = detail.quantity * new_unit_price
                            
                            # Track the sales invoice for recalculation
                            affected_sales_invoices.add(detail.invoice_id)
                else:
                    # Create new price record for this specific location
                    price_record = Prices(
                        invoice_id=invoice.id,
                        item_id=warehouse_item.id,
                        quantity=new_quantity,
                        unit_price=new_unit_price,
                        location=location,  # Include location
                        supplier_id=supplier_id,  # Include supplier_id for the new primary key
                        created_at=datetime.now()
                    )
                    db.session.add(price_record)

            # Handle removed items
            for key, item in original_items.items():
                if key not in updated_items:
                    item_id, location, supplier_id = key
                    
                    # Check for consumption before allowing removal (location-specific)
                    price_details = InvoicePriceDetail.query.filter_by(
                        source_price_invoice_id=invoice.id,
                        source_price_item_id=item_id,
                        source_price_location=location  # Add location filter
                    ).all()
                    
                    consumed_quantity = sum(detail.quantity for detail in price_details) if price_details else 0
                    
                    if consumed_quantity > 0:
                        db.session.rollback()
                        return operation_result(400, "error", f"Cannot remove item: {consumed_quantity} units of '{item.warehouse.item_name}' in location '{location}' have already been sold using FIFO pricing.")
                    
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
                    
                    # Delete the specific price record for this location
                    price_record = Prices.query.filter_by(
                        invoice_id=invoice.id,
                        item_id=item_id,
                        location=location  # Location-specific deletion
                    ).first()
                    
                    if price_record:
                        db.session.delete(price_record)
                    
                    db.session.delete(item)

            # Recalculate all affected sales invoices
            for sales_invoice_id in affected_sales_invoices:
                sales_invoice = Invoice.query.get(sales_invoice_id)
                if sales_invoice:
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
            invoice.supplier_id = None
            
            if machine:
                invoice.machine_id = machine.id
            if mechanism:
                invoice.mechanism_id = mechanism.id
            
            db.session.commit()
            
            # Return information about affected sales invoices
            message = "Purchase invoice updated successfully"
            if affected_sales_invoices:
                message += f". {len(affected_sales_invoices)} sales invoice(s) were automatically recalculated due to price changes."
        
        return {"message": message}, 200

    except SQLAlchemyError as e:
        db.session.rollback()
        return operation_result(500, "error", f"Database error: {str(e)}")
    except Exception as e:
        db.session.rollback()
        return operation_result(500, "error", f"Unexpected error: {str(e)}")


def recalculate_sales_invoice_total(sales_invoice):
    """
    SIMPLE AND DIRECT: No complex JOINs, just map FIFO details to locations
    """
    try:
        
        # Step 1: Get all FIFO price details for this invoice
        price_details = InvoicePriceDetail.query.filter_by(
            invoice_id=sales_invoice.id
        ).all()
        
        if not price_details:
            return
        
        # Step 2: Group FIFO details by source location
        location_totals = {}
        
        for detail in price_details:
            location = detail.source_price_location
            
            if location not in location_totals:
                location_totals[location] = {
                    'total_subtotal': 0,
                    'total_quantity': 0
                }
            
            location_totals[location]['total_subtotal'] += detail.subtotal
            location_totals[location]['total_quantity'] += detail.quantity
        
        
        # Step 3: Update each invoice item with its location's FIFO total
        total_invoice_amount = 0
        
        for invoice_item in sales_invoice.items:
            location = invoice_item.location
            
            if location in location_totals:
                # Use the exact FIFO total for this location
                fifo_data = location_totals[location]
                fifo_subtotal = fifo_data['total_subtotal']
                fifo_quantity = fifo_data['total_quantity']
                
                # Calculate unit price from FIFO
                fifo_unit_price = round(fifo_subtotal / fifo_quantity, 3) if fifo_quantity > 0 else 0
                
                # Update invoice item
                invoice_item.unit_price = fifo_unit_price
                invoice_item.total_price = round(fifo_subtotal, 3)
                
                total_invoice_amount += fifo_subtotal
                
            else:
                total_invoice_amount += invoice_item.total_price
        
        # Step 4: Update invoice totals
        sales_invoice.total_amount = round(total_invoice_amount, 3)
        sales_invoice.residual = round(sales_invoice.total_amount - sales_invoice.paid, 3)
        
        db.session.add(sales_invoice)
        
    except Exception as e:
        # Log error but don't fail the operation
        print(f"Error recalculating sales invoice total for invoice {sales_invoice.id}: {str(e)}")
        # Continue without failing the parent operation


def restock_rental_warehouse(item_id, purchased_quantity):
    """
    When new items are purchased, return borrowed items back to rental warehouse
    This ensures rental warehouse gets restocked when main warehouse is replenished
    Priority: First replenish main warehouse, then rental warehouse
    """
    try:
        # Find rented items that were borrowed for sales (borrowed_for_sale status)
        borrowed_for_sale_items = RentedItems.query.filter_by(
            item_id=item_id,
            status='borrowed_for_sale'
        ).all()
        
        # Also find items borrowed to main warehouse
        borrowed_to_main_items = RentedItems.query.filter_by(
            item_id=item_id,
            status='borrowed_to_main'
        ).all()
        
        all_borrowed_items = borrowed_for_sale_items + borrowed_to_main_items
        
        if not all_borrowed_items:
            return  # No borrowed items to restock
        
        # Calculate total borrowed quantity
        total_borrowed_for_sale = sum(item.quantity for item in borrowed_for_sale_items)
        total_borrowed_to_main = sum(item.borrowed_to_main_quantity for item in borrowed_to_main_items)
        total_borrowed = total_borrowed_for_sale + total_borrowed_to_main
        
        # Determine how much we can return (limited by purchased quantity)
        quantity_to_return = min(purchased_quantity, total_borrowed)
        
        if quantity_to_return <= 0:
            return
        
        # Update rental warehouse location - increase available quantity
        rental_location = RentalWarehouseLocations.query.filter_by(
            item_id=item_id,
            location='RENTAL_WAREHOUSE'
        ).first()
        
        if rental_location:
            # Increase available quantity (return to rental warehouse)
            rental_location.available_quantity += quantity_to_return
            rental_location.updated_at = datetime.now()
        
        # Process borrowed_for_sale items first (these were sold)
        remaining_to_return = quantity_to_return
        
        for rented_item in borrowed_for_sale_items:
            if remaining_to_return <= 0:
                break
                
            # Calculate how much to return from this rented item
            return_from_this_item = min(remaining_to_return, rented_item.quantity)
            
            # Update the rented item - mark as returned to rental
            rented_item.status = 'reserved'
            rented_item.notes = f"{rented_item.notes or ''} | Replenished to rental warehouse after purchase"
            rented_item.updated_at = datetime.now()
            
            remaining_to_return -= return_from_this_item
        
        # Process borrowed_to_main items
        for rented_item in borrowed_to_main_items:
            if remaining_to_return <= 0:
                break
                
            # Calculate how much to return from this rented item
            return_from_this_item = min(remaining_to_return, rented_item.borrowed_to_main_quantity)
            
            # Update the rented item
            rented_item.borrowed_to_main_quantity -= return_from_this_item
            
            # If fully returned, change status back to reserved
            if rented_item.borrowed_to_main_quantity <= 0:
                rented_item.status = 'reserved'
                rented_item.borrowed_date = None
                rented_item.notes = f"{rented_item.notes or ''} | Returned to rental warehouse after purchase restock"
            
            remaining_to_return -= return_from_this_item
        
        # Decrease main warehouse quantity by the amount returned to rental
        main_location = ItemLocations.query.filter_by(item_id=item_id).first()
        if main_location and main_location.quantity >= quantity_to_return:
            main_location.quantity -= quantity_to_return
        
    except Exception as e:
        # Log error but don't fail the purchase operation
        print(f"Error restocking rental warehouse for item {item_id}: {str(e)}")
        # Continue with purchase operation even if rental restocking fails
        
        
    except Exception as e:
        raise Exception(f"Error recalculating sales invoice {sales_invoice.id}: {str(e)}")