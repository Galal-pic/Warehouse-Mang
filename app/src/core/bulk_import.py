"""
asyncpg COPY helpers for bulk imports.

Uses the PostgreSQL COPY protocol directly (bypassing SQLAlchemy ORM)
for 5-50x faster bulk inserts compared to row-by-row INSERT.
"""

from typing import TYPE_CHECKING

import asyncpg
from src.config import settings

if TYPE_CHECKING:
    import pandas as pd


def parse_upload(contents: bytes, filename: str) -> "pd.DataFrame":
    """
    Parse an uploaded file into a DataFrame.
    Detects format by extension: .csv uses read_csv, anything else
    (.xlsx / .xls) uses the calamine Rust engine (~20x faster than openpyxl).
    """
    import pandas as pd
    from io import BytesIO

    ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else ""
    if ext == "csv":
        return pd.read_csv(BytesIO(contents))
    return pd.read_excel(BytesIO(contents), engine="calamine")


def _dsn() -> str:
    """Convert SQLAlchemy URL to plain postgresql:// DSN for asyncpg."""
    url = settings.database_url
    return url.replace("postgresql+asyncpg://", "postgresql://", 1)


async def copy_records(table: str, columns: list[str], records: list[tuple]) -> int:
    """
    COPY records into a table via asyncpg binary protocol.
    Returns the number of rows inserted.
    """
    if not records:
        return 0
    conn = await asyncpg.connect(_dsn())
    try:
        async with conn.transaction():
            await conn.copy_records_to_table(table, columns=columns, records=records)
        return len(records)
    finally:
        await conn.close()


async def upsert_warehouse(records: list[tuple[str, str]]) -> tuple[int, int]:
    """
    Upsert warehouse items using a temp table + INSERT ON CONFLICT.

    Each record is (item_name, item_bar).
    Returns (created_count, updated_count).
    """
    if not records:
        return 0, 0

    conn = await asyncpg.connect(_dsn())
    try:
        async with conn.transaction():
            await conn.execute("""
                CREATE TEMP TABLE _wh_import (
                    item_name TEXT NOT NULL,
                    item_bar  TEXT NOT NULL
                ) ON COMMIT DROP
            """)

            await conn.copy_records_to_table(
                "_wh_import",
                columns=["item_name", "item_bar"],
                records=records,
            )

            # Count how many already exist (will be updated)
            updated = await conn.fetchval("""
                SELECT COUNT(*)
                FROM _wh_import t
                JOIN warehouse w ON w.item_bar = t.item_bar
            """)

            # Upsert: insert new, update existing
            await conn.execute("""
                INSERT INTO warehouse (item_name, item_bar, created_at)
                SELECT item_name, item_bar, NOW()
                FROM _wh_import
                ON CONFLICT (item_bar)
                DO UPDATE SET item_name = EXCLUDED.item_name,
                              updated_at = NOW()
            """)

        created = len(records) - updated
        return created, updated
    finally:
        await conn.close()


