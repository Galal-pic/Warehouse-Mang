import os
import redis
from flask_caching import Cache
from functools import wraps
import json
import hashlib

class RedisManager:
    def __init__(self, app=None):
        self.redis_client = None
        self.cache = None
        if app:
            self.init_app(app)
    
    def init_app(self, app):
        # Redis client configuration
        redis_url = os.getenv('REDIS_URL', 'redis://localhost:6379/0')
        
        try:
            self.redis_client = redis.from_url(
                redis_url,
                decode_responses=True,
                socket_connect_timeout=5,
                socket_timeout=5,
                retry_on_timeout=True,
                health_check_interval=30
            )
            
            # Test connection
            self.redis_client.ping()
            
        except Exception as e:
            # Fallback to SimpleCache if Redis is not available
            redis_url = None
        
        # Flask-Caching configuration
        if redis_url:
            cache_config = {
                'CACHE_TYPE': 'RedisCache',
                'CACHE_REDIS_URL': redis_url,
                'CACHE_DEFAULT_TIMEOUT': 300,  # 5 minutes default
                'CACHE_KEY_PREFIX': 'warehouse_app:',
            }
        else:
            # Fallback to simple cache if Redis is not available
            cache_config = {
                'CACHE_TYPE': 'SimpleCache',
                'CACHE_DEFAULT_TIMEOUT': 300,
            }
        
        app.config.update(cache_config)
        self.cache = Cache(app)
    
    def get_client(self):
        return self.redis_client
    
    def get_cache(self):
        return self.cache

# Global instance
redis_manager = RedisManager()

def cache_key_generator(*args, **kwargs):
    key_data = {
        'args': args,
        'kwargs': kwargs
    }
    key_string = json.dumps(key_data, sort_keys=True, default=str)
    return hashlib.md5(key_string.encode()).hexdigest()


def cache_result(timeout=300, key_prefix=""):
    """Decorator to cache function results"""
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            if not redis_manager.cache:
                return func(*args, **kwargs)
            
            # Generate cache key
            cache_key = f"{key_prefix}:{func.__name__}:{cache_key_generator(*args, **kwargs)}"
            
            # Try to get from cache
            try:
                cached_result = redis_manager.cache.get(cache_key)
                if cached_result is not None:
                    return cached_result
            except Exception as e:
                pass
            
            # Execute function and cache result
            try:
                result = func(*args, **kwargs)
                redis_manager.cache.set(cache_key, result, timeout=timeout)
                return result
            except Exception as e:
                return func(*args, **kwargs)
        
        return wrapper
    return decorator

def invalidate_cache_pattern(pattern):
    """Invalidate cache keys matching a pattern"""
    if not redis_manager.redis_client:
        return
    
    try:
        keys = redis_manager.redis_client.keys(f"warehouse_app:{pattern}*")
        if keys:
            redis_manager.redis_client.delete(*keys)
    except Exception as e:
        pass

def clear_all_cache():
    """Clear all application cache"""
    if redis_manager.cache:
        try:
            redis_manager.cache.clear()
        except Exception as e:
            pass