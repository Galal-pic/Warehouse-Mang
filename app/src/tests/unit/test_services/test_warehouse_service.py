"""Tests for warehouse service"""

import pytest
import pytest_asyncio

from src.services import WarehouseService
from src.repositories import UnitOfWork
from src.models import Warehouse


class TestWarehouseService:
    """Test cases for WarehouseService"""

    @pytest.mark.asyncio
    async def test_create_item(self, test_uow: UnitOfWork):
        """Test creating a warehouse item through service"""
        service = WarehouseService(test_uow)

        result = await service.create_item(
            item_name="Service Test Item",
            item_bar="SVC001",
            locations=[{"location": "MAIN", "quantity": 50}],
        )

        assert result.success is True
        assert result.status_code == 201
        assert result.data["item"] is not None

    @pytest.mark.asyncio
    async def test_create_item_duplicate_barcode(
        self, test_uow: UnitOfWork, sample_warehouse_item: Warehouse
    ):
        """Test creating item with duplicate barcode fails"""
        service = WarehouseService(test_uow)

        result = await service.create_item(
            item_name="Duplicate",
            item_bar=sample_warehouse_item.item_bar,
        )

        assert result.success is False
        assert "already exists" in result.message

    @pytest.mark.asyncio
    async def test_get_item_with_locations(
        self, test_uow: UnitOfWork, sample_warehouse_item: Warehouse
    ):
        """Test getting item with locations"""
        service = WarehouseService(test_uow)

        result = await service.get_item_with_locations(sample_warehouse_item.id)

        assert result.success is True
        assert result.data["item"] is not None

    @pytest.mark.asyncio
    async def test_get_item_not_found(self, test_uow: UnitOfWork):
        """Test getting non-existent item"""
        service = WarehouseService(test_uow)

        result = await service.get_item_with_locations(99999)

        assert result.success is False
        assert result.status_code == 404

    @pytest.mark.asyncio
    async def test_update_item(
        self, test_uow: UnitOfWork, sample_warehouse_item: Warehouse
    ):
        """Test updating a warehouse item"""
        service = WarehouseService(test_uow)

        result = await service.update_item(
            item_id=sample_warehouse_item.id,
            item_name="Updated Name",
        )

        assert result.success is True
        assert result.data["item"].item_name == "Updated Name"

    @pytest.mark.asyncio
    async def test_add_stock(
        self, test_uow: UnitOfWork, sample_warehouse_item: Warehouse
    ):
        """Test adding stock to a location"""
        service = WarehouseService(test_uow)

        result = await service.add_stock(
            item_id=sample_warehouse_item.id,
            location="MAIN",
            quantity=25,
        )

        assert result.success is True

    @pytest.mark.asyncio
    async def test_remove_stock(
        self, test_uow: UnitOfWork, sample_warehouse_item: Warehouse
    ):
        """Test removing stock from a location"""
        service = WarehouseService(test_uow)

        result = await service.remove_stock(
            item_id=sample_warehouse_item.id,
            location="MAIN",
            quantity=10,
        )

        assert result.success is True

    @pytest.mark.asyncio
    async def test_remove_stock_insufficient(
        self, test_uow: UnitOfWork, sample_warehouse_item: Warehouse
    ):
        """Test removing more stock than available fails"""
        service = WarehouseService(test_uow)

        result = await service.remove_stock(
            item_id=sample_warehouse_item.id,
            location="MAIN",
            quantity=9999,
        )

        assert result.success is False
        assert "Insufficient" in result.message

    @pytest.mark.asyncio
    async def test_transfer_stock(
        self, test_uow: UnitOfWork, sample_warehouse_item: Warehouse
    ):
        """Test transferring stock between locations"""
        service = WarehouseService(test_uow)

        result = await service.transfer_stock(
            item_id=sample_warehouse_item.id,
            from_location="MAIN",
            to_location="WAREHOUSE_B",
            quantity=20,
        )

        assert result.success is True
        assert "Transferred" in result.message

    @pytest.mark.asyncio
    async def test_get_stock_summary(
        self, test_uow: UnitOfWork, sample_warehouse_item: Warehouse
    ):
        """Test getting stock summary"""
        service = WarehouseService(test_uow)

        result = await service.get_stock_summary(sample_warehouse_item.id)

        assert result.success is True
        assert "total_quantity" in result.data
        assert "total_value" in result.data
        assert "locations" in result.data
