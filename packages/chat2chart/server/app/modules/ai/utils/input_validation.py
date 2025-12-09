"""
Input Validation Utilities for AI Agents

Provides utilities for validating and sanitizing agent inputs using Pydantic models.
"""

import logging
from typing import TypeVar, Optional, Dict, Any, List
from pydantic import BaseModel, ValidationError
from app.modules.ai.schemas.agent_inputs import (
    ChartGenerationInput,
    InsightsGenerationInput,
    SQLGenerationInput,
    QueryExecutionInput,
    UnifiedChartInsightsInput,
    AgentContextInput
)

logger = logging.getLogger(__name__)

T = TypeVar('T', bound=BaseModel)


class InputValidator:
    """
    Validator for agent inputs using Pydantic models.
    
    Ensures:
    - Type safety
    - Required fields present
    - Data sanitization
    - Security validation
    """
    
    @staticmethod
    def validate_chart_input(
        data: List[Dict[str, Any]],
        query_intent: str,
        title: str = "",
        context: Optional[Dict[str, Any]] = None,
        **kwargs
    ) -> tuple[Optional[ChartGenerationInput], Optional[Dict[str, Any]]]:
        """Validate chart generation input."""
        try:
            validated = ChartGenerationInput(
                data=data,
                query_intent=query_intent,
                title=title,
                context=context,
                **kwargs
            )
            logger.debug("✅ Chart generation input validated successfully")
            return validated, None
        except ValidationError as e:
            logger.warning(f"⚠️ Chart generation input validation failed: {e}")
            error_info = {
                "error_type": "validation_error",
                "errors": e.errors(),
                "input_data": {
                    "data_rows": len(data) if data else 0,
                    "query_intent_length": len(query_intent) if query_intent else 0,
                    "title": title[:50] if title else ""
                }
            }
            return None, error_info
        except Exception as e:
            logger.error(f"❌ Unexpected error validating chart input: {e}", exc_info=True)
            return None, {"error_type": "unexpected_error", "error": str(e)}
    
    @staticmethod
    def validate_insights_input(
        data: List[Dict[str, Any]],
        query_context: str,
        user_role: str = "employee",
        context: Optional[Dict[str, Any]] = None,
        **kwargs
    ) -> tuple[Optional[InsightsGenerationInput], Optional[Dict[str, Any]]]:
        """Validate insights generation input."""
        try:
            validated = InsightsGenerationInput(
                data=data,
                query_context=query_context,
                user_role=user_role,
                context=context,
                **kwargs
            )
            logger.debug("✅ Insights generation input validated successfully")
            return validated, None
        except ValidationError as e:
            logger.warning(f"⚠️ Insights generation input validation failed: {e}")
            return None, {"error_type": "validation_error", "errors": e.errors()}
        except Exception as e:
            logger.error(f"❌ Unexpected error validating insights input: {e}", exc_info=True)
            return None, {"error_type": "unexpected_error", "error": str(e)}
    
    @staticmethod
    def validate_sql_input(
        natural_language_query: str,
        data_source_id: str,
        schema_info: Optional[Dict[str, Any]] = None,
        context: Optional[Dict[str, Any]] = None,
        **kwargs
    ) -> tuple[Optional[SQLGenerationInput], Optional[Dict[str, Any]]]:
        """Validate SQL generation input."""
        try:
            validated = SQLGenerationInput(
                natural_language_query=natural_language_query,
                data_source_id=data_source_id,
                schema_info=schema_info,
                context=context,
                **kwargs
            )
            logger.debug("✅ SQL generation input validated successfully")
            return validated, None
        except ValidationError as e:
            logger.warning(f"⚠️ SQL generation input validation failed: {e}")
            return None, {"error_type": "validation_error", "errors": e.errors()}
        except Exception as e:
            logger.error(f"❌ Unexpected error validating SQL input: {e}", exc_info=True)
            return None, {"error_type": "unexpected_error", "error": str(e)}
    
    @staticmethod
    def validate_query_execution_input(
        sql_query: str,
        data_source_id: str,
        timeout_seconds: int = 30,
        max_rows: int = 1000,
        **kwargs
    ) -> tuple[Optional[QueryExecutionInput], Optional[Dict[str, Any]]]:
        """Validate query execution input."""
        try:
            validated = QueryExecutionInput(
                sql_query=sql_query,
                data_source_id=data_source_id,
                timeout_seconds=timeout_seconds,
                max_rows=max_rows,
                **kwargs
            )
            logger.debug("✅ Query execution input validated successfully")
            return validated, None
        except ValidationError as e:
            logger.warning(f"⚠️ Query execution input validation failed: {e}")
            return None, {"error_type": "validation_error", "errors": e.errors()}
        except Exception as e:
            logger.error(f"❌ Unexpected error validating query execution input: {e}", exc_info=True)
            return None, {"error_type": "unexpected_error", "error": str(e)}
    
    @staticmethod
    def validate_unified_input(
        data: List[Dict[str, Any]],
        query_intent: str,
        title: str = "",
        context: Optional[Dict[str, Any]] = None,
        **kwargs
    ) -> tuple[Optional[UnifiedChartInsightsInput], Optional[Dict[str, Any]]]:
        """Validate unified chart+insights input."""
        try:
            validated = UnifiedChartInsightsInput(
                data=data,
                query_intent=query_intent,
                title=title,
                context=context,
                **kwargs
            )
            logger.debug("✅ Unified input validated successfully")
            return validated, None
        except ValidationError as e:
            logger.warning(f"⚠️ Unified input validation failed: {e}")
            return None, {"error_type": "validation_error", "errors": e.errors()}
        except Exception as e:
            logger.error(f"❌ Unexpected error validating unified input: {e}", exc_info=True)
            return None, {"error_type": "unexpected_error", "error": str(e)}
    
    @staticmethod
    def validate_agent_context(
        user_id: str,
        user_role: str,
        organization_id: str,
        **kwargs
    ) -> tuple[Optional[AgentContextInput], Optional[Dict[str, Any]]]:
        """Validate agent context input."""
        try:
            validated = AgentContextInput(
                user_id=user_id,
                user_role=user_role,
                organization_id=organization_id,
                **kwargs
            )
            logger.debug("✅ Agent context validated successfully")
            return validated, None
        except ValidationError as e:
            logger.warning(f"⚠️ Agent context validation failed: {e}")
            return None, {"error_type": "validation_error", "errors": e.errors()}
        except Exception as e:
            logger.error(f"❌ Unexpected error validating agent context: {e}", exc_info=True)
            return None, {"error_type": "unexpected_error", "error": str(e)}


def validate_input(
    input_type: str,
    **kwargs
) -> tuple[Optional[BaseModel], Optional[Dict[str, Any]]]:
    """
    Generic input validation function.
    
    Args:
        input_type: Type of input ('chart', 'insights', 'sql', 'query_execution', 'unified', 'context')
        **kwargs: Input parameters
        
    Returns:
        Tuple of (validated_input, error_info)
    """
    validator = InputValidator()
    
    if input_type == 'chart':
        return validator.validate_chart_input(**kwargs)
    elif input_type == 'insights':
        return validator.validate_insights_input(**kwargs)
    elif input_type == 'sql':
        return validator.validate_sql_input(**kwargs)
    elif input_type == 'query_execution':
        return validator.validate_query_execution_input(**kwargs)
    elif input_type == 'unified':
        return validator.validate_unified_input(**kwargs)
    elif input_type == 'context':
        return validator.validate_agent_context(**kwargs)
    else:
        return None, {"error_type": "unknown_input_type", "error": f"Unknown input type: {input_type}"}

