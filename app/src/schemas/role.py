from pydantic import BaseModel, ConfigDict


class PermissionBase(BaseModel):
    """Base permission schema"""

    code: str
    name: str
    category: str
    description: str | None = None


class PermissionCreate(PermissionBase):
    """Schema for creating a permission"""

    pass


class PermissionResponse(PermissionBase):
    """Permission response schema"""

    id: int

    model_config = ConfigDict(from_attributes=True)


class RoleBase(BaseModel):
    """Base role schema"""

    name: str
    description: str | None = None


class RoleCreate(RoleBase):
    """Schema for creating a role"""

    permission_ids: list[int] = []


class RoleUpdate(BaseModel):
    """Schema for updating a role"""

    name: str | None = None
    description: str | None = None
    permission_ids: list[int] | None = None


class RoleResponse(RoleBase):
    """Role response schema"""

    id: int
    is_system: bool = False
    permissions: list[PermissionResponse] = []

    model_config = ConfigDict(from_attributes=True)


class RoleAssignment(BaseModel):
    """Schema for assigning roles to a user"""

    role_ids: list[int]
