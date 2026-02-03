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
from src.core.cache import cache

router = APIRouter(prefix="/invoice", tags=["Invoice"])


def serialize_invoice(invoice) -> dict:
    """Serialize invoice to match desired response structure"""
    suppliers_summary = list(set(
        item.supplier_name
        for item in invoice.items
        if item.supplier_name
    ))

    return {
        "id": invoice.id,
        "type": invoice.type,
        "created_at": invoice.created_at.strftime("%Y-%m-%d %H:%M:%S") if invoice.created_at else None,
        "client_name": invoice.client_name,
        "warehouse_manager": invoice.warehouse_manager,
        "accreditation_manager": invoice.accreditation_manager,
        "total_amount": invoice.total_amount,
        "paid": invoice.paid,
        "residual": invoice.residual,
        "comment": invoice.comment,
        "status": invoice.status,
        "employee_name": invoice.employee_name,
        "machine": invoice.machine.name if invoice.machine else None,
        "mechanism": invoice.mechanism.name if invoice.mechanism else None,
        "suppliers_summary": suppliers_summary,
        "items": [serialize_invoice_item(item) for item in invoice.items],
        "return_sales_info": {},
    }


def serialize_invoice_item(item) -> dict:
    """Serialize invoice item"""
    return {
        "item_name": item.warehouse.item_name if item.warehouse else None,
        "item_bar": item.warehouse.item_bar if item.warehouse else None,
        "location": item.location,
        "quantity": item.quantity,
        "unit_price": item.unit_price,
        "total_price": item.total_price,
        "description": item.description,
        "supplier_name": item.supplier_name,
        "supplier_id": item.supplier_id,
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
        return {
            "invoices": [serialize_invoice(inv) for inv in invoices],
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

    total_pages = (total + page_size - 1) // page_size

    return {
        "invoices": [serialize_invoice(inv) for inv in invoices],
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
    uow: UOW = None,
    current_user: CurrentUser = None,
    location: str | None = Query(None),
):
    """GET /invoice/fifo-prices/<item_id> - Get FIFO prices for an item"""
    if location:
        prices = await uow.prices.get_fifo_prices(item_id, location)
    else:
        prices = await uow.prices.get_by_item(item_id)
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

    total_pages = (total + page_size - 1) // page_size

    return {
        "invoices": [serialize_invoice(inv) for inv in invoices],
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


@router.get("/{invoice_type}")
async def list_invoices_by_type(
    invoice_type: str,
    uow: UOW,
    current_user: CurrentUser,
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100),
    all: bool = Query(False),
):
    """GET /invoice/<type> - List invoices by type"""
    if all:
        invoices, total = await uow.invoices.get_by_type_with_permissions(
            invoice_type=invoice_type,
            user=current_user,
            skip=0,
            limit=10000,
        )
        return {
            "invoices": [serialize_invoice(inv) for inv in invoices],
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

    total_pages = (total + page_size - 1) // page_size

    return {
        "invoices": [serialize_invoice(inv) for inv in invoices],
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
    from src.services.invoice.invoice_service import InvoiceService

    # Ensure default supplier exists for items without a supplier
    if any(not item.supplier_name or not item.supplier_name.strip() for item in data.items):
        default_supplier = await uow.suppliers.get(0)
        if not default_supplier:
            await uow.suppliers.create({
                "id": 0,
                "name": "بدون مورد",
                "description": "Default supplier for items without a supplier"
            })
            await uow.session.flush()

    # Pre-resolve supplier IDs for each item
    items_data = []
    for item_data in data.items:
        barcode = item_data.barcode or item_data.item_bar

        item_supplier_id = item_data.supplier_id or 0
        item_supplier_name = item_data.supplier_name or ""
        if item_data.supplier_name and item_data.supplier_name.strip():
            supplier = await uow.suppliers.get_by_name(item_data.supplier_name)
            if supplier:
                item_supplier_id = supplier.id
                item_supplier_name = supplier.name

        items_data.append({
            "item_name": item_data.item_name,
            "barcode": barcode,
            "item_bar": barcode,
            "location": item_data.location,
            "new_location": item_data.new_location,
            "quantity": item_data.quantity,
            "unit_price": item_data.unit_price,
            "total_price": item_data.total_price,
            "description": item_data.description,
            "supplier_id": item_supplier_id,
            "supplier_name": item_supplier_name,
        })

    # Build service data dict
    service_data = {
        "type": data.type,
        "client_name": data.client_name,
        "warehouse_manager": data.warehouse_manager,
        "employee_name": data.employee_name or current_user.username,
        "machine_name": data.machine_name,
        "mechanism_name": data.mechanism_name,
        "comment": data.comment,
        "payment_method": data.payment_method,
        "custody_person": data.custody_person,
        "paid": data.paid or data.amount_paid or 0,
        "items": items_data,
    }

    # Delegate to service — handles FIFO pricing, inventory, Prices records
    service = InvoiceService(uow)
    result = await service.create_invoice(service_data, current_user)

    if not result.success:
        raise HTTPException(
            status_code=result.status_code,
            detail=result.message,
        )

    invoice = result.data["invoice"]
    await cache.delete_pattern("warehouse_list:*")
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

    # Resolve machine_id from machine name if provided
    machine_id = data.machine_id
    if data.machine:
        machine = await uow.machines.get_by_name(data.machine)
        if machine:
            machine_id = machine.id

    # Resolve mechanism_id from mechanism name if provided
    mechanism_id = data.mechanism_id
    if data.mechanism:
        mechanism = await uow.mechanisms.get_by_name(data.mechanism)
        if mechanism:
            mechanism_id = mechanism.id

    # Update invoice fields
    update_data = {}
    for field in ["client_name", "warehouse_manager",
                  "total_amount", "paid", "residual", "comment", "payment_method",
                  "custody_person", "supplier_id"]:
        value = getattr(data, field, None)
        if value is not None:
            update_data[field] = value

    if machine_id is not None:
        update_data["machine_id"] = machine_id
    if mechanism_id is not None:
        update_data["mechanism_id"] = mechanism_id

    if update_data:
        await uow.invoices.update(invoice, update_data)

    # Update items if provided
    if data.items is not None:
        # Delete existing items
        await uow.invoice_items.delete_by_invoice(invoice_id)

        # Create new items
        total = 0.0
        for item_data in data.items:
            # Resolve item_id from item_name + barcode/item_bar if provided
            item_id = item_data.item_id
            barcode = item_data.barcode or item_data.item_bar

            if item_data.item_name and barcode:
                warehouse_item = await uow.warehouse.get_by_barcode(barcode)
                if warehouse_item:
                    item_id = warehouse_item.id
                else:
                    raise HTTPException(
                        status_code=status.HTTP_404_NOT_FOUND,
                        detail=f"Warehouse item with barcode '{barcode}' not found",
                    )

            # Ensure item_id is resolved
            if not item_id:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="item_id or (item_name + item_bar) must be provided for each item",
                )

            # Resolve supplier_id from supplier_name if provided
            item_supplier_id = item_data.supplier_id or 0
            item_supplier_name = item_data.supplier_name or ""

            if item_data.supplier_name and item_data.supplier_name.strip():
                supplier = await uow.suppliers.get_by_name(item_data.supplier_name)
                if supplier:
                    item_supplier_id = supplier.id
                    item_supplier_name = supplier.name
            else:
                # Ensure default supplier exists (ID 0)
                default_supplier = await uow.suppliers.get(0)
                if not default_supplier:
                    default_supplier = await uow.suppliers.create({
                        "id": 0,
                        "name": "بدون مورد",
                        "description": "Default supplier for items without a supplier"
                    })

            item = {
                "invoice_id": invoice.id,
                "item_id": item_id,
                "location": item_data.location,
                "supplier_id": item_supplier_id,
                "quantity": item_data.quantity,
                "unit_price": item_data.unit_price,
                "total_price": item_data.total_price,
                "supplier_name": item_supplier_name,
                "description": item_data.description,
                "new_location": item_data.new_location,
            }
            await uow.invoice_items.create(item)
            total += item_data.total_price or 0

    await uow.commit()
    await cache.delete_pattern("warehouse_list:*")

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
    await cache.delete_pattern("warehouse_list:*")

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
