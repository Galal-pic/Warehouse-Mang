from datetime import datetime
from ..models import Invoice, Warehouse, ItemLocations, InvoiceItem, Prices, InvoicePriceDetail, RentedItems, RentalWarehouseLocations
from .. import db
from sqlalchemy.exc import SQLAlchemyError
from ..utils import operation_result

def Rent_Operations(data, machine, mechanism, supplier, employee, machine_ns, warehouse_ns, invoice_ns, mechanism_ns, item_location_n, supplier_ns):
    """
    Create a rental invoice (حجز) that:
    1. Creates a rental invoice
    2. Decreases quantity from main warehouse
    3. Adds items to rental warehouse
    4. Tracks rental status and customer information
    """
    try:
        # Create new rental invoice
        new_invoice = Invoice(
            type="حجز",  # Rental invoice type
            client_name=data.get("client_name", data.get("customer_name", "")),
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
        
        # Customer information from the invoice data
        customer_name = data.get("client_name", data.get("customer_name", ""))
        customer_phone = data.get("customer_phone")
        customer_id_number = data.get("customer_id_number")
        expected_return_date = None
        if data.get("expected_return_date"):
            try:
                expected_return_date = datetime.fromisoformat(data["expected_return_date"].replace('Z', '+00:00'))
            except:
                expected_return_date = None
        
        for item_data in data["items"]:
            # Verify the warehouse item exists
            warehouse_item = Warehouse.query.filter_by(item_name=item_data["item_name"]).first()
            if not warehouse_item:
                db.session.rollback()
                return operation_result(404, "error", f"Item '{item_data['item_name']}' not found in warehouse")
            
            # Verify the location exists and has enough quantity in main warehouse
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
                return operation_result(400, "error", f"Item '{item_data['item_name']}' already added to rental invoice")
            
            item_ids.append((warehouse_item.id, item_data['location']))
            
            # Check if enough quantity available in main warehouse location
            requested_quantity = item_data["quantity"]
            if item_location.quantity < requested_quantity:
                db.session.rollback()
                return operation_result(400, "error", f"Not enough quantity for item '{item_data['item_name']}' in location '{item_data['location']}'. Available: {item_location.quantity}, Requested: {requested_quantity}")
            
            # Update physical inventory in main warehouse (decrease)
            item_location.quantity -= requested_quantity
            
            # Handle pricing using FIFO from the Prices table
            remaining_to_rent = requested_quantity
            fifo_total = 0
            price_breakdown = []
            
            # Get all price records for this item ordered by creation date (oldest first for FIFO)
            price_entries = Prices.query.filter_by(
                item_id=warehouse_item.id
            ).order_by(Prices.invoice_id.asc()).all()
            
            if not price_entries:
                db.session.rollback()
                return operation_result(400, "error", f"No price information found for item '{item_data['item_name']}'")
            
            # Process each price entry using FIFO
            for price_entry in price_entries:
                if remaining_to_rent <= 0:
                    break
                
                # Calculate how much we can take from this price entry
                quantity_from_this_entry = min(remaining_to_rent, price_entry.quantity)
                
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
                remaining_to_rent -= quantity_from_this_entry
                
                # Update the price entry quantity
                price_entry.quantity -= quantity_from_this_entry
            
            # Check if we've fulfilled the entire requested quantity
            if remaining_to_rent > 0:
                db.session.rollback()
                return operation_result(400, "error", f"Insufficient priced inventory for '{item_data['item_name']}'. Missing price data for {remaining_to_rent} units.")
            
            # Calculate effective unit price based on FIFO total
            fifo_total = round(fifo_total, 3)
            effective_unit_price = round(fifo_total / requested_quantity, 3) if requested_quantity > 0 else 0
            
            # Create the invoice item
            invoice_item = InvoiceItem(
                invoice_id=new_invoice.id,
                item_id=warehouse_item.id,
                quantity=requested_quantity,
                location=item_data['location'],
                unit_price=effective_unit_price,
                total_price=fifo_total,
                description=item_data.get('description', f"Rental - FIFO pricing: {len(price_breakdown)} price levels"),
                supplier_id=0  # Default supplier for rental operations
            )
            
            db.session.add(invoice_item)
            
            # Create rental item record for tracking
            rented_item = RentedItems(
                rental_invoice_id=new_invoice.id,
                item_id=warehouse_item.id,
                quantity=requested_quantity,
                unit_price=effective_unit_price,
                total_price=fifo_total,
                status='reserved',  # Initial status
                customer_name=customer_name,
                customer_phone=customer_phone,
                customer_id_number=customer_id_number,
                expected_return_date=expected_return_date,
                notes=item_data.get('notes', '')
            )
            
            db.session.add(rented_item)
            
            # Add/Update rental warehouse location
            rental_location = RentalWarehouseLocations.query.filter_by(
                item_id=warehouse_item.id,
                location='RENTAL_WAREHOUSE'
            ).first()
            
            if rental_location:
                rental_location.quantity += requested_quantity
                rental_location.reserved_quantity += requested_quantity
                rental_location.updated_at = datetime.now()
            else:
                rental_location = RentalWarehouseLocations(
                    item_id=warehouse_item.id,
                    location='RENTAL_WAREHOUSE',
                    quantity=requested_quantity,
                    reserved_quantity=requested_quantity,
                    available_quantity=0
                )
                db.session.add(rental_location)
            
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
        return operation_result(500, "error", message=f"Error processing rental: {str(e)}")


def update_rental_status(rental_invoice_id, item_id, new_status, employee_id, notes=None):
    """
    Update the status of a rented item
    Statuses: 'reserved', 'given', 'returned', 'borrowed_to_main'
    """
    try:
        rented_item = RentedItems.query.filter_by(
            rental_invoice_id=rental_invoice_id,
            item_id=item_id
        ).first()
        
        if not rented_item:
            return operation_result(404, "error", "Rented item not found")
        
        old_status = rented_item.status
        rented_item.status = new_status
        rented_item.updated_at = datetime.now()
        
        if notes:
            rented_item.notes = notes
        
        # Update timestamps based on status
        if new_status == 'given' and old_status == 'reserved':
            rented_item.given_date = datetime.now()
            
            # Update rental warehouse quantities
            rental_location = RentalWarehouseLocations.query.filter_by(
                item_id=item_id,
                location='RENTAL_WAREHOUSE'
            ).first()
            
            if rental_location:
                rental_location.reserved_quantity -= rented_item.quantity
                rental_location.updated_at = datetime.now()
        
        elif new_status == 'returned':
            rented_item.actual_return_date = datetime.now()
            
            # Return items to main warehouse from rental warehouse
            return_to_main_warehouse(item_id, rented_item.quantity, employee_id)
        
        db.session.commit()
        return operation_result(200, "success", message=f"Rental status updated to {new_status}")
        
    except SQLAlchemyError as e:
        db.session.rollback()
        return operation_result(500, "error", message=f"Database error: {str(e)}")
    except Exception as e:
        db.session.rollback()
        return operation_result(500, "error", message=f"Error updating rental status: {str(e)}")


def borrow_from_rental_to_main(item_id, quantity, location, employee_id, notes=None):
    """
    Borrow items from rental warehouse to main warehouse when main warehouse runs out
    """
    try:
        # Check rental warehouse availability
        rental_location = RentalWarehouseLocations.query.filter_by(
            item_id=item_id,
            location='RENTAL_WAREHOUSE'
        ).first()

        if not rental_location:
            return operation_result(404, "error", "Item not found in rental warehouse")

        # Calculate available quantity (total - reserved)
        # available_quantity tracks items already borrowed, so actual available = quantity - reserved
        available_for_borrowing = rental_location.quantity - rental_location.reserved_quantity

        if available_for_borrowing < quantity:
            return operation_result(400, "error", f"Not enough available quantity in rental warehouse. Available: {available_for_borrowing}, Requested: {quantity}")

        # Update rental warehouse - track borrowed items
        rental_location.available_quantity += quantity
        rental_location.updated_at = datetime.now()

        # Add to main warehouse location
        main_location = ItemLocations.query.filter_by(
            item_id=item_id,
            location=location
        ).first()

        if main_location:
            main_location.quantity += quantity
        else:
            main_location = ItemLocations(
                item_id=item_id,
                location=location,
                quantity=quantity
            )
            db.session.add(main_location)

        # Update rented items to track borrowing
        # Find reserved items and mark them as borrowed
        remaining_to_borrow = quantity
        rented_items = RentedItems.query.filter_by(
            item_id=item_id,
            status='reserved'
        ).order_by(RentedItems.created_at.asc()).all()

        for rented_item in rented_items:
            if remaining_to_borrow <= 0:
                break

            # Calculate how much we can borrow from this rental record
            available_in_record = rented_item.quantity - rented_item.borrowed_to_main_quantity
            quantity_to_borrow = min(remaining_to_borrow, available_in_record)

            if quantity_to_borrow > 0:
                rented_item.borrowed_to_main_quantity += quantity_to_borrow
                rented_item.borrowed_date = datetime.now()
                rented_item.status = 'borrowed_to_main'
                if notes:
                    rented_item.notes = f"{rented_item.notes or ''} | Borrowed to main: {notes}"
                remaining_to_borrow -= quantity_to_borrow

        db.session.commit()
        borrowed_amount = quantity - remaining_to_borrow
        return operation_result(200, "success", message=f"Successfully borrowed {borrowed_amount} items from rental to main warehouse")

    except SQLAlchemyError as e:
        db.session.rollback()
        return operation_result(500, "error", message=f"Database error: {str(e)}")
    except Exception as e:
        db.session.rollback()
        return operation_result(500, "error", message=f"Error borrowing from rental warehouse: {str(e)}")


def return_to_main_warehouse(item_id, quantity, employee_id):
    """
    Return items from rental warehouse back to main warehouse
    """
    try:
        # Update rental warehouse
        rental_location = RentalWarehouseLocations.query.filter_by(
            item_id=item_id,
            location='RENTAL_WAREHOUSE'
        ).first()
        
        if rental_location:
            rental_location.quantity -= quantity
            rental_location.updated_at = datetime.now()
        
        # Find a suitable main warehouse location (or create default)
        main_location = ItemLocations.query.filter_by(item_id=item_id).first()
        
        if main_location:
            main_location.quantity += quantity
        else:
            # Create default location if none exists
            main_location = ItemLocations(
                item_id=item_id,
                location='DEFAULT',
                quantity=quantity
            )
            db.session.add(main_location)
        
        return True
        
    except Exception as e:
        print(f"Error returning to main warehouse: {str(e)}")
        return False


def put_rental(data, invoice, machine, mechanism, invoice_ns):
    """
    Update a rental invoice
    """
    try:
        # Check if it's a rental invoice
        if invoice.type != 'حجز':
            db.session.rollback()
            return operation_result(400, "error", "Can only update rental invoices with this method")

        # Check if any items have been given to customers
        rented_items = RentedItems.query.filter_by(rental_invoice_id=invoice.id).all()
        for rented_item in rented_items:
            if rented_item.status == 'given':
                db.session.rollback()
                return operation_result(400, "error", "Cannot update rental invoice after items have been given to customer")

        with db.session.begin_nested():
            # Create a dictionary of original items for easy lookup
            original_items = {(item.item_id, item.location): item for item in invoice.items}
            updated_items = {}

            # Track the total amount for the updated invoice
            total_invoice_amount = 0

            # Customer information from the invoice data
            customer_name = data.get("client_name", data.get("customer_name", ""))
            customer_phone = data.get("customer_phone")
            customer_id_number = data.get("customer_id_number")
            expected_return_date = None
            if data.get("expected_return_date"):
                try:
                    expected_return_date = datetime.fromisoformat(data["expected_return_date"].replace('Z', '+00:00'))
                except:
                    expected_return_date = None

            # Process updates and new items
            for item_data in data["items"]:
                warehouse_item = Warehouse.query.filter_by(item_name=item_data["item_name"]).first()
                if not warehouse_item:
                    db.session.rollback()
                    return operation_result(404, "error", f"Item '{item_data['item_name']}' not found in warehouse")

                location = item_data["location"]
                key = (warehouse_item.id, location)

                item_location = ItemLocations.query.filter_by(
                    item_id=warehouse_item.id,
                    location=location
                ).first()

                if not item_location:
                    db.session.rollback()
                    return operation_result(404, "error", f"Item location not found")

                # Calculate quantity difference
                if key in original_items:
                    old_quantity = original_items[key].quantity
                    new_quantity = item_data["quantity"]
                    quantity_diff = new_quantity - old_quantity
                else:
                    old_quantity = 0
                    new_quantity = item_data["quantity"]
                    quantity_diff = new_quantity

                # Check stock availability for increases
                if quantity_diff > 0 and item_location.quantity < quantity_diff:
                    db.session.rollback()
                    return operation_result(400, "error", f"Insufficient stock for {item_data['item_name']}")

                # Update main warehouse inventory
                item_location.quantity -= quantity_diff

                # Handle pricing using FIFO
                # First, restore old price quantities if this is an update
                if key in original_items:
                    old_price_details = InvoicePriceDetail.query.filter_by(
                        invoice_id=invoice.id,
                        item_id=warehouse_item.id
                    ).all()
                    for detail in old_price_details:
                        price_entry = Prices.query.filter_by(
                            invoice_id=detail.source_price_invoice_id,
                            item_id=detail.source_price_item_id,
                            location=detail.source_price_location,
                            supplier_id=detail.source_price_supplier_id
                        ).first()
                        if price_entry:
                            price_entry.quantity += detail.quantity

                    # Delete old price details for this item
                    InvoicePriceDetail.query.filter_by(
                        invoice_id=invoice.id,
                        item_id=warehouse_item.id
                    ).delete()

                # Apply new FIFO pricing
                remaining_to_rent = new_quantity
                fifo_total = 0

                price_entries = Prices.query.filter_by(
                    item_id=warehouse_item.id
                ).order_by(Prices.invoice_id.asc()).all()

                if not price_entries:
                    db.session.rollback()
                    return operation_result(400, "error", f"No price information found for item '{item_data['item_name']}'")

                for price_entry in price_entries:
                    if remaining_to_rent <= 0:
                        break

                    quantity_from_this_entry = min(remaining_to_rent, price_entry.quantity)
                    subtotal = round(quantity_from_this_entry * price_entry.unit_price, 3)

                    price_detail = InvoicePriceDetail(
                        invoice_id=invoice.id,
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
                    fifo_total += subtotal
                    remaining_to_rent -= quantity_from_this_entry
                    price_entry.quantity -= quantity_from_this_entry

                if remaining_to_rent > 0:
                    db.session.rollback()
                    return operation_result(400, "error", f"Insufficient priced inventory for '{item_data['item_name']}'")

                fifo_total = round(fifo_total, 3)
                effective_unit_price = round(fifo_total / new_quantity, 3) if new_quantity > 0 else 0

                # Update or create invoice item
                if key in original_items:
                    item = original_items[key]
                    item.quantity = new_quantity
                    item.unit_price = effective_unit_price
                    item.total_price = fifo_total
                    if "description" in item_data:
                        item.description = item_data["description"]
                else:
                    item = InvoiceItem(
                        invoice_id=invoice.id,
                        item_id=warehouse_item.id,
                        quantity=new_quantity,
                        location=location,
                        unit_price=effective_unit_price,
                        total_price=fifo_total,
                        description=item_data.get("description", ""),
                        supplier_id=0
                    )
                    db.session.add(item)

                updated_items[key] = item
                total_invoice_amount += fifo_total

                # Update or create rental warehouse location
                rental_location = RentalWarehouseLocations.query.filter_by(
                    item_id=warehouse_item.id,
                    location='RENTAL_WAREHOUSE'
                ).first()

                if rental_location:
                    rental_location.quantity += quantity_diff
                    rental_location.reserved_quantity += quantity_diff
                    rental_location.updated_at = datetime.now()
                else:
                    rental_location = RentalWarehouseLocations(
                        item_id=warehouse_item.id,
                        location='RENTAL_WAREHOUSE',
                        quantity=new_quantity,
                        reserved_quantity=new_quantity,
                        available_quantity=0
                    )
                    db.session.add(rental_location)

                # Update rented item record
                rented_item = RentedItems.query.filter_by(
                    rental_invoice_id=invoice.id,
                    item_id=warehouse_item.id
                ).first()

                if rented_item:
                    rented_item.quantity = new_quantity
                    rented_item.unit_price = effective_unit_price
                    rented_item.total_price = fifo_total
                    rented_item.customer_name = customer_name
                    rented_item.customer_phone = customer_phone
                    rented_item.customer_id_number = customer_id_number
                    rented_item.expected_return_date = expected_return_date
                    rented_item.notes = item_data.get('notes', '')
                    rented_item.updated_at = datetime.now()

            # Restore removed items
            for key, item in original_items.items():
                if key not in updated_items:
                    item_location = ItemLocations.query.filter_by(
                        item_id=item.item_id,
                        location=item.location
                    ).first()

                    if item_location:
                        item_location.quantity += item.quantity

                    # Remove from rental warehouse
                    rental_location = RentalWarehouseLocations.query.filter_by(
                        item_id=item.item_id,
                        location='RENTAL_WAREHOUSE'
                    ).first()

                    if rental_location:
                        rental_location.quantity -= item.quantity
                        rental_location.reserved_quantity -= item.quantity
                        if rental_location.quantity <= 0:
                            db.session.delete(rental_location)

                    # Delete price details
                    InvoicePriceDetail.query.filter_by(
                        invoice_id=invoice.id,
                        item_id=item.item_id
                    ).delete()

                    # Delete rented item record
                    RentedItems.query.filter_by(
                        rental_invoice_id=invoice.id,
                        item_id=item.item_id
                    ).delete()

                    db.session.delete(item)

            # Update invoice fields
            invoice.client_name = customer_name
            invoice.warehouse_manager = data.get("warehouse_manager", invoice.warehouse_manager)
            invoice.accreditation_manager = data.get("accreditation_manager", invoice.accreditation_manager)
            invoice.total_amount = total_invoice_amount
            invoice.paid = data.get("paid", invoice.paid)
            invoice.residual = total_invoice_amount - invoice.paid
            invoice.comment = data.get("comment", invoice.comment)
            invoice.status = data.get("status", invoice.status)

            # Update machine and mechanism if provided
            if machine:
                invoice.machine_id = machine.id
            if mechanism:
                invoice.mechanism_id = mechanism.id

            db.session.commit()

        return {"message": "Rental invoice updated successfully"}, 200

    except SQLAlchemyError as e:
        db.session.rollback()
        return operation_result(500, "error", f"Database error: {str(e)}")
    except Exception as e:
        db.session.rollback()
        return operation_result(500, "error", f"Error updating rental invoice: {str(e)}")


def delete_rental_invoice(invoice, invoice_ns):
    """
    Delete a rental invoice and restore inventory
    """
    # Check if it's a rental invoice
    if invoice.type != 'حجز':
        db.session.rollback()
        return operation_result(400, "error", "Can only delete rental invoices with this method")

    try:
        # Get all rented items for this invoice
        rented_items = RentedItems.query.filter_by(rental_invoice_id=invoice.id).all()

        for rented_item in rented_items:
            # If item was given to customer, we can't delete the invoice
            if rented_item.status == 'given':
                db.session.rollback()
                return operation_result(400, "error", f"Cannot delete rental invoice. Item {rented_item.item.item_name} has been given to customer.")

            # Get the original invoice item to find the correct location
            invoice_item = InvoiceItem.query.filter_by(
                invoice_id=invoice.id,
                item_id=rented_item.item_id
            ).first()

            if not invoice_item:
                db.session.rollback()
                return operation_result(500, "error", f"Invoice item not found for item {rented_item.item_id}")

            # Restore main warehouse inventory to the original location
            main_location = ItemLocations.query.filter_by(
                item_id=rented_item.item_id,
                location=invoice_item.location
            ).first()

            if main_location:
                main_location.quantity += rented_item.quantity
            else:
                # Create the location if it doesn't exist
                main_location = ItemLocations(
                    item_id=rented_item.item_id,
                    location=invoice_item.location,
                    quantity=rented_item.quantity
                )
                db.session.add(main_location)

            # Remove from rental warehouse
            rental_location = RentalWarehouseLocations.query.filter_by(
                item_id=rented_item.item_id,
                location='RENTAL_WAREHOUSE'
            ).first()

            if rental_location:
                rental_location.quantity -= rented_item.quantity
                rental_location.reserved_quantity -= rented_item.quantity
                if rental_location.quantity <= 0:
                    db.session.delete(rental_location)

        # Restore price entries
        price_details = InvoicePriceDetail.query.filter_by(invoice_id=invoice.id).all()

        for detail in price_details:
            price_entry = Prices.query.filter_by(
                invoice_id=detail.source_price_invoice_id,
                item_id=detail.source_price_item_id,
                location=detail.source_price_location,
                supplier_id=detail.source_price_supplier_id
            ).first()

            if price_entry:
                price_entry.quantity += detail.quantity

        # Delete related records
        RentedItems.query.filter_by(rental_invoice_id=invoice.id).delete()
        InvoicePriceDetail.query.filter_by(invoice_id=invoice.id).delete()
        InvoiceItem.query.filter_by(invoice_id=invoice.id).delete()

        # Delete the invoice
        db.session.delete(invoice)

        db.session.commit()
        return operation_result(200, "success", message="Rental invoice deleted successfully")

    except SQLAlchemyError as e:
        db.session.rollback()
        return operation_result(500, "error", message=f"Database error: {str(e)}")
    except Exception as e:
        db.session.rollback()
        return operation_result(500, "error", message=f"Error deleting rental invoice: {str(e)}")