from fastapi import APIRouter, HTTPException, status, Query, UploadFile, File

from src.api.deps import UOW, CurrentUser
from src.schemas.reference import SupplierCreate, SupplierUpdate, SupplierResponse, SupplierListResponse
from src.schemas.common import MessageResponse
from src.core.cache import cache

router = APIRouter(prefix="/supplier", tags=["Suppliers"])


@router.get("/", response_model=SupplierListResponse)
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
            "suppliers": [s.to_dict() for s in suppliers],
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
        "suppliers": [s.to_dict() for s in suppliers],
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
    """POST /suppliers/excel - Import suppliers from Excel or CSV via COPY"""
    from sqlalchemy import text
    from src.core.bulk_import import parse_upload, copy_reference
    from src.database import async_session_maker

    contents = await file.read()
    df = parse_upload(contents, file.filename)

    df = df.dropna(subset=["name"])
    df["name"] = df["name"].astype(str).str.strip()
    df = df[df["name"].ne("")]
    df = df.drop_duplicates(subset=["name"], keep="last")
    if "description" not in df.columns:
        df["description"] = None
    # itertuples turns None back to NaN — force to str or None explicitly
    df["description"] = [None if x is None or (isinstance(x, float) and x != x) else str(x) for x in df["description"]]

    # Single query to fetch all existing names
    async with async_session_maker() as session:
        result = await session.execute(text("SELECT name FROM supplier"))
        existing_names = {row[0] for row in result.fetchall()}

    records = list(df[["name", "description"]].itertuples(index=False, name=None))
    created = await copy_reference("supplier", existing_names, records)

    await cache.delete_pattern("suppliers_*")
    return {"created": created}
