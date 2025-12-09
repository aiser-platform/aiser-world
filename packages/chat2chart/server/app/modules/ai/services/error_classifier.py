"""
Error Classifier Service

Provides comprehensive error taxonomy and classification for precise recovery strategies.
Enables adaptive error handling based on error type, severity, and context.
"""

import logging
import re
from typing import Any, Dict, List, Optional, Set, Tuple
from enum import Enum
from dataclasses import dataclass

logger = logging.getLogger(__name__)


class ErrorCategory(Enum):
    """High-level error categories."""
    SQL_GENERATION = "sql_generation"
    SQL_VALIDATION = "sql_validation"
    SQL_EXECUTION = "sql_execution"
    DATA_ACCESS = "data_access"
    CONNECTION = "connection"
    PERMISSION = "permission"
    SCHEMA = "schema"
    LLM = "llm"
    TIMEOUT = "timeout"
    UNKNOWN = "unknown"


class ErrorSeverity(Enum):
    """Error severity levels."""
    CRITICAL = "critical"  # Cannot recover, must fail
    HIGH = "high"  # Difficult to recover, may need user intervention
    MEDIUM = "medium"  # Can recover with retry or fix
    LOW = "low"  # Minor issue, can continue
    INFO = "info"  # Informational, not an error


class ErrorRecoverability(Enum):
    """Error recoverability assessment."""
    AUTOMATIC = "automatic"  # Can be fixed automatically
    RETRY = "retry"  # Can retry with modifications
    MANUAL = "manual"  # Requires manual intervention
    NONE = "none"  # Cannot recover


@dataclass
class ClassifiedError:
    """Classified error with metadata."""
    original_error: str
    category: ErrorCategory
    severity: ErrorSeverity
    recoverability: ErrorRecoverability
    error_type: str
    error_subtype: Optional[str] = None
    suggested_fix: Optional[str] = None
    retry_strategy: Optional[str] = None
    confidence: float = 0.8
    context: Optional[Dict[str, Any]] = None


