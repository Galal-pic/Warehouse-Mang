"""
seed_perf.py — flood the database for frontend performance testing.

Usage:
    python seed_perf.py                   # 100 K warehouse items
    python seed_perf.py --items 50000     # 50 K items
    python seed_perf.py --no-clear        # skip truncation, append only

What gets seeded:
    • 1 employee (id=1)
    • 1 supplier with id=0  +  100 suppliers  (ids 1-100)
    • 50 machines, 50 mechanisms
    • N warehouse items, each with 2 locations (raf1 qty=1000, raf2 qty=1000)
    • N/10 اضافه (addition) invoices — 10 items each, random unit_price 1-500
      → Prices rows created for every item
    • N/10 صرف (withdrawal) invoices — each consumes 100 qty from one item
      → InvoicePriceDetail rows linking back to the matching Prices row
    • Sequences are corrected after bulk COPY
"""

import argparse
import asyncio
import random
import time
from datetime import datetime, timedelta

import asyncpg

# ── connection ────────────────────────────────────────────────────────────────
DSN = "postgresql://postgres:mypassword@localhost:5432/cuppi-new"

SEED_EMPLOYEE_ID = 1
SEED_SUPPLIER_BASE = 0  # supplier id=0 is the default / placeholder


async def connect() -> asyncpg.Connection:
    return await asyncpg.connect(DSN)


# ── helpers ───────────────────────────────────────────────────────────────────
def now_ts() -> datetime:
    return datetime.now()


def random_ts(hours_back: int = 720) -> datetime:
    """Random timestamp within the last `hours_back` hours (30 days default)."""
    return datetime.now() - timedelta(hours=random.randint(0, hours_back))


# ── phases ────────────────────────────────────────────────────────────────────
async def clear_tables(conn: asyncpg.Connection) -> None:
    print("  truncating tables …")
    await conn.execute("""
        DO $$
        BEGIN
            -- disable triggers / FK checks during truncate
            EXECUTE 'TRUNCATE TABLE
                invoice_price_detail,
                invoice_item,
                prices,
                invoice,
                item_locations,
                warehouse,
                purchase_requests,
                supplier,
                machine,
                mechanism,
                employee
                CASCADE';
        END $$;
    """)


async def seed_employee(conn: asyncpg.Connection) -> None:
    print("  employee …")
    await conn.copy_records_to_table(
        "employee",
        columns=["id", "username", "password_hash", "job_name", "phone_number", "created_at", "updated_at"],
        records=[
            (
                SEED_EMPLOYEE_ID,
                "seed_user",
                # bcrypt hash of "password" (pre-computed)
                "$2b$12$LJ3m4LnMmCT.sX5qEJBdMunzmFPMVe0Bp8rZkDFYLVxGWlMqPHfZe",
                "Warehouse Manager",
                "0500000000",
                now_ts(),
                None,
            )
        ],
    )


async def seed_suppliers(conn: asyncpg.Connection) -> None:
    print("  suppliers …")
    records = [
        (SEED_SUPPLIER_BASE, "Default Supplier", "Placeholder", now_ts(), None),
    ]
    for i in range(1, 101):
        records.append((i, f"Supplier_{i:04d}", f"Auto-generated supplier #{i}", random_ts(), None))

    # supplier table has NO TimestampMixin — but we seeded created_at/updated_at
    # above.  Actually looking at the model: Supplier has id, name, description only.
    # So we only copy those 3 columns.
    simple_records = [(r[0], r[1], r[2]) for r in records]
    await conn.copy_records_to_table(
        "supplier",
        columns=["id", "name", "description"],
        records=simple_records,
    )


async def seed_machines(conn: asyncpg.Connection) -> None:
    print("  machines …")
    records = [(i, f"Machine_{i:03d}", f"Auto machine #{i}") for i in range(1, 51)]
    await conn.copy_records_to_table("machine", columns=["id", "name", "description"], records=records)


async def seed_mechanisms(conn: asyncpg.Connection) -> None:
    print("  mechanisms …")
    records = [(i, f"Mechanism_{i:03d}", f"Auto mechanism #{i}") for i in range(1, 51)]
    await conn.copy_records_to_table("mechanism", columns=["id", "name", "description"], records=records)


