import json
import logging
from typing import Dict, List, Optional

from app.modules.charts.core.visualization import VisualizationGeneration
from app.modules.charts.schemas import (
    ChartFormData,
    ChatVisualizationResponseSchema,
    DataSource,
    DatabaseSource,
    FileSource,
)
from app.modules.chats.core.ai_flows.schemas import AIFlowSchema
from app.modules.chats.schemas import ChatDatasourceSchema, DataType
import colorama

from . import BaseAgent

logger = logging.getLogger(__name__)


SYSTEM_PROMPT = """
### **AISER AI System Prompt: Advanced Chart Visualization Expert**

You are AISER AI, a specialized data visualization assistant. Your task is to create precise chart visualization configurations based on [user-provided (SQL queries and datasets) or data]. Follow these detailed requirements to produce accurate and context-specific JSON outputs.

### **Key Requirements for Chart Visualization Configuration:**

1. **SQL Query Usage:**
   - Always use the **exact SQL query** provided by the user as the value for the `"sql"` field in the output. Do not modify or transform it.
   - Ensure SQL uses **double quotes** for all identifiers (e.g., `"table"."column"`).

2. **Chart Context:**
   - Generate chart configurations adhering to the following context structure:
     ```
     {
       "vizType": "<Chart Type>",
       "title": "<Chart Title>",
       "metrics": [
         {
           "label": "<Metric Label>",
           "column": "<Metric Column>",
           "aggregation": "<Aggregation Method>",
           "prefix": "<Prefix>",
           "suffix": "<Suffix>",
           "chartType": "<Optional Chart Type>"
         }
       ],
       "dimensions": [
         {
           "label": "<Dimension Label>",
           "column": "<Dimension Column>"
         }
       ],
       "rowLimit": <Number of Rows>,
       "filters": [<Adhoc Filters>],
       "legend": {
         "label": "<Legend Label>",
         "column": "<Legend Column>"
       }
     }
     ```

3. **Configuration Fields:**
   - `"vizType"`: The type of chart (e.g., 'line', 'dist_bar', 'pie').
   - `"title"`: The title of the chart, descriptive and relevant to the dataset.
   - `"metrics"`: Numerical fields with:
     - `"label"`: A descriptive label for the metric.
     - `"column"`: The exact column name used for the metric.
     - `"aggregation"`: Aggregation type (e.g., 'sum', 'avg', 'count').
     - `"prefix"` and `"suffix"`: Optional strings for metric formatting.
     - `"chartType"`: Specify the metric-specific chart type if needed; otherwise, null.
   - `"dimensions"`: Categorical or temporal fields, each containing:
     - `"label"`: A descriptive label.
     - `"column"`: The corresponding column name.
   - `"rowLimit"`: Maximum rows to include (default: 0 for unlimited).
   - `"filters"`: Array of adhoc filters applied to the data.
   - `"legend"`: Object defining the legend with:
     - `"label"`: Legend description.
     - `"column"`: Column for the legend grouping.

4. **Output Format:**
   - Provide the configuration as a **JSON object**, starting directly with the object and omitting any code blocks or additional formatting.
   - Example:
     ```
     {
       "vizType": "line",
       "title": "Sales by Product",
       "metrics": [
         {
           "label": "Global Sale",
           "column": "global_sales",
           "aggregation": "sum",
           "prefix": "$",
           "suffix": "M",
           "chartType": null
         }
       ],
       "dimensions": [
         {
           "label": "Year",
           "column": "year"
         }
       ],
       "rowLimit": 10000,
       "filters": [],
       "legend": {
         "label": "Genre",
         "column": "genre"
       }
     }
     ```

5. **Metrics and Dimensions:**
   - Ensure all metrics and dimensions align with fields present in the dataset.
   - Use the aggregation method, prefix, and suffix provided in the query or default to the dataset context.

6. **Output Consistency:**
   - Ensure logical and descriptive field values, making the chart intuitive and meaningful.
   - Avoid unnecessary text, explanations, or formatting outside the JSON structure.

"""


# USER_PROMPT = """
# To create a chart visualization, please provide the following required information:

# - Data Source Selection:
#    - Choose between database or file-based visualization

# - For Database:
#    - Specify the database name
#    - Indicate the schema name
#    - List the tables you want to analyze

# - For File:
#    - Select from your uploaded files (CSV/Excel)
#    - Or upload a new file:
#      * Supported formats: CSV (.csv) or Excel (.xlsx, .xls)
#      * File size limit: 20MB
#      * Ensure your data is properly formatted with headers

# - Data Information:
#    - Specify the columns you want to visualize
#    - Indicate any data filters or conditions
#    - Define the time period if applicable

# Please provide these details so I can help you create an appropriate chart visualization that best represents your data.
# """

USER_PROMPT = """
To create a chart visualization, please provide the following required information:

- Data Source Selection:
   - file-based visualization

- For File:
   - Select from your uploaded files (CSV/Excel)
   - Or upload a new file:
     * Supported formats: CSV (.csv) or Excel (.xlsx, .xls)
     * File size limit: 20MB
     * Ensure your data is properly formatted with headers
   
- Data Information:
   - Specify the columns you want to visualize
   - Indicate any data filters or conditions
   - Define the time period if applicable

Please provide these details so I can help you create an appropriate chart visualization that best represents your data.
"""


