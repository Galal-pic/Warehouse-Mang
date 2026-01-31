from sqlalchemy.ext.asyncio import AsyncSession

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


class UnitOfWork:
    """
    Unit of Work pattern implementation.

    Provides a single point of access to all repositories and manages
    database transactions.

    Usage:
        async with UnitOfWork(session) as uow:
            user = await uow.users.get(1)
            await uow.commit()
    """

    def __init__(self, session: AsyncSession):
        self.session = session
        self._repositories: dict = {}

    async def __aenter__(self) -> "UnitOfWork":
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        if exc_type:
            await self.rollback()

    async def commit(self):
        """Commit the transaction"""
        await self.session.commit()

    async def rollback(self):
        """Rollback the transaction"""
        await self.session.rollback()

    async def flush(self):
        """Flush pending changes without committing"""
        await self.session.flush()

    # User & Auth
    @property
    def users(self) -> UserRepository:
        if "users" not in self._repositories:
            self._repositories["users"] = UserRepository(self.session)
        return self._repositories["users"]

    @property
    def roles(self) -> RoleRepository:
        if "roles" not in self._repositories:
            self._repositories["roles"] = RoleRepository(self.session)
        return self._repositories["roles"]

    @property
    def permissions(self) -> PermissionRepository:
        if "permissions" not in self._repositories:
            self._repositories["permissions"] = PermissionRepository(self.session)
        return self._repositories["permissions"]

    # Invoice
    @property
    def invoices(self) -> InvoiceRepository:
        if "invoices" not in self._repositories:
            self._repositories["invoices"] = InvoiceRepository(self.session)
        return self._repositories["invoices"]

    @property
    def invoice_items(self) -> InvoiceItemRepository:
        if "invoice_items" not in self._repositories:
            self._repositories["invoice_items"] = InvoiceItemRepository(self.session)
        return self._repositories["invoice_items"]

    @property
    def price_details(self) -> InvoicePriceDetailRepository:
        if "price_details" not in self._repositories:
            self._repositories["price_details"] = InvoicePriceDetailRepository(self.session)
        return self._repositories["price_details"]

    # Warehouse
    @property
    def warehouse(self) -> WarehouseRepository:
        if "warehouse" not in self._repositories:
            self._repositories["warehouse"] = WarehouseRepository(self.session)
        return self._repositories["warehouse"]

    @property
    def item_locations(self) -> ItemLocationsRepository:
        if "item_locations" not in self._repositories:
            self._repositories["item_locations"] = ItemLocationsRepository(self.session)
        return self._repositories["item_locations"]

    @property
    def prices(self) -> PricesRepository:
        if "prices" not in self._repositories:
            self._repositories["prices"] = PricesRepository(self.session)
        return self._repositories["prices"]

    # Reference
    @property
    def suppliers(self) -> SupplierRepository:
        if "suppliers" not in self._repositories:
            self._repositories["suppliers"] = SupplierRepository(self.session)
        return self._repositories["suppliers"]

    @property
    def machines(self) -> MachineRepository:
        if "machines" not in self._repositories:
            self._repositories["machines"] = MachineRepository(self.session)
        return self._repositories["machines"]

    @property
    def mechanisms(self) -> MechanismRepository:
        if "mechanisms" not in self._repositories:
            self._repositories["mechanisms"] = MechanismRepository(self.session)
        return self._repositories["mechanisms"]

    # Rental
    @property
    def rented_items(self) -> RentedItemsRepository:
        if "rented_items" not in self._repositories:
            self._repositories["rented_items"] = RentedItemsRepository(self.session)
        return self._repositories["rented_items"]

    @property
    def rental_locations(self) -> RentalWarehouseLocationsRepository:
        if "rental_locations" not in self._repositories:
            self._repositories["rental_locations"] = RentalWarehouseLocationsRepository(self.session)
        return self._repositories["rental_locations"]

    # Booking
    @property
    def purchase_requests(self) -> PurchaseRequestsRepository:
        if "purchase_requests" not in self._repositories:
            self._repositories["purchase_requests"] = PurchaseRequestsRepository(self.session)
        return self._repositories["purchase_requests"]

    @property
    def return_sales(self) -> ReturnSalesRepository:
        if "return_sales" not in self._repositories:
            self._repositories["return_sales"] = ReturnSalesRepository(self.session)
        return self._repositories["return_sales"]

    @property
    def warranty_returns(self) -> WarrantyReturnRepository:
        if "warranty_returns" not in self._repositories:
            self._repositories["warranty_returns"] = WarrantyReturnRepository(self.session)
        return self._repositories["warranty_returns"]

    @property
    def booking_deductions(self) -> BookingDeductionsRepository:
        if "booking_deductions" not in self._repositories:
            self._repositories["booking_deductions"] = BookingDeductionsRepository(self.session)
        return self._repositories["booking_deductions"]
