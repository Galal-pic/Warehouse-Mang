from datetime import datetime
from typing import Any

from fastapi import APIRouter, Query
from sqlalchemy import select, and_, func

from src.api.deps import UOW, CurrentUser
from src.models import (
    Invoice,
    InvoiceItem,
    Warehouse,
    PurchaseRequests,
)

router = APIRouter(prefix="/reports", tags=["Reports"])


def serialize_datetime(value: datetime | None) -> str | None:
    """Serialize datetime to string"""
    if value:
        return value.strftime("%Y-%m-%d %H:%M:%S")
    return None


@router.get("/")
async def get_all_reports(
    uow: UOW,
    current_user: CurrentUser,
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100),
    all: bool = Query(True),
):
    """GET /reports/ - Get all reports overview"""
    # Get counts for each entity
    result = {
        "employees": await uow.users.count(),
        "suppliers": await uow.suppliers.count(),
        "machines": await uow.machines.count(),
        "mechanisms": await uow.mechanisms.count(),
        "invoices": await uow.invoices.count(),
        "warehouse_items": await uow.warehouse.count(),
        "purchase_requests": await uow.purchase_requests.count(),
        "rented_items": await uow.rented_items.count(),
    }

    return result


@router.get("/filter")
async def filter_reports(
    uow: UOW,
    current_user: CurrentUser,
    type: str = Query(..., description="Report type (invoice, item)"),
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100),
    all: bool = Query(True),
    invoice_id: int | None = Query(None),
    warehouse_manager: str | None = Query(None),
    machine: str | None = Query(None),
    mechanism: str | None = Query(None),
    client_name: str | None = Query(None),
    accreditation_manager: str | None = Query(None),
    employee_name: str | None = Query(None),
    supplier: str | None = Query(None),
    status: str | None = Query(None),
    invoice_type: str | None = Query(None),
    item_name: str | None = Query(None),
    item_bar: str | None = Query(None),
    location: str | None = Query(None),
    start_date: str | None = Query(None),
    end_date: str | None = Query(None),
):
    """GET /reports/filter - Filter reports by various parameters"""
    offset = (page - 1) * page_size

    # Parse dates
    parsed_start_date = None
    parsed_end_date = None

    if start_date:
        try:
            parsed_start_date = datetime.strptime(start_date, "%Y-%m-%d")
        except ValueError:
            pass

    if end_date:
        try:
            parsed_end_date = datetime.strptime(end_date, "%Y-%m-%d")
            parsed_end_date = parsed_end_date.replace(hour=23, minute=59, second=59)
        except ValueError:
            pass

    if type == "invoice":
        return await _filter_invoices(
            uow, page, page_size, offset, all,
            invoice_id, warehouse_manager, machine, mechanism,
            client_name, accreditation_manager, employee_name,
            supplier, status, invoice_type,
            parsed_start_date, parsed_end_date
        )
    elif type == "item":
        return await _filter_items(
            uow, page, page_size, offset, all,
            item_name, item_bar, location, invoice_type,
            parsed_start_date, parsed_end_date
        )
    else:
        return {"error": f"Unsupported report type: {type}"}


