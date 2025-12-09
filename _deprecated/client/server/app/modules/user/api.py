from typing import Annotated
from app.common.schemas import ListResponseSchema
from app.common.utils.query_params import BaseFilterParams
from app.common.utils.search_query import create_search_query
from app.modules.authentication import (
    RefreshTokenRequest,
    RefreshTokenResponse,
    SignInRequest,
    SignInResponse,
)
from app.modules.authentication.deps.auth_bearer import (
    JWTCookieBearer,
    TokenDep,
)
from app.modules.user.schemas import UserCreate, UserResponse, UserUpdate
from app.modules.user.services import UserService
from fastapi import APIRouter, Depends, HTTPException, Response, status

router = APIRouter()
service = UserService()


@router.get("/", response_model=ListResponseSchema[UserResponse])
async def get_users(params: Annotated[BaseFilterParams, Depends()]):
    try:
        search_query = create_search_query(params.search, params.search_columns)
        return await service.get_all(
            offset=params.offset,
            limit=params.limit,
            search_query=search_query,
            sort_by=params.sort_by,
            sort_order=params.sort_order,
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e)
        )


@router.post("/", response_model=UserResponse)
async def create_user(item: UserCreate, token: str = TokenDep):
    try:
        return await service.create_user(item)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.get("/{user_id}", response_model=UserResponse)
async def get_one_user(user_id: int, token: str = TokenDep):
    try:
        user = service.get_user(user_id)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="User not found"
            )
        return user
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e)
        )


@router.put("/{user_id}", response_model=UserResponse, dependencies=[TokenDep])
async def update_user(user_id: int, user_in: UserUpdate):
    try:
        return await service.update_user(user_id, user_in)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))


@router.delete("/{user_id}", dependencies=[TokenDep])
async def delete_user(user_id: int):
    try:
        user = service.get_user(user_id)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="User not found"
            )
        return {"message": "User deleted successfully"}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e)
        )


@router.get("/me/", response_model=UserResponse)
async def get_me(token: str = Depends(JWTCookieBearer())):
    try:
        return await service.get_me(token)
    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e)
        )


@router.post("/sign-in", response_model=UserResponse)
async def sign_in(credentials: SignInRequest, response: Response):
    try:
        sign_in = await service.sign_in(credentials, response)

        return sign_in
    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e)
        )


@router.post("/sign-out")
async def sign_out():
    try:
        return await service.sign_out()
    except HTTPException as e:
        raise e


@router.post("/sign-up", response_model=SignInResponse)
async def sign_up(user_in: UserCreate):
    try:
        return await service.sign_up(user_in)
    except ValueError as e:
        raise e
    except Exception as e:
        raise e


@router.post("/refresh-token", response_model=RefreshTokenResponse)
async def refresh_token(request: RefreshTokenRequest):
    try:
        return await service.refresh_token(request)
    except HTTPException as e:
        raise e
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid refresh token"
        )