class ErrorClassifier:
    """
    Comprehensive error classifier with taxonomy-based categorization.
    
    Features:
    - Multi-level error taxonomy
    - Severity assessment
    - Recoverability analysis
    - Suggested fixes and retry strategies
    - Context-aware classification
    """
    
    def __init__(self):
        self.error_patterns = self._initialize_error_patterns()
        self.recovery_strategies = self._initialize_recovery_strategies()
    
    def classify_error(
        self,
        error: str,
        context: Optional[Dict[str, Any]] = None
    ) -> ClassifiedError:
        """
        Classify an error with full taxonomy.
        
        Args:
            error: Error message or exception string
            context: Optional context (stage, query, data_source, etc.)
        
        Returns:
            ClassifiedError with full classification
        """
        error_lower = error.lower() if isinstance(error, str) else str(error).lower()
        
        # Classify error
        category = self._classify_category(error_lower, context)
        error_type, error_subtype = self._classify_type(error_lower, category)
        severity = self._assess_severity(error_lower, category, error_type, context)
        recoverability = self._assess_recoverability(category, error_type, severity, context)
        
        # Generate suggestions
        suggested_fix = self._suggest_fix(category, error_type, error_lower, context)
        retry_strategy = self._suggest_retry_strategy(category, error_type, recoverability)
        
        # Calculate confidence
        confidence = self._calculate_confidence(error_lower, category, error_type)
        
        return ClassifiedError(
            original_error=error,
            category=category,
            severity=severity,
            recoverability=recoverability,
            error_type=error_type,
            error_subtype=error_subtype,
            suggested_fix=suggested_fix,
            retry_strategy=retry_strategy,
            confidence=confidence,
            context=context or {}
        )
    
    def _classify_category(
        self,
        error_lower: str,
        context: Optional[Dict[str, Any]] = None
    ) -> ErrorCategory:
        """Classify error into high-level category."""
        stage = (context or {}).get("stage", "").lower()
        
        # SQL Generation errors
        if any(kw in error_lower for kw in [
            "sql generation", "could not generate", "failed to generate sql",
            "unable to convert", "nl2sql", "natural language to sql"
        ]) or stage in ("nl2sql", "sql_generation"):
            return ErrorCategory.SQL_GENERATION
        
        # SQL Validation errors
        if any(kw in error_lower for kw in [
            "sql validation", "invalid sql", "malformed sql", "syntax error",
            "missing from", "missing required keyword", "unbalanced parentheses",
            "reserved word", "invalid pattern", "sql validation failed"
        ]) or stage in ("validate_sql", "sql_validation"):
            return ErrorCategory.SQL_VALIDATION
        
        # SQL Execution errors
        if any(kw in error_lower for kw in [
            "query execution", "execution failed", "query failed",
            "sql execution error", "runtime error", "execution error"
        ]) or stage in ("execute_query", "query_execution"):
            return ErrorCategory.SQL_EXECUTION
        
        # Connection errors
        if any(kw in error_lower for kw in [
            "connection", "connect", "timeout", "connection refused",
            "cannot connect", "connection lost", "network", "socket"
        ]):
            return ErrorCategory.CONNECTION
        
        # Permission errors
        if any(kw in error_lower for kw in [
            "permission", "access denied", "unauthorized", "forbidden",
            "insufficient privileges", "not authorized"
        ]):
            return ErrorCategory.PERMISSION
        
        # Schema errors
        if any(kw in error_lower for kw in [
            "table not found", "column not found", "schema", "does not exist",
            "unknown table", "unknown column", "invalid table", "invalid column"
        ]):
            return ErrorCategory.SCHEMA
        
        # Data access errors
        if any(kw in error_lower for kw in [
            "data access", "data source", "data not available", "no data",
            "empty result", "no rows"
        ]):
            return ErrorCategory.DATA_ACCESS
        
        # LLM errors
        if any(kw in error_lower for kw in [
            "llm", "model", "openai", "api error", "rate limit",
            "empty content", "generation failed"
        ]):
            return ErrorCategory.LLM
        
        # Timeout errors
        if any(kw in error_lower for kw in [
            "timeout", "timed out", "request timeout", "execution timeout"
        ]):
            return ErrorCategory.TIMEOUT
        
        return ErrorCategory.UNKNOWN
    
    def _classify_type(
        self,
        error_lower: str,
        category: ErrorCategory
    ) -> Tuple[str, Optional[str]]:
        """Classify specific error type and subtype."""
        if category == ErrorCategory.SQL_VALIDATION:
            # SQL Validation subtypes
            if "missing from" in error_lower or "from clause" in error_lower:
                return "missing_from_clause", "syntax"
            elif "unbalanced parentheses" in error_lower or "parentheses" in error_lower:
                return "unbalanced_parentheses", "syntax"
            elif "reserved word" in error_lower:
                return "reserved_word_usage", "semantic"
            elif "invalid pattern" in error_lower:
                return "invalid_pattern", "semantic"
            else:
                return "general_validation_error", "syntax"
        
        elif category == ErrorCategory.SQL_EXECUTION:
            # SQL Execution subtypes
            if "syntax error" in error_lower:
                return "syntax_error", "execution"
            elif "type mismatch" in error_lower or "type error" in error_lower:
                return "type_mismatch", "execution"
            elif "division by zero" in error_lower:
                return "division_by_zero", "execution"
            elif "out of range" in error_lower:
                return "out_of_range", "execution"
            else:
                return "general_execution_error", "execution"
        
        elif category == ErrorCategory.SCHEMA:
            # Schema subtypes
            if "table not found" in error_lower or "unknown table" in error_lower:
                return "table_not_found", "schema"
            elif "column not found" in error_lower or "unknown column" in error_lower:
                return "column_not_found", "schema"
            elif "schema not found" in error_lower:
                return "schema_not_found", "schema"
            else:
                return "general_schema_error", "schema"
        
        elif category == ErrorCategory.CONNECTION:
            # Connection subtypes
            if "timeout" in error_lower:
                return "connection_timeout", "network"
            elif "refused" in error_lower:
                return "connection_refused", "network"
            elif "lost" in error_lower:
                return "connection_lost", "network"
            else:
                return "general_connection_error", "network"
        
        elif category == ErrorCategory.PERMISSION:
            # Permission subtypes
            if "read" in error_lower:
                return "read_permission_denied", "access"
            elif "write" in error_lower or "insert" in error_lower or "update" in error_lower:
                return "write_permission_denied", "access"
            else:
                return "general_permission_error", "access"
        
        elif category == ErrorCategory.LLM:
            # LLM subtypes
            if "rate limit" in error_lower:
                return "rate_limit_exceeded", "api"
            elif "empty content" in error_lower:
                return "empty_response", "generation"
            elif "timeout" in error_lower:
                return "llm_timeout", "api"
            else:
                return "general_llm_error", "api"
        
        # Default
        return "unknown_error", None
    
    def _assess_severity(
        self,
        error_lower: str,
        category: ErrorCategory,
        error_type: str,
        context: Optional[Dict[str, Any]] = None
    ) -> ErrorSeverity:
        """Assess error severity."""
        # Critical errors - cannot recover
        critical_patterns = [
            "connection refused", "authentication failed", "permission denied",
            "data source not found", "cannot connect", "critical failure"
        ]
        if any(pattern in error_lower for pattern in critical_patterns):
            return ErrorSeverity.CRITICAL
        
        # High severity - difficult to recover
        if category in (ErrorCategory.CONNECTION, ErrorCategory.PERMISSION):
            return ErrorSeverity.HIGH
        
        if error_type in ("table_not_found", "schema_not_found"):
            return ErrorSeverity.HIGH
        
        # Medium severity - can recover with retry/fix
        if category in (ErrorCategory.SQL_VALIDATION, ErrorCategory.SQL_EXECUTION):
            return ErrorSeverity.MEDIUM
        
        if error_type in ("missing_from_clause", "unbalanced_parentheses", "reserved_word_usage"):
            return ErrorSeverity.MEDIUM
        
        # Low severity - minor issues
        if category == ErrorCategory.DATA_ACCESS:
            return ErrorSeverity.LOW
        
        if error_type in ("empty_response", "general_llm_error"):
            return ErrorSeverity.LOW
        
        # Default to medium
        return ErrorSeverity.MEDIUM
    
    def _assess_recoverability(
        self,
        category: ErrorCategory,
        error_type: str,
        severity: ErrorSeverity,
        context: Optional[Dict[str, Any]] = None
    ) -> ErrorRecoverability:
        """Assess error recoverability."""
        # Critical errors are not recoverable
        if severity == ErrorSeverity.CRITICAL:
            return ErrorRecoverability.NONE
        
        # Permission errors require manual intervention
        if category == ErrorCategory.PERMISSION:
            return ErrorRecoverability.MANUAL
        
        # SQL validation errors can often be fixed automatically
        if category == ErrorCategory.SQL_VALIDATION:
            if error_type in ("missing_from_clause", "unbalanced_parentheses", "reserved_word_usage"):
                return ErrorRecoverability.AUTOMATIC
            return ErrorRecoverability.RETRY
        
        # Connection errors can be retried
        if category == ErrorCategory.CONNECTION:
            return ErrorRecoverability.RETRY
        
        # LLM errors can be retried
        if category == ErrorCategory.LLM:
            return ErrorRecoverability.RETRY
        
        # SQL execution errors might be retryable
        if category == ErrorCategory.SQL_EXECUTION:
            if error_type in ("syntax_error", "type_mismatch"):
                return ErrorRecoverability.RETRY
            return ErrorRecoverability.MANUAL
        
        # Schema errors might be fixable
        if category == ErrorCategory.SCHEMA:
            if error_type == "column_not_found":
                return ErrorRecoverability.RETRY  # Might be a typo
            return ErrorRecoverability.MANUAL
        
        return ErrorRecoverability.RETRY
    
    def _suggest_fix(
        self,
        category: ErrorCategory,
        error_type: str,
        error_lower: str,
        context: Optional[Dict[str, Any]] = None
    ) -> Optional[str]:
        """Suggest a fix for the error."""
        if category == ErrorCategory.SQL_VALIDATION:
            if error_type == "missing_from_clause":
                return "Add a FROM clause with the appropriate table name"
            elif error_type == "unbalanced_parentheses":
                return "Fix unbalanced parentheses in SQL query"
            elif error_type == "reserved_word_usage":
                return "Replace reserved word with a valid column or table name"
        
        elif category == ErrorCategory.SCHEMA:
            if error_type == "table_not_found":
                return "Verify table name exists in schema and check for typos"
            elif error_type == "column_not_found":
                return "Verify column name exists in table schema and check for typos"
        
        elif category == ErrorCategory.CONNECTION:
            return "Check data source connection settings and network connectivity"
        
        elif category == ErrorCategory.PERMISSION:
            return "Verify user has required permissions for this data source"
        
        elif category == ErrorCategory.LLM:
            if error_type == "rate_limit_exceeded":
                return "Wait before retrying or use a different model"
            elif error_type == "empty_response":
                return "Retry with a simpler prompt or different model"
        
        return None
    
    def _suggest_retry_strategy(
        self,
        category: ErrorCategory,
        error_type: str,
        recoverability: ErrorRecoverability
    ) -> Optional[str]:
        """Suggest retry strategy."""
        if recoverability == ErrorRecoverability.NONE:
            return None
        
        if recoverability == ErrorRecoverability.AUTOMATIC:
            return "automatic_fix"
        
        if recoverability == ErrorRecoverability.RETRY:
            if category == ErrorCategory.SQL_VALIDATION:
                return "retry_with_fixed_sql"
            elif category == ErrorCategory.CONNECTION:
                return "retry_with_backoff"
            elif category == ErrorCategory.LLM:
                return "retry_with_simpler_prompt"
            else:
                return "retry_with_modifications"
        
        return "manual_intervention_required"
    
    def _calculate_confidence(
        self,
        error_lower: str,
        category: ErrorCategory,
        error_type: str
    ) -> float:
        """Calculate classification confidence."""
        # High confidence for specific patterns
        if error_type != "unknown_error" and category != ErrorCategory.UNKNOWN:
            return 0.9
        
        # Medium confidence for category match but unknown type
        if category != ErrorCategory.UNKNOWN:
            return 0.7
        
        # Low confidence for unknown errors
        return 0.5
    
    def _initialize_error_patterns(self) -> Dict[str, List[str]]:
        """Initialize error pattern matching rules."""
        return {
            "sql_validation": [
                "sql validation",
                "invalid sql",
                "malformed sql",
                "syntax error",
                "missing from",
                "unbalanced parentheses"
            ],
            "sql_execution": [
                "query execution",
                "execution failed",
                "runtime error"
            ],
            "connection": [
                "connection",
                "connect",
                "timeout",
                "connection refused"
            ],
            "schema": [
                "table not found",
                "column not found",
                "schema",
                "does not exist"
            ]
        }
    
    def _initialize_recovery_strategies(self) -> Dict[str, Dict[str, Any]]:
        """Initialize recovery strategies by error type."""
        return {
            "missing_from_clause": {
                "strategy": "automatic_fix",
                "action": "add_from_clause",
                "max_retries": 2
            },
            "unbalanced_parentheses": {
                "strategy": "automatic_fix",
                "action": "fix_parentheses",
                "max_retries": 2
            },
            "connection_timeout": {
                "strategy": "retry_with_backoff",
                "action": "retry",
                "max_retries": 3,
                "backoff_multiplier": 2
            },
            "rate_limit_exceeded": {
                "strategy": "retry_with_backoff",
                "action": "retry",
                "max_retries": 3,
                "backoff_multiplier": 3
            }
        }
    
    def get_recovery_strategy(
        self,
        classified_error: ClassifiedError
    ) -> Optional[Dict[str, Any]]:
        """Get recovery strategy for classified error."""
        return self.recovery_strategies.get(classified_error.error_type)


