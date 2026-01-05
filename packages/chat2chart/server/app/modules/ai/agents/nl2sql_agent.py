"""
Enhanced NL2SQL Agent with Business Context

This agent provides production-grade natural language to SQL conversion
with business terminology, query optimization, and error correction.
"""

import json
import logging
import re
import time
from typing import Any, Dict, List, Optional, Tuple

import sqlparse
import importlib
try:
    import sqlglot
    _HAS_SQLGLOT = True
except Exception:
    _HAS_SQLGLOT = False

# Import schema cache for performance
try:
    from app.modules.ai.utils.schema_cache import global_schema_cache
except ImportError:
    global_schema_cache = None

# Try direct imports first (preferred method)
try:
    from langchain.agents import AgentExecutor, create_tool_calling_agent
    from langchain_core.messages import HumanMessage, AIMessage, SystemMessage
    from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
    from langchain_core.tools import BaseTool
    _LANGCHAIN_AVAILABLE = True
except ImportError:
    # Fallback to dynamic imports if direct imports fail
    _LANGCHAIN_AVAILABLE = False
    try:
        _langchain_agents = importlib.import_module('langchain.agents')
        AgentExecutor = getattr(_langchain_agents, 'AgentExecutor', None)
        create_tool_calling_agent = getattr(_langchain_agents, 'create_tool_calling_agent', None)

        _langchain_messages = importlib.import_module('langchain_core.messages')
        HumanMessage = getattr(_langchain_messages, 'HumanMessage', dict)
        AIMessage = getattr(_langchain_messages, 'AIMessage', dict)
        SystemMessage = getattr(_langchain_messages, 'SystemMessage', dict)

        _langchain_prompts = importlib.import_module('langchain_core.prompts')
        ChatPromptTemplate = getattr(_langchain_prompts, 'ChatPromptTemplate', None)
        MessagesPlaceholder = getattr(_langchain_prompts, 'MessagesPlaceholder', None)

        _langchain_tools = importlib.import_module('langchain_core.tools')
        BaseTool = getattr(_langchain_tools, 'BaseTool', None)
        _LANGCHAIN_AVAILABLE = True
    except Exception:
        AgentExecutor = create_tool_calling_agent = None  # type: ignore
        HumanMessage = AIMessage = SystemMessage = dict  # type: ignore
        class _StubChatPromptTemplate:
            @classmethod
            def from_messages(cls, *args, **kwargs):
                return cls()

            def format(self, *args, **kwargs):
                return ""

        class _StubMessagesPlaceholder:
            pass

        class _StubBaseTool:
            pass

        ChatPromptTemplate = _StubChatPromptTemplate  # type: ignore
        MessagesPlaceholder = _StubMessagesPlaceholder  # type: ignore
        BaseTool = _StubBaseTool  # type: ignore

try:
    _sqlalchemy_ext_asyncio = importlib.import_module('sqlalchemy.ext.asyncio')
    create_async_engine = getattr(_sqlalchemy_ext_asyncio, 'create_async_engine', None)
    AsyncSession = getattr(_sqlalchemy_ext_asyncio, 'AsyncSession', None)
    _sqlalchemy_future = importlib.import_module('sqlalchemy.future')
    select = getattr(_sqlalchemy_future, 'select', None)
    _sqlalchemy_exc = importlib.import_module('sqlalchemy.exc')
    SQLAlchemyError = getattr(_sqlalchemy_exc, 'SQLAlchemyError', Exception)
except Exception:
    create_async_engine = AsyncSession = select = SQLAlchemyError = Any  # type: ignore

from app.modules.chats.schemas import (
    AgentContextSchema,
    ReasoningStepSchema
)  # noqa: E402

from app.modules.ai.services.litellm_service import LiteLLMService  # noqa: E402

logger = logging.getLogger(__name__)

# Log LangChain availability status after logger is defined
if not _LANGCHAIN_AVAILABLE:
    logger.warning(
        "⚠️ LangChain dependencies not available for NL2SQLAgent. Agent will use fallback mode."
    )
else:
    logger.debug("✅ LangChain components available for NL2SQLAgent")


