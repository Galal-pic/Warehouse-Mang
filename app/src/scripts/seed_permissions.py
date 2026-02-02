"""Seed permissions into the database"""

import asyncio
import sys
from pathlib import Path

# Add app directory to path so 'src' module is found
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from sqlalchemy import select

from src.database import async_session_maker
from src.models.role import Permission, ALL_PERMISSION_CODES


# Permission definitions with categories
PERMISSION_DEFINITIONS = [
    # Create Invoice Permissions
    {"code": "create_inventory_operations", "name": "Create Inventory Operations", "category": "invoice.create"},
    {"code": "create_additions", "name": "Create Additions", "category": "invoice.create"},
    # View Permissions
    {"code": "view_additions", "name": "View Additions", "category": "invoice.view"},
    {"code": "view_withdrawals", "name": "View Withdrawals", "category": "invoice.view"},
    {"code": "view_deposits", "name": "View Deposits", "category": "invoice.view"},
    {"code": "view_returns", "name": "View Returns", "category": "invoice.view"},
    {"code": "view_damages", "name": "View Damages", "category": "invoice.view"},
    {"code": "view_reservations", "name": "View Reservations", "category": "invoice.view"},
    {"code": "view_prices", "name": "View Prices", "category": "invoice.view"},
    {"code": "view_purchase_requests", "name": "View Purchase Requests", "category": "invoice.view"},
    {"code": "view_reports", "name": "View Reports", "category": "invoice.view"},
    {"code": "view_transfers", "name": "View Transfers", "category": "invoice.view"},
    # View Status Permissions
    {"code": "view_zero_valued", "name": "View Zero Valued", "category": "invoice.status"},
    {"code": "view_confirmed", "name": "View Confirmed", "category": "invoice.status"},
    {"code": "view_unreviewed", "name": "View Unreviewed", "category": "invoice.status"},
    {"code": "view_unconfirmed", "name": "View Unconfirmed", "category": "invoice.status"},
    # Action Permissions
    {"code": "can_edit", "name": "Can Edit", "category": "invoice.action"},
    {"code": "can_delete", "name": "Can Delete", "category": "invoice.action"},
    {"code": "can_confirm_withdrawal", "name": "Can Confirm Withdrawal", "category": "invoice.action"},
    {"code": "can_withdraw", "name": "Can Withdraw", "category": "invoice.action"},
    {"code": "can_update_prices", "name": "Can Update Prices", "category": "invoice.action"},
    {"code": "can_recover_deposits", "name": "Can Recover Deposits", "category": "invoice.action"},
    {"code": "can_confirm_purchase_requests", "name": "Can Confirm Purchase Requests", "category": "invoice.action"},
    # Change Status Permissions
    {"code": "can_change_zero_valued", "name": "Can Change Zero Valued", "category": "invoice.status"},
    {"code": "can_change_confirmed", "name": "Can Change Confirmed", "category": "invoice.status"},
    {"code": "can_change_unreviewed", "name": "Can Change Unreviewed", "category": "invoice.status"},
    {"code": "can_change_unconfirmed", "name": "Can Change Unconfirmed", "category": "invoice.status"},
    # Items Permissions
    {"code": "items_can_edit", "name": "Items Can Edit", "category": "warehouse"},
    {"code": "items_can_delete", "name": "Items Can Delete", "category": "warehouse"},
    {"code": "items_can_add", "name": "Items Can Add", "category": "warehouse"},
    # Machines Permissions
    {"code": "machines_can_edit", "name": "Machines Can Edit", "category": "machines"},
    {"code": "machines_can_delete", "name": "Machines Can Delete", "category": "machines"},
    {"code": "machines_can_add", "name": "Machines Can Add", "category": "machines"},
    # Mechanism Permissions
    {"code": "mechanism_can_edit", "name": "Mechanism Can Edit", "category": "mechanisms"},
    {"code": "mechanism_can_delete", "name": "Mechanism Can Delete", "category": "mechanisms"},
    {"code": "mechanism_can_add", "name": "Mechanism Can Add", "category": "mechanisms"},
    # Suppliers Permissions
    {"code": "suppliers_can_edit", "name": "Suppliers Can Edit", "category": "suppliers"},
    {"code": "suppliers_can_delete", "name": "Suppliers Can Delete", "category": "suppliers"},
    {"code": "suppliers_can_add", "name": "Suppliers Can Add", "category": "suppliers"},
]


async def seed_permissions():
    """Seed all permissions into the database"""
    async with async_session_maker() as session:
        # Check existing permissions
        stmt = select(Permission.code)
        result = await session.scalars(stmt)
        existing_codes = set(result.all())

        # Insert missing permissions
        created = 0
        for perm_def in PERMISSION_DEFINITIONS:
            if perm_def["code"] not in existing_codes:
                permission = Permission(**perm_def)
                session.add(permission)
                created += 1
                print(f"Created permission: {perm_def['code']}")

        await session.commit()
        print(f"\nSeeding complete. Created {created} permissions.")
        print(f"Total permissions in database: {len(existing_codes) + created}")


if __name__ == "__main__":
    asyncio.run(seed_permissions())
