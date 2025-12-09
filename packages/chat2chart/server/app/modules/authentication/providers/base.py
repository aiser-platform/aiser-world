"""
Base Authentication Provider Interface

All authentication providers must implement this interface to ensure
consistent behavior across different auth systems.
"""

from abc import ABC, abstractmethod
from typing import Dict, Optional, Any


class AuthProvider(ABC):
    """Base interface for all authentication providers"""
    
    @abstractmethod
    async def login(self, identifier: str, password: str) -> Dict[str, Any]:
        """
        Authenticate user and return tokens + user info
        
        Args:
            identifier: Email or username
            password: User password
            
        Returns:
            Dict containing:
                - access_token: JWT access token
                - refresh_token: JWT refresh token
                - expires_in: Token expiration time in seconds
                - user: User information dict (id, email, username, etc.)
                
        Raises:
            HTTPException: If authentication fails (401)
        """
        pass
    
    @abstractmethod
    async def logout(self, token: str) -> bool:
        """
        Invalidate user session
        
        Args:
            token: Access or refresh token to invalidate
            
        Returns:
            True if logout successful, False otherwise
        """
        pass
    
    @abstractmethod
    async def verify_token(self, token: str) -> Optional[Dict[str, Any]]:
        """
        Verify and decode JWT token
        
        Args:
            token: JWT token to verify
            
        Returns:
            Decoded token payload (dict with user info) or None if invalid
        """
        pass
    
    @abstractmethod
    async def refresh_token(self, refresh_token: str) -> Dict[str, Any]:
        """
        Refresh access token using refresh token
        
        Args:
            refresh_token: Valid refresh token
            
        Returns:
            Dict containing:
                - access_token: New JWT access token
                - refresh_token: New JWT refresh token (if rotated)
                - expires_in: Token expiration time in seconds
                
        Raises:
            HTTPException: If refresh token is invalid (401)
        """
        pass
    
    @abstractmethod
    async def get_user_info(self, token: str) -> Dict[str, Any]:
        """
        Get user information from token
        
        Args:
            token: Valid access token
            
        Returns:
            Dict containing user information:
                - id: User ID
                - email: User email
                - username: Username
                - is_verified: Email verification status
                - Additional provider-specific fields
                
        Raises:
            HTTPException: If token is invalid (401)
        """
        pass
    
    @abstractmethod
    async def signup(self, email: str, username: str, password: str, **kwargs) -> Dict[str, Any]:
        """
        Register new user
        
        Args:
            email: User email
            username: Username
            password: User password
            **kwargs: Additional provider-specific parameters
            
        Returns:
            Dict containing:
                - user: User information
                - access_token: JWT access token (if auto-verified)
                - refresh_token: JWT refresh token (if auto-verified)
                - is_verified: Whether email is verified
                - message: Status message
                
        Raises:
            HTTPException: If signup fails (400, 409)
        """
        pass
    
    def normalize_user_data(self, user_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Normalize user data from provider-specific format to Aiser format
        
        This method can be overridden by providers to transform their
        user data format to the standard Aiser format.
        
        Args:
            user_data: Provider-specific user data
            
        Returns:
            Normalized user data with standard fields:
                - id: User ID (string or UUID)
                - email: User email
                - username: Username
                - is_verified: Email verification status
        """
        return {
            'id': user_data.get('id') or user_data.get('user_id') or user_data.get('sub'),
            'email': user_data.get('email'),
            'username': user_data.get('username') or user_data.get('name'),
            'is_verified': user_data.get('is_verified', False) or user_data.get('email_verified', False),
        }



