from app.common.repository import BaseRepository
from app.modules.chats.node_memory.schemas import ChatNodeSchema, ChatNodeUpdateSchema
from app.modules.chats.node_memory.models import ChatNode


class ChatNodeRepository(
    BaseRepository[ChatNode, ChatNodeSchema, ChatNodeUpdateSchema]
):
    def __init__(self):
        super().__init__(ChatNode)

    async def get_nodes_by_key(
        self, node_key: str, conversation_id: str, limit: int = 1
    ):
        try:
            query = self._build_query_for_node_and_conversation(
                node_key, conversation_id
            )
            query = self._apply_sorting(query, sort_by="created_at", sort_order="desc")
            query = self._apply_pagination(query, limit=limit, offset=10)

            return await self._execute_and_fetch_all(query)
        except Exception as e:
            raise Exception(f"Error fetching nodes: {str(e)}")

    def _build_query_for_node_and_conversation(
        self, node_key: str, conversation_id: str
    ):
        try:
            return self._build_base_query().where(
                (self.model.node_key == node_key)
                & (self.model.conversation_id == conversation_id)
            )
        except Exception as e:
            raise Exception(f"Error building query: {str(e)}")
