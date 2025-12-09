import re
from importlib.machinery import SourceFileLoader
from pydantic import BaseModel
import os

# Load the module directly to avoid importing package-level side-effects
module_path = os.path.join(os.path.dirname(__file__), "..", "app", "modules", "ai", "utils", "structured_output.py")
module_path = os.path.abspath(module_path)
structured_module = SourceFileLoader("structured_output_test_module", module_path).load_module()
StructuredOutputHandler = structured_module.StructuredOutputHandler


class DummyModel(BaseModel):
    success: bool = True
    message: str = ""


def test_sanitize_removes_js_functions_and_comments():
    # Create instance without running __init__ to avoid parser imports
    handler = object.__new__(StructuredOutputHandler)
    js_input = '''
    {
      // Single line comment
      "title": "Test",
      "tooltip": {
        "formatter": function(params) { return params; }
      }, /* block comment */
      "series": [1,2,3,],
    }
    '''
    sanitized = StructuredOutputHandler._sanitize_json_string(handler, js_input)
    # Should not contain 'function(' or '/*' or '*/'
    assert "function(" not in sanitized
    assert "/*" not in sanitized and "*/" not in sanitized
    # Trailing commas removed before closing brackets/braces
    assert ",\n    }" not in sanitized and ",\n    ]" not in sanitized
    # Quotes normalized to double quotes for keys/strings
    assert '"' in sanitized