async def _filter_invoices(
    uow: UOW,
    page: int,
    page_size: int,
    offset: int,
    all_results: bool,
    invoice_id: int | None,
    warehouse_manager: str | None,
    machine: str | None,
    mechanism: str | None,
    client_name: str | None,
    accreditation_manager: str | None,
    employee_name: str | None,
    supplier: str | None,
    status: str | None,
    invoice_type: str | None,
    start_date: datetime | None,
    end_date: datetime | None,
) -> dict:
    """Filter invoices with various criteria"""
    # Build query
    stmt = select(Invoice)

    conditions = []

    if invoice_id:
        conditions.append(Invoice.id == invoice_id)
    if warehouse_manager:
        conditions.append(Invoice.warehouse_manager.ilike(f"%{warehouse_manager}%"))
    if client_name:
        conditions.append(Invoice.client_name.ilike(f"%{client_name}%"))
    if accreditation_manager:
        conditions.append(Invoice.accreditation_manager.ilike(f"%{accreditation_manager}%"))
    if employee_name:
        conditions.append(Invoice.employee_name.ilike(f"%{employee_name}%"))
    if status:
        conditions.append(Invoice.status == status)
    if invoice_type:
        conditions.append(Invoice.type == invoice_type)
    if start_date:
        conditions.append(Invoice.created_at >= start_date)
    if end_date:
        conditions.append(Invoice.created_at <= end_date)

    # Machine filter
    if machine:
        machine_obj = await uow.machines.get_by_name(machine)
        if machine_obj:
            conditions.append(Invoice.machine_id == machine_obj.id)

    # Mechanism filter
    if mechanism:
        mechanism_obj = await uow.mechanisms.get_by_name(mechanism)
        if mechanism_obj:
            conditions.append(Invoice.mechanism_id == mechanism_obj.id)

    if conditions:
        stmt = stmt.where(and_(*conditions))

    # Get count
    count_stmt = select(func.count()).select_from(stmt.subquery())
    count_result = await uow.session.execute(count_stmt)
    total = count_result.scalar() or 0

    # Apply ordering and pagination
    stmt = stmt.order_by(Invoice.id.desc())
    if not all_results:
        stmt = stmt.offset(offset).limit(page_size)

    result = await uow.session.scalars(stmt)
    invoices = result.all()

    # Serialize invoices
    serialized = []
    for inv in invoices:
        # Get items
        items = await uow.invoice_items.get_by_invoice(inv.id)

        suppliers_summary = list(set(
            item.supplier_name for item in items if item.supplier_name
        ))

        invoice_data = {
            "id": inv.id,
            "type": inv.type,
            "created_at": serialize_datetime(inv.created_at),
            "client_name": inv.client_name,
            "warehouse_manager": inv.warehouse_manager,
            "accreditation_manager": inv.accreditation_manager,
            "total_amount": inv.total_amount,
            "paid": inv.paid,
            "residual": inv.residual,
            "comment": inv.comment,
            "status": inv.status,
            "employee_name": inv.employee_name,
            "machine": None,
            "mechanism": None,
            "suppliers_summary": suppliers_summary,
            "items": [],
        }

        # Get machine name
        if inv.machine_id:
            machine_obj = await uow.machines.get(inv.machine_id)
            invoice_data["machine"] = machine_obj.name if machine_obj else None

        # Get mechanism name
        if inv.mechanism_id:
            mechanism_obj = await uow.mechanisms.get(inv.mechanism_id)
            invoice_data["mechanism"] = mechanism_obj.name if mechanism_obj else None

        # Serialize items
        for item in items:
            warehouse_item = await uow.warehouse.get(item.item_id)
            invoice_data["items"].append({
                "item_name": warehouse_item.item_name if warehouse_item else None,
                "item_bar": warehouse_item.item_bar if warehouse_item else None,
                "location": item.location,
                "quantity": item.quantity,
                "unit_price": item.unit_price,
                "total_price": item.total_price,
                "description": item.description,
                "supplier_name": item.supplier_name,
                "supplier_id": item.supplier_id,
            })

        serialized.append(invoice_data)

    total_pages = (total + page_size - 1) // page_size if not all_results else 1

    return {
        "total": total,
        "page": page if not all_results else 1,
        "page_size": page_size if not all_results else total,
        "pages": total_pages,
        "results": serialized,
    }


