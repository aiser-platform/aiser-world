"""
Enterprise-Grade LangGraph State Schema for Aiser Multi-Agent Workflow

This module defines TypedDict-based state schemas with:
- Modular sub-states for separation of concerns
- Strong typing for nested structures
- State versioning for backward-compatible migrations
- Immutable state snapshots with hash checksums for audit trails
- Pydantic validation wrapper for runtime safety
"""

import hashlib
import json
from typing import TypedDict, List, Dict, Optional, Any, Literal
from datetime import datetime
from pydantic import BaseModel, Field, validator
from enum import Enum


# ============================================================================
# Strongly-Typed Nested Structures
# ============================================================================

class QueryResultRow(TypedDict, total=False):
    """Strongly-typed query result row"""
    column_name: str
    value: Any
    type: str  # Data type: string, number, date, etc.


class InsightType(str, Enum):
    """Insight type enumeration"""
    TREND = "trend"
    KPI = "kpi"
    ANOMALY = "anomaly"
    DATA_QUALITY = "data_quality"


class ImpactLevel(str, Enum):
    """Impact/priority level enumeration"""
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"


class Insight(TypedDict, total=False):
    """Strongly-typed insight structure"""
    type: Literal["trend", "kpi", "anomaly", "data_quality"]
    title: str
    description: str
    confidence: float
    impact: Literal["low", "medium", "high"]
    category: Optional[str]
    data_points: Optional[List[Any]]


class Recommendation(TypedDict, total=False):
    """Strongly-typed recommendation structure"""
    action: str
    priority: Literal["low", "medium", "high"]
    rationale: str
    effort: Optional[Literal["low", "medium", "high"]]
    expected_impact: Optional[Literal["low", "medium", "high"]]
    confidence: Optional[float]


class ExecutionMetadata(TypedDict, total=False):
    """Strongly-typed execution metadata"""
    status: str
    timestamp: str
    execution_time_ms: int
    model_used: str
    analysis_mode: Optional[str]  # Analysis mode: standard/deep
    confidence_scores: Dict[str, float]
    routing_decision: Dict[str, Any]
    node_history: List[str]  # List of nodes executed
    retry_count: int
    error_count: int
    deep_analysis_charts: Optional[List[Dict[str, Any]]]  # Multiple charts from deep analysis
    reasoning_steps: Optional[List[Dict[str, Any]]]  # Step-by-step reasoning for streaming display


class StateSnapshot(TypedDict, total=False):
    """Immutable state snapshot for audit trails"""
    stage: str  # Workflow stage when snapshot was taken
    timestamp: str  # ISO format timestamp
    state_hash: str  # SHA-256 hash of state data
    state_data: Dict[str, Any]  # Serialized state at this point
    node_name: Optional[str]  # Node that created this snapshot


# ============================================================================
# Modular Sub-States for Separation of Concerns
# ============================================================================

class QueryState(TypedDict, total=False):
    """State related to query processing"""
    query: str  # User's natural language query
    data_source_id: Optional[str]  # Selected data source
    sql_query: Optional[str]  # Generated SQL
    query_result: Optional[List[QueryResultRow]]  # Executed query results
    query_result_columns: Optional[List[str]]  # Column names
    query_result_row_count: Optional[int]  # Number of rows
    query_execution_error: Optional[str]  # Query execution error if any
    query_intent: Optional[Dict[str, Any]]  # Query intent analysis: aggregation_type, grouping, time_series, etc.


class ChartState(TypedDict, total=False):
    """State related to chart generation"""
    echarts_config: Optional[Dict[str, Any]]  # ECharts configuration
    chart_data: Optional[List[Dict[str, Any]]]  # Data used for chart
    chart_type: Optional[str]  # Type of chart: bar, line, pie, etc.
    chart_title: Optional[str]  # Chart title
    chart_generation_error: Optional[str]  # Chart generation error if any


class InsightState(TypedDict, total=False):
    """State related to insights generation"""
    insights: List[Insight]  # Business insights
    recommendations: List[Recommendation]  # Actionable recommendations
    executive_summary: Optional[str]  # Executive summary text
    insights_generation_error: Optional[str]  # Insights generation error if any


