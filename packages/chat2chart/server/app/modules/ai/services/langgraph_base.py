"""
Base Infrastructure for LangGraph Nodes with Enterprise Features

Provides:
- Base classes for LangGraph nodes
- Automatic state validation using Pydantic
- State snapshotting decorators
- Error handling decorators
- Retry configuration helpers
- State versioning utilities
"""

import logging
import functools
import time
import json
import hashlib
from typing import Callable, Optional, Any, Dict, List
from datetime import datetime

from app.modules.ai.schemas.graph_state import (
    AiserWorkflowState,
    AiserWorkflowStateValidator,
    create_state_snapshot,
    verify_state_snapshot,
    migrate_state,
    validate_state_version
)

logger = logging.getLogger(__name__)


# ============================================================================
# State Normalization Helper (Centralized)
# ============================================================================

def _normalize_state_insights(state: AiserWorkflowState) -> AiserWorkflowState:
    """
    Normalize insights and recommendations in state to ensure they're always dicts.
    This is called BEFORE validation to prevent validation errors.
    CRITICAL: Modifies state in-place to ensure changes persist.
    """
    def normalize_items(items: Any) -> List[Dict[str, Any]]:
        """Convert string items to dictionary format"""
        if not isinstance(items, list):
            return []
        normalized = []
        for idx, item in enumerate(items):
            if isinstance(item, str):
                # Convert string to dictionary
                normalized.append({
                    "type": "general",
                    "title": f"Insight {idx + 1}",
                    "description": item,
                    "confidence": 0.7,
                    "impact": "medium"
                })
                logger.debug(f"✅ Normalized string insight {idx + 1} to dict")
            elif isinstance(item, dict):
                normalized.append(item)
            else:
                logger.warning(f"⚠️ Skipping invalid insight item type: {type(item)}")
        return normalized
    
    # Normalize insights - CRITICAL: Always normalize, even if empty list
    insights = state.get("insights", [])
    if insights is not None:
        normalized_insights = normalize_items(insights)
        state["insights"] = normalized_insights
        if insights and any(isinstance(i, str) for i in insights):
            logger.info(f"🔧 Normalized {sum(1 for i in insights if isinstance(i, str))} string insights to dicts")
    
    # Normalize recommendations - CRITICAL: Always normalize, even if empty list
    recommendations = state.get("recommendations", [])
    if recommendations is not None:
        # For recommendations, use recommendation structure
        normalized_recs = []
        for idx, item in enumerate(recommendations):
            if isinstance(item, str):
                normalized_recs.append({
                    "title": f"Recommendation {idx + 1}",
                    "description": item,
                    "priority": "medium",
                    "impact": "medium"
                })
                logger.debug(f"✅ Normalized string recommendation {idx + 1} to dict")
            elif isinstance(item, dict):
                normalized_recs.append(item)
            else:
                logger.warning(f"⚠️ Skipping invalid recommendation item type: {type(item)}")
        state["recommendations"] = normalized_recs
        if recommendations and any(isinstance(r, str) for r in recommendations):
            logger.info(f"🔧 Normalized {sum(1 for r in recommendations if isinstance(r, str))} string recommendations to dicts")
    
    return state


# ============================================================================
# State Validation Decorator
# ============================================================================

