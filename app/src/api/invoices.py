from typing import Any

from fastapi import APIRouter, HTTPException, status, Query

from src.api.deps import UOW, CurrentUser
from src.schemas.invoice import (
    InvoiceCreate,
    InvoiceUpdate,
    InvoiceResponse,
    LastIdResponse,
    WarrantyReturnRequest,
    WarrantyReturnStatusResponse,
    PriceUpdateRequest,
)
from src.schemas.common import PaginatedResponse, MessageResponse
from src.schemas.warehouse import FifoPriceResponse

router = APIRouter(prefix="/invoice", tags=["Invoice"])


def serialize_invoice(invoice) -> dict:
    """Serialize invoice to match Flask response exactly"""
    suppliers_summary = list(set(
        item.supplier_name
        for item in invoice.items
        if item.supplier_name
    ))

    return {
        "id": invoice.id,
        "type": invoice.type,
        "client_name": invoice.client_name,
        "status": invoice.status,
        "employee_name": invoice.employee_name,
        "machine_name": invoice.machine.name if invoice.machine else None,
        "mechanism_name": invoice.mechanism.name if invoice.mechanism else None,
        "total_amount": invoice.total_amount,
        "paid": invoice.paid,
        "residual": invoice.residual,
        "created_at": invoice.created_at.strftime("%Y-%m-%d %H:%M:%S") if invoice.created_at else None,
        "comment": invoice.comment,
        "deduction_status": invoice.deduction_status,
        "warehouse_manager": invoice.warehouse_manager,
        "accreditation_manager": invoice.accreditation_manager,
        "payment_method": invoice.payment_method,
        "custody_person": invoice.custody_person,
        "suppliers_summary": suppliers_summary,
        "items": [serialize_invoice_item(item, invoice) for item in invoice.items],
    }


def serialize_invoice_item(item, invoice) -> dict:
    """Serialize invoice item with price details"""
    # Get price details for this item
    price_details = [
        {
            "source_price_invoice_id": pd.source_price_invoice_id,
            "quantity": pd.quantity,
            "unit_price": pd.unit_price,
            "subtotal": pd.subtotal,
        }
        for pd in invoice.price_details
        if pd.item_id == item.item_id
    ]

    return {
        "item_id": item.item_id,
        "item_name": item.warehouse.item_name if item.warehouse else None,
        "barcode": item.warehouse.item_bar if item.warehouse else None,
        "quantity": item.quantity,
        "location": item.location,
        "unit_price": item.unit_price,
        "total_price": item.total_price,
        "supplier_id": item.supplier_id,
        "supplier_name": item.supplier_name,
        "description": item.description,
        "new_location": item.new_location,
        "price_details": price_details,
    }


@router.get("/")
async def list_invoices(
    uow: UOW,
    current_user: CurrentUser,
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100),
    all: bool = Query(False),
):
    """GET /invoice/ - List all invoices with pagination"""
    if all:
        invoices, total = await uow.invoices.get_all_with_permissions(
            user=current_user, skip=0, limit=10000
        )
        items = [serialize_invoice(inv) for inv in invoices]
        return {
            "items": items,
            "page": 1,
            "page_size": total,
            "total_pages": 1,
            "total_items": total,
            "all": True,
        }

    invoices, total = await uow.invoices.get_all_with_permissions(
        user=current_user,
        skip=(page - 1) * page_size,
        limit=page_size,
    )

    items = [serialize_invoice(inv) for inv in invoices]
    total_pages = (total + page_size - 1) // page_size

    return {
        "items": items,
        "page": page,
        "page_size": page_size,
        "total_pages": total_pages,
        "total_items": total,
        "all": False,
    }


@router.get("/last-id", response_model=LastIdResponse)
async def get_last_id(uow: UOW, current_user: CurrentUser):
    """GET /invoice/last-id - Get next invoice ID"""
    last_id = await uow.invoices.get_last_id()
    return {"last_id": last_id}


@router.get("/fifo-prices/{item_id}")
async def get_fifo_prices(
    item_id: int,
    location: str = Query(...),
    uow: UOW = None,
    current_user: CurrentUser = None,
):
    """GET /invoice/fifo-prices/<item_id> - Get FIFO prices for an item"""
    prices = await uow.prices.get_fifo_prices(item_id, location)
    return [
        {
            "invoice_id": p.invoice_id,
            "item_id": p.item_id,
            "location": p.location,
            "supplier_id": p.supplier_id,
            "quantity": p.quantity,
            "unit_price": p.unit_price,
            "created_at": p.created_at.strftime("%Y-%m-%d %H:%M:%S") if p.created_at else None,
        }
        for p in prices
    ]


