"""Warehouse service - handles stock management"""

from src.services.base import BaseService, ServiceResult
from src.repositories import UnitOfWork


class WarehouseService(BaseService):
    """Service for warehouse/stock operations"""

    async def get_item_with_locations(self, item_id: int) -> ServiceResult:
        """Get warehouse item with all locations"""
        item = await self.uow.warehouse.get_with_locations(item_id)
        if not item:
            return ServiceResult.not_found("Item not found")
        return ServiceResult.ok(data={"item": item})

    async def create_item(
        self,
        item_name: str,
        item_bar: str,
        locations: list[dict] | None = None,
    ) -> ServiceResult:
        """Create a new warehouse item with optional locations"""
        try:
            # Check if barcode already exists
            existing = await self.uow.warehouse.get_by_barcode(item_bar)
            if existing:
                return ServiceResult.error(f"Barcode '{item_bar}' already exists")

            # Create item
            item = await self.uow.warehouse.create({
                "item_name": item_name,
                "item_bar": item_bar,
            })
            await self.uow.session.flush()

            # Create locations if provided
            if locations:
                for loc in locations:
                    await self.uow.item_locations.create({
                        "item_id": item.id,
                        "location": loc["location"],
                        "quantity": loc.get("quantity", 0),
                    })

            await self.uow.commit()

            complete_item = await self.uow.warehouse.get_with_locations(item.id)
            return ServiceResult.created(data={"item": complete_item})

        except Exception as e:
            await self.uow.rollback()
            return ServiceResult.error(f"Error creating item: {str(e)}", 500)

    async def update_item(
        self,
        item_id: int,
        item_name: str | None = None,
        item_bar: str | None = None,
    ) -> ServiceResult:
        """Update warehouse item details"""
        try:
            item = await self.uow.warehouse.get(item_id)
            if not item:
                return ServiceResult.not_found("Item not found")

            # Check barcode uniqueness if changing
            if item_bar and item_bar != item.item_bar:
                existing = await self.uow.warehouse.get_by_barcode(item_bar)
                if existing:
                    return ServiceResult.error(f"Barcode '{item_bar}' already exists")

            update_data = {}
            if item_name:
                update_data["item_name"] = item_name
            if item_bar:
                update_data["item_bar"] = item_bar

            if update_data:
                await self.uow.warehouse.update(item, update_data)

            await self.uow.commit()

            complete_item = await self.uow.warehouse.get_with_locations(item_id)
            return ServiceResult.ok(data={"item": complete_item})

        except Exception as e:
            await self.uow.rollback()
            return ServiceResult.error(f"Error updating item: {str(e)}", 500)

    async def delete_item(self, item_id: int) -> ServiceResult:
        """Delete warehouse item"""
        try:
            item = await self.uow.warehouse.get(item_id)
            if not item:
                return ServiceResult.not_found("Item not found")

            # Check if item has any inventory
            locations = await self.uow.item_locations.get_by_item(item_id)
            total_qty = sum(loc.quantity for loc in locations)
            if total_qty > 0:
                return ServiceResult.error(
                    f"Cannot delete item with existing inventory ({total_qty} units)"
                )

            await self.uow.warehouse.delete(item)
            await self.uow.commit()
            return ServiceResult.ok(message="Item deleted successfully")

        except Exception as e:
            await self.uow.rollback()
            return ServiceResult.error(f"Error deleting item: {str(e)}", 500)

    async def add_stock(
        self,
        item_id: int,
        location: str,
        quantity: int,
    ) -> ServiceResult:
        """Add stock to a specific location"""
        try:
            item = await self.uow.warehouse.get(item_id)
            if not item:
                return ServiceResult.not_found("Item not found")

            await self.uow.item_locations.add_quantity(item_id, location, quantity)
            await self.uow.commit()

            complete_item = await self.uow.warehouse.get_with_locations(item_id)
            return ServiceResult.ok(data={"item": complete_item})

        except Exception as e:
            await self.uow.rollback()
            return ServiceResult.error(f"Error adding stock: {str(e)}", 500)

    async def remove_stock(
        self,
        item_id: int,
        location: str,
        quantity: int,
    ) -> ServiceResult:
        """Remove stock from a specific location"""
        try:
            item = await self.uow.warehouse.get(item_id)
            if not item:
                return ServiceResult.not_found("Item not found")

            item_location = await self.uow.item_locations.get_by_item_and_location(
                item_id, location
            )
            if not item_location:
                return ServiceResult.not_found(f"Item not found in location '{location}'")

            if item_location.quantity < quantity:
                return ServiceResult.error(
                    f"Insufficient stock. Available: {item_location.quantity}, "
                    f"Requested: {quantity}"
                )

            item_location.quantity -= quantity
            await self.uow.commit()

            complete_item = await self.uow.warehouse.get_with_locations(item_id)
            return ServiceResult.ok(data={"item": complete_item})

        except Exception as e:
            await self.uow.rollback()
            return ServiceResult.error(f"Error removing stock: {str(e)}", 500)

    async def transfer_stock(
        self,
        item_id: int,
        from_location: str,
        to_location: str,
        quantity: int,
    ) -> ServiceResult:
        """Transfer stock between locations"""
        try:
            item = await self.uow.warehouse.get(item_id)
            if not item:
                return ServiceResult.not_found("Item not found")

            # Check source location
            source = await self.uow.item_locations.get_by_item_and_location(
                item_id, from_location
            )
            if not source:
                return ServiceResult.not_found(
                    f"Item not found in source location '{from_location}'"
                )

            if source.quantity < quantity:
                return ServiceResult.error(
                    f"Insufficient stock in source location. "
                    f"Available: {source.quantity}, Requested: {quantity}"
                )

            # Deduct from source
            source.quantity -= quantity

            # Add to destination
            await self.uow.item_locations.add_quantity(item_id, to_location, quantity)

            await self.uow.commit()

            complete_item = await self.uow.warehouse.get_with_locations(item_id)
            return ServiceResult.ok(
                data={"item": complete_item},
                message=f"Transferred {quantity} units from '{from_location}' to '{to_location}'",
            )

        except Exception as e:
            await self.uow.rollback()
            return ServiceResult.error(f"Error transferring stock: {str(e)}", 500)

    async def get_inventory_value(self) -> ServiceResult:
        """Calculate total inventory value based on FIFO prices"""
        try:
            all_items = await self.uow.warehouse.get_all_no_limit()
            total_value = 0.0
            items_value = []

            for item in all_items:
                prices = await self.uow.prices.get_by_item(item.id)
                item_value = sum(
                    p.quantity * p.unit_price for p in prices if p.quantity > 0
                )
                total_value += item_value

                if item_value > 0:
                    items_value.append({
                        "item_id": item.id,
                        "item_name": item.item_name,
                        "value": round(item_value, 2),
                    })

            return ServiceResult.ok(
                data={
                    "total_value": round(total_value, 2),
                    "items": items_value,
                }
            )

        except Exception as e:
            return ServiceResult.error(f"Error calculating inventory value: {str(e)}", 500)

    async def get_stock_summary(self, item_id: int) -> ServiceResult:
        """Get comprehensive stock summary for an item"""
        try:
            item = await self.uow.warehouse.get_with_locations(item_id)
            if not item:
                return ServiceResult.not_found("Item not found")

            # Get locations
            locations = await self.uow.item_locations.get_by_item(item_id)

            # Get price layers (FIFO)
            prices = await self.uow.prices.get_by_item(item_id)

            # Calculate totals
            total_quantity = sum(loc.quantity for loc in locations)
            total_value = sum(p.quantity * p.unit_price for p in prices if p.quantity > 0)
            avg_price = total_value / total_quantity if total_quantity > 0 else 0

            return ServiceResult.ok(
                data={
                    "item_id": item.id,
                    "item_name": item.item_name,
                    "item_bar": item.item_bar,
                    "total_quantity": total_quantity,
                    "total_value": round(total_value, 2),
                    "average_price": round(avg_price, 2),
                    "locations": [
                        {"location": loc.location, "quantity": loc.quantity}
                        for loc in locations
                    ],
                    "price_layers": [
                        {
                            "invoice_id": p.invoice_id,
                            "quantity": p.quantity,
                            "unit_price": p.unit_price,
                        }
                        for p in prices
                        if p.quantity > 0
                    ],
                }
            )

        except Exception as e:
            return ServiceResult.error(f"Error getting stock summary: {str(e)}", 500)

    async def import_from_excel(self, items: list[dict]) -> ServiceResult:
        """Import items from Excel data"""
        try:
            created_count = 0
            updated_count = 0
            errors = []

            for item_data in items:
                try:
                    item_name = item_data.get("item_name", item_data.get("name", ""))
                    item_bar = item_data.get("item_bar", item_data.get("barcode", ""))

                    if not item_name or not item_bar:
                        continue

                    existing = await self.uow.warehouse.get_by_barcode(item_bar)
                    if existing:
                        await self.uow.warehouse.update(existing, {"item_name": item_name})
                        updated_count += 1
                    else:
                        await self.uow.warehouse.create({
                            "item_name": item_name,
                            "item_bar": item_bar,
                        })
                        created_count += 1

                except Exception as e:
                    errors.append(str(e))

            await self.uow.commit()

            return ServiceResult.ok(
                data={
                    "created": created_count,
                    "updated": updated_count,
                    "errors": errors[:10],
                }
            )

        except Exception as e:
            await self.uow.rollback()
            return ServiceResult.error(f"Error importing items: {str(e)}", 500)