class ExecutionState(TypedDict, total=False):
    """State related to workflow execution"""
    execution_metadata: ExecutionMetadata  # Performance metrics, routing decisions
    current_stage: str  # Current workflow stage for observability
    retry_count: int  # Number of retries attempted
    node_history: List[str]  # History of nodes executed
    error_history: List[Dict[str, Any]]  # History of errors for adaptive retry
    error: Optional[str]  # Error message if any step fails
    critical_failure: bool  # Whether a critical failure occurred
    progress_percentage: float  # Progress percentage (0.0-100.0) for end-user visibility
    progress_message: str  # Human-readable progress message for end-user


class ContextState(TypedDict, total=False):
    """State related to user and conversation context"""
    agent_context: Dict[str, Any]  # User/organization context
    conversation_history: List[Dict[str, Any]]  # Chat history
    user_id: str  # User ID
    organization_id: Optional[str]  # Organization ID (can be None)
    project_id: Optional[str]  # Project ID
    conversation_id: Optional[str]  # Conversation ID


# ============================================================================
# Main Workflow State
# ============================================================================

class AiserWorkflowState(TypedDict, total=False):
    """
    Main workflow state combining all sub-states.
    
    This TypedDict is used by LangGraph StateGraph for type-safe state management.
    All fields are optional to allow incremental state updates.
    """
    # State versioning
    state_version: str  # Version identifier for migration support (default: "1.0")
    
    # Query state
    query: str
    data_source_id: Optional[str]
    sql_query: Optional[str]
    query_result: Optional[List[QueryResultRow]]
    query_result_columns: Optional[List[str]]
    query_result_row_count: Optional[int]
    query_execution_error: Optional[str]
    
    # Chart state
    echarts_config: Optional[Dict[str, Any]]
    chart_data: Optional[List[Dict[str, Any]]]
    chart_type: Optional[str]
    chart_title: Optional[str]
    chart_generation_error: Optional[str]
    
    # Insight state
    insights: List[Insight]
    recommendations: List[Recommendation]
    executive_summary: Optional[str]
    insights_generation_error: Optional[str]
    
    # Execution state
    execution_metadata: ExecutionMetadata
    current_stage: str
    retry_count: int
    node_history: List[str]
    error_history: List[Dict[str, Any]]  # History of errors for adaptive retry
    error: Optional[str]
    critical_failure: bool
    progress_percentage: float  # Progress percentage (0.0-100.0)
    progress_message: str  # Human-readable progress message
    
    # Context state
    agent_context: Dict[str, Any]
    conversation_history: List[Dict[str, Any]]
    user_id: str
    organization_id: str
    project_id: Optional[str]
    conversation_id: Optional[str]
    
    # Audit trail
    state_snapshots: List[StateSnapshot]  # Immutable snapshots for audit trails


# ============================================================================
# Pydantic Validator Wrapper for Runtime Validation
# ============================================================================

