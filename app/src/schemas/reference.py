from pydantic import BaseModel, ConfigDict


# Supplier Schemas
class SupplierBase(BaseModel):
    """Base supplier schema"""

    name: str
    description: str | None = None


class SupplierCreate(SupplierBase):
    """Schema for creating a supplier"""

    pass


class SupplierUpdate(BaseModel):
    """Schema for updating a supplier"""

    name: str | None = None
    description: str | None = None


class SupplierResponse(SupplierBase):
    """Supplier response schema"""

    id: int

    model_config = ConfigDict(from_attributes=True)


# Machine Schemas
class MachineBase(BaseModel):
    """Base machine schema"""

    name: str
    description: str | None = None


class MachineCreate(MachineBase):
    """Schema for creating a machine"""

    pass


class MachineUpdate(BaseModel):
    """Schema for updating a machine"""

    name: str | None = None
    description: str | None = None


class MachineResponse(MachineBase):
    """Machine response schema"""

    id: int

    model_config = ConfigDict(from_attributes=True)


# Mechanism Schemas
class MechanismBase(BaseModel):
    """Base mechanism schema"""

    name: str
    description: str | None = None


class MechanismCreate(MechanismBase):
    """Schema for creating a mechanism"""

    pass


class MechanismUpdate(BaseModel):
    """Schema for updating a mechanism"""

    name: str | None = None
    description: str | None = None


class MechanismResponse(MechanismBase):
    """Mechanism response schema"""

    id: int

    model_config = ConfigDict(from_attributes=True)
