"""Integration tests for warehouse API endpoints"""

import pytest
import pytest_asyncio
from httpx import AsyncClient

from src.models import Warehouse


class TestWarehouseAPI:
    """Test cases for warehouse API endpoints"""

    @pytest.mark.asyncio
    async def test_list_warehouse_items(self, authenticated_client: AsyncClient):
        """Test listing warehouse items"""
        response = await authenticated_client.get("/warehouse/")

        assert response.status_code == 200
        data = response.json()
        assert "warehouses" in data
        assert "total_items" in data
        assert "page" in data

    @pytest.mark.asyncio
    async def test_list_warehouse_items_pagination(
        self, authenticated_client: AsyncClient
    ):
        """Test warehouse items pagination"""
        response = await authenticated_client.get(
            "/warehouse/",
            params={"page": 1, "page_size": 5, "all": False},
        )

        assert response.status_code == 200
        data = response.json()
        assert data["page"] == 1
        assert data["page_size"] == 5
        assert data["all"] is False

    @pytest.mark.asyncio
    async def test_list_warehouse_items_all(self, authenticated_client: AsyncClient):
        """Test getting all warehouse items"""
        response = await authenticated_client.get(
            "/warehouse/",
            params={"all": True},
        )

        assert response.status_code == 200
        data = response.json()
        assert data["all"] is True

    @pytest.mark.asyncio
    async def test_create_warehouse_item(self, authenticated_client: AsyncClient):
        """Test creating a warehouse item"""
        response = await authenticated_client.post(
            "/warehouse/",
            json={
                "item_name": "API Test Item",
                "item_bar": "API001",
                "locations": [
                    {"location": "MAIN", "quantity": 100}
                ],
            },
        )

        assert response.status_code == 200
        data = response.json()
        assert data["item_name"] == "API Test Item"
        assert data["item_bar"] == "API001"

    @pytest.mark.asyncio
    async def test_create_warehouse_item_duplicate_barcode(
        self, authenticated_client: AsyncClient, sample_warehouse_item: Warehouse
    ):
        """Test creating item with duplicate barcode fails"""
        response = await authenticated_client.post(
            "/warehouse/",
            json={
                "item_name": "Duplicate Item",
                "item_bar": sample_warehouse_item.item_bar,
                "locations": [],
            },
        )

        assert response.status_code == 400
        assert "exists" in response.json()["detail"].lower()

    @pytest.mark.asyncio
    async def test_get_warehouse_item(
        self, authenticated_client: AsyncClient, sample_warehouse_item: Warehouse
    ):
        """Test getting a warehouse item by ID"""
        response = await authenticated_client.get(
            f"/warehouse/{sample_warehouse_item.id}"
        )

        assert response.status_code == 200
        data = response.json()
        assert data["id"] == sample_warehouse_item.id
        assert data["item_name"] == sample_warehouse_item.item_name

    @pytest.mark.asyncio
    async def test_get_warehouse_item_not_found(
        self, authenticated_client: AsyncClient
    ):
        """Test getting non-existent warehouse item"""
        response = await authenticated_client.get("/warehouse/99999")

        assert response.status_code == 404

    @pytest.mark.asyncio
    async def test_update_warehouse_item(
        self, authenticated_client: AsyncClient, sample_warehouse_item: Warehouse
    ):
        """Test updating a warehouse item"""
        response = await authenticated_client.put(
            f"/warehouse/{sample_warehouse_item.id}",
            json={
                "item_name": "Updated Item Name",
            },
        )

        assert response.status_code == 200
        data = response.json()
        assert data["item_name"] == "Updated Item Name"

    @pytest.mark.asyncio
    async def test_delete_warehouse_item(self, authenticated_client: AsyncClient):
        """Test deleting a warehouse item"""
        # First create an item without stock
        create_response = await authenticated_client.post(
            "/warehouse/",
            json={
                "item_name": "To Delete",
                "item_bar": "DEL001",
                "locations": [],
            },
        )
        item_id = create_response.json()["id"]

        # Then delete it
        response = await authenticated_client.delete(f"/warehouse/{item_id}")

        assert response.status_code == 200
        assert "deleted" in response.json()["message"].lower()

    @pytest.mark.asyncio
    async def test_cache_clear(self, authenticated_client: AsyncClient):
        """Test clearing warehouse cache"""
        response = await authenticated_client.get("/warehouse/cache/clear")

        assert response.status_code == 200
        assert "cleared" in response.json()["message"].lower()

    @pytest.mark.asyncio
    async def test_cache_status(self, authenticated_client: AsyncClient):
        """Test getting cache status"""
        response = await authenticated_client.get("/warehouse/cache/status")

        assert response.status_code == 200
        data = response.json()
        assert "connected" in data
        assert "type" in data
