from pydantic import BaseModel, ConfigDict


class ItemLocationBase(BaseModel):
    """Base item location schema"""

    location: str
    quantity: int = 0


class ItemLocationResponse(ItemLocationBase):
    """Item location response schema"""

    item_id: int

    model_config = ConfigDict(from_attributes=True)


class WarehouseBase(BaseModel):
    """Base warehouse item schema"""

    item_name: str
    item_bar: str


class WarehouseCreate(WarehouseBase):
    """Schema for creating a warehouse item"""

    locations: list[ItemLocationBase] = []


class WarehouseUpdate(BaseModel):
    """Schema for updating a warehouse item"""

    item_name: str | None = None
    item_bar: str | None = None
    locations: list[ItemLocationBase] | None = None


class WarehouseResponse(WarehouseBase):
    """Warehouse item response schema"""

    id: int
    created_at: str | None = None
    updated_at: str | None = None
    locations: list[ItemLocationResponse] = []

    model_config = ConfigDict(from_attributes=True)


class WarehouseListItem(BaseModel):
    """Warehouse item for list view"""

    id: int
    item_name: str
    item_bar: str
    locations: list[dict] = []  # Simple list of {location, quantity}

    model_config = ConfigDict(from_attributes=True)


class WarehouseListResponse(BaseModel):
    """Paginated warehouse list response"""

    warehouses: list[WarehouseListItem]
    page: int
    page_size: int
    total_pages: int
    total_items: int
    all: bool


class PriceBase(BaseModel):
    """Base price schema"""

    invoice_id: int
    item_id: int
    location: str
    supplier_id: int = 0
    quantity: int
    unit_price: float


class PriceResponse(PriceBase):
    """Price response schema"""

    created_at: str | None = None

    model_config = ConfigDict(from_attributes=True)


class FifoPriceResponse(BaseModel):
    """FIFO price response for an item"""

    invoice_id: int
    item_id: int
    location: str
    supplier_id: int
    quantity: int
    unit_price: float
    created_at: str | None = None

    model_config = ConfigDict(from_attributes=True)


class CacheStatusResponse(BaseModel):
    """Cache status response"""

    connected: bool
    type: str
    used_memory: str | None = None
    error: str | None = None