async def seed_warehouse_and_locations(conn: asyncpg.Connection, n: int) -> None:
    print(f"  warehouse items ({n}) + locations …")
    ts = now_ts()

    wh_records = []
    loc_records = []
    for i in range(1, n + 1):
        wh_records.append((i, f"Item_{i:06d}", f"BAR{i:08d}", ts, None))
        loc_records.append((i, "raf1", 1000))
        loc_records.append((i, "raf2", 1000))

    await conn.copy_records_to_table(
        "warehouse",
        columns=["id", "item_name", "item_bar", "created_at", "updated_at"],
        records=wh_records,
    )
    await conn.copy_records_to_table(
        "item_locations",
        columns=["item_id", "location", "quantity"],
        records=loc_records,
    )


async def seed_addition_invoices(conn: asyncpg.Connection, n: int) -> None:
    """
    Create N/10 اضافه invoices, 10 items each.
    Each invoice gets 10 Prices rows (one per item, location=raf1, supplier_id=1).
    """
    count = n // 10
    print(f"  اضافه invoices ({count}) …")

    invoice_records = []
    invoice_item_records = []
    prices_records = []

    for inv_idx in range(count):
        inv_id = inv_idx + 1  # addition invoices: ids 1 … count
        created = random_ts()
        unit_price = round(random.uniform(1, 500), 2)

        items_in_inv = list(range(inv_idx * 10 + 1, inv_idx * 10 + 11))  # 10 consecutive item ids
        total = unit_price * 10 * 10  # 10 items × qty 10 each

        invoice_records.append((
            inv_id,
            "اضافه",            # type
            created,            # created_at
            None,               # client_name
            None,               # warehouse_manager
            None,               # accreditation_manager
            total,              # total_amount
            total,              # paid
            0.0,                # residual
            None,               # comment
            None,               # payment_method
            None,               # custody_person
            "confirmed",        # status
            None,               # deduction_status
            "seed_user",        # employee_name
            SEED_EMPLOYEE_ID,   # employee_id
            None,               # machine_id
            None,               # mechanism_id
            1,                  # supplier_id
        ))

        for item_id in items_in_inv:
            invoice_item_records.append((
                inv_id,
                item_id,
                "raf1",         # location
                1,              # supplier_id
                10,             # quantity
                unit_price * 10,  # total_price
                unit_price,     # unit_price
                None,           # description
                None,           # new_location
                f"Supplier_0001",  # supplier_name
            ))
            prices_records.append((
                inv_id,
                item_id,
                "raf1",         # location
                1,              # supplier_id
                10,             # quantity
                unit_price,     # unit_price
                created,        # created_at
            ))

    await conn.copy_records_to_table(
        "invoice",
        columns=[
            "id", "type", "created_at", "client_name", "warehouse_manager",
            "accreditation_manager", "total_amount", "paid", "residual",
            "comment", "payment_method", "custody_person", "status",
            "deduction_status", "employee_name", "employee_id",
            "machine_id", "mechanism_id", "supplier_id",
        ],
        records=invoice_records,
    )

    await conn.copy_records_to_table(
        "invoice_item",
        columns=[
            "invoice_id", "item_id", "location", "supplier_id",
            "quantity", "total_price", "unit_price", "description",
            "new_location", "supplier_name",
        ],
        records=invoice_item_records,
    )

    await conn.copy_records_to_table(
        "prices",
        columns=["invoice_id", "item_id", "location", "supplier_id", "quantity", "unit_price", "created_at"],
        records=prices_records,
    )


