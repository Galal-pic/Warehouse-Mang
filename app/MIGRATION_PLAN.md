# Flask to FastAPI Migration Plan

## Overview
Migrate the warehouse management system from Flask to FastAPI while:
- **Preserving ALL endpoints exactly** (same paths, parameters, query strings, response structures)
- **100% frontend compatibility** - zero changes required on frontend
- Implementing modern async patterns
- Adding Role/Permission system with database storage
- Using SQLAlchemy 2.0 with Mapped/mapped_column
- Adding Celery with Redis for background tasks
- Adding pytest for testing

---

## Endpoint Preservation (EXACT MATCH)

### Authentication Endpoints
| Method | Path | Query Params | Body | Response |
|--------|------|--------------|------|----------|
| POST | `/auth/register` | - | username, password, job_name, phone_number, permissions... | User object |
| POST | `/auth/login` | - | username, password | {access_token, user} |
| GET | `/auth/users` | page, page_size, all | - | Paginated users |
| GET | `/auth/user` | - | - | Current user |
| GET | `/auth/user/<id>` | - | - | User object |
| PUT | `/auth/user/<id>` | - | permission fields | Updated user |
| POST | `/auth/user/<id>/change-password` | - | old_password, new_password | Success message |
| DELETE | `/auth/user/<id>` | - | - | Success message |

### Invoice Endpoints
| Method | Path | Query Params | Body | Response |
|--------|------|--------------|------|----------|
| GET | `/invoice/` | page, page_size, all | - | Paginated invoices |
| GET | `/invoice/<type>` | page, page_size, all | - | Paginated invoices by type |
| GET | `/invoice/<id>` | - | - | Invoice with items |
| POST | `/invoice/` | - | Invoice data | Created invoice |
| PUT | `/invoice/<id>` | - | Invoice data | Updated invoice |
| DELETE | `/invoice/<id>` | - | - | Success message |
| GET | `/invoice/last-id` | - | - | {last_id} |
| POST | `/invoice/<id>/confirm` | - | - | Confirmed invoice |
| GET | `/invoice/fifo-prices/<item_id>` | location | - | FIFO price records |
| POST | `/invoice/<id>/ReturnWarranty` | - | items, return_type | Return result |
| GET | `/invoice/<id>/WarrantyReturnStatus` | - | - | Return status |
| POST | `/invoice/<id>/PurchaseRequestConfirmation` | - | - | Confirmation result |
| GET | `/invoice/inventory-value` | - | - | Inventory valuation |
| GET | `/invoice/sales-invoices` | page, page_size | - | Sales invoices |
| GET | `/invoice/price-report/<id>` | - | - | Price report |
| GET | `/invoice/fifo-report` | - | - | FIFO report |
| POST | `/invoice/updateprice/<id>` | - | prices | Updated invoice |

### Rental Endpoints
| Method | Path | Query Params | Body | Response |
|--------|------|--------------|------|----------|
| PUT | `/rental/status` | - | item_id, status, customer_info | Updated status |
| POST | `/rental/borrow` | - | item_id, quantity | Borrow result |
| POST | `/rental/return` | - | item_id, quantity | Return result |
| GET | `/rental/items` | page, page_size, all | - | Rented items |
| GET | `/rental/warehouse` | page, page_size, all | - | Rental warehouse |
| GET | `/rental/missing-qty/<id>` | - | - | Missing quantity details |

### Warehouse Endpoints
| Method | Path | Query Params | Body | Response |
|--------|------|--------------|------|----------|
| GET | `/warehouse/` | page, page_size, all | - | Paginated items |
| POST | `/warehouse/` | - | item data | Created item |
| GET | `/warehouse/<id>` | - | - | Item with locations |
| PUT | `/warehouse/<id>` | - | item data | Updated item |
| DELETE | `/warehouse/<id>` | - | - | Success message |
| POST | `/warehouse/excel` | - | file | Import result |
| POST | `/warehouse/cache/clear` | - | - | Cache cleared |
| GET | `/warehouse/cache/status` | - | - | Cache status |

### Machine Endpoints
| Method | Path | Query Params | Body | Response |
|--------|------|--------------|------|----------|
| GET | `/machines/` | page, page_size, all | - | Paginated machines |
| POST | `/machines/` | - | machine data | Created machine |
| GET | `/machines/<id>` | - | - | Machine |
| PUT | `/machines/<id>` | - | machine data | Updated machine |
| DELETE | `/machines/<id>` | - | - | Success message |
| POST | `/machines/excel` | - | file | Import result |

### Mechanism Endpoints
| Method | Path | Query Params | Body | Response |
|--------|------|--------------|------|----------|
| GET | `/mechanisms/` | page, page_size, all | - | Paginated mechanisms |
| POST | `/mechanisms/` | - | mechanism data | Created mechanism |
| GET | `/mechanisms/<id>` | - | - | Mechanism |
| PUT | `/mechanisms/<id>` | - | mechanism data | Updated mechanism |
| DELETE | `/mechanisms/<id>` | - | - | Success message |
| POST | `/mechanisms/excel` | - | file | Import result |

### Supplier Endpoints
| Method | Path | Query Params | Body | Response |
|--------|------|--------------|------|----------|
| GET | `/suppliers/` | page, page_size, all | - | Paginated suppliers |
| POST | `/suppliers/` | - | supplier data | Created supplier |
| GET | `/suppliers/<id>` | - | - | Supplier |
| PUT | `/suppliers/<id>` | - | supplier data | Updated supplier |
| DELETE | `/suppliers/<id>` | - | - | Success message |
| POST | `/suppliers/excel` | - | file | Import result |

### Report Endpoints
(Preserved exactly as in current implementation)

---

## Response Structure Preservation

### Pagination Response (EXACT)
```json
{
  "items": [...],
  "page": 1,
  "page_size": 10,
  "total_pages": 5,
  "total_items": 50,
  "all": false
}
```

### Invoice Response (EXACT)
```json
{
  "id": 123,
  "type": "صرف",
  "client_name": "Client Name",
  "status": "confirmed",
  "employee_name": "Username",
  "machine_name": "Machine X",
  "mechanism_name": "Mechanism Y",
  "total_amount": 1000.00,
  "paid": 500.00,
  "residual": 500.00,
  "created_at": "2025-01-31 10:30:00",
  "notes": "...",
  "deduction_status": "...",
  "items": [
    {
      "item_name": "Item A",
      "item_id": 1,
      "barcode": "12345",
      "quantity": 10,
      "location": "raf1",
      "unit_price": 50.00,
      "total_price": 500.00,
      "supplier_name": "Supplier A",
      "supplier_id": 1,
      "price_details": [
        {
          "source_price_invoice_id": 100,
          "quantity": 10,
          "unit_price": 50.00,
          "subtotal": 500.00
        }
      ]
    }
  ],
  "suppliers_summary": ["Supplier A", "Supplier B"]
}
```

### User Response (EXACT - includes all permission fields for backward compatibility)
```json
{
  "id": 1,
  "username": "user123",
  "job_name": "Manager",
  "phone_number": "123-456-7890",
  "create_inventory_operations": true,
  "view_additions": true,
  "view_withdrawals": true,
  ... (all 40+ permission fields)
}
```

### Login Response (EXACT)
```json
{
  "access_token": "eyJ...",
  "user": { ... user object ... }
}
```

---

## Project Structure