@router.get("/inventory-value")
async def get_inventory_value(uow: UOW, current_user: CurrentUser):
    """GET /invoice/inventory-value - Get inventory valuation"""
    # Get all prices with remaining quantity
    all_items = await uow.warehouse.get_all_no_limit()
    total_value = 0.0
    items_value = []

    for item in all_items:
        prices = await uow.prices.get_by_item(item.id)
        item_value = sum(p.quantity * p.unit_price for p in prices if p.quantity > 0)
        total_value += item_value
        if item_value > 0:
            items_value.append({
                "item_id": item.id,
                "item_name": item.item_name,
                "value": item_value,
            })

    return {
        "total_value": total_value,
        "items": items_value,
    }


@router.get("/sales-invoices")
async def get_sales_invoices(
    uow: UOW,
    current_user: CurrentUser,
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100),
):
    """GET /invoice/sales-invoices - Get sales invoices"""
    invoices, total = await uow.invoices.get_sales_invoices(
        skip=(page - 1) * page_size,
        limit=page_size,
    )

    items = [serialize_invoice(inv) for inv in invoices]
    total_pages = (total + page_size - 1) // page_size

    return {
        "items": items,
        "page": page,
        "page_size": page_size,
        "total_pages": total_pages,
        "total_items": total,
        "all": False,
    }


@router.get("/price-report/{invoice_id}")
async def get_price_report(
    invoice_id: int,
    uow: UOW,
    current_user: CurrentUser,
):
    """GET /invoice/price-report/<id> - Get price tracking report"""
    invoice = await uow.invoices.get_with_items(invoice_id)
    if not invoice:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Invoice not found",
        )

    price_details = await uow.price_details.get_by_invoice(invoice_id)
    return {
        "invoice_id": invoice_id,
        "type": invoice.type,
        "price_details": [
            {
                "item_id": pd.item_id,
                "source_price_invoice_id": pd.source_price_invoice_id,
                "quantity": pd.quantity,
                "unit_price": pd.unit_price,
                "subtotal": pd.subtotal,
            }
            for pd in price_details
        ],
    }


@router.get("/fifo-report")
async def get_fifo_report(uow: UOW, current_user: CurrentUser):
    """GET /invoice/fifo-report - Get FIFO inventory report"""
    all_items = await uow.warehouse.get_all_no_limit()
    report = []

    for item in all_items:
        locations = await uow.item_locations.get_by_item(item.id)
        for loc in locations:
            prices = await uow.prices.get_fifo_prices(item.id, loc.location)
            if prices:
                report.append({
                    "item_id": item.id,
                    "item_name": item.item_name,
                    "location": loc.location,
                    "total_quantity": sum(p.quantity for p in prices),
                    "prices": [
                        {
                            "invoice_id": p.invoice_id,
                            "quantity": p.quantity,
                            "unit_price": p.unit_price,
                        }
                        for p in prices
                    ],
                })

    return report


@router.get("/{invoice_id:int}")
async def get_invoice(
    invoice_id: int,
    uow: UOW,
    current_user: CurrentUser,
):
    """GET /invoice/<id> - Get single invoice with items"""
    invoice = await uow.invoices.get_with_items(invoice_id)
    if not invoice:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Invoice not found",
        )
    return serialize_invoice(invoice)


@router.get("/type/{invoice_type}")
async def list_invoices_by_type(
    invoice_type: str,
    uow: UOW,
    current_user: CurrentUser,
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100),
    all: bool = Query(False),
):
    """GET /invoice/type/<type> - List invoices by type"""
    if all:
        invoices, total = await uow.invoices.get_by_type_with_permissions(
            invoice_type=invoice_type,
            user=current_user,
            skip=0,
            limit=10000,
        )
        items = [serialize_invoice(inv) for inv in invoices]
        return {
            "items": items,
            "page": 1,
            "page_size": total,
            "total_pages": 1,
            "total_items": total,
            "all": True,
        }

    invoices, total = await uow.invoices.get_by_type_with_permissions(
        invoice_type=invoice_type,
        user=current_user,
        skip=(page - 1) * page_size,
        limit=page_size,
    )

    items = [serialize_invoice(inv) for inv in invoices]
    total_pages = (total + page_size - 1) // page_size

    return {
        "items": items,
        "page": page,
        "page_size": page_size,
        "total_pages": total_pages,
        "total_items": total,
        "all": False,
    }


