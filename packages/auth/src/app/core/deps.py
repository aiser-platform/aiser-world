from typing import Annotated

from fastapi import Depends
from fastapi.security import OAuth2PasswordBearer, OAuth2AuthorizationCodeBearer
from passlib.context import CryptContext

from app.modules.user.schemas import UserBase

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
