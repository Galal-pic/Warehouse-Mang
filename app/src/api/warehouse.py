from fastapi import APIRouter, HTTPException, status, Query, UploadFile, File, BackgroundTasks

from src.api.deps import UOW, CurrentUser
from src.schemas.warehouse import (
    WarehouseCreate,
    WarehouseUpdate,
    WarehouseResponse,
    WarehouseListResponse,
    CacheStatusResponse,
)
from src.schemas.common import MessageResponse
from src.core.cache import cache

router = APIRouter(prefix="/warehouse", tags=["Warehouse"])


def serialize_warehouse(item) -> dict:
    """Serialize warehouse item for list view"""
    return {
        "id": item.id,
        "item_name": item.item_name,
        "item_bar": item.item_bar,
        "locations": [
            {
                "location": loc.location,
                "quantity": loc.quantity,
            }
            for loc in item.item_locations
        ],
    }


def serialize_warehouse_detail(item) -> dict:
    """Serialize warehouse item with full details"""
    return {
        "id": item.id,
        "item_name": item.item_name,
        "item_bar": item.item_bar,
        "created_at": item.created_at.strftime("%Y-%m-%d %H:%M:%S") if item.created_at else None,
        "updated_at": item.updated_at.strftime("%Y-%m-%d %H:%M:%S") if item.updated_at else None,
        "locations": [
            {
                "location": loc.location,
                "quantity": loc.quantity,
            }
            for loc in item.item_locations
        ],
    }


@router.get("/", response_model=WarehouseListResponse)
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
            "warehouses": [serialize_warehouse(item) for item in items],
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
        "warehouses": [serialize_warehouse(item) for item in items],
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

    # Rename locations: qty is the stable identifier, location name is the desired new name
    if data.locations is not None:
        for loc in data.locations:
            match = await uow.item_locations.get_by_item_and_quantity(item_id, loc.quantity)
            if not match:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"No location found with quantity {loc.quantity} for this item",
                )
            if match.location == loc.location:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Location '{loc.location}' already exists with quantity {loc.quantity}",
                )
            # Rename: delete old row, create new with same quantity
            await uow.session.delete(match)
            await uow.session.flush()
            await uow.item_locations.create({
                "item_id": item_id,
                "location": loc.location,
                "quantity": loc.quantity,
            })

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
    background: BackgroundTasks = None,
    current_user: CurrentUser = None,
):
    """POST /warehouse/excel - Import items from Excel or CSV via COPY upsert"""
    import pandas as pd
    from src.core.bulk_import import parse_upload, upsert_warehouse, create_addition_invoices_bg

    contents = await file.read()
    df = parse_upload(contents, file.filename)

    # Normalise column names
    df.rename(columns={"name": "item_name", "barcode": "item_bar"}, inplace=True)
    df = df.dropna(subset=["item_name", "item_bar"])
    df["item_name"] = df["item_name"].astype(str).str.strip()
    df["item_bar"] = df["item_bar"].astype(str).str.strip()
    df = df[df["item_name"].ne("") & df["item_bar"].ne("")]
    df = df.drop_duplicates(subset=["item_bar"], keep="last")

    # Normalise price column: accept either unit_price or price_unit
    # to_numeric coerces non-numeric junk like "-" or "—" to NaN before filling 0
    if "price_unit" in df.columns and "unit_price" not in df.columns:
        df.rename(columns={"price_unit": "unit_price"}, inplace=True)
    if "unit_price" not in df.columns:
        df["unit_price"] = 0.0
    df["unit_price"] = pd.to_numeric(df["unit_price"], errors="coerce").fillna(0)

    # Pick up quantity / location from Excel if present, else defaults
    if "quantity" not in df.columns:
        df["quantity"] = 1
    else:
        df["quantity"] = df["quantity"].fillna(1).astype(int)
    if "location" not in df.columns:
        df["location"] = "المخزن"
    else:
        df["location"] = df["location"].astype(str).str.strip()
        df.loc[df["location"] == "", "location"] = "المخزن"

    # Upsert warehouse items (COPY — fast, commits immediately)
    records = list(map(tuple, df[["item_name", "item_bar"]].values))
    created, updated = await upsert_warehouse(records)

    await cache.delete_pattern("warehouse_*")

    # Schedule اضافه invoices in background — zero impact on response time
    items_for_invoice = [
        {"item_bar": bar, "unit_price": float(price), "quantity": int(qty), "location": loc}
        for bar, price, qty, loc in df[["item_bar", "unit_price", "quantity", "location"]].values
    ]
    background.add_task(
        create_addition_invoices_bg,
        items_for_invoice,
        current_user.id,
        current_user.username,
    )

    return {"created": created, "updated": updated}
