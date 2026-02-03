# Warehouse Management System

A full-featured async backend for multi-location inventory management, FIFO costing, invoice workflows, and role-based access control.

![Python](https://img.shields.io/badge/Python-3.11%2B-3572A5?style=flat-square)
![FastAPI](https://img.shields.io/badge/FastAPI-0.100%2B-009688?style=flat-square)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-14%2B-336791?style=flat-square)
![Redis](https://img.shields.io/badge/Redis-6%2B-D83B00?style=flat-square)
![SQLAlchemy](https://img.shields.io/badge/SQLAlchemy-2.0-d1428a?style=flat-square)

---

## Tech Stack

| Layer | Technology | Role |
|---|---|---|
| **Web Framework** | FastAPI | Async REST API, automatic OpenAPI docs |
| **ASGI Server** | Uvicorn | Production-grade async server |
| **Database** | PostgreSQL | Primary relational store |
| **Driver** | asyncpg | Async PostgreSQL driver |
| **ORM** | SQLAlchemy 2.0 | Async sessions, migrations via Alembic |
| **Cache** | Redis | Key-value cache with pattern-based invalidation |
| **Task Queue** | Celery | Background tasks, broker on Redis |
| **Validation** | Pydantic v2 | Request/response schemas + pydantic-settings |
| **Auth** | python-jose + passlib | JWT (HS256) tokens, bcrypt password hashing |
| **Data Import** | Pandas + OpenPyXL | Excel bulk import for items, suppliers, machines |
| **Testing** | Pytest + HTTPX | Async integration & unit tests, aiosqlite |

---

## Core Functionality

### 📦 Inventory Management
- Multi-location stock tracking via `item_locations`
- Barcode-based item identification
- Excel bulk import
- Real-time quantity updates per location

### 🧾 Invoice Workflows
- Invoice types: اضافه (purchase), صرف (sale), حجز (booking), إعادة (return), ضمان (warranty), نقل (transfer)
- Status lifecycle: `draft` → `confirmed` → `accreditation`
- Multi-item invoices with per-line supplier and pricing
- Name-to-ID resolution on create and update (accepts names or IDs)

### 💰 FIFO Costing
- First-In-First-Out price layer tracking in the `prices` table
- Automatic `unit_price` calculation on sales (صرف) by consuming oldest layers first
- Per-layer consumption recorded in `invoice_price_detail`
- FIFO report and per-item price history endpoints

### 🔐 Auth & RBAC
- JWT-based authentication with configurable expiry (default 6 h)
- Roles with 30+ granular permission codes
- Per-endpoint permission checks
- Employee CRUD with password management

### 🚚 Rental Operations
- Separate rental warehouse inventory (`rental_warehouse_locations`)
- Item lifecycle: `reserved` → `given` → `returned` / `borrowed_to_main`
- Borrow flow moves items from rental warehouse to main warehouse
- Customer info and return-date tracking

### 📊 Reporting & Filtering
- Invoice filtering by type, status, date range, and multiple parameters
- Item history across all invoices
- Inventory valuation endpoint
- Booking deduction and purchase-request reports

---

## Installation & Setup

### Prerequisites
- Python 3.11+
- PostgreSQL 14+
- Redis 6+

### 1. Clone the repository
```bash
git clone <repo-url>
cd Warehouse-Mang
```

### 2. Create and activate a virtual environment
```bash
cd app
python -m venv venv

# Windows
venv\Scripts\activate

# macOS / Linux
source venv/bin/activate
```

### 3. Install dependencies
```bash
pip install -r src/requirements.txt
```

### 4. Configure environment variables

Create a `.env` file in `app/src/` or set variables in your shell:

| Variable | Default | Description |
|---|---|---|
| `DATABASE_URI_DEV` | `postgresql+asyncpg://postgres:mypassword@localhost:5432/cuppi-new` | Dev PostgreSQL URI |
| `SECRET_KEY` | *(set in config)* | JWT signing secret — **change in production** |
| `REDIS_URL` | `redis://localhost:6379/0` | Redis connection URL |
| `CELERY_BROKER_URL` | `redis://localhost:6379/1` | Celery broker (Redis DB 1) |
| `ACCESS_TOKEN_EXPIRE_HOURS` | `6` | JWT token TTL in hours |
| `CACHE_TTL` | `300` | Redis cache TTL in seconds |
| `ENV` | `development` | `development` or `production` |

### 5. Run database migrations
```bash
cd app/src
alembic upgrade head
```

### 6. Seed permissions
```bash
python -m scripts.seed_permissions
```
Inserts all 30+ permission codes required for RBAC.

### 7. Start Redis
Ensure Redis is running on the configured host and port before starting the app.
```bash
redis-server
```

### 8. Run the backend
```bash
cd app
python run.py
```
Server starts on `http://localhost:8003`. API docs at `/docs`.

### 9. (Optional) Start Celery worker
```bash
cd app/src
celery -A background.celery_app worker --loglevel=info
```

---

## Database Definition

18 tables across 5 domains: **Auth**, **Inventory**, **Invoices**, **Reference**, **Operations**.

---

<details>
<summary><strong>employee</strong> — Staff & system users</summary>

| Column | Type | Flags | Default |
|---|---|---|---|
| `id` | Integer | PK | auto |
| `username` | String(80) | UNIQUE | — |
| `password_hash` | String(255) | | — |
| `job_name` | String(100) | | — |
| `phone_number` | String(20) | nullable | NULL |
| `created_at` | DateTime(tz) | | now() |
| `updated_at` | DateTime(tz) | nullable | NULL |

</details>

<details>
<summary><strong>roles</strong> — Permission groupings</summary>

| Column | Type | Flags | Default |
|---|---|---|---|
| `id` | Integer | PK | auto |
| `name` | String(100) | UNIQUE | — |
| `description` | Text | nullable | NULL |
| `is_system` | Boolean | | false |

</details>

<details>
<summary><strong>permissions</strong> — Granular access-control codes</summary>

| Column | Type | Flags | Default |
|---|---|---|---|
| `id` | Integer | PK | auto |
| `code` | String(100) | UNIQUE | — |
| `name` | String(200) | | — |
| `category` | String(50) | | — |
| `description` | Text | nullable | NULL |

</details>

<details>
<summary><strong>user_roles / role_permissions</strong> — Many-to-many join tables</summary>

| Table | Columns | Purpose |
|---|---|---|
| `user_roles` | `user_id` → employee.id, `role_id` → roles.id | Assigns roles to employees |
| `role_permissions` | `role_id` → roles.id, `permission_id` → permissions.id | Assigns permissions to roles |

</details>

---

<details>
<summary><strong>warehouse</strong> — Inventory items master list</summary>

| Column | Type | Flags | Default |
|---|---|---|---|
| `id` | Integer | PK | auto |
| `item_name` | String(120) | | — |
| `item_bar` | String(100) | UNIQUE | — |
| `created_at` | DateTime(tz) | | now() |
| `updated_at` | DateTime(tz) | nullable | NULL |

</details>

<details>
<summary><strong>item_locations</strong> — Stock quantity per location</summary>

Composite primary key: (`item_id`, `location`)

| Column | Type | Flags | Default |
|---|---|---|---|
| `item_id` | Integer | PK, FK → warehouse.id | — |
| `location` | String(255) | PK | — |
| `quantity` | Integer | | 0 |

</details>

<details>
<summary><strong>prices</strong> — FIFO price layers</summary>

Composite primary key: (`invoice_id`, `item_id`, `location`, `supplier_id`)

| Column | Type | Flags | Default |
|---|---|---|---|
| `invoice_id` | Integer | PK, FK → invoice.id | — |
| `item_id` | Integer | PK, FK → warehouse.id | — |
| `location` | String(255) | PK | — |
| `supplier_id` | Integer | PK, FK → supplier.id | 0 |
| `quantity` | Integer | | — |
| `unit_price` | Float | | — |
| `created_at` | DateTime | | now() |

</details>

---

<details>
<summary><strong>invoice</strong> — Main transaction document</summary>

| Column | Type | Flags | Default |
|---|---|---|---|
| `id` | Integer | PK | auto |
| `type` | String(50) | | — |
| `status` | String(50) | | "draft" |
| `employee_id` | Integer | FK → employee.id | — |
| `employee_name` | String(50) | | — |
| `client_name` | String(50) | nullable | NULL |
| `warehouse_manager` | String(255) | nullable | NULL |
| `accreditation_manager` | String(255) | nullable | NULL |
| `total_amount` | Float | nullable | NULL |
| `paid` | Float | nullable | NULL |
| `residual` | Float | nullable | NULL |
| `comment` | String(255) | nullable | NULL |
| `payment_method` | String(255) | nullable | NULL |
| `custody_person` | String(255) | nullable | NULL |
| `deduction_status` | String(50) | nullable | NULL |
| `machine_id` | Integer | nullable, FK → machine.id | NULL |
| `mechanism_id` | Integer | nullable, FK → mechanism.id | NULL |
| `supplier_id` | Integer | nullable, FK → supplier.id | NULL |
| `created_at` | DateTime | | now() |

</details>

<details>
<summary><strong>invoice_item</strong> — Line items on an invoice</summary>

Composite primary key: (`invoice_id`, `item_id`, `location`, `supplier_id`)

| Column | Type | Flags | Default |
|---|---|---|---|
| `invoice_id` | Integer | PK, FK → invoice.id | — |
| `item_id` | Integer | PK, FK → warehouse.id | — |
| `location` | String(255) | PK | — |
| `supplier_id` | Integer | PK, FK → supplier.id | 0 |
| `quantity` | Integer | nullable | NULL |
| `unit_price` | Float | nullable | NULL |
| `total_price` | Float | nullable | NULL |
| `description` | Text | nullable | NULL |
| `new_location` | String(255) | nullable | NULL |
| `supplier_name` | String(255) | nullable | NULL |

</details>

<details>
<summary><strong>invoice_price_detail</strong> — FIFO consumption records</summary>

| Column | Type | Flags | Default |
|---|---|---|---|
| `id` | Integer | PK | auto |
| `invoice_id` | Integer | FK → invoice.id | — |
| `item_id` | Integer | FK → warehouse.id | — |
| `source_price_invoice_id` | Integer | Composite FK → prices | — |
| `source_price_item_id` | Integer | ↳ | — |
| `source_price_location` | String(255) | ↳ | — |
| `source_price_supplier_id` | Integer | ↳ | 0 |
| `quantity` | Integer | | — |
| `unit_price` | Float | | — |
| `subtotal` | Float | | — |
| `created_at` | DateTime | | now() |

</details>

---

<details>
<summary><strong>supplier</strong> — Vendor / supplier records</summary>

| Column | Type | Flags | Default |
|---|---|---|---|
| `id` | Integer | PK | auto |
| `name` | String(255) | | — |
| `description` | Text | nullable | NULL |

</details>

<details>
<summary><strong>machine</strong> — Equipment reference</summary>

| Column | Type | Flags | Default |
|---|---|---|---|
| `id` | Integer | PK | auto |
| `name` | String(255) | | — |
| `description` | Text | nullable | NULL |

</details>

<details>
<summary><strong>mechanism</strong> — Mechanism / component reference</summary>

| Column | Type | Flags | Default |
|---|---|---|---|
| `id` | Integer | PK | auto |
| `name` | String(255) | | — |
| `description` | Text | nullable | NULL |

</details>

---

<details>
<summary><strong>purchase_requests</strong> — Purchase order requests</summary>

| Column | Type | Flags | Default |
|---|---|---|---|
| `id` | Integer | PK | auto |
| `status` | String(50) | | — |
| `requested_quantity` | Integer | | — |
| `subtotal` | Float | | — |
| `invoice_id` | Integer | FK → invoice.id | — |
| `item_id` | Integer | FK → warehouse.id | — |
| `employee_id` | Integer | FK → employee.id | — |
| `machine_id` | Integer | FK → machine.id | — |
| `mechanism_id` | Integer | FK → mechanism.id | — |
| `created_at` | DateTime(tz) | | now() |
| `updated_at` | DateTime(tz) | nullable | NULL |

</details>

<details>
<summary><strong>booking_deductions</strong> — Deductions from booking invoices</summary>

| Column | Type | Flags | Default |
|---|---|---|---|
| `id` | Integer | PK | auto |
| `booking_invoice_id` | Integer | FK → invoice.id | — |
| `deducted_invoice_id` | Integer | FK → invoice.id | — |
| `item_id` | Integer | FK → warehouse.id | — |
| `quantity_deducted` | Integer | | — |
| `price_used` | Float | | — |
| `deducted_at` | DateTime | | now() |

</details>

<details>
<summary><strong>return_sales</strong> — Links sales invoices to their returns</summary>

| Column | Type | Flags | Default |
|---|---|---|---|
| `id` | Integer | PK | auto |
| `sales_invoice_id` | Integer | FK → invoice.id | — |
| `return_invoice_id` | Integer | FK → invoice.id | — |

</details>

<details>
<summary><strong>warranty_return</strong> — Warranty claim returns</summary>

| Column | Type | Flags | Default |
|---|---|---|---|
| `id` | Integer | PK | auto |
| `warranty_invoice_id` | Integer | FK → invoice.id | — |
| `item_id` | Integer | FK → warehouse.id | — |
| `location` | String(255) | | — |
| `returned_quantity` | Integer | | — |
| `return_date` | DateTime | | now() |
| `returned_by_employee_id` | Integer | FK → employee.id | — |
| `notes` | Text | nullable | NULL |

</details>

<details>
<summary><strong>rented_items</strong> — Rental item lifecycle tracking</summary>

| Column | Type | Flags | Default |
|---|---|---|---|
| `id` | Integer | PK | auto |
| `rental_invoice_id` | Integer | FK → invoice.id | — |
| `item_id` | Integer | FK → warehouse.id | — |
| `quantity` | Integer | | — |
| `unit_price` | Float | | — |
| `total_price` | Float | | — |
| `status` | String(50) | | "reserved" |
| `given_date` | DateTime | nullable | NULL |
| `expected_return_date` | DateTime | nullable | NULL |
| `actual_return_date` | DateTime | nullable | NULL |
| `customer_name` | String(255) | | — |
| `customer_phone` | String(20) | nullable | NULL |
| `customer_id_number` | String(50) | nullable | NULL |
| `borrowed_to_main_quantity` | Integer | | 0 |
| `borrowed_date` | DateTime | nullable | NULL |
| `notes` | Text | nullable | NULL |
| `created_at` | DateTime(tz) | | now() |
| `updated_at` | DateTime(tz) | nullable | NULL |

</details>

<details>
<summary><strong>rental_warehouse_locations</strong> — Rental warehouse stock & reservations</summary>

Composite primary key: (`item_id`, `location`)

| Column | Type | Flags | Default |
|---|---|---|---|
| `item_id` | Integer | PK, FK → warehouse.id | — |
| `location` | String(255) | PK | "RENTAL_WAREHOUSE" |
| `quantity` | Integer | | 0 |
| `reserved_quantity` | Integer | | 0 |
| `available_quantity` | Integer | | 0 |
| `created_at` | DateTime(tz) | | now() |
| `updated_at` | DateTime(tz) | nullable | NULL |

</details>

---

## API Endpoints

### Authentication — `/auth`

| Method | Path | Description |
|---|---|---|
| POST | `/auth/register` | Register new employee with roles & permissions |
| POST | `/auth/login` | Login (JSON body) → JWT token |
| POST | `/auth/token` | Login (form data, OAuth2-compatible) |
| GET | `/auth/users` | List all employees (paginated) |
| GET | `/auth/user` | Current user info |
| GET | `/auth/user/{user_id}` | Get employee by ID |
| PUT | `/auth/user/{user_id}` | Update employee permissions |
| POST | `/auth/user/{user_id}/change-password` | Admin password change |
| DELETE | `/auth/user/{user_id}` | Delete employee |

### Invoices — `/invoice`

| Method | Path | Description |
|---|---|---|
| GET | `/invoice/` | List all invoices (paginated) |
| GET | `/invoice/last-id` | Next available invoice ID |
| GET | `/invoice/{invoice_id}` | Single invoice with all items |
| GET | `/invoice/{type\|status}` | Filter by type or status label (`تم` / `لم-تراجع` / `لم-تؤكد`) |
| POST | `/invoice/` | Create invoice (routes through InvoiceService) |
| PUT | `/invoice/{invoice_id}` | Update invoice & items |
| DELETE | `/invoice/{invoice_id}` | Delete invoice |
| POST | `/invoice/{invoice_id}/confirm` | Advance invoice status |
| GET | `/invoice/fifo-prices/{item_id}` | FIFO price layers for an item |
| GET | `/invoice/inventory-value` | Total inventory valuation |
| GET | `/invoice/price-report/{invoice_id}` | Price breakdown for an invoice |
| GET | `/invoice/fifo-report` | Full FIFO inventory report |
| POST | `/invoice/{invoice_id}/ReturnWarranty` | Process warranty return |
| GET | `/invoice/{invoice_id}/WarrantyReturnStatus` | Warranty return status |
| POST | `/invoice/{invoice_id}/PurchaseRequestConfirmation` | Confirm purchase request |
| POST | `/invoice/updateprice/{invoice_id}` | Update prices on an invoice |
| GET | `/invoice/sales-invoices` | Sales invoices only |

### Warehouse — `/warehouse`

| Method | Path | Description |
|---|---|---|
| GET | `/warehouse/` | List items (paginated, cached) |
| POST | `/warehouse/` | Create item |
| GET | `/warehouse/{item_id}` | Get item with locations |
| PUT | `/warehouse/{item_id}` | Update item |
| DELETE | `/warehouse/{item_id}` | Delete item |
| POST | `/warehouse/excel` | Bulk import from Excel |
| GET | `/warehouse/cache/status` | Redis cache status |
| GET | `/warehouse/cache/clear` | Clear warehouse cache |

### Reference Data — `/supplier`, `/machine`, `/mechanism`

Each resource shares the same set of endpoints:

| Method | Path | Description |
|---|---|---|
| GET | `/{resource}/` | List (paginated) |
| POST | `/{resource}/` | Create |
| GET | `/{resource}/{id}` | Get by ID |
| PUT | `/{resource}/{id}` | Update |
| DELETE | `/{resource}/{id}` | Delete |
| POST | `/{resource}/excel` | Bulk import from Excel |

### Rental — `/rental`

| Method | Path | Description |
|---|---|---|
| GET | `/rental/items` | All rented items |
| GET | `/rental/warehouse` | Rental warehouse inventory |
| PUT | `/rental/status` | Update rental item status |
| POST | `/rental/borrow` | Move items rental → main warehouse |
| POST | `/rental/return` | Return rental items |
| GET | `/rental/missing-qty/{invoice_id}` | Booking deduction details |

### Reports — `/reports`

| Method | Path | Description |
|---|---|---|
| GET | `/reports/` | Overview counts |
| GET | `/reports/filter` | Advanced filter (invoice or item, date range, multi-param) |

### Health

| Method | Path | Description |
|---|---|---|
| GET | `/health` | Basic liveness check |
| GET | `/health/ready` | Readiness (DB + Redis ping) |