```
app/
├── main.py                          # FastAPI application entry point
├── config.py                        # Settings with Pydantic BaseSettings
├── database.py                      # Async SQLAlchemy setup
│
├── core/                            # Core framework components
│   ├── __init__.py
│   ├── security.py                  # JWT, password hashing
│   ├── dependencies.py              # Dependency injection (auth, db session)
│   ├── exceptions.py                # Custom exception handlers
│   └── cache.py                     # Async Redis caching
│
├── models/                          # SQLAlchemy models (Mapped/mapped_column)
│   ├── __init__.py
│   ├── base.py                      # Base model with common fields
│   ├── user.py                      # Employee model
│   ├── role.py                      # Role & Permission models
│   ├── invoice.py                   # Invoice, InvoiceItem, InvoicePriceDetail
│   ├── warehouse.py                 # Warehouse, ItemLocations, Prices
│   ├── rental.py                    # RentedItems, RentalWarehouseLocations
│   ├── reference.py                 # Machine, Mechanism, Supplier
│   └── booking.py                   # BookingDeductions, ReturnSales, WarrantyReturn, PurchaseRequests
│
├── schemas/                         # Pydantic schemas (request/response)
│   ├── __init__.py
│   ├── common.py                    # Pagination, base response schemas
│   ├── user.py                      # User request/response schemas
│   ├── role.py                      # Role/Permission schemas
│   ├── invoice.py                   # Invoice schemas
│   ├── warehouse.py                 # Warehouse item schemas
│   ├── rental.py                    # Rental schemas
│   └── reference.py                 # Machine, Mechanism, Supplier schemas
│
├── repositories/                    # Data access layer (Repository Pattern)
│   ├── __init__.py
│   ├── base.py                      # Generic CRUD repository
│   ├── user.py                      # User repository
│   ├── role.py                      # Role repository
│   ├── invoice.py                   # Invoice repository
│   ├── warehouse.py                 # Warehouse repository
│   ├── rental.py                    # Rental repository
│   └── reference.py                 # Machine, Mechanism, Supplier repositories
│
├── services/                        # Business logic layer
│   ├── __init__.py
│   ├── auth.py                      # Authentication service
│   ├── user.py                      # User management service
│   ├── role.py                      # Role/Permission service
│   ├── invoice/                     # Invoice services by type
│   │   ├── __init__.py
│   │   ├── base.py                  # Base invoice service
│   │   ├── factory.py               # Invoice type factory
│   │   ├── sales.py                 # صرف operations
│   │   ├── purchase.py              # اضافه operations
│   │   ├── warranty.py              # أمانات operations
│   │   ├── returns.py               # مرتجع operations
│   │   ├── void.py                  # توالف operations
│   │   ├── booking.py               # حجز operations
│   │   ├── transfer.py              # تحويل operations
│   │   └── purchase_request.py      # طلب شراء operations
│   ├── warehouse.py                 # Warehouse service
│   ├── rental.py                    # Rental service
│   ├── fifo.py                      # FIFO price calculation service
│   └── reports.py                   # Reporting service
│
├── api/                             # API routes (same paths as Flask)
│   ├── __init__.py
│   ├── deps.py                      # Shared dependencies
│   ├── auth.py                      # /auth/* endpoints
│   ├── invoices.py                  # /invoice/* endpoints
│   ├── warehouse.py                 # /warehouse/* endpoints
│   ├── rental.py                    # /rental/* endpoints
│   ├── machines.py                  # /machines/* endpoints
│   ├── mechanisms.py                # /mechanisms/* endpoints
│   ├── suppliers.py                 # /suppliers/* endpoints
│   └── reports.py                   # /reports/* endpoints
│
├── background/                      # Celery background tasks
│   ├── __init__.py
│   ├── celery_app.py                # Celery configuration
│   └── tasks/
│       ├── __init__.py
│       ├── excel_import.py          # Bulk import tasks
│       ├── reports.py               # Report generation tasks
│       └── cache.py                 # Cache warming tasks
│
├── tests/                           # Pytest test suite
│   ├── __init__.py
│   ├── conftest.py                  # Pytest fixtures
│   ├── unit/
│   │   ├── test_services/
│   │   └── test_repositories/
│   └── integration/
│       └── test_api/
│
└── alembic/                         # Database migrations
    ├── versions/
    └── env.py
```

---

## Phase 1: Core Setup & Configuration

### 1.1 Dependencies (requirements.txt)
```
# Core
fastapi>=0.109.0
uvicorn[standard]>=0.27.0
python-multipart>=0.0.6

# Database
sqlalchemy[asyncio]>=2.0.25
asyncpg>=0.29.0
alembic>=1.13.0
greenlet>=3.0.0

# Authentication
python-jose[cryptography]>=3.3.0
passlib[bcrypt]>=1.7.4

# Validation
pydantic>=2.5.0
pydantic-settings>=2.1.0
email-validator>=2.1.0

# Caching
redis>=5.0.0

# Background Tasks
celery[redis]>=5.3.0

# Excel Processing
openpyxl>=3.1.0
pandas>=2.1.0

# Testing
pytest>=7.4.0
pytest-asyncio>=0.23.0
pytest-cov>=4.1.0
httpx>=0.26.0
factory-boy>=3.3.0
```

### 1.2 Configuration (config.py)
```python
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    # Database
    DATABASE_URL: str
    DB_POOL_SIZE: int = 10
    DB_MAX_OVERFLOW: int = 20

    # JWT
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_HOURS: int = 6

    # Redis
    REDIS_URL: str = "redis://localhost:6379/0"
    CACHE_TTL: int = 300

    # Celery
    CELERY_BROKER_URL: str = "redis://localhost:6379/1"
    CELERY_RESULT_BACKEND: str = "redis://localhost:6379/2"

    # CORS
    CORS_ORIGINS: list[str] = ["http://localhost:5173"]

    class Config:
        env_file = ".env"

settings = Settings()
```

### 1.3 Database Setup (database.py)
```python
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker

engine = create_async_engine(
    settings.DATABASE_URL,
    pool_size=settings.DB_POOL_SIZE,
    max_overflow=settings.DB_MAX_OVERFLOW,
    pool_pre_ping=True,
)

async_session_maker = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
)

async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with async_session_maker() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
```

---

## Phase 2: Models with SQLAlchemy 2.0

### 2.1 Base Model (models/base.py)
```python
from datetime import datetime
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column
from sqlalchemy import DateTime, func

class Base(DeclarativeBase):
    pass

class TimestampMixin:
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now()
    )
    updated_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        onupdate=func.now()
    )
```

### 2.2 Role/Permission System (models/role.py)

