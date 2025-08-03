from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, EmailStr
import logging
from .core import send_verification_email

router = APIRouter(prefix="/email", tags=["email"])
logger = logging.getLogger(__name__)


class TestEmailRequest(BaseModel):
    email: EmailStr


class TestEmailResponse(BaseModel):
    message: str
    success: bool


@router.post("/test", response_model=TestEmailResponse)
async def test_email(request: TestEmailRequest):
    """Test email sending functionality"""
    try:
        send_verification_email(
            email=request.email,
            token="test-token",
            verification_url="http://test-verification-url",
        )
        return TestEmailResponse(message="Test email sent successfully", success=True)
    except Exception as e:
        logger.error(f"Failed to send test email: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to send test email: {str(e)}",
        )
