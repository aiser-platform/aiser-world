from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field

from app.modules.temporary_token.constants import TokenType


class TemporaryTokenBase(BaseModel):
    token_type: TokenType = Field(..., description="Type of temporary token")
    token: str = Field(..., description="The token string")
    user_id: int = Field(..., description="ID of the user this token belongs to")
    expires_at: datetime = Field(..., description="Token expiration timestamp")


class TemporaryTokenCreate(TemporaryTokenBase):
    pass


class TemporaryTokenUpdate(BaseModel):
    is_valid: Optional[bool] = Field(None, description="Token validity status")
    used_at: Optional[datetime] = Field(None, description="When the token was used")


class TemporaryTokenResponse(TemporaryTokenBase):
    id: int
    is_valid: bool
    created_at: datetime
    used_at: Optional[datetime] = None

    class Config:
        from_attributes = True