def validate_state_transition(
    validate_input: bool = True,
    validate_output: bool = True,
    snapshot_before: bool = False,
    snapshot_after: bool = True
):
    """
    Decorator to validate state before/after node execution and create snapshots.
    
    Args:
        validate_input: Whether to validate input state
        validate_output: Whether to validate output state
        snapshot_before: Whether to create snapshot before execution
        snapshot_after: Whether to create snapshot after execution
    """
    def decorator(func: Callable) -> Callable:
        @functools.wraps(func)
        async def wrapper(state: AiserWorkflowState, **kwargs) -> AiserWorkflowState:
            node_name = func.__name__
            
            try:
                # Migrate state to current version if needed
                if not validate_state_version(state):
                    logger.warning(f"⚠️ State version mismatch in {node_name}, migrating...")
                    state = migrate_state(state)
                
                # Validate input state
                if validate_input:
                    try:
                        # CRITICAL: Normalize insights/recommendations BEFORE validation
                        # Make a copy to avoid modifying original, then normalize
                        state_copy = dict(state)
                        state_copy = _normalize_state_insights(state_copy)
                        # Update original state with normalized values
                        if "insights" in state_copy:
                            state["insights"] = state_copy["insights"]
                        if "recommendations" in state_copy:
                            state["recommendations"] = state_copy["recommendations"]
                        
                        validator = AiserWorkflowStateValidator.from_typed_dict(state)
                        # Re-validate by converting back (Pydantic will catch issues)
                        validated_state = validator.to_typed_dict()
                        # Update state with validated values
                        state.update(validated_state)
                    except Exception as e:
                        logger.error(f"❌ Input state validation failed in {node_name}: {e}", exc_info=True)
                        # Try to normalize and retry validation once
                        try:
                            state = _normalize_state_insights(state)
                            validator = AiserWorkflowStateValidator.from_typed_dict(state)
                            state = validator.to_typed_dict()
                            logger.info(f"✅ Retry validation succeeded after normalization in {node_name}")
                        except Exception as retry_e:
                            logger.error(f"❌ Retry validation also failed in {node_name}: {retry_e}")
                            state["error"] = f"State validation error: {str(e)}"
                            state["critical_failure"] = True
                            return state
                
                # Create snapshot before execution if requested
                if snapshot_before:
                    snapshot = create_state_snapshot(state, state.get("current_stage", "unknown"), node_name)
                    state.setdefault("state_snapshots", []).append(snapshot)
                    logger.debug(f"📸 Snapshot created before {node_name} at stage {snapshot['stage']}")
                
                # Execute node
                result_state = await func(state, **kwargs)
                
                # Validate output state
                if validate_output:
                    try:
                        # CRITICAL: Normalize insights/recommendations BEFORE validation
                        # Make a copy to avoid modifying original, then normalize
                        result_copy = dict(result_state)
                        result_copy = _normalize_state_insights(result_copy)
                        # Update original state with normalized values
                        if "insights" in result_copy:
                            result_state["insights"] = result_copy["insights"]
                        if "recommendations" in result_copy:
                            result_state["recommendations"] = result_copy["recommendations"]
                        
                        validator = AiserWorkflowStateValidator.from_typed_dict(result_state)
                        validated_state = validator.to_typed_dict()
                        # Update state with validated values
                        result_state.update(validated_state)
                    except Exception as e:
                        logger.error(f"❌ Output state validation failed in {node_name}: {e}", exc_info=True)
                        # Try to normalize and retry validation once
                        try:
                            result_state = _normalize_state_insights(result_state)
                            validator = AiserWorkflowStateValidator.from_typed_dict(result_state)
                            result_state = validator.to_typed_dict()
                            logger.info(f"✅ Retry validation succeeded after normalization in {node_name}")
                        except Exception as retry_e:
                            logger.error(f"❌ Retry validation also failed in {node_name}: {retry_e}")
                            result_state["error"] = f"State validation error: {str(e)}"
                            result_state["critical_failure"] = True
                            return result_state
                
                # Create snapshot after execution if requested
                if snapshot_after:
                    snapshot = create_state_snapshot(
                        result_state,
                        result_state.get("current_stage", "unknown"),
                        node_name
                    )
                    result_state.setdefault("state_snapshots", []).append(snapshot)
                    logger.debug(f"📸 Snapshot created after {node_name} at stage {snapshot['stage']}")
                
                return result_state
                
            except Exception as e:
                logger.error(f"❌ Node {node_name} failed with exception: {e}", exc_info=True)
                state["error"] = f"Node {node_name} error: {str(e)}"
                state["critical_failure"] = True
                return state
        
        return wrapper
    return decorator


# ============================================================================
# Error Handling Decorator
# ============================================================================

def handle_node_errors(
    retry_on_error: bool = False,
    max_retries: int = 0,
    error_message: Optional[str] = None
):
    """
    Decorator to handle errors in node execution with optional retry.
    
    Args:
        retry_on_error: Whether to retry on error (LangGraph handles retries separately)
        max_retries: Maximum retry attempts (if retry_on_error is True)
        error_message: Custom error message prefix
    """
    def decorator(func: Callable) -> Callable:
        @functools.wraps(func)
        async def wrapper(state: AiserWorkflowState, **kwargs) -> AiserWorkflowState:
            node_name = func.__name__
            retry_count = state.get("retry_count", 0)
            
            try:
                result = await func(state, **kwargs)
                
                # Clear error if execution succeeded
                if result.get("error"):
                    result.pop("error", None)
                
                return result
                
            except Exception as e:
                error_msg = f"{error_message or f'Node {node_name}'} failed: {str(e)}"
                logger.error(f"❌ {error_msg}", exc_info=True)
                
                state["error"] = error_msg
                state["retry_count"] = retry_count + 1
                
                # Mark as critical failure for certain error types
                error_str = str(e).lower()
                critical_keywords = [
                    "connection", "authentication", "permission denied",
                    "data source not found", "cannot connect"
                ]
                if any(keyword in error_str for keyword in critical_keywords):
                    state["critical_failure"] = True
                
                return state
        
        return wrapper
    return decorator


