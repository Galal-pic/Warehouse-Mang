from datetime import datetime
from ..models import Invoice, Warehouse, ItemLocations, InvoiceItem, Prices, InvoicePriceDetail, PurchaseRequests
from .. import db
from sqlalchemy.exc import SQLAlchemyError
from ..utils import operation_result

def PurchaseRequest_Operations(data, machine, mechanism, supplier, employee, machine_ns, warehouse_ns, invoice_ns, mechanism_ns, item_location_n, supplier_ns):
    """
    Create a purchase request invoice (طلب شراء type).
    Unlike Sales Operations, this doesn't use FIFO pricing from the Prices table.
    It uses the latest price found for each item.
    FIXED: Now supports location-based pricing.
    """
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
            
            # FIXED: Get last price entry for this item and location
            last_price_entry = Prices.query.filter_by(
                item_id=warehouse_item.id,
                location=item_data['location']  # FIXED: Filter by location too
            ).order_by(Prices.invoice_id.desc()).first()
            
            if not last_price_entry:
                db.session.rollback()
                return operation_result(400, "error", f"No price information found for item '{item_data['item_name']}' in location '{item_data['location']}'")

            subtotal = item_data["quantity"] * last_price_entry.unit_price
            
            # FIXED: Create a price detail record with location
            price_detail = InvoicePriceDetail(
                invoice_id=new_invoice.id,
                item_id=warehouse_item.id,
                source_price_invoice_id=last_price_entry.invoice_id,
                source_price_item_id=last_price_entry.item_id,
                source_price_location=last_price_entry.location,  # FIXED: Include location
                quantity=item_data["quantity"],
                unit_price=last_price_entry.unit_price,
                subtotal=subtotal
            )
                
            db.session.add(price_detail)

            invoice_item = InvoiceItem(
                invoice_id=new_invoice.id,
                item_id=warehouse_item.id,
                quantity=item_data["quantity"],
                location=item_data['location'],
                unit_price=last_price_entry.unit_price,
                total_price=subtotal,
                description=item_data.get('description', "")
            )
            
            db.session.add(invoice_item)
            
            purchase_request = PurchaseRequests(
                requested_quantity=item_data["quantity"],
                status="draft",
                invoice_id=new_invoice.id,
                item_id=warehouse_item.id,
                employee_id=employee.id,
                machine_id=machine.id if machine else None,
                mechanism_id=mechanism.id if mechanism else None,
                subtotal=subtotal
            )
            db.session.add(purchase_request)
            total_invoice_amount += subtotal
    
        new_invoice.total_amount = total_invoice_amount
        
        db.session.commit()
        return operation_result(201, "success", message="invoice created successfully", invoice=new_invoice)
        
    except SQLAlchemyError as e:
        db.session.rollback()
        return operation_result(500, "error", f"Database error: {str(e)}")
    
    except Exception as e:
        db.session.rollback()
        return operation_result(500, "error", f"Error processing sale: {str(e)}")

def delete_purchase_request(invoice, invoice_ns):
    # Check if it's a purchase request invoice
    if invoice.type != 'طلب شراء':
        db.session.rollback()
        return operation_result(400, "error", "Can only delete purchase request invoices with this method")
    try:
        purchase_request = PurchaseRequests.query.filter_by(invoice_id=invoice.id).first()
        if not purchase_request:
            db.session.rollback()
            return operation_result(404, "error", "لم يتم العثور على طلب شراء")
        
        # Delete price detail records
        InvoicePriceDetail.query.filter_by(invoice_id=invoice.id).delete()
        
        # Delete purchase request, invoice items, and invoice
        db.session.delete(purchase_request)
        InvoiceItem.query.filter_by(invoice_id=invoice.id).delete()
        db.session.delete(invoice)
        
        db.session.commit()
        return {"message": "Purchase request deleted successfully"}, 200

    except Exception as e:
        db.session.rollback()
        return operation_result(500, "error", f"Error deleting invoice: {str(e)}")

def put_purchase_request(data, invoice, machine, mechanism, invoice_ns):
    try:
        with db.session.begin_nested():  # Use a savepoint for the complex operation
            
            # Delete existing invoice items and price details first
            InvoiceItem.query.filter_by(invoice_id=invoice.id).delete()
            InvoicePriceDetail.query.filter_by(invoice_id=invoice.id).delete()
            
            # Update or create purchase requests
            existing_requests = PurchaseRequests.query.filter_by(invoice_id=invoice.id).all()
            for req in existing_requests:
                db.session.delete(req)
            
            item_ids = []
            total_invoice_amount = 0
            
            for item_data in data["items"]:
                # Verify the warehouse item exists
                warehouse_item = Warehouse.query.filter_by(item_name=item_data["item_name"]).first()
                if not warehouse_item:
                    db.session.rollback()
                    return operation_result(404, "error", f"Item '{item_data['item_name']}' not found in warehouse")
                
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
                
                # FIXED: Get last price entry for this item and location
                last_price_entry = Prices.query.filter_by(
                    item_id=warehouse_item.id,
                    location=item_data['location']  # FIXED: Filter by location too
                ).order_by(Prices.invoice_id.desc()).first()
                
                if not last_price_entry:
                    db.session.rollback()
                    return operation_result(400, "error", f"No price information found for item '{item_data['item_name']}' in location '{item_data['location']}'")

                subtotal = item_data["quantity"] * last_price_entry.unit_price
                
                # FIXED: Create a price detail record with location
                price_detail = InvoicePriceDetail(
                    invoice_id=invoice.id,
                    item_id=warehouse_item.id,
                    source_price_invoice_id=last_price_entry.invoice_id,
                    source_price_item_id=last_price_entry.item_id,
                    source_price_location=last_price_entry.location,  # FIXED: Include location
                    quantity=item_data["quantity"],
                    unit_price=last_price_entry.unit_price,
                    subtotal=subtotal
                )
                    
                db.session.add(price_detail)

                invoice_item = InvoiceItem(
                    invoice_id=invoice.id,
                    item_id=warehouse_item.id,
                    quantity=item_data["quantity"],
                    location=item_data['location'],
                    unit_price=last_price_entry.unit_price,
                    total_price=subtotal,
                    description=item_data.get('description', "")
                )
                    
                db.session.add(invoice_item)
                
                # Create new purchase request
                purchase_request = PurchaseRequests(
                    requested_quantity=item_data["quantity"],
                    status="draft",
                    invoice_id=invoice.id,
                    item_id=warehouse_item.id,
                    employee_id=invoice.employee_id,
                    machine_id=machine.id if machine else invoice.machine_id,
                    mechanism_id=mechanism.id if mechanism else invoice.mechanism_id,
                    subtotal=subtotal
                )
                db.session.add(purchase_request)
                
                total_invoice_amount += subtotal
            
            # Update invoice fields
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