from fastapi import APIRouter, HTTPException, status, Query, UploadFile, File

from src.api.deps import UOW, CurrentUser
from src.schemas.reference import SupplierCreate, SupplierUpdate, SupplierResponse
from src.schemas.common import PaginatedResponse, MessageResponse
from src.core.cache import cache

router = APIRouter(prefix="/suppliers", tags=["Suppliers"])


@router.get("/")
async def list_suppliers(
    uow: UOW,
    current_user: CurrentUser,
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100),
    all: bool = Query(False),
):
    """GET /suppliers/ - List suppliers with pagination"""
    cache_key = f"suppliers_list:{page}:{page_size}:{all}"
    cached = await cache.get(cache_key)
    if cached:
        return cached

    if all:
        suppliers = await uow.suppliers.get_all_no_limit()
        total = len(suppliers)
        result = {
            "items": [s.to_dict() for s in suppliers],
            "page": 1,
            "page_size": total,
            "total_pages": 1,
            "total_items": total,
            "all": True,
        }
        await cache.set(cache_key, result)
        return result

    total = await uow.suppliers.count()
    skip = (page - 1) * page_size
    suppliers = await uow.suppliers.get_all(skip=skip, limit=page_size)

    total_pages = (total + page_size - 1) // page_size
    result = {
        "items": [s.to_dict() for s in suppliers],
        "page": page,
        "page_size": page_size,
        "total_pages": total_pages,
        "total_items": total,
        "all": False,
    }

    await cache.set(cache_key, result)
    return result


@router.post("/", response_model=SupplierResponse)
async def create_supplier(
    data: SupplierCreate,
    uow: UOW,
    current_user: CurrentUser,
):
    """POST /suppliers/ - Create supplier"""
    supplier = await uow.suppliers.create({
        "name": data.name,
        "description": data.description,
    })
    await uow.commit()
    await cache.delete_pattern("suppliers_*")
    return supplier.to_dict()


@router.get("/{supplier_id}", response_model=SupplierResponse)
async def get_supplier(
    supplier_id: int,
    uow: UOW,
    current_user: CurrentUser,
):
    """GET /suppliers/<id> - Get supplier"""
    cache_key = f"supplier:{supplier_id}"
    cached = await cache.get(cache_key)
    if cached:
        return cached

    supplier = await uow.suppliers.get(supplier_id)
    if not supplier:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Supplier not found",
        )

    result = supplier.to_dict()
    await cache.set(cache_key, result)
    return result


@router.put("/{supplier_id}", response_model=SupplierResponse)
async def update_supplier(
    supplier_id: int,
    data: SupplierUpdate,
    uow: UOW,
    current_user: CurrentUser,
):
    """PUT /suppliers/<id> - Update supplier"""
    supplier = await uow.suppliers.get(supplier_id)
    if not supplier:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Supplier not found",
        )

    update_data = {}
    if data.name is not None:
        update_data["name"] = data.name
    if data.description is not None:
        update_data["description"] = data.description

    if update_data:
        await uow.suppliers.update(supplier, update_data)

    await uow.commit()
    await cache.delete_pattern("suppliers_*")
    await cache.delete(f"supplier:{supplier_id}")

    return supplier.to_dict()


@router.delete("/{supplier_id}", response_model=MessageResponse)
async def delete_supplier(
    supplier_id: int,
    uow: UOW,
    current_user: CurrentUser,
):
    """DELETE /suppliers/<id> - Delete supplier"""
    supplier = await uow.suppliers.get(supplier_id)
    if not supplier:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Supplier not found",
        )

    await uow.suppliers.delete(supplier)
    await uow.commit()
    await cache.delete_pattern("suppliers_*")

    return MessageResponse(message="Supplier deleted successfully")


@router.post("/excel")
async def import_from_excel(
    file: UploadFile = File(...),
    uow: UOW = None,
    current_user: CurrentUser = None,
):
    """POST /suppliers/excel - Import suppliers from Excel"""
    import pandas as pd
    from io import BytesIO

    contents = await file.read()
    df = pd.read_excel(BytesIO(contents))

    created_count = 0
    errors = []

    for _, row in df.iterrows():
        try:
            name = str(row.get("name", ""))
            description = str(row.get("description", "")) if "description" in row else None

            if not name:
                continue

            existing = await uow.suppliers.get_by_name(name)
            if not existing:
                await uow.suppliers.create({
                    "name": name,
                    "description": description,
                })
                created_count += 1
        except Exception as e:
            errors.append(str(e))

    await uow.commit()
    await cache.delete_pattern("suppliers_*")

    return {
        "created": created_count,
        "errors": errors[:10],
    }
