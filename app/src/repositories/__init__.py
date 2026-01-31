# Repositories module - data access layer

from src.repositories.base import BaseRepository
from src.repositories.user import UserRepository
from src.repositories.role import RoleRepository, PermissionRepository
from src.repositories.invoice import (
    InvoiceRepository,
    InvoiceItemRepository,
    InvoicePriceDetailRepository,
)
from src.repositories.warehouse import (
    WarehouseRepository,
    ItemLocationsRepository,
    PricesRepository,
)
from src.repositories.reference import (
    SupplierRepository,
    MachineRepository,
    MechanismRepository,
)
from src.repositories.rental import (
    RentedItemsRepository,
    RentalWarehouseLocationsRepository,
)
from src.repositories.booking import (
    PurchaseRequestsRepository,
    ReturnSalesRepository,
    WarrantyReturnRepository,
    BookingDeductionsRepository,
)
from src.repositories.unit_of_work import UnitOfWork

__all__ = [
    # Base
    "BaseRepository",
    # User & Auth
    "UserRepository",
    "RoleRepository",
    "PermissionRepository",
    # Invoice
    "InvoiceRepository",
    "InvoiceItemRepository",
    "InvoicePriceDetailRepository",
    # Warehouse
    "WarehouseRepository",
    "ItemLocationsRepository",
    "PricesRepository",
    # Reference
    "SupplierRepository",
    "MachineRepository",
    "MechanismRepository",
    # Rental
    "RentedItemsRepository",
    "RentalWarehouseLocationsRepository",
    # Booking
    "PurchaseRequestsRepository",
    "ReturnSalesRepository",
    "WarrantyReturnRepository",
    "BookingDeductionsRepository",
    # Unit of Work
    "UnitOfWork",
]
