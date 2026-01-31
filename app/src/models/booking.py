from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import String, Integer, Float, Text, ForeignKey, Index, DateTime
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.models.base import Base, TimestampMixin

if TYPE_CHECKING:
    from src.models.invoice import Invoice
    from src.models.warehouse import Warehouse
    from src.models.user import Employee
    from src.models.reference import Machine, Mechanism


class PurchaseRequests(Base, TimestampMixin):
    """Purchase requests model"""

    __tablename__ = "purchase_requests"

    id: Mapped[int] = mapped_column(primary_key=True)
    status: Mapped[str] = mapped_column(String(50))
    requested_quantity: Mapped[int] = mapped_column(Integer)
    subtotal: Mapped[float] = mapped_column(Float)

    # Foreign Keys
    invoice_id: Mapped[int] = mapped_column(ForeignKey("invoice.id"))
    item_id: Mapped[int] = mapped_column(ForeignKey("warehouse.id"))
    employee_id: Mapped[int] = mapped_column(ForeignKey("employee.id"))
    machine_id: Mapped[int] = mapped_column(ForeignKey("machine.id"))
    mechanism_id: Mapped[int] = mapped_column(ForeignKey("mechanism.id"))

    # Relationships
    employee: Mapped["Employee"] = relationship(back_populates="purchase_requests")
    machine: Mapped["Machine"] = relationship(back_populates="purchase_requests")
    mechanism: Mapped["Mechanism"] = relationship(back_populates="purchase_requests")
    warehouse: Mapped["Warehouse"] = relationship(back_populates="purchase_requests")
    invoice: Mapped["Invoice"] = relationship(back_populates="purchase_requests")

    def __repr__(self) -> str:
        return f"<PurchaseRequests id={self.id} status={self.status}>"

    def to_dict(self) -> dict:
        """Convert to dictionary for API response"""
        return {
            "id": self.id,
            "status": self.status,
            "requested_quantity": self.requested_quantity,
            "subtotal": self.subtotal,
            "invoice_id": self.invoice_id,
            "item_id": self.item_id,
            "item_name": self.warehouse.item_name if self.warehouse else None,
            "employee_id": self.employee_id,
            "employee_name": self.employee.username if self.employee else None,
            "machine_id": self.machine_id,
            "machine_name": self.machine.name if self.machine else None,
            "mechanism_id": self.mechanism_id,
            "mechanism_name": self.mechanism.name if self.mechanism else None,
            "created_at": self.created_at.strftime("%Y-%m-%d %H:%M:%S") if self.created_at else None,
            "updated_at": self.updated_at.strftime("%Y-%m-%d %H:%M:%S") if self.updated_at else None,
        }


class ReturnSales(Base):
    """Return sales model - tracks returned invoices"""

    __tablename__ = "return_sales"

    id: Mapped[int] = mapped_column(primary_key=True)
    sales_invoice_id: Mapped[int] = mapped_column(ForeignKey("invoice.id"))
    return_invoice_id: Mapped[int] = mapped_column(ForeignKey("invoice.id"))

    # Relationships
    sales_invoice: Mapped["Invoice"] = relationship(
        foreign_keys=[sales_invoice_id],
        backref="sales_returns",
    )
    return_invoice: Mapped["Invoice"] = relationship(
        foreign_keys=[return_invoice_id],
        backref="return_invoices",
    )

    def __repr__(self) -> str:
        return f"<ReturnSales sales={self.sales_invoice_id} return={self.return_invoice_id}>"

    def to_dict(self) -> dict:
        """Convert to dictionary for API response"""
        return {
            "id": self.id,
            "sales_invoice_id": self.sales_invoice_id,
            "return_invoice_id": self.return_invoice_id,
        }


class WarrantyReturn(Base):
    """Warranty return model - tracks warranty returns"""

    __tablename__ = "warranty_return"
    __table_args__ = (
        Index("idx_warranty_return_invoice_item", "warranty_invoice_id", "item_id", "location"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    warranty_invoice_id: Mapped[int] = mapped_column(ForeignKey("invoice.id"))
    item_id: Mapped[int] = mapped_column(ForeignKey("warehouse.id"))
    location: Mapped[str] = mapped_column(String(255))
    returned_quantity: Mapped[int] = mapped_column(Integer)
    return_date: Mapped[datetime] = mapped_column(DateTime, default=datetime.now)
    returned_by_employee_id: Mapped[int] = mapped_column(ForeignKey("employee.id"))
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Relationships
    warranty_invoice: Mapped["Invoice"] = relationship(backref="warranty_returns")
    item: Mapped["Warehouse"] = relationship(backref="warranty_returns")
    returned_by: Mapped["Employee"] = relationship(backref="warranty_returns")

    def __repr__(self) -> str:
        return f"<WarrantyReturn id={self.id} qty={self.returned_quantity}>"

    def to_dict(self) -> dict:
        """Convert to dictionary for API response"""
        return {
            "id": self.id,
            "warranty_invoice_id": self.warranty_invoice_id,
            "item_id": self.item_id,
            "item_name": self.item.item_name if self.item else None,
            "location": self.location,
            "returned_quantity": self.returned_quantity,
            "return_date": self.return_date.strftime("%Y-%m-%d %H:%M:%S") if self.return_date else None,
            "returned_by_employee_id": self.returned_by_employee_id,
            "returned_by_name": self.returned_by.username if self.returned_by else None,
            "notes": self.notes,
        }


class BookingDeductions(Base):
    """Booking deductions model - tracks when sales/warranty invoices deduct from booking invoices"""

    __tablename__ = "booking_deductions"
    __table_args__ = (
        Index("idx_booking_deductions_booking", "booking_invoice_id", "item_id"),
        Index("idx_booking_deductions_deducted", "deducted_invoice_id"),
    )

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    booking_invoice_id: Mapped[int] = mapped_column(ForeignKey("invoice.id"))
    deducted_invoice_id: Mapped[int] = mapped_column(ForeignKey("invoice.id"))
    item_id: Mapped[int] = mapped_column(ForeignKey("warehouse.id"))
    quantity_deducted: Mapped[int] = mapped_column(Integer)
    price_used: Mapped[float] = mapped_column(Float)
    deducted_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.now)

    # Relationships
    booking_invoice: Mapped["Invoice"] = relationship(
        foreign_keys=[booking_invoice_id],
        backref="booking_deductions_as_source",
    )
    deducted_invoice: Mapped["Invoice"] = relationship(
        foreign_keys=[deducted_invoice_id],
        backref="booking_deductions_used",
    )
    item: Mapped["Warehouse"] = relationship(backref="booking_deductions")

    def __repr__(self) -> str:
        return f"<BookingDeductions booking={self.booking_invoice_id} deducted={self.deducted_invoice_id}>"

    def to_dict(self) -> dict:
        """Convert to dictionary for API response"""
        return {
            "id": self.id,
            "booking_invoice_id": self.booking_invoice_id,
            "deducted_invoice_id": self.deducted_invoice_id,
            "item_id": self.item_id,
            "item_name": self.item.item_name if self.item else None,
            "quantity_deducted": self.quantity_deducted,
            "price_used": self.price_used,
            "deducted_at": self.deducted_at.strftime("%Y-%m-%d %H:%M:%S") if self.deducted_at else None,
        }


# Import for runtime
from src.models.invoice import Invoice
from src.models.warehouse import Warehouse
from src.models.user import Employee
from src.models.reference import Machine, Mechanism