# ============================================================================
# Base Node Class
# ============================================================================

class BaseLangGraphNode:
    """
    Base class for LangGraph nodes with enterprise features.
    
    Provides:
    - Automatic state validation
    - State snapshotting
    - Error handling
    - Performance tracking
    """
    
    def __init__(
        self,
        node_name: str,
        snapshot_on_entry: bool = False,  # Performance: Reduced from True
        snapshot_on_exit: bool = False,   # Performance: Reduced from True
        validate_state: bool = True
    ):
        self.node_name = node_name
        self.snapshot_on_entry = snapshot_on_entry
        self.snapshot_on_exit = snapshot_on_exit
        self.validate_state = validate_state
    
    async def execute(self, state: AiserWorkflowState, **kwargs) -> AiserWorkflowState:
        """
        Execute the node. Subclasses should override this method.
        
        Args:
            state: Current workflow state
            **kwargs: Additional arguments
        
        Returns:
            Updated workflow state
        """
        start_time = time.time()
        
        try:
            # Update current stage
            state["current_stage"] = self.node_name
            
            # Add to node history
            node_history = state.get("node_history", [])
            node_history.append(self.node_name)
            state["node_history"] = node_history
            
            # Create snapshot on entry if requested
            if self.snapshot_on_entry:
                snapshot = create_state_snapshot(state, state.get("current_stage", "unknown"), self.node_name)
                state.setdefault("state_snapshots", []).append(snapshot)
            
            # Validate state if requested
            if self.validate_state:
                try:
                    validator = AiserWorkflowStateValidator.from_typed_dict(state)
                    state = validator.to_typed_dict()
                except Exception as e:
                    logger.error(f"❌ State validation failed in {self.node_name}: {e}")
                    state["error"] = f"State validation error: {str(e)}"
                    return state
            
            # Execute node logic (to be implemented by subclasses)
            result_state = await self._execute_node(state, **kwargs)
            
            # Create snapshot on exit if requested
            if self.snapshot_on_exit:
                snapshot = create_state_snapshot(
                    result_state,
                    result_state.get("current_stage", "unknown"),
                    self.node_name
                )
                result_state.setdefault("state_snapshots", []).append(snapshot)
            
            # Update execution metadata
            execution_time_ms = int((time.time() - start_time) * 1000)
            metadata = result_state.get("execution_metadata", {})
            metadata.setdefault("node_history", []).append(self.node_name)
            if "execution_time_ms" not in metadata:
                metadata["execution_time_ms"] = 0
            metadata["execution_time_ms"] += execution_time_ms
            result_state["execution_metadata"] = metadata
            
            logger.info(f"✅ Node {self.node_name} completed in {execution_time_ms}ms")
            
            return result_state
            
        except Exception as e:
            logger.error(f"❌ Node {self.node_name} failed: {e}", exc_info=True)
            state["error"] = f"Node {self.node_name} error: {str(e)}"
            state["critical_failure"] = True
            return state
    
    async def _execute_node(self, state: AiserWorkflowState, **kwargs) -> AiserWorkflowState:
        """
        Subclasses should implement this method with their node logic.
        
        Args:
            state: Current workflow state
            **kwargs: Additional arguments
        
        Returns:
            Updated workflow state
        """
        raise NotImplementedError("Subclasses must implement _execute_node")


# ============================================================================
# Retry Configuration Helpers
# ============================================================================

class RetryConfig:
    """Configuration for retry mechanisms"""
    
    def __init__(
        self,
        max_retries: int = 3,
        initial_delay: float = 1.0,
        max_delay: float = 60.0,
        exponential_base: float = 2.0,
        jitter: bool = True
    ):
        self.max_retries = max_retries
        self.initial_delay = initial_delay
        self.max_delay = max_delay
        self.exponential_base = exponential_base
        self.jitter = jitter
    
    def get_delay(self, attempt: int) -> float:
        """
        Calculate delay for retry attempt using exponential backoff.
        
        Args:
            attempt: Retry attempt number (0-indexed)
        
        Returns:
            Delay in seconds
        """
        delay = self.initial_delay * (self.exponential_base ** attempt)
        delay = min(delay, self.max_delay)
        
        if self.jitter:
            import random
            delay = delay * (0.5 + random.random() * 0.5)  # Add 0-50% jitter
        
        return delay


