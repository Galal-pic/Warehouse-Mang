"""Base service class for business logic layer"""

from typing import TypeVar, Generic
from dataclasses import dataclass

from src.repositories import UnitOfWork


@dataclass
class ServiceResult:
    """Standard result object for service operations"""

    success: bool
    message: str | None = None
    data: dict | None = None
    status_code: int = 200

    @classmethod
    def ok(cls, data: dict | None = None, message: str | None = None) -> "ServiceResult":
        """Create a successful result"""
        return cls(success=True, data=data, message=message, status_code=200)

    @classmethod
    def created(cls, data: dict | None = None, message: str | None = None) -> "ServiceResult":
        """Create a successful creation result"""
        return cls(success=True, data=data, message=message, status_code=201)

    @classmethod
    def error(cls, message: str, status_code: int = 400) -> "ServiceResult":
        """Create an error result"""
        return cls(success=False, message=message, status_code=status_code)

    @classmethod
    def not_found(cls, message: str = "Resource not found") -> "ServiceResult":
        """Create a not found result"""
        return cls(success=False, message=message, status_code=404)


class BaseService:
    """Base service with common functionality"""

    def __init__(self, uow: UnitOfWork):
        self.uow = uow
