from typing import Annotated, AsyncGenerator

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.ext.asyncio import AsyncSession

from src.database import async_session_maker
from src.core.security import decode_access_token
from src.repositories import UnitOfWork
from src.models import Employee


oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")


async def get_session() -> AsyncGenerator[AsyncSession, None]:
    """Get database session"""
    async with async_session_maker() as session:
        try:
            yield session
        except Exception:
            await session.rollback()
            raise


async def get_uow(
    session: Annotated[AsyncSession, Depends(get_session)]
) -> AsyncGenerator[UnitOfWork, None]:
    """Get Unit of Work instance"""
    uow = UnitOfWork(session)
    try:
        yield uow
        await uow.commit()
    except Exception:
        await uow.rollback()
        raise


async def get_current_user_id(
    token: Annotated[str, Depends(oauth2_scheme)]
) -> int:
    """Extract user ID from JWT token"""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

    payload = decode_access_token(token)
    if payload is None:
        raise credentials_exception

    user_id = payload.get("sub")
    if user_id is None:
        raise credentials_exception

    try:
        return int(user_id)
    except ValueError:
        raise credentials_exception


async def get_current_user(
    user_id: Annotated[int, Depends(get_current_user_id)],
    uow: Annotated[UnitOfWork, Depends(get_uow)],
) -> Employee:
    """Get current user from database"""
    user = await uow.users.get_with_roles(user_id)
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return user


def require_permission(permission_code: str):
    """Dependency factory for permission checking"""

    async def check_permission(
        user: Annotated[Employee, Depends(get_current_user)]
    ) -> Employee:
        if not user.has_permission(permission_code):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Permission denied",
            )
        return user

    return check_permission


def require_any_permission(*permission_codes: str):
    """Dependency factory for checking any of multiple permissions"""

    async def check_permissions(
        user: Annotated[Employee, Depends(get_current_user)]
    ) -> Employee:
        user_perms = user.get_all_permissions()
        if not any(p in user_perms for p in permission_codes):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Permission denied",
            )
        return user

    return check_permissions


# Type aliases for cleaner code
UOW = Annotated[UnitOfWork, Depends(get_uow)]
CurrentUser = Annotated[Employee, Depends(get_current_user)]
CurrentUserId = Annotated[int, Depends(get_current_user_id)]
