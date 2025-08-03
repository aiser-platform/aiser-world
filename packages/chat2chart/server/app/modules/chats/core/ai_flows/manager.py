import json
import logging
from typing import Any, Dict
from urllib.parse import unquote

from app.core import g
import colorama
import pandas as pd
from app.modules.chats.core.ai_flows.schemas import AIFlowSchema
from app.modules.chats.schemas import ChatDatasourceSchema, DataType
from app.modules.files.services.factory import get_upload_service

from .agents import (
    BaseAgent,
    ChartAgent,
    GeneralAssistantAgent,
    InsightAgent,
    IntentAgent,
    SQLAgent,
    TitleAgent,
)

logger = logging.getLogger(__name__)


class AIManager:
    agent_map: Dict[str, BaseAgent]

    MAX_RECURSION_DEPTH = 3

    SQL_QUERY_INTENT = "SQL Query Assistant"
    CHART_GENERATOR_INTENT = "Chart Generated Assistant"
    INSIGHTS_INTENT = "Insights and Recommendations Assistant"
    GENERAL_ASSISTANT_INTENT = "General Assistant"
    FULL_FORM_INTENT = "Full Form Assistant"

    def __init__(self, data: AIFlowSchema):
        # Initialize context
        self.__data = data.model_copy()

        self.__user_query = self.__data.prompt
        self.__context = self.__data.system_context

        self.__json_metadata = self.__data.json_metadata
        self.__datasource = (
            ChatDatasourceSchema.model_validate(self.__json_metadata.get("datasource"))
            if "datasource" in self.__json_metadata
            else None
        )

        self.__conversation_id = self.__data.conversation_id

        self.__history = self.__data.history or []

        # Initialize agent response
        self.__agent_response = []

        # Initialize Context
        self._initial_message_memory()
        self._initial_context()
        self._initial_personal_info()

        # Initialize intent content

        self.__intent_content = ""
        self.__intent_json = {}

        self.__response = None

        # Initialize all agents
        agent_data = AIFlowSchema(
            prompt=self.__user_query,
            conversation_id=self.__conversation_id,
            datasource=self.__datasource,
            json_metadata=self.__json_metadata,
            history=self.__history,
            message_id=self.__data.message_id,
        )

        self.__intent_agent = IntentAgent(agent_data)
        self.__sql_agent = SQLAgent(agent_data)
        self.__chart_agent = ChartAgent(agent_data)
        self.__insight_agent = InsightAgent(agent_data)
        self.__general_assistant_agent = GeneralAssistantAgent(agent_data)
        self.__title_agent = TitleAgent()

    async def process_query(self):
        try:
            await self._initial_data_source()

            await self.intent_handler()

            intent_response = self.get_intent_response()

            intents = intent_response["json"]["intents"]

            for intent in intents:
                if intent == self.SQL_QUERY_INTENT:
                    await self.sql_handler()
                elif intent == self.CHART_GENERATOR_INTENT:
                    await self.chart_handler()
                elif intent == self.INSIGHTS_INTENT:
                    await self.insight_handler()
                elif intent == self.GENERAL_ASSISTANT_INTENT:
                    await self.general_assistant_handler()
                elif intent == self.FULL_FORM_INTENT:
                    await self.full_form_handler()
                else:
                    await self.general_assistant_handler()

        except Exception as e:
            logger.error(f"process_query Exception: {e}")
            raise e

    def get_agent_response(self):
        return self.__agent_response

    def set_agent_response(self, response):
        self.__agent_response.append(response)

    def set_intent_response(self, response):
        self.__intent_content = response

    def get_intent_response(self) -> Dict[str, Any]:
        intent_data = (
            json.loads(self.__intent_content.strip("json").strip("").strip())
            if self.__intent_content
            else {}
        )
        return {"json": intent_data, "content": self.__intent_content}

    async def title_handler(self):
        try:
            user_prompt = f"""user_query: {self.__user_query}, assistant_response: {self.__response}"""
            return await self.__title_agent.execute(user_prompt, self.__agent_response)

        except Exception as e:
            logger.error(f"Exception: {e}")
            raise e

    def set_response(self, response):
        if self.__response:
            self.__response += f"\n\n{response}"
        else:
            self.__response = response

    async def intent_handler(self):
        try:
            intent_response = self.get_intent_response()

            logger.info(f"Intent Response: {intent_response}")

            user_prompt = f"""
                            User Query: {self.__user_query} \
                            Last Intent: {intent_response["json"]["current_intent"] if intent_response["json"] else None} \
                            Current Intent: {intent_response["json"]["next_intent"] if intent_response["json"] else None} \
                            Last Assistant Response: {intent_response["json"] if intent_response["json"] else None}
                            """

            completion = await self.__intent_agent.execute(
                user_prompt, self.__agent_response
            )

            self.set_intent_response(completion["response"])

            return completion

        except Exception as e:
            raise e

    async def sql_handler(self):
        try:
            completion = await self.__sql_agent.execute(
                self.__user_query, self.__agent_response
            )
            result = completion["response"]

            self.set_response(result)

            return completion

        except Exception as e:
            raise e

    async def chart_handler(self):
        try:

            # await self._initial_data_source()

            sql_completion = await self.__sql_agent.execute(
                self.__user_query, self.__agent_response
            )
            self.set_agent_response(
                {"role": "assistant", "content": sql_completion["response"]}
            )

            completion = await self.__chart_agent.execute(
                self.__user_query, self.__agent_response
            )

            status = completion.get("status")
            response = completion["response"]

            self.set_agent_response(
                {"role": "assistant", "content": json.dumps(response)}
            )

            if status == "error":
                error = completion.get("error")
                self.set_response(error)
            else:
                response = (
                    completion["embed_iframe"]
                    if "embed_iframe" in completion and completion["embed_iframe"]
                    else response
                )

                self.set_response(response)

            return completion

        except Exception as e:
            logger.error(f"Exception: {e}")
            raise e

    async def insight_handler(self):
        try:
            completion = await self.__insight_agent.execute(
                self.__user_query, self.__agent_response
            )

            self.set_agent_response(
                {"role": "assistant", "content": completion["response"]}
            )

            self.set_response(completion["response"])

            return completion

        except Exception as e:
            logger.error(f"Exception: {e}")
            raise e

    async def general_assistant_handler(self):
        try:
            completion = await self.__general_assistant_agent.execute(
                self.__user_query, self.__agent_response
            )

            self.set_agent_response(
                {"role": "assistant", "content": completion["response"]}
            )

            self.set_response(completion["response"])

            return completion

        except Exception as e:
            logger.error(f"Exception: {e}")
            raise e

    async def full_form_handler(self):
        try:

            # await self._initial_data_source()

            sql_completion = await self.__sql_agent.execute(
                self.__user_query, self.__agent_response
            )
            self.set_agent_response(
                {"role": "assistant", "content": sql_completion["response"]}
            )

            chart_completion = await self.__chart_agent.execute(
                self.__user_query, self.__agent_response
            )

            chart_status = chart_completion.get("status")
            chart_response = chart_completion["response"]

            if chart_status == "error":
                chart_error = chart_completion.get("error")
                self.set_response(chart_error)
                self.__intent_json["next_action"] = "END"

                return chart_completion
            else:
                response = (
                    chart_completion["embed_iframe"]
                    if "embed_iframe" in chart_completion
                    and chart_completion["embed_iframe"]
                    else chart_response
                )

                self.set_response(response)

            self.set_agent_response(
                {"role": "assistant", "content": json.dumps(chart_response)}
            )

            insight_completion = await self.__insight_agent.execute(
                self.__user_query, self.__agent_response
            )

            self.set_agent_response(
                {"role": "assistant", "content": insight_completion["response"]}
            )

            self.set_response(insight_completion["response"])

            return self.__response

        except Exception as e:
            logger.error(f"Exception: {e}")
            raise e

    def get_response(self):
        return self.__response

    def _initial_context(self):
        if self.__context:
            self.set_agent_response({"role": "assistant", "content": self.__context})

        if self.__datasource:
            self.set_agent_response(
                {
                    "role": "assistant",
                    "content": f"Data source: {self.__datasource.data_type}, {self.__datasource.file.filename if self.__datasource.file else None}",
                }
            )

    async def _initial_data_source(self):

        if self.__datasource:
            if self.__datasource.data_type == DataType.FILE and self.__datasource.file:
                upload_service = get_upload_service()

                file = self.__datasource.file
                # Get file content as bytes
                file_response = await upload_service.repository.get_by_uuid_filename(
                    file.uuid_filename
                )

                logger.info(f"Loading data from file: {file_response.uuid_filename}")

                # Convert to DataFrame based on file type
                if file.content_type == "text/csv":
                    try:
                        df = pd.read_csv(file_response.file_path)
                    except Exception as e:
                        logger.error(f"Error reading CSV file: {e}")
                        self.set_agent_response(
                            {
                                "role": "assistant",
                                "content": f"Error reading CSV file: {e}",
                            }
                        )
                        return
                elif (
                    file.content_type
                    == "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                ):
                    try:
                        df = pd.read_excel(file_response.file_path)
                    except Exception as e:
                        logger.error(f"Error reading Excel file: {e}")
                        self.set_agent_response(
                            {
                                "role": "assistant",
                                "content": f"Error reading Excel file: {e}",
                            }
                        )
                        return
                else:
                    logger.error(f"Unsupported file type: {file.content_type}")
                    self.set_agent_response(
                        {
                            "role": "assistant",
                            "content": f"Unsupported file type: {file.content_type}",
                        }
                    )

                if df.empty:
                    self.set_agent_response(
                        {
                            "role": "assistant",
                            "content": f"Data loaded from file: {file.filename}\nNo data found",
                        }
                    )
                    return

                sample_data = df.iloc[2:5].to_csv(index=True)
                self.set_agent_response(
                    {
                        "role": "assistant",
                        "content": f"Data loaded from file: {file.filename}\nSample data (rows 3-5 with headers):\n{sample_data}",
                    }
                )
            if (
                self.__datasource.data_type == DataType.DATABASE
                and self.__datasource.database
            ):
                self.set_agent_response(
                    {
                        "role": "assistant",
                        "content": f"Data source: {self.__datasource.data_type}",
                    }
                )
            else:
                logger.warning("No data source provided")
                self.set_agent_response(
                    {
                        "role": "assistant",
                        "content": "No data source provided. Please upload/select a file to analyze.",
                    }
                )

        else:
            logger.warning("No data source provided")
            self.set_agent_response(
                {
                    "role": "assistant",
                    "content": "No data source provided. Please upload/select a file to analyze.",
                }
            )

    def _initial_message_memory(self):
        try:

            self.__history.reverse()

            for memory in self.__history:
                if memory.get("query") and memory.get("answer"):
                    self.__agent_response.extend(
                        [
                            {"role": "user", "content": memory.get("query")},
                            {"role": "assistant", "content": memory.get("answer")},
                        ]
                    )

            return self.__history
        except Exception as e:
            logger.error(f"Exception: {e}")
            raise e

    def _initial_personal_info(self):
        try:

            user = json.loads(unquote(g.get().get("user")))

            if user:
                self.set_agent_response(
                    {
                        "role": "system",
                        "content": f"The user's name is {user['username']}. Remember to address them by name when appropriate.",
                    }
                )

        except Exception as e:
            logger.error(f"Exception: {e}")
            raise e
