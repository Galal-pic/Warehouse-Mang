from pydantic import BaseModel, ConfigDict, field_validator


# Permission group schemas
class CreateInvoicePermissions(BaseModel):
    """Permissions for creating invoices"""
    create_inventory_operations: bool = False
    create_additions: bool = False


class ManageOperationsPermissions(BaseModel):
    """Permissions for managing operations"""
    view_additions: bool = False
    view_withdrawals: bool = False
    view_deposits: bool = False
    view_returns: bool = False
    view_damages: bool = False
    view_reservations: bool = False
    view_prices: bool = False
    view_purchase_requests: bool = False
    view_reports: bool = False
    view_transfers: bool = False
    view_zero_valued: bool = False
    view_confirmed: bool = False
    view_unreviewed: bool = False
    view_unconfirmed: bool = False
    can_edit: bool = False
    can_delete: bool = False
    can_confirm_withdrawal: bool = False
    can_withdraw: bool = False
    can_update_prices: bool = False
    can_recover_deposits: bool = False
    can_confirm_purchase_requests: bool = False
    can_change_zero_valued: bool = False
    can_change_confirmed: bool = False
    can_change_unreviewed: bool = False
    can_change_unconfirmed: bool = False


class ItemsPermissions(BaseModel):
    """Permissions for items/warehouse"""
    items_can_edit: bool = False
    items_can_delete: bool = False
    items_can_add: bool = False


class MachinesPermissions(BaseModel):
    """Permissions for machines"""
    machines_can_edit: bool = False
    machines_can_delete: bool = False
    machines_can_add: bool = False


class MechanismPermissions(BaseModel):
    """Permissions for mechanisms"""
    mechanism_can_edit: bool = False
    mechanism_can_delete: bool = False
    mechanism_can_add: bool = False


class SuppliersPermissions(BaseModel):
    """Permissions for suppliers"""
    suppliers_can_edit: bool = False
    suppliers_can_delete: bool = False
    suppliers_can_add: bool = False


class UserPermissions(BaseModel):
    """All user permissions grouped by category"""
    createInvoice: CreateInvoicePermissions = CreateInvoicePermissions()
    manageOperations: ManageOperationsPermissions = ManageOperationsPermissions()
    items: ItemsPermissions = ItemsPermissions()
    machines: MachinesPermissions = MachinesPermissions()
    mechanism: MechanismPermissions = MechanismPermissions()
    suppliers: SuppliersPermissions = SuppliersPermissions()


class UserCreate(BaseModel):
    """Schema for creating a user"""
    username: str
    password: str
    phone_number: str | None = None
    job_name: str
    permissions: UserPermissions = UserPermissions()


PERMISSION_FIELDS = [
    "create_inventory_operations", "create_additions",
    "view_additions", "view_withdrawals", "view_deposits", "view_returns",
    "view_damages", "view_reservations", "view_prices", "view_purchase_requests",
    "view_reports", "view_transfers", "view_zero_valued", "view_confirmed",
    "view_unreviewed", "view_unconfirmed", "can_edit", "can_delete",
    "can_confirm_withdrawal", "can_withdraw", "can_update_prices",
    "can_recover_deposits", "can_confirm_purchase_requests",
    "can_change_zero_valued", "can_change_confirmed", "can_change_unreviewed",
    "can_change_unconfirmed",
    "items_can_edit", "items_can_delete", "items_can_add",
    "machines_can_edit", "machines_can_delete", "machines_can_add",
    "mechanism_can_edit", "mechanism_can_delete", "mechanism_can_add",
    "suppliers_can_edit", "suppliers_can_delete", "suppliers_can_add",
]