```python
from sqlalchemy import String, Text, ForeignKey, Table, Column
from sqlalchemy.orm import Mapped, mapped_column, relationship

# Association tables
role_permissions = Table(
    "role_permissions",
    Base.metadata,
    Column("role_id", ForeignKey("roles.id", ondelete="CASCADE"), primary_key=True),
    Column("permission_id", ForeignKey("permissions.id", ondelete="CASCADE"), primary_key=True),
)

user_roles = Table(
    "user_roles",
    Base.metadata,
    Column("user_id", ForeignKey("employees.id", ondelete="CASCADE"), primary_key=True),
    Column("role_id", ForeignKey("roles.id", ondelete="CASCADE"), primary_key=True),
)

class Permission(Base):
    __tablename__ = "permissions"

    id: Mapped[int] = mapped_column(primary_key=True)
    code: Mapped[str] = mapped_column(String(100), unique=True, index=True)
    name: Mapped[str] = mapped_column(String(200))
    category: Mapped[str] = mapped_column(String(50), index=True)
    description: Mapped[str | None] = mapped_column(Text)

    roles: Mapped[list["Role"]] = relationship(
        secondary=role_permissions,
        back_populates="permissions"
    )

class Role(Base):
    __tablename__ = "roles"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(100), unique=True, index=True)
    description: Mapped[str | None] = mapped_column(Text)
    is_system: Mapped[bool] = mapped_column(default=False)

    permissions: Mapped[list["Permission"]] = relationship(
        secondary=role_permissions,
        back_populates="roles",
        lazy="selectin"
    )
    employees: Mapped[list["Employee"]] = relationship(
        secondary=user_roles,
        back_populates="roles"
    )
```

### 2.3 Permission Codes (seeded in migration)

| Category | Code | Maps to Old Field |
|----------|------|-------------------|
| invoice.view | view_additions | view_additions |
| invoice.view | view_withdrawals | view_withdrawals |
| invoice.view | view_deposits | view_deposits |
| invoice.view | view_returns | view_returns |
| invoice.view | view_damages | view_damages |
| invoice.view | view_reservations | view_reservations |
| invoice.view | view_transfers | view_transfers |
| invoice.view | view_purchase_requests | view_purchase_requests |
| invoice.view | view_prices | view_prices |
| invoice.view | view_reports | view_reports |
| invoice.status | view_zero_valued | view_zero_valued |
| invoice.status | view_confirmed | view_confirmed |
| invoice.status | view_unreviewed | view_unreviewed |
| invoice.status | view_unconfirmed | view_unconfirmed |
| invoice.create | create_inventory_operations | create_inventory_operations |
| invoice.create | create_additions | create_additions |
| invoice.action | can_edit | can_edit |
| invoice.action | can_delete | can_delete |
| invoice.action | can_confirm_withdrawal | can_confirm_withdrawal |
| invoice.action | can_withdraw | can_withdraw |
| invoice.action | can_update_prices | can_update_prices |
| invoice.action | can_recover_deposits | can_recover_deposits |
| invoice.action | can_confirm_purchase_requests | can_confirm_purchase_requests |
| invoice.status | can_change_zero_valued | can_change_zero_valued |
| invoice.status | can_change_confirmed | can_change_confirmed |
| invoice.status | can_change_unreviewed | can_change_unreviewed |
| invoice.status | can_change_unconfirmed | can_change_unconfirmed |
| warehouse | items_can_view | (new) |
| warehouse | items_can_add | items_can_add |
| warehouse | items_can_edit | items_can_edit |
| warehouse | items_can_delete | items_can_delete |
| machines | machines_can_view | (new) |
| machines | machines_can_add | machines_can_add |
| machines | machines_can_edit | machines_can_edit |
| machines | machines_can_delete | machines_can_delete |
| mechanisms | mechanism_can_view | (new) |
| mechanisms | mechanism_can_add | mechanism_can_add |
| mechanisms | mechanism_can_edit | mechanism_can_edit |
| mechanisms | mechanism_can_delete | mechanism_can_delete |
| suppliers | suppliers_can_view | (new) |
| suppliers | suppliers_can_add | suppliers_can_add |
| suppliers | suppliers_can_edit | suppliers_can_edit |
| suppliers | suppliers_can_delete | suppliers_can_delete |

### 2.4 Employee Model (models/user.py)
```python
class Employee(Base, TimestampMixin):
    __tablename__ = "employees"

    id: Mapped[int] = mapped_column(primary_key=True)
    username: Mapped[str] = mapped_column(String(100), unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(String(255))
    job_name: Mapped[str | None] = mapped_column(String(100))
    phone_number: Mapped[str | None] = mapped_column(String(20))
    is_active: Mapped[bool] = mapped_column(default=True)

    # Relationships
    roles: Mapped[list["Role"]] = relationship(
        secondary=user_roles,
        back_populates="employees",
        lazy="selectin"
    )
    invoices: Mapped[list["Invoice"]] = relationship(back_populates="employee")
    purchase_requests: Mapped[list["PurchaseRequest"]] = relationship(back_populates="employee")

    def has_permission(self, permission_code: str) -> bool:
        """Check if user has a specific permission"""
        for role in self.roles:
            for perm in role.permissions:
                if perm.code == permission_code:
                    return True
        return False

    def get_all_permissions(self) -> set[str]:
        """Get all permission codes for this user"""
        permissions = set()
        for role in self.roles:
            for perm in role.permissions:
                permissions.add(perm.code)
        return permissions

    def to_dict_with_permissions(self) -> dict:
        """Convert to dict with boolean permission fields for backward compatibility"""
        result = {
            "id": self.id,
            "username": self.username,
            "job_name": self.job_name,
            "phone_number": self.phone_number,
        }
        # Add all permission fields as booleans for frontend compatibility
        all_perms = self.get_all_permissions()
        for perm_code in ALL_PERMISSION_CODES:
            result[perm_code] = perm_code in all_perms
        return result
```

### 2.5 Invoice Model (models/invoice.py)
```python
from decimal import Decimal
from sqlalchemy import String, Text, Numeric, ForeignKey, Index
from sqlalchemy.orm import Mapped, mapped_column, relationship

class Invoice(Base, TimestampMixin):
    __tablename__ = "invoices"
    __table_args__ = (
        Index('ix_invoice_type_status', 'type', 'status'),
        Index('ix_invoice_created_at', 'created_at'),
        Index('ix_invoice_employee_id', 'employee_id'),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    type: Mapped[str] = mapped_column(String(50), index=True)
    status: Mapped[str] = mapped_column(String(50), default="draft", index=True)
    client_name: Mapped[str | None] = mapped_column(String(200))
    total_amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=Decimal("0"))
    paid: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=Decimal("0"))
    residual: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=Decimal("0"))
    notes: Mapped[str | None] = mapped_column(Text)
    deduction_status: Mapped[str | None] = mapped_column(String(50))

    # Foreign Keys
    employee_id: Mapped[int | None] = mapped_column(ForeignKey("employees.id"))
    machine_id: Mapped[int | None] = mapped_column(ForeignKey("machines.id"))
    mechanism_id: Mapped[int | None] = mapped_column(ForeignKey("mechanisms.id"))
    supplier_id: Mapped[int | None] = mapped_column(ForeignKey("suppliers.id"))

    # Relationships
    employee: Mapped["Employee | None"] = relationship(back_populates="invoices")
    machine: Mapped["Machine | None"] = relationship(back_populates="invoices")
    mechanism: Mapped["Mechanism | None"] = relationship(back_populates="invoices")
    supplier: Mapped["Supplier | None"] = relationship(back_populates="invoices")
    items: Mapped[list["InvoiceItem"]] = relationship(
        back_populates="invoice",
        cascade="all, delete-orphan",
        lazy="selectin"
    )
    price_details: Mapped[list["InvoicePriceDetail"]] = relationship(
        back_populates="invoice",
        cascade="all, delete-orphan"
    )

class InvoiceItem(Base):
    __tablename__ = "invoice_items"
    __table_args__ = (
        Index('ix_invoice_item_invoice_id', 'invoice_id'),
        Index('ix_invoice_item_item_id', 'item_id'),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    invoice_id: Mapped[int] = mapped_column(ForeignKey("invoices.id", ondelete="CASCADE"))
    item_id: Mapped[int] = mapped_column(ForeignKey("warehouses.id"))
    location: Mapped[str] = mapped_column(String(100))
    quantity: Mapped[Decimal] = mapped_column(Numeric(12, 2))
    unit_price: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=Decimal("0"))
    total_price: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=Decimal("0"))
    supplier_id: Mapped[int | None] = mapped_column(ForeignKey("suppliers.id"))
    supplier_name: Mapped[str | None] = mapped_column(String(200))

    # Relationships
    invoice: Mapped["Invoice"] = relationship(back_populates="items")
    warehouse: Mapped["Warehouse"] = relationship()
    supplier: Mapped["Supplier | None"] = relationship()

class InvoicePriceDetail(Base):
    __tablename__ = "invoice_price_details"

    id: Mapped[int] = mapped_column(primary_key=True)
    invoice_id: Mapped[int] = mapped_column(ForeignKey("invoices.id", ondelete="CASCADE"))
    invoice_item_id: Mapped[int] = mapped_column(ForeignKey("invoice_items.id", ondelete="CASCADE"))
    source_price_invoice_id: Mapped[int] = mapped_column(ForeignKey("invoices.id"))
    source_price_item_id: Mapped[int] = mapped_column(ForeignKey("warehouses.id"))
    source_price_location: Mapped[str] = mapped_column(String(100))
    source_price_supplier_id: Mapped[int | None] = mapped_column(ForeignKey("suppliers.id"))
    quantity: Mapped[Decimal] = mapped_column(Numeric(12, 2))
    unit_price: Mapped[Decimal] = mapped_column(Numeric(12, 2))
    subtotal: Mapped[Decimal] = mapped_column(Numeric(12, 2))

    # Relationships
    invoice: Mapped["Invoice"] = relationship(back_populates="price_details")
```

