"""Tests for user repository"""

import pytest
import pytest_asyncio

from src.repositories import UnitOfWork
from src.models import Employee
from src.core.security import hash_password


class TestUserRepository:
    """Test cases for UserRepository"""

    @pytest.mark.asyncio
    async def test_create_user(self, test_uow: UnitOfWork):
        """Test creating a user"""
        user = await test_uow.users.create({
            "username": "newuser",
            "password_hash": hash_password("password123"),
            "job_name": "Developer",
            "phone_number": "9876543210",
        })
        await test_uow.commit()

        assert user is not None
        assert user.id is not None
        assert user.username == "newuser"
        assert user.job_name == "Developer"

    @pytest.mark.asyncio
    async def test_get_user(self, test_uow: UnitOfWork, test_user: Employee):
        """Test getting a user by ID"""
        user = await test_uow.users.get(test_user.id)

        assert user is not None
        assert user.id == test_user.id
        assert user.username == test_user.username

    @pytest.mark.asyncio
    async def test_get_by_username(self, test_uow: UnitOfWork, test_user: Employee):
        """Test getting a user by username"""
        user = await test_uow.users.get_by_username(test_user.username)

        assert user is not None
        assert user.username == test_user.username

    @pytest.mark.asyncio
    async def test_username_exists(self, test_uow: UnitOfWork, test_user: Employee):
        """Test checking if username exists"""
        exists = await test_uow.users.username_exists(test_user.username)
        assert exists is True

        not_exists = await test_uow.users.username_exists("nonexistentuser")
        assert not_exists is False

    @pytest.mark.asyncio
    async def test_update_user(self, test_uow: UnitOfWork, test_user: Employee):
        """Test updating a user"""
        await test_uow.users.update(test_user, {
            "job_name": "Senior Tester",
            "phone_number": "1111111111",
        })
        await test_uow.commit()

        updated = await test_uow.users.get(test_user.id)
        assert updated.job_name == "Senior Tester"
        assert updated.phone_number == "1111111111"

    @pytest.mark.asyncio
    async def test_delete_user(self, test_uow: UnitOfWork):
        """Test deleting a user"""
        user = await test_uow.users.create({
            "username": "todelete",
            "password_hash": hash_password("password"),
            "job_name": "Temp",
        })
        await test_uow.commit()

        user_id = user.id
        await test_uow.users.delete(user)
        await test_uow.commit()

        deleted = await test_uow.users.get(user_id)
        assert deleted is None

    @pytest.mark.asyncio
    async def test_get_with_roles(self, test_uow: UnitOfWork, test_admin: Employee):
        """Test getting user with roles loaded"""
        user = await test_uow.users.get_with_roles(test_admin.id)

        assert user is not None
        assert len(user.roles) > 0
        assert user.roles[0].name == "admin"

    @pytest.mark.asyncio
    async def test_count(self, test_uow: UnitOfWork, test_user: Employee):
        """Test counting users"""
        count = await test_uow.users.count()
        assert count >= 1

    @pytest.mark.asyncio
    async def test_get_all_with_pagination(self, test_uow: UnitOfWork):
        """Test getting all users with pagination"""
        # Create multiple users
        for i in range(5):
            await test_uow.users.create({
                "username": f"user_{i}",
                "password_hash": hash_password("password"),
                "job_name": f"Job {i}",
            })
        await test_uow.commit()

        users = await test_uow.users.get_all(skip=0, limit=3)
        assert len(users) <= 3
