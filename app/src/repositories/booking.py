from typing import Sequence

from sqlalchemy import select
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession

from src.models.booking import (
    PurchaseRequests,
    ReturnSales,
    WarrantyReturn,
    BookingDeductions,
)
from src.repositories.base import BaseRepository


class PurchaseRequestsRepository(BaseRepository[PurchaseRequests]):
    """Repository for PurchaseRequests operations"""

    def __init__(self, session: AsyncSession):
        super().__init__(PurchaseRequests, session)

    async def get_by_invoice(self, invoice_id: int) -> Sequence[PurchaseRequests]:
        """Get all purchase requests for an invoice"""
        stmt = (
            select(PurchaseRequests)
            .where(PurchaseRequests.invoice_id == invoice_id)
        )
        result = await self.session.scalars(stmt)
        return result.all()

    async def get_by_status(
        self,
        status: str,
        skip: int = 0,
        limit: int = 100,
    ) -> Sequence[PurchaseRequests]:
        """Get purchase requests by status"""
        stmt = (
            select(PurchaseRequests)
            .options(
                selectinload(PurchaseRequests.warehouse),
                selectinload(PurchaseRequests.machine),
                selectinload(PurchaseRequests.mechanism),
            )
            .where(PurchaseRequests.status == status)
            .order_by(PurchaseRequests.id.desc())
            .offset(skip)
            .limit(limit)
        )
        result = await self.session.scalars(stmt)
        return result.all()

    async def get_all_with_details(
        self,
        skip: int = 0,
        limit: int = 100,
    ) -> Sequence[PurchaseRequests]:
        """Get all purchase requests with related details"""
        stmt = (
            select(PurchaseRequests)
            .options(
                selectinload(PurchaseRequests.warehouse),
                selectinload(PurchaseRequests.machine),
                selectinload(PurchaseRequests.mechanism),
                selectinload(PurchaseRequests.employee),
            )
            .order_by(PurchaseRequests.id.desc())
            .offset(skip)
            .limit(limit)
        )
        result = await self.session.scalars(stmt)
        return result.all()


class ReturnSalesRepository(BaseRepository[ReturnSales]):
    """Repository for ReturnSales operations"""

    def __init__(self, session: AsyncSession):
        super().__init__(ReturnSales, session)

    async def get_by_sales_invoice(self, sales_invoice_id: int) -> Sequence[ReturnSales]:
        """Get all returns for a sales invoice"""
        stmt = (
            select(ReturnSales)
            .where(ReturnSales.sales_invoice_id == sales_invoice_id)
        )
        result = await self.session.scalars(stmt)
        return result.all()

    async def get_by_return_invoice(self, return_invoice_id: int) -> ReturnSales | None:
        """Get return record by return invoice"""
        stmt = (
            select(ReturnSales)
            .where(ReturnSales.return_invoice_id == return_invoice_id)
        )
        result = await self.session.scalars(stmt)
        return result.first()


class WarrantyReturnRepository(BaseRepository[WarrantyReturn]):
    """Repository for WarrantyReturn operations"""

    def __init__(self, session: AsyncSession):
        super().__init__(WarrantyReturn, session)

    async def get_by_invoice(self, warranty_invoice_id: int) -> Sequence[WarrantyReturn]:
        """Get all returns for a warranty invoice"""
        stmt = (
            select(WarrantyReturn)
            .where(WarrantyReturn.warranty_invoice_id == warranty_invoice_id)
        )
        result = await self.session.scalars(stmt)
        return result.all()

    async def get_by_invoice_and_item(
        self,
        warranty_invoice_id: int,
        item_id: int,
        location: str,
    ) -> Sequence[WarrantyReturn]:
        """Get returns for specific item in warranty invoice"""
        stmt = (
            select(WarrantyReturn)
            .options(selectinload(WarrantyReturn.returned_by))
            .where(
                WarrantyReturn.warranty_invoice_id == warranty_invoice_id,
                WarrantyReturn.item_id == item_id,
                WarrantyReturn.location == location,
            )
            .order_by(WarrantyReturn.return_date.asc())
        )
        result = await self.session.scalars(stmt)
        return result.all()

    async def get_total_returned(
        self,
        warranty_invoice_id: int,
        item_id: int,
        location: str,
    ) -> int:
        """Get total returned quantity for an item"""
        returns = await self.get_by_invoice_and_item(
            warranty_invoice_id, item_id, location
        )
        return sum(r.returned_quantity for r in returns)


class BookingDeductionsRepository(BaseRepository[BookingDeductions]):
    """Repository for BookingDeductions operations"""

    def __init__(self, session: AsyncSession):
        super().__init__(BookingDeductions, session)

    async def get_by_booking_invoice(
        self,
        booking_invoice_id: int,
    ) -> Sequence[BookingDeductions]:
        """Get all deductions from a booking invoice"""
        stmt = (
            select(BookingDeductions)
            .where(BookingDeductions.booking_invoice_id == booking_invoice_id)
        )
        result = await self.session.scalars(stmt)
        return result.all()

    async def get_by_deducted_invoice(
        self,
        deducted_invoice_id: int,
    ) -> Sequence[BookingDeductions]:
        """Get all deductions used by a sales/warranty invoice"""
        stmt = (
            select(BookingDeductions)
            .where(BookingDeductions.deducted_invoice_id == deducted_invoice_id)
        )
        result = await self.session.scalars(stmt)
        return result.all()

    async def get_by_booking_and_item(
        self,
        booking_invoice_id: int,
        item_id: int,
    ) -> Sequence[BookingDeductions]:
        """Get deductions for specific item from booking invoice"""
        stmt = (
            select(BookingDeductions)
            .where(
                BookingDeductions.booking_invoice_id == booking_invoice_id,
                BookingDeductions.item_id == item_id,
            )
        )
        result = await self.session.scalars(stmt)
        return result.all()

    async def get_total_deducted(
        self,
        booking_invoice_id: int,
        item_id: int,
    ) -> int:
        """Get total deducted quantity for an item from booking"""
        deductions = await self.get_by_booking_and_item(booking_invoice_id, item_id)
        return sum(d.quantity_deducted for d in deductions)
