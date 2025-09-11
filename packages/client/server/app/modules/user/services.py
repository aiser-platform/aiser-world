import logging
from typing import Dict, Any
import httpx
from fastapi import HTTPException

from app.core.config import settings
from app.modules.user.schemas import UserResponse

logger = logging.getLogger(__name__)


class UserService:
    AISER_AUTH_SERVICE_URL = settings.AISER_AUTH_SERVICE_URL

    async def signup(self, data: Dict[str, Any]) -> UserResponse:
        """
        Send signup request to external user service using httpx.

        Args:
            data: User signup data

        Returns:
            UserResponse: Created user data

        Raises:
            HTTPException: If signup fails
        """
        async with httpx.AsyncClient() as client:
            try:
                response = await client.post(
                    f"{self.AISER_AUTH_SERVICE_URL}/user/signup", json=data
                )
                response.raise_for_status()

                if response.status_code == 201:
                    return UserResponse(**response.json())

                raise HTTPException(
                    status_code=response.status_code,
                    detail=response.json().get("detail", "Signup failed"),
                )

            except httpx.RequestError as e:
                logger.error(f"Signup request failed: {str(e)}")
                raise HTTPException(status_code=503, detail="User service unavailable")

    async def login(self, data: Dict[str, Any]) -> UserResponse:
        """
        Send login request to external user service using httpx.

        Args:
            data: User login data

        Returns:
            UserResponse: User data

        Raises:
            HTTPException: If login fails
        """
        async with httpx.AsyncClient() as client:
            try:
                response = await client.post(
                    f"{self.AISER_AUTH_SERVICE_URL}/user/login", json=data
                )
                response.raise_for_status()

                if response.status_code == 200:
                    return UserResponse(**response.json())

                raise HTTPException(
                    status_code=response.status_code,
                    detail=response.json().get("detail", "Login failed"),
                )

            except httpx.RequestError as e:
                logger.error(f"Login request failed: {str(e)}")
                raise HTTPException(status_code=503, detail="User service unavailable")