class AiserWorkflowStateValidator(BaseModel):
    """
    Pydantic validator wrapper for AiserWorkflowState.
    
    This provides runtime validation before state transitions while maintaining
    TypedDict's structural clarity for LangGraph.
    """
    
    # State versioning
    state_version: str = Field(default="1.0", description="State schema version")
    
    # Query state
    query: str = Field(..., description="User's natural language query")
    data_source_id: Optional[str] = Field(None, description="Selected data source ID")
    sql_query: Optional[str] = Field(None, description="Generated SQL query")
    query_result: Optional[List[Dict[str, Any]]] = Field(None, description="Query execution results")
    query_result_columns: Optional[List[str]] = Field(None, description="Query result column names")
    query_result_row_count: Optional[int] = Field(None, ge=0, description="Number of rows in query result")
    query_execution_error: Optional[str] = Field(None, description="Query execution error")
    
    # Chart state
    echarts_config: Optional[Dict[str, Any]] = Field(None, description="ECharts configuration")
    chart_data: Optional[List[Dict[str, Any]]] = Field(None, description="Chart data")
    chart_type: Optional[str] = Field(None, description="Chart type")
    chart_title: Optional[str] = Field(None, description="Chart title")
    chart_generation_error: Optional[str] = Field(None, description="Chart generation error")
    
    # Insight state
    insights: List[Dict[str, Any]] = Field(default_factory=list, description="Business insights")
    recommendations: List[Dict[str, Any]] = Field(default_factory=list, description="Recommendations")
    executive_summary: Optional[str] = Field(None, description="Executive summary")
    insights_generation_error: Optional[str] = Field(None, description="Insights generation error")
    
    # Execution state
    execution_metadata: Dict[str, Any] = Field(default_factory=dict, description="Execution metadata")
    current_stage: str = Field(default="start", description="Current workflow stage")
    retry_count: int = Field(default=0, ge=0, description="Number of retries")
    node_history: List[str] = Field(default_factory=list, description="Node execution history")
    error_history: List[Dict[str, Any]] = Field(default_factory=list, description="History of errors for adaptive retry")
    error: Optional[str] = Field(None, description="Error message")
    critical_failure: bool = Field(default=False, description="Critical failure flag")
    progress_percentage: float = Field(default=0.0, ge=0.0, le=100.0, description="Progress percentage")
    progress_message: str = Field(default="Starting workflow...", description="Progress message")
    
    # Context state
    agent_context: Dict[str, Any] = Field(default_factory=dict, description="Agent context")
    conversation_history: List[Dict[str, Any]] = Field(default_factory=list, description="Conversation history")
    user_id: str = Field(default="", description="User ID")
    organization_id: Optional[str] = Field(None, description="Organization ID")
    project_id: Optional[str] = Field(None, description="Project ID")
    conversation_id: Optional[str] = Field(None, description="Conversation ID")
    
    # Audit trail
    state_snapshots: List[Dict[str, Any]] = Field(default_factory=list, description="State snapshots for audit")
    
    @validator('state_version')
    def validate_state_version(cls, v):
        """Ensure state version is valid"""
        if not v or not isinstance(v, str):
            return "1.0"
        return v
    
    @validator('query')
    def validate_query_not_empty(cls, v):
        """Ensure query is not empty"""
        if not v or not v.strip():
            raise ValueError("Query cannot be empty")
        return v.strip()
    
    @validator('insights', 'recommendations', pre=True)
    def validate_list_fields(cls, v):
        """
        Ensure list fields are lists of dictionaries.
        Uses pre=True to run BEFORE type checking, allowing conversion of strings to dicts.
        """
        if v is None:
            return []
        if not isinstance(v, list):
            # If not a list, try to convert (e.g., single string)
            if isinstance(v, str):
                return [{
                    "type": "general",
                    "title": "Insight 1",
                    "description": v,
                    "confidence": 0.7,
                    "impact": "medium"
                }]
            return []
        
        # CRITICAL: Convert string items to dictionaries
        import logging
        logger = logging.getLogger(__name__)
        
        validated = []
        for idx, item in enumerate(v):
            if isinstance(item, str):
                # Convert string to dictionary format
                # For insights, use insight structure; for recommendations, use recommendation structure
                # Since validator applies to both fields, we'll use a generic structure that works for both
                # The field-specific structure will be handled by the Field definition
                validated.append({
                    "type": "general",
                    "title": f"Item {idx + 1}",
                    "description": item,
                    "confidence": 0.7,
                    "impact": "medium"
                })
                logger.debug(f"✅ Converted string {idx + 1} to dict in validator (pre=True)")
            elif isinstance(item, dict):
                validated.append(item)
            else:
                logger.warning(f"⚠️ Skipping invalid insight/recommendation item: {type(item)}")
        
        return validated
    
    class Config:
        """Pydantic config"""
        extra = "allow"  # Allow extra fields for flexibility
        validate_assignment = True  # Validate on assignment
    
    def to_typed_dict(self) -> AiserWorkflowState:
        """Convert Pydantic model to TypedDict for LangGraph"""
        return {
            "state_version": self.state_version,
            "query": self.query,
            "data_source_id": self.data_source_id,
            "sql_query": self.sql_query,
            "query_result": self.query_result,
            "query_result_columns": self.query_result_columns,
            "query_result_row_count": self.query_result_row_count,
            "query_execution_error": self.query_execution_error,
            "echarts_config": self.echarts_config,
            "chart_data": self.chart_data,
            "chart_type": self.chart_type,
            "chart_title": self.chart_title,
            "chart_generation_error": self.chart_generation_error,
            "insights": self.insights,
            "recommendations": self.recommendations,
            "executive_summary": self.executive_summary,
            "insights_generation_error": self.insights_generation_error,
            "execution_metadata": self.execution_metadata,
            "current_stage": self.current_stage,
            "retry_count": self.retry_count,
            "node_history": self.node_history,
            "error": self.error,
            "critical_failure": self.critical_failure,
            "agent_context": self.agent_context,
            "conversation_history": self.conversation_history,
            "user_id": self.user_id,
            "organization_id": self.organization_id,
            "project_id": self.project_id,
            "conversation_id": self.conversation_id,
            "state_snapshots": self.state_snapshots,
        }
    
    @classmethod
    def from_typed_dict(cls, state: AiserWorkflowState) -> "AiserWorkflowStateValidator":
        """Create validator from TypedDict"""
        return cls(**state)