### 2.6 Other Models (same pattern with Mapped/mapped_column)
- Warehouse, ItemLocations, Prices (models/warehouse.py)
- RentedItems, RentalWarehouseLocations (models/rental.py)
- Machine, Mechanism, Supplier (models/reference.py)
- BookingDeductions, ReturnSales, WarrantyReturn, PurchaseRequest (models/booking.py)

All with proper indexes for performance.

---

## Phase 3: Repository Layer

### 3.1 Base Repository (repositories/base.py)
```python
from typing import TypeVar, Generic, Type, Any
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

ModelType = TypeVar("ModelType", bound=Base)

class BaseRepository(Generic[ModelType]):
    def __init__(self, model: Type[ModelType], session: AsyncSession):
        self.model = model
        self.session = session

    async def get(self, id: int) -> ModelType | None:
        stmt = select(self.model).where(self.model.id == id)
        result = await self.session.scalars(stmt)
        return result.first()

    async def get_all(
        self,
        skip: int = 0,
        limit: int = 100,
        order_by: str = "id",
        descending: bool = True
    ) -> list[ModelType]:
        column = getattr(self.model, order_by)
        stmt = (
            select(self.model)
            .order_by(column.desc() if descending else column.asc())
            .offset(skip)
            .limit(limit)
        )
        result = await self.session.scalars(stmt)
        return list(result.all())

    async def count(self, filters: dict[str, Any] | None = None) -> int:
        stmt = select(func.count()).select_from(self.model)
        if filters:
            for key, value in filters.items():
                stmt = stmt.where(getattr(self.model, key) == value)
        result = await self.session.execute(stmt)
        return result.scalar() or 0

    async def create(self, obj_in: dict) -> ModelType:
        db_obj = self.model(**obj_in)
        self.session.add(db_obj)
        await self.session.flush()
        await self.session.refresh(db_obj)
        return db_obj

    async def update(self, db_obj: ModelType, obj_in: dict) -> ModelType:
        for field, value in obj_in.items():
            if hasattr(db_obj, field):
                setattr(db_obj, field, value)
        await self.session.flush()
        await self.session.refresh(db_obj)
        return db_obj

    async def delete(self, db_obj: ModelType) -> None:
        await self.session.delete(db_obj)
        await self.session.flush()

    async def bulk_create(self, objects: list[dict]) -> list[ModelType]:
        db_objs = [self.model(**obj) for obj in objects]
        self.session.add_all(db_objs)
        await self.session.flush()
        return db_objs
```

### 3.2 Invoice Repository (repositories/invoice.py)
```python
class InvoiceRepository(BaseRepository[Invoice]):
    async def get_with_items(self, id: int) -> Invoice | None:
        stmt = (
            select(Invoice)
            .options(
                selectinload(Invoice.items).selectinload(InvoiceItem.warehouse),
                selectinload(Invoice.items).selectinload(InvoiceItem.supplier),
                selectinload(Invoice.employee),
                selectinload(Invoice.machine),
                selectinload(Invoice.mechanism),
                selectinload(Invoice.supplier),
                selectinload(Invoice.price_details),
            )
            .where(Invoice.id == id)
        )
        result = await self.session.scalars(stmt)
        return result.first()

    async def get_by_type_paginated(
        self,
        invoice_type: str,
        user: Employee,
        page: int,
        page_size: int,
        get_all: bool = False
    ) -> tuple[list[Invoice], int]:
        # Build base query with permission filtering
        stmt = select(Invoice).where(Invoice.type == invoice_type)

        # Apply permission filters (same logic as Flask filter_perms)
        stmt = self._apply_permission_filters(stmt, user)

        # Count total
        count_stmt = select(func.count()).select_from(stmt.subquery())
        total = (await self.session.execute(count_stmt)).scalar() or 0

        # Apply pagination
        stmt = stmt.order_by(Invoice.id.desc())
        if not get_all:
            stmt = stmt.offset((page - 1) * page_size).limit(page_size)

        result = await self.session.scalars(stmt)
        return list(result.all()), total

    async def get_last_id(self) -> int:
        stmt = select(func.max(Invoice.id))
        result = await self.session.execute(stmt)
        return (result.scalar() or 0) + 1
```

### 3.3 Prices Repository (repositories/prices.py)
```python
class PricesRepository(BaseRepository[Prices]):
    async def get_fifo_prices(
        self,
        item_id: int,
        location: str,
        supplier_id: int | None = None
    ) -> list[Prices]:
        """Get prices ordered by FIFO (oldest first) with remaining quantity"""
        stmt = (
            select(Prices)
            .where(
                Prices.item_id == item_id,
                Prices.location == location,
                Prices.remaining_quantity > 0
            )
            .order_by(Prices.invoice_id.asc())  # FIFO: oldest first
        )
        if supplier_id:
            stmt = stmt.where(Prices.supplier_id == supplier_id)

        result = await self.session.scalars(stmt)
        return list(result.all())

    async def consume_fifo(
        self,
        item_id: int,
        location: str,
        quantity: Decimal,
        supplier_id: int | None = None
    ) -> list[dict]:
        """Consume quantity using FIFO and return price breakdown"""
        prices = await self.get_fifo_prices(item_id, location, supplier_id)
        remaining = quantity
        breakdown = []

        for price in prices:
            if remaining <= 0:
                break

            take = min(remaining, price.remaining_quantity)
            price.remaining_quantity -= take
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
```

---

## Phase 4: Service Layer

