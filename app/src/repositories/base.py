from typing import TypeVar, Generic, Type, Any, Sequence

from sqlalchemy import select, func, delete, update
from sqlalchemy.ext.asyncio import AsyncSession

from src.models.base import Base

ModelType = TypeVar("ModelType", bound=Base)


class BaseRepository(Generic[ModelType]):
    """
    Base repository with common CRUD operations.

    All database operations use select() and session.scalars() as requested.
    """

    def __init__(self, model: Type[ModelType], session: AsyncSession):
        self.model = model
        self.session = session

    async def get(self, id: int) -> ModelType | None:
        """Get a single record by ID"""
        stmt = select(self.model).where(self.model.id == id)
        result = await self.session.scalars(stmt)
        return result.first()

    async def get_by_ids(self, ids: list[int]) -> Sequence[ModelType]:
        """Get multiple records by IDs"""
        stmt = select(self.model).where(self.model.id.in_(ids))
        result = await self.session.scalars(stmt)
        return result.all()

    async def get_all(
        self,
        skip: int = 0,
        limit: int = 100,
        order_by: str = "id",
        descending: bool = True,
    ) -> Sequence[ModelType]:
        """Get all records with pagination"""
        column = getattr(self.model, order_by)
        stmt = (
            select(self.model)
            .order_by(column.desc() if descending else column.asc())
            .offset(skip)
            .limit(limit)
        )
        result = await self.session.scalars(stmt)
        return result.all()

    async def get_all_no_limit(self) -> Sequence[ModelType]:
        """Get all records without pagination"""
        stmt = select(self.model).order_by(self.model.id.desc())
        result = await self.session.scalars(stmt)
        return result.all()

    async def count(self, filters: dict[str, Any] | None = None) -> int:
        """Count records with optional filters"""
        stmt = select(func.count()).select_from(self.model)
        if filters:
            for key, value in filters.items():
                if hasattr(self.model, key):
                    stmt = stmt.where(getattr(self.model, key) == value)
        result = await self.session.execute(stmt)
        return result.scalar() or 0

    async def exists(self, id: int) -> bool:
        """Check if a record exists by ID"""
        stmt = select(func.count()).select_from(self.model).where(self.model.id == id)
        result = await self.session.execute(stmt)
        return (result.scalar() or 0) > 0

    async def create(self, data: dict[str, Any]) -> ModelType:
        """Create a new record"""
        obj = self.model(**data)
        self.session.add(obj)
        await self.session.flush()
        await self.session.refresh(obj)
        return obj

    async def update(self, obj: ModelType, data: dict[str, Any]) -> ModelType:
        """Update an existing record"""
        for key, value in data.items():
            if hasattr(obj, key) and value is not None:
                setattr(obj, key, value)
        await self.session.flush()
        await self.session.refresh(obj)
        return obj

    async def update_by_id(self, id: int, data: dict[str, Any]) -> ModelType | None:
        """Update a record by ID"""
        obj = await self.get(id)
        if obj:
            return await self.update(obj, data)
        return None

    async def delete(self, obj: ModelType) -> None:
        """Delete a record"""
        await self.session.delete(obj)
        await self.session.flush()

    async def delete_by_id(self, id: int) -> bool:
        """Delete a record by ID"""
        obj = await self.get(id)
        if obj:
            await self.delete(obj)
            return True
        return False

    async def bulk_create(self, data_list: list[dict[str, Any]]) -> list[ModelType]:
        """Bulk create records"""
        objects = [self.model(**data) for data in data_list]
        self.session.add_all(objects)
        await self.session.flush()
        return objects

    async def bulk_delete(self, ids: list[int]) -> int:
        """Bulk delete records by IDs"""
        stmt = delete(self.model).where(self.model.id.in_(ids))
        result = await self.session.execute(stmt)
        await self.session.flush()
        return result.rowcount
