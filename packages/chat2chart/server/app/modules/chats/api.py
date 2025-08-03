from app.modules.chats.schemas import ChatResponseSchema, ChatSchema
from app.modules.chats.services import ChatService
from fastapi import APIRouter
from fastapi.responses import Response
import colorama

router = APIRouter()
service = ChatService()


@router.post("/chat", response_model=ChatResponseSchema)
async def create_chat(chat_data: ChatSchema):
    try:
        result = await service.chat(chat_data)
        return result
    except Exception as e:
        return {"error": str(e)}