### 4.1 Unit of Work (services/unit_of_work.py)
```python
class UnitOfWork:
    def __init__(self, session: AsyncSession):
        self.session = session
        self._repositories: dict[str, Any] = {}

    @property
    def invoices(self) -> InvoiceRepository:
        if "invoices" not in self._repositories:
            self._repositories["invoices"] = InvoiceRepository(Invoice, self.session)
        return self._repositories["invoices"]

    @property
    def invoice_items(self) -> InvoiceItemRepository:
        if "invoice_items" not in self._repositories:
            self._repositories["invoice_items"] = InvoiceItemRepository(InvoiceItem, self.session)
        return self._repositories["invoice_items"]

    @property
    def warehouse(self) -> WarehouseRepository:
        if "warehouse" not in self._repositories:
            self._repositories["warehouse"] = WarehouseRepository(Warehouse, self.session)
        return self._repositories["warehouse"]

    @property
    def prices(self) -> PricesRepository:
        if "prices" not in self._repositories:
            self._repositories["prices"] = PricesRepository(Prices, self.session)
        return self._repositories["prices"]

    # ... other repositories

    async def commit(self):
        await self.session.commit()

    async def rollback(self):
        await self.session.rollback()
```

### 4.2 Invoice Service Factory (services/invoice/factory.py)
```python
class InvoiceServiceFactory:
    _services = {
        "صرف": SalesService,
        "اضافه": PurchaseService,
        "أمانات": WarrantyService,
        "مرتجع": ReturnsService,
        "توالف": VoidService,
        "حجز": BookingService,
        "تحويل": TransferService,
        "طلب شراء": PurchaseRequestService,
    }

    @classmethod
    def get_service(cls, invoice_type: str, uow: UnitOfWork) -> "BaseInvoiceService":
        service_class = cls._services.get(invoice_type)
        if not service_class:
            raise ValueError(f"Unknown invoice type: {invoice_type}")
        return service_class(uow)
```

### 4.3 Base Invoice Service (services/invoice/base.py)
```python
from abc import ABC, abstractmethod

class BaseInvoiceService(ABC):
    def __init__(self, uow: UnitOfWork):
        self.uow = uow

    @abstractmethod
    async def create(self, data: dict, user: Employee) -> Invoice:
        """Create invoice - implemented by each type"""
        pass

    @abstractmethod
    async def update(self, invoice: Invoice, data: dict, user: Employee) -> Invoice:
        """Update invoice - implemented by each type"""
        pass

    @abstractmethod
    async def delete(self, invoice: Invoice, user: Employee) -> dict:
        """Delete invoice - implemented by each type"""
        pass

    async def confirm(self, invoice: Invoice, user: Employee) -> Invoice:
        """Common confirmation workflow"""
        if invoice.status == "draft":
            invoice.status = "accreditation"
        elif invoice.status == "accreditation":
            invoice.status = "confirmed"
        await self.uow.session.flush()
        return invoice

    def _calculate_totals(self, items: list[dict]) -> tuple[Decimal, Decimal, Decimal]:
        """Calculate total, paid, residual"""
        total = sum(item.get("total_price", 0) for item in items)
        paid = Decimal("0")  # Set by caller if needed
        residual = total - paid
        return Decimal(str(total)), paid, residual
```

### 4.4 Sales Service Example (services/invoice/sales.py)
```python
class SalesService(BaseInvoiceService):
    """Handle صرف (sales/withdrawal) invoices"""

    async def create(self, data: dict, user: Employee) -> Invoice:
        # Validate permissions
        if not user.has_permission("can_withdraw"):
            raise PermissionError("Permission denied")

        # Create invoice
        invoice_data = {
            "type": "صرف",
            "status": "draft",
            "client_name": data.get("client_name"),
            "employee_id": user.id,
            "machine_id": data.get("machine_id"),
            "mechanism_id": data.get("mechanism_id"),
            "notes": data.get("notes"),
        }
        invoice = await self.uow.invoices.create(invoice_data)

        # Process items with FIFO pricing
        items_data = data.get("items", [])
        for item_data in items_data:
            # Get FIFO price breakdown
            price_breakdown = await self.uow.prices.consume_fifo(
                item_id=item_data["item_id"],
                location=item_data["location"],
                quantity=Decimal(str(item_data["quantity"])),
                supplier_id=item_data.get("supplier_id"),
            )

            # Calculate total from FIFO breakdown
            total_price = sum(p["subtotal"] for p in price_breakdown)
            avg_unit_price = total_price / Decimal(str(item_data["quantity"]))

            # Create invoice item
            invoice_item = await self.uow.invoice_items.create({
                "invoice_id": invoice.id,
                "item_id": item_data["item_id"],
                "location": item_data["location"],
                "quantity": item_data["quantity"],
                "unit_price": avg_unit_price,
                "total_price": total_price,
                "supplier_id": item_data.get("supplier_id"),
                "supplier_name": item_data.get("supplier_name"),
            })

            # Store price details
            for pd in price_breakdown:
                await self.uow.price_details.create({
                    "invoice_id": invoice.id,
                    "invoice_item_id": invoice_item.id,
                    **pd,
                })

            # Update item locations (reduce quantity)
            await self.uow.item_locations.reduce_quantity(
                item_id=item_data["item_id"],
                location=item_data["location"],
                quantity=Decimal(str(item_data["quantity"])),
            )

        # Update invoice totals
        total, paid, residual = self._calculate_totals(items_data)
        invoice.total_amount = total
        invoice.paid = Decimal(str(data.get("paid", 0)))
        invoice.residual = total - invoice.paid

        await self.uow.session.flush()
        return invoice

    async def update(self, invoice: Invoice, data: dict, user: Employee) -> Invoice:
        # Implementation follows same pattern
        pass

    async def delete(self, invoice: Invoice, user: Employee) -> dict:
        # Restore quantities and prices
        pass
```

---

## Phase 5: API Layer

### 5.1 Dependencies (api/deps.py)
```python
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import jwt, JWTError

security = HTTPBearer()

async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with async_session_maker() as session:
        try:
            yield session
        except Exception:
            await session.rollback()
            raise

def get_uow(session: AsyncSession = Depends(get_db)) -> UnitOfWork:
    return UnitOfWork(session)

async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    uow: UnitOfWork = Depends(get_uow)
) -> Employee:
    token = credentials.credentials
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        user_id = int(payload.get("sub"))
    except (JWTError, ValueError):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token"
        )

    user = await uow.users.get_with_roles(user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found"
        )
    return user

def require_permission(permission_code: str):
    """Dependency factory for permission checking"""
    async def check_permission(user: Employee = Depends(get_current_user)) -> Employee:
        if not user.has_permission(permission_code):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Permission denied"
            )
        return user
    return check_permission
```

