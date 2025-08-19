from app.common.model import Base

# Only import the models that the chat2chart service actually needs
from app.modules.user.models import User
from app.modules.files.models import File
from app.modules.chats.conversations.models import Conversation
from app.modules.chats.messages.models import Message
from app.modules.chats.node_memory.models import NodeMemory
from app.modules.charts.models import Chart
