"""
Common utility functions for the chat2chart service
"""

from typing import Any, Dict, List, Union
from datetime import datetime, date
from decimal import Decimal
import json

def jsonable_encoder(obj: Any) -> Any:
    """
    Convert an object to a JSON-serializable format.
    Similar to FastAPI's jsonable_encoder but lightweight.
    """
    if obj is None:
        return None
    elif isinstance(obj, (str, int, float, bool)):
        return obj
    elif isinstance(obj, datetime):
        return obj.isoformat()
    elif isinstance(obj, date):
        return obj.isoformat()
    elif isinstance(obj, Decimal):
        return float(obj)
    elif isinstance(obj, dict):
        return {key: jsonable_encoder(value) for key, value in obj.items()}
    elif isinstance(obj, list):
        return [jsonable_encoder(item) for item in obj]
    elif hasattr(obj, 'dict'):
        # Pydantic models
        return jsonable_encoder(obj.dict())
    elif hasattr(obj, '__dict__'):
        # Regular objects
        return jsonable_encoder(obj.__dict__)
    else:
        # Try to convert to string as fallback
        try:
            return str(obj)
        except:
            return None

def safe_json_dumps(obj: Any) -> str:
    """
    Safely serialize an object to JSON string.
    """
    try:
        return json.dumps(jsonable_encoder(obj), default=str)
    except Exception:
        return str(obj)

def filter_dict(data: Dict[str, Any], allowed_keys: List[str]) -> Dict[str, Any]:
    """
    Filter a dictionary to only include specified keys.
    """
    return {key: value for key, value in data.items() if key in allowed_keys}

def exclude_dict(data: Dict[str, Any], excluded_keys: List[str]) -> Dict[str, Any]:
    """
    Filter a dictionary to exclude specified keys.
    """
    return {key: value for key, value in data.items() if key not in excluded_keys}

def deep_merge(dict1: Dict[str, Any], dict2: Dict[str, Any]) -> Dict[str, Any]:
    """
    Deep merge two dictionaries.
    """
    result = dict1.copy()
    for key, value in dict2.items():
        if key in result and isinstance(result[key], dict) and isinstance(value, dict):
            result[key] = deep_merge(result[key], value)
        else:
            result[key] = value
    return result