### 5.2 Invoice API (api/invoices.py) - EXACT ENDPOINT MATCH
```python
from fastapi import APIRouter, Depends, HTTPException, Query

router = APIRouter(prefix="/invoice", tags=["Invoice"])

@router.get("/")
async def list_invoices(
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100),
    all: bool = Query(False, alias="all"),
    user: Employee = Depends(get_current_user),
    uow: UnitOfWork = Depends(get_uow)
):
    """GET /invoice/ - List all invoices with pagination"""
    invoices, total = await uow.invoices.get_paginated_with_permissions(
        user=user,
        page=page,
        page_size=page_size,
        get_all=all
    )

    items = [await _serialize_invoice(inv) for inv in invoices]

    if all:
        return {"items": items, "page": 1, "page_size": total, "total_pages": 1, "total_items": total, "all": True}

    total_pages = (total + page_size - 1) // page_size
    return {
        "items": items,
        "page": page,
        "page_size": page_size,
        "total_pages": total_pages,
        "total_items": total,
        "all": False
    }

@router.get("/last-id")
async def get_last_id(uow: UnitOfWork = Depends(get_uow)):
    """GET /invoice/last-id"""
    last_id = await uow.invoices.get_last_id()
    return {"last_id": last_id}

@router.get("/fifo-prices/{item_id}")
async def get_fifo_prices(
    item_id: int,
    location: str = Query(...),
    user: Employee = Depends(get_current_user),
    uow: UnitOfWork = Depends(get_uow)
):
    """GET /invoice/fifo-prices/<item_id>"""
    prices = await uow.prices.get_fifo_prices(item_id, location)
    return [_serialize_price(p) for p in prices]

@router.get("/inventory-value")
async def get_inventory_value(
    user: Employee = Depends(get_current_user),
    uow: UnitOfWork = Depends(get_uow)
):
    """GET /invoice/inventory-value"""
    # Implementation
    pass

@router.get("/sales-invoices")
async def get_sales_invoices(
    page: int = Query(1),
    page_size: int = Query(10),
    user: Employee = Depends(get_current_user),
    uow: UnitOfWork = Depends(get_uow)
):
    """GET /invoice/sales-invoices"""
    pass

@router.get("/price-report/{invoice_id}")
async def get_price_report(
    invoice_id: int,
    user: Employee = Depends(get_current_user),
    uow: UnitOfWork = Depends(get_uow)
):
    """GET /invoice/price-report/<id>"""
    pass

@router.get("/fifo-report")
async def get_fifo_report(
    user: Employee = Depends(get_current_user),
    uow: UnitOfWork = Depends(get_uow)
):
    """GET /invoice/fifo-report"""
    pass

@router.get("/{invoice_type}")
async def list_invoices_by_type(
    invoice_type: str,
    page: int = Query(1),
    page_size: int = Query(10),
    all: bool = Query(False),
    user: Employee = Depends(get_current_user),
    uow: UnitOfWork = Depends(get_uow)
):
    """GET /invoice/<type> - List invoices by type"""
    invoices, total = await uow.invoices.get_by_type_paginated(
        invoice_type=invoice_type,
        user=user,
        page=page,
        page_size=page_size,
        get_all=all
    )

    items = [await _serialize_invoice(inv) for inv in invoices]
    total_pages = (total + page_size - 1) // page_size if not all else 1

    return {
        "items": items,
        "page": page if not all else 1,
        "page_size": page_size if not all else total,
        "total_pages": total_pages,
        "total_items": total,
        "all": all
    }

@router.get("/{invoice_id:int}")
async def get_invoice(
    invoice_id: int,
    user: Employee = Depends(get_current_user),
    uow: UnitOfWork = Depends(get_uow)
):
    """GET /invoice/<id> - Get single invoice"""
    invoice = await uow.invoices.get_with_items(invoice_id)
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    return await _serialize_invoice_detail(invoice)

@router.post("/")
async def create_invoice(
    data: dict,  # Using dict to match Flask's flexible input
    user: Employee = Depends(get_current_user),
    uow: UnitOfWork = Depends(get_uow)
):
    """POST /invoice/ - Create invoice"""
    invoice_type = data.get("type")
    service = InvoiceServiceFactory.get_service(invoice_type, uow)

    try:
        invoice = await service.create(data, user)
        await uow.commit()
        return await _serialize_invoice_detail(invoice)
    except PermissionError as e:
        raise HTTPException(status_code=403, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.put("/{invoice_id}")
async def update_invoice(
    invoice_id: int,
    data: dict,
    user: Employee = Depends(get_current_user),
    uow: UnitOfWork = Depends(get_uow)
):
    """PUT /invoice/<id> - Update invoice"""
    invoice = await uow.invoices.get_with_items(invoice_id)
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")

    service = InvoiceServiceFactory.get_service(invoice.type, uow)
    try:
        updated = await service.update(invoice, data, user)
        await uow.commit()
        return await _serialize_invoice_detail(updated)
    except PermissionError as e:
        raise HTTPException(status_code=403, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.delete("/{invoice_id}")
async def delete_invoice(
    invoice_id: int,
    user: Employee = Depends(get_current_user),
    uow: UnitOfWork = Depends(get_uow)
):
    """DELETE /invoice/<id> - Delete invoice"""
    invoice = await uow.invoices.get_with_items(invoice_id)
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")

    service = InvoiceServiceFactory.get_service(invoice.type, uow)
    try:
        result = await service.delete(invoice, user)
        await uow.commit()
        return result
    except PermissionError as e:
        raise HTTPException(status_code=403, detail=str(e))

@router.post("/{invoice_id}/confirm")
async def confirm_invoice(
    invoice_id: int,
    user: Employee = Depends(get_current_user),
    uow: UnitOfWork = Depends(get_uow)
):
    """POST /invoice/<id>/confirm - Confirm invoice"""
    invoice = await uow.invoices.get_with_items(invoice_id)
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")

    service = InvoiceServiceFactory.get_service(invoice.type, uow)
    confirmed = await service.confirm(invoice, user)
    await uow.commit()
    return await _serialize_invoice_detail(confirmed)

@router.post("/{invoice_id}/ReturnWarranty")
async def return_warranty(
    invoice_id: int,
    data: dict,
    user: Employee = Depends(get_current_user),
    uow: UnitOfWork = Depends(get_uow)
):
    """POST /invoice/<id>/ReturnWarranty"""
    pass

@router.get("/{invoice_id}/WarrantyReturnStatus")
async def warranty_return_status(
    invoice_id: int,
    user: Employee = Depends(get_current_user),
    uow: UnitOfWork = Depends(get_uow)
):
    """GET /invoice/<id>/WarrantyReturnStatus"""
    pass

@router.post("/{invoice_id}/PurchaseRequestConfirmation")
async def confirm_purchase_request(
    invoice_id: int,
    user: Employee = Depends(get_current_user),
    uow: UnitOfWork = Depends(get_uow)
):
    """POST /invoice/<id>/PurchaseRequestConfirmation"""
    pass

@router.post("/updateprice/{invoice_id}")
async def update_price(
    invoice_id: int,
    data: dict,
    user: Employee = Depends(get_current_user),
    uow: UnitOfWork = Depends(get_uow)
):
    """POST /invoice/updateprice/<id>"""
    pass


# Helper functions for serialization (matching Flask output exactly)
async def _serialize_invoice(invoice: Invoice) -> dict:
    """Serialize invoice for list view"""
    suppliers = set()
    for item in invoice.items:
        if item.supplier_name:
            suppliers.add(item.supplier_name)

    return {
        "id": invoice.id,
        "type": invoice.type,
        "client_name": invoice.client_name,
        "status": invoice.status,
        "employee_name": invoice.employee.username if invoice.employee else None,
        "machine_name": invoice.machine.name if invoice.machine else None,
        "mechanism_name": invoice.mechanism.name if invoice.mechanism else None,
        "total_amount": float(invoice.total_amount),
        "paid": float(invoice.paid),
        "residual": float(invoice.residual),
        "created_at": invoice.created_at.strftime("%Y-%m-%d %H:%M:%S") if invoice.created_at else None,
        "notes": invoice.notes,
        "deduction_status": invoice.deduction_status,
        "suppliers_summary": list(suppliers),
    }

async def _serialize_invoice_detail(invoice: Invoice) -> dict:
    """Serialize invoice with full item details"""
    result = await _serialize_invoice(invoice)

    items = []
    for item in invoice.items:
        item_dict = {
            "item_id": item.item_id,
            "item_name": item.warehouse.item_name if item.warehouse else None,
            "barcode": item.warehouse.item_bar if item.warehouse else None,
            "quantity": float(item.quantity),
            "location": item.location,
            "unit_price": float(item.unit_price),
            "total_price": float(item.total_price),
            "supplier_id": item.supplier_id,
            "supplier_name": item.supplier_name,
            "price_details": [],
        }

        # Add price details if available
        for pd in invoice.price_details:
            if pd.invoice_item_id == item.id:
                item_dict["price_details"].append({
                    "source_price_invoice_id": pd.source_price_invoice_id,
                    "quantity": float(pd.quantity),
                    "unit_price": float(pd.unit_price),
                    "subtotal": float(pd.subtotal),
                })

        items.append(item_dict)

    result["items"] = items
    return result
```

