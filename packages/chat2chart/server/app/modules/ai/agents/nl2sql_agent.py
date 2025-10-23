"""
Enhanced NL2SQL Agent with Business Context

This agent provides production-grade natural language to SQL conversion
with business terminology, query optimization, and error correction.
"""

import json
import logging
import re
import time
from datetime import datetime
from typing import Any, Dict, List, Optional, Tuple
from uuid import UUID

import sqlparse
from langchain.agents import create_agent
from langchain_core.messages import HumanMessage, AIMessage, SystemMessage
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain_core.tools import BaseTool
from sqlalchemy import create_engine, text, inspect
from sqlalchemy.orm import sessionmaker
from sqlalchemy.exc import SQLAlchemyError

from app.modules.ai.services.litellm_service import LiteLLMService
from app.modules.chats.schemas import (
    AgentContextSchema,
    ReasoningStepSchema,
    ModelInfoSchema,
    TokenUsageSchema
)

logger = logging.getLogger(__name__)


class SQLValidationTool(BaseTool):
    """Tool for validating and correcting SQL queries."""
    
    def __init__(self, data_service, **kwargs):
        super().__init__(
            name="validate_sql",
            description="Validate SQL queries against database schema and fix common errors.",
            **kwargs
        )
        self.data_service = data_service
    
    def _run(self, sql_query: str, data_source_id: str) -> str:
        """Validate and correct SQL query."""
        try:
            # Parse SQL
            parsed = sqlparse.parse(sql_query)
            if not parsed:
                return "Invalid SQL syntax"
            
            # Get schema information
            schema_info = self.data_service.get_schema_info(data_source_id)
            if not schema_info:
                return "Could not retrieve schema information"
            
            # Validate against schema
            validation_result = self._validate_against_schema(sql_query, schema_info)
            
            if validation_result["valid"]:
                return f"SQL query is valid: {sql_query}"
            else:
                # Try to fix common errors
                fixed_query = self._fix_common_errors(sql_query, schema_info)
                return f"SQL validation issues found: {validation_result['errors']}\nFixed query: {fixed_query}"
            
        except Exception as e:
            logger.error(f"Error validating SQL: {e}")
            return f"SQL validation failed: {str(e)}"
    
    def _validate_against_schema(self, sql_query: str, schema_info: Dict) -> Dict[str, Any]:
        """Validate SQL query against database schema."""
        errors = []
        
        # Extract table names from query
        table_pattern = r'\bFROM\s+(\w+)\b|\bJOIN\s+(\w+)\b'
        tables = re.findall(table_pattern, sql_query, re.IGNORECASE)
        table_names = [t[0] or t[1] for t in tables]
        
        # Check if tables exist
        available_tables = list(schema_info.keys())
        for table in table_names:
            if table.lower() not in [t.lower() for t in available_tables]:
                errors.append(f"Table '{table}' does not exist")
        
        # Extract column names from query
        column_pattern = r'\bSELECT\s+(.*?)\s+FROM\b'
        column_match = re.search(column_pattern, sql_query, re.IGNORECASE | re.DOTALL)
        if column_match:
            columns_text = column_match.group(1)
            # Handle * case
            if '*' not in columns_text:
                column_names = [col.strip() for col in columns_text.split(',')]
                for table in table_names:
                    if table.lower() in [t.lower() for t in available_tables]:
                        table_schema = schema_info[table.lower()]
                        available_columns = [col['name'] for col in table_schema.get('columns', [])]
                        for col in column_names:
                            if col.lower() not in [c.lower() for c in available_columns]:
                                errors.append(f"Column '{col}' does not exist in table '{table}'")
        
        return {
            "valid": len(errors) == 0,
            "errors": errors
        }
    
    def _fix_common_errors(self, sql_query: str, schema_info: Dict) -> str:
        """Fix common SQL errors."""
        fixed_query = sql_query
        
        # Add LIMIT clause if missing and query could return many rows
        if 'LIMIT' not in sql_query.upper() and 'COUNT' not in sql_query.upper():
            fixed_query += " LIMIT 1000"
        
        # Fix common column name issues
        for table_name, table_info in schema_info.items():
            columns = [col['name'] for col in table_info.get('columns', [])]
            for col in columns:
                # Fix common misspellings
                if col.lower() in ['id', 'user_id', 'created_at', 'updated_at']:
                    pattern = rf'\b{col[:-3]}\b'  # Remove common suffixes
                    if re.search(pattern, fixed_query, re.IGNORECASE):
                        fixed_query = re.sub(pattern, col, fixed_query, flags=re.IGNORECASE)
        
        return fixed_query
    
    def _arun(self, sql_query: str, data_source_id: str) -> str:
        """Async version of SQL validation."""
        return self._run(sql_query, data_source_id)


