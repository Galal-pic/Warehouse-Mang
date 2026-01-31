from typing import Sequence

from sqlalchemy import select, func
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession

from src.models.warehouse import Warehouse, ItemLocations, Prices
from src.repositories.base import BaseRepository


class WarehouseRepository(BaseRepository[Warehouse]):
    """Repository for Warehouse operations"""

    def __init__(self, session: AsyncSession):
        super().__init__(Warehouse, session)

    async def get_by_barcode(self, barcode: str) -> Warehouse | None:
        """Get item by barcode"""
        stmt = select(Warehouse).where(Warehouse.item_bar == barcode)
        result = await self.session.scalars(stmt)
        return result.first()

    async def get_with_locations(self, id: int) -> Warehouse | None:
        """Get item with locations eagerly loaded"""
        stmt = (
            select(Warehouse)
            .options(selectinload(Warehouse.item_locations))
            .where(Warehouse.id == id)
        )
        result = await self.session.scalars(stmt)
        return result.first()

    async def get_all_with_locations(
        self,
        skip: int = 0,
        limit: int = 100,
    ) -> Sequence[Warehouse]:
        """Get all items with locations"""
        stmt = (
            select(Warehouse)
            .options(selectinload(Warehouse.item_locations))
            .order_by(Warehouse.id.desc())
            .offset(skip)
            .limit(limit)
        )
        result = await self.session.scalars(stmt)
        return result.all()

    async def search_by_name(
        self,
        name: str,
        skip: int = 0,
        limit: int = 100,
    ) -> Sequence[Warehouse]:
        """Search items by name"""
        stmt = (
            select(Warehouse)
            .where(Warehouse.item_name.ilike(f"%{name}%"))
            .order_by(Warehouse.item_name)
            .offset(skip)
            .limit(limit)
        )
        result = await self.session.scalars(stmt)
        return result.all()

    async def barcode_exists(self, barcode: str) -> bool:
        """Check if barcode already exists"""
        item = await self.get_by_barcode(barcode)
        return item is not None

    async def bulk_upsert(self, items: list[dict]) -> int:
        """Bulk upsert warehouse items"""
        count = 0
        for item_data in items:
            existing = await self.get_by_barcode(item_data.get("item_bar", ""))
            if existing:
                await self.update(existing, item_data)
            else:
                await self.create(item_data)
            count += 1
        await self.session.flush()
        return count


class ItemLocationsRepository(BaseRepository[ItemLocations]):
    """Repository for ItemLocations operations"""

    def __init__(self, session: AsyncSession):
        super().__init__(ItemLocations, session)

    async def get_by_item_and_location(
        self,
        item_id: int,
        location: str,
    ) -> ItemLocations | None:
        """Get item location"""
        stmt = (
            select(ItemLocations)
            .where(
                ItemLocations.item_id == item_id,
                ItemLocations.location == location,
            )
        )
        result = await self.session.scalars(stmt)
        return result.first()

    async def get_by_item(self, item_id: int) -> Sequence[ItemLocations]:
        """Get all locations for an item"""
        stmt = (
            select(ItemLocations)
            .where(ItemLocations.item_id == item_id)
        )
        result = await self.session.scalars(stmt)
        return result.all()

    async def get_quantity(self, item_id: int, location: str) -> int:
        """Get quantity at a specific location"""
        loc = await self.get_by_item_and_location(item_id, location)
        return loc.quantity if loc else 0

    async def update_quantity(
        self,
        item_id: int,
        location: str,
        quantity: int,
    ) -> ItemLocations:
        """Update or create location quantity"""
        loc = await self.get_by_item_and_location(item_id, location)
        if loc:
            loc.quantity = quantity
            await self.session.flush()
            return loc
        else:
            return await self.create({
                "item_id": item_id,
                "location": location,
                "quantity": quantity,
            })

    async def add_quantity(
        self,
        item_id: int,
        location: str,
        quantity: int,
    ) -> ItemLocations:
        """Add quantity to a location"""
        loc = await self.get_by_item_and_location(item_id, location)
        if loc:
            loc.quantity += quantity
            await self.session.flush()
            return loc
        else:
            return await self.create({
                "item_id": item_id,
                "location": location,
                "quantity": quantity,
            })

    async def reduce_quantity(
        self,
        item_id: int,
        location: str,
        quantity: int,
    ) -> ItemLocations | None:
        """Reduce quantity at a location"""
        loc = await self.get_by_item_and_location(item_id, location)
        if loc:
            loc.quantity = max(0, loc.quantity - quantity)
            await self.session.flush()
            return loc
        return None