### 5.3 Auth API (api/auth.py) - EXACT ENDPOINT MATCH
```python
router = APIRouter(prefix="/auth", tags=["Auth"])

@router.post("/register")
async def register(data: dict, uow: UnitOfWork = Depends(get_uow)):
    """POST /auth/register"""
    # Create user with permissions
    pass

@router.post("/login")
async def login(data: dict, uow: UnitOfWork = Depends(get_uow)):
    """POST /auth/login - Returns {access_token, user}"""
    user = await uow.users.get_by_username(data["username"])
    if not user or not verify_password(data["password"], user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    token = create_access_token(user.id)

    return {
        "access_token": token,
        "user": user.to_dict_with_permissions()  # Includes all boolean permission fields
    }

@router.get("/users")
async def list_users(
    page: int = Query(1),
    page_size: int = Query(10),
    all: bool = Query(False),
    user: Employee = Depends(get_current_user),
    uow: UnitOfWork = Depends(get_uow)
):
    """GET /auth/users"""
    users, total = await uow.users.get_paginated(page, page_size, all)
    items = [u.to_dict_with_permissions() for u in users]

    total_pages = (total + page_size - 1) // page_size if not all else 1
    return {
        "items": items,
        "page": page if not all else 1,
        "page_size": page_size if not all else total,
        "total_pages": total_pages,
        "total_items": total,
        "all": all
    }

@router.get("/user")
async def get_current_user_info(user: Employee = Depends(get_current_user)):
    """GET /auth/user - Current user from token"""
    return user.to_dict_with_permissions()

@router.get("/user/{user_id}")
async def get_user(
    user_id: int,
    user: Employee = Depends(get_current_user),
    uow: UnitOfWork = Depends(get_uow)
):
    """GET /auth/user/<id>"""
    target = await uow.users.get_with_roles(user_id)
    if not target:
        raise HTTPException(status_code=404, detail="User not found")
    return target.to_dict_with_permissions()

@router.put("/user/{user_id}")
async def update_user(
    user_id: int,
    data: dict,
    user: Employee = Depends(get_current_user),
    uow: UnitOfWork = Depends(get_uow)
):
    """PUT /auth/user/<id> - Update user permissions"""
    # Update roles based on permission fields in data
    pass

@router.post("/user/{user_id}/change-password")
async def change_password(
    user_id: int,
    data: dict,
    user: Employee = Depends(get_current_user),
    uow: UnitOfWork = Depends(get_uow)
):
    """POST /auth/user/<id>/change-password"""
    pass

@router.delete("/user/{user_id}")
async def delete_user(
    user_id: int,
    user: Employee = Depends(get_current_user),
    uow: UnitOfWork = Depends(get_uow)
):
    """DELETE /auth/user/<id>"""
    pass
```

### 5.4 Other API Files (same pattern)
- api/warehouse.py - `/warehouse/*` endpoints
- api/rental.py - `/rental/*` endpoints
- api/machines.py - `/machines/*` endpoints
- api/mechanisms.py - `/mechanisms/*` endpoints
- api/suppliers.py - `/suppliers/*` endpoints
- api/reports.py - `/reports/*` endpoints

All matching exact Flask routes.

---

## Phase 6: Background Tasks with Celery

### 6.1 Celery Configuration (background/celery_app.py)
```python
from celery import Celery

celery_app = Celery(
    "warehouse_app",
    broker=settings.CELERY_BROKER_URL,
    backend=settings.CELERY_RESULT_BACKEND,
    include=["app.background.tasks.excel_import", "app.background.tasks.reports"]
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    task_track_started=True,
    task_time_limit=30 * 60,
)
```

### 6.2 Tasks (background/tasks/excel_import.py)
```python
@celery_app.task(bind=True)
def bulk_import_warehouse_items(self, file_path: str, user_id: int):
    """Import warehouse items from Excel - runs in background"""
    pass

@celery_app.task(bind=True)
def bulk_import_invoices(self, file_path: str, user_id: int):
    """Import invoices from Excel"""
    pass
```

---

## Phase 7: Caching

### 7.1 Redis Cache (core/cache.py)
```python
import redis.asyncio as redis
import json
from functools import wraps

class RedisCache:
    def __init__(self):
        self.redis: redis.Redis | None = None
        self.prefix = "warehouse_app:"

    async def connect(self, url: str):
        self.redis = await redis.from_url(url)

    async def get(self, key: str) -> Any | None:
        if not self.redis:
            return None
        data = await self.redis.get(f"{self.prefix}{key}")
        return json.loads(data) if data else None

    async def set(self, key: str, value: Any, ttl: int = 300):
        if not self.redis:
            return
        await self.redis.set(
            f"{self.prefix}{key}",
            json.dumps(value, default=str),
            ex=ttl
        )

    async def delete_pattern(self, pattern: str):
        if not self.redis:
            return
        keys = []
        async for key in self.redis.scan_iter(f"{self.prefix}{pattern}"):
            keys.append(key)
        if keys:
            await self.redis.delete(*keys)

cache = RedisCache()
```

---

## Phase 8: Testing with Pytest

### 8.1 Test Configuration (tests/conftest.py)
```python
import pytest
import asyncio
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession

TEST_DATABASE_URL = "postgresql+asyncpg://test:test@localhost:5432/test_warehouse"

@pytest.fixture(scope="session")
def event_loop():
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()

@pytest.fixture(scope="session")
async def test_engine():
    engine = create_async_engine(TEST_DATABASE_URL)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield engine
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    await engine.dispose()

@pytest.fixture
async def db_session(test_engine):
    async with AsyncSession(test_engine) as session:
        yield session
        await session.rollback()

@pytest.fixture
async def client(db_session):
    app.dependency_overrides[get_db] = lambda: db_session
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac

@pytest.fixture
async def auth_headers(client, db_session):
    # Create test user and return auth headers
    pass
```