class QueryOptimizationTool(BaseTool):
    """Tool for optimizing SQL queries."""
    
    def __init__(self, **kwargs):
        super().__init__(
            name="optimize_query",
            description="Optimize SQL queries for better performance and add safety limits.",
            **kwargs
        )
    
    def _run(self, sql_query: str) -> str:
        """Optimize SQL query."""
        try:
            optimized_query = sql_query
            
            # Add LIMIT clause for safety
            if 'LIMIT' not in sql_query.upper():
                optimized_query += " LIMIT 1000"
            
            # Optimize JOINs
            optimized_query = self._optimize_joins(optimized_query)
            
            # Optimize WHERE clauses
            optimized_query = self._optimize_where_clauses(optimized_query)
            
            # Add query explanation
            explanation = self._generate_explanation(optimized_query)
            
            return f"Optimized query:\n{optimized_query}\n\nExplanation:\n{explanation}"
            
        except Exception as e:
            logger.error(f"Error optimizing query: {e}")
            return f"Query optimization failed: {str(e)}"
    
    def _optimize_joins(self, sql_query: str) -> str:
        """Optimize JOIN clauses."""
        # This is a simplified optimization - in production, you'd use a proper query optimizer
        return sql_query
    
    def _optimize_where_clauses(self, sql_query: str) -> str:
        """Optimize WHERE clauses."""
        # This is a simplified optimization - in production, you'd use a proper query optimizer
        return sql_query
    
    def _generate_explanation(self, sql_query: str) -> str:
        """Generate explanation for the query."""
        explanations = []
        
        if 'JOIN' in sql_query.upper():
            explanations.append("This query uses JOINs to combine data from multiple tables")
        
        if 'GROUP BY' in sql_query.upper():
            explanations.append("This query groups data by specified columns")
        
        if 'ORDER BY' in sql_query.upper():
            explanations.append("This query sorts results by specified columns")
        
        if 'LIMIT' in sql_query.upper():
            explanations.append("This query limits results to prevent large data sets")
        
        return "; ".join(explanations) if explanations else "This is a simple SELECT query"
    
    def _arun(self, sql_query: str) -> str:
        """Async version of query optimization."""
        return self._run(sql_query)


