from typing import Sequence

from sqlalchemy import select
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession

from src.models.role import Role, Permission
from src.repositories.base import BaseRepository


class RoleRepository(BaseRepository[Role]):
    """Repository for Role operations"""

    def __init__(self, session: AsyncSession):
        super().__init__(Role, session)

    async def get_by_name(self, name: str) -> Role | None:
        """Get role by name"""
        stmt = select(Role).where(Role.name == name)
        result = await self.session.scalars(stmt)
        return result.first()

    async def get_with_permissions(self, id: int) -> Role | None:
        """Get role with permissions eagerly loaded"""
        stmt = (
            select(Role)
            .options(selectinload(Role.permissions))
            .where(Role.id == id)
        )
        result = await self.session.scalars(stmt)
        return result.first()

    async def get_all_with_permissions(self) -> Sequence[Role]:
        """Get all roles with permissions"""
        stmt = (
            select(Role)
            .options(selectinload(Role.permissions))
            .order_by(Role.id)
        )
        result = await self.session.scalars(stmt)
        return result.all()

    async def assign_permissions(
        self, role: Role, permission_ids: list[int]
    ) -> Role:
        """Assign permissions to a role"""
        # Clear existing permissions
        role.permissions.clear()

        # Fetch and assign new permissions
        if permission_ids:
            stmt = select(Permission).where(Permission.id.in_(permission_ids))
            result = await self.session.scalars(stmt)
            permissions = result.all()
            role.permissions.extend(permissions)

        await self.session.flush()
        await self.session.refresh(role)
        return role

    async def create_with_permissions(
        self, data: dict, permission_ids: list[int]
    ) -> Role:
        """Create a role with permissions"""
        role = await self.create(data)
        if permission_ids:
            await self.assign_permissions(role, permission_ids)
        return role


class PermissionRepository(BaseRepository[Permission]):
    """Repository for Permission operations"""

    def __init__(self, session: AsyncSession):
        super().__init__(Permission, session)

    async def get_by_code(self, code: str) -> Permission | None:
        """Get permission by code"""
        stmt = select(Permission).where(Permission.code == code)
        result = await self.session.scalars(stmt)
        return result.first()

    async def get_by_codes(self, codes: list[str]) -> Sequence[Permission]:
        """Get permissions by codes"""
        stmt = select(Permission).where(Permission.code.in_(codes))
        result = await self.session.scalars(stmt)
        return result.all()

    async def get_by_category(self, category: str) -> Sequence[Permission]:
        """Get permissions by category"""
        stmt = (
            select(Permission)
            .where(Permission.category == category)
            .order_by(Permission.code)
        )
        result = await self.session.scalars(stmt)
        return result.all()

    async def get_all_grouped_by_category(self) -> dict[str, list[Permission]]:
        """Get all permissions grouped by category"""
        stmt = select(Permission).order_by(Permission.category, Permission.code)
        result = await self.session.scalars(stmt)
        permissions = result.all()

        grouped: dict[str, list[Permission]] = {}
        for perm in permissions:
            if perm.category not in grouped:
                grouped[perm.category] = []
            grouped[perm.category].append(perm)

        return grouped