# ============================================================================
# State Snapshotting Utilities
# ============================================================================

def create_state_snapshot(
    state: AiserWorkflowState,
    stage: str,
    node_name: Optional[str] = None
) -> StateSnapshot:
    """
    Create an immutable state snapshot with hash checksum for audit trails.
    
    Args:
        state: Current workflow state
        stage: Workflow stage when snapshot is taken
        node_name: Optional node name that created this snapshot
    
    Returns:
        StateSnapshot with hash checksum
    """
    # Serialize state to JSON for hashing (exclude snapshots to avoid recursion)
    state_copy = dict(state)
    state_copy.pop("state_snapshots", None)  # Remove snapshots to avoid recursion
    state_json = json.dumps(state_copy, sort_keys=True, default=str)
    
    # Generate SHA-256 hash
    state_hash = hashlib.sha256(state_json.encode('utf-8')).hexdigest()
    
    return {
        "stage": stage,
        "timestamp": datetime.utcnow().isoformat() + "Z",
        "state_hash": state_hash,
        "state_data": state_copy,
        "node_name": node_name
    }


def verify_state_snapshot(snapshot: StateSnapshot) -> bool:
    """
    Verify the integrity of a state snapshot by recomputing its hash.
    
    Args:
        snapshot: State snapshot to verify
    
    Returns:
        True if hash matches, False otherwise
    """
    state_data = snapshot.get("state_data", {})
    state_json = json.dumps(state_data, sort_keys=True, default=str)
    computed_hash = hashlib.sha256(state_json.encode('utf-8')).hexdigest()
    stored_hash = snapshot.get("state_hash", "")
    
    return computed_hash == stored_hash


# ============================================================================
# State Versioning Utilities
# ============================================================================

def migrate_state(state: AiserWorkflowState, target_version: str = "1.0") -> AiserWorkflowState:
    """
    Migrate state to target version (backward-compatible migrations).
    
    Args:
        state: Current state
        target_version: Target version to migrate to
    
    Returns:
        Migrated state
    """
    current_version = state.get("state_version", "1.0")
    
    if current_version == target_version:
        return state
    
    # Future: Add migration logic here as state schema evolves
    # For now, just ensure version is set
    migrated_state = dict(state)
    migrated_state["state_version"] = target_version
    
    return migrated_state


def validate_state_version(state: AiserWorkflowState) -> bool:
    """
    Validate that state version is supported.
    
    Args:
        state: State to validate
    
    Returns:
        True if version is supported, False otherwise
    """
    version = state.get("state_version", "1.0")
    supported_versions = ["1.0"]  # Add new versions as schema evolves
    
    return version in supported_versions

