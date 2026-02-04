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
