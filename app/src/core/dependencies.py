from typing import Annotated

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession

from src.database import get_db
from src.core.security import decode_access_token
from src.core.exceptions import UnauthorizedException, ForbiddenException


# Security scheme for JWT Bearer token
security = HTTPBearer(auto_error=False)


async def get_current_user_id(
    credentials: Annotated[
        HTTPAuthorizationCredentials | None, Depends(security)
    ] = None,
) -> int:
    """
    Dependency to get current user ID from JWT token.

    Returns:
        User ID from token

    Raises:
        UnauthorizedException: If token is missing or invalid
    """
    if not credentials:
        raise UnauthorizedException(detail="Missing authentication token")

    token = credentials.credentials
    payload = decode_access_token(token)

    if not payload:
        raise UnauthorizedException(detail="Invalid or expired token")

    user_id = payload.get("sub")
    if not user_id:
        raise UnauthorizedException(detail="Invalid token payload")

    try:
        return int(user_id)
    except ValueError:
        raise UnauthorizedException(detail="Invalid user ID in token")


async def get_current_user(
    user_id: Annotated[int, Depends(get_current_user_id)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """
    Dependency to get current user from database.

    This will be fully implemented after User model is created.
    For now, returns user_id to allow development to proceed.

    Returns:
        User object from database

    Raises:
        UnauthorizedException: If user not found
    """
    # TODO: Implement after User repository is created
    # user = await user_repository.get_with_roles(db, user_id)
    # if not user:
    #     raise UnauthorizedException(detail="User not found")
    # return user
    return {"id": user_id}  # Placeholder


def require_permission(permission_code: str):
    """
    Dependency factory for checking user permissions.

    Args:
        permission_code: The permission code to check (e.g., "view_additions")

    Returns:
        Dependency function that checks the permission

    Example:
        @router.get("/")
        async def list_items(
            user = Depends(require_permission("items_can_view"))
        ):
            ...
    """

    async def check_permission(
        user_id: Annotated[int, Depends(get_current_user_id)],
        db: Annotated[AsyncSession, Depends(get_db)],
    ):
        # TODO: Implement after User model with roles is created
        # user = await user_repository.get_with_roles(db, user_id)
        # if not user:
        #     raise UnauthorizedException(detail="User not found")
        # if not user.has_permission(permission_code):
        #     raise ForbiddenException(detail="Permission denied")
        # return user
        return {"id": user_id}  # Placeholder

    return check_permission


def require_any_permission(*permission_codes: str):
    """
    Dependency factory for checking if user has any of the given permissions.

    Args:
        permission_codes: Permission codes to check (OR logic)

    Returns:
        Dependency function that checks the permissions
    """

    async def check_permissions(
        user_id: Annotated[int, Depends(get_current_user_id)],
        db: Annotated[AsyncSession, Depends(get_db)],
    ):
        # TODO: Implement after User model with roles is created
        # user = await user_repository.get_with_roles(db, user_id)
        # if not user:
        #     raise UnauthorizedException(detail="User not found")
        # user_perms = user.get_all_permissions()
        # if not any(p in user_perms for p in permission_codes):
        #     raise ForbiddenException(detail="Permission denied")
        # return user
        return {"id": user_id}  # Placeholder

    return check_permissions


# Type aliases for cleaner dependency injection
DbSession = Annotated[AsyncSession, Depends(get_db)]
CurrentUserId = Annotated[int, Depends(get_current_user_id)]
