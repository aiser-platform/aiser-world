from typing import Optional
from fastapi import Depends, HTTPException
from sqlalchemy.orm import Session
from app.modules.authentication.deps.auth_bearer import JWTCookie
from app.modules.authentication.auth import Auth
from app.modules.user.repository import UserRepository
from app.modules.user.schemas import UserResponse
from app.db.session import get_db


class CurrentUser:
    def __init__(self):
        self._user_id: Optional[int] = None
        self._email: Optional[str] = None
        self._payload: Optional[dict] = None
        self.repository = UserRepository()

    @property
    def user_id(self) -> int:
        return self._user_id

    @property
    def email(self) -> str:
        return self._email

    @classmethod
    async def from_token(
        cls, token: str = Depends(JWTCookie()), db: Session = Depends(get_db)
    ):
        """Create CurrentUser instance from JWT token"""
        instance = cls()

        try:
            print("token ", token)
            # Decode token and set properties
            instance._payload = Auth().decodeJWT(token)
            if not instance._payload:
                raise HTTPException(status_code=401, detail="Invalid token")

            instance._user_id = instance._payload.get("user_id")
            instance._email = instance._payload.get("email")

            print("instance ", instance)

            return instance

        except Exception as e:
            raise HTTPException(status_code=401, detail=str(e))

    async def get_user(self, db: Session) -> UserResponse:
        """Get full user object from database"""
        user = self.repository.get_by_id(self.user_id, db)
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        return UserResponse(**user.__dict__)