@router.post("/")
async def create_invoice(
    data: InvoiceCreate,
    uow: UOW,
    current_user: CurrentUser,
):
    """POST /invoice/ - Create new invoice"""
    # Create invoice
    invoice_data = {
        "type": data.type,
        "status": "draft",
        "client_name": data.client_name,
        "warehouse_manager": data.warehouse_manager,
        "accreditation_manager": data.accreditation_manager,
        "total_amount": data.total_amount,
        "paid": data.paid,
        "residual": data.residual,
        "comment": data.comment,
        "payment_method": data.payment_method,
        "custody_person": data.custody_person,
        "employee_id": current_user.id,
        "employee_name": current_user.username,
        "machine_id": data.machine_id,
        "mechanism_id": data.mechanism_id,
        "supplier_id": data.supplier_id,
    }

    invoice = await uow.invoices.create(invoice_data)

    # Create invoice items
    total = 0.0
    for item_data in data.items:
        item = {
            "invoice_id": invoice.id,
            "item_id": item_data.item_id,
            "location": item_data.location,
            "supplier_id": item_data.supplier_id,
            "quantity": item_data.quantity,
            "unit_price": item_data.unit_price,
            "total_price": item_data.total_price,
            "supplier_name": item_data.supplier_name,
            "description": item_data.description,
            "new_location": item_data.new_location,
        }
        await uow.invoice_items.create(item)
        total += item_data.total_price or 0

    # Update total if not provided
    if data.total_amount is None:
        invoice.total_amount = total
        invoice.residual = total - (data.paid or 0)

    await uow.commit()

    # Fetch with items for response
    invoice = await uow.invoices.get_with_items(invoice.id)
    return serialize_invoice(invoice)


@router.put("/{invoice_id}")
async def update_invoice(
    invoice_id: int,
    data: InvoiceUpdate,
    uow: UOW,
    current_user: CurrentUser,
):
    """PUT /invoice/<id> - Update invoice"""
    invoice = await uow.invoices.get_with_items(invoice_id)
    if not invoice:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Invoice not found",
        )

    # Update invoice fields
    update_data = {}
    for field in ["client_name", "warehouse_manager", "accreditation_manager",
                  "total_amount", "paid", "residual", "comment", "payment_method",
                  "custody_person", "machine_id", "mechanism_id", "supplier_id"]:
        value = getattr(data, field, None)
        if value is not None:
            update_data[field] = value

    if update_data:
        await uow.invoices.update(invoice, update_data)

    # Update items if provided
    if data.items is not None:
        # Delete existing items
        await uow.invoice_items.delete_by_invoice(invoice_id)

        # Create new items
        total = 0.0
        for item_data in data.items:
            item = {
                "invoice_id": invoice.id,
                "item_id": item_data.item_id,
                "location": item_data.location,
                "supplier_id": item_data.supplier_id,
                "quantity": item_data.quantity,
                "unit_price": item_data.unit_price,
                "total_price": item_data.total_price,
                "supplier_name": item_data.supplier_name,
                "description": item_data.description,
                "new_location": item_data.new_location,
            }
            await uow.invoice_items.create(item)
            total += item_data.total_price or 0

    await uow.commit()

    invoice = await uow.invoices.get_with_items(invoice_id)
    return serialize_invoice(invoice)


@router.delete("/{invoice_id}")
async def delete_invoice(
    invoice_id: int,
    uow: UOW,
    current_user: CurrentUser,
):
    """DELETE /invoice/<id> - Delete invoice"""
    invoice = await uow.invoices.get(invoice_id)
    if not invoice:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Invoice not found",
        )

    await uow.invoices.delete(invoice)
    await uow.commit()

    return MessageResponse(message="Invoice deleted successfully")