class SQLValidationTool(BaseTool):
    """Tool for validating and correcting SQL queries."""
    
    name: str = "validate_sql"
    description: str = """Validate SQL queries against database schema and fix common errors.
    
    Use this tool to validate SQL queries before execution. Pass the SQL query and data source ID.
    
    Args:
        sql_query: The SQL query to validate (required)
        data_source_id: The ID of the data source to validate against. If not provided, will use the data source from context.
    
    Returns:
        Validation result with any errors or suggested fixes.
    """
    # Define async_session_factory as a class attribute with type annotation
    # Use Optional for clarity that it might be None
    async_session_factory: Optional[Any] = None
    _data_service: Any = None
    _data_source_id: Optional[str] = None  # Store data source ID for context
    
    def __init__(self, data_service: Any = None, async_session_factory: Any = None, data_source_id: Optional[str] = None, **kwargs):
        super().__init__(**kwargs)
        self._data_service = data_service
        self.async_session_factory = async_session_factory
        self._data_source_id = data_source_id  # Store for fallback
    
    def _run(self, sql_query: str, data_source_id: str) -> str:
        """Synchronous execution is not supported. Use _arun."""
        raise NotImplementedError("SQLValidationTool is asynchronous. Use _arun instead of _run")

    async def _arun(self, sql_query: Optional[str] = None, data_source_id: Optional[str] = None, **kwargs) -> str:
        """Validate and correct SQL query asynchronously.
        
        LangChain tools pass arguments as keyword arguments, so we need to handle both
        positional and keyword argument patterns.
        """
        try:
            # Handle both positional and keyword arguments
            # LangChain may pass as kwargs or the LLM may structure it differently
            if sql_query is None:
                sql_query = kwargs.get('sql_query') or kwargs.get('query') or ''
            if data_source_id is None:
                data_source_id = kwargs.get('data_source_id') or kwargs.get('data_source') or self._data_source_id or ''
            
            if not sql_query:
                return "SQL query is required for validation"
            
            # CRITICAL: Pre-validate SQL syntax for common issues before schema validation
            syntax_errors = self._validate_sql_syntax(sql_query)
            if syntax_errors:
                error_msg = f"SQL syntax validation failed: {', '.join(syntax_errors)}"
                logger.error(f"❌ {error_msg}. Query: {sql_query[:200]}")
                return error_msg
            
            if not data_source_id:
                # Try to get from stored context
                if self._data_source_id:
                    data_source_id = self._data_source_id
                    logger.info(f"Using stored data_source_id from tool context: {data_source_id}")
                else:
                    # Fallback: basic syntax validation without schema
                    logger.warning("No data_source_id provided to SQLValidationTool, attempting validation without schema")
                    parsed = sqlparse.parse(sql_query)
                    if not parsed:
                        return "Invalid SQL syntax"
                    return "SQL syntax appears valid (schema validation skipped - data_source_id not provided)"
            
            # Optionally transpile/normalize SQL for ClickHouse using sqlglot
            # Determine dialect from kwargs or schema_info
            dialect = None
            try:
                dialect = kwargs.get('dialect') or ''
            except Exception:
                dialect = ''
            # If schema info available, prefer its db_type
            try:
                schema_info = await self._get_schema_info(data_source_id)
                if isinstance(schema_info, dict):
                    dialect = dialect or schema_info.get('db_type') or schema_info.get('source_type') or ''
            except Exception:
                schema_info = {}

            # Normalize dialect names for sqlglot
            dialect_map = {
                'postgresql': 'postgres',
                'postgres': 'postgres',
                'pg': 'postgres',
                'clickhouse': 'clickhouse',
                'mysql': 'mysql',
                'snowflake': 'snowflake',
                'sqlite': 'sqlite'
            }
            dialect_normalized = dialect_map.get((dialect or '').lower(), '') if isinstance(dialect, str) else ''

            # Optionally transpile/normalize SQL for target dialect using sqlglot
            try:
                if _HAS_SQLGLOT and dialect_normalized:
                    # Try to parse/validate with sqlglot and also transpile if needed
                    try:
                        parsed = sqlglot.parse_one(sql_query, read=dialect_normalized)
                        # Optionally convert to dialect-specific SQL (normalize)
                        sql_query = parsed.to_sql(dialect=dialect_normalized)
                    except Exception:
                        # Try transpile as fallback
                        out = sqlglot.transpile(sql_query, read="ansi", write=dialect_normalized)
                        if out and isinstance(out, list):
                            sql_query = out[0]
            except Exception:
                # If sqlglot not available or fails, continue with original SQL
                pass

            # Parse SQL
            parsed = sqlparse.parse(sql_query)
            if not parsed:
                return "Invalid SQL syntax"
            
            # Get schema information for validation
            schema_info = await self._get_schema_info(data_source_id)
            if not schema_info:
                return "Unable to retrieve schema for validation."

            validation_result = self._validate_against_schema(sql_query, schema_info)
            if not validation_result["valid"]:
                # Attempt to fix common errors
                fixed_query = self._fix_common_errors(sql_query, schema_info)
                validation_result_after_fix = self._validate_against_schema(fixed_query, schema_info)
                if validation_result_after_fix["valid"]:
                    return f"SQL syntax is valid after corrections: {fixed_query}"
                else:
                    errors_str = ', '.join(validation_result_after_fix.get('errors', []))
                    return f"SQL validation failed: {errors_str}"
            
            return "SQL syntax is valid"
            
        except Exception as e:
            logger.error(f"Error validating SQL: {e}", exc_info=True)
            return f"SQL validation failed: {str(e)}"
    
    async def _get_schema_info(self, data_source_id: str) -> Dict[str, Any]:  # New async method
        """Retrieve schema information for a given data source asynchronously."""
        try:
            if not self._data_service:
                logger.warning("No data service available for schema retrieval")
                return {}
            
            # Use the data service to get schema
            schema_response = await self._data_service.get_source_schema(data_source_id)
            
            # Handle the response structure - get_source_schema returns a dict with 'schema' key
            if schema_response and isinstance(schema_response, dict):
                if schema_response.get('success') and 'schema' in schema_response:
                    # Extract the actual schema dict
                    schema = schema_response['schema']
                    if isinstance(schema, dict):
                        # Filter out metadata fields (source_name, source_type, etc.) and return only table schemas
                        # Schema should be a dict where keys are table names and values are table schemas
                        filtered_schema: Dict[str, Any] = {}
                        for key, value in schema.items():
                            # Skip metadata fields that are strings
                            if isinstance(value, dict) and 'columns' in value:
                                filtered_schema[key] = value
                            elif isinstance(value, dict):
                                # Might be a nested structure, check if it has table-like structure
                                filtered_schema[key] = value
                        return filtered_schema if filtered_schema else schema
                    elif isinstance(schema, str):
                        try:
                            parsed = json.loads(schema)
                            return parsed if isinstance(parsed, dict) else {}
                        except json.JSONDecodeError:
                            return {}
                else:
                    # Return the schema_response itself if it's already in the right format
                    return schema_response
            elif schema_response and isinstance(schema_response, str):
                try:
                    return json.loads(schema_response)
                except json.JSONDecodeError:
                    return {}
            else:
                return {}
                
        except Exception as e:
            logger.error(f"Error retrieving schema info for {data_source_id}: {e}", exc_info=True)
            return {}

    def _validate_sql_syntax(self, sql_query: str) -> List[str]:
        """
        Validate basic SQL syntax before schema validation.
        Checks for:
        - Unbalanced quotes (single and double)
        - Unbalanced parentheses
        - Incomplete statements
        - Truncated queries
        """
        errors = []
        
        if not sql_query or not isinstance(sql_query, str):
            return ["SQL query is missing or invalid"]
        
        sql_query = sql_query.strip()
        
        # Check for unbalanced single quotes
        single_quote_count = sql_query.count("'")
        if single_quote_count % 2 != 0:
            errors.append("Unbalanced single quotes detected")
            logger.warning(f"Unbalanced single quotes in SQL: {sql_query[:200]}")
        
        # Check for unbalanced double quotes
        double_quote_count = sql_query.count('"')
        if double_quote_count % 2 != 0:
            errors.append("Unbalanced double quotes detected")
            logger.warning(f"Unbalanced double quotes in SQL: {sql_query[:200]}")
        
        # Check for unbalanced parentheses
        open_parens = sql_query.count('(')
        close_parens = sql_query.count(')')
        if open_parens != close_parens:
            errors.append(f"Unbalanced parentheses (open: {open_parens}, close: {close_parens})")
            logger.warning(f"Unbalanced parentheses in SQL: {sql_query[:200]}")
        
        # Check for incomplete statements (missing FROM clause in SELECT)
        sql_upper = sql_query.upper().strip()
        if sql_upper.startswith('SELECT'):
            # Check if FROM clause exists
            if 'FROM' not in sql_upper:
                errors.append("SELECT statement missing FROM clause")
            else:
                # Check if query appears truncated after FROM
                from_index = sql_upper.find('FROM')
                after_from = sql_upper[from_index + 4:].strip()
                if not after_from or len(after_from) < 3:
                    errors.append("SELECT statement appears incomplete after FROM clause")
        
        # Check for unterminated string literals (common issue)
        # Look for patterns like 'text without closing quote
        import re
        # Pattern: single quote followed by text but no closing quote before end of query
        # This catches cases like: SELECT date_trunc('month)
        # CRITICAL: Exclude empty strings '' and properly quoted strings like 'value'
        # Match: 'text at end of string (unterminated)
        # Don't match: '' (empty string) or 'value' (properly quoted) or != '' (valid empty string check)
        # Look for single quote followed by non-quote characters that extend to end of query
        # But exclude if it's just '' (empty string pattern) or != '' (comparison with empty string)
        # Pattern: 'text' at the very end (unterminated), but not '' or != '' or = ''
        # Use negative lookbehind to exclude != '' and = '' patterns
        single_quote_pattern = r"(?<!!=)(?<!==)(?<!=\s)'[^']+$"
        if re.search(single_quote_pattern, sql_query):
            # Additional check: make sure it's not a valid empty string comparison
            # Check if the pattern is part of != '' or = '' or <> '' which are valid
            # Count quotes - if odd number of single quotes, might be unterminated
            quote_count = sql_query.count("'")
            # Empty string '' has 2 quotes, so even is usually fine
            # But if we have an odd number and the pattern matches, it's likely unterminated
            # Also check if it's part of a valid comparison operator
            is_valid_empty_check = bool(re.search(r'[!=<>]\s*\'$', sql_query))
            if quote_count % 2 != 0 and not is_valid_empty_check:
                errors.append("Unterminated string literal detected (missing closing quote)")
        
        # Check for incomplete function calls
        # Pattern: function_name( but no matching )
        function_call_pattern = r'\b\w+\s*\([^)]*$'
        if re.search(function_call_pattern, sql_query) and open_parens > close_parens:
            errors.append("Incomplete function call detected (missing closing parenthesis)")
        
        return errors
    
    def _validate_against_schema(self, sql_query: str, schema_info: Dict) -> Dict[str, Any]:
        """Validate SQL query against database schema."""
        errors = []
        
        # CRITICAL: Check if sql_query is None or empty
        if not sql_query or not isinstance(sql_query, str):
            logger.warning(f"SQL query is None or not a string (type: {type(sql_query)}), skipping validation")
            return {
                "valid": False,
                "errors": ["SQL query is missing or invalid"]
            }
        
        # Validate schema_info structure
        if not isinstance(schema_info, dict) or not schema_info:
            logger.warning("Schema info is empty or invalid, skipping validation")
            return {
                "valid": True,  # Don't fail validation if schema is unavailable
                "errors": ["Schema information not available for validation"]
            }
        
        # Extract table names from query - handle database.table format
        # Pattern: FROM database.table or FROM table, JOIN database.table or JOIN table
        table_pattern = r'\bFROM\s+(?:`?([\w]+)`?\.)?`?([\w]+)`?\b|\bJOIN\s+(?:`?([\w]+)`?\.)?`?([\w]+)`?\b'
        matches = re.findall(table_pattern, sql_query, re.IGNORECASE)
        table_names = []  # List of (database, table) tuples or (None, table) for unqualified
        for match in matches:
            # match is (db_from, table_from, db_join, table_join)
            if match[1]:  # FROM table
                table_names.append((match[0] if match[0] else None, match[1]))
            if match[3]:  # JOIN table
                table_names.append((match[2] if match[2] else None, match[3]))
        
        # Also try simpler pattern for table names without database prefix
        simple_pattern = r'\bFROM\s+`?([\w]+)`?\b|\bJOIN\s+`?([\w]+)`?\b'
        simple_matches = re.findall(simple_pattern, sql_query, re.IGNORECASE)
        for match in simple_matches:
            if match[0]:
                table_names.append((None, match[0]))
            if match[1]:
                table_names.append((None, match[1]))
        
        # Remove duplicates
        table_names = list(set(table_names))
        
        if not table_names:
            logger.warning("No table names extracted from query, skipping table validation")
            return {"valid": True, "errors": []}
        
        # Get available tables from schema - build normalized lookup
        available_tables_dict = {}  # {qualified_name: True, unqualified_name: True}
        available_tables_list = []  # For error messages
        
        # CRITICAL: Check if schema_info has a 'tables' array first (most common format)
        if 'tables' in schema_info and isinstance(schema_info['tables'], list):
            logger.info(f"📊 Found {len(schema_info['tables'])} tables in schema_info['tables'] array")
            for table_info in schema_info['tables']:
                if isinstance(table_info, dict):
                    table_name = table_info.get('name', '')
                    schema_name = table_info.get('schema', '')
                elif isinstance(table_info, str):
                    table_name = table_info
                    schema_name = ''
                else:
                    continue
                
                if table_name:
                    available_tables_list.append(table_name)
                    # Store both qualified and unqualified
                    available_tables_dict[table_name.lower()] = True
                    if schema_name and '.' not in table_name:
                        qualified = f"{schema_name}.{table_name}"
                        available_tables_dict[qualified.lower()] = True
                    elif '.' in table_name:
                        # Also store unqualified version
                        unqualified = table_name.split('.')[-1]
                        available_tables_dict[unqualified.lower()] = True
        
        # Also check dict format (keys are table names or schema names with nested tables)
        for key, value in schema_info.items():
            # Skip metadata fields that are not dicts
            if not isinstance(value, dict):
                continue
            
            # CRITICAL: Handle nested schema structure (e.g., 'aiser_warehouse': {tables: [...]})
            # If value has a 'tables' key, it's a schema container - extract tables from it
            if 'tables' in value and isinstance(value['tables'], list):
                logger.info(f"📊 Found nested schema '{key}' with {len(value['tables'])} tables")
                for table_info in value['tables']:
                    if isinstance(table_info, dict):
                        table_name = table_info.get('name', '')
                    elif isinstance(table_info, str):
                        table_name = table_info
                    else:
                        continue
                    
                    if table_name:
                        # Store as both qualified (schema.table) and unqualified
                        qualified_name = f"{key}.{table_name}" if key else table_name
                        available_tables_list.append(table_name)  # Unqualified
                        available_tables_list.append(qualified_name)  # Qualified
                        available_tables_dict[table_name.lower()] = True
                        available_tables_dict[qualified_name.lower()] = True
                continue  # Skip further processing for schema containers
            
            # CRITICAL: Check if this is a table (has columns) or just a schema name
            # Skip if it looks like a schema container without tables
            if 'columns' not in value and 'rowCount' not in value and 'engine' not in value:
                # This might be a schema name, not a table - skip it
                continue
            
            # This is a table - add it
            available_tables_list.append(key)
            # Store both qualified and unqualified
            available_tables_dict[key.lower()] = True
            if '.' in key:
                # Also store unqualified version
                unqualified = key.split('.')[-1]
                available_tables_dict[unqualified.lower()] = True
            else:
                # If we have schema info, also store qualified version
                schema_name = value.get('schema', '')
                if schema_name:
                    qualified = f"{schema_name}.{key}"
                    available_tables_dict[qualified.lower()] = True
        
        logger.info(f"📊 Available tables extracted: {available_tables_list}")
        logger.info(f"📊 Table lookup dict has {len(available_tables_dict)} entries")
        
        # Validate each table name
        for db_name, table_name in table_names:
            table_found = False
            
            # Build possible table identifiers to check
            identifiers_to_check = []
            
            if db_name and table_name:
                # Qualified name: database.table
                qualified = f"{db_name}.{table_name}"
                identifiers_to_check.append(qualified.lower())
                identifiers_to_check.append(table_name.lower())  # Also check unqualified
            else:
                # Unqualified name: just table
                identifiers_to_check.append(table_name.lower())
                # Also check if schema has qualified names with this table
                for available_table in available_tables_list:
                    if '.' in available_table:
                        db_part, table_part = available_table.rsplit('.', 1)
                        if table_part.lower() == table_name.lower():
                            identifiers_to_check.append(available_table.lower())
            
            # Check if any identifier matches
            for identifier in identifiers_to_check:
                if identifier in available_tables_dict:
                    table_found = True
                    logger.debug(f"✅ Table validation passed: '{db_name}.{table_name}' (checked as '{identifier}')")
                    break
            
            if not table_found:
                # More helpful error message
                query_table = f"{db_name}.{table_name}" if db_name else table_name
                # CRITICAL: Log schema_info structure for debugging
                logger.warning(f"Table '{query_table}' not found in schema. Available tables: {available_tables_list[:10]}")
                logger.warning(f"   Schema_info keys: {list(schema_info.keys())[:20] if isinstance(schema_info, dict) else 'not a dict'}")
                logger.warning(f"   Schema_info type: {type(schema_info)}")
                logger.warning(f"   Schema_info has 'tables': {'tables' in schema_info if isinstance(schema_info, dict) else False}")
                if isinstance(schema_info, dict) and 'tables' in schema_info:
                    logger.warning(f"   Tables array length: {len(schema_info['tables']) if isinstance(schema_info['tables'], list) else 'not a list'}")
                errors.append(f"Table '{query_table}' not found in schema. Available tables: {available_tables_list[:10]}")
        
        # CRITICAL: Don't fail validation if schema is empty - this might be a schema fetch issue
        # Let the query execute and let the database return the actual error
        if len(available_tables_list) == 0:
            logger.warning("⚠️ Schema has no tables - validation skipped (may be schema fetch issue)")
            return {
                "valid": True,  # Don't block execution - let database handle it
                "errors": ["Schema appears empty - validation skipped"]
            }
        
        # Extract column names from query (only if we have valid tables)
        if available_tables_list:
            column_pattern = r'\bSELECT\s+(.*?)\s+FROM\b'
            column_match = re.search(column_pattern, sql_query, re.IGNORECASE | re.DOTALL)
            if column_match:
                columns_text = column_match.group(1)
                # Handle * case
                if '*' not in columns_text:
                    column_names = [col.strip().split()[0] for col in columns_text.split(',')]  # Get first word (column name)
                    for db_name, table_name in table_names:
                        # Find matching table in schema
                        matching_table = None
                        query_table = f"{db_name}.{table_name}" if db_name else table_name
                        for available_table in available_tables_list:
                            # Check if this table matches (qualified or unqualified)
                            if query_table.lower() == available_table.lower():
                                matching_table = available_table
                                break
                            elif table_name.lower() == available_table.lower():
                                matching_table = available_table
                                break
                            elif '.' in available_table and table_name.lower() == available_table.split('.')[-1].lower():
                                matching_table = available_table
                                break
                        
                        if matching_table:
                            table_schema = schema_info.get(matching_table)
                            if isinstance(table_schema, dict):
                                available_columns = []
                                if 'columns' in table_schema:
                                    for col in table_schema['columns']:
                                        if isinstance(col, dict):
                                            available_columns.append(col.get('name', ''))
                                        elif isinstance(col, str):
                                            available_columns.append(col)
                                # Validate columns against schema
                                for col in column_names:
                                    col_clean = col.strip().split('.')[-1]  # Remove table prefix if present
                                    if available_columns and col_clean.lower() not in [c.lower() for c in available_columns if c]:
                                        logger.debug(f"Column '{col_clean}' not found in table '{matching_table}'")
                            else:
                                # Table schema is not a dict, skip column validation
                                logger.debug(f"Table '{matching_table}' schema is not a dict, skipping column validation")
        
        return {
            "valid": len(errors) == 0,
            "errors": errors
        }
    
    def _fix_common_errors(self, sql_query: str, schema_info: Dict) -> str:
        """Fix common SQL errors, including ClickHouse GROUP BY issues."""
        fixed_query = sql_query
        
        # CRITICAL: Check for severe corruption patterns - if found, reject immediately
        corruption_patterns = [
            r'(.{2,3})\1{5,}',  # Repeated 2-3 char patterns 5+ times (e.g., "ididididid")
            r'Select.*bucket.*aggregations',  # Instructions instead of SQL
            r'"detail":\s*"',  # JSON structure in SQL
            r'reasoning_steps.*sql_query',  # Reversed JSON fields
        ]
        
        is_severely_corrupted = any(re.search(pattern, fixed_query, re.IGNORECASE) for pattern in corruption_patterns)
        
        if is_severely_corrupted:
            logger.error(f"❌ SEVERE CORRUPTION DETECTED in SQL - rejecting: {fixed_query[:100]}")
            # Return original without attempting fix - this should trigger regeneration
            return sql_query
        
        # LIGHT SANITIZERS - only if not severely corrupted
        try:
            # Balance parentheses by appending missing closing parens if any
            open_parens = fixed_query.count('(')
            close_parens = fixed_query.count(')')
            if open_parens > close_parens:
                fixed_query = fixed_query + (')' * (open_parens - close_parens))
            elif close_parens > open_parens:
                # Remove excess trailing closing parens (best-effort)
                diff = close_parens - open_parens
                # Remove from end where possible
                fixed_query = re.sub(r'\){%d}$' % diff, '', fixed_query)
        except Exception:
            # If sanitization fails, continue with original fixed_query
            pass
        
        # CRITICAL: Fix ClickHouse GROUP BY issues - ensure expressions match exactly
        # Pattern: SELECT expression AS alias, ... GROUP BY alias (WRONG for ClickHouse)
        # Fix: Replace GROUP BY alias with the exact expression from SELECT
        if 'GROUP BY' in fixed_query.upper() and 'clickhouse' in str(schema_info.get('source_type', '')).lower():
            try:
                # Extract SELECT clause and GROUP BY clause
                select_match = re.search(r'SELECT\s+(.*?)\s+FROM', fixed_query, re.IGNORECASE | re.DOTALL)
                group_by_match = re.search(r'GROUP\s+BY\s+(.*?)(?:\s+ORDER\s+BY|\s+LIMIT|\s*$)', fixed_query, re.IGNORECASE | re.DOTALL)
                
                if select_match and group_by_match:
                    select_clause = select_match.group(1)
                    group_by_clause = group_by_match.group(1).strip()
                    
                    # Check if GROUP BY uses an alias that's defined in SELECT
                    # Pattern: expression AS alias
                    alias_pattern = r'(\w+(?:\([^)]+\))?)\s+AS\s+(\w+)'
                    select_aliases = {}
                    for match in re.finditer(alias_pattern, select_clause, re.IGNORECASE):
                        expression = match.group(1).strip()
                        alias = match.group(2).strip()
                        select_aliases[alias.lower()] = expression
                    
                    # If GROUP BY uses an alias, replace it with the expression
                    if group_by_clause.lower() in select_aliases:
                        expression = select_aliases[group_by_clause.lower()]
                        fixed_query = re.sub(
                            r'GROUP\s+BY\s+' + re.escape(group_by_clause),
                            f'GROUP BY {expression}',
                            fixed_query,
                            flags=re.IGNORECASE
                        )
                        logger.info(f"✅ Fixed ClickHouse GROUP BY: replaced alias '{group_by_clause}' with expression '{expression}'")
            except Exception as e:
                logger.debug(f"Could not auto-fix ClickHouse GROUP BY: {e}")
        
        # Add LIMIT clause if missing and query could return many rows
        if 'LIMIT' not in fixed_query.upper() and 'COUNT' not in fixed_query.upper():
            fixed_query += " LIMIT 1000"
        
        # Fix common column name issues
        # CRITICAL: schema_info structure is { 'tables': [...], 'type': '...', ... }
        if not isinstance(schema_info, dict):
            logger.warning(f"schema_info is not a dict: {type(schema_info)}, returning query as-is")
            return fixed_query
        
        # Get tables array from schema_info
        tables = schema_info.get('tables', [])
        if not isinstance(tables, list):
            # Fallback: maybe schema_info is in old format {table_name: {...}}
            tables = [{'name': k, **v} for k, v in schema_info.items() if isinstance(v, dict)]
        
        # Iterate over tables array
        for table_info in tables:
            if not isinstance(table_info, dict):
                continue
            
            table_name = table_info.get('name', '')
            
            # Safely get columns
            columns_data = table_info.get('columns', [])
            if not isinstance(columns_data, list):
                continue
            
            columns = []
            for col in columns_data:
                if isinstance(col, dict) and 'name' in col:
                    columns.append(col['name'])
                elif isinstance(col, str):
                    columns.append(col)
            
            for col in columns:
                # Fix common misspellings
                if col.lower() in ['id', 'user_id', 'created_at', 'updated_at']:
                    pattern = rf'\b{col[:-3]}\b'  # Remove common suffixes
                    if re.search(pattern, fixed_query, re.IGNORECASE):
                        fixed_query = re.sub(pattern, col, fixed_query, flags=re.IGNORECASE)
        
        return fixed_query
    
    def _transpile_sql_for_clickhouse(self, sql_query: str) -> str:
        """Attempt to use sqlglot to transpile SQL to ClickHouse dialect for better compatibility."""
        if not _HAS_SQLGLOT:
            return sql_query
        try:
            # Try to parse and convert to clickhouse SQL
            try:
                parsed = sqlglot.parse_one(sql_query)
                return parsed.to_sql(dialect="clickhouse")
            except Exception:
                # Fallback to transpile
                out = sqlglot.transpile(sql_query, read="ansi", write="clickhouse")
                if out and isinstance(out, list):
                    return out[0]
                return sql_query
        except Exception:
            return sql_query


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
    
    async def _arun(self, sql_query: str) -> str:
        """Async version of query optimization."""
        # Ensure we return a string, not a coroutine
        result = self._run(sql_query)
        return result if isinstance(result, str) else str(result)


