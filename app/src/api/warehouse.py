from fastapi import APIRouter, HTTPException, status, Query, UploadFile, File

from src.api.deps import UOW, CurrentUser
from src.schemas.warehouse import (
    WarehouseCreate,
    WarehouseUpdate,
    WarehouseResponse,
    CacheStatusResponse,
)
from src.schemas.common import PaginatedResponse, MessageResponse
from src.core.cache import cache

router = APIRouter(prefix="/warehouse", tags=["Warehouse"])


def serialize_warehouse(item) -> dict:
    """Serialize warehouse item"""
    return {
        "id": item.id,
        "item_name": item.item_name,
        "item_bar": item.item_bar,
        "created_at": item.created_at.strftime("%Y-%m-%d %H:%M:%S") if item.created_at else None,
        "updated_at": item.updated_at.strftime("%Y-%m-%d %H:%M:%S") if item.updated_at else None,
        "locations": [
            {
                "item_id": loc.item_id,
                "location": loc.location,
                "quantity": loc.quantity,
            }
            for loc in item.item_locations
        ],
    }


@router.get("/")
async def list_warehouse_items(
    uow: UOW,
    current_user: CurrentUser,
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100),
    all: bool = Query(False),
):
    """GET /warehouse/ - List warehouse items with pagination"""
    # Try cache first
    cache_key = f"warehouse_list:{page}:{page_size}:{all}"
    cached = await cache.get(cache_key)
    if cached:
        return cached

    if all:
        items = await uow.warehouse.get_all_with_locations(skip=0, limit=10000)
        total = len(items)
        result = {
            "items": [serialize_warehouse(item) for item in items],
            "page": 1,
            "page_size": total,
            "total_pages": 1,
            "total_items": total,
            "all": True,
        }
        await cache.set(cache_key, result)
        return result

    total = await uow.warehouse.count()
    skip = (page - 1) * page_size
    items = await uow.warehouse.get_all_with_locations(skip=skip, limit=page_size)

    total_pages = (total + page_size - 1) // page_size
    result = {
        "items": [serialize_warehouse(item) for item in items],
        "page": page,
        "page_size": page_size,
        "total_pages": total_pages,
        "total_items": total,
        "all": False,
    }

    await cache.set(cache_key, result)
    return result


@router.post("/")
async def create_warehouse_item(
    data: WarehouseCreate,
    uow: UOW,
    current_user: CurrentUser,
):
    """POST /warehouse/ - Create warehouse item"""
    # Check if barcode exists
    if await uow.warehouse.barcode_exists(data.item_bar):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Barcode already exists",
        )

    # Create item
    item = await uow.warehouse.create({
        "item_name": data.item_name,
        "item_bar": data.item_bar,
    })

    # Create locations
    for loc in data.locations:
        await uow.item_locations.create({
            "item_id": item.id,
            "location": loc.location,
            "quantity": loc.quantity,
        })

    await uow.commit()

    # Clear cache
    await cache.delete_pattern("warehouse_list:*")

    item = await uow.warehouse.get_with_locations(item.id)
    return serialize_warehouse(item)


@router.get("/cache/clear", response_model=MessageResponse)
async def clear_cache(current_user: CurrentUser):
    """POST /warehouse/cache/clear - Clear warehouse cache"""
    await cache.delete_pattern("warehouse_*")
    return MessageResponse(message="Cache cleared")


@router.get("/cache/status", response_model=CacheStatusResponse)
async def get_cache_status(current_user: CurrentUser):
    """GET /warehouse/cache/status - Get cache status"""
    status_info = await cache.get_status()
    return CacheStatusResponse(**status_info)


@router.get("/{item_id}")
async def get_warehouse_item(
    item_id: int,
    uow: UOW,
    current_user: CurrentUser,
):
    """GET /warehouse/<id> - Get warehouse item"""
    # Try cache
    cache_key = f"warehouse_item:{item_id}"
    cached = await cache.get(cache_key)
    if cached:
        return cached

    item = await uow.warehouse.get_with_locations(item_id)
    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Item not found",
        )

    result = serialize_warehouse(item)
    await cache.set(cache_key, result)
    return result


@router.put("/{item_id}")
async def update_warehouse_item(
    item_id: int,
    data: WarehouseUpdate,
    uow: UOW,
    current_user: CurrentUser,
):
    """PUT /warehouse/<id> - Update warehouse item"""
    item = await uow.warehouse.get(item_id)
    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Item not found",
        )

    # Check barcode uniqueness if changing
    if data.item_bar and data.item_bar != item.item_bar:
        if await uow.warehouse.barcode_exists(data.item_bar):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Barcode already exists",
            )

    update_data = {}
    if data.item_name:
        update_data["item_name"] = data.item_name
    if data.item_bar:
        update_data["item_bar"] = data.item_bar

    if update_data:
        await uow.warehouse.update(item, update_data)

    await uow.commit()

    # Clear cache
    await cache.delete_pattern("warehouse_*")

    item = await uow.warehouse.get_with_locations(item_id)
    return serialize_warehouse(item)


@router.delete("/{item_id}")
async def delete_warehouse_item(
    item_id: int,
    uow: UOW,
    current_user: CurrentUser,
):
    """DELETE /warehouse/<id> - Delete warehouse item"""
    item = await uow.warehouse.get(item_id)
    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Item not found",
        )

    await uow.warehouse.delete(item)
    await uow.commit()

    # Clear cache
    await cache.delete_pattern("warehouse_*")

    return MessageResponse(message="Item deleted successfully")


@router.post("/excel")
async def import_from_excel(
    file: UploadFile = File(...),
    uow: UOW = None,
    current_user: CurrentUser = None,
):
    """POST /warehouse/excel - Import items from Excel"""
    import pandas as pd
    from io import BytesIO

    # Read Excel file
    contents = await file.read()
    df = pd.read_excel(BytesIO(contents))

    created_count = 0
    updated_count = 0
    errors = []

    for _, row in df.iterrows():
        try:
            item_name = str(row.get("item_name", row.get("name", "")))
            item_bar = str(row.get("item_bar", row.get("barcode", "")))

            if not item_name or not item_bar:
                continue

            existing = await uow.warehouse.get_by_barcode(item_bar)
            if existing:
                await uow.warehouse.update(existing, {"item_name": item_name})
                updated_count += 1
            else:
                await uow.warehouse.create({
                    "item_name": item_name,
                    "item_bar": item_bar,
                })
                created_count += 1
        except Exception as e:
            errors.append(str(e))

    await uow.commit()

    # Clear cache
    await cache.delete_pattern("warehouse_*")

    return {
        "created": created_count,
        "updated": updated_count,
        "errors": errors[:10],  # Limit errors in response
    }