async def _filter_items(
    uow: UOW,
    page: int,
    page_size: int,
    offset: int,
    all_results: bool,
    item_name: str | None,
    item_bar: str | None,
    location: str | None,
    invoice_type: str | None,
    start_date: datetime | None,
    end_date: datetime | None,
) -> dict:
    """Filter items with various criteria"""
    # Build query
    stmt = select(Warehouse)

    conditions = []
    if item_name:
        conditions.append(Warehouse.item_name.ilike(f"%{item_name}%"))
    if item_bar:
        conditions.append(Warehouse.item_bar.ilike(f"%{item_bar}%"))

    if conditions:
        stmt = stmt.where(and_(*conditions))

    # Get count
    count_stmt = select(func.count()).select_from(stmt.subquery())
    count_result = await uow.session.execute(count_stmt)
    total = count_result.scalar() or 0

    # Apply ordering and pagination
    stmt = stmt.order_by(Warehouse.id.desc())
    if not all_results:
        stmt = stmt.offset(offset).limit(page_size)

    result = await uow.session.scalars(stmt)
    items = result.all()

    # Serialize items with full details
    serialized = []
    for item in items:
        # Get locations
        locations = await uow.item_locations.get_by_item(item.id)

        # Get prices
        prices = await uow.prices.get_by_item(item.id)

        # Get invoice history
        invoice_items_stmt = select(InvoiceItem).where(InvoiceItem.item_id == item.id)
        invoice_items_result = await uow.session.scalars(invoice_items_stmt)
        invoice_items = invoice_items_result.all()

        invoice_history = []
        for inv_item in invoice_items:
            invoice = await uow.invoices.get(inv_item.invoice_id)
            if invoice:
                # Apply filters
                if invoice_type and invoice.type != invoice_type:
                    continue
                if start_date and invoice.created_at < start_date:
                    continue
                if end_date and invoice.created_at > end_date:
                    continue
                if location and inv_item.location != location:
                    continue

                invoice_history.append({
                    "invoice_id": invoice.id,
                    "invoice_type": invoice.type,
                    "invoice_date": serialize_datetime(invoice.created_at),
                    "location": inv_item.location,
                    "quantity": inv_item.quantity,
                    "unit_price": inv_item.unit_price,
                    "total_price": inv_item.total_price,
                    "status": invoice.status,
                    "supplier_name": inv_item.supplier_name,
                    "supplier_id": inv_item.supplier_id,
                })

        # Get purchase requests
        prs_stmt = select(PurchaseRequests).where(PurchaseRequests.item_id == item.id)
        prs_result = await uow.session.scalars(prs_stmt)
        purchase_requests = []
        for pr in prs_result.all():
            machine_obj = await uow.machines.get(pr.machine_id) if pr.machine_id else None
            mechanism_obj = await uow.mechanisms.get(pr.mechanism_id) if pr.mechanism_id else None
            employee_obj = await uow.users.get(pr.employee_id) if pr.employee_id else None

            purchase_requests.append({
                "id": pr.id,
                "status": pr.status,
                "requested_quantity": pr.requested_quantity,
                "created_at": serialize_datetime(pr.created_at),
                "updated_at": serialize_datetime(pr.updated_at),
                "subtotal": pr.subtotal,
                "machine": machine_obj.name if machine_obj else None,
                "mechanism": mechanism_obj.name if mechanism_obj else None,
                "employee": employee_obj.username if employee_obj else None,
            })

        item_data = {
            "id": item.id,
            "item_name": item.item_name,
            "item_bar": item.item_bar,
            "created_at": serialize_datetime(item.created_at),
            "updated_at": serialize_datetime(item.updated_at),
            "locations": [
                {
                    "location": loc.location,
                    "quantity": loc.quantity,
                }
                for loc in locations
            ],
            "prices": [
                {
                    "invoice_id": p.invoice_id,
                    "quantity": p.quantity,
                    "unit_price": p.unit_price,
                    "created_at": serialize_datetime(p.created_at),
                }
                for p in prices
            ],
            "invoice_history": invoice_history,
            "purchase_requests": purchase_requests,
        }

        serialized.append(item_data)

    total_pages = (total + page_size - 1) // page_size if not all_results else 1

    return {
        "total": total,
        "page": page if not all_results else 1,
        "page_size": page_size if not all_results else total,
        "pages": total_pages,
        "results": serialized,
    }