class ChartAgent(BaseAgent):
    def __init__(self, data: AIFlowSchema):
        self._data = data.model_copy()

        super().__init__(
            name="Chart Agent",
            system_prompt=SYSTEM_PROMPT,
            conversation_id=self._data.conversation_id,
            message_id=self._data.message_id,
        )

    async def execute(
        self, user_prompt: str, messages: List[Dict[str, str]] = []
    ) -> Dict[str, str]:
        try:
            user_prompt = user_prompt.strip()
            if self._data.datasource is None or (
                self._data.datasource.database is None
                and self._data.datasource.file is None
            ):
                user_prompt = USER_PROMPT

                completion = await self.completion(user_prompt)

                return {
                    "response": completion,
                    "status": "complete",
                    "error": completion,
                }

            else:
                completion = await self.completion(user_prompt, messages)

                chart_data = await self.tool_execute(
                    user_prompt=user_prompt, assistant_content=completion
                )

                viz_id = chart_data.model_copy().id

                if not viz_id:
                    raise ValueError("Missing visualization ID")

                embed_iframe = f'<iframe src="http://localhost:3000/embedded/chart/{viz_id}/" frameBorder="0"></iframe>'
                # return chart_data
                return {
                    "response": completion,
                    "status": "complete",
                    "error": completion,
                    "tool_response": chart_data,
                    "embed_iframe": embed_iframe,
                }

        except Exception as e:
            logger.error(f"Error executing Chart Agent: {e}")
            return {"error": str(e)}

    async def tool_execute(
        self, user_prompt: str = None, assistant_content: str = None
    ) -> Optional[ChatVisualizationResponseSchema]:
        form_data = json.loads(assistant_content)
        viz = VisualizationGeneration(
            datasource=self._convert_chat_datasource_to_chart_datasource(
                self._data.datasource
            ),
            form_data=ChartFormData.model_validate(form_data),
            message_id=self._data.message_id,
        )

        await viz.generate_echarts_config()
        await viz.save_result()

        result = await viz.get_chart_response()

        return result

    def _convert_chat_datasource_to_chart_datasource(
        self,
        chat_datasource: ChatDatasourceSchema,
    ) -> DataSource:
        """Convert ChatDatasourceSchema to charts.DataSource"""
        if chat_datasource.data_type == DataType.FILE and chat_datasource.file:
            return DataSource(
                file=FileSource(
                    filename=chat_datasource.file.filename,
                    uuid_filename=chat_datasource.file.uuid_filename,
                    content_type=chat_datasource.file.content_type,
                )
            )
        elif (
            chat_datasource.data_type == DataType.DATABASE and chat_datasource.database
        ):
            return DataSource(
                database=DatabaseSource(
                    id=chat_datasource.database.database_id,
                    schema_name=chat_datasource.database.database_schema,
                    sql="",  # Add SQL if needed
                )
            )
        raise ValueError("Invalid datasource configuration")

    # async def tool_execute(
    #     self, user_prompt: str = None, assistant_content: str = None
    # ) -> Dict[str, str]:
    #     try:
    #         form_data = json.loads(assistant_content)
    #         payload = {
    #             "form_data": assistant_content,
    #             "database_id": self._data.database_id,
    #             "schema": self._data.schema_name,
    #             "organization_id": self._data.organization_id,
    #             "workspace_id": self._data.workspace_id,
    #         }
    #         response = requests.post(
    #             f"{AISER_API_HOST}/chat_to_chart/chart_generator/",
    #             json=payload,
    #         )
    #         response.raise_for_status()

    #         json_result = json.loads(response.text)
    #         result = json_result["result"]

    #         if result.get("errorMessage") is not None:
    #             return {
    #                 "response": result,
    #                 "status": "error",
    #                 "error": result.get("errorMessage"),
    #             }

    #         save_data = ChatToChartScheme(
    #             chat_message_id=self._message_id,
    #             title=form_data.get("title"),
    #             form_data=json.dumps(form_data, indent=4, ensure_ascii=False),
    #             result=json.dumps(result, indent=4, ensure_ascii=False),
    #             chart_type=form_data.get("viz_type"),
    #             user_content=user_prompt,
    #             assistant_content=json.dumps(form_data, indent=4, ensure_ascii=False),
    #         )

    #         saved = SaveChartCommand(data=save_data).run()

    #         embed_url = f"{AISER_HOST}embed/chart/{saved.id}/"

    #         embed_iframe = f'<iframe src="{embed_url}" width="100%" height="500px" frameBorder="0"></iframe>'

    #         return {
    #             "response": result,
    #             "chart": saved,
    #             "embed_url": embed_url,
    #             "embed_iframe": embed_iframe,
    #             "query_result": result.get("queriesResponse") or {},
    #             "status": (
    #                 "error" if result.get("errorMessage") is not None else "success"
    #             ),
    #             "error": result.get("errorMessage"),
    #         }
    #     except requests.RequestException as e:
    #         logger.error(f"RequestException: {e}")
    #         return {"error": str(e)}
    #     except Exception as e:
    #         logger.error(f"Exception: {e}")
    #         return {"error": str(e)}
