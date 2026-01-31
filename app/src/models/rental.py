from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import String, Integer, Float, Text, ForeignKey, Index, DateTime
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.models.base import Base, TimestampMixin

if TYPE_CHECKING:
    from src.models.invoice import Invoice
    from src.models.warehouse import Warehouse


class RentedItems(Base, TimestampMixin):
    """Rented items model - tracks items in rental warehouse with status"""

    __tablename__ = "rented_items"
    __table_args__ = (
        Index("idx_rented_items_invoice_item", "rental_invoice_id", "item_id"),
        Index("idx_rented_items_status", "status"),
        Index("idx_rented_items_customer", "customer_name"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    rental_invoice_id: Mapped[int] = mapped_column(ForeignKey("invoice.id"))
    item_id: Mapped[int] = mapped_column(ForeignKey("warehouse.id"))
    quantity: Mapped[int] = mapped_column(Integer)
    unit_price: Mapped[float] = mapped_column(Float)
    total_price: Mapped[float] = mapped_column(Float)

    # Rental status tracking
    status: Mapped[str] = mapped_column(
        String(50), default="reserved"
    )  # reserved, given, returned, borrowed_to_main
    given_date: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    expected_return_date: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    actual_return_date: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

    # Customer information
    customer_name: Mapped[str] = mapped_column(String(255))
    customer_phone: Mapped[str | None] = mapped_column(String(20), nullable=True)
    customer_id_number: Mapped[str | None] = mapped_column(String(50), nullable=True)

    # Borrowing to main warehouse tracking
    borrowed_to_main_quantity: Mapped[int] = mapped_column(Integer, default=0)
    borrowed_date: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

    # Notes
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Relationships
    rental_invoice: Mapped["Invoice"] = relationship(backref="rented_items")
    item: Mapped["Warehouse"] = relationship(backref="rented_items")

    def __repr__(self) -> str:
        return f"<RentedItems id={self.id} status={self.status}>"

    def to_dict(self) -> dict:
        """Convert to dictionary for API response"""
        return {
            "id": self.id,
            "rental_invoice_id": self.rental_invoice_id,
            "item_id": self.item_id,
            "item_name": self.item.item_name if self.item else None,
            "quantity": self.quantity,
            "unit_price": self.unit_price,
            "total_price": self.total_price,
            "status": self.status,
            "given_date": self.given_date.strftime("%Y-%m-%d %H:%M:%S") if self.given_date else None,
            "expected_return_date": self.expected_return_date.strftime("%Y-%m-%d %H:%M:%S") if self.expected_return_date else None,
            "actual_return_date": self.actual_return_date.strftime("%Y-%m-%d %H:%M:%S") if self.actual_return_date else None,
            "customer_name": self.customer_name,
            "customer_phone": self.customer_phone,
            "customer_id_number": self.customer_id_number,
            "borrowed_to_main_quantity": self.borrowed_to_main_quantity,
            "borrowed_date": self.borrowed_date.strftime("%Y-%m-%d %H:%M:%S") if self.borrowed_date else None,
            "notes": self.notes,
            "created_at": self.created_at.strftime("%Y-%m-%d %H:%M:%S") if self.created_at else None,
            "updated_at": self.updated_at.strftime("%Y-%m-%d %H:%M:%S") if self.updated_at else None,
        }


class RentalWarehouseLocations(Base, TimestampMixin):
    """Rental warehouse locations - separate inventory from main warehouse"""

    __tablename__ = "rental_warehouse_locations"
    __table_args__ = (
        Index("idx_rental_warehouse_item_location", "item_id", "location"),
    )

    # Composite primary key
    item_id: Mapped[int] = mapped_column(
        ForeignKey("warehouse.id", ondelete="CASCADE"), primary_key=True
    )
    location: Mapped[str] = mapped_column(
        String(255), primary_key=True, default="RENTAL_WAREHOUSE"
    )

    # Quantities
    quantity: Mapped[int] = mapped_column(Integer, default=0)
    reserved_quantity: Mapped[int] = mapped_column(Integer, default=0)
    available_quantity: Mapped[int] = mapped_column(Integer, default=0)

    # Relationships
    warehouse: Mapped["Warehouse"] = relationship(backref="rental_locations")

    def __repr__(self) -> str:
        return f"<RentalWarehouseLocations item={self.item_id} qty={self.quantity}>"

    def to_dict(self) -> dict:
        """Convert to dictionary for API response"""
        return {
            "item_id": self.item_id,
            "item_name": self.warehouse.item_name if self.warehouse else None,
            "location": self.location,
            "quantity": self.quantity,
            "reserved_quantity": self.reserved_quantity,
            "available_quantity": self.available_quantity,
            "created_at": self.created_at.strftime("%Y-%m-%d %H:%M:%S") if self.created_at else None,
            "updated_at": self.updated_at.strftime("%Y-%m-%d %H:%M:%S") if self.updated_at else None,
        }


# Import for runtime
from src.models.invoice import Invoice
from src.models.warehouse import Warehouse
