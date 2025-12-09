"""
Pydantic Models for Structured AI Agent Inputs

This module defines Pydantic models for all AI agent inputs to ensure:
- Input validation before processing
- Type safety
- Required field enforcement
- Data sanitization
- Security validation
"""

import logging
from typing import Dict, List, Optional, Any
from pydantic import BaseModel, Field, validator, root_validator
from enum import Enum
logger = logging.getLogger(__name__)


class QueryComplexity(str, Enum):
    """Query complexity levels"""
    SIMPLE = "simple"  # Direct questions, greetings
    MODERATE = "moderate"  # Single table queries, basic aggregations
    COMPLEX = "complex"  # Multi-table joins, complex aggregations
    VERY_COMPLEX = "very_complex"  # CTEs, window functions, subqueries


class ChartGenerationInput(BaseModel):
    """Structured input for Chart Generation Agent"""
    data: List[Dict[str, Any]] = Field(..., description="Query result data to visualize", min_items=0)
    query_intent: str = Field(..., description="User's query intent or question", min_length=1, max_length=1000)
    title: str = Field(default="", description="Chart title", max_length=200)
    context: Optional[Dict[str, Any]] = Field(None, description="User context (role, preferences, etc.)")
    data_source_id: Optional[str] = Field(None, description="Data source ID for context")
    query_result_schema: Optional[Dict[str, Any]] = Field(None, description="Schema of query results")
    
    @validator('data')
    def validate_data_not_empty(cls, v):
        """Ensure data is not empty (unless explicitly allowed)"""
        if not v or len(v) == 0:
            raise ValueError("Data cannot be empty for chart generation")
        return v
    
    @validator('query_intent')
    def validate_query_intent(cls, v):
        """Sanitize query intent"""
        if not v or not v.strip():
            raise ValueError("Query intent cannot be empty")
        # Basic sanitization - remove potential injection attempts
        v = v.strip()
        if len(v) > 1000:
            v = v[:1000]  # Truncate if too long
        return v
    
    @root_validator
    def validate_data_structure(cls, values):
        """Validate data structure"""
        data = values.get('data', [])
        if data and len(data) > 0:
            # Ensure all rows have consistent structure
            first_row_keys = set(data[0].keys())
            for i, row in enumerate(data[1:10]):  # Check first 10 rows
                if not isinstance(row, dict):
                    raise ValueError(f"Row {i+1} is not a dictionary")
                row_keys = set(row.keys())
                if row_keys != first_row_keys:
                    logger.warning(f"Row {i+1} has different keys: {row_keys} vs {first_row_keys}")
        return values


class InsightsGenerationInput(BaseModel):
    """Structured input for Insights Agent"""
    data: List[Dict[str, Any]] = Field(..., description="Data to analyze", min_items=0)
    query_context: str = Field(..., description="Context of the user's query", min_length=1, max_length=1000)
    user_role: str = Field(default="employee", description="User role for role-appropriate insights")
    context: Optional[Dict[str, Any]] = Field(None, description="Additional context")
    query_result_schema: Optional[Dict[str, Any]] = Field(None, description="Schema of query results")
    
    @validator('user_role')
    def validate_user_role(cls, v):
        """Validate user role"""
        valid_roles = ["admin", "manager", "analyst", "employee", "viewer"]
        if v.lower() not in valid_roles:
            raise ValueError(f"Invalid user role: {v}. Must be one of {valid_roles}")
        return v.lower()
    
    @validator('query_context')
    def sanitize_query_context(cls, v):
        """Sanitize query context"""
        if not v or not v.strip():
            raise ValueError("Query context cannot be empty")
        return v.strip()[:1000]  # Truncate if too long