class EnhancedNL2SQLAgent:
    """
    Enhanced NL2SQL Agent with business context and optimization.
    
    This agent converts natural language queries to SQL with:
    - Business terminology understanding
    - Query optimization
    - Error correction
    - Schema validation
    """
    
    # Type-hint for linter/static analysis
    litellm_service: Optional[LiteLLMService] = None
    
    def __init__(
        self,
        litellm_service: LiteLLMService,
        data_service,
        multi_query_service,
        async_session_factory: Any # Changed to async_session_factory
    ):
        object.__setattr__(self, 'litellm_service', litellm_service)
        self.data_service = data_service
        self.multi_query_service = multi_query_service
        self.async_session_factory = async_session_factory # Changed to async_session_factory
        
        # Initialize tools
        self.tools = self._initialize_tools()
        
        # Initialize agent
        self.agent = self._initialize_agent()
    
    def _initialize_tools(self, data_source_id: Optional[str] = None) -> List[BaseTool]:
        """Initialize tools for NL2SQL agent."""
        tools = []
        
        # DISABLED: All tools removed as they were causing JSON corruption
        # SQLValidationTool was embedding validation responses into SQL
        # QueryOptimizationTool was adding explanatory text that got included in JSON
        # Both were causing " FORMAT JSONEachRow" corruption in final SQL
        # Validation and optimization will be done separately in nodes instead
        
        return tools
    
    def _initialize_agent(self) -> Any:
        """Initialize the NL2SQL agent - using direct LiteLLM to avoid api_version issues"""
        # CRITICAL: Always use direct LiteLLM fallback to avoid LangChain api_version errors
        # AgentExecutor causes "AsyncCompletions.create() got an unexpected keyword argument 'api_version'"
        logger.info("✅ Using direct LiteLLM (bypassing AgentExecutor to avoid api_version error)")
        
        class _DirectLiteLLMAgent:
            """Direct LiteLLM agent - no LangChain, no api_version errors"""
            def __init__(self, litellm_service):
                self.litellm_service = litellm_service
            
            async def ainvoke(self, inputs: Dict[str, Any]) -> Dict[str, Any]:
                """Generate SQL directly using LiteLLM without LangChain"""
                query = inputs.get("input", "")
                schema_context = inputs.get("schema_context", "")
                chat_history = inputs.get("chat_history", [])
                
                # CRITICAL: Ultra-simplified prompt to force actual SQL generation
                system_prompt = """You are an SQL generator. Generate ONLY executable SQL code.

CRITICAL: The "sql_query" field MUST contain ACTUAL SQL like:
"SELECT count(id) FROM customers WHERE date > '2020-01-01'"

NOT instructions like:
"Select time bucket and aggregations" ❌

Return JSON:
{
  "sql_query": "ACTUAL SQL HERE",
  "dialect": "clickhouse",
  "explanation": "Brief text",
  "confidence": 0.9,
  "validation_result": {"valid": true, "message": "OK"},
  "success": true,
  "reasoning_steps": []
}"""
                
                user_prompt = f"""Query: {query}

{schema_context}

Generate SQL (NOT instructions). Return JSON with "sql_query" containing ACTUAL executable SQL code."""
                
                # Call LiteLLM directly
                result = await self.litellm_service.generate_completion(
                    prompt=user_prompt,
                    system_context=system_prompt,
                    max_tokens=1500,
                    temperature=0.2  # Increased from 0.05 for faster responses while maintaining accuracy
                )
                
                if result.get("success") and result.get("content"):
                    return {"output": result.get("content", "")}
                else:
                    return {"output": json.dumps({
                        "sql_query": None,
                        "error": result.get("error", "LLM call failed"),
                        "success": False
                    })}
        
        return _DirectLiteLLMAgent(self.litellm_service)
        
        prompt = ChatPromptTemplate.from_messages([
            ("system", """You are an expert SQL analyst specializing in enterprise data analysis. Your role is to convert natural language queries into optimized, production-ready SQL queries.

## CORE CAPABILITIES
- **Schema Understanding**: Map business terminology to database schemas and column names
- **Query Optimization**: Generate efficient SQL for large-scale enterprise datasets
- **Pattern Recognition**: Identify query intent (aggregations, filtering, grouping, time-series, joins)
- **Dialect Adaptation**: Generate SQL appropriate for the target database (ClickHouse, PostgreSQL, etc.)
- **Data Quality Awareness**: Handle missing values, inconsistent formats, and data quality issues

## GENERATION PRINCIPLES
1. **Schema-Driven**: Always use actual table and column names from provided schema information
2. **Performance-Conscious**: Optimize for large datasets (millions/billions of rows)
   - Use appropriate LIMIT clauses (default 1000, adjust based on complexity)
   - Leverage indexes and avoid full table scans
   - Consider query execution plans
3. **Robustness**: Handle edge cases gracefully
   - NULL value handling
   - Data type mismatches
   - Missing or inconsistent data
4. **Clarity**: Generate clean, readable SQL with proper formatting
5. **Validation**: Ensure SQL syntax correctness and semantic validity

## QUERY TYPES HANDLED
- **Aggregations**: SUM, AVG, COUNT, MAX, MIN with appropriate grouping
- **Time-Series**: Date/time grouping, period comparisons, trend analysis
- **Filtering**: WHERE clauses with various operators and conditions
- **Joins**: Multi-table queries with appropriate join types (INNER, LEFT, RIGHT)
- **Window Functions**: Advanced analytics when needed
- **Subqueries**: Complex nested queries when necessary

## OUTPUT REQUIREMENTS
Generate accurate, optimized SQL that:
- Uses real schema elements (tables, columns) from provided information
- Follows database dialect-specific syntax and functions
- Is production-ready and executable
- Handles enterprise data complexity appropriately"""),
            ("system", """
CRITICAL OUTPUT FORMAT RULES:
You MUST return ONLY a single valid JSON object with these EXACT fields:
- sql_query: A COMPLETE, EXECUTABLE SQL query (e.g., "SELECT column FROM table WHERE condition")
- dialect: Database type like "clickhouse" or "postgres"
- explanation: Brief 1-3 sentence business explanation
- confidence: Number between 0.0 and 1.0
- validation_result: Object with "valid": true/false and "message": string
- success: true if generation succeeded
- reasoning_steps: Array of step objects with "step": string and "detail": string

CRITICAL SQL GENERATION RULES:
1. The sql_query field MUST contain ACTUAL SQL CODE, not instructions or descriptions
2. Example of CORRECT sql_query: "SELECT customer_name, SUM(order_amount) FROM orders GROUP BY customer_name"
3. Example of WRONG sql_query: "Select PostgreSQL as the SQL dialect and provide guidance about date format"
4. The sql_query MUST be executable SQL that can run against a database
5. Use real table and column names from the schema provided
6. Write clean SQL with proper spacing between keywords
7. Use real newlines, not escaped sequences
8. Do NOT include corruption patterns
9. Do NOT wrap SQL in extra quotes
10. Do NOT include JSON artifacts in SQL
11. Do NOT include FORMAT clauses
12. Do NOT write instructions or guidance in the sql_query field

Return ONLY the JSON object, no other text. The sql_query field must contain actual SQL code.
"""),
            MessagesPlaceholder(variable_name="chat_history"),
            ("human", "{input}"),
            MessagesPlaceholder(variable_name="agent_scratchpad")
        ])
        
        llm = self.litellm_service.get_llm()
        agent = create_tool_calling_agent(llm, self.tools, prompt)
        
        # CRITICAL: Create custom callback handler to identify agent in logs
        from langchain_core.callbacks import BaseCallbackHandler
        
        class AgentIdentifierCallback(BaseCallbackHandler):
            def __init__(self, agent_name: str):
                super().__init__()
                self.agent_name = agent_name
            
            def on_chain_start(self, serialized: Dict[str, Any], inputs: Dict[str, Any], **kwargs) -> None:
                logger.info("🤖 [NL2SQL_AGENT] Entering AgentExecutor chain")
            
            def on_chain_end(self, outputs: Dict[str, Any], **kwargs) -> None:
                logger.info("✅ [NL2SQL_AGENT] Finished AgentExecutor chain")
        
        callback = AgentIdentifierCallback("nl2sql")
        agent_executor = AgentExecutor(
            agent=agent, 
            tools=self.tools, 
            verbose=True,
            callbacks=[callback]
        )
        
        return agent_executor
    
    async def generate_sql(
        self,
        natural_language_query: str,
        data_source_id: str,
        context: AgentContextSchema,
        conversation_history: Optional[List[Tuple[str, str]]] = None,
        schema_info: Optional[Dict[str, Any]] = None,
        current_sql: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Generate SQL from natural language query.
        
        Args:
            natural_language_query: User's natural language query
            data_source_id: Target data source ID
            context: User context with permissions and data sources
            conversation_history: Previous conversation messages
            schema_info: Optional pre-fetched schema information
            current_sql: Optional current SQL statement for context (query editor)
            
        Returns:
            Generated SQL with metadata
        """
        # CRITICAL: Validate input using Pydantic model
        try:
            from app.modules.ai.utils.input_validation import InputValidator
            validated_input, validation_error = InputValidator.validate_sql_input(
                natural_language_query=natural_language_query,
                data_source_id=data_source_id,
                schema_info=schema_info,
                context=context.model_dump() if context and hasattr(context, 'model_dump') else (context.dict() if context and hasattr(context, 'dict') else None),
                conversation_history=conversation_history
            )
            
            if validation_error:
                logger.warning(f"⚠️ SQL generation input validation failed: {validation_error}")
                # Security: If validation fails due to suspicious input, return error
                if "sql injection" in str(validation_error).lower() or "dangerous" in str(validation_error).lower():
                    return {
                        "success": False,
                        "error": "input_validation_failed",
                        "message": "Input validation failed - potentially unsafe query detected",
                        "sql_query": None
                    }
            else:
                # Use validated input
                natural_language_query = validated_input.natural_language_query
                data_source_id = validated_input.data_source_id
                schema_info = validated_input.schema_info
                logger.debug("✅ SQL generation input validated successfully")
        except Exception as validation_exception:
            logger.debug(f"Input validation not available: {validation_exception}, proceeding without validation")
        
        start_time = time.time()
        reasoning_steps = []
        
        try:
            # Step 1: Analyze query intent
            intent_step = ReasoningStepSchema(
                step_number=1,
                step_id="intent_analysis",
                step_type="intent_analysis",
                description="Analyzing user intent and query requirements",
                confidence=0.8
            )
            reasoning_steps.append(intent_step)
            
            # Step 2: Get schema information (use provided schema_info if available, otherwise fetch)
            schema_step = ReasoningStepSchema(
                step_number=2,
                step_id="schema_retrieval",
                step_type="schema_retrieval",
                description="Retrieving database schema information",
                confidence=0.9
            )
            reasoning_steps.append(schema_step)
            
            # Use provided schema_info if available (from orchestrator), otherwise fetch
            if schema_info:
                schem_info = schema_info
                logger.info(f"✅ Using provided schema_info: {len(schem_info)} tables/objects")
            else:
                # Fallback: fetch schema from data service
                schem_info_result = await self.data_service.get_source_schema(data_source_id)
                if not schem_info_result or not schem_info_result.get('success'):
                    error_msg = schem_info_result.get('error', 'Unknown error') if schem_info_result else 'No response from schema service'
                    logger.warning(f"⚠️ Failed to get schema for data source {data_source_id}: {error_msg}, will proceed without schema")
                    schem_info = {}
                else:
                    schem_info = schem_info_result.get('schema', {})
                    logger.info(f"✅ Fetched schema: {len(schem_info)} tables/objects")
            
            # CRITICAL FIX FOR FILE DATA SOURCES:
            # If schema is just columns/row_count (file format), wrap it in table entries
            # This ensures file data sources are treated as proper tables in DuckDB
            # Support BOTH 'data' (backward compat) and file_id (multi-file support)
            if schem_info and 'columns' in schem_info and 'tables' not in schem_info:
                # This is a basic schema from a file - normalize it to table format
                logger.info("🔧 Normalizing file schema: wrapping columns into table entries")
                
                # Use file ID as table name if available, otherwise use 'data' for backward compatibility
                file_id = data_source_id if data_source_id and data_source_id.startswith('file_') else 'data'
                table_name = file_id or 'data'
                
                schem_info = {
                    'tables': [{
                        'name': table_name,  # Use file_id or 'data' as table name
                        'columns': schem_info.get('columns', []),
                        'row_count': schem_info.get('row_count', 0),
                        'description': f'File data source ({file_id}) with {len(schem_info.get("columns", []))} columns',
                        'file_id': file_id  # Store file_id for reference
                    }],
                    **{k: v for k, v in schem_info.items() if k not in ['columns', 'row_count']}
                }
                logger.info(f"✅ File schema normalized: created '{table_name}' table with {len(schem_info['tables'][0]['columns'])} columns")
            
            if not schem_info or (not isinstance(schem_info, dict) or (schem_info.get('tables') is None and not any(k in schem_info for k in ['columns', 'tables']))):
                # Handle case when no data source is connected
                return {
                    "success": True,
                    "sql_query": None,
                    "business_explanation": f"""
**Data Source Not Connected**

To answer your query \"{natural_language_query}\", I need access to a connected data source. Here's what I can help you with:

**1. Data Source Requirements:**
- Sales data table with columns like: date, product, quantity, revenue, customer_id
- Time range: Last month's data
- Additional fields: product_category, region, sales_rep, etc.

**2. Recommended Data Sources:**
- CSV files with sales data
- Database tables (PostgreSQL, MySQL, SQL Server)
- Data warehouse connections (Snowflake, BigQuery, Redshift)
- API connections to CRM systems

**3. Sample SQL Query (when data is connected):**
```sql
SELECT 
    DATE_TRUNC('month', sale_date) as month,
    SUM(revenue) as total_revenue,
    COUNT(*) as total_sales,
    AVG(revenue) as avg_sale_value
FROM sales_data 
WHERE sale_date >= DATE_TRUNC('month', CURRENT_DATE - INTERVAL '1 month')
    AND sale_date < DATE_TRUNC('month', CURRENT_DATE)
GROUP BY DATE_TRUNC('month', sale_date)
ORDER BY month;
```

**4. Next Steps:**
1. Connect a data source using the Data Sources panel
2. Ensure the data contains sales information
3. Re-run your query to get actual results

Would you like help connecting a data source?
""",
                    "confidence": 0.7,
                    "reasoning_steps": reasoning_steps,
                    "execution_time": time.time() - start_time,
                    "metadata": {
                        "data_source_connected": False,
                        "requires_data_source": True,
                        "suggested_data_types": ["sales", "revenue", "transactions"]
                    }
                }
            
            # Step 3: Generate SQL using agent
            sql_generation_step = ReasoningStepSchema(
                step_number=3,
                step_id="sql_generation",
                step_type="sql_generation",
                description="Generating SQL query using LangChain agent",
                confidence=0.7
            )
            reasoning_steps.append(sql_generation_step)
            
            # Update tools with current data_source_id for context
            self._current_data_source_id = data_source_id
            # Re-initialize tools with data_source_id so they can use it as fallback
            self.tools = self._initialize_tools(data_source_id=data_source_id)
            # Re-initialize agent with updated tools
            self.agent = self._initialize_agent()
            
            # OPTIMIZATION: For large schemas, summarize before sending to LLM to reduce tokens
            # Limit schema size to prevent token overflow
            MAX_SCHEMA_TOKENS = 8000  # Approximate token limit for schema
            
            # CRITICAL: Format schema to highlight column names clearly
            # Build a clear, readable schema format that emphasizes available column names
            def format_schema_for_llm(schema_dict: Dict) -> str:
                """Format schema in a clear way that highlights table and column names"""
                formatted_parts = []
                formatted_parts.append("=== AVAILABLE TABLES AND COLUMNS ===\n")
                
                # CRITICAL: Handle multiple schema formats:
                # 1. {tables: [{name: 'customers', columns: [...]}]} - New format
                # 2. {table_name: {columns: [...]}} - Old format
                # 3. {schema_name: {tables: [...]}} - Nested schema format
                tables_to_format = []
                
                if 'tables' in schema_dict and isinstance(schema_dict['tables'], list):
                    # New format: {tables: [{name: 'customers', columns: [...]}]}
                    tables_to_format = schema_dict['tables']
                    logger.info(f"📊 Using 'tables' array format: {len(tables_to_format)} tables")
                else:
                    # Check for nested schema format (e.g., 'aiser_warehouse': {tables: [...]})
                    nested_tables = []
                    for key, value in schema_dict.items():
                        if isinstance(value, dict):
                            # Skip metadata keys
                            if key in ['type', 'host', 'port', 'database', 'username', 'ssl_mode', 
                                      'connection_string', 'encrypt', 'schemas', 'last_updated']:
                                continue
                            
                            # Check if this is a nested schema with tables array
                            if 'tables' in value and isinstance(value['tables'], list):
                                logger.info(f"📊 Found nested schema '{key}' with {len(value['tables'])} tables")
                                # Extract tables from nested schema
                                for table_info in value['tables']:
                                    if isinstance(table_info, dict):
                                        # Add schema prefix to table name
                                        table_name = table_info.get('name', '')
                                        if table_name:
                                            nested_tables.append({
                                                'name': f"{key}.{table_name}",  # Qualified name
                                                **table_info
                                            })
                                    elif isinstance(table_info, str):
                                        nested_tables.append({
                                            'name': f"{key}.{table_info}"  # Qualified name
                                        })
                                continue  # Skip further processing for schema containers
                            
                            # Old format: {table_name: {columns: [...]}}
                            # Only include if it has table-like structure (not a schema container)
                            if 'columns' in value or 'rowCount' in value or 'engine' in value:
                                tables_to_format.append({'name': key, **value})
                    
                    # Add nested tables to the list
                    if nested_tables:
                        tables_to_format.extend(nested_tables)
                        logger.info(f"📊 Added {len(nested_tables)} tables from nested schemas")
                
                for table_info in tables_to_format:
                    if isinstance(table_info, dict):
                        table_name = table_info.get('name', 'unknown')
                        formatted_parts.append(f"\n📊 TABLE: {table_name}")
                        
                        if 'columns' in table_info and isinstance(table_info['columns'], list):
                            formatted_parts.append("   COLUMNS:")
                            for col in table_info['columns']:
                                if isinstance(col, dict):
                                    col_name = col.get('name', 'unknown')
                                    col_type = col.get('type', 'unknown')
                                    formatted_parts.append(f"     - {col_name} ({col_type})")
                                elif isinstance(col, str):
                                    formatted_parts.append(f"     - {col}")
                        
                        if 'rowCount' in table_info:
                            formatted_parts.append(f"   ROWS: {table_info['rowCount']}")
                
                return "\n".join(formatted_parts)
            
            # Format schema for better LLM understanding
            schema_str_formatted = format_schema_for_llm(schem_info)
            schema_str_json = json.dumps(schem_info, indent=2)
            
            # Use formatted version for prompt, JSON for detailed reference
            schema_str = f"{schema_str_formatted}\n\n=== DETAILED SCHEMA (JSON) ===\n{schema_str_json}"
            
            if len(schema_str) > MAX_SCHEMA_TOKENS * 4:  # Rough char-to-token ratio
                logger.info(f"📊 Large schema detected ({len(schema_str)} chars), summarizing for LLM")
                # Summarize schema: keep only table names and key columns
                summarized_schema = {}
                for table_name, table_info in list(schem_info.items())[:30]:  # Top 30 tables
                    if isinstance(table_info, dict):
                        # Skip schema-only keys
                        if '.' not in table_name and 'columns' not in table_info and 'rowCount' not in table_info and 'engine' not in table_info:
                            continue
                        summarized_table = {"table_name": table_name}
                        if 'columns' in table_info:
                            # Keep only first 15 columns per table (more for better column visibility)
                            cols = table_info['columns'][:15]
                            summarized_table['columns'] = cols
                            if len(table_info['columns']) > 15:
                                summarized_table['_total_columns'] = str(len(table_info['columns']))  # Store as string for JSON compatibility
                        summarized_schema[table_name] = summarized_table
                    else:
                        summarized_schema[table_name] = table_info
                schem_info = summarized_schema
                schema_str_formatted = format_schema_for_llm(schem_info)
                schema_str_json = json.dumps(schem_info, indent=2)
                schema_str = f"{schema_str_formatted}\n\n=== DETAILED SCHEMA (JSON) ===\n{schema_str_json}"
                logger.info(f"✅ Schema summarized: {len(schema_str)} chars")
            
            # Get database type for dialect-specific instructions
            db_type = None
            data_source_type = None
            if self.data_service:
                try:
                    source_info = await self.data_service.get_data_source_by_id(data_source_id)
                    if source_info:
                        db_type = source_info.get('db_type', '').lower() or source_info.get('type', '').lower()
                        data_source_type = source_info.get('type', '').lower()  # Get actual data source type (file, database, etc.)
                except Exception:
                    pass
            
            # Add dialect-specific instructions
            dialect_instructions = ""
            # CRITICAL: File data sources use DuckDB, not ClickHouse
            if data_source_type == 'file':
                dialect_instructions = """CRITICAL DuckDB SQL Rules (for FILE data sources):
1. **DO NOT use ClickHouse functions** - File data sources use DuckDB, not ClickHouse
2. **Date functions**: Use `date_trunc('month', column)` NOT `toStartOfMonth(column)`
3. **Date parsing**: Use `CAST(column AS DATE)` or `strptime(column, '%Y-%m-%d')` NOT `parseDateTimeBestEffort(column)`
4. **Unique count**: Use `COUNT(DISTINCT column)` NOT `uniqExact(column)`
5. **Empty string check**: Use `column IS NOT NULL AND column != ''` or `TRIM(column) != ''` NOT `column != ''` (which causes unterminated string errors)
6. **String literals**: Always use proper quotes: `'value'` not `''` (empty string check should be `column IS NOT NULL AND column != ''`)
7. **Table name**: ALWAYS use `"data"` as table name (not file ID like "file_1234567890")
8. **Standard SQL**: DuckDB supports standard SQL - use PostgreSQL-style functions

EXAMPLES:
❌ WRONG: SELECT toStartOfMonth(parseDateTimeBestEffort("Subscription Date")) AS month, uniqExact("Customer Id") FROM "data" WHERE "Subscription Date" != ''
✅ CORRECT: SELECT date_trunc('month', CAST("Subscription Date" AS DATE)) AS month, COUNT(DISTINCT "Customer Id") FROM "data" WHERE "Subscription Date" IS NOT NULL AND "Subscription Date" != ''
"""
            elif db_type == 'clickhouse':
                # Escape braces for LangChain template parser
                dialect_instructions = """CRITICAL ClickHouse SQL Rules:
1. NO CTEs (WITH clauses): ClickHouse has limited CTE support - AVOID using WITH clauses
2. GROUP BY: ClickHouse requires EXACT expression match - you CANNOT use aliases in GROUP BY
   - Use the EXACT SAME expression in both SELECT and GROUP BY, OR use a subquery
   - BEST PRACTICE: If you use an expression with alias in SELECT, REPEAT THE EXACT EXPRESSION in GROUP BY
3. NO WINDOW FUNCTIONS: ClickHouse does NOT support standard SQL window functions
   - DO NOT use: lag(), lead(), first_value(), last_value(), row_number(), rank(), dense_rank(), etc.
   - DO NOT use: OVER (ORDER BY ...) or OVER (PARTITION BY ... ORDER BY ...)
   - INSTEAD use: Self-joins, subqueries, or array functions for similar functionality
   - For "previous value" or "next value": Use self-join with row number or array functions
   - For "growth rate" or "change": Calculate in application layer or use subqueries
4. Use ClickHouse functions: toYear(), toMonth(), countDistinct(), uniqExact(), etc.
5. Table names: Use database.table format (e.g., aiser_warehouse.customers)
6. String functions: trimBoth(), length(), etc.

EXAMPLES OF WHAT NOT TO DO:
❌ WRONG: SELECT month, value, lag(value) OVER (ORDER BY month) FROM table
✅ CORRECT: Use subquery or self-join instead

❌ WRONG: SELECT *, row_number() OVER (PARTITION BY category ORDER BY date) FROM table
✅ CORRECT: Use array functions or subquery with row numbers
"""
            
            # Prepare input for agent - explicitly include data_source_id for tool calls
            # Check if schema includes sample data
            has_sample_data = False
            sample_data_info = ""
            if schem_info:
                for table_name, table_info in schem_info.items():
                    if isinstance(table_info, dict):
                        if 'sample_data' in table_info or 'sample_rows' in table_info:
                            has_sample_data = True
                            sample_rows = table_info.get('sample_data') or table_info.get('sample_rows', [])
                            if sample_rows and len(sample_rows) > 0:
                                sample_data_info += f"\n\nSample data for {table_name} (first {min(3, len(sample_rows))} rows):\n"
                                for i, row in enumerate(sample_rows[:3]):
                                    sample_data_info += f"  Row {i+1}: {row}\n"
            
            sample_note = "\n\nNote: Sample data not available - use column names and data types to infer data patterns."
            db_dialect = db_type or 'standard SQL'
            # Build prompt without f-string to avoid brace conflicts in dialect_instructions
            basic_prompt = f"""Natural language query: {natural_language_query}
Data source ID: {data_source_id}
Database type: {db_type or 'unknown'}

Schema information (tables, columns, and data types):
{schema_str}
{sample_data_info if has_sample_data else sample_note}

"""
            
            instructions = f"""
Generate an optimized SQL query following these principles:

## CRITICAL: USE ACTUAL COLUMN NAMES FROM SCHEMA
**NEVER invent column names** - ONLY use column names that exist in the schema_info provided above.
**NEVER use placeholder names** like 'sale_date', 'revenue', 'customer_id' unless they EXACTLY match schema columns.
**ALWAYS verify** column names exist in the schema before using them in the query.

## SCHEMA-DRIVEN GENERATION
1. **Table Selection**: Identify the most appropriate table(s) from schema_info that contain the required data
   - Use EXACT table names from schema (e.g., 'sales', 'orders', 'customers')
   - For qualified names, use format: database.table (e.g., 'aiser_warehouse.sales')
   - NEVER use schema name alone as table name (e.g., 'aiser_warehouse' is NOT a table)
2. **Column Mapping**: Match query terms to actual column names in the schema (case-sensitive, exact matches)
   - Check schema_info for each column name before using it
   - If query mentions "date" but schema has "order_date", use "order_date" not "date"
   - If query mentions "sales" but schema has "total_sales", use "total_sales" not "sales"
3. **Data Type Awareness**: Use functions appropriate for each column's data type (strings, numbers, dates, etc.)
   - Check column 'type' in schema_info to determine data type
   - For date columns, use appropriate date functions (toYear, toMonth, etc.)
4. **Sample Data Insight**: If sample rows are provided, use them to understand data patterns and value formats

## QUERY PATTERN RECOGNITION
Map natural language patterns to SQL constructs:

**Aggregation Queries:**
- "average/mean/avg X" → AVG(column)
- "total/sum X" → SUM(column)
- "count/number of X" → COUNT(column)
- "maximum/max X" → MAX(column)
- "minimum/min X" → MIN(column)

**Grouping Queries:**
- "by X" or "grouped by X" → GROUP BY column
- "per X" → GROUP BY column (often with aggregation)
- "for each X" → GROUP BY column

**Time-Based Queries:**
- "per month" → GROUP BY date function (toMonth, toYearMonth, etc.)
- "per year" → GROUP BY toYear(date_column)
- "over time" → GROUP BY date_column with appropriate granularity
- "last N days/weeks/months" → WHERE date_column >= date function

**Filtering Queries:**
- "where X is Y" → WHERE column = value
- "with X greater than Y" → WHERE column > value
- "excluding X" → WHERE column != value or WHERE column IS NULL

**Multi-Dimensional Analysis:**
- "X by Y" → SELECT X, Y ... GROUP BY Y
- "X per Y by Z" → SELECT X, Y, Z ... GROUP BY Y, Z

## SQL STRUCTURE REQUIREMENTS
1. **Mandatory Clauses**: Every query MUST have SELECT and FROM clauses
   - SELECT clause: List actual column names from schema
   - FROM clause: Use actual table name from schema (e.g., 'sales' or 'aiser_warehouse.sales')
   - NEVER generate SQL without a FROM clause
2. **Table Names**: Use actual table names from schema_info, never placeholders or reserved words
   - Check schema_info keys for available table names
   - Use unqualified name (e.g., 'sales') or qualified name (e.g., 'aiser_warehouse.sales')
   - NEVER use schema name alone (e.g., 'aiser_warehouse' is NOT a table)
   - **CRITICAL FOR FILE DATA SOURCES**: File data sources can be referenced by table name or file ID
     - Single file: Use table name 'data' (backward compatible) OR the file_id (e.g., 'file_1234567890')
     - Multiple files in one query: Use file_ids and JOIN them together
     - Example single file: FROM "data" or FROM "file_1234567890"
     - Example multi-file: FROM "file_1234567890" f1 JOIN "file_9876543210" f2 ON f1.id = f2.id
3. **Column Names**: Use exact column names from schema, respecting case sensitivity
   - Check 'columns' array in table_info for available column names
   - Use exact column name as shown in schema (case-sensitive)
   - If column doesn't exist in schema, DO NOT use it - find alternative or ask for clarification
4. **Reserved Words**: NEVER use SQL reserved words (SELECT, FROM, WHERE, TABLE, etc.) as identifiers
5. **Syntax Order**: SELECT → FROM → WHERE → GROUP BY → HAVING → ORDER BY → LIMIT

## DIALECT-SPECIFIC CONSIDERATIONS ({db_dialect})
- Follow dialect-specific function names and syntax rules
- Use appropriate date/time functions for the database type
- Respect dialect limitations (e.g., ClickHouse CTE restrictions)

## CRITICAL: FILE DATA SOURCE DUCKDB COMPATIBILITY
**IF THE DATA SOURCE TYPE IS 'file', YOU MUST USE DUCKDB FUNCTIONS, NOT CLICKHOUSE FUNCTIONS:**
- **DO NOT use ClickHouse functions**: toStartOfMonth(), parseDateTimeBestEffort(), uniqExact(), etc.
- **USE DuckDB functions instead**:
  - Date truncation: `date_trunc('month', column)` NOT `toStartOfMonth(column)`
  - Date parsing: `CAST(column AS DATE)` or `strptime(column, '%Y-%m-%d')` NOT `parseDateTimeBestEffort(column)`
  - Unique count: `COUNT(DISTINCT column)` NOT `uniqExact(column)`
  - Empty string check: `column IS NOT NULL AND column != ''` or `TRIM(column) != ''` NOT `column != ''` (which can cause unterminated string errors)
- **String literals**: Always use proper quotes: `'value'` not `''` (empty string check should be `column IS NOT NULL AND column != ''`)
- **Table name (Single File)**: Use `"data"` as table name for backward compatibility OR use file_id like `"file_1234567890"`
- **Table name (Multiple Files)**: Use file_ids and JOIN them: `FROM "file_1" f1 JOIN "file_2" f2 ON f1.key = f2.key`

## VALIDATION REQUIREMENTS
When using the validate_sql tool, provide:
- sql_query: The complete SQL query string
- data_source_id: {data_source_id}

## FEW-SHOT PATTERNS (Generalizable Examples)

**Pattern: Aggregation with Grouping**
Query: "total sales by region"
SQL Pattern: SELECT region_column, SUM(sales_column) FROM table GROUP BY region_column

**Pattern: Time Series Aggregation**
Query: "average revenue per month"
SQL Pattern: SELECT date_function(date_column) AS period, AVG(revenue_column) FROM table GROUP BY period

**Pattern: Multi-Dimensional Grouping**
Query: "count of orders by status and month"
SQL Pattern: SELECT status_column, date_function(date_column) AS month, COUNT(*) FROM table GROUP BY status_column, month

**Pattern: Filtered Aggregation**
Query: "average price where category is electronics"
SQL Pattern: SELECT AVG(price_column) FROM table WHERE category_column = 'electronics'

## CRITICAL CONSTRAINTS
- ✅ ALWAYS use real table/column names from schema_info
- ✅ ALWAYS include FROM clause with valid table name
- ✅ NEVER use reserved words as identifiers
- ✅ ALWAYS validate SQL structure before returning
- ❌ NEVER use placeholders like "table_name" or "column_name"
- ❌ NEVER generate SQL with syntax errors
- ❌ NEVER use reserved words (SELECT, FROM, TABLE, etc.) as column/table names
- ❌ NEVER generate incomplete SQL like "SELECT date_trunc('month" (missing closing quote)
- ❌ NEVER generate truncated queries - always complete the full SQL statement

## SQL COMPLETENESS CHECKLIST
Before returning SQL, verify:
1. All single quotes (') are properly closed
2. All double quotes (") are properly closed
3. All opening parentheses ( have matching closing parentheses )
4. SELECT statement has a complete FROM clause with table name
5. Function calls like date_trunc('month', column) are complete
6. No truncated text at the end of the query
"""
            
            schema_prompt = basic_prompt + dialect_instructions + instructions
            
            # Add current SQL context if provided (for query editor follow-up queries)
            if current_sql:
                sql_context = f"""
Previous SQL Query (for context):
```sql
{current_sql}
```

The user's new query is a modification or follow-up to the above SQL. Use it as context to understand what they're asking about. Adapt the previous SQL to answer the new query.
"""
                schema_prompt = f"{sql_context}\n\n{schema_prompt}"
                logger.info(f"📝 Including current SQL as context for SQL generation")
            
            agent_input = {
                "input": schema_prompt,
                "chat_history": conversation_history or []
            }
            
            # Optionally include structured format instructions to encourage JSON output
            try:
                from app.modules.ai.utils.structured_output import StructuredOutputHandler
                from app.modules.ai.schemas.agent_outputs import SQLGenerationOutput

                fmt_handler = StructuredOutputHandler(SQLGenerationOutput)
                fmt_instructions = fmt_handler.get_format_instructions()
                # Append format instructions to the agent input to bias structured JSON output
                agent_input["input"] = f"{agent_input['input']}\n\nFormat instructions:\n{fmt_instructions}"
            except Exception:
                # If structured handler not available, proceed without format instructions
                pass
            
            # Execute agent
            # NOTE: The agent uses LangChain's AgentExecutor which uses LiteLLMService
            # CRITICAL: The model used is determined by LiteLLMService.active_model (user-selected) or default_model
            # This ensures user's model selection is respected throughout the E2E workflow
            active_model = getattr(self.litellm_service, 'active_model', None) or getattr(self.litellm_service, 'default_model', 'azure_gpt5_mini')
            logger.info("🤖 [NL2SQL_AGENT] Executing LLM-based SQL generation agent")
            logger.info(f"   Query: {natural_language_query[:100]}...")
            logger.info(f"   Model: Using LiteLLMService active_model={active_model} (respects user selection)")
            
            try:
                result = await self.agent.ainvoke(agent_input)
                logger.info("✅ [NL2SQL_AGENT] Agent execution completed")
            except Exception as agent_error:
                logger.error(f"❌ Agent execution failed: {agent_error}", exc_info=True)
                # Fallback: try direct LLM call
                logger.info("🔄 Attempting direct LLM call as fallback")
                try:
                    schema_str_fallback = json.dumps(schem_info, default=str)[:2000] if schem_info else "No schema available"
                    fallback_result = await self.litellm_service.generate_completion(
                        prompt=f"Convert this natural language query to SQL: {natural_language_query}\n\nSchema: {schema_str_fallback}",
                        system_context="You are an expert SQL analyst. Return ONLY a valid JSON object with sql_query, dialect, explanation, confidence, validation_result, success, and reasoning_steps fields.",
                        max_tokens=2000,
                        temperature=0.1
                    )
                    if fallback_result.get("success") and fallback_result.get("content"):
                        result = {"output": fallback_result.get("content", "")}
                        logger.info("✅ Fallback LLM call succeeded")
                    else:
                        raise Exception(f"Fallback LLM call failed: {fallback_result.get('error', 'Unknown error')}")
                except Exception as fallback_error:
                    logger.error(f"❌ Fallback also failed: {fallback_error}")
                    raise agent_error  # Re-raise original error
            
            # CRITICAL: Direct JSON parsing ONLY - NO StructuredOutputHandler (causes "idididi" corruption)
            sql_query = None
            agent_output = result.get("output", "")
            
            if agent_output and isinstance(agent_output, str):
                try:
                    # Clean output before parsing
                    clean_output = agent_output.strip()
                    
                    # Remove markdown code blocks if present
                    if clean_output.startswith('```'):
                        clean_output = re.sub(r'^```(?:json)?\s*\n', '', clean_output)
                        clean_output = re.sub(r'\n```\s*$', '', clean_output)
                    
                    # Direct JSON parse - NO STRUCTURED OUTPUT HANDLER
                    parsed = json.loads(clean_output)
                    if isinstance(parsed, dict) and 'sql_query' in parsed:
                        sql_query = parsed['sql_query']
                        if sql_query and isinstance(sql_query, str):
                            # Minimal cleaning - remove only escaped newlines/tabs
                            sql_query = sql_query.strip()
                            sql_query = sql_query.replace('\\n', ' ').replace('\\t', ' ')
                            # Remove multiple spaces
                            sql_query = ' '.join(sql_query.split())
                            logger.info(f"✅ Direct JSON parsing succeeded: {len(sql_query)} chars")
                        else:
                            logger.warning("⚠️ sql_query field is empty or not a string")
                            sql_query = None
                    else:
                        logger.warning(f"⚠️ JSON parsed but missing sql_query field")
                except json.JSONDecodeError as je:
                    logger.warning(f"⚠️ JSON parse failed: {je}, attempting regex extraction")
                    # Fallback to regex extraction
                    match = re.search(r'"sql_query"\s*:\s*"([^"]+)"', agent_output)
                    if match:
                        sql_query = match.group(1)
                        # Decode basic escapes
                        sql_query = sql_query.replace('\\n', ' ').replace('\\t', ' ')
                        sql_query = ' '.join(sql_query.split())
                        logger.info(f"✅ Regex extraction succeeded")
                except Exception as parse_error:
                    logger.error(f"❌ Parsing failed: {parse_error}", exc_info=True)
            
            # Last resort: text extraction if JSON parsing completely failed
            if not sql_query:
                raw_extracted = self._extract_sql_from_result(result.get("output", "") or "")
                # Clean extracted SQL to remove JSON wrappers, escapes, and surrounding text
                sql_query = self._clean_extracted_sql(raw_extracted)
                logger.debug(f"🔍 Extracted SQL after cleanup: {str(sql_query)[:200]}...")
            
            # CRITICAL: Validate SQL syntax completeness BEFORE using it
            if sql_query:
                # Use the validation tool's syntax checker
                validation_tool = SQLValidationTool(self.data_service, async_session_factory=self.async_session_factory, data_source_id=data_source_id)
                syntax_errors = validation_tool._validate_sql_syntax(sql_query)
                if syntax_errors:
                    error_msg = f"Generated SQL has syntax errors: {', '.join(syntax_errors)}"
                    logger.error(f"❌ {error_msg}. Query: {sql_query[:200]}...")
                    # Attempt to fix common issues using the validation tool
                    try:
                        # Try to fix unbalanced quotes/parentheses using validation tool's method
                        fixed_query = validation_tool._fix_common_errors(sql_query, schem_info or {})
                        fixed_errors = validation_tool._validate_sql_syntax(fixed_query)
                        if not fixed_errors:
                            logger.info(f"✅ Auto-fixed SQL syntax errors. Original: {sql_query[:100]}... Fixed: {fixed_query[:100]}...")
                            sql_query = fixed_query
                        else:
                            logger.error(f"❌ Could not auto-fix SQL syntax errors. Original errors: {syntax_errors}, Fixed errors: {fixed_errors}")
                            # Return error - don't proceed with invalid SQL
                            return {
                                "sql_query": None,
                                "explanation": f"SQL generation failed due to syntax errors: {', '.join(syntax_errors)}. The generated SQL query appears incomplete or malformed.",
                                "validation_result": {"valid": False, "errors": syntax_errors},
                                "reasoning_steps": [step.dict() for step in reasoning_steps] if 'reasoning_steps' in locals() else [],
                                "execution_time_ms": int((time.time() - start_time) * 1000),
                                "success": False,
                                "error": f"SQL syntax validation failed: {', '.join(syntax_errors)}"
                            }
                    except Exception as fix_error:
                        logger.error(f"❌ Error attempting to fix SQL: {fix_error}", exc_info=True)
                        return {
                            "sql_query": None,
                            "explanation": f"SQL generation failed due to syntax errors: {', '.join(syntax_errors)}",
                            "validation_result": {"valid": False, "errors": syntax_errors},
                            "reasoning_steps": [step.dict() for step in reasoning_steps] if 'reasoning_steps' in locals() else [],
                            "execution_time_ms": int((time.time() - start_time) * 1000),
                            "success": False,
                            "error": f"SQL syntax validation failed: {', '.join(syntax_errors)}"
                        }
            
            # CRITICAL: Validate SQL is not placeholder/template/instructions BEFORE using it
            if sql_query:
                sql_lower = sql_query.lower()
                
                # Check for instruction patterns (LLM generating descriptions instead of SQL)
                instruction_patterns = [
                    "select time bucket",
                    "select appropriate",
                    "use tostart",
                    "bucket by month",
                    '"detail":',
                    'reasoning_steps',
                    'generate sql',
                ]
                if any(pattern in sql_lower for pattern in instruction_patterns):
                    logger.error(f"❌ Rejected SQL instructions (not actual SQL): {sql_query[:150]}...")
                    sql_query = None  # Reject instructions
                
                # Check for placeholder patterns
                placeholder_patterns = [
                    "table_name",
                    "where condition",
                    "column_name",
                    "avg(column_name)",
                    "sum(column_name)",
                    "count(column_name)",
                    "select * from table_name",
                    "from table_name where"
                ]
                if any(pattern in sql_lower for pattern in placeholder_patterns):
                    logger.error(f"❌ Rejected placeholder SQL template: {sql_query[:100]}...")
                    sql_query = None  # Reject placeholder SQL
                
                # Check for severe corruption (repeated patterns)
                if sql_query and re.search(r'(.{2,3})\1{5,}', sql_query):
                    logger.error(f"❌ Rejected severely corrupted SQL: {sql_query[:100]}...")
                    sql_query = None  # Reject corrupted SQL
            
            # Step 3.5: Post-process SQL to fix ClickHouse GROUP BY issues ONLY if detected
            # Trust the LLM - only fix if we detect actual alias usage in GROUP BY
            if db_type == 'clickhouse' and sql_query and 'GROUP BY' in sql_query.upper():
                if self._has_clickhouse_groupby_issue(sql_query):
                    try:
                        fixed_sql = self._fix_clickhouse_groupby(sql_query)
                        if fixed_sql != sql_query and self._is_valid_sql(fixed_sql):
                            logger.info("✅ Auto-fixed ClickHouse GROUP BY issue (detected alias usage)")
                            sql_query = fixed_sql
                        else:
                            logger.debug("ClickHouse GROUP BY fix produced invalid SQL, using original")
                    except Exception as fix_error:
                        logger.debug(f"Could not post-process ClickHouse SQL: {fix_error}, using original")
                else:
                    logger.debug("ClickHouse GROUP BY looks correct (expression match), skipping fix")
            
            # CRITICAL: Final validation - reject placeholder SQL before validation/execution
            if sql_query:
                sql_lower = sql_query.lower()
                # Check for ALL placeholder patterns including AVG(column_name), SUM(column_name), etc.
                placeholder_patterns = [
                    "table_name",
                    "where condition",
                    "column_name",
                    "avg(column_name)",
                    "sum(column_name)",
                    "count(column_name)",
                    "select * from table_name",
                    "from table_name where"
                ]
                if any(pattern in sql_lower for pattern in placeholder_patterns):
                    logger.error(f"❌ Rejected placeholder SQL before validation: {sql_query[:100]}...")
                    return {
                        "sql_query": None,
                        "explanation": "SQL generation failed - placeholder SQL template detected. The AI agent needs access to the actual database schema to generate real SQL queries.",
                        "validation_result": {"valid": False, "message": "Placeholder SQL template cannot be executed"},
                        "reasoning_steps": [step.dict() for step in reasoning_steps],
                        "execution_time_ms": int((time.time() - start_time) * 1000),
                        "success": False,
                        "error": "Placeholder SQL template detected - not a real query. Please ensure the AI agent has access to the database schema."
                    }
            
            # Step 4: Validate and optimize SQL
            validation_step = ReasoningStepSchema(
                step_number=4,
                step_id="sql_validation",
                step_type="sql_validation",
                description="Validating and optimizing generated SQL",
                confidence=0.8
            )
            reasoning_steps.append(validation_step)
            
            # SQL is already cleaned by Pydantic validator in SQLGenerationOutput
            # No need for additional sanitization here - trust the model validation
            # Validate SQL using the cleaned SQL from Pydantic model
            validation_tool = SQLValidationTool(self.data_service, async_session_factory=self.async_session_factory, data_source_id=data_source_id)
            validation_result = await validation_tool._arun(sql_query, data_source_id=data_source_id, dialect=db_type) # Await _arun
            
            # Step 5: Generate explanation
            explanation_step = ReasoningStepSchema(
                step_number=5,
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
                "validation_result": {"valid": "SQL syntax is valid" in validation_result, "message": validation_result},
                "reasoning_steps": [step.dict() for step in reasoning_steps],
                "execution_time_ms": execution_time,
                "success": True
            }
            
        except Exception as e:
            logger.error(f"Error generating SQL: {e}")
            
            # Do NOT use fallback SQL - return error instead to prevent placeholder SQL execution
            return {
                "sql_query": None,  # Explicitly None to prevent execution
                "explanation": f"SQL generation failed: {str(e)}",
                "validation_result": {"valid": False, "errors": [str(e)]},
                "reasoning_steps": [step.dict() for step in reasoning_steps],
                "execution_time_ms": int((time.time() - start_time) * 1000),
                "success": False,
                "error": str(e)
            }
    
    async def generate_python(
        self,
        natural_language_query: str,
        data_source_id: str,
        context: AgentContextSchema,
        conversation_history: Optional[List[Tuple[str, str]]] = None,
        schema_info: Optional[Dict[str, Any]] = None,
        current_sql: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Generate Python script to query data source.
        
        Args:
            natural_language_query: User's natural language query
            data_source_id: Target data source ID
            context: User context with permissions and data sources
            conversation_history: Previous conversation messages
            schema_info: Optional pre-fetched schema information
            current_sql: Optional current SQL statement for context (query editor)
            
        Returns:
            Generated Python script with metadata
        """
        start_time = time.time()
        reasoning_steps = []
        
        try:
            # Step 1: Get schema information (reuse SQL generation logic)
            if schema_info:
                schem_info = schema_info
                logger.info(f"✅ Using provided schema_info: {len(schem_info)} tables/objects")
            else:
                schem_info_result = await self.data_service.get_source_schema(data_source_id)
                if not schem_info_result or not schem_info_result.get('success'):
                    error_msg = schem_info_result.get('error', 'Unknown error') if schem_info_result else 'No response from schema service'
                    logger.warning(f"⚠️ Failed to get schema for data source {data_source_id}: {error_msg}")
                    schem_info = {}
                else:
                    schem_info = schem_info_result.get('schema', {})
                    logger.info(f"✅ Fetched schema: {len(schem_info)} tables/objects")
            
            if not schem_info:
                return {
                    "success": False,
                    "python_script": None,
                    "explanation": "No schema information available. Please connect a data source first.",
                    "reasoning_steps": [],
                    "execution_time_ms": int((time.time() - start_time) * 1000),
                    "error": "No schema available"
                }
            
            # Step 2: Get data source type to determine connection method
            db_type = None
            data_source_type = None
            if self.data_service:
                try:
                    source_info = await self.data_service.get_data_source_by_id(data_source_id)
                    if source_info:
                        db_type = source_info.get('db_type', '').lower() or source_info.get('type', '').lower()
                        data_source_type = source_info.get('type', '').lower()
                except Exception:
                    pass
            
            # Step 3: Format schema for Python context
            def format_schema_for_python(schema_dict: Dict) -> str:
                """Format schema in a clear way for Python code generation"""
                formatted_parts = []
                formatted_parts.append("=== AVAILABLE TABLES AND COLUMNS ===\n")
                
                valid_tables = {}
                for key, value in schema_dict.items():
                    if isinstance(value, dict):
                        if '.' not in key and 'columns' not in value and 'rowCount' not in value and 'engine' not in value:
                            continue
                        if 'columns' in value or 'rowCount' in value or 'engine' in value:
                            valid_tables[key] = value
                    elif not isinstance(value, str):
                        valid_tables[key] = value
                
                for table_name, table_info in valid_tables.items():
                    if isinstance(table_info, dict):
                        formatted_parts.append(f"\n📊 TABLE: {table_name}")
                        if 'columns' in table_info and isinstance(table_info['columns'], list):
                            formatted_parts.append("   COLUMNS:")
                            for col in table_info['columns']:
                                if isinstance(col, dict):
                                    col_name = col.get('name', 'unknown')
                                    col_type = col.get('type', 'unknown')
                                    formatted_parts.append(f"     - {col_name} ({col_type})")
                                elif isinstance(col, str):
                                    formatted_parts.append(f"     - {col}")
                        if 'rowCount' in table_info:
                            formatted_parts.append(f"   ROWS: {table_info['rowCount']}")
                
                return "\n".join(formatted_parts)
            
            schema_str = format_schema_for_python(schem_info)
            
            # Step 4: Generate Python code using LLM with multi-engine support
            # Determine optimal engine based on data source type
            optimal_engine = "auto"
            if data_source_type == "file":
                optimal_engine = "pandas"
            elif db_type in ["clickhouse", "postgresql", "mysql", "sqlite"]:
                optimal_engine = "direct_sql"
            elif db_type in ["duckdb"]:
                optimal_engine = "duckdb"
            
            # Add current SQL context if provided (for query editor follow-up queries)
            sql_context_section = ""
            if current_sql:
                sql_context_section = f"""
## PREVIOUS SQL QUERY (for context)
The user's new query is a modification or follow-up to this previous SQL query:
```sql
{current_sql}
```

Use this previous SQL as context to understand what the user is asking about. Adapt the previous SQL to answer the new query.

"""
                logger.info(f"📝 Including current SQL as context for Python generation")
            
            python_prompt = f"""You are an expert Python data analyst. Generate a Python script to query a data source using the Aiser multi-engine query system.
{sql_context_section}## USER REQUEST
{natural_language_query}

## DATA SOURCE SCHEMA
{schema_str}

## DATA SOURCE INFORMATION
- Data Source ID: {data_source_id}
- Database Type: {db_type or 'unknown'}
- Data Source Type: {data_source_type or 'unknown'}
- Recommended Engine: {optimal_engine} (auto-selects optimal: duckdb, cube, spark, direct_sql, or pandas)

## MULTI-ENGINE QUERY SYSTEM
The Aiser platform supports multiple query engines for optimal performance:
- **duckdb**: Fast analytical queries for small-medium datasets (< 1M rows)
- **cube**: Aggregation queries with pre-computed metrics (1M-100M rows)
- **spark**: Big data processing for large datasets (> 100M rows)
- **direct_sql**: Direct database connection (PostgreSQL, ClickHouse, etc.)
- **pandas**: File-based data sources (CSV, Excel, etc.)
- **auto**: Automatically selects the best engine based on query and data size

## REQUIREMENTS
1. **Use Multi-Engine Query Service**:
   - Import and use the Aiser query execution API
   - Use the `/api/data/query/execute` endpoint for optimal engine selection
   - The system will automatically choose the best engine (duckdb, cube, spark, direct_sql, pandas)

2. **Query Execution**:
   - Generate the appropriate SQL query based on the user's request
   - Use the multi-engine API which handles engine selection automatically
   - The API returns results as JSON which can be converted to pandas DataFrame

3. **Code Structure**:
   - Import necessary libraries (pandas, requests/httpx, json)
   - Set up API call to Aiser query execution endpoint
   - Execute query and convert results to DataFrame
   - Display results (e.g., print(df.head()) or return df)

4. **Best Practices**:
   - Use the multi-engine API for optimal performance
   - Handle errors gracefully
   - Include comments explaining the code
   - Use actual table and column names from the schema
   - Let the system auto-select engine unless specific engine is needed

5. **Output Format**:
   - Return ONLY the Python code
   - No markdown code blocks
   - No explanations outside the code
   - Include inline comments for clarity

## EXAMPLE STRUCTURE (Using Multi-Engine API)
```python
import pandas as pd
import requests
import json

# Aiser API endpoint for multi-engine query execution
API_BASE = "http://localhost:8000"  # Adjust to your Aiser instance
data_source_id = "{data_source_id}"

# Generate SQL query based on user request
sql_query = '''
SELECT column1, column2, SUM(column3) as total
FROM table_name
WHERE condition
GROUP BY column1, column2
LIMIT 100
'''

# Execute query using multi-engine service (auto-selects optimal engine)
response = requests.post(
    f"{{API_BASE}}/api/data/query/execute",
    json={{
        "query": sql_query,
        "data_source_id": data_source_id,
        "engine": "auto",  # Let system choose: duckdb, cube, spark, direct_sql, or pandas
        "optimization": True
    }},
    headers={{"Content-Type": "application/json"}}
)

result = response.json()

if result.get("success"):
    # Convert results to DataFrame
    df = pd.DataFrame(result.get("data", []))
    print(df.head())
    print(f"Total rows: {{len(df)}}")
    print(f"Engine used: {{result.get('engine', 'auto')}}")
    print(f"Execution time: {{result.get('execution_time', 0)}}ms")
else:
    print(f"Query failed: {{result.get('error')}}")
```

## ALTERNATIVE: Direct Engine Usage (if specific engine needed)
For direct engine access, you can specify the engine:
- engine="duckdb" for fast analytics
- engine="cube" for aggregations
- engine="spark" for big data
- engine="direct_sql" for direct database connection
- engine="pandas" for file sources

Generate the Python script now:"""

            # Use LiteLLM service for Python generation
            llm = self.litellm_service.get_llm()
            
            logger.info("🐍 [PYTHON_AGENT] Generating Python script from natural language")
            response = await self.litellm_service.generate_completion(
                messages=[
                    {"role": "system", "content": "You are an expert Python data analyst. Generate clean, executable Python code."},
                    {"role": "user", "content": python_prompt}
                ],
                max_tokens=2000,
                temperature=0.2,
            )
            
            python_code = response.get("content", "").strip()
            
            # Clean up code (remove markdown code blocks if present)
            if python_code.startswith("```python"):
                python_code = re.sub(r'```python\s*', '', python_code, flags=re.IGNORECASE)
            if python_code.startswith("```"):
                python_code = re.sub(r'```\s*', '', python_code)
            if python_code.endswith("```"):
                python_code = python_code[:-3].strip()
            
            # Step 5: Generate explanation
            explanation = f"Generated Python script to query data source '{data_source_id}' based on: {natural_language_query}"
            
            execution_time = int((time.time() - start_time) * 1000)
            
            return {
                "python_script": python_code,
                "explanation": explanation,
                "reasoning_steps": [{"step": "schema_retrieval", "description": "Retrieved data source schema"}, 
                                   {"step": "code_generation", "description": "Generated Python script"}],
                "execution_time_ms": execution_time,
                "success": True,
                "data_source_id": data_source_id,
                "data_source_type": data_source_type
            }
            
        except Exception as e:
            logger.error(f"Error generating Python script: {e}", exc_info=True)
            return {
                "python_script": None,
                "explanation": f"Python generation failed: {str(e)}",
                "reasoning_steps": [],
                "execution_time_ms": int((time.time() - start_time) * 1000),
                "success": False,
                "error": str(e)
            }
    
    def _extract_sql_from_result(self, result_text: str) -> str:
        """Extract SQL query from agent result - ensures complete query extraction."""
        # Look for SQL in code blocks first (most reliable)
        sql_pattern = r'```sql\s*(.*?)\s*```'
        match = re.search(sql_pattern, result_text, re.DOTALL | re.IGNORECASE)
        if match:
            extracted = match.group(1).strip()
            # Ensure we have a complete query (ends with semicolon or LIMIT/ORDER BY)
            if extracted and not extracted.endswith(';') and not re.search(r'(LIMIT|ORDER BY|;)\s*$', extracted, re.IGNORECASE):
                # Try to find the complete query by looking for the end
                remaining = result_text[match.end():]
                # Look for semicolon or end of text
                end_match = re.search(r'(.*?)(;|\Z)', remaining, re.DOTALL)
                if end_match:
                    extracted += end_match.group(1) + (end_match.group(2) if end_match.group(2) else '')
            return extracted
        
        # Look for SQL starting with SELECT - capture complete query
        # Match from SELECT to semicolon, LIMIT, or end of text
        select_pattern = r'(SELECT\s+.*?)(?:;|(?=\n\n)|\Z)'
        match = re.search(select_pattern, result_text, re.DOTALL | re.IGNORECASE)
        if match:
            extracted = match.group(1).strip()
            # If query doesn't end with semicolon, try to find it
            if not extracted.endswith(';'):
                # Look ahead for semicolon
                remaining = result_text[match.end():]
                semicolon_match = re.search(r'^([^;]*;)', remaining, re.DOTALL)
                if semicolon_match:
                    extracted += semicolon_match.group(1)
            return extracted
        
        # Return the whole result if no SQL pattern found
        return result_text.strip()
    
    def _clean_extracted_sql(self, sql_text: Optional[str]) -> Optional[str]:
        """
        Clean extracted SQL from fallback text extraction.
        NOTE: This is only used when structured output parsing fails.
        Primary cleaning happens in Pydantic validator (SQLGenerationOutput.validate_sql_not_empty).
        
        CRITICAL: This method MUST reject placeholder SQL templates.
        """
        try:
            if not sql_text or not isinstance(sql_text, str):
                return sql_text

            s = sql_text.strip()
            
            # ROOT CAUSE FIX: Reject placeholder SQL templates immediately
            s_lower = s.lower()
            # Check for ALL placeholder patterns including AVG(column_name), SUM(column_name), etc.
            placeholder_patterns = [
                "table_name",
                "where condition",
                "column_name",
                "avg(column_name)",
                "sum(column_name)",
                "count(column_name)",
                "select * from table_name",
                "from table_name where"
            ]
            if any(pattern in s_lower for pattern in placeholder_patterns):
                logger.error(f"❌ ROOT CAUSE: Rejected placeholder SQL in _clean_extracted_sql: {s[:100]}...")
                return None  # Return None to prevent placeholder SQL from being used

            # If the LLM returned a JSON-like wrapper, try to extract sql_query field
            if s.startswith('{') or '"sql_query"' in s:
                try:
                    # Try to parse as JSON first
                    parsed = json.loads(s)
                    if isinstance(parsed, dict) and parsed.get('sql_query'):
                        s = parsed.get('sql_query')
                    else:
                        # Try to find JSON substring that contains sql_query
                        m = re.search(r'(\{[\s\S]*?"sql_query"[\s\S]*?\})', s, re.DOTALL)
                        if m:
                            try:
                                parsed2 = json.loads(m.group(1))
                                if isinstance(parsed2, dict) and parsed2.get('sql_query'):
                                    s = parsed2.get('sql_query')
                            except Exception:
                                pass
                except Exception:
                    # Not pure JSON - fall through to heuristic extraction
                    pass

            # Trim surrounding quotes if present
            if (s.startswith('"') and s.endswith('"')) or (s.startswith("'") and s.endswith("'")):
                s = s[1:-1]

            # CRITICAL: Remove "idididididididididididid" corruption pattern (same as Pydantic validator)
            import re
            s = re.sub(r'(id){3,}', ' ', s, flags=re.IGNORECASE)
            s = re.sub(r'([A-Za-z]+)(id){3,}([A-Za-z]+)', r'\1 \3', s, flags=re.IGNORECASE)
            s = re.sub(r'(id){3,}([A-Za-z]+)', r'\2', s, flags=re.IGNORECASE)
            s = re.sub(r'([A-Za-z]+)(id){3,}', r'\1', s, flags=re.IGNORECASE)

            # Unescape common JSON-style escapes
            s = s.replace('\\\\n', '\\n').replace('\\\\r', '\\r').replace('\\\\t', '\\t')
            s = s.replace('\\n', '\n').replace('\\r', '\r').replace('\\t', '\t')
            s = s.replace('\\\\\"', '\\"').replace('\\\\\\\'', "\\'")

            # Normalize whitespace
            s = re.sub(r'\s+', ' ', s)

            # Extract first SQL block starting with SELECT (best-effort)
            m = re.search(r'(?is)(SELECT[\s\S]*?;)', s)
            if m:
                cleaned = m.group(1).strip()
                return cleaned

            # If no semicolon-terminated block, extract from first SELECT to end
            m2 = re.search(r'(?is)(SELECT[\s\S]*)', s)
            if m2:
                return m2.group(1).strip()

            # Fallback: return trimmed string
            return s.strip()
        except Exception:
            return sql_text
    
    def _fix_clickhouse_groupby(self, sql_query: str) -> str:
        """Fix ClickHouse GROUP BY issues - ensure expressions match exactly, not aliases."""
        try:
            # Pattern: SELECT expression AS alias, ... GROUP BY alias (WRONG for ClickHouse)
            # Fix: Replace GROUP BY alias with the exact expression from SELECT
            
            # Extract SELECT clause
            select_match = re.search(r'SELECT\s+(.*?)\s+FROM', sql_query, re.IGNORECASE | re.DOTALL)
            if not select_match:
                return sql_query
            
            select_clause = select_match.group(1)
            
            # Extract GROUP BY clause
            group_by_match = re.search(r'GROUP\s+BY\s+(.*?)(?:\s+ORDER\s+BY|\s+LIMIT|\s*$)', sql_query, re.IGNORECASE | re.DOTALL)
            if not group_by_match:
                return sql_query
            
            group_by_clause = group_by_match.group(1).strip()
            
            # Find all aliases in SELECT: expression AS alias
            # Handle complex expressions like COALESCE(NULLIF(trimBoth(col), ''), 'Unknown') AS alias
            # More robust pattern to match expressions with nested parentheses
            select_aliases: Dict[str, str] = {}
            
            # Split SELECT clause by commas (but respect parentheses)
            parts = []
            current_part = ""
            paren_depth = 0
            for char in select_clause:
                if char == '(':
                    paren_depth += 1
                    current_part += char
                elif char == ')':
                    paren_depth -= 1
                    current_part += char
                elif char == ',' and paren_depth == 0:
                    if current_part.strip():
                        parts.append(current_part.strip())
                    current_part = ""
                else:
                    current_part += char
            if current_part.strip():
                parts.append(current_part.strip())
            
            # Extract aliases from each part
            for part in parts:
                as_match = re.search(r'(.+?)\s+AS\s+(\w+)\s*$', part, re.IGNORECASE)
                if as_match:
                    expression = as_match.group(1).strip()
                    alias = as_match.group(2).strip()
                    # Clean up expression (remove extra whitespace)
                    expression = re.sub(r'\s+', ' ', expression)
                    select_aliases[alias.lower()] = expression
            
            # Check if GROUP BY uses an alias that exists in SELECT
            group_by_parts = [part.strip() for part in group_by_clause.split(',')]
            fixed_parts = []
            changed = False
            
            for part in group_by_parts:
                part_lower = part.lower()
                # Check if this part is an alias
                if part_lower in select_aliases:
                    # Replace alias with expression
                    fixed_parts.append(select_aliases[part_lower])
                    logger.info(f"✅ Fixed GROUP BY: replaced alias '{part}' with expression '{select_aliases[part_lower]}'")
                    changed = True
                else:
                    # Keep as-is (might already be an expression)
                    fixed_parts.append(part)
            
            if changed:
                # Replace GROUP BY clause
                fixed_group_by = ', '.join(fixed_parts)
                fixed_query = re.sub(
                    r'GROUP\s+BY\s+' + re.escape(group_by_clause),
                    f'GROUP BY {fixed_group_by}',
                    sql_query,
                    flags=re.IGNORECASE
                )
                return fixed_query
            
            return sql_query
        except Exception as e:
            logger.debug(f"Could not fix ClickHouse GROUP BY: {e}")
            return sql_query
    
    async def _validate_sql(self, sql_query: str, data_source_id: str) -> Dict[str, Any]:
        """Validate SQL query."""
        try:
            # Use validation tool
            validation_tool = SQLValidationTool(self.data_service, async_session_factory=self.async_session_factory, data_source_id=data_source_id)
            # Determine dialect for validation
            db_type = None
            try:
                source_info = await self.data_service.get_data_source_by_id(data_source_id)
                if source_info:
                    db_type = source_info.get('db_type', '').lower() or source_info.get('type', '').lower()
            except Exception:
                db_type = None
            validation_result = await validation_tool._arun(sql_query, data_source_id=data_source_id, dialect=db_type)
            
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
        """
        Fallback SQL generation - should NOT be used in production.
        Returns None to prevent execution of placeholder SQL.
        """
        logger.error("❌ Fallback SQL generation should not be used - SQL generation failed")
        # Return None instead of placeholder SQL to prevent execution
        return None
    
    async def execute_query(
        self, 
        sql_query: str, 
        data_source_id: str,
        context: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """Execute SQL query against real data source (zero data-copy)"""
        try:
            logger.info(f"🔍 Executing SQL query (pre-sanitize preview): {str(sql_query)[:150]}...")

            # SQL is already cleaned by Pydantic validator in SQLGenerationOutput
            # No additional sanitization needed - trust the model validation
            sanitized_sql = sql_query.strip() if isinstance(sql_query, str) else sql_query

            # If sanitization changed the SQL, log and capture for triage
            try:
                if isinstance(sql_query, str) and isinstance(sanitized_sql, str) and sanitized_sql != sql_query:
                    logger.info("🔧 SQL sanitized before execution (changes detected).")
                    try:
                        handler = StructuredOutputHandler(SQLGenerationOutput)
                        handler._capture_raw_llm_output(sql_query, {"error_type": "sanitization", "errors": None})
                    except Exception:
                        logger.debug("Could not capture raw LLM output via handler")

                # Extra guard: reject SQL with leftover escape backslashes (likely malformed)
                if isinstance(sanitized_sql, str) and ('\\n' in sanitized_sql or '\\\\' in sanitized_sql):
                    logger.error("❌ Sanitized SQL still contains escape sequences - refusing to execute for safety")
                    return {
                        "success": False,
                        "error": "sanitization_failed",
                        "message": "The generated SQL contained unexpected escape sequences after sanitization and was not executed.",
                        "query": sanitized_sql
                    }
            except Exception:
                # If guard checks fail, fall back to original sanitized_sql
                pass
            
            # Get data source connection details
            data_source = await self._get_data_source(data_source_id)
            if not data_source:
                return {
                    "success": False,
                    "error": f"Data source {data_source_id} not found",
                    "user_message": f"I couldn't find the data source '{data_source_id}'. Please check your data source connection and try again.",
                    "query": sql_query
                }
            
            # Execute query using MultiEngineQueryService (zero data-copy)
            # This connects directly to the user's database/warehouse without copying data
            result = await self.multi_query_service.execute_query(
                query=sanitized_sql,
                data_source=data_source,
                optimization=True  # Enable query optimization
            )
            
            if result.get("success"):
                # CRITICAL: Limit data size for memory efficiency
                # Only keep a reasonable sample for chart/narration generation
                MAX_ROWS_FOR_PROCESSING = 1000  # Limit rows for AI processing
                raw_data = result.get("data", [])
                row_count = result.get("row_count", len(raw_data))
                
                # Sample data if too large (for chart/narration, we don't need all rows)
                if len(raw_data) > MAX_ROWS_FOR_PROCESSING:
                    logger.info(f"📊 Large result set ({len(raw_data)} rows), sampling {MAX_ROWS_FOR_PROCESSING} rows for processing")
                    # Take first N rows and last N rows for better representation
                    sample_size = MAX_ROWS_FOR_PROCESSING // 2
                    sampled_data = raw_data[:sample_size] + raw_data[-sample_size:]
                    processed_data = sampled_data
                    is_sampled = True
                else:
                    processed_data = raw_data
                    is_sampled = False
                
                logger.info(f"✅ Query executed successfully: {row_count} total rows, {len(processed_data)} rows for processing")
                return {
                    "success": True,
                    "data": processed_data,  # Use sampled data
                    "columns": result.get("columns", []),
                    "row_count": row_count,  # Original row count
                    "processed_row_count": len(processed_data),  # Actual rows in response
                    "is_sampled": is_sampled,  # Indicate if data was sampled
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
                error_msg = result.get("error", "Query execution failed")
                logger.error(f"❌ Query execution failed: {error_msg}")
                # Provide user-friendly error message
                user_message = "I couldn't execute your query. "
                if "timeout" in error_msg.lower() or "timed out" in error_msg.lower():
                    user_message += "The query took too long to execute. Please try a simpler query or add a LIMIT clause."
                elif "not found" in error_msg.lower() or "does not exist" in error_msg.lower():
                    user_message += "The table or column doesn't exist. Please check your query and data source schema."
                elif "syntax" in error_msg.lower() or "invalid" in error_msg.lower():
                    user_message += "There's a syntax error in the query. Please review the generated SQL."
                else:
                    user_message += "Please check your data source connection and try again."
                
                return {
                    "success": False,
                    "error": error_msg,
                    "user_message": user_message,
                    "query": sql_query
                }
                
        except Exception as e:
            error_msg = str(e)
            logger.error(f"❌ SQL execution error: {error_msg}", exc_info=True)
            return {
                "success": False,
                "error": error_msg,
                "user_message": "I encountered an unexpected error while executing your query. Please try again or contact support if the problem persists.",
                "query": sql_query
            }
    
    async def _get_data_source(self, data_source_id: str) -> Optional[Dict[str, Any]]:
        """Get data source details from the data service."""
        try:
            if not self.data_service:
                return None
            
            # Get data source metadata (not the actual data)
            result = await self.data_service.get_data_source(data_source_id)
            if result.get('success'):
                return result.get('data_source')
            else:
                logger.error(f"Failed to get data source {data_source_id}: {result.get('error')}")
                return None
        except Exception as e:
            logger.error(f"Error getting data source {data_source_id}: {e}")
            return None
    
    def _has_clickhouse_groupby_issue(self, sql_query: str) -> bool:
        """Check if query has GROUP BY alias issue (not expression match)."""
        try:
            # Extract SELECT and GROUP BY clauses
            select_match = re.search(r'SELECT\s+(.*?)\s+FROM', sql_query, re.IGNORECASE | re.DOTALL)
            group_by_match = re.search(r'GROUP\s+BY\s+(.*?)(?:\s+ORDER\s+BY|\s+LIMIT|\s*$)', sql_query, re.IGNORECASE | re.DOTALL)
            
            if not select_match or not group_by_match:
                return False  # Can't determine, assume OK
            
            select_clause = select_match.group(1)
            group_by_clause = group_by_match.group(1).strip()
            
            # Check if GROUP BY uses a simple alias (not an expression)
            # Pattern: GROUP BY alias_name (where alias_name is just a word, not a function call)
            if re.match(r'^[a-zA-Z_][a-zA-Z0-9_]*$', group_by_clause):
                # It's a simple identifier - check if it's an alias in SELECT
                # Look for "expression AS alias_name" in SELECT
                alias_pattern = rf'\bAS\s+{re.escape(group_by_clause)}\b'
                if re.search(alias_pattern, select_clause, re.IGNORECASE):
                    # Found alias usage - this is likely an issue for ClickHouse
                    return True
            
            return False  # Expression match or can't determine - assume OK
        except Exception:
            return False  # On error, assume OK (don't break valid SQL)
    
    def _is_valid_sql(self, sql_query: str) -> bool:
        """Basic validation that SQL looks valid (not corrupted)."""
        if not sql_query or len(sql_query.strip()) == 0:
            return False
        
        # Check for balanced parentheses
        paren_count = sql_query.count('(') - sql_query.count(')')
        if paren_count != 0:
            return False
        
        # Check for basic SQL structure
        if not re.search(r'\bSELECT\b', sql_query, re.IGNORECASE):
            return False
        
        # Check for obvious corruption (like starting with closing parens)
        if sql_query.strip().startswith(')'):
            return False
        
        return True

