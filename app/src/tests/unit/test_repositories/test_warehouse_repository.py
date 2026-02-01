"""Tests for warehouse repository"""

import pytest
import pytest_asyncio
from sqlalchemy.ext.asyncio import AsyncSession

from src.repositories import UnitOfWork
from src.models import Warehouse, ItemLocations


class TestWarehouseRepository:
    """Test cases for WarehouseRepository"""

    @pytest.mark.asyncio
    async def test_create_warehouse_item(self, test_uow: UnitOfWork):
        """Test creating a warehouse item"""
        item = await test_uow.warehouse.create({
            "item_name": "New Item",
            "item_bar": "NEW001",
        })
        await test_uow.commit()

        assert item is not None
        assert item.id is not None
        assert item.item_name == "New Item"
        assert item.item_bar == "NEW001"

    @pytest.mark.asyncio
    async def test_get_warehouse_item(self, test_uow: UnitOfWork, sample_warehouse_item: Warehouse):
        """Test getting a warehouse item by ID"""
        item = await test_uow.warehouse.get(sample_warehouse_item.id)

        assert item is not None
        assert item.id == sample_warehouse_item.id
        assert item.item_name == sample_warehouse_item.item_name

    @pytest.mark.asyncio
    async def test_get_by_barcode(self, test_uow: UnitOfWork, sample_warehouse_item: Warehouse):
        """Test getting a warehouse item by barcode"""
        item = await test_uow.warehouse.get_by_barcode(sample_warehouse_item.item_bar)

        assert item is not None
        assert item.item_bar == sample_warehouse_item.item_bar

    @pytest.mark.asyncio
    async def test_get_by_name(self, test_uow: UnitOfWork, sample_warehouse_item: Warehouse):
        """Test getting a warehouse item by name"""
        item = await test_uow.warehouse.get_by_name(sample_warehouse_item.item_name)

        assert item is not None
        assert item.item_name == sample_warehouse_item.item_name

    @pytest.mark.asyncio
    async def test_barcode_exists(self, test_uow: UnitOfWork, sample_warehouse_item: Warehouse):
        """Test checking if barcode exists"""
        exists = await test_uow.warehouse.barcode_exists(sample_warehouse_item.item_bar)
        assert exists is True

        not_exists = await test_uow.warehouse.barcode_exists("NONEXISTENT")
        assert not_exists is False

    @pytest.mark.asyncio
    async def test_update_warehouse_item(self, test_uow: UnitOfWork, sample_warehouse_item: Warehouse):
        """Test updating a warehouse item"""
        await test_uow.warehouse.update(sample_warehouse_item, {"item_name": "Updated Item"})
        await test_uow.commit()

        updated = await test_uow.warehouse.get(sample_warehouse_item.id)
        assert updated.item_name == "Updated Item"

    @pytest.mark.asyncio
    async def test_delete_warehouse_item(self, test_uow: UnitOfWork):
        """Test deleting a warehouse item"""
        item = await test_uow.warehouse.create({
            "item_name": "To Delete",
            "item_bar": "DEL001",
        })
        await test_uow.commit()

        item_id = item.id
        await test_uow.warehouse.delete(item)
        await test_uow.commit()

        deleted = await test_uow.warehouse.get(item_id)
        assert deleted is None

    @pytest.mark.asyncio
    async def test_get_all_with_pagination(self, test_uow: UnitOfWork):
        """Test getting all items with pagination"""
        # Create multiple items
        for i in range(5):
            await test_uow.warehouse.create({
                "item_name": f"Item {i}",
                "item_bar": f"BAR{i:03d}",
            })
        await test_uow.commit()

        # Test pagination
        items = await test_uow.warehouse.get_all(skip=0, limit=3)
        assert len(items) == 3

        items = await test_uow.warehouse.get_all(skip=3, limit=3)
        assert len(items) == 2

    @pytest.mark.asyncio
    async def test_count(self, test_uow: UnitOfWork):
        """Test counting warehouse items"""
        initial_count = await test_uow.warehouse.count()

        await test_uow.warehouse.create({
            "item_name": "Count Test",
            "item_bar": "CNT001",
        })
        await test_uow.commit()

        new_count = await test_uow.warehouse.count()
        assert new_count == initial_count + 1


class TestItemLocationsRepository:
    """Test cases for ItemLocationsRepository"""

    @pytest.mark.asyncio
    async def test_add_quantity(self, test_uow: UnitOfWork, sample_warehouse_item: Warehouse):
        """Test adding quantity to a location"""
        # Add to existing location
        await test_uow.item_locations.add_quantity(
            sample_warehouse_item.id, "MAIN", 50
        )
        await test_uow.commit()

        location = await test_uow.item_locations.get_by_item_and_location(
            sample_warehouse_item.id, "MAIN"
        )
        assert location.quantity == 150  # 100 original + 50 added

    @pytest.mark.asyncio
    async def test_add_quantity_new_location(self, test_uow: UnitOfWork, sample_warehouse_item: Warehouse):
        """Test adding quantity to a new location"""
        await test_uow.item_locations.add_quantity(
            sample_warehouse_item.id, "WAREHOUSE_B", 25
        )
        await test_uow.commit()

        location = await test_uow.item_locations.get_by_item_and_location(
            sample_warehouse_item.id, "WAREHOUSE_B"
        )
        assert location is not None
        assert location.quantity == 25

    @pytest.mark.asyncio
    async def test_get_by_item(self, test_uow: UnitOfWork, sample_warehouse_item: Warehouse):
        """Test getting all locations for an item"""
        locations = await test_uow.item_locations.get_by_item(sample_warehouse_item.id)

        assert len(locations) >= 1
        assert any(loc.location == "MAIN" for loc in locations)
