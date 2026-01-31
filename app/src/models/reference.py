from typing import TYPE_CHECKING

from sqlalchemy import String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.models.base import Base

if TYPE_CHECKING:
    from src.models.invoice import Invoice
    from src.models.booking import PurchaseRequests


class Supplier(Base):
    """Supplier model"""

    __tablename__ = "supplier"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(255), index=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Relationships
    invoices: Mapped[list["Invoice"]] = relationship(
        back_populates="supplier",
        lazy="dynamic",
    )

    def __repr__(self) -> str:
        return f"<Supplier {self.name}>"

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "name": self.name,
            "description": self.description,
        }


class Machine(Base):
    """Machine model"""

    __tablename__ = "machine"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(255), index=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Relationships
    invoices: Mapped[list["Invoice"]] = relationship(
        back_populates="machine",
        lazy="dynamic",
    )
    purchase_requests: Mapped[list["PurchaseRequests"]] = relationship(
        back_populates="machine",
        lazy="dynamic",
    )

    def __repr__(self) -> str:
        return f"<Machine {self.name}>"

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "name": self.name,
            "description": self.description,
        }


class Mechanism(Base):
    """Mechanism model"""

    __tablename__ = "mechanism"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(255), index=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Relationships
    invoices: Mapped[list["Invoice"]] = relationship(
        back_populates="mechanism",
        lazy="dynamic",
    )
    purchase_requests: Mapped[list["PurchaseRequests"]] = relationship(
        back_populates="mechanism",
        lazy="dynamic",
    )

    def __repr__(self) -> str:
        return f"<Mechanism {self.name}>"

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "name": self.name,
            "description": self.description,
        }
