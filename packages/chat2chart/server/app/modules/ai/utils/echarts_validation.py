"""
ECharts Configuration Validation

Validates ECharts 6 configurations to ensure they are properly structured
and can be rendered by the frontend. Similar to SQL validation.
"""

import json
import logging
from typing import Dict, Any, Optional, Tuple

logger = logging.getLogger(__name__)

# Valid ECharts 6 chart types
VALID_CHART_TYPES = [
    "line", "bar", "pie", "scatter", "radar", "map", "tree", "treemap",
    "graph", "gauge", "funnel", "parallel", "sankey", "boxplot", "candlestick",
    "heatmap", "pictorialBar", "themeRiver", "sunburst", "custom"
]

# Required fields for basic ECharts config
REQUIRED_FIELDS = {
    "basic": ["series"],  # At minimum, series is required
    "standard": ["title", "series"],  # Standard config should have title and series
}

# Valid series types per chart type
SERIES_TYPE_MAP = {
    "line": ["line"],
    "bar": ["bar"],
    "pie": ["pie"],
    "scatter": ["scatter"],
    "radar": ["radar"],
    "map": ["map"],
    "tree": ["tree"],
    "treemap": ["treemap"],
    "graph": ["graph"],
    "gauge": ["gauge"],
    "funnel": ["funnel"],
    "parallel": ["parallel"],
    "sankey": ["sankey"],
    "boxplot": ["boxplot"],
    "candlestick": ["candlestick"],
    "heatmap": ["heatmap"],
    "pictorialBar": ["pictorialBar"],
    "themeRiver": ["themeRiver"],
    "sunburst": ["sunburst"],
}


def validate_echarts_config(
    config: Any,
    chart_type: Optional[str] = None,
    strict: bool = False
) -> Tuple[bool, Optional[str], Optional[Dict[str, Any]]]:
    """
    Validate ECharts configuration.
    
    Args:
        config: ECharts configuration (dict, str, or None)
        chart_type: Expected chart type (optional, for strict validation)
        strict: If True, requires all standard fields; if False, only requires series
    
    Returns:
        Tuple of (is_valid, error_message, validated_config)
        - is_valid: True if config is valid
        - error_message: Error message if invalid, None if valid
        - validated_config: Validated and normalized config dict, or None if invalid
    """
    # Handle None or empty
    if config is None:
        return False, "ECharts config is None", None
    
    # Handle string input (JSON)
    if isinstance(config, str):
        try:
            config = json.loads(config)
        except json.JSONDecodeError as e:
            return False, f"Invalid JSON in ECharts config: {str(e)}", None
    
    # Must be a dict
    if not isinstance(config, dict):
        return False, f"ECharts config must be a dict, got {type(config).__name__}", None
    
    # Check for empty dict
    if len(config) == 0:
        return False, "ECharts config is empty", None
    
    # Validate required fields
    required = REQUIRED_FIELDS["standard"] if strict else REQUIRED_FIELDS["basic"]
    for field in required:
        if field not in config:
            if strict:
                return False, f"Missing required field: {field}", None
            # For non-strict, only series is truly required
            if field == "series":
                return False, "Missing required field: series", None
    
    # Validate series
    if "series" not in config:
        return False, "Missing required field: series", None
    
    series = config.get("series")
    if not isinstance(series, list):
        return False, "series must be a list", None
    
    if len(series) == 0:
        return False, "series list is empty", None
    
    # Validate each series item
    for i, s in enumerate(series):
        if not isinstance(s, dict):
            return False, f"series[{i}] must be a dict", None
        
        if "type" not in s:
            return False, f"series[{i}] missing required field: type", None
        
        series_type = s.get("type")
        if series_type not in VALID_CHART_TYPES:
            return False, f"series[{i}] has invalid type: {series_type}. Valid types: {VALID_CHART_TYPES}", None
        
        # If chart_type specified, validate it matches
        if chart_type and series_type != chart_type:
            logger.warning(f"Chart type mismatch: expected {chart_type}, got {series_type}")
            # Don't fail validation, just warn
    
    # Validate title if present (must be dict with text or show)
    if "title" in config:
        title = config.get("title")
        if isinstance(title, dict):
            # Valid title dict
            if "text" not in title and "show" not in title:
                logger.warning("Title dict should have 'text' or 'show' field")
        elif isinstance(title, str):
            # Convert string title to dict
            config["title"] = {"text": title, "show": True}
            logger.info("Converted string title to dict format")
        else:
            logger.warning(f"Title should be dict or string, got {type(title).__name__}")
    
    # Validate xAxis if present (must be dict or list of dicts)
    if "xAxis" in config:
        xAxis = config.get("xAxis")
        if not isinstance(xAxis, (dict, list)):
            logger.warning(f"xAxis should be dict or list, got {type(xAxis).__name__}")
    
    # Validate yAxis if present (must be dict or list of dicts)
    if "yAxis" in config:
        yAxis = config.get("yAxis")
        if not isinstance(yAxis, (dict, list)):
            logger.warning(f"yAxis should be dict or list, got {type(yAxis).__name__}")
    
    # Normalize config (ensure proper structure)
    validated_config = _normalize_config(config)
    
    return True, None, validated_config


def _normalize_config(config: Dict[str, Any]) -> Dict[str, Any]:
    """
    Normalize ECharts config to ensure proper structure.
    
    Args:
        config: Raw ECharts config
    
    Returns:
        Normalized config
    """
    normalized = config.copy()
    
    # Ensure title is proper dict
    if "title" in normalized:
        title = normalized["title"]
        if isinstance(title, str):
            normalized["title"] = {"text": title, "show": True}
        elif isinstance(title, dict):
            # Ensure it has text or show
            if "text" not in title and "show" not in title:
                normalized["title"]["text"] = "Chart"
                normalized["title"]["show"] = True
    
    # Ensure series is list
    if "series" in normalized:
        if not isinstance(normalized["series"], list):
            normalized["series"] = [normalized["series"]]
        
        # Ensure each series has type
        for s in normalized["series"]:
            if not isinstance(s, dict):
                continue
            if "type" not in s:
                s["type"] = "bar"  # Default type
    
    # Ensure xAxis is dict or list
    if "xAxis" in normalized:
        xAxis = normalized["xAxis"]
        if not isinstance(xAxis, (dict, list)):
            normalized["xAxis"] = {"type": "category"}
    
    # Ensure yAxis is dict or list
    if "yAxis" in normalized:
        yAxis = normalized["yAxis"]
        if not isinstance(yAxis, (dict, list)):
            normalized["yAxis"] = {"type": "value"}
    
    return normalized


def fix_json_string(json_str: str) -> str:
    """
    Fix common JSON issues in string (improved version).
    
    Args:
        json_str: JSON string that may have issues
    
    Returns:
        Fixed JSON string
    """
    import re
    
    # Remove trailing commas before closing braces/brackets
    json_str = re.sub(r',\s*}', '}', json_str)
    json_str = re.sub(r',\s*]', ']', json_str)
    
    # Remove comments (JSON doesn't support comments)
    json_str = re.sub(r'//.*?$', '', json_str, flags=re.MULTILINE)
    json_str = re.sub(r'/\*.*?\*/', '', json_str, flags=re.DOTALL)
    
    # Fix unescaped newlines in strings (basic attempt)
    # This is tricky, so we'll be conservative
    
    # Fix single quotes to double quotes (basic, but risky)
    # Only do this if we see single quotes that look like JSON keys/values
    # json_str = re.sub(r"'(\w+)':", r'"\1":', json_str)  # Too risky, skip
    
    return json_str.strip()


