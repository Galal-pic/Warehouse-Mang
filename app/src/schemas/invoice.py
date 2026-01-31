from datetime import datetime
from pydantic import BaseModel, ConfigDict


class InvoiceItemBase(BaseModel):
    """Base invoice item schema"""

    item_id: int
    location: str
    quantity: int | None = None
    unit_price: float | None = None
    total_price: float | None = None
    supplier_id: int = 0
    supplier_name: str | None = None
    description: str | None = None
    new_location: str | None = None


class InvoiceItemCreate(InvoiceItemBase):
    """Schema for creating an invoice item"""

    pass


class InvoiceItemUpdate(BaseModel):
    """Schema for updating an invoice item"""

    quantity: int | None = None
    unit_price: float | None = None
    total_price: float | None = None
    description: str | None = None
    new_location: str | None = None


class PriceDetailResponse(BaseModel):
    """Price detail response (FIFO breakdown)"""

    source_price_invoice_id: int
    quantity: int
    unit_price: float
    subtotal: float

    model_config = ConfigDict(from_attributes=True)


class InvoiceItemResponse(BaseModel):
    """Invoice item response schema"""

    item_id: int
    item_name: str | None = None
    barcode: str | None = None
    quantity: int | None = None
    location: str
    unit_price: float | None = None
    total_price: float | None = None
    supplier_id: int = 0
    supplier_name: str | None = None
    description: str | None = None
    new_location: str | None = None
    price_details: list[PriceDetailResponse] = []

    model_config = ConfigDict(from_attributes=True)


class InvoiceBase(BaseModel):
    """Base invoice schema"""

    type: str
    client_name: str | None = None
    warehouse_manager: str | None = None
    accreditation_manager: str | None = None
    total_amount: float | None = None
    paid: float | None = None
    residual: float | None = None
    comment: str | None = None
    payment_method: str | None = None
    custody_person: str | None = None
    machine_id: int | None = None
    mechanism_id: int | None = None
    supplier_id: int | None = None


class InvoiceCreate(InvoiceBase):
    """Schema for creating an invoice"""

    items: list[InvoiceItemCreate] = []


class InvoiceUpdate(BaseModel):
    """Schema for updating an invoice"""

    client_name: str | None = None
    warehouse_manager: str | None = None
    accreditation_manager: str | None = None
    total_amount: float | None = None
    paid: float | None = None
    residual: float | None = None
    comment: str | None = None
    payment_method: str | None = None
    custody_person: str | None = None
    machine_id: int | None = None
    mechanism_id: int | None = None
    supplier_id: int | None = None
    items: list[InvoiceItemCreate] | None = None


class InvoiceResponse(BaseModel):
    """Invoice response schema (matches Flask output exactly)"""

    id: int
    type: str
    client_name: str | None = None
    status: str
    employee_name: str
    machine_name: str | None = None
    mechanism_name: str | None = None
    total_amount: float | None = None
    paid: float | None = None
    residual: float | None = None
    created_at: str | None = None
    comment: str | None = None
    deduction_status: str | None = None
    warehouse_manager: str | None = None
    accreditation_manager: str | None = None
    payment_method: str | None = None
    custody_person: str | None = None
    suppliers_summary: list[str] = []
    items: list[InvoiceItemResponse] = []

    model_config = ConfigDict(from_attributes=True)


class InvoiceListResponse(BaseModel):
    """Invoice list response (without full item details)"""

    id: int
    type: str
    client_name: str | None = None
    status: str
    employee_name: str
    machine_name: str | None = None
    mechanism_name: str | None = None
    total_amount: float | None = None
    paid: float | None = None
    residual: float | None = None
    created_at: str | None = None
    suppliers_summary: list[str] = []

    model_config = ConfigDict(from_attributes=True)


class LastIdResponse(BaseModel):
    """Last invoice ID response"""

    last_id: int


class WarrantyReturnRequest(BaseModel):
    """Warranty return request schema"""

    items: list[dict]
    return_type: str  # 'full' or 'partial'
    notes: str | None = None


class WarrantyReturnStatusResponse(BaseModel):
    """Warranty return status response"""

    invoice_id: int
    item_id: int
    location: str
    original_quantity: int
    returned_quantity: int
    remaining_quantity: int


class PriceUpdateRequest(BaseModel):
    """Price update request schema"""

    items: list[dict]
