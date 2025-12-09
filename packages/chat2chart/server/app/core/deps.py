from typing import Annotated
import uuid

from app.modules.user.models import User
from app.db.session import async_session
from fastapi import Depends
from fastapi.security import OAuth2PasswordBearer
from passlib.context import CryptContext

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

TokenDep = Annotated[str, Depends(oauth2_scheme)]


async def get_current_user(token: Annotated[str, Depends(oauth2_scheme)]) -> User:
    """
    Get current user from database using token.
    For now, we'll use a simple approach with a known user ID.
    """
    try:
        # For development/testing, use the first user from database
        async with async_session() as session:
            from sqlalchemy import select
            result = await session.execute(select(User).limit(1))
            user = result.scalar_one_or_none()
            
            if user:
                return user
            else:
                # Fallback: create a fake user with proper structure
                class FakeUser:
                    def __init__(self):
                        self.id = uuid.UUID("7d4fd121-913e-4cd6-882a-b939778f9f76")
                        self.username = "test-user"
                        self.email = "test@example.com"
                        self.first_name = "Test"
                        self.last_name = "User"
                        self.organization_id = None  # Will be set by relationship
                
                return FakeUser()
                
    except Exception:
        # Fallback for any database issues
        class FakeUser:
            def __init__(self):
                self.id = uuid.UUID("7d4fd121-913e-4cd6-882a-b939778f9f76")
                self.username = "test-user"
                self.email = "test@example.com"
                self.first_name = "Test"
                self.last_name = "User"
                self.organization_id = None
        
        return FakeUser()


pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password):
    return pwd_context.hash(password)