class PricesRepository(BaseRepository[Prices]):
    """Repository for Prices (FIFO) operations"""

    def __init__(self, session: AsyncSession):
        super().__init__(Prices, session)

    async def get_by_composite_key(
        self,
        invoice_id: int,
        item_id: int,
        location: str,
        supplier_id: int = 0,
    ) -> Prices | None:
        """Get price by composite key"""
        stmt = (
            select(Prices)
            .where(
                Prices.invoice_id == invoice_id,
                Prices.item_id == item_id,
                Prices.location == location,
                Prices.supplier_id == supplier_id,
            )
        )
        result = await self.session.scalars(stmt)
        return result.first()

    async def get_fifo_prices(
        self,
        item_id: int,
        location: str,
        supplier_id: int | None = None,
    ) -> Sequence[Prices]:
        """Get prices for FIFO calculation (ordered by oldest first)"""
        stmt = (
            select(Prices)
            .where(
                Prices.item_id == item_id,
                Prices.location == location,
                Prices.quantity > 0,
            )
            .order_by(Prices.invoice_id.asc())  # FIFO: oldest first
        )

        if supplier_id is not None:
            stmt = stmt.where(Prices.supplier_id == supplier_id)

        result = await self.session.scalars(stmt)
        return result.all()

    async def get_available_quantity(
        self,
        item_id: int,
        location: str,
        supplier_id: int | None = None,
    ) -> int:
        """Get total available quantity from FIFO prices"""
        stmt = (
            select(func.sum(Prices.quantity))
            .where(
                Prices.item_id == item_id,
                Prices.location == location,
                Prices.quantity > 0,
            )
        )

        if supplier_id is not None:
            stmt = stmt.where(Prices.supplier_id == supplier_id)

        result = await self.session.execute(stmt)
        return result.scalar() or 0

    async def consume_fifo(
        self,
        item_id: int,
        location: str,
        quantity: int,
        supplier_id: int | None = None,
    ) -> list[dict]:
        """
        Consume quantity using FIFO and return price breakdown.

        Returns list of dicts with:
        - source_price_invoice_id
        - source_price_item_id
        - source_price_location
        - source_price_supplier_id
        - quantity
        - unit_price
        - subtotal
        """
        prices = await self.get_fifo_prices(item_id, location, supplier_id)
        remaining = quantity
        breakdown = []

        for price in prices:
            if remaining <= 0:
                break

            take = min(remaining, price.quantity)
            price.quantity -= take
            remaining -= take

            breakdown.append({
                "source_price_invoice_id": price.invoice_id,
                "source_price_item_id": price.item_id,
                "source_price_location": price.location,
                "source_price_supplier_id": price.supplier_id,
                "quantity": take,
                "unit_price": price.unit_price,
                "subtotal": take * price.unit_price,
            })

        await self.session.flush()
        return breakdown

    async def restore_fifo(
        self,
        item_id: int,
        location: str,
        invoice_id: int,
        quantity: int,
        supplier_id: int = 0,
    ) -> Prices | None:
        """Restore quantity to a FIFO price record"""
        price = await self.get_by_composite_key(
            invoice_id, item_id, location, supplier_id
        )
        if price:
            price.quantity += quantity
            await self.session.flush()
            return price
        return None

    async def get_by_item(self, item_id: int) -> Sequence[Prices]:
        """Get all prices for an item"""
        stmt = (
            select(Prices)
            .where(Prices.item_id == item_id)
            .order_by(Prices.invoice_id.asc())
        )
        result = await self.session.scalars(stmt)
        return result.all()
