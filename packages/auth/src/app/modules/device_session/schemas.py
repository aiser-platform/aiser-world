from datetime import datetime
from uuid import UUID
from pydantic import BaseModel, Field

from app.common.schemas import BaseSchema


class DeviceInfo(BaseModel):
    device_type: str
    device_name: str
    user_agent: str
    ip_address: str


class DeviceSessionBase(BaseModel):
    user_id: str | int = Field(...)  # Support both UUID (str) and integer
    device_id: str = Field(...)  # Changed from UUID to str for flexibility
    device_type: str = Field(None)
    device_name: str = Field(None)
    ip_address: str = Field(None)
    user_agent: str = Field(None)
    is_active: bool = Field(default=True)
    refresh_token: str = Field(...)
    refresh_token_expires_at: datetime | None = Field(default=None)

    class Config:
        json_encoders = {datetime: lambda v: v.isoformat(), UUID: lambda v: str(v)}


class DeviceSessionCreate(DeviceSessionBase):
    pass


class DeviceSessionUpdate(DeviceSessionBase):
    pass


class DeviceSessionResponse(DeviceSessionBase, BaseSchema):
    pass
