# Models module - SQLAlchemy models

from src.models.base import Base, TimestampMixin, SoftDeleteMixin
from src.models.role import Permission, Role, role_permissions, user_roles, ALL_PERMISSION_CODES
from src.models.user import Employee
from src.models.reference import Supplier, Machine, Mechanism
from src.models.warehouse import Warehouse, ItemLocations, Prices
from src.models.invoice import Invoice, InvoiceItem, InvoicePriceDetail
from src.models.rental import RentedItems, RentalWarehouseLocations
from src.models.booking import (
    PurchaseRequests,
    ReturnSales,
    WarrantyReturn,
    BookingDeductions,
)

__all__ = [
    # Base
    "Base",
    "TimestampMixin",
    "SoftDeleteMixin",
    # Role & Permissions
    "Permission",
    "Role",
    "role_permissions",
    "user_roles",
    "ALL_PERMISSION_CODES",
    # User
    "Employee",
    # Reference
    "Supplier",
    "Machine",
    "Mechanism",
    # Warehouse
    "Warehouse",
    "ItemLocations",
    "Prices",
    # Invoice
    "Invoice",
    "InvoiceItem",
    "InvoicePriceDetail",
    # Rental
    "RentedItems",
    "RentalWarehouseLocations",
    # Booking
    "PurchaseRequests",
    "ReturnSales",
    "WarrantyReturn",
    "BookingDeductions",
]
