"""
Chat Conversation Models

NOTE: Conversation is now defined in app.db.models.
This file re-exports it as ChatConversation for backward compatibility.
"""

# Re-export from consolidated models
from app.db.models import Conversation as ChatConversation
