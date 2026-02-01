from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import String, Text, Float, Integer, ForeignKey, Index, DateTime, ForeignKeyConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.models.base import Base

if TYPE_CHECKING:
    from src.models.user import Employee
    from src.models.reference import Machine, Mechanism, Supplier
    from src.models.warehouse import Warehouse, Prices
    from src.models.booking import PurchaseRequests


class Invoice(Base):
    """Invoice model"""

    __tablename__ = "invoice"
    __table_args__ = (
        Index("ix_invoice_type_status", "type", "status"),
        Index("ix_invoice_created_at", "created_at"),
        Index("ix_invoice_employee_id", "employee_id"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    type: Mapped[str] = mapped_column(String(50))
    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.now
    )
    client_name: Mapped[str | None] = mapped_column(String(50), nullable=True)
    warehouse_manager: Mapped[str | None] = mapped_column(String(255), nullable=True)
    accreditation_manager: Mapped[str | None] = mapped_column(String(255), nullable=True)
    total_amount: Mapped[float | None] = mapped_column(Float, nullable=True)
    paid: Mapped[float | None] = mapped_column(Float, nullable=True)
    residual: Mapped[float | None] = mapped_column(Float, nullable=True)
    comment: Mapped[str | None] = mapped_column(String(255), nullable=True)
    payment_method: Mapped[str | None] = mapped_column(String(255), nullable=True)
    custody_person: Mapped[str | None] = mapped_column(String(255), nullable=True)
    status: Mapped[str] = mapped_column(String(50), default="draft")
    deduction_status: Mapped[str | None] = mapped_column(String(50), nullable=True, default=None)
    employee_name: Mapped[str] = mapped_column(String(50))

    # Foreign Keys
    employee_id: Mapped[int] = mapped_column(ForeignKey("employee.id"))
    machine_id: Mapped[int | None] = mapped_column(ForeignKey("machine.id"), nullable=True)
    mechanism_id: Mapped[int | None] = mapped_column(ForeignKey("mechanism.id"), nullable=True)
    supplier_id: Mapped[int | None] = mapped_column(ForeignKey("supplier.id"), nullable=True)

    # Relationships
    employee: Mapped["Employee"] = relationship(back_populates="invoices")
    machine: Mapped["Machine | None"] = relationship(back_populates="invoices")
    mechanism: Mapped["Mechanism | None"] = relationship(back_populates="invoices")
    supplier: Mapped["Supplier | None"] = relationship(back_populates="invoices")
    items: Mapped[list["InvoiceItem"]] = relationship(
        back_populates="invoice",
        cascade="all, delete-orphan",
        lazy="selectin",
    )
    prices: Mapped[list["Prices"]] = relationship(
        back_populates="invoice",
        cascade="all, delete-orphan",
    )
    price_details: Mapped[list["InvoicePriceDetail"]] = relationship(
        back_populates="invoice",
        cascade="all, delete-orphan",
    )
    purchase_requests: Mapped[list["PurchaseRequests"]] = relationship(
        back_populates="invoice",
    )

    def __repr__(self) -> str:
        return f"<Invoice {self.id} ({self.type})>"

    def to_dict(self) -> dict:
        """Convert to dictionary for API response"""
        # Collect unique supplier names from items
        suppliers_summary = list(set(
            item.supplier_name
            for item in self.items
            if item.supplier_name
        ))

        return {
            "id": self.id,
            "type": self.type,
            "client_name": self.client_name,
            "status": self.status,
            "employee_name": self.employee_name,
            "machine_name": self.machine.name if self.machine else None,
            "mechanism_name": self.mechanism.name if self.mechanism else None,
            "total_amount": self.total_amount,
            "paid": self.paid,
            "residual": self.residual,
            "created_at": self.created_at.strftime("%Y-%m-%d %H:%M:%S") if self.created_at else None,
            "comment": self.comment,
            "deduction_status": self.deduction_status,
            "warehouse_manager": self.warehouse_manager,
            "accreditation_manager": self.accreditation_manager,
            "payment_method": self.payment_method,
            "custody_person": self.custody_person,
            "suppliers_summary": suppliers_summary,
        }

    def to_dict_with_items(self) -> dict:
        """Convert to dictionary with full item details"""
        result = self.to_dict()
        result["items"] = [item.to_dict() for item in self.items]
        return result


class InvoiceItem(Base):
    """Invoice Item model - line items on an invoice"""

    __tablename__ = "invoice_item"
    __table_args__ = (
        Index("ix_invoice_item_invoice_id", "invoice_id"),
        Index("ix_invoice_item_item_id", "item_id"),
    )

    # Composite primary key
    invoice_id: Mapped[int] = mapped_column(
        ForeignKey("invoice.id", ondelete="CASCADE"), primary_key=True
    )
    item_id: Mapped[int] = mapped_column(
        ForeignKey("warehouse.id"), primary_key=True
    )
    location: Mapped[str] = mapped_column(String(255), primary_key=True)
    supplier_id: Mapped[int] = mapped_column(
        ForeignKey("supplier.id"), primary_key=True, default=0
    )

    # Fields
    quantity: Mapped[int | None] = mapped_column(Integer, nullable=True)
    total_price: Mapped[float | None] = mapped_column(Float, nullable=True)
    unit_price: Mapped[float | None] = mapped_column(Float, nullable=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    new_location: Mapped[str | None] = mapped_column(String(255), nullable=True)
    supplier_name: Mapped[str | None] = mapped_column(String(255), nullable=True)

    # Relationships
    invoice: Mapped["Invoice"] = relationship(back_populates="items")
    warehouse: Mapped["Warehouse"] = relationship(back_populates="invoice_items")
    supplier: Mapped["Supplier | None"] = relationship()

    def __repr__(self) -> str:
        return f"<InvoiceItem invoice={self.invoice_id} item={self.item_id}>"

    def to_dict(self) -> dict:
        """Convert to dictionary for API response"""
        return {
            "item_id": self.item_id,
            "item_name": self.warehouse.item_name if self.warehouse else None,
            "barcode": self.warehouse.item_bar if self.warehouse else None,
            "quantity": self.quantity,
            "location": self.location,
            "unit_price": self.unit_price,
            "total_price": self.total_price,
            "supplier_id": self.supplier_id,
            "supplier_name": self.supplier_name,
            "description": self.description,
            "new_location": self.new_location,
        }


class InvoicePriceDetail(Base):
    """Invoice Price Detail - tracks FIFO price breakdown for each invoice item"""

    __tablename__ = "invoice_price_detail"
    __table_args__ = (
        ForeignKeyConstraint(
            ["source_price_invoice_id", "source_price_item_id", "source_price_location", "source_price_supplier_id"],
            ["prices.invoice_id", "prices.item_id", "prices.location", "prices.supplier_id"],
        ),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    invoice_id: Mapped[int] = mapped_column(ForeignKey("invoice.id", ondelete="CASCADE"))
    item_id: Mapped[int] = mapped_column(ForeignKey("warehouse.id"))
    source_price_invoice_id: Mapped[int] = mapped_column(Integer)
    source_price_item_id: Mapped[int] = mapped_column(Integer)
    source_price_location: Mapped[str] = mapped_column(String(255))
    source_price_supplier_id: Mapped[int] = mapped_column(Integer, default=0)
    quantity: Mapped[int] = mapped_column(Integer)
    unit_price: Mapped[float] = mapped_column(Float)
    subtotal: Mapped[float] = mapped_column(Float)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.now)

    # Relationships
    invoice: Mapped["Invoice"] = relationship(back_populates="price_details")
    warehouse: Mapped["Warehouse"] = relationship()

    def __repr__(self) -> str:
        return f"<InvoicePriceDetail invoice={self.invoice_id} qty={self.quantity}>"

    def to_dict(self) -> dict:
        """Convert to dictionary for API response"""
        return {
            "source_price_invoice_id": self.source_price_invoice_id,
            "quantity": self.quantity,
            "unit_price": self.unit_price,
            "subtotal": self.subtotal,
        }


# Import for type hints at runtime
from src.models.reference import Supplier
from src.models.warehouse import Warehouse
