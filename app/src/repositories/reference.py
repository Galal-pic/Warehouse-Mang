from typing import Sequence

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.models.reference import Supplier, Machine, Mechanism
from src.repositories.base import BaseRepository


class SupplierRepository(BaseRepository[Supplier]):
    """Repository for Supplier operations"""

    def __init__(self, session: AsyncSession):
        super().__init__(Supplier, session)

    async def get_by_name(self, name: str) -> Supplier | None:
        """Get supplier by name"""
        stmt = select(Supplier).where(Supplier.name == name)
        result = await self.session.scalars(stmt)
        return result.first()

    async def search_by_name(
        self,
        name: str,
        skip: int = 0,
        limit: int = 100,
    ) -> Sequence[Supplier]:
        """Search suppliers by name"""
        stmt = (
            select(Supplier)
            .where(Supplier.name.ilike(f"%{name}%"))
            .order_by(Supplier.name)
            .offset(skip)
            .limit(limit)
        )
        result = await self.session.scalars(stmt)
        return result.all()

    async def name_exists(self, name: str) -> bool:
        """Check if supplier name exists"""
        supplier = await self.get_by_name(name)
        return supplier is not None


class MachineRepository(BaseRepository[Machine]):
    """Repository for Machine operations"""

    def __init__(self, session: AsyncSession):
        super().__init__(Machine, session)

    async def get_by_name(self, name: str) -> Machine | None:
        """Get machine by name"""
        stmt = select(Machine).where(Machine.name == name)
        result = await self.session.scalars(stmt)
        return result.first()

    async def search_by_name(
        self,
        name: str,
        skip: int = 0,
        limit: int = 100,
    ) -> Sequence[Machine]:
        """Search machines by name"""
        stmt = (
            select(Machine)
            .where(Machine.name.ilike(f"%{name}%"))
            .order_by(Machine.name)
            .offset(skip)
            .limit(limit)
        )
        result = await self.session.scalars(stmt)
        return result.all()

    async def name_exists(self, name: str) -> bool:
        """Check if machine name exists"""
        machine = await self.get_by_name(name)
        return machine is not None


class MechanismRepository(BaseRepository[Mechanism]):
    """Repository for Mechanism operations"""

    def __init__(self, session: AsyncSession):
        super().__init__(Mechanism, session)

    async def get_by_name(self, name: str) -> Mechanism | None:
        """Get mechanism by name"""
        stmt = select(Mechanism).where(Mechanism.name == name)
        result = await self.session.scalars(stmt)
        return result.first()

    async def search_by_name(
        self,
        name: str,
        skip: int = 0,
        limit: int = 100,
    ) -> Sequence[Mechanism]:
        """Search mechanisms by name"""
        stmt = (
            select(Mechanism)
            .where(Mechanism.name.ilike(f"%{name}%"))
            .order_by(Mechanism.name)
            .offset(skip)
            .limit(limit)
        )
        result = await self.session.scalars(stmt)
        return result.all()

    async def name_exists(self, name: str) -> bool:
        """Check if mechanism name exists"""
        mechanism = await self.get_by_name(name)
        return mechanism is not None
