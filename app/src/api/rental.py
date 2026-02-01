from fastapi import APIRouter, HTTPException, status, Query

from src.api.deps import UOW, CurrentUser
from src.schemas.rental import (
    RentalStatusUpdate,
    RentalBorrowRequest,
    RentalReturnRequest,
    RentedItemResponse,
    RentalWarehouseLocationResponse,
    MissingQuantityResponse,
)
from src.schemas.common import PaginatedResponse, MessageResponse

router = APIRouter(prefix="/rental", tags=["Rental"])


@router.put("/status")
async def update_rental_status(
    data: RentalStatusUpdate,
    uow: UOW,
    current_user: CurrentUser,
):
    """PUT /rental/status - Update rental item status"""
    # Find the rented item
    items = await uow.rented_items.get_all_with_items(skip=0, limit=10000)
    target_item = None
    for item in items:
        if item.item_id == data.item_id:
            target_item = item
            break

    if not target_item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Rented item not found",
        )

    # Update status and related fields
    update_data = {"status": data.status}
    if data.customer_name:
        update_data["customer_name"] = data.customer_name
    if data.customer_phone:
        update_data["customer_phone"] = data.customer_phone
    if data.customer_id_number:
        update_data["customer_id_number"] = data.customer_id_number
    if data.given_date:
        update_data["given_date"] = data.given_date
    if data.expected_return_date:
        update_data["expected_return_date"] = data.expected_return_date
    if data.actual_return_date:
        update_data["actual_return_date"] = data.actual_return_date

    await uow.rented_items.update(target_item, update_data)
    await uow.commit()

    return target_item.to_dict()


@router.post("/borrow")
async def borrow_to_main(
    data: RentalBorrowRequest,
    uow: UOW,
    current_user: CurrentUser,
):
    """POST /rental/borrow - Borrow from rental to main warehouse"""
    # Check rental warehouse availability
    rental_loc = await uow.rental_locations.get_by_item_and_location(data.item_id)
    if not rental_loc or rental_loc.available_quantity < data.quantity:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Insufficient quantity in rental warehouse",
        )

    # Update rental warehouse
    rental_loc.available_quantity -= data.quantity
    rental_loc.reserved_quantity += data.quantity

    # Add to main warehouse (default location)
    await uow.item_locations.add_quantity(
        data.item_id,
        "MAIN",  # Default main warehouse location
        data.quantity,
    )

    await uow.commit()

    return {
        "status": "success",
        "message": f"Borrowed {data.quantity} items to main warehouse",
        "item_id": data.item_id,
        "quantity": data.quantity,
    }


@router.post("/return")
async def return_items(
    data: RentalReturnRequest,
    uow: UOW,
    current_user: CurrentUser,
):
    """POST /rental/return - Return rental items"""
    # Update rental warehouse
    rental_loc = await uow.rental_locations.get_by_item_and_location(data.item_id)
    if rental_loc:
        rental_loc.quantity += data.quantity
        rental_loc.available_quantity += data.quantity
    else:
        await uow.rental_locations.add_quantity(data.item_id, data.quantity)

    await uow.commit()

    return {
        "status": "success",
        "message": f"Returned {data.quantity} items",
        "item_id": data.item_id,
        "quantity": data.quantity,
    }


@router.get("/items")
async def get_rented_items(
    uow: UOW,
    current_user: CurrentUser,
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100),
    all: bool = Query(False),
):
    """GET /rental/items - Get all rented items"""
    if all:
        items = await uow.rented_items.get_all_with_items(skip=0, limit=10000)
        total = len(items)
        return {
            "items": [i.to_dict() for i in items],
            "page": 1,
            "page_size": total,
            "total_pages": 1,
            "total_items": total,
            "all": True,
        }

    total = await uow.rented_items.count()
    skip = (page - 1) * page_size
    items = await uow.rented_items.get_all_with_items(skip=skip, limit=page_size)

    total_pages = (total + page_size - 1) // page_size

    return {
        "items": [i.to_dict() for i in items],
        "page": page,
        "page_size": page_size,
        "total_pages": total_pages,
        "total_items": total,
        "all": False,
    }


@router.get("/warehouse")
async def get_rental_warehouse(
    uow: UOW,
    current_user: CurrentUser,
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100),
    all: bool = Query(False),
):
    """GET /rental/warehouse - Get rental warehouse inventory"""
    if all:
        locations = await uow.rental_locations.get_all_with_items(skip=0, limit=10000)
        total = len(locations)
        return {
            "items": [loc.to_dict() for loc in locations],
            "page": 1,
            "page_size": total,
            "total_pages": 1,
            "total_items": total,
            "all": True,
        }

    total = await uow.rental_locations.count()
    skip = (page - 1) * page_size
    locations = await uow.rental_locations.get_all_with_items(skip=skip, limit=page_size)

    total_pages = (total + page_size - 1) // page_size

    return {
        "items": [loc.to_dict() for loc in locations],
        "page": page,
        "page_size": page_size,
        "total_pages": total_pages,
        "total_items": total,
        "all": False,
    }


@router.get("/missing-qty/{invoice_id}")
async def get_missing_quantity(
    invoice_id: int,
    uow: UOW,
    current_user: CurrentUser,
):
    """GET /rental/missing-qty/<id> - Get booking deduction details"""
    # Get booking deductions for this invoice
    deductions = await uow.booking_deductions.get_by_booking_invoice(invoice_id)

    results = []
    for deduction in deductions:
        item = await uow.warehouse.get(deduction.item_id)
        results.append({
            "booking_invoice_id": deduction.booking_invoice_id,
            "item_id": deduction.item_id,
            "item_name": item.item_name if item else None,
            "original_quantity": deduction.quantity_deducted,
            "borrowed_quantity": deduction.quantity_deducted,
            "remaining_quantity": 0,  # Already deducted
        })

    return results
