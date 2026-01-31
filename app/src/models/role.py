from sqlalchemy import String, Text, ForeignKey, Table, Column
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.models.base import Base


# Association table: Role <-> Permission (many-to-many)
role_permissions = Table(
    "role_permissions",
    Base.metadata,
    Column("role_id", ForeignKey("roles.id", ondelete="CASCADE"), primary_key=True),
    Column("permission_id", ForeignKey("permissions.id", ondelete="CASCADE"), primary_key=True),
)

# Association table: Employee <-> Role (many-to-many)
user_roles = Table(
    "user_roles",
    Base.metadata,
    Column("user_id", ForeignKey("employee.id", ondelete="CASCADE"), primary_key=True),
    Column("role_id", ForeignKey("roles.id", ondelete="CASCADE"), primary_key=True),
)


class Permission(Base):
    """Permission model for granular access control"""

    __tablename__ = "permissions"

    id: Mapped[int] = mapped_column(primary_key=True)
    code: Mapped[str] = mapped_column(String(100), unique=True, index=True)
    name: Mapped[str] = mapped_column(String(200))
    category: Mapped[str] = mapped_column(String(50), index=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Relationships
    roles: Mapped[list["Role"]] = relationship(
        secondary=role_permissions,
        back_populates="permissions",
    )

    def __repr__(self) -> str:
        return f"<Permission {self.code}>"


class Role(Base):
    """Role model for grouping permissions"""

    __tablename__ = "roles"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(100), unique=True, index=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    is_system: Mapped[bool] = mapped_column(default=False)

    # Relationships
    permissions: Mapped[list["Permission"]] = relationship(
        secondary=role_permissions,
        back_populates="roles",
        lazy="selectin",
    )
    employees: Mapped[list["Employee"]] = relationship(
        secondary=user_roles,
        back_populates="roles",
    )

    def __repr__(self) -> str:
        return f"<Role {self.name}>"

    def has_permission(self, permission_code: str) -> bool:
        """Check if role has a specific permission"""
        return any(p.code == permission_code for p in self.permissions)


# All permission codes (for backward compatibility)
ALL_PERMISSION_CODES = [
    # Create Invoice Permissions
    "create_inventory_operations",
    "create_additions",
    # View Permissions
    "view_additions",
    "view_withdrawals",
    "view_deposits",
    "view_returns",
    "view_damages",
    "view_reservations",
    "view_prices",
    "view_purchase_requests",
    "view_reports",
    "view_transfers",
    # View Status Permissions
    "view_zero_valued",
    "view_confirmed",
    "view_unreviewed",
    "view_unconfirmed",
    # Action Permissions
    "can_edit",
    "can_delete",
    "can_confirm_withdrawal",
    "can_withdraw",
    "can_update_prices",
    "can_recover_deposits",
    "can_confirm_purchase_requests",
    # Change Status Permissions
    "can_change_zero_valued",
    "can_change_confirmed",
    "can_change_unreviewed",
    "can_change_unconfirmed",
    # Items Permissions
    "items_can_edit",
    "items_can_delete",
    "items_can_add",
    # Machines Permissions
    "machines_can_edit",
    "machines_can_delete",
    "machines_can_add",
    # Mechanism Permissions
    "mechanism_can_edit",
    "mechanism_can_delete",
    "mechanism_can_add",
    # Suppliers Permissions
    "suppliers_can_edit",
    "suppliers_can_delete",
    "suppliers_can_add",
]


# Import Employee here to avoid circular imports
from src.models.user import Employee