### 8.2 Example Tests
```python
# tests/integration/test_api/test_invoices.py
import pytest

class TestInvoiceAPI:
    @pytest.mark.asyncio
    async def test_list_invoices(self, client, auth_headers):
        response = await client.get("/invoice/", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert "items" in data
        assert "page" in data
        assert "total_items" in data

    @pytest.mark.asyncio
    async def test_create_sales_invoice(self, client, auth_headers):
        response = await client.post(
            "/invoice/",
            headers=auth_headers,
            json={
                "type": "صرف",
                "client_name": "Test Client",
                "items": [...]
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert data["type"] == "صرف"
        assert data["status"] == "draft"

    @pytest.mark.asyncio
    async def test_get_invoice(self, client, auth_headers, sample_invoice):
        response = await client.get(f"/invoice/{sample_invoice.id}", headers=auth_headers)
        assert response.status_code == 200

    @pytest.mark.asyncio
    async def test_confirm_invoice(self, client, auth_headers, sample_invoice):
        response = await client.post(
            f"/invoice/{sample_invoice.id}/confirm",
            headers=auth_headers
        )
        assert response.status_code == 200
        assert response.json()["status"] in ["accreditation", "confirmed"]

# tests/unit/test_services/test_fifo.py
class TestFIFOService:
    @pytest.mark.asyncio
    async def test_consume_fifo_order(self, db_session):
        """Test that FIFO consumes oldest prices first"""
        pass

    @pytest.mark.asyncio
    async def test_consume_partial_quantity(self, db_session):
        """Test consuming partial quantity from a price record"""
        pass
```

---

## Phase 9: Database Migration

### 9.1 Alembic Migration for Roles/Permissions
```python
# alembic/versions/001_add_roles_permissions.py
def upgrade():
    # Create permissions table
    op.create_table(
        'permissions',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('code', sa.String(100), unique=True, nullable=False),
        sa.Column('name', sa.String(200), nullable=False),
        sa.Column('category', sa.String(50), nullable=False),
        sa.Column('description', sa.Text()),
    )

    # Create roles table
    op.create_table(
        'roles',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('name', sa.String(100), unique=True, nullable=False),
        sa.Column('description', sa.Text()),
        sa.Column('is_system', sa.Boolean(), default=False),
    )

    # Create association tables
    op.create_table(
        'role_permissions',
        sa.Column('role_id', sa.Integer(), sa.ForeignKey('roles.id'), primary_key=True),
        sa.Column('permission_id', sa.Integer(), sa.ForeignKey('permissions.id'), primary_key=True),
    )

    op.create_table(
        'user_roles',
        sa.Column('user_id', sa.Integer(), sa.ForeignKey('employees.id'), primary_key=True),
        sa.Column('role_id', sa.Integer(), sa.ForeignKey('roles.id'), primary_key=True),
    )

    # Seed permissions
    # ... insert all 40+ permission records

    # Create default roles
    # Admin - all permissions
    # Manager - most permissions
    # User - basic permissions

def downgrade():
    op.drop_table('user_roles')
    op.drop_table('role_permissions')
    op.drop_table('roles')
    op.drop_table('permissions')
```

### 9.2 Data Migration Script
```python
# scripts/migrate_permissions.py
async def migrate_user_permissions():
    """Convert existing boolean fields to role assignments"""
    async with async_session_maker() as session:
        # Get all employees with their boolean permissions
        employees = await session.scalars(select(Employee))

        for emp in employees:
            # Collect all true permissions
            perms = []
            if getattr(emp, 'view_additions', False):
                perms.append('view_additions')
            # ... check all 40+ fields

            # Find or create a role with these exact permissions
            role = await find_or_create_custom_role(session, perms)
            emp.roles.append(role)

        await session.commit()
```

---

## Phase 10: Main Application

### 10.1 Main Entry Point (main.py)
```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from app.config import settings
from app.database import engine
from app.core.cache import cache
from app.api import auth, invoices, warehouse, rental, machines, mechanisms, suppliers, reports

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    await cache.connect(settings.REDIS_URL)
    yield
    # Shutdown
    await engine.dispose()
    if cache.redis:
        await cache.redis.close()

app = FastAPI(
    title="Warehouse Management API",
    lifespan=lifespan
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers (exact same paths as Flask)
app.include_router(auth.router)
app.include_router(invoices.router)
app.include_router(warehouse.router)
app.include_router(rental.router)
app.include_router(machines.router)
app.include_router(mechanisms.router)
app.include_router(suppliers.router)
app.include_router(reports.router)

@app.get("/health")
async def health():
    return {"status": "healthy"}
```

---

## Implementation Order

### Week 1: Foundation
1. [ ] Set up project structure (create all folders)
2. [ ] Create requirements.txt
3. [ ] Configure FastAPI application (main.py)
4. [ ] Set up config.py with Pydantic BaseSettings
5. [ ] Set up async database connection (database.py)
6. [ ] Create base model with Mapped/mapped_column

### Week 2: Models & Auth
7. [ ] Create Role/Permission models
8. [ ] Create Employee model with role relationship
9. [ ] Convert all other models to SQLAlchemy 2.0 syntax
10. [ ] Set up Alembic for migrations
11. [ ] Create migration for new tables
12. [ ] Implement security module (JWT, password hashing)
13. [ ] Create auth dependencies
14. [ ] Create /auth/* endpoints (exact match)

### Week 3: Repository & Service Layer
15. [ ] Implement base repository
16. [ ] Implement all specialized repositories
17. [ ] Implement Unit of Work pattern
18. [ ] Create FIFO service
19. [ ] Create base invoice service
20. [ ] Implement all invoice type services (صرف, اضافه, أمانات, etc.)

### Week 4: API Endpoints - Part 1
21. [ ] Implement /warehouse/* endpoints
22. [ ] Implement /machines/* endpoints
23. [ ] Implement /mechanisms/* endpoints
24. [ ] Implement /suppliers/* endpoints
25. [ ] Implement /invoice/ list endpoints
26. [ ] Implement /invoice/ create endpoints

### Week 5: API Endpoints - Part 2
27. [ ] Implement /invoice/ update endpoints
28. [ ] Implement /invoice/ delete endpoints
29. [ ] Implement /invoice/{id}/confirm
30. [ ] Implement FIFO endpoints
31. [ ] Implement warranty return endpoints
32. [ ] Implement /rental/* endpoints

### Week 6: Reports & Background Tasks
33. [ ] Implement /reports/* endpoints
34. [ ] Set up Celery with Redis
35. [ ] Implement bulk import tasks
36. [ ] Implement async Redis caching
37. [ ] Add caching to warehouse/machines/mechanisms/suppliers endpoints

### Week 7: Testing & Migration
38. [ ] Set up pytest with async support
39. [ ] Write unit tests for services
40. [ ] Write integration tests for API endpoints
41. [ ] Write permission tests
42. [ ] Create data migration script
43. [ ] Test migration

### Week 8: Polish & Deploy
44. [ ] Add health check endpoints
45. [ ] Performance testing
46. [ ] Final testing with frontend
47. [ ] Deployment configuration (uvicorn, gunicorn)

---

## Backward Compatibility Notes

1. **All endpoints preserved exactly** - same paths, methods, query params
2. **Response structures identical** - pagination format, invoice format, user format
3. **Permission fields returned as booleans** - `to_dict_with_permissions()` method
4. **Arabic type names preserved** - صرف, اضافه, أمانات, مرتجع, توالف, حجز, تحويل, طلب شراء
5. **JWT token format same** - frontend doesn't need to change auth handling
6. **Error responses same format** - HTTP status codes and message format
