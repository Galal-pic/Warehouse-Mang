"""Integration tests for auth API endpoints"""

import pytest
import pytest_asyncio
from httpx import AsyncClient

from src.models import Employee


class TestAuthAPI:
    """Test cases for auth API endpoints"""

    @pytest.mark.asyncio
    async def test_health_check(self, test_client: AsyncClient):
        """Test health check endpoint"""
        response = await test_client.get("/health")

        assert response.status_code == 200
        assert response.json()["status"] == "healthy"

    @pytest.mark.asyncio
    async def test_login_success(
        self, test_client: AsyncClient, test_user: Employee
    ):
        """Test successful login"""
        response = await test_client.post(
            "/auth/login",
            json={
                "username": test_user.username,
                "password": "testpassword",
            },
        )

        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert data["token_type"] == "bearer"

    @pytest.mark.asyncio
    async def test_login_invalid_password(
        self, test_client: AsyncClient, test_user: Employee
    ):
        """Test login with invalid password"""
        response = await test_client.post(
            "/auth/login",
            json={
                "username": test_user.username,
                "password": "wrongpassword",
            },
        )

        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_login_invalid_username(self, test_client: AsyncClient):
        """Test login with non-existent user"""
        response = await test_client.post(
            "/auth/login",
            json={
                "username": "nonexistentuser",
                "password": "password",
            },
        )

        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_get_current_user(
        self, authenticated_client: AsyncClient, test_user: Employee
    ):
        """Test getting current user info"""
        response = await authenticated_client.get("/auth/user")

        assert response.status_code == 200
        data = response.json()
        assert data["username"] == test_user.username

    @pytest.mark.asyncio
    async def test_get_current_user_unauthorized(self, test_client: AsyncClient):
        """Test getting current user without auth"""
        response = await test_client.get("/auth/user")

        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_list_users(self, authenticated_client: AsyncClient):
        """Test listing users"""
        response = await authenticated_client.get("/auth/users")

        assert response.status_code == 200
        data = response.json()
        assert "users" in data
        assert "total_items" in data

    @pytest.mark.asyncio
    async def test_list_users_pagination(self, authenticated_client: AsyncClient):
        """Test users list pagination"""
        response = await authenticated_client.get(
            "/auth/users",
            params={"page": 1, "page_size": 5},
        )

        assert response.status_code == 200
        data = response.json()
        assert data["page"] == 1
        assert data["page_size"] == 5

    @pytest.mark.asyncio
    async def test_get_user_by_id(
        self, authenticated_client: AsyncClient, test_user: Employee
    ):
        """Test getting user by ID"""
        response = await authenticated_client.get(f"/auth/user/{test_user.id}")

        assert response.status_code == 200
        data = response.json()
        assert data["id"] == test_user.id
        assert data["username"] == test_user.username

    @pytest.mark.asyncio
    async def test_get_user_not_found(self, authenticated_client: AsyncClient):
        """Test getting non-existent user"""
        response = await authenticated_client.get("/auth/user/99999")

        assert response.status_code == 404

    @pytest.mark.asyncio
    async def test_change_password(
        self, authenticated_client: AsyncClient, test_user: Employee
    ):
        """Test changing password (admin operation - no old password needed)"""
        response = await authenticated_client.post(
            f"/auth/user/{test_user.id}/change-password",
            json={
                "new_password": "newpassword123",
                "confirm_new_password": "newpassword123",
            },
        )

        assert response.status_code == 200
        assert "successfully" in response.json()["message"].lower()

    @pytest.mark.asyncio
    async def test_change_password_mismatch(
        self, authenticated_client: AsyncClient, test_user: Employee
    ):
        """Test changing password with mismatched confirmation"""
        response = await authenticated_client.post(
            f"/auth/user/{test_user.id}/change-password",
            json={
                "new_password": "newpassword123",
                "confirm_new_password": "differentpassword",
            },
        )

        assert response.status_code == 422