@router.post("/{invoice_id}/confirm")
async def confirm_invoice(
    invoice_id: int,
    uow: UOW,
    current_user: CurrentUser,
):
    """POST /invoice/<id>/confirm - Confirm invoice"""
    invoice = await uow.invoices.get_with_items(invoice_id)
    if not invoice:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Invoice not found",
        )

    # Update status
    if invoice.status == "draft":
        invoice.status = "accreditation"
    elif invoice.status == "accreditation":
        invoice.status = "confirmed"

    await uow.commit()

    invoice = await uow.invoices.get_with_items(invoice_id)
    return serialize_invoice(invoice)


@router.post("/{invoice_id}/ReturnWarranty")
async def return_warranty(
    invoice_id: int,
    data: WarrantyReturnRequest,
    uow: UOW,
    current_user: CurrentUser,
):
    """POST /invoice/<id>/ReturnWarranty - Handle warranty returns"""
    invoice = await uow.invoices.get_with_items(invoice_id)
    if not invoice:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Invoice not found",
        )

    if invoice.type != "أمانات":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invoice is not a warranty invoice",
        )

    # Process returns
    for item_data in data.items:
        # Create warranty return record
        await uow.warranty_returns.create({
            "warranty_invoice_id": invoice_id,
            "item_id": item_data["item_id"],
            "location": item_data["location"],
            "returned_quantity": item_data["quantity"],
            "returned_by_employee_id": current_user.id,
            "notes": data.notes,
        })

        # Restore quantity to warehouse
        await uow.item_locations.add_quantity(
            item_data["item_id"],
            item_data["location"],
            item_data["quantity"],
        )

    await uow.commit()

    return {"status": "success", "message": "Warranty items returned successfully"}


@router.get("/{invoice_id}/WarrantyReturnStatus")
async def warranty_return_status(
    invoice_id: int,
    uow: UOW,
    current_user: CurrentUser,
):
    """GET /invoice/<id>/WarrantyReturnStatus - Get warranty return status"""
    invoice = await uow.invoices.get_with_items(invoice_id)
    if not invoice:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Invoice not found",
        )

    results = []
    for item in invoice.items:
        total_returned = await uow.warranty_returns.get_total_returned(
            invoice_id, item.item_id, item.location
        )
        results.append({
            "invoice_id": invoice_id,
            "item_id": item.item_id,
            "location": item.location,
            "original_quantity": item.quantity,
            "returned_quantity": total_returned,
            "remaining_quantity": (item.quantity or 0) - total_returned,
        })

    return results


@router.post("/{invoice_id}/PurchaseRequestConfirmation")
async def confirm_purchase_request(
    invoice_id: int,
    uow: UOW,
    current_user: CurrentUser,
):
    """POST /invoice/<id>/PurchaseRequestConfirmation - Confirm purchase request"""
    invoice = await uow.invoices.get_with_items(invoice_id)
    if not invoice:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Invoice not found",
        )

    if invoice.type != "طلب شراء":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invoice is not a purchase request",
        )

    # Get and update purchase requests
    requests = await uow.purchase_requests.get_by_invoice(invoice_id)
    for req in requests:
        await uow.purchase_requests.update(req, {"status": "confirmed"})

    # Update invoice status
    invoice.status = "confirmed"
    await uow.commit()

    return {"status": "success", "message": "Purchase request confirmed"}


@router.post("/updateprice/{invoice_id}")
async def update_price(
    invoice_id: int,
    data: PriceUpdateRequest,
    uow: UOW,
    current_user: CurrentUser,
):
    """POST /invoice/updateprice/<id> - Update invoice prices"""
    invoice = await uow.invoices.get_with_items(invoice_id)
    if not invoice:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Invoice not found",
        )

    # Update item prices
    for item_data in data.items:
        item = await uow.invoice_items.get_by_item_and_location(
            invoice_id,
            item_data["item_id"],
            item_data["location"],
            item_data.get("supplier_id", 0),
        )
        if item:
            item.unit_price = item_data.get("unit_price", item.unit_price)
            item.total_price = item_data.get("total_price", item.total_price)

    # Recalculate total
    invoice = await uow.invoices.get_with_items(invoice_id)
    total = sum(item.total_price or 0 for item in invoice.items)
    invoice.total_amount = total
    invoice.residual = total - (invoice.paid or 0)

    await uow.commit()

    invoice = await uow.invoices.get_with_items(invoice_id)
    return serialize_invoice(invoice)
