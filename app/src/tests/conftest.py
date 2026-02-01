"""Pytest configuration and fixtures"""

import asyncio
import os
import tempfile
from typing import AsyncGenerator, Generator
from datetime import datetime

import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.pool import StaticPool

from src.models.base import Base
from src.models import (
    Employee, Permission, Role, role_permissions,
    Warehouse, ItemLocations, Prices,
    Invoice, InvoiceItem,
    Machine, Mechanism, Supplier,
)
from src.models.role import user_roles
from src.main import app
from src.api.deps import get_uow, get_current_user
from src.repositories import UnitOfWork
from src.core.security import hash_password, create_access_token


# Use in-memory SQLite with StaticPool to share connection
TEST_DATABASE_URL = "sqlite+aiosqlite://"


@pytest.fixture(scope="session")
def event_loop() -> Generator:
    """Create event loop for async tests"""
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()


@pytest_asyncio.fixture(scope="function")
async def test_engine():
    """Create test database engine with shared connection pool"""
    engine = create_async_engine(
        TEST_DATABASE_URL,
        poolclass=StaticPool,
        echo=False,
        connect_args={"check_same_thread": False},
    )

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    yield engine

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)

    await engine.dispose()


@pytest_asyncio.fixture(scope="function")
async def test_session(test_engine) -> AsyncGenerator[AsyncSession, None]:
    """Create test database session"""
    async_session = async_sessionmaker(
        bind=test_engine,
        class_=AsyncSession,
        expire_on_commit=False,
        autocommit=False,
        autoflush=False,
    )

    async with async_session() as session:
        yield session
        await session.rollback()


@pytest_asyncio.fixture(scope="function")
async def test_uow(test_session: AsyncSession) -> UnitOfWork:
    """Create test Unit of Work"""
    return UnitOfWork(test_session)


@pytest_asyncio.fixture(scope="function")
async def test_user(test_session: AsyncSession) -> Employee:
    """Create a test user"""
    user = Employee(
        username="testuser",
        password_hash=hash_password("testpassword"),
        job_name="Tester",
        phone_number="1234567890",
    )
    test_session.add(user)
    await test_session.commit()
    await test_session.refresh(user)
    return user


@pytest_asyncio.fixture(scope="function")
async def test_admin(test_session: AsyncSession) -> Employee:
    """Create a test admin user with all permissions"""
    # Create permissions
    permissions = []
    permission_codes = [
        "create_inventory_operations", "create_additions",
        "view_additions", "view_withdrawals", "view_deposits",
        "view_returns", "view_damages", "view_reservations",
        "view_prices", "view_purchase_requests", "view_reports",
        "can_edit", "can_delete", "can_confirm_withdrawal",
    ]

    for code in permission_codes:
        perm = Permission(code=code, name=code.replace("_", " ").title(), category="test")
        test_session.add(perm)
        permissions.append(perm)

    await test_session.flush()

    # Create admin role
    admin_role = Role(name="admin", description="Administrator role")
    test_session.add(admin_role)
    await test_session.flush()

    # Assign permissions to role
    for perm in permissions:
        await test_session.execute(
            role_permissions.insert().values(role_id=admin_role.id, permission_id=perm.id)
        )

    # Create admin user
    admin = Employee(
        username="admin",
        password_hash=hash_password("adminpassword"),
        job_name="Administrator",
    )
    test_session.add(admin)
    await test_session.flush()

    # Assign role to user using the association table directly
    await test_session.execute(
        user_roles.insert().values(user_id=admin.id, role_id=admin_role.id)
    )

    await test_session.commit()
    await test_session.refresh(admin)
    return admin


@pytest_asyncio.fixture(scope="function")
async def auth_token(test_user: Employee) -> str:
    """Create auth token for test user"""
    return create_access_token(subject=test_user.id)


@pytest_asyncio.fixture(scope="function")
async def admin_token(test_admin: Employee) -> str:
    """Create auth token for admin user"""
    return create_access_token(subject=test_admin.id)


