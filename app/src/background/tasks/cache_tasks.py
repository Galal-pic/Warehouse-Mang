"""Cache-related background tasks"""

from celery import shared_task

from src.core.cache import cache


@shared_task(bind=True, max_retries=3)
def clear_expired_cache(self):
    """Clear expired cache entries"""
    try:
        import asyncio

        async def _clear():
            await cache.connect()
            # Redis handles expiration automatically, but we can force cleanup
            status = await cache.get_status()
            return status

        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        try:
            result = loop.run_until_complete(_clear())
            return {"status": "success", "cache_status": result}
        finally:
            loop.close()

    except Exception as exc:
        self.retry(exc=exc, countdown=60)


@shared_task(bind=True, max_retries=3)
def clear_cache_pattern(self, pattern: str):
    """Clear cache entries matching a pattern"""
    try:
        import asyncio

        async def _clear():
            await cache.connect()
            await cache.delete_pattern(pattern)
            return {"pattern": pattern, "status": "cleared"}

        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        try:
            result = loop.run_until_complete(_clear())
            return result
        finally:
            loop.close()

    except Exception as exc:
        self.retry(exc=exc, countdown=60)


@shared_task(bind=True, max_retries=3)
def warm_cache(self, cache_type: str = "all"):
    """Warm up cache with frequently accessed data"""
    try:
        import asyncio
        from src.database import async_session_maker
        from src.repositories import UnitOfWork

        async def _warm():
            await cache.connect()
            warmed = []

            async with async_session_maker() as session:
                uow = UnitOfWork(session)

                if cache_type in ["all", "warehouse"]:
                    # Warm warehouse cache
                    items = await uow.warehouse.get_all_with_locations(skip=0, limit=100)
                    for item in items:
                        cache_key = f"warehouse_item:{item.id}"
                        await cache.set(cache_key, {
                            "id": item.id,
                            "item_name": item.item_name,
                            "item_bar": item.item_bar,
                        })
                    warmed.append(f"warehouse:{len(items)}")

                if cache_type in ["all", "machines"]:
                    # Warm machines cache
                    machines = await uow.machines.get_all_no_limit()
                    for machine in machines:
                        cache_key = f"machine:{machine.id}"
                        await cache.set(cache_key, machine.to_dict())
                    warmed.append(f"machines:{len(machines)}")

                if cache_type in ["all", "mechanisms"]:
                    # Warm mechanisms cache
                    mechanisms = await uow.mechanisms.get_all_no_limit()
                    for mechanism in mechanisms:
                        cache_key = f"mechanism:{mechanism.id}"
                        await cache.set(cache_key, mechanism.to_dict())
                    warmed.append(f"mechanisms:{len(mechanisms)}")

                if cache_type in ["all", "suppliers"]:
                    # Warm suppliers cache
                    suppliers = await uow.suppliers.get_all_no_limit()
                    for supplier in suppliers:
                        cache_key = f"supplier:{supplier.id}"
                        await cache.set(cache_key, supplier.to_dict())
                    warmed.append(f"suppliers:{len(suppliers)}")

            return {"status": "success", "warmed": warmed}

        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        try:
            result = loop.run_until_complete(_warm())
            return result
        finally:
            loop.close()

    except Exception as exc:
        self.retry(exc=exc, countdown=60)


@shared_task
def invalidate_entity_cache(entity_type: str, entity_id: int | None = None):
    """Invalidate cache for a specific entity or all entities of a type"""
    try:
        import asyncio

        async def _invalidate():
            await cache.connect()
            if entity_id:
                cache_key = f"{entity_type}:{entity_id}"
                await cache.delete(cache_key)
                return {"invalidated": cache_key}
            else:
                pattern = f"{entity_type}_*"
                await cache.delete_pattern(pattern)
                return {"invalidated_pattern": pattern}

        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        try:
            result = loop.run_until_complete(_invalidate())
            return result
        finally:
            loop.close()

    except Exception as e:
        return {"error": str(e)}
