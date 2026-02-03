from typing import Sequence

from sqlalchemy import select
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession

from src.models.rental import RentedItems, RentalWarehouseLocations
from src.repositories.base import BaseRepository


class RentedItemsRepository(BaseRepository[RentedItems]):
    """Repository for RentedItems operations"""

    def __init__(self, session: AsyncSession):
        super().__init__(RentedItems, session)

    async def get_by_invoice(self, invoice_id: int) -> Sequence[RentedItems]:
        """Get all rented items for an invoice"""
        stmt = (
            select(RentedItems)
            .where(RentedItems.rental_invoice_id == invoice_id)
        )
        result = await self.session.scalars(stmt)
        return result.all()

    async def get_by_status(
        self,
        status: str,
        skip: int = 0,
        limit: int = 100,
    ) -> Sequence[RentedItems]:
        """Get rented items by status"""
        stmt = (
            select(RentedItems)
            .options(selectinload(RentedItems.item))
            .where(RentedItems.status == status)
            .order_by(RentedItems.id.desc())
            .offset(skip)
            .limit(limit)
        )
        result = await self.session.scalars(stmt)
        return result.all()

    async def get_by_customer(
        self,
        customer_name: str,
        skip: int = 0,
        limit: int = 100,
    ) -> Sequence[RentedItems]:
        """Get rented items by customer name"""
        stmt = (
            select(RentedItems)
            .options(selectinload(RentedItems.item))
            .where(RentedItems.customer_name.ilike(f"%{customer_name}%"))
            .order_by(RentedItems.id.desc())
            .offset(skip)
            .limit(limit)
        )
        result = await self.session.scalars(stmt)
        return result.all()

    async def get_all_with_items(
        self,
        skip: int = 0,
        limit: int = 100,
    ) -> Sequence[RentedItems]:
        """Get all rented items with item details"""
        stmt = (
            select(RentedItems)
            .options(selectinload(RentedItems.item))
            .order_by(RentedItems.id.desc())
            .offset(skip)
            .limit(limit)
        )
        result = await self.session.scalars(stmt)
        return result.all()

    async def update_status(
        self,
        id: int,
        status: str,
        **kwargs,
    ) -> RentedItems | None:
        """Update rented item status"""
        item = await self.get(id)
        if item:
            item.status = status
            for key, value in kwargs.items():
                if hasattr(item, key) and value is not None:
                    setattr(item, key, value)
            await self.session.flush()
            await self.session.refresh(item)
            return item
        return None

    async def get_borrowed_to_main(
        self,
        skip: int = 0,
        limit: int = 100,
    ) -> Sequence[RentedItems]:
        """Get items borrowed to main warehouse"""
        stmt = (
            select(RentedItems)
            .options(selectinload(RentedItems.item))
            .where(RentedItems.borrowed_to_main_quantity > 0)
            .order_by(RentedItems.id.desc())
            .offset(skip)
            .limit(limit)
        )
        result = await self.session.scalars(stmt)
        return result.all()

    async def get_by_invoice_and_item(
        self,
        invoice_id: int,
        item_id: int,
    ) -> RentedItems | None:
        """Get a rented item by invoice and item ID"""
        stmt = (
            select(RentedItems)
            .where(
                RentedItems.rental_invoice_id == invoice_id,
                RentedItems.item_id == item_id,
            )
        )
        result = await self.session.scalars(stmt)
        return result.first()

    async def get_available_for_deduction(
        self,
        item_id: int,
    ) -> Sequence[RentedItems]:
        """Get rented items available for deduction (items with borrowed_to_main_quantity > 0)"""
        stmt = (
            select(RentedItems)
            .where(
                RentedItems.item_id == item_id,
                RentedItems.borrowed_to_main_quantity > 0,
            )
            .order_by(RentedItems.id.asc())  # FIFO: oldest first
        )
        result = await self.session.scalars(stmt)
        return result.all()


class RentalWarehouseLocationsRepository(BaseRepository[RentalWarehouseLocations]):
    """Repository for RentalWarehouseLocations operations"""

    def __init__(self, session: AsyncSession):
        super().__init__(RentalWarehouseLocations, session)

    async def get_by_item_and_location(
        self,
        item_id: int,
        location: str = "RENTAL_WAREHOUSE",
    ) -> RentalWarehouseLocations | None:
        """Get rental warehouse location"""
        stmt = (
            select(RentalWarehouseLocations)
            .where(
                RentalWarehouseLocations.item_id == item_id,
                RentalWarehouseLocations.location == location,
            )
        )
        result = await self.session.scalars(stmt)
        return result.first()

    async def get_all_with_items(
        self,
        skip: int = 0,
        limit: int = 100,
    ) -> Sequence[RentalWarehouseLocations]:
        """Get all rental warehouse locations with item details"""
        stmt = (
            select(RentalWarehouseLocations)
            .options(selectinload(RentalWarehouseLocations.warehouse))
            .order_by(RentalWarehouseLocations.item_id.desc())
            .offset(skip)
            .limit(limit)
        )
        result = await self.session.scalars(stmt)
        return result.all()

    async def update_quantities(
        self,
        item_id: int,
        quantity: int | None = None,
        reserved_quantity: int | None = None,
        available_quantity: int | None = None,
        location: str = "RENTAL_WAREHOUSE",
    ) -> RentalWarehouseLocations | None:
        """Update rental warehouse quantities"""
        loc = await self.get_by_item_and_location(item_id, location)
        if loc:
            if quantity is not None:
                loc.quantity = quantity
            if reserved_quantity is not None:
                loc.reserved_quantity = reserved_quantity
            if available_quantity is not None:
                loc.available_quantity = available_quantity
            await self.session.flush()
            await self.session.refresh(loc)
            return loc
        return None

    async def add_quantity(
        self,
        item_id: int,
        quantity: int,
        location: str = "RENTAL_WAREHOUSE",
    ) -> RentalWarehouseLocations:
        """Add quantity to rental warehouse"""
        loc = await self.get_by_item_and_location(item_id, location)
        if loc:
            loc.quantity += quantity
            loc.available_quantity += quantity
            await self.session.flush()
            return loc
        else:
            return await self.create({
                "item_id": item_id,
                "location": location,
                "quantity": quantity,
                "reserved_quantity": 0,
                "available_quantity": quantity,
            })

    async def reserve_quantity(
        self,
        item_id: int,
        quantity: int,
        location: str = "RENTAL_WAREHOUSE",
    ) -> RentalWarehouseLocations | None:
        """Reserve quantity in rental warehouse"""
        loc = await self.get_by_item_and_location(item_id, location)
        if loc and loc.available_quantity >= quantity:
            loc.reserved_quantity += quantity
            loc.available_quantity -= quantity
            await self.session.flush()
            return loc
        return None
