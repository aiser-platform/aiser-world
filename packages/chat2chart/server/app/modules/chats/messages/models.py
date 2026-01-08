"""
Chat Message Models

NOTE: Message is now defined in app.db.models.
This file re-exports it as ChatMessage for backward compatibility.
"""

# Re-export from consolidated models
from app.db.models import Message as ChatMessage
