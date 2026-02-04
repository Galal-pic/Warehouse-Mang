from fastapi import APIRouter, HTTPException, status, Query, UploadFile, File

from src.api.deps import UOW, CurrentUser
from src.schemas.reference import MechanismCreate, MechanismUpdate, MechanismResponse, MechanismListResponse
from src.schemas.common import MessageResponse
from src.core.cache import cache

router = APIRouter(prefix="/mechanism", tags=["Mechanisms"])


@router.get("/", response_model=MechanismListResponse)
async def list_mechanisms(
    uow: UOW,
    current_user: CurrentUser,
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100),
    all: bool = Query(False),
):
    """GET /mechanisms/ - List mechanisms with pagination"""
    cache_key = f"mechanisms_list:{page}:{page_size}:{all}"
    cached = await cache.get(cache_key)
    if cached:
        return cached

    if all:
        mechanisms = await uow.mechanisms.get_all_no_limit()
        total = len(mechanisms)
        result = {
            "mechanisms": [m.to_dict() for m in mechanisms],
            "page": 1,
            "page_size": total,
            "total_pages": 1,
            "total_items": total,
            "all": True,
        }
        await cache.set(cache_key, result)
        return result

    total = await uow.mechanisms.count()
    skip = (page - 1) * page_size
    mechanisms = await uow.mechanisms.get_all(skip=skip, limit=page_size)

    total_pages = (total + page_size - 1) // page_size
    result = {
        "mechanisms": [m.to_dict() for m in mechanisms],
        "page": page,
        "page_size": page_size,
        "total_pages": total_pages,
        "total_items": total,
        "all": False,
    }

    await cache.set(cache_key, result)
    return result


@router.post("/", response_model=MechanismResponse)
async def create_mechanism(
    data: MechanismCreate,
    uow: UOW,
    current_user: CurrentUser,
):
    """POST /mechanisms/ - Create mechanism"""
    mechanism = await uow.mechanisms.create({
        "name": data.name,
        "description": data.description,
    })
    await uow.commit()
    await cache.delete_pattern("mechanisms_*")
    return mechanism.to_dict()


@router.get("/{mechanism_id}", response_model=MechanismResponse)
async def get_mechanism(
    mechanism_id: int,
    uow: UOW,
    current_user: CurrentUser,
):
    """GET /mechanisms/<id> - Get mechanism"""
    cache_key = f"mechanism:{mechanism_id}"
    cached = await cache.get(cache_key)
    if cached:
        return cached

    mechanism = await uow.mechanisms.get(mechanism_id)
    if not mechanism:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Mechanism not found",
        )

    result = mechanism.to_dict()
    await cache.set(cache_key, result)
    return result


@router.put("/{mechanism_id}", response_model=MechanismResponse)
async def update_mechanism(
    mechanism_id: int,
    data: MechanismUpdate,
    uow: UOW,
    current_user: CurrentUser,
):
    """PUT /mechanisms/<id> - Update mechanism"""
    mechanism = await uow.mechanisms.get(mechanism_id)
    if not mechanism:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Mechanism not found",
        )

    update_data = {}
    if data.name is not None:
        update_data["name"] = data.name
    if data.description is not None:
        update_data["description"] = data.description

    if update_data:
        await uow.mechanisms.update(mechanism, update_data)

    await uow.commit()
    await cache.delete_pattern("mechanisms_*")
    await cache.delete(f"mechanism:{mechanism_id}")

    return mechanism.to_dict()


@router.delete("/{mechanism_id}", response_model=MessageResponse)
async def delete_mechanism(
    mechanism_id: int,
    uow: UOW,
    current_user: CurrentUser,
):
    """DELETE /mechanisms/<id> - Delete mechanism"""
    mechanism = await uow.mechanisms.get(mechanism_id)
    if not mechanism:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Mechanism not found",
        )

    await uow.mechanisms.delete(mechanism)
    await uow.commit()
    await cache.delete_pattern("mechanisms_*")

    return MessageResponse(message="Mechanism deleted successfully")


@router.post("/excel")
async def import_from_excel(
    file: UploadFile = File(...),
    uow: UOW = None,
    current_user: CurrentUser = None,
):
    """POST /mechanisms/excel - Import mechanisms from Excel or CSV via COPY"""
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

    async with async_session_maker() as session:
        result = await session.execute(text("SELECT name FROM mechanism"))
        existing_names = {row[0] for row in result.fetchall()}

    records = list(df[["name", "description"]].itertuples(index=False, name=None))
    created = await copy_reference("mechanism", existing_names, records)

    await cache.delete_pattern("mechanisms_*")
    return {"created": created}
