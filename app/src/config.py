from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    # Environment
    ENV: str = "development"
    DEBUG: bool = True

    # Database
    DATABASE_URI_DEV: str = "postgresql+asyncpg://postgres:mypassword@localhost:5432/cuppi-new"
    DATABASE_URI_PROD: str = "postgresql+asyncpg://myuser:mypassword@localhost:5432/cuppi-new"
    DB_POOL_SIZE: int = 10
    DB_MAX_OVERFLOW: int = 20
    DB_POOL_RECYCLE: int = 3600
    DB_POOL_TIMEOUT: int = 10

    # JWT
    SECRET_KEY: str = "507085e31232051da94ebc20dd008855642cd281c31246de592e459f9bf39b1e"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_HOURS: int = 6

    # Redis
    REDIS_URL: str = "redis://localhost:6379/0"
    REDIS_HOST: str = "localhost"
    REDIS_PORT: int = 6379
    REDIS_DB: int = 0
    REDIS_PASSWORD: str = ""
    CACHE_TTL: int = 300

    # Celery
    CELERY_BROKER_URL: str = "redis://localhost:6379/1"
    CELERY_RESULT_BACKEND: str = "redis://localhost:6379/2"

    # CORS
    CORS_ORIGINS_DEV: list[str] = ["http://localhost:5173"]
    CORS_ORIGINS_PROD: list[str] = ["https://cupii.store"]

    @property
    def database_url(self) -> str:
        """Get database URL based on environment, ensuring asyncpg driver"""
        url = self.DATABASE_URI_PROD if self.ENV == "production" else self.DATABASE_URI_DEV
        # Ensure asyncpg driver is used for async SQLAlchemy
        if url.startswith("postgresql://"):
            url = url.replace("postgresql://", "postgresql+asyncpg://", 1)
        return url

    @property
    def cors_origins(self) -> list[str]:
        """Get CORS origins based on environment"""
        if self.ENV == "production":
            return self.CORS_ORIGINS_PROD
        return self.CORS_ORIGINS_DEV

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        extra = "ignore"


@lru_cache
def get_settings() -> Settings:
    """Cached settings instance"""
    return Settings()


settings = get_settings()