# Predefined retry configurations for different node types
RETRY_CONFIGS = {
    "sql_execution": RetryConfig(max_retries=3, initial_delay=1.0, max_delay=10.0),
    "chart_generation": RetryConfig(max_retries=2, initial_delay=2.0, max_delay=8.0),
    "insights_generation": RetryConfig(max_retries=2, initial_delay=2.0, max_delay=8.0),
    "llm_call": RetryConfig(max_retries=2, initial_delay=1.0, max_delay=5.0),
    "default": RetryConfig(max_retries=2, initial_delay=1.0, max_delay=5.0)
}


def get_retry_config(node_type: str) -> RetryConfig:
    """
    Get retry configuration for a node type.
    
    Args:
        node_type: Type of node (sql_execution, chart_generation, etc.)
    
    Returns:
        RetryConfig for the node type
    """
    return RETRY_CONFIGS.get(node_type, RETRY_CONFIGS["default"])


# ============================================================================
# State Snapshot Manager
# ============================================================================

class StateSnapshotManager:
    """Manager for state snapshots with hash verification"""
    
    @staticmethod
    def create_snapshot(
        state: AiserWorkflowState,
        stage: str,
        node_name: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Create and add a state snapshot.
        
        Args:
            state: Current workflow state
            stage: Workflow stage
            node_name: Node name
        
        Returns:
            Snapshot dictionary
        """
        snapshot = create_state_snapshot(state, stage, node_name)
        state.setdefault("state_snapshots", []).append(snapshot)
        return snapshot
    
    @staticmethod
    def verify_snapshot(snapshot: Dict[str, Any]) -> bool:
        """
        Verify snapshot integrity.
        
        Args:
            snapshot: Snapshot to verify
        
        Returns:
            True if valid, False otherwise
        """
        return verify_state_snapshot(snapshot)
    
    @staticmethod
    def get_snapshots_by_stage(state: AiserWorkflowState, stage: str) -> List[Dict[str, Any]]:
        """
        Get all snapshots for a specific stage.
        
        Args:
            state: Workflow state
            stage: Stage name
        
        Returns:
            List of snapshots for the stage
        """
        snapshots = state.get("state_snapshots", [])
        return [s for s in snapshots if s.get("stage") == stage]
    
    @staticmethod
    def get_latest_snapshot(state: AiserWorkflowState) -> Optional[Dict[str, Any]]:
        """
        Get the most recent snapshot.
        
        Args:
            state: Workflow state
        
        Returns:
            Latest snapshot or None
        """
        snapshots = state.get("state_snapshots", [])
        if not snapshots:
            return None
        return max(snapshots, key=lambda s: s.get("timestamp", ""))


# ============================================================================
# Event Emission Helpers for Observable State Diffs
# ============================================================================

def compute_state_diff(old_state: AiserWorkflowState, new_state: AiserWorkflowState) -> Dict[str, Any]:
    """
    Compute state diff between two states for event streaming.
    
    Args:
        old_state: Previous state
        new_state: New state
    
    Returns:
        Dictionary of changed fields with old and new values
    """
    diff = {}
    
    # Compare all fields
    all_keys = set(old_state.keys()) | set(new_state.keys())
    
    for key in all_keys:
        old_value = old_state.get(key)
        new_value = new_state.get(key)
        
        # Skip snapshots to avoid recursion
        if key == "state_snapshots":
            continue
        
        # Check if value changed
        if old_value != new_value:
            diff[key] = {
                "old": old_value,
                "new": new_value
            }
    
    return diff


def emit_state_event(
    event_type: str,
    state: AiserWorkflowState,
    node_name: Optional[str] = None,
    old_state: Optional[AiserWorkflowState] = None
) -> Dict[str, Any]:
    """
    Create a structured event for state changes.
    
    Args:
        event_type: Type of event (node_start, node_end, state_update, etc.)
        state: Current state
        node_name: Optional node name
        old_state: Optional previous state for diff computation
    
    Returns:
        Structured event dictionary
    """
    event = {
        "type": event_type,
        "timestamp": datetime.utcnow().isoformat() + "Z",
        "node_name": node_name,
        "stage": state.get("current_stage", "unknown"),
        "state_hash": None
    }
    
    # Compute state hash
    state_copy = dict(state)
    state_copy.pop("state_snapshots", None)
    state_json = json.dumps(state_copy, sort_keys=True, default=str)
    event["state_hash"] = hashlib.sha256(state_json.encode('utf-8')).hexdigest()[:16]
    
    # Add state diff if old state provided
    if old_state and event_type == "state_update":
        event["state_diff"] = compute_state_diff(old_state, state)
    
    # Add error if present
    if state.get("error"):
        event["error"] = state["error"]
    
    return event