async def create_addition_invoices_bg(
    items: list[dict],
    employee_id: int,
    employee_name: str,
) -> None:
    """
    Background task: bulk-create اضافه invoices via asyncpg COPY.
    10 items per invoice, default supplier (id=0).
    Single connection, single transaction, ~9 queries total regardless of item count.
    """
    from datetime import datetime

    BATCH_SIZE = 10
    DEFAULT_SUPPLIER_ID = 0
    DEFAULT_SUPPLIER_NAME = "بدون مورد"

    if not items:
        return

    conn = await asyncpg.connect(_dsn())
    try:
        async with conn.transaction():
            # 1. Ensure default supplier (idempotent)
            await conn.execute("""
                INSERT INTO supplier (id, name, description)
                VALUES (0, $1, $2)
                ON CONFLICT (id) DO NOTHING
            """, DEFAULT_SUPPLIER_NAME, "Default supplier for items without a supplier")

            # 2. Single SELECT: barcode → warehouse.id
            barcodes = list({item["item_bar"] for item in items})
            rows = await conn.fetch(
                "SELECT item_bar, id FROM warehouse WHERE item_bar = ANY($1)",
                barcodes,
            )
            barcode_to_id = {row["item_bar"]: row["id"] for row in rows}

            # Drop barcodes not yet in warehouse (shouldn't happen after upsert)
            valid_items = [item for item in items if item["item_bar"] in barcode_to_id]
            if not valid_items:
                return

            # 3. Reserve all invoice IDs at once from the sequence
            num_invoices = (len(valid_items) + BATCH_SIZE - 1) // BATCH_SIZE
            id_rows = await conn.fetch("""
                SELECT nextval(pg_get_serial_sequence('invoice', 'id')) AS id
                FROM generate_series(1, $1)
            """, num_invoices)
            invoice_ids = [row["id"] for row in id_rows]

            # 4. Build every record in Python — zero per-row round-trips
            now = datetime.now()
            invoice_records: list[tuple] = []
            invoice_item_records: list[tuple] = []
            price_records: list[tuple] = []
            location_agg: dict[tuple[int, str], int] = {}  # (item_id, location) -> qty

            for batch_idx in range(num_invoices):
                inv_id = invoice_ids[batch_idx]
                batch = valid_items[batch_idx * BATCH_SIZE:(batch_idx + 1) * BATCH_SIZE]

                total_amount = 0.0
                for item_data in batch:
                    item_id = barcode_to_id[item_data["item_bar"]]
                    unit_price = item_data["unit_price"]
                    quantity = item_data["quantity"]
                    location = item_data["location"]
                    total_price = unit_price * quantity

                    invoice_item_records.append((
                        inv_id, item_id, location, DEFAULT_SUPPLIER_ID,
                        quantity, total_price, unit_price, DEFAULT_SUPPLIER_NAME,
                    ))
                    price_records.append((
                        inv_id, item_id, location, DEFAULT_SUPPLIER_ID,
                        quantity, unit_price, now,
                    ))

                    loc_key = (item_id, location)
                    location_agg[loc_key] = location_agg.get(loc_key, 0) + quantity
                    total_amount += total_price

                invoice_records.append((
                    inv_id, "اضافه", now,
                    round(total_amount, 3), 0.0, round(total_amount, 3),
                    "draft", employee_name, employee_id,
                ))

            # 5. COPY invoices
            await conn.copy_records_to_table("invoice", columns=[
                "id", "type", "created_at",
                "total_amount", "paid", "residual",
                "status", "employee_name", "employee_id",
            ], records=invoice_records)

            # 6. COPY invoice line items
            await conn.copy_records_to_table("invoice_item", columns=[
                "invoice_id", "item_id", "location", "supplier_id",
                "quantity", "total_price", "unit_price", "supplier_name",
            ], records=invoice_item_records)

            # 7. COPY FIFO price layers
            await conn.copy_records_to_table("prices", columns=[
                "invoice_id", "item_id", "location", "supplier_id",
                "quantity", "unit_price", "created_at",
            ], records=price_records)

            # 8. Upsert item_locations: temp table → INSERT ON CONFLICT adds qty
            await conn.execute("""
                CREATE TEMP TABLE _loc_import (
                    item_id  INTEGER NOT NULL,
                    location TEXT    NOT NULL,
                    quantity INTEGER NOT NULL
                ) ON COMMIT DROP
            """)
            await conn.copy_records_to_table(
                "_loc_import",
                columns=["item_id", "location", "quantity"],
                records=[(iid, loc, qty) for (iid, loc), qty in location_agg.items()],
            )
            await conn.execute("""
                INSERT INTO item_locations (item_id, location, quantity)
                SELECT item_id, location, quantity FROM _loc_import
                ON CONFLICT (item_id, location)
                DO UPDATE SET quantity = item_locations.quantity + EXCLUDED.quantity
            """)
    finally:
        await conn.close()


async def copy_reference(table: str, existing_names: set[str], records: list[tuple[str, str | None]]) -> int:
    """
    COPY new reference records (supplier / machine / mechanism).

    records: list of (name, description) tuples.
    existing_names: set of names already in the table — these are skipped.
    Returns created count.
    """
    new_records = [(name, desc) for name, desc in records if name not in existing_names]
    if not new_records:
        return 0
    return await copy_records(table, ["name", "description"], new_records)
