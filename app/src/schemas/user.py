from pydantic import BaseModel, ConfigDict


class UserBase(BaseModel):
    """Base user schema"""

    username: str
    job_name: str
    phone_number: str | None = None


class UserCreate(UserBase):
    """Schema for creating a user"""

    password: str
    # All permission fields (optional, default False)
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


class UserUpdate(BaseModel):
    """Schema for updating a user (all permission fields)"""

    job_name: str | None = None
    phone_number: str | None = None
    # All permission fields
    create_inventory_operations: bool | None = None
    create_additions: bool | None = None
    view_additions: bool | None = None
    view_withdrawals: bool | None = None
    view_deposits: bool | None = None
    view_returns: bool | None = None
    view_damages: bool | None = None
    view_reservations: bool | None = None
    view_prices: bool | None = None
    view_purchase_requests: bool | None = None
    view_reports: bool | None = None
    view_transfers: bool | None = None
    view_zero_valued: bool | None = None
    view_confirmed: bool | None = None
    view_unreviewed: bool | None = None
    view_unconfirmed: bool | None = None
    can_edit: bool | None = None
    can_delete: bool | None = None
    can_confirm_withdrawal: bool | None = None
    can_withdraw: bool | None = None
    can_update_prices: bool | None = None
    can_recover_deposits: bool | None = None
    can_confirm_purchase_requests: bool | None = None
    can_change_zero_valued: bool | None = None
    can_change_confirmed: bool | None = None
    can_change_unreviewed: bool | None = None
    can_change_unconfirmed: bool | None = None
    items_can_edit: bool | None = None
    items_can_delete: bool | None = None
    items_can_add: bool | None = None
    machines_can_edit: bool | None = None
    machines_can_delete: bool | None = None
    machines_can_add: bool | None = None
    mechanism_can_edit: bool | None = None
    mechanism_can_delete: bool | None = None
    mechanism_can_add: bool | None = None
    suppliers_can_edit: bool | None = None
    suppliers_can_delete: bool | None = None
    suppliers_can_add: bool | None = None


class UserResponse(BaseModel):
    """User response with all permission fields (backward compatible)"""

    id: int
    username: str
    job_name: str
    phone_number: str | None = None
    # All permission fields
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


class TokenResponse(BaseModel):
    """Token response schema - login uses OAuth2PasswordRequestForm"""

    access_token: str
    token_type: str = "bearer"


class ChangePasswordRequest(BaseModel):
    """Change password request schema"""

    old_password: str
    new_password: str


class LoginRequest(BaseModel):
    """Login request schema for JSON body"""

    username: str
    password: str
