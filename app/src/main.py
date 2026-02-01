from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from src.config import settings
from src.database import close_db
from src.core.cache import cache


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Application lifespan manager.

    Handles startup and shutdown events.
    """
    # Startup
    try:
        await cache.connect()
        print("Connected to Redis cache")
    except Exception as e:
        print(f"Failed to connect to Redis: {e}")

    yield

    # Shutdown
    await cache.disconnect()
    await close_db()
    print("Application shutdown complete")


app = FastAPI(
    title="Warehouse Management API",
    description="FastAPI backend for warehouse management system",
    version="2.0.0",
    lifespan=lifespan,
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Health check endpoints
@app.get("/health", tags=["Health"])
async def health_check():
    """Basic health check endpoint"""
    return {"status": "healthy"}


@app.get("/health/ready", tags=["Health"])
async def readiness_check():
    """
    Readiness check - verifies database and cache connectivity.
    """
    from sqlalchemy import text
    from src.database import async_session_maker

    checks = {}

    # Database check
    try:
        async with async_session_maker() as session:
            await session.execute(text("SELECT 1"))
            checks["database"] = "healthy"
    except Exception as e:
        checks["database"] = f"unhealthy: {str(e)}"

    # Redis check
    cache_status = await cache.get_status()
    checks["redis"] = "healthy" if cache_status.get("connected") else "unhealthy"

    # Overall status
    all_healthy = all(v == "healthy" for v in checks.values())
    status = "healthy" if all_healthy else "unhealthy"

    return {"status": status, "checks": checks}


# Include API routers
from src.api.auth import router as auth_router
from src.api.invoices import router as invoices_router
from src.api.warehouse import router as warehouse_router
from src.api.rental import router as rental_router
from src.api.machines import router as machines_router
from src.api.mechanisms import router as mechanisms_router
from src.api.suppliers import router as suppliers_router
from src.api.reports import router as reports_router

app.include_router(auth_router)
app.include_router(invoices_router)
app.include_router(warehouse_router)
app.include_router(rental_router)
app.include_router(machines_router)
app.include_router(mechanisms_router)
app.include_router(suppliers_router)
app.include_router(reports_router)


if __name__ == "__main__":
    import sys
    from pathlib import Path

    # Add parent directory to path for imports
    sys.path.insert(0, str(Path(__file__).parent.parent))

    import uvicorn

    uvicorn.run(
        "src.main:app",
        host="127.0.0.1",
        port=8000,
        reload=settings.DEBUG,
    )