@pytest_asyncio.fixture(scope="function")
async def test_client(
    test_session: AsyncSession,
) -> AsyncGenerator[AsyncClient, None]:
    """Create test HTTP client without authentication (for unauthenticated tests)"""

    async def override_get_uow():
        uow = UnitOfWork(test_session)
        try:
            yield uow
        finally:
            pass

    app.dependency_overrides[get_uow] = override_get_uow

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        yield client

    app.dependency_overrides.clear()


@pytest_asyncio.fixture(scope="function")
async def authenticated_client(
    test_session: AsyncSession,
    test_user: Employee,
    auth_token: str,
) -> AsyncGenerator[AsyncClient, None]:
    """Client with authentication - overrides get_current_user"""

    async def override_get_uow():
        uow = UnitOfWork(test_session)
        try:
            yield uow
        finally:
            pass

    async def override_get_current_user():
        return test_user

    app.dependency_overrides[get_uow] = override_get_uow
    app.dependency_overrides[get_current_user] = override_get_current_user

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        client.headers["Authorization"] = f"Bearer {auth_token}"
        yield client

    app.dependency_overrides.clear()


# Sample data fixtures

@pytest_asyncio.fixture(scope="function")
async def sample_warehouse_item(test_session: AsyncSession) -> Warehouse:
    """Create a sample warehouse item"""
    item = Warehouse(
        item_name="Test Item",
        item_bar="TEST001",
    )
    test_session.add(item)
    await test_session.flush()

    # Add location with quantity
    location = ItemLocations(
        item_id=item.id,
        location="MAIN",
        quantity=100,
    )
    test_session.add(location)

    # Add price record
    price = Prices(
        invoice_id=0,  # Initial stock
        item_id=item.id,
        location="MAIN",
        supplier_id=0,
        quantity=100,
        unit_price=10.0,
    )
    test_session.add(price)

    await test_session.commit()
    await test_session.refresh(item)
    return item


@pytest_asyncio.fixture(scope="function")
async def sample_machine(test_session: AsyncSession) -> Machine:
    """Create a sample machine"""
    machine = Machine(name="Test Machine", description="A test machine")
    test_session.add(machine)
    await test_session.commit()
    await test_session.refresh(machine)
    return machine


@pytest_asyncio.fixture(scope="function")
async def sample_mechanism(test_session: AsyncSession) -> Mechanism:
    """Create a sample mechanism"""
    mechanism = Mechanism(name="Test Mechanism", description="A test mechanism")
    test_session.add(mechanism)
    await test_session.commit()
    await test_session.refresh(mechanism)
    return mechanism


@pytest_asyncio.fixture(scope="function")
async def sample_supplier(test_session: AsyncSession) -> Supplier:
    """Create a sample supplier"""
    supplier = Supplier(name="Test Supplier", description="A test supplier")
    test_session.add(supplier)
    await test_session.commit()
    await test_session.refresh(supplier)
    return supplier


@pytest_asyncio.fixture(scope="function")
async def sample_invoice(
    test_session: AsyncSession,
    test_user: Employee,
    sample_warehouse_item: Warehouse,
    sample_machine: Machine,
    sample_mechanism: Mechanism,
) -> Invoice:
    """Create a sample invoice with items"""
    invoice = Invoice(
        type="صرف",
        status="draft",
        employee_id=test_user.id,
        employee_name=test_user.username,
        machine_id=sample_machine.id,
        mechanism_id=sample_mechanism.id,
        total_amount=100.0,
        paid=0,
        residual=100.0,
    )
    test_session.add(invoice)
    await test_session.flush()

    # Add invoice item
    item = InvoiceItem(
        invoice_id=invoice.id,
        item_id=sample_warehouse_item.id,
        quantity=10,
        location="MAIN",
        unit_price=10.0,
        total_price=100.0,
    )
    test_session.add(item)

    await test_session.commit()
    await test_session.refresh(invoice)
    return invoice
