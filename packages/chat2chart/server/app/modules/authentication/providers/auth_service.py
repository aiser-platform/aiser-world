"""
Auth Service Provider

Wraps the existing /packages/auth service to provide a unified interface.
This is the default provider that uses the standalone auth service.
"""

import os
import logging
import httpx
from typing import Dict, Any, Optional
from fastapi import HTTPException, status

from .base import AuthProvider
from app.core.config import settings

logger = logging.getLogger(__name__)


class AuthServiceProvider(AuthProvider):
    """Provider that wraps the existing /packages/auth service"""
    
    def __init__(self):
        # Get auth service URL from environment or config
        self.auth_service_url = (
            os.getenv('AUTH_SERVICE_URL') or 
            os.getenv('NEXT_PUBLIC_AUTH_URL') or
            getattr(settings, 'AUTH_SERVICE_URL', None) or
            'http://auth-service:5000'  # Default Docker service name
        )
        # Remove trailing slash
        self.auth_service_url = self.auth_service_url.rstrip('/')
        logger.info(f"AuthServiceProvider initialized with URL: {self.auth_service_url}")
    
    async def _make_request(
        self, 
        method: str, 
        endpoint: str, 
        data: Optional[Dict[str, Any]] = None,
        headers: Optional[Dict[str, str]] = None,
        cookies: Optional[Dict[str, str]] = None
    ) -> Dict[str, Any]:
        """Make HTTP request to auth service"""
        url = f"{self.auth_service_url}/{endpoint.lstrip('/')}"
        
        request_headers = {
            'Content-Type': 'application/json',
            **(headers or {})
        }
        
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.request(
                    method=method,
                    url=url,
                    json=data,
                    headers=request_headers,
                    cookies=cookies or {}
                )
                
                # Handle errors
                if response.status_code >= 400:
                    error_detail = "Authentication failed"
                    try:
                        error_data = response.json()
                        error_detail = error_data.get('detail') or error_data.get('message') or error_detail
                    except:
                        error_detail = response.text or error_detail
                    
                    if response.status_code == 401:
                        raise HTTPException(
                            status_code=status.HTTP_401_UNAUTHORIZED,
                            detail=error_detail
                        )
                    elif response.status_code == 400:
                        raise HTTPException(
                            status_code=status.HTTP_400_BAD_REQUEST,
                            detail=error_detail
                        )
                    else:
                        raise HTTPException(
                            status_code=response.status_code,
                            detail=error_detail
                        )
                
                return response.json()
        except httpx.TimeoutException:
            logger.error(f"Timeout connecting to auth service: {url}")
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Authentication service unavailable"
            )
        except httpx.RequestError as e:
            logger.error(f"Error connecting to auth service: {e}")
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Failed to connect to authentication service"
            )
    
    async def login(self, identifier: str, password: str) -> Dict[str, Any]:
        """Authenticate user via auth service"""
        logger.info(f"Login attempt for identifier: {identifier[:10]}...")
        
        response = await self._make_request(
            method='POST',
            endpoint='/users/signin',
            data={
                'identifier': identifier,
                'password': password
            }
        )
        
        # Normalize response format
        return {
            'access_token': response.get('access_token'),
            'refresh_token': response.get('refresh_token'),
            'expires_in': response.get('expires_in', 3600),
            'user': self.normalize_user_data(response.get('user', {})),
            'message': response.get('message')
        }
    
    async def logout(self, token: str) -> bool:
        """Logout user via auth service"""
        logger.info("Logout request")
        
        try:
            await self._make_request(
                method='POST',
                endpoint='/users/signout',
                headers={'Authorization': f'Bearer {token}'}
            )
            return True
        except HTTPException:
            # Even if logout fails, consider it successful (idempotent)
            logger.warning("Logout request failed, but treating as successful")
            return True
    
    async def verify_token(self, token: str) -> Optional[Dict[str, Any]]:
        """Verify token via auth service"""
        try:
            # Use /users/me endpoint to verify token
            response = await self._make_request(
                method='GET',
                endpoint='/users/me',
                headers={'Authorization': f'Bearer {token}'}
            )
            return self.normalize_user_data(response)
        except HTTPException as e:
            if e.status_code == 401:
                return None
            raise
    
    async def refresh_token(self, refresh_token: str) -> Dict[str, Any]:
        """Refresh access token via auth service"""
        logger.info("Token refresh request")
        
        response = await self._make_request(
            method='POST',
            endpoint='/users/refresh-token',
            data={'refresh_token': refresh_token}
        )
        
        return {
            'access_token': response.get('access_token'),
            'refresh_token': response.get('refresh_token'),
            'expires_in': response.get('expires_in', 3600)
        }
    
    async def get_user_info(self, token: str) -> Dict[str, Any]:
        """Get user info via auth service"""
        response = await self._make_request(
            method='GET',
            endpoint='/users/me',
            headers={'Authorization': f'Bearer {token}'}
        )
        return self.normalize_user_data(response)
    
    async def signup(self, email: str, username: str, password: str, **kwargs) -> Dict[str, Any]:
        """Signup new user via auth service"""
        logger.info(f"Signup attempt for email: {email[:10]}...")
        
        response = await self._make_request(
            method='POST',
            endpoint='/users/signup',
            data={
                'email': email,
                'username': username,
                'password': password,
                **kwargs
            }
        )
        
        # Normalize response
        user_data = response.get('user', {})
        return {
            'user': self.normalize_user_data(user_data),
            'access_token': response.get('access_token'),
            'refresh_token': response.get('refresh_token'),
            'is_verified': user_data.get('is_verified', False),
            'message': response.get('message', 'User created successfully')
        }



