from typing import Sequence, Any

from sqlalchemy import select, func, or_
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession

from src.models.invoice import Invoice, InvoiceItem, InvoicePriceDetail
from src.models.warehouse import Warehouse
from src.models.user import Employee
from src.repositories.base import BaseRepository


class InvoiceRepository(BaseRepository[Invoice]):
    """Repository for Invoice operations"""

    def __init__(self, session: AsyncSession):
        super().__init__(Invoice, session)

    async def get_with_items(self, id: int) -> Invoice | None:
        """Get invoice with all related data"""
        stmt = (
            select(Invoice)
            .options(
                selectinload(Invoice.items).selectinload(InvoiceItem.warehouse),
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

    async def get_by_type(
        self,
        invoice_type: str,
        skip: int = 0,
        limit: int = 100,
    ) -> Sequence[Invoice]:
        """Get invoices by type with pagination"""
        stmt = (
            select(Invoice)
            .options(
                selectinload(Invoice.items).selectinload(InvoiceItem.warehouse),
                selectinload(Invoice.machine),
                selectinload(Invoice.mechanism),
                selectinload(Invoice.supplier),
                selectinload(Invoice.price_details),
            )
            .where(Invoice.type == invoice_type)
            .order_by(Invoice.id.desc())
            .offset(skip)
            .limit(limit)
        )
        result = await self.session.scalars(stmt)
        return result.all()

    async def get_by_type_with_permissions(
        self,
        invoice_type: str,
        user: Employee,
        skip: int = 0,
        limit: int = 100,
    ) -> tuple[Sequence[Invoice], int]:
        """Get invoices by type filtered by user permissions"""
        # Build base query
        stmt = (
            select(Invoice)
            .options(
                selectinload(Invoice.items).selectinload(InvoiceItem.warehouse),
                selectinload(Invoice.machine),
                selectinload(Invoice.mechanism),
                selectinload(Invoice.supplier),
                selectinload(Invoice.price_details),
            )
            .where(Invoice.type == invoice_type)
        )

        # Apply status filters based on permissions
        stmt = self._apply_status_filters(stmt, user)

        # Get count
        count_stmt = select(func.count()).select_from(stmt.subquery())
        count_result = await self.session.execute(count_stmt)
        total = count_result.scalar() or 0

        # Apply pagination
        stmt = stmt.order_by(Invoice.id.desc()).offset(skip).limit(limit)
        result = await self.session.scalars(stmt)

        return result.all(), total

    async def get_all_with_permissions(
        self,
        user: Employee,
        skip: int = 0,
        limit: int = 100,
    ) -> tuple[Sequence[Invoice], int]:
        """Get all invoices filtered by user permissions"""
        # Build type filter based on view permissions
        type_conditions = self._get_type_conditions(user)

        if not type_conditions:
            return [], 0

        stmt = (
            select(Invoice)
            .options(
                selectinload(Invoice.items).selectinload(InvoiceItem.warehouse),
                selectinload(Invoice.machine),
                selectinload(Invoice.mechanism),
                selectinload(Invoice.supplier),
                selectinload(Invoice.price_details),
            )
            .where(or_(*type_conditions))
        )

        # Apply status filters
        stmt = self._apply_status_filters(stmt, user)

        # Get count
        count_stmt = select(func.count()).select_from(stmt.subquery())
        count_result = await self.session.execute(count_stmt)
        total = count_result.scalar() or 0

        # Apply pagination
        stmt = stmt.order_by(Invoice.id.desc()).offset(skip).limit(limit)
        result = await self.session.scalars(stmt)

        return result.all(), total

    async def count_by_type(self, invoice_type: str) -> int:
        """Count invoices by type"""
        stmt = (
            select(func.count())
            .select_from(Invoice)
            .where(Invoice.type == invoice_type)
        )
        result = await self.session.execute(stmt)
        return result.scalar() or 0

    async def get_last_id(self) -> int:
        """Get the next invoice ID"""
        stmt = select(func.max(Invoice.id))
        result = await self.session.execute(stmt)
        max_id = result.scalar() or 0
        return max_id + 1

    async def count_by_status(self, status: str) -> int:
        """Count invoices by status"""
        stmt = (
            select(func.count())
            .select_from(Invoice)
            .where(Invoice.status == status)
        )
        result = await self.session.execute(stmt)
        return result.scalar() or 0

    async def get_by_status(
        self,
        status: str,
        skip: int = 0,
        limit: int = 100,
    ) -> Sequence[Invoice]:
        """Get invoices by status"""
        stmt = (
            select(Invoice)
            .options(
                selectinload(Invoice.items).selectinload(InvoiceItem.warehouse),
                selectinload(Invoice.machine),
                selectinload(Invoice.mechanism),
                selectinload(Invoice.supplier),
                selectinload(Invoice.price_details),
            )
            .where(Invoice.status == status)
            .order_by(Invoice.id.desc())
            .offset(skip)
            .limit(limit)
        )
        result = await self.session.scalars(stmt)
        return result.all()

    async def get_sales_invoices(
        self,
        skip: int = 0,
        limit: int = 100,
    ) -> tuple[Sequence[Invoice], int]:
        """Get sales invoices (صرف)"""
        stmt = (
            select(Invoice)
            .options(
                selectinload(Invoice.items).selectinload(InvoiceItem.warehouse),
                selectinload(Invoice.machine),
                selectinload(Invoice.mechanism),
                selectinload(Invoice.supplier),
                selectinload(Invoice.price_details),
            )
            .where(Invoice.type == "صرف")
        )

        count_stmt = select(func.count()).select_from(stmt.subquery())
        count_result = await self.session.execute(count_stmt)
        total = count_result.scalar() or 0

        stmt = stmt.order_by(Invoice.id.desc()).offset(skip).limit(limit)
        result = await self.session.scalars(stmt)

        return result.all(), total

    def _get_type_conditions(self, user: Employee) -> list:
        """Get invoice type conditions based on user permissions"""
        conditions = []
        user_perms = user.get_all_permissions()

        permission_type_map = {
            "view_additions": "اضافه",
            "view_withdrawals": "صرف",
            "view_deposits": "أمانات",
            "view_returns": "مرتجع",
            "view_damages": "توالف",
            "view_reservations": "حجز",
            "view_transfers": "تحويل",
            "view_purchase_requests": "طلب شراء",
        }

        for perm, invoice_type in permission_type_map.items():
            if perm in user_perms:
                conditions.append(Invoice.type == invoice_type)

        return conditions

    def _apply_status_filters(self, stmt, user: Employee):
        """Apply status filters based on user permissions"""
        user_perms = user.get_all_permissions()
        status_conditions = []

        if "view_confirmed" in user_perms:
            status_conditions.append(Invoice.status == "confirmed")
        if "view_unconfirmed" in user_perms:
            status_conditions.append(Invoice.status == "draft")
        if "view_unreviewed" in user_perms:
            status_conditions.append(Invoice.status == "accreditation")

        if status_conditions:
            stmt = stmt.where(or_(*status_conditions))

        return stmt


class InvoiceItemRepository(BaseRepository[InvoiceItem]):
    """Repository for InvoiceItem operations"""

    def __init__(self, session: AsyncSession):
        super().__init__(InvoiceItem, session)

    async def get_by_invoice(self, invoice_id: int) -> Sequence[InvoiceItem]:
        """Get all items for an invoice"""
        stmt = (
            select(InvoiceItem)
            .where(InvoiceItem.invoice_id == invoice_id)
        )
        result = await self.session.scalars(stmt)
        return result.all()

    async def get_by_item_and_location(
        self,
        invoice_id: int,
        item_id: int,
        location: str,
        supplier_id: int = 0,
    ) -> InvoiceItem | None:
        """Get a specific invoice item"""
        stmt = (
            select(InvoiceItem)
            .where(
                InvoiceItem.invoice_id == invoice_id,
                InvoiceItem.item_id == item_id,
                InvoiceItem.location == location,
                InvoiceItem.supplier_id == supplier_id,
            )
        )
        result = await self.session.scalars(stmt)
        return result.first()

    async def delete_by_invoice(self, invoice_id: int) -> int:
        """Delete all items for an invoice"""
        stmt = (
            select(InvoiceItem)
            .where(InvoiceItem.invoice_id == invoice_id)
        )
        result = await self.session.scalars(stmt)
        items = result.all()
        count = len(items)
        for item in items:
            await self.session.delete(item)
        await self.session.flush()
        return count


class InvoicePriceDetailRepository(BaseRepository[InvoicePriceDetail]):
    """Repository for InvoicePriceDetail operations"""

    def __init__(self, session: AsyncSession):
        super().__init__(InvoicePriceDetail, session)

    async def get_by_invoice(self, invoice_id: int) -> Sequence[InvoicePriceDetail]:
        """Get all price details for an invoice"""
        stmt = (
            select(InvoicePriceDetail)
            .where(InvoicePriceDetail.invoice_id == invoice_id)
        )
        result = await self.session.scalars(stmt)
        return result.all()

    async def get_by_invoice_and_item(
        self,
        invoice_id: int,
        item_id: int,
    ) -> Sequence[InvoicePriceDetail]:
        """Get price details for a specific item in an invoice"""
        stmt = (
            select(InvoicePriceDetail)
            .where(
                InvoicePriceDetail.invoice_id == invoice_id,
                InvoicePriceDetail.item_id == item_id,
            )
        )
        result = await self.session.scalars(stmt)
        return result.all()

    async def delete_by_invoice(self, invoice_id: int) -> int:
        """Delete all price details for an invoice"""
        stmt = (
            select(InvoicePriceDetail)
            .where(InvoicePriceDetail.invoice_id == invoice_id)
        )
        result = await self.session.scalars(stmt)
        details = result.all()
        count = len(details)
        for detail in details:
            await self.session.delete(detail)
        await self.session.flush()
        return count
