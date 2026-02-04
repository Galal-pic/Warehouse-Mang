import json
from typing import Any, Callable
from functools import wraps

import redis.asyncio as redis

from src.config import settings


# Lua: SCAN + DEL in a single server-side pass — no Python round-trips per batch
_LUA_DELETE_PATTERN = """
local cursor = "0"
local deleted = 0
repeat
    local result = redis.call("SCAN", cursor, "MATCH", KEYS[1], "COUNT", 200)
    cursor = result[1]
    if #result[2] > 0 then
        deleted = deleted + redis.call("DEL", unpack(result[2]))
    end
until cursor == "0"
return deleted
"""


class RedisCache:
    """Async Redis cache manager"""

    def __init__(self):
        self.redis: redis.Redis | None = None
        self.prefix = "warehouse_app:"
        self.default_ttl = settings.CACHE_TTL

    async def connect(self) -> None:
        """Connect to Redis and verify with PING. Sets self.redis = None on failure."""
        client = redis.from_url(
            settings.REDIS_URL,
            encoding="utf-8",
            decode_responses=True,
            socket_connect_timeout=2,
        )
        try:
            # Verify the connection is actually reachable — from_url is lazy
            await client.ping()
            self.redis = client
        except Exception:
            await client.close()
            self.redis = None
            raise

    async def disconnect(self) -> None:
        """Disconnect from Redis"""
        if self.redis:
            await self.redis.close()
            self.redis = None

    async def get(self, key: str) -> Any | None:
        """
        Get a value from cache.

        Args:
            key: Cache key

        Returns:
            Cached value or None if not found
        """
        if not self.redis:
            return None
        try:
            data = await self.redis.get(f"{self.prefix}{key}")
            return json.loads(data) if data else None
        except Exception:
            return None

    async def set(
        self,
        key: str,
        value: Any,
        ttl: int | None = None,
    ) -> bool:
        """
        Set a value in cache.

        Args:
            key: Cache key
            value: Value to cache
            ttl: Time-to-live in seconds

        Returns:
            True if successful
        """
        if not self.redis:
            return False
        try:
            await self.redis.set(
                f"{self.prefix}{key}",
                json.dumps(value, default=str),
                ex=ttl or self.default_ttl,
            )
            return True
        except Exception:
            return False

    async def delete(self, key: str) -> bool:
        """
        Delete a key from cache.

        Args:
            key: Cache key

        Returns:
            True if successful
        """
        if not self.redis:
            return False
        try:
            await self.redis.delete(f"{self.prefix}{key}")
            return True
        except Exception:
            return False

    async def delete_pattern(self, pattern: str) -> int:
        """
        Delete all keys matching a pattern via server-side Lua SCAN+DEL.

        Args:
            pattern: Key pattern (e.g., "warehouse_list:*")

        Returns:
            Number of keys deleted
        """
        if not self.redis:
            return 0
        try:
            return await self.redis.eval(
                _LUA_DELETE_PATTERN, 1, f"{self.prefix}{pattern}"
            )
        except Exception:
            return 0

    async def exists(self, key: str) -> bool:
        """Check if a key exists in cache"""
        if not self.redis:
            return False
        try:
            return bool(await self.redis.exists(f"{self.prefix}{key}"))
        except Exception:
            return False

    async def clear_all(self) -> bool:
        """Clear all keys with the app prefix"""
        if not self.redis:
            return False
        try:
            await self.delete_pattern("*")
            return True
        except Exception:
            return False

    async def get_status(self) -> dict[str, Any]:
        """Get cache status information"""
        if not self.redis:
            return {"connected": False, "type": "none"}
        try:
            await self.redis.ping()
            info = await self.redis.info("memory")
            return {
                "connected": True,
                "type": "redis",
                "used_memory": info.get("used_memory_human", "unknown"),
            }
        except Exception as e:
            return {"connected": False, "type": "redis", "error": str(e)}


# Global cache instance
cache = RedisCache()


def cached(
    ttl: int | None = None,
    key_builder: Callable[..., str] | None = None,
):
    """
    Decorator for caching function results.

    Args:
        ttl: Time-to-live in seconds
        key_builder: Function to build cache key from arguments

    Example:
        @cached(ttl=300, key_builder=lambda page, size: f"items:{page}:{size}")
        async def get_items(page: int, size: int):
            ...
    """

    def decorator(func: Callable):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            # Build cache key
            if key_builder:
                cache_key = key_builder(*args, **kwargs)
            else:
                cache_key = f"{func.__name__}:{hash(str(args) + str(kwargs))}"

            # Try to get from cache
            cached_value = await cache.get(cache_key)
            if cached_value is not None:
                return cached_value

            # Execute function and cache result
            result = await func(*args, **kwargs)
            await cache.set(cache_key, result, ttl)
            return result

        return wrapper

    return decorator