class UserUpdate(BaseModel):
    """Schema for updating a user (flat permission flags)"""
    username: str | None = None
    phone_number: str | None = None
    job_name: str | None = None
    # Flat permission flags — all default False; only truthy ones get assigned
    create_inventory_operations: bool = False
    create_additions: bool = False
    view_additions: bool = False
    view_withdrawals: bool = False
    view_deposits: bool = False
    view_returns: bool = False
    view_damages: bool = False
    view_reservations: bool = False
    view_prices: bool = False
    view_purchase_requests: bool = False
    view_reports: bool = False
    view_transfers: bool = False
    view_zero_valued: bool = False
    view_confirmed: bool = False
    view_unreviewed: bool = False
    view_unconfirmed: bool = False
    can_edit: bool = False
    can_delete: bool = False
    can_confirm_withdrawal: bool = False
    can_withdraw: bool = False
    can_update_prices: bool = False
    can_recover_deposits: bool = False
    can_confirm_purchase_requests: bool = False
    can_change_zero_valued: bool = False
    can_change_confirmed: bool = False
    can_change_unreviewed: bool = False
    can_change_unconfirmed: bool = False
    items_can_edit: bool = False
    items_can_delete: bool = False
    items_can_add: bool = False
    machines_can_edit: bool = False
    machines_can_delete: bool = False
    machines_can_add: bool = False
    mechanism_can_edit: bool = False
    mechanism_can_delete: bool = False
    mechanism_can_add: bool = False
    suppliers_can_edit: bool = False
    suppliers_can_delete: bool = False
    suppliers_can_add: bool = False


class UserResponse(BaseModel):
    """User response with nested permissions"""
    id: int
    username: str
    job_name: str
    phone_number: str | None = None
    permissions: UserPermissions

    model_config = ConfigDict(from_attributes=True)


class UserListItem(BaseModel):
    """User item for list response with flat permissions"""
    id: int
    username: str
    phone_number: str | None = None
    job_name: str
    # Flat permissions
    create_inventory_operations: bool = False
    create_additions: bool = False
    view_additions: bool = False
    view_withdrawals: bool = False
    view_deposits: bool = False
    view_returns: bool = False
    view_damages: bool = False
    view_reservations: bool = False
    view_prices: bool = False
    view_purchase_requests: bool = False
    view_reports: bool = False
    view_transfers: bool = False
    view_zero_valued: bool = False
    view_confirmed: bool = False
    view_unreviewed: bool = False
    view_unconfirmed: bool = False
    can_edit: bool = False
    can_delete: bool = False
    can_confirm_withdrawal: bool = False
    can_withdraw: bool = False
    can_update_prices: bool = False
    can_recover_deposits: bool = False
    can_confirm_purchase_requests: bool = False
    can_change_zero_valued: bool = False
    can_change_confirmed: bool = False
    can_change_unreviewed: bool = False
    can_change_unconfirmed: bool = False
    items_can_edit: bool = False
    items_can_delete: bool = False
    items_can_add: bool = False
    machines_can_edit: bool = False
    machines_can_delete: bool = False
    machines_can_add: bool = False
    mechanism_can_edit: bool = False
    mechanism_can_delete: bool = False
    mechanism_can_add: bool = False
    suppliers_can_edit: bool = False
    suppliers_can_delete: bool = False
    suppliers_can_add: bool = False

    model_config = ConfigDict(from_attributes=True)


class UserListResponse(BaseModel):
    """Paginated user list response"""
    users: list[UserListItem]
    page: int
    page_size: int
    total_pages: int
    total_items: int
    all: bool


class TokenResponse(BaseModel):
    """Token response schema"""
    access_token: str
    token_type: str = "bearer"


class ChangePasswordRequest(BaseModel):
    """Change password request schema (admin changes employee password)"""
    new_password: str
    confirm_new_password: str

    @field_validator("confirm_new_password")
    @classmethod
    def passwords_match(cls, v: str, info) -> str:
        if "new_password" in info.data and v != info.data["new_password"]:
            raise ValueError("Passwords do not match")
        return v


class LoginRequest(BaseModel):
    """Login request schema for JSON body"""
    username: str
    password: str


