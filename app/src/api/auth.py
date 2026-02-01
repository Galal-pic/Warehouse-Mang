from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status, Query
from fastapi.security import OAuth2PasswordRequestForm

from src.api.deps import UOW, CurrentUser, get_uow
from src.core.security import hash_password, verify_password, create_access_token
from src.schemas.user import (
    UserCreate,
    UserUpdate,
    UserResponse,
    TokenResponse,
    ChangePasswordRequest,
    LoginRequest,
)
from src.schemas.common import PaginatedResponse, MessageResponse
from src.models.role import ALL_PERMISSION_CODES

router = APIRouter(prefix="/auth", tags=["Auth"])


@router.post("/register", response_model=UserResponse)
async def register(
    data: UserCreate,
    uow: UOW,
):
    """POST /auth/register - Register a new user"""
    # Check if username exists
    if await uow.users.username_exists(data.username):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username already exists",
        )

    # Create user
    user_data = {
        "username": data.username,
        "password_hash": hash_password(data.password),
        "job_name": data.job_name,
        "phone_number": data.phone_number,
    }
    user = await uow.users.create(user_data)

    # Collect permissions from request and create/assign role
    permissions_to_assign = []
    for perm_code in ALL_PERMISSION_CODES:
        if getattr(data, perm_code, False):
            permissions_to_assign.append(perm_code)

    if permissions_to_assign:
        # Get permission objects
        perms = await uow.permissions.get_by_codes(permissions_to_assign)
        perm_ids = [p.id for p in perms]

        # Create a custom role for this user or assign existing
        role_name = f"user_{user.id}_role"
        role = await uow.roles.create_with_permissions(
            {"name": role_name, "description": f"Custom role for {user.username}"},
            perm_ids,
        )
        await uow.users.assign_roles(user, [role.id])

    await uow.commit()

    # Refresh to get roles
    user = await uow.users.get_with_roles(user.id)
    return user.to_dict_with_permissions()


@router.post("/login", response_model=TokenResponse)
async def login(
    data: LoginRequest,
    uow: UOW,
):
    """POST /auth/login - Login with username and password (JSON body)"""
    user = await uow.users.get_by_username_with_roles(data.username)

    if not user or not verify_password(data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    access_token = create_access_token(subject=user.id)

    return TokenResponse(
        access_token=access_token,
        token_type="bearer",
    )


@router.post("/token", response_model=TokenResponse)
async def login_form(
    form_data: Annotated[OAuth2PasswordRequestForm, Depends()],
    uow: UOW,
):
    """POST /auth/token - Login with form data (OAuth2 compatible)"""
    user = await uow.users.get_by_username_with_roles(form_data.username)

    if not user or not verify_password(form_data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    access_token = create_access_token(subject=user.id)

    return TokenResponse(
        access_token=access_token,
        token_type="bearer",
    )


@router.get("/users", response_model=PaginatedResponse[UserResponse])
async def list_users(
    uow: UOW,
    current_user: CurrentUser,
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100),
    all: bool = Query(False),
):
    """GET /auth/users - List all users with pagination"""
    if all:
        users = await uow.users.get_all_with_roles(skip=0, limit=10000)
        total = len(users)
        items = [u.to_dict_with_permissions() for u in users]
        return {
            "items": items,
            "page": 1,
            "page_size": total,
            "total_pages": 1,
            "total_items": total,
            "all": True,
        }

    total = await uow.users.count()
    skip = (page - 1) * page_size
    users = await uow.users.get_all_with_roles(skip=skip, limit=page_size)

    items = [u.to_dict_with_permissions() for u in users]
    total_pages = (total + page_size - 1) // page_size

    return {
        "items": items,
        "page": page,
        "page_size": page_size,
        "total_pages": total_pages,
        "total_items": total,
        "all": False,
    }


@router.get("/user", response_model=UserResponse)
async def get_current_user_info(current_user: CurrentUser):
    """GET /auth/user - Get current user info from token"""
    return current_user.to_dict_with_permissions()


@router.get("/user/{user_id}", response_model=UserResponse)
async def get_user(
    user_id: int,
    uow: UOW,
    current_user: CurrentUser,
):
    """GET /auth/user/<id> - Get user by ID"""
    user = await uow.users.get_with_roles(user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )
    return user.to_dict_with_permissions()


@router.put("/user/{user_id}", response_model=UserResponse)
async def update_user(
    user_id: int,
    data: UserUpdate,
    uow: UOW,
    current_user: CurrentUser,
):
    """PUT /auth/user/<id> - Update user permissions"""
    user = await uow.users.get_with_roles(user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )

    # Update basic fields
    update_data = {}
    if data.job_name is not None:
        update_data["job_name"] = data.job_name
    if data.phone_number is not None:
        update_data["phone_number"] = data.phone_number

    if update_data:
        await uow.users.update(user, update_data)

    # Update permissions by updating role
    permissions_to_assign = []
    for perm_code in ALL_PERMISSION_CODES:
        perm_value = getattr(data, perm_code, None)
        if perm_value is True:
            permissions_to_assign.append(perm_code)

    # Get permission objects
    perms = await uow.permissions.get_by_codes(permissions_to_assign)
    perm_ids = [p.id for p in perms]

    # Find or create user's custom role
    role_name = f"user_{user.id}_role"
    role = await uow.roles.get_by_name(role_name)

    if role:
        await uow.roles.assign_permissions(role, perm_ids)
    else:
        role = await uow.roles.create_with_permissions(
            {"name": role_name, "description": f"Custom role for {user.username}"},
            perm_ids,
        )
        await uow.users.assign_roles(user, [role.id])

    await uow.commit()

    # Refresh user
    user = await uow.users.get_with_roles(user_id)
    return user.to_dict_with_permissions()


@router.post("/user/{user_id}/change-password", response_model=MessageResponse)
async def change_password(
    user_id: int,
    data: ChangePasswordRequest,
    uow: UOW,
    current_user: CurrentUser,
):
    """POST /auth/user/<id>/change-password - Change user password"""
    user = await uow.users.get(user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )

    # Verify old password
    if not verify_password(data.old_password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid old password",
        )

    # Update password
    await uow.users.update(user, {"password_hash": hash_password(data.new_password)})
    await uow.commit()

    return MessageResponse(message="Password changed successfully")


@router.delete("/user/{user_id}", response_model=MessageResponse)
async def delete_user(
    user_id: int,
    uow: UOW,
    current_user: CurrentUser,
):
    """DELETE /auth/user/<id> - Delete user"""
    user = await uow.users.get(user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )

    # Prevent self-deletion
    if user.id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete your own account",
        )

    await uow.users.delete(user)
    await uow.commit()

    return MessageResponse(message="User deleted successfully")
