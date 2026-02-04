"""
clear_data.py — wipe warehouse + invoice data for a clean slate.

    python clear_data.py

Cleared
-------
    warehouse, item_locations, rental_warehouse_locations,
    invoice, invoice_item, prices, invoice_price_detail,
    purchase_requests, return_sales, warranty_return,
    booking_deductions, rented_items

Untouched
---------
    employee, supplier, machine, mechanism, roles, permissions
"""

import asyncio

import asyncpg

# ── connection ────────────────────────────────────────────────────────────────
DSN = "postgresql://postgres:mypassword@localhost:5432/cuppi-new"

# Every table that will be emptied AND has its own auto-increment id
_ID_TABLES = [
    "invoice",
    "warehouse",
    "invoice_price_detail",
    "purchase_requests",
    "return_sales",
    "warranty_return",
    "booking_deductions",
    "rented_items",
]


async def main() -> None:
    conn = await asyncpg.connect(DSN)
    try:
        # Single TRUNCATE CASCADE — PostgreSQL automatically includes every
        # table whose FK points to invoice or warehouse (transitively).
        # supplier / machine / mechanism / employee are parents, not children,
        # so CASCADE does not reach them.
        print("  truncating …")
        await conn.execute("TRUNCATE invoice, warehouse CASCADE")

        # Reset sequences so next INSERT starts at 1
        print("  resetting sequences …")
        for table in _ID_TABLES:
            seq = await conn.fetchval(
                "SELECT pg_get_serial_sequence($1, 'id')", table
            )
            if seq:
                await conn.execute("SELECT setval($1, 1, false)", seq)

        print("Done.")
        print("  cleared  : warehouse, invoices, and all related tables")
        print("  untouched: employee, supplier, machine, mechanism")
    finally:
        await conn.close()


if __name__ == "__main__":
    asyncio.run(main())