# Helper functions to convert between flat and nested permissions
def flatten_permissions(permissions: UserPermissions) -> list[str]:
    """Convert nested permissions to flat list of permission codes"""
    perm_codes = []

    # createInvoice
    if permissions.createInvoice.create_inventory_operations:
        perm_codes.append("create_inventory_operations")
    if permissions.createInvoice.create_additions:
        perm_codes.append("create_additions")

    # manageOperations
    ops = permissions.manageOperations
    for field in ops.model_fields:
        if getattr(ops, field):
            perm_codes.append(field)

    # items
    for field in permissions.items.model_fields:
        if getattr(permissions.items, field):
            perm_codes.append(field)

    # machines
    for field in permissions.machines.model_fields:
        if getattr(permissions.machines, field):
            perm_codes.append(field)

    # mechanism
    for field in permissions.mechanism.model_fields:
        if getattr(permissions.mechanism, field):
            perm_codes.append(field)

    # suppliers
    for field in permissions.suppliers.model_fields:
        if getattr(permissions.suppliers, field):
            perm_codes.append(field)

    return perm_codes


def build_permissions_from_codes(perm_codes: set[str]) -> UserPermissions:
    """Build nested permissions from set of permission codes"""
    return UserPermissions(
        createInvoice=CreateInvoicePermissions(
            create_inventory_operations="create_inventory_operations" in perm_codes,
            create_additions="create_additions" in perm_codes,
        ),
        manageOperations=ManageOperationsPermissions(
            view_additions="view_additions" in perm_codes,
            view_withdrawals="view_withdrawals" in perm_codes,
            view_deposits="view_deposits" in perm_codes,
            view_returns="view_returns" in perm_codes,
            view_damages="view_damages" in perm_codes,
            view_reservations="view_reservations" in perm_codes,
            view_prices="view_prices" in perm_codes,
            view_purchase_requests="view_purchase_requests" in perm_codes,
            view_reports="view_reports" in perm_codes,
            view_transfers="view_transfers" in perm_codes,
            view_zero_valued="view_zero_valued" in perm_codes,
            view_confirmed="view_confirmed" in perm_codes,
            view_unreviewed="view_unreviewed" in perm_codes,
            view_unconfirmed="view_unconfirmed" in perm_codes,
            can_edit="can_edit" in perm_codes,
            can_delete="can_delete" in perm_codes,
            can_confirm_withdrawal="can_confirm_withdrawal" in perm_codes,
            can_withdraw="can_withdraw" in perm_codes,
            can_update_prices="can_update_prices" in perm_codes,
            can_recover_deposits="can_recover_deposits" in perm_codes,
            can_confirm_purchase_requests="can_confirm_purchase_requests" in perm_codes,
            can_change_zero_valued="can_change_zero_valued" in perm_codes,
            can_change_confirmed="can_change_confirmed" in perm_codes,
            can_change_unreviewed="can_change_unreviewed" in perm_codes,
            can_change_unconfirmed="can_change_unconfirmed" in perm_codes,
        ),
        items=ItemsPermissions(
            items_can_edit="items_can_edit" in perm_codes,
            items_can_delete="items_can_delete" in perm_codes,
            items_can_add="items_can_add" in perm_codes,
        ),
        machines=MachinesPermissions(
            machines_can_edit="machines_can_edit" in perm_codes,
            machines_can_delete="machines_can_delete" in perm_codes,
            machines_can_add="machines_can_add" in perm_codes,
        ),
        mechanism=MechanismPermissions(
            mechanism_can_edit="mechanism_can_edit" in perm_codes,
            mechanism_can_delete="mechanism_can_delete" in perm_codes,
            mechanism_can_add="mechanism_can_add" in perm_codes,
        ),
        suppliers=SuppliersPermissions(
            suppliers_can_edit="suppliers_can_edit" in perm_codes,
            suppliers_can_delete="suppliers_can_delete" in perm_codes,
            suppliers_can_add="suppliers_can_add" in perm_codes,
        ),
    )
