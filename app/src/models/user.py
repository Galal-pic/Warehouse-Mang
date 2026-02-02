from typing import TYPE_CHECKING

from sqlalchemy import String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.models.base import Base, TimestampMixin
from src.models.role import user_roles

if TYPE_CHECKING:
    from src.models.role import Role
    from src.models.invoice import Invoice
    from src.models.booking import PurchaseRequests


class Employee(Base, TimestampMixin):
    """Employee/User model"""

    __tablename__ = "employee"

    id: Mapped[int] = mapped_column(primary_key=True)
    username: Mapped[str] = mapped_column(String(80), unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(String(255))
    job_name: Mapped[str] = mapped_column(String(100))
    phone_number: Mapped[str | None] = mapped_column(String(20), nullable=True)

    # Relationships
    roles: Mapped[list["Role"]] = relationship(
        secondary=user_roles,
        back_populates="employees",
        lazy="selectin",
    )
    invoices: Mapped[list["Invoice"]] = relationship(
        back_populates="employee",
        lazy="dynamic",
    )
    purchase_requests: Mapped[list["PurchaseRequests"]] = relationship(
        back_populates="employee",
        lazy="dynamic",
    )

    def __repr__(self) -> str:
        return f"<Employee {self.username}>"

    def has_permission(self, permission_code: str) -> bool:
        """Check if user has a specific permission through any of their roles"""
        for role in self.roles:
            if role.has_permission(permission_code):
                return True
        return False

    def get_all_permissions(self) -> set[str]:
        """Get all permission codes for this user from all roles"""
        permissions = set()
        for role in self.roles:
            for perm in role.permissions:
                permissions.add(perm.code)
        return permissions

    def to_dict(self) -> dict:
        """Convert to dictionary (basic info)"""
        return {
            "id": self.id,
            "username": self.username,
            "job_name": self.job_name,
            "phone_number": self.phone_number,
        }

    def to_dict_with_permissions(self) -> dict:
        """
        Convert to dictionary with nested permission structure.
        """
        from src.schemas.user import build_permissions_from_codes

        result = self.to_dict()
        user_perms = self.get_all_permissions()

        # Build nested permissions structure
        result["permissions"] = build_permissions_from_codes(user_perms).model_dump()

        return result

    def to_dict_flat_permissions(self) -> dict:
        """
        Convert to dictionary with flat permission fields (for list view).
        """
        from src.models.role import ALL_PERMISSION_CODES

        result = self.to_dict()
        user_perms = self.get_all_permissions()

        # Add all permission fields as boolean values
        for perm_code in ALL_PERMISSION_CODES:
            result[perm_code] = perm_code in user_perms

        return result
