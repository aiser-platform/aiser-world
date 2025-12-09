from datetime import datetime
from uuid import UUID
from pydantic import BaseModel, Field

from app.common.schemas import BaseSchema


class DeviceInfo(BaseModel):
    device_id: str | None = None
    device_type: str | None = None
    device_name: str | None = None
    user_agent: str | None = None
    ip_address: str | None = None


class DeviceSessionBase(BaseModel):
    # Support string or integer ids; convert UUID to string before creating
    user_id: str | int = Field(...)  # Support UUID-as-string, str and integer
    device_id: str | None = Field(None)  # Changed to optional for flexibility
    device_type: str | None = Field(None)
    device_name: str | None = Field(None)
    ip_address: str | None = Field(None)
    user_agent: str | None = Field(None)
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
