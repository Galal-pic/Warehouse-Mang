from fastapi import HTTPException, status


class AppException(HTTPException):
    """Base application exception"""

    def __init__(
        self,
        status_code: int = status.HTTP_500_INTERNAL_SERVER_ERROR,
        detail: str = "An error occurred",
    ):
        super().__init__(status_code=status_code, detail=detail)


class NotFoundException(AppException):
    """Resource not found exception"""

    def __init__(self, detail: str = "Resource not found"):
        super().__init__(status_code=status.HTTP_404_NOT_FOUND, detail=detail)


class BadRequestException(AppException):
    """Bad request exception"""

    def __init__(self, detail: str = "Bad request"):
        super().__init__(status_code=status.HTTP_400_BAD_REQUEST, detail=detail)


class UnauthorizedException(AppException):
    """Unauthorized exception"""

    def __init__(self, detail: str = "Unauthorized"):
        super().__init__(status_code=status.HTTP_401_UNAUTHORIZED, detail=detail)


class ForbiddenException(AppException):
    """Permission denied exception"""

    def __init__(self, detail: str = "Permission denied"):
        super().__init__(status_code=status.HTTP_403_FORBIDDEN, detail=detail)


class ConflictException(AppException):
    """Conflict exception (e.g., duplicate resource)"""

    def __init__(self, detail: str = "Resource already exists"):
        super().__init__(status_code=status.HTTP_409_CONFLICT, detail=detail)


class ValidationException(AppException):
    """Validation error exception"""

    def __init__(self, detail: str = "Validation error"):
        super().__init__(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=detail
        )


class InsufficientQuantityException(AppException):
    """Insufficient quantity in warehouse"""

    def __init__(self, detail: str = "Insufficient quantity"):
        super().__init__(status_code=status.HTTP_400_BAD_REQUEST, detail=detail)


class InvalidInvoiceStateException(AppException):
    """Invalid invoice state for operation"""

    def __init__(self, detail: str = "Invalid invoice state"):
        super().__init__(status_code=status.HTTP_400_BAD_REQUEST, detail=detail)