class EnhancedNL2SQLAgent:
    """
    Enhanced NL2SQL Agent with business context and optimization.
    
    This agent converts natural language queries to SQL with:
    - Business terminology understanding
    - Query optimization
    - Error correction
    - Schema validation
    """
    
    def __init__(
        self,
        litellm_service: LiteLLMService,
        data_service,
        session_factory: sessionmaker
    ):
        self.litellm_service = litellm_service
        self.data_service = data_service
        self.session_factory = session_factory
        
        # Initialize tools
        self.tools = self._initialize_tools()
        
        # Initialize agent
        self.agent = self._initialize_agent()
    
    def _initialize_tools(self) -> List[BaseTool]:
        """Initialize tools for NL2SQL agent."""
        tools = []
        
        if self.data_service:
            tools.append(SQLValidationTool(self.data_service))
        
        tools.append(QueryOptimizationTool())
        
        return tools
    
    def _initialize_agent(self):
        """Initialize the NL2SQL agent."""
        prompt = ChatPromptTemplate.from_messages([
            ("system", """You are an expert SQL analyst. Your job is to convert natural language queries to SQL.

Guidelines:
1. Always validate SQL against the database schema
2. Add appropriate LIMIT clauses for safety
3. Use proper JOINs when multiple tables are needed
4. Optimize queries for performance
5. Explain your reasoning
6. Ask clarifying questions if the query is ambiguous

Available tools:
- validate_sql: Validate SQL against database schema
- optimize_query: Optimize SQL for performance

Always use these tools to ensure your SQL is correct and optimized."""),
            MessagesPlaceholder(variable_name="chat_history"),
            ("human", "{input}"),
            MessagesPlaceholder(variable_name="agent_scratchpad")
        ])
        
        llm = self.litellm_service.get_llm()
        agent = create_agent(llm, self.tools, prompt)
        
        return agent
    
    async def generate_sql(
        self,
        natural_language_query: str,
        data_source_id: str,
        context: AgentContextSchema,
        conversation_history: Optional[List[Tuple[str, str]]] = None
    ) -> Dict[str, Any]:
        """
        Generate SQL from natural language query.
        
        Args:
            natural_language_query: User's natural language query
            data_source_id: Target data source ID
            context: User context with permissions and data sources
            conversation_history: Previous conversation messages
            
        Returns:
            Generated SQL with metadata
        """
        start_time = time.time()
        reasoning_steps = []
        
        try:
            # Step 1: Analyze query intent
            intent_step = ReasoningStepSchema(
                step_id="intent_analysis",
                step_type="intent_analysis",
                description="Analyzing user intent and query requirements",
                confidence=0.8
            )
            reasoning_steps.append(intent_step)
            
            # Step 2: Get schema information
            schema_step = ReasoningStepSchema(
                step_id="schema_retrieval",
                step_type="schema_retrieval",
                description="Retrieving database schema information",
                confidence=0.9
            )
            reasoning_steps.append(schema_step)
            
            schema_info = self.data_service.get_schema_info(data_source_id)
            if not schema_info:
                raise ValueError("Could not retrieve schema information")
            
            # Step 3: Generate SQL using agent
            sql_generation_step = ReasoningStepSchema(
                step_id="sql_generation",
                step_type="sql_generation",
                description="Generating SQL query using LangChain agent",
                confidence=0.7
            )
            reasoning_steps.append(sql_generation_step)
            
            # Prepare input for agent
            agent_input = {
                "input": f"""
Natural language query: {natural_language_query}
Data source: {data_source_id}
Schema information: {json.dumps(schema_info, indent=2)}
User context: {context.dict()}

Please generate an optimized SQL query for this request.
""",
                "chat_history": conversation_history or []
            }
            
            # Execute agent
            result = await self.agent.ainvoke(agent_input)
            
            # Extract SQL from result
            sql_query = self._extract_sql_from_result(result.get("output", ""))
            
            # Step 4: Validate and optimize SQL
            validation_step = ReasoningStepSchema(
                step_id="sql_validation",
                step_type="sql_validation",
                description="Validating and optimizing generated SQL",
                confidence=0.8
            )
            reasoning_steps.append(validation_step)
            
            # Validate SQL
            validation_result = self._validate_sql(sql_query, data_source_id)
            
            # Step 5: Generate explanation
            explanation_step = ReasoningStepSchema(
                step_id="explanation_generation",
                step_type="explanation_generation",
                description="Generating business explanation for SQL query",
                confidence=0.7
            )
            reasoning_steps.append(explanation_step)
            
            explanation = self._generate_business_explanation(sql_query, natural_language_query)
            
            # Calculate execution time
            execution_time = int((time.time() - start_time) * 1000)
            
            return {
                "sql_query": sql_query,
                "explanation": explanation,
                "validation_result": validation_result,
                "reasoning_steps": [step.dict() for step in reasoning_steps],
                "execution_time_ms": execution_time,
                "success": True
            }
            
        except Exception as e:
            logger.error(f"Error generating SQL: {e}")
            
            # Fallback to simple SQL generation
            fallback_sql = await self._fallback_sql_generation(natural_language_query, data_source_id)
            
            return {
                "sql_query": fallback_sql,
                "explanation": "Generated using fallback method due to error",
                "validation_result": {"valid": False, "errors": [str(e)]},
                "reasoning_steps": [step.dict() for step in reasoning_steps],
                "execution_time_ms": int((time.time() - start_time) * 1000),
                "success": False,
                "error": str(e)
            }
    
    def _extract_sql_from_result(self, result_text: str) -> str:
        """Extract SQL query from agent result."""
        # Look for SQL in code blocks
        sql_pattern = r'```sql\s*(.*?)\s*```'
        match = re.search(sql_pattern, result_text, re.DOTALL | re.IGNORECASE)
        if match:
            return match.group(1).strip()
        
        # Look for SQL after "SELECT"
        select_pattern = r'(SELECT\s+.*?)(?:\n\n|\Z)'
        match = re.search(select_pattern, result_text, re.DOTALL | re.IGNORECASE)
        if match:
            return match.group(1).strip()
        
        # Return the whole result if no SQL pattern found
        return result_text.strip()
    
    def _validate_sql(self, sql_query: str, data_source_id: str) -> Dict[str, Any]:
        """Validate SQL query."""
        try:
            # Use validation tool
            validation_tool = SQLValidationTool(self.data_service)
            validation_result = validation_tool._run(sql_query, data_source_id)
            
            return {
                "valid": "SQL query is valid" in validation_result,
                "message": validation_result
            }
            
        except Exception as e:
            return {
                "valid": False,
                "message": f"Validation error: {str(e)}"
            }
    
    def _generate_business_explanation(self, sql_query: str, natural_language_query: str) -> str:
        """Generate business explanation for SQL query."""
        try:
            # Simple explanation based on query structure
            explanations = []
            
            if 'SELECT' in sql_query.upper():
                explanations.append("This query retrieves data from the database")
            
            if 'FROM' in sql_query.upper():
                # Extract table names
                table_pattern = r'\bFROM\s+(\w+)\b'
                tables = re.findall(table_pattern, sql_query, re.IGNORECASE)
                if tables:
                    explanations.append(f"Data is retrieved from: {', '.join(tables)}")
            
            if 'WHERE' in sql_query.upper():
                explanations.append("The query filters data based on specific conditions")
            
            if 'GROUP BY' in sql_query.upper():
                explanations.append("Data is grouped and aggregated")
            
            if 'ORDER BY' in sql_query.upper():
                explanations.append("Results are sorted in a specific order")
            
            if 'LIMIT' in sql_query.upper():
                explanations.append("Results are limited to prevent large data sets")
            
            return "; ".join(explanations) if explanations else "This query retrieves data from the database"
            
        except Exception as e:
            logger.error(f"Error generating explanation: {e}")
            return "This query retrieves data from the database"
    
    async def _fallback_sql_generation(
        self,
        natural_language_query: str,
        data_source_id: str
    ) -> str:
        """Fallback SQL generation using simple patterns."""
        try:
            # Simple pattern-based SQL generation
            query_lower = natural_language_query.lower()
            
            if 'count' in query_lower:
                return f"SELECT COUNT(*) FROM table_name WHERE condition"
            elif 'sum' in query_lower or 'total' in query_lower:
                return f"SELECT SUM(column_name) FROM table_name WHERE condition"
            elif 'average' in query_lower or 'avg' in query_lower:
                return f"SELECT AVG(column_name) FROM table_name WHERE condition"
            else:
                return f"SELECT * FROM table_name WHERE condition LIMIT 100"
            
        except Exception as e:
            logger.error(f"Fallback SQL generation failed: {e}")
            return "SELECT * FROM table_name LIMIT 100"
    
    async def execute_query(
        self, 
        sql_query: str, 
        data_source_id: str,
        context: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """Execute SQL query against real data source (zero data-copy)"""
        try:
            logger.info(f"🔍 Executing SQL query: {sql_query[:100]}...")
            
            # Get data source connection details
            data_source = await self._get_data_source(data_source_id)
            if not data_source:
                return {
                    "success": False,
                    "error": f"Data source {data_source_id} not found"
                }
            
            # Execute query using real-time connection (zero data-copy)
            # This connects directly to the user's database/warehouse without copying data
            result = await self.data_service.execute_query(
                sql_query=sql_query,
                data_source_id=data_source_id,
                use_cache=True  # Only cache metadata, not actual data
            )
            
            if result.get("success"):
                logger.info(f"✅ Query executed successfully: {result.get('row_count', 0)} rows")
                return {
                    "success": True,
                    "data": result.get("data", []),
                    "columns": result.get("columns", []),
                    "row_count": result.get("row_count", 0),
                    "execution_time": result.get("execution_time", 0),
                    "query": sql_query,
                    "data_source": {
                        "id": data_source_id,
                        "type": data_source.get("type"),
                        "name": data_source.get("name"),
                        "connection_type": "real_time",  # Zero data-copy indicator
                        "zero_copy": True
                    }
                }
            else:
                logger.error(f"❌ Query execution failed: {result.get('error')}")
                return {
                    "success": False,
                    "error": result.get("error", "Query execution failed"),
                    "query": sql_query
                }
                
        except Exception as e:
            logger.error(f"❌ SQL execution error: {str(e)}")
            return {
                "success": False,
                "error": str(e),
                "query": sql_query
            }
    
    async def _get_data_source(self, data_source_id: str) -> Optional[Dict[str, Any]]:
        """Get data source details from the data service."""
        try:
            if not self.data_service:
                return None
            
            # Get data source metadata (not the actual data)
            data_source = await self.data_service.get_data_source(data_source_id)
            return data_source
        except Exception as e:
            logger.error(f"Error getting data source {data_source_id}: {e}")
            return None