"""
Lightweight metrics helpers for AI parsing and agent metrics.
Uses prometheus_client if available, otherwise falls back to an in-memory counter.
"""
from typing import Dict
import logging

logger = logging.getLogger(__name__)

try:
    from prometheus_client import Counter
    PARSE_SUCCESS = Counter("ai_parse_success_total", "Number of successful structured parses")
    PARSE_FAILURE = Counter("ai_parse_failure_total", "Number of failed structured parses")
    UNIFIED_AGENT_FAILURE = Counter("ai_unified_agent_failure_total", "Unified agent failure count")
    UNIFIED_AGENT_CIRCUIT_TRIP = Counter("ai_unified_agent_circuit_trip_total", "Unified agent circuit trips")
    def inc_parse_success():
        PARSE_SUCCESS.inc()
    def inc_parse_failure():
        PARSE_FAILURE.inc()
    def inc_unified_failure():
        UNIFIED_AGENT_FAILURE.inc()
    def inc_circuit_trip():
        UNIFIED_AGENT_CIRCUIT_TRIP.inc()
except Exception:
    # Fallback simple counters
    _COUNTERS: Dict[str, int] = {
        "parse_success": 0,
        "parse_failure": 0,
        "unified_failure": 0,
        "circuit_trip": 0,
    }
    def inc_parse_success():
        _COUNTERS["parse_success"] += 1
        logger.debug(f"metrics.parse_success -> {_COUNTERS['parse_success']}")
    def inc_parse_failure():
        _COUNTERS["parse_failure"] += 1
        logger.debug(f"metrics.parse_failure -> {_COUNTERS['parse_failure']}")
    def inc_unified_failure():
        _COUNTERS["unified_failure"] += 1
        logger.debug(f"metrics.unified_failure -> {_COUNTERS['unified_failure']}")
    def inc_circuit_trip():
        _COUNTERS["circuit_trip"] += 1
        logger.debug(f"metrics.circuit_trip -> {_COUNTERS['circuit_trip']}")