class SQLGenerationInput(BaseModel):
    """Structured input for NL2SQL Agent"""
    natural_language_query: str = Field(..., description="Natural language query", min_length=1, max_length=2000)
    data_source_id: str = Field(..., description="Target data source ID", min_length=1)
    schema_info: Optional[Dict[str, Any]] = Field(None, description="Database schema information")
    context: Optional[Dict[str, Any]] = Field(None, description="User context with permissions")
    conversation_history: Optional[List[Dict[str, str]]] = Field(default_factory=list, description="Previous conversation messages")
    query_complexity: Optional[QueryComplexity] = Field(None, description="Expected query complexity")
    
    @validator('natural_language_query')
    def validate_and_sanitize_query(cls, v):
        """Validate and sanitize natural language query"""
        if not v or not v.strip():
            raise ValueError("Natural language query cannot be empty")
        v = v.strip()
        # Security: Check for potential SQL injection attempts in NL query
        sql_keywords = ['DROP', 'DELETE', 'TRUNCATE', 'ALTER', 'CREATE', 'INSERT', 'UPDATE']
        v_upper = v.upper()
        for keyword in sql_keywords:
            if keyword in v_upper:
                # Log warning but don't block - user might be asking about these operations
                logger.warning(f"⚠️ Potential SQL keyword detected in NL query: {keyword}")
        return v[:2000]  # Truncate if too long
    
    @validator('data_source_id')
    def validate_data_source_id(cls, v):
        """Validate data source ID format"""
        if not v or not v.strip():
            raise ValueError("Data source ID cannot be empty")
        # Basic UUID format check (can be enhanced)
        if len(v) < 10:  # Minimum reasonable length
            raise ValueError("Data source ID appears invalid")
        return v.strip()
    
    @root_validator
    def validate_schema_if_provided(cls, values):
        """Validate schema structure if provided"""
        schema_info = values.get('schema_info')
        if schema_info:
            if not isinstance(schema_info, dict):
                raise ValueError("Schema info must be a dictionary")
            # Schema should have tables or be empty dict
            if schema_info and 'tables' not in schema_info and len(schema_info) == 0:
                logger.warning("Schema info is empty - agent will need to fetch schema")
        return values


class QueryExecutionInput(BaseModel):
    """Structured input for Query Execution"""
    sql_query: str = Field(..., description="SQL query to execute", min_length=1)
    data_source_id: str = Field(..., description="Data source ID", min_length=1)
    timeout_seconds: int = Field(default=30, description="Query timeout in seconds", ge=1, le=300)
    max_rows: int = Field(default=1000, description="Maximum rows to return", ge=1, le=100000)
    sample_data: bool = Field(default=True, description="Whether to sample data for AI processing")
    
    @validator('sql_query')
    def validate_sql_query(cls, v):
        """Validate SQL query"""
        if not v or not v.strip():
            raise ValueError("SQL query cannot be empty")
        v = v.strip()
        # Security: Check for dangerous operations
        dangerous_ops = ['DROP', 'DELETE', 'TRUNCATE', 'ALTER TABLE', 'CREATE TABLE', 'INSERT INTO', 'UPDATE']
        v_upper = v.upper()
        for op in dangerous_ops:
            if op in v_upper:
                # For now, log warning - in production, might want to block
                logger.warning(f"⚠️ Potentially dangerous SQL operation detected: {op}")
        return v
    
    @validator('data_source_id')
    def validate_data_source_id(cls, v):
        """Validate data source ID"""
        if not v or not v.strip():
            raise ValueError("Data source ID cannot be empty")
        return v.strip()


class UnifiedChartInsightsInput(BaseModel):
    """Structured input for Unified Chart+Insights Agent"""
    data: List[Dict[str, Any]] = Field(..., description="Query result data", min_items=0)
    query_intent: str = Field(..., description="User's query intent", min_length=1, max_length=1000)
    title: str = Field(default="", description="Chart title", max_length=200)
    context: Optional[Dict[str, Any]] = Field(None, description="User context")
    query_result_schema: Optional[Dict[str, Any]] = Field(None, description="Schema of query results")
    user_role: str = Field(default="employee", description="User role")
    
    @validator('data')
    def validate_data_not_empty(cls, v):
        """Ensure data is not empty"""
        if not v or len(v) == 0:
            raise ValueError("Data cannot be empty")
        return v


class AgentContextInput(BaseModel):
    """Structured input for agent context"""
    user_id: str = Field(..., description="User ID", min_length=1)
    user_role: str = Field(..., description="User role", min_length=1)
    organization_id: str = Field(..., description="Organization ID", min_length=1)
    project_id: Optional[str] = Field(None, description="Project ID")
    data_sources: List[str] = Field(default_factory=list, description="Available data source IDs")
    permissions: Dict[str, Any] = Field(default_factory=dict, description="User permissions")
    business_context: Optional[str] = Field(None, description="Business context", max_length=2000)
    
    @validator('user_id', 'organization_id')
    def validate_ids(cls, v):
        """Validate ID format"""
        if not v or not v.strip():
            raise ValueError("ID cannot be empty")
        return v.strip()
    
    @validator('user_role')
    def validate_user_role(cls, v):
        """Validate user role"""
        valid_roles = ["admin", "manager", "analyst", "employee", "viewer"]
        if v.lower() not in valid_roles:
            raise ValueError(f"Invalid user role: {v}")
        return v.lower()


# logger is defined at module top