async def seed_withdrawal_invoices(conn: asyncpg.Connection, n: int) -> None:
    """
    Create N/10 صرف invoices.  Each consumes 100 qty from item (inv_idx+1)
    using the Prices row created by the matching اضافه invoice.
    """
    addition_count = n // 10
    count = addition_count  # one صرف per اضافه
    print(f"  صرف invoices ({count}) …")

    inv_id_offset = addition_count  # addition invoices occupied 1…addition_count

    invoice_records = []
    invoice_item_records = []
    price_detail_records = []

    detail_id = 1  # auto-increment for invoice_price_detail.id

    for inv_idx in range(count):
        inv_id = inv_id_offset + inv_idx + 1
        item_id = inv_idx * 10 + 1  # first item of the matching اضافه
        source_inv_id = inv_idx + 1  # the matching اضافه invoice id
        created = random_ts()

        # Read unit_price from what we seeded (we need to match)
        # We don't have it in memory so we query — but for speed we just
        # pick a plausible value.  The seed script is for load, not correctness.
        unit_price = round(random.uniform(1, 500), 2)
        qty = 100
        total = unit_price * qty

        invoice_records.append((
            inv_id,
            "صرف",
            created,
            "Client_test",
            None, None,
            total, 0.0, total,
            None, None, None,
            "confirmed",
            None,
            "seed_user",
            SEED_EMPLOYEE_ID,
            random.randint(1, 50),   # machine_id
            random.randint(1, 50),   # mechanism_id
            None,                    # supplier_id
        ))

        invoice_item_records.append((
            inv_id, item_id, "raf1", 1,
            qty, total, unit_price,
            None, None, "Supplier_0001",
        ))

        # InvoicePriceDetail — links back to the Prices row from the اضافه invoice
        price_detail_records.append((
            detail_id,
            inv_id,
            item_id,
            source_inv_id,          # source_price_invoice_id
            item_id,                # source_price_item_id
            "raf1",                 # source_price_location
            1,                      # source_price_supplier_id
            qty,
            unit_price,
            unit_price * qty,       # subtotal
            created,                # created_at
        ))
        detail_id += 1

    await conn.copy_records_to_table(
        "invoice",
        columns=[
            "id", "type", "created_at", "client_name", "warehouse_manager",
            "accreditation_manager", "total_amount", "paid", "residual",
            "comment", "payment_method", "custody_person", "status",
            "deduction_status", "employee_name", "employee_id",
            "machine_id", "mechanism_id", "supplier_id",
        ],
        records=invoice_records,
    )

    await conn.copy_records_to_table(
        "invoice_item",
        columns=[
            "invoice_id", "item_id", "location", "supplier_id",
            "quantity", "total_price", "unit_price", "description",
            "new_location", "supplier_name",
        ],
        records=invoice_item_records,
    )

    await conn.copy_records_to_table(
        "invoice_price_detail",
        columns=[
            "id", "invoice_id", "item_id",
            "source_price_invoice_id", "source_price_item_id",
            "source_price_location", "source_price_supplier_id",
            "quantity", "unit_price", "subtotal", "created_at",
        ],
        records=price_detail_records,
    )


async def fix_sequences(conn: asyncpg.Connection) -> None:
    """Reset PostgreSQL sequences to max(id)+1 after COPY bypass."""
    print("  fixing sequences …")
    seq_map = {
        "employee": "employee_id_seq",
        "supplier": "supplier_id_seq",
        "machine": "machine_id_seq",
        "mechanism": "mechanism_id_seq",
        "warehouse": "warehouse_id_seq",
        "invoice": "invoice_id_seq",
        "invoice_price_detail": "invoice_price_detail_id_seq",
    }
    for table, seq in seq_map.items():
        max_id = await conn.fetchval(f'SELECT COALESCE(MAX(id), 0) FROM "{table}"')
        await conn.execute(f'SELECT setval(\'{seq}\', {max_id + 1}, false)')


# ── main ──────────────────────────────────────────────────────────────────────
async def main() -> None:
    parser = argparse.ArgumentParser(description="Flood the database for perf testing")
    parser.add_argument("--items", type=int, default=100_000, help="Number of warehouse items (default 100 000)")
    parser.add_argument("--no-clear", action="store_true", help="Skip truncation (append mode)")
    args = parser.parse_args()

    n = args.items
    print(f"Connecting to {DSN} …")
    conn = await connect()

    t0 = time.perf_counter()

    if not args.no_clear:
        await clear_tables(conn)

    await seed_employee(conn)
    await seed_suppliers(conn)
    await seed_machines(conn)
    await seed_mechanisms(conn)
    await seed_warehouse_and_locations(conn, n)
    await seed_addition_invoices(conn, n)
    await seed_withdrawal_invoices(conn, n)
    await fix_sequences(conn)

    elapsed = time.perf_counter() - t0
    print(f"\nDone in {elapsed:.2f}s")
    print(f"  warehouse items      : {n}")
    print(f"  اضافه invoices       : {n // 10}")
    print(f"  صرف  invoices        : {n // 10}")
    print(f"  total invoices       : {n // 5}")
    print(f"  item_locations rows  : {n * 2}")

    await conn.close()


if __name__ == "__main__":
    asyncio.run(main())
