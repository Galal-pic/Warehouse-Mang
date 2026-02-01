"""Inventory-related background tasks"""

from datetime import datetime
from celery import shared_task


# Default low stock threshold
DEFAULT_LOW_STOCK_THRESHOLD = 10


@shared_task(bind=True, max_retries=3)
def check_low_stock_levels(self, threshold: int = DEFAULT_LOW_STOCK_THRESHOLD):
    """Check for items with low stock levels"""
    try:
        import asyncio
        from src.database import async_session_maker
        from src.repositories import UnitOfWork
        from src.background.tasks.notification_tasks import send_low_stock_notification

        async def _check():
            async with async_session_maker() as session:
                uow = UnitOfWork(session)

                items = await uow.warehouse.get_all_no_limit()
                low_stock_items = []

                for item in items:
                    locations = await uow.item_locations.get_by_item(item.id)
                    total_qty = sum(loc.quantity for loc in locations)

                    if total_qty <= threshold:
                        low_stock_items.append({
                            "item_id": item.id,
                            "item_name": item.item_name,
                            "current_qty": total_qty,
                            "threshold": threshold,
                        })

                return low_stock_items

        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        try:
            low_stock_items = loop.run_until_complete(_check())

            # Send notifications for each low stock item
            for item in low_stock_items:
                send_low_stock_notification.delay(
                    item["item_id"],
                    item["item_name"],
                    item["current_qty"],
                    item["threshold"],
                )

            return {
                "status": "success",
                "low_stock_count": len(low_stock_items),
                "items": low_stock_items,
            }
        finally:
            loop.close()

    except Exception as exc:
        self.retry(exc=exc, countdown=300)


@shared_task(bind=True, max_retries=3)
def check_overdue_rentals(self):
    """Check for overdue rental items"""
    try:
        import asyncio
        from src.database import async_session_maker
        from src.repositories import UnitOfWork
        from src.background.tasks.notification_tasks import send_overdue_rental_notification

        async def _check():
            async with async_session_maker() as session:
                uow = UnitOfWork(session)

                items = await uow.rented_items.get_all_with_items(skip=0, limit=10000)
                now = datetime.now()
                overdue_items = []

                for item in items:
                    if (
                        item.status == "given"
                        and item.expected_return_date
                        and item.expected_return_date < now
                    ):
                        days_overdue = (now - item.expected_return_date).days
                        warehouse_item = await uow.warehouse.get(item.item_id)

                        overdue_items.append({
                            "rental_id": item.id,
                            "item_id": item.item_id,
                            "item_name": warehouse_item.item_name if warehouse_item else None,
                            "customer_name": item.customer_name,
                            "customer_phone": item.customer_phone,
                            "expected_date": item.expected_return_date.isoformat(),
                            "days_overdue": days_overdue,
                        })

                return overdue_items

        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        try:
            overdue_items = loop.run_until_complete(_check())

            # Send notifications for each overdue item
            for item in overdue_items:
                send_overdue_rental_notification.delay(
                    item["rental_id"],
                    item["item_name"],
                    item["customer_name"],
                    item["customer_phone"],
                    item["expected_date"],
                    item["days_overdue"],
                )

            return {
                "status": "success",
                "overdue_count": len(overdue_items),
                "items": overdue_items,
            }
        finally:
            loop.close()

    except Exception as exc:
        self.retry(exc=exc, countdown=300)


@shared_task(bind=True, max_retries=3)
def recalculate_inventory_values(self):
    """Recalculate all inventory values based on FIFO prices"""
    try:
        import asyncio
        from src.database import async_session_maker
        from src.repositories import UnitOfWork

        async def _recalculate():
            async with async_session_maker() as session:
                uow = UnitOfWork(session)

                items = await uow.warehouse.get_all_no_limit()
                results = []

                for item in items:
                    prices = await uow.prices.get_by_item(item.id)
                    total_value = sum(
                        p.quantity * p.unit_price for p in prices if p.quantity > 0
                    )
                    total_qty = sum(p.quantity for p in prices if p.quantity > 0)

                    results.append({
                        "item_id": item.id,
                        "item_name": item.item_name,
                        "total_quantity": total_qty,
                        "total_value": round(total_value, 2),
                        "avg_price": round(total_value / total_qty, 2) if total_qty > 0 else 0,
                    })

                return results

        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        try:
            results = loop.run_until_complete(_recalculate())
            total_value = sum(r["total_value"] for r in results)
            return {
                "status": "success",
                "total_items": len(results),
                "total_inventory_value": round(total_value, 2),
                "items": results,
            }
        finally:
            loop.close()

    except Exception as exc:
        self.retry(exc=exc, countdown=300)


@shared_task(bind=True, max_retries=3)
def sync_location_quantities(self):
    """
    Sync location quantities with price records.
    Useful for fixing discrepancies.
    """
    try:
        import asyncio
        from src.database import async_session_maker
        from src.repositories import UnitOfWork

        async def _sync():
            async with async_session_maker() as session:
                uow = UnitOfWork(session)

                items = await uow.warehouse.get_all_no_limit()
                synced = []
                discrepancies = []

                for item in items:
                    locations = await uow.item_locations.get_by_item(item.id)

                    for loc in locations:
                        # Get total from prices for this location
                        prices = await uow.prices.get_fifo_prices(item.id, loc.location)
                        price_qty = sum(p.quantity for p in prices)

                        if loc.quantity != price_qty:
                            discrepancies.append({
                                "item_id": item.id,
                                "item_name": item.item_name,
                                "location": loc.location,
                                "location_qty": loc.quantity,
                                "price_qty": price_qty,
                                "difference": loc.quantity - price_qty,
                            })

                            # Optionally sync (commented out for safety)
                            # loc.quantity = price_qty
                            # synced.append(item.id)

                # await uow.commit()  # Uncomment if syncing

                return {
                    "discrepancies_found": len(discrepancies),
                    "discrepancies": discrepancies,
                    "synced_count": len(synced),
                }

        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        try:
            result = loop.run_until_complete(_sync())
            return {"status": "success", **result}
        finally:
            loop.close()

    except Exception as exc:
        self.retry(exc=exc, countdown=300)


@shared_task
def cleanup_zero_quantity_prices():
    """Remove price records with zero quantity"""
    try:
        import asyncio
        from src.database import async_session_maker
        from src.repositories import UnitOfWork

        async def _cleanup():
            async with async_session_maker() as session:
                uow = UnitOfWork(session)

                # This would require a new method in prices repository
                # For now, we'll just count them
                items = await uow.warehouse.get_all_no_limit()
                zero_count = 0

                for item in items:
                    prices = await uow.prices.get_by_item(item.id)
                    for price in prices:
                        if price.quantity == 0:
                            zero_count += 1
                            # await uow.prices.delete(price)  # Uncomment to actually delete

                # await uow.commit()  # Uncomment if deleting

                return {"zero_quantity_records": zero_count}

        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        try:
            result = loop.run_until_complete(_cleanup())
            return {"status": "success", **result}
        finally:
            loop.close()

    except Exception as e:
        return {"status": "error", "message": str(e)}
