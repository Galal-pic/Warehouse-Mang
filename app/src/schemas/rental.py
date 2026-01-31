from datetime import datetime
from pydantic import BaseModel, ConfigDict


class RentedItemBase(BaseModel):
    """Base rented item schema"""

    item_id: int
    quantity: int
    unit_price: float
    total_price: float
    customer_name: str
    customer_phone: str | None = None
    customer_id_number: str | None = None
    expected_return_date: datetime | None = None
    notes: str | None = None


class RentedItemCreate(RentedItemBase):
    """Schema for creating a rented item"""

    rental_invoice_id: int


class RentedItemUpdate(BaseModel):
    """Schema for updating a rented item"""

    status: str | None = None
    given_date: datetime | None = None
    expected_return_date: datetime | None = None
    actual_return_date: datetime | None = None
    customer_name: str | None = None
    customer_phone: str | None = None
    customer_id_number: str | None = None
    notes: str | None = None


class RentedItemResponse(BaseModel):
    """Rented item response schema"""

    id: int
    rental_invoice_id: int
    item_id: int
    item_name: str | None = None
    quantity: int
    unit_price: float
    total_price: float
    status: str
    given_date: str | None = None
    expected_return_date: str | None = None
    actual_return_date: str | None = None
    customer_name: str
    customer_phone: str | None = None
    customer_id_number: str | None = None
    borrowed_to_main_quantity: int = 0
    borrowed_date: str | None = None
    notes: str | None = None
    created_at: str | None = None
    updated_at: str | None = None

    model_config = ConfigDict(from_attributes=True)


class RentalWarehouseLocationResponse(BaseModel):
    """Rental warehouse location response schema"""

    item_id: int
    item_name: str | None = None
    location: str
    quantity: int
    reserved_quantity: int
    available_quantity: int
    created_at: str | None = None
    updated_at: str | None = None

    model_config = ConfigDict(from_attributes=True)


class RentalStatusUpdate(BaseModel):
    """Schema for updating rental status"""

    item_id: int
    status: str
    customer_name: str | None = None
    customer_phone: str | None = None
    customer_id_number: str | None = None
    given_date: datetime | None = None
    expected_return_date: datetime | None = None
    actual_return_date: datetime | None = None


class RentalBorrowRequest(BaseModel):
    """Schema for borrowing from rental to main warehouse"""

    item_id: int
    quantity: int


class RentalReturnRequest(BaseModel):
    """Schema for returning rental items"""

    item_id: int
    quantity: int


class MissingQuantityResponse(BaseModel):
    """Missing quantity details response"""

    booking_invoice_id: int
    item_id: int
    item_name: str | None = None
    original_quantity: int
    borrowed_quantity: int
    remaining_quantity: int
