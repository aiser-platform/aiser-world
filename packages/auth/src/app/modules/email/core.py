import logging
import os

from emails import Message
from emails.template import JinjaTemplate

from app.core.config import settings


logger = logging.getLogger(__name__)


def send_verification_email(email: str, token: str, verification_url: str = None):
    """Send email verification email to user"""
    try:
        verification_url = (
            f"{settings.APP_URL}/verify-email?token={token}"
            if not verification_url
            else f"{verification_url}?token={token}"
        )

        # Get template path
        template_dir = os.path.join(os.path.dirname(__file__), "templates")
        template_path = os.path.join(template_dir, "verification_email.html")

        # Load and render template
        with open(template_path) as f:
            template = JinjaTemplate(f.read())
            html_content = template.render(verification_url=verification_url)

        message = Message(
            subject="Verify Your Email Address",
            mail_from=(settings.SMTP_SENDER),
            html=html_content,
            mail_to=f"{email}",
        )

        response = message.send(
            smtp={
                "host": settings.SMTP_HOST,
                "port": settings.SMTP_PORT,
                "user": settings.SMTP_USERNAME,
                "password": settings.SMTP_PASSWORD,
                "tls": True,
            }
        )

        if not response.success:
            logger.error(f"Failed to send email: {response.error}")
            raise Exception(f"Email sending failed: {response.error}")

        logger.info(f"Verification email sent to {email}")
        return True

    except Exception as e:
        logger.error(f"Error sending verification email: {e}")
        raise


async def send_reset_password_email(email: str, token: str, reset_url: str):
    """Send password reset email to user"""
    try:
        template_dir = os.path.join(os.path.dirname(__file__), "templates")
        template_path = os.path.join(template_dir, "reset_password.html")

        with open(template_path) as f:
            template = JinjaTemplate(f.read())
            html_content = template.render(reset_url=reset_url)

        message = Message(
            subject="Reset Your Password",
            mail_from=settings.SMTP_SENDER,
            html=html_content,
            mail_to=email,
        )

        response = message.send(
            smtp={
                "host": settings.SMTP_HOST,
                "port": settings.SMTP_PORT,
                "user": settings.SMTP_USERNAME,
                "password": settings.SMTP_PASSWORD,
                "tls": True,
            }
        )

        if not response.success:
            raise Exception(f"Failed to send email: {response.error}")

        return True

    except Exception as e:
        logger.error(f"Error sending reset password email: {e}")
        raise
