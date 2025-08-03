from contextvars import ContextVar
from typing import Annotated

from app.modules.user.schemas import UserBase
from fastapi import Depends, HTTPException, Request
from fastapi.security import OAuth2AuthorizationCodeBearer, OAuth2PasswordBearer
from passlib.context import CryptContext

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

TokenDep = Annotated[str, Depends(oauth2_scheme)]


def fake_decode_token(token):
    return UserBase(
        username=token + "fakedecoded", email="john@example.com", full_name="John Doe"
    )


async def get_current_user(token: Annotated[str, Depends(oauth2_scheme)]):
    user = fake_decode_token(token)
    return user


pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password):
    return pwd_context.hash(password)
