from fastapi import APIRouter, HTTPException, status, Query, UploadFile, File

from src.api.deps import UOW, CurrentUser
from src.schemas.reference import MachineCreate, MachineUpdate, MachineResponse, MachineListResponse
from src.schemas.common import MessageResponse
from src.core.cache import cache

router = APIRouter(prefix="/machine", tags=["Machines"])


@router.get("/", response_model=MachineListResponse)
async def list_machines(
    uow: UOW,
    current_user: CurrentUser,
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100),
    all: bool = Query(False),
):
    """GET /machines/ - List machines with pagination"""
    cache_key = f"machines_list:{page}:{page_size}:{all}"
    cached = await cache.get(cache_key)
    if cached:
        return cached

    if all:
        machines = await uow.machines.get_all_no_limit()
        total = len(machines)
        result = {
            "machines": [m.to_dict() for m in machines],
            "page": 1,
            "page_size": total,
            "total_pages": 1,
            "total_items": total,
            "all": True,
        }
        await cache.set(cache_key, result)
        return result

    total = await uow.machines.count()
    skip = (page - 1) * page_size
    machines = await uow.machines.get_all(skip=skip, limit=page_size)

    total_pages = (total + page_size - 1) // page_size
    result = {
        "machines": [m.to_dict() for m in machines],
        "page": page,
        "page_size": page_size,
        "total_pages": total_pages,
        "total_items": total,
        "all": False,
    }

    await cache.set(cache_key, result)
    return result


@router.post("/", response_model=MachineResponse)
async def create_machine(
    data: MachineCreate,
    uow: UOW,
    current_user: CurrentUser,
):
    """POST /machines/ - Create machine"""
    machine = await uow.machines.create({
        "name": data.name,
        "description": data.description,
    })
    await uow.commit()
    await cache.delete_pattern("machines_*")
    return machine.to_dict()


@router.get("/{machine_id}", response_model=MachineResponse)
async def get_machine(
    machine_id: int,
    uow: UOW,
    current_user: CurrentUser,
):
    """GET /machines/<id> - Get machine"""
    cache_key = f"machine:{machine_id}"
    cached = await cache.get(cache_key)
    if cached:
        return cached

    machine = await uow.machines.get(machine_id)
    if not machine:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Machine not found",
        )

    result = machine.to_dict()
    await cache.set(cache_key, result)
    return result


@router.put("/{machine_id}", response_model=MachineResponse)
async def update_machine(
    machine_id: int,
    data: MachineUpdate,
    uow: UOW,
    current_user: CurrentUser,
):
    """PUT /machines/<id> - Update machine"""
    machine = await uow.machines.get(machine_id)
    if not machine:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Machine not found",
        )

    update_data = {}
    if data.name is not None:
        update_data["name"] = data.name
    if data.description is not None:
        update_data["description"] = data.description

    if update_data:
        await uow.machines.update(machine, update_data)

    await uow.commit()
    await cache.delete_pattern("machines_*")
    await cache.delete(f"machine:{machine_id}")

    return machine.to_dict()


@router.delete("/{machine_id}", response_model=MessageResponse)
async def delete_machine(
    machine_id: int,
    uow: UOW,
    current_user: CurrentUser,
):
    """DELETE /machines/<id> - Delete machine"""
    machine = await uow.machines.get(machine_id)
    if not machine:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Machine not found",
        )

    await uow.machines.delete(machine)
    await uow.commit()
    await cache.delete_pattern("machines_*")

    return MessageResponse(message="Machine deleted successfully")


@router.post("/excel")
async def import_from_excel(
    file: UploadFile = File(...),
    uow: UOW = None,
    current_user: CurrentUser = None,
):
    """POST /machines/excel - Import machines from Excel"""
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

            existing = await uow.machines.get_by_name(name)
            if not existing:
                await uow.machines.create({
                    "name": name,
                    "description": description,
                })
                created_count += 1
        except Exception as e:
            errors.append(str(e))

    await uow.commit()
    await cache.delete_pattern("machines_*")

    return {
        "created": created_count,
        "errors": errors[:10],
    }
