from typing import TypeVar, Generic
from pydantic import BaseModel, ConfigDict

T = TypeVar("T")


class PaginatedResponse(BaseModel, Generic[T]):
    """Standard paginated response matching Flask output exactly"""

    items: list[T]
    page: int
    page_size: int
    total_pages: int
    total_items: int
    all: bool = False

    model_config = ConfigDict(from_attributes=True)


class MessageResponse(BaseModel):
    """Simple message response"""

    message: str


class ErrorResponse(BaseModel):
    """Error response"""

    detail: str


class SuccessResponse(BaseModel):
    """Success response with optional data"""

    success: bool = True
    message: str | None = None


class StatusResponse(BaseModel):
    """Status response"""

    status: str
    status_code: int | None = None
