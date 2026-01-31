from typing import Sequence

from sqlalchemy import select
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession

from src.models.user import Employee
from src.models.role import Role
from src.repositories.base import BaseRepository


class UserRepository(BaseRepository[Employee]):
    """Repository for Employee/User operations"""

    def __init__(self, session: AsyncSession):
        super().__init__(Employee, session)

    async def get_by_username(self, username: str) -> Employee | None:
        """Get user by username"""
        stmt = select(Employee).where(Employee.username == username)
        result = await self.session.scalars(stmt)
        return result.first()

    async def get_with_roles(self, id: int) -> Employee | None:
        """Get user with roles eagerly loaded"""
        stmt = (
            select(Employee)
            .options(selectinload(Employee.roles).selectinload(Role.permissions))
            .where(Employee.id == id)
        )
        result = await self.session.scalars(stmt)
        return result.first()

    async def get_by_username_with_roles(self, username: str) -> Employee | None:
        """Get user by username with roles eagerly loaded"""
        stmt = (
            select(Employee)
            .options(selectinload(Employee.roles).selectinload(Role.permissions))
            .where(Employee.username == username)
        )
        result = await self.session.scalars(stmt)
        return result.first()

    async def get_all_with_roles(
        self,
        skip: int = 0,
        limit: int = 100,
    ) -> Sequence[Employee]:
        """Get all users with roles"""
        stmt = (
            select(Employee)
            .options(selectinload(Employee.roles).selectinload(Role.permissions))
            .order_by(Employee.id.desc())
            .offset(skip)
            .limit(limit)
        )
        result = await self.session.scalars(stmt)
        return result.all()

    async def username_exists(self, username: str) -> bool:
        """Check if username already exists"""
        user = await self.get_by_username(username)
        return user is not None

    async def assign_roles(self, user: Employee, role_ids: list[int]) -> Employee:
        """Assign roles to a user"""
        # Clear existing roles
        user.roles.clear()

        # Fetch and assign new roles
        if role_ids:
            stmt = select(Role).where(Role.id.in_(role_ids))
            result = await self.session.scalars(stmt)
            roles = result.all()
            user.roles.extend(roles)

        await self.session.flush()
        await self.session.refresh(user)
        return user

    async def add_role(self, user: Employee, role: Role) -> Employee:
        """Add a single role to user"""
        if role not in user.roles:
            user.roles.append(role)
            await self.session.flush()
        return user

    async def remove_role(self, user: Employee, role: Role) -> Employee:
        """Remove a single role from user"""
        if role in user.roles:
            user.roles.remove(role)
            await self.session.flush()
        return user
