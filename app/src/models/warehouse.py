from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import String, Integer, Float, ForeignKey, Index, DateTime
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.models.base import Base, TimestampMixin

if TYPE_CHECKING:
    from src.models.invoice import Invoice, InvoiceItem, InvoicePriceDetail
    from src.models.reference import Supplier
    from src.models.booking import PurchaseRequests


class Warehouse(Base, TimestampMixin):
    """Warehouse item model"""

    __tablename__ = "warehouse"

    id: Mapped[int] = mapped_column(primary_key=True)
    item_name: Mapped[str] = mapped_column(String(120), index=True)
    item_bar: Mapped[str] = mapped_column(String(100), unique=True)

    # Relationships
    invoice_items: Mapped[list["InvoiceItem"]] = relationship(
        back_populates="warehouse",
    )
    item_locations: Mapped[list["ItemLocations"]] = relationship(
        back_populates="warehouse",
        cascade="all, delete-orphan",
        lazy="selectin",
    )
    prices: Mapped[list["Prices"]] = relationship(
        back_populates="warehouse",
        cascade="all, delete-orphan",
    )
    price_details: Mapped[list["InvoicePriceDetail"]] = relationship(
        back_populates="warehouse",
    )
    purchase_requests: Mapped[list["PurchaseRequests"]] = relationship(
        back_populates="warehouse",
    )

    def __repr__(self) -> str:
        return f"<Warehouse {self.item_name}>"

    def to_dict(self) -> dict:
        """Convert to dictionary for API response"""
        return {
            "id": self.id,
            "item_name": self.item_name,
            "item_bar": self.item_bar,
            "created_at": self.created_at.strftime("%Y-%m-%d %H:%M:%S") if self.created_at else None,
            "updated_at": self.updated_at.strftime("%Y-%m-%d %H:%M:%S") if self.updated_at else None,
        }

    def to_dict_with_locations(self) -> dict:
        """Convert to dictionary with location details"""
        result = self.to_dict()
        result["locations"] = [loc.to_dict() for loc in self.item_locations]
        return result


class ItemLocations(Base):
    """Item location model - tracks quantity per location"""

    __tablename__ = "item_locations"
    __table_args__ = (
        Index("ix_item_locations_location", "location"),
    )

    # Composite primary key
    item_id: Mapped[int] = mapped_column(
        ForeignKey("warehouse.id", ondelete="CASCADE"), primary_key=True
    )
    location: Mapped[str] = mapped_column(String(255), primary_key=True)
    quantity: Mapped[int] = mapped_column(Integer, default=0)

    # Relationships
    warehouse: Mapped["Warehouse"] = relationship(back_populates="item_locations")

    def __repr__(self) -> str:
        return f"<ItemLocations item={self.item_id} loc={self.location}>"

    def to_dict(self) -> dict:
        """Convert to dictionary for API response"""
        return {
            "item_id": self.item_id,
            "location": self.location,
            "quantity": self.quantity,
        }


class Prices(Base):
    """Prices model - tracks FIFO pricing per invoice/item/location/supplier"""

    __tablename__ = "prices"
    __table_args__ = (
        Index("ix_prices_item_location", "item_id", "location"),
        Index("ix_prices_created_at", "created_at"),
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
    quantity: Mapped[int] = mapped_column(Integer)
    unit_price: Mapped[float] = mapped_column(Float)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.now)

    # Relationships
    invoice: Mapped["Invoice"] = relationship(back_populates="prices")
    warehouse: Mapped["Warehouse"] = relationship(back_populates="prices")
    supplier: Mapped["Supplier | None"] = relationship()

    def __repr__(self) -> str:
        return f"<Prices invoice={self.invoice_id} item={self.item_id} qty={self.quantity}>"

    def to_dict(self) -> dict:
        """Convert to dictionary for API response"""
        return {
            "invoice_id": self.invoice_id,
            "item_id": self.item_id,
            "location": self.location,
            "supplier_id": self.supplier_id,
            "quantity": self.quantity,
            "unit_price": self.unit_price,
            "created_at": self.created_at.strftime("%Y-%m-%d %H:%M:%S") if self.created_at else None,
        }


# Import for runtime
from src.models.invoice import Invoice, InvoiceItem, InvoicePriceDetail
from src.models.reference import Supplier
