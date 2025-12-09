"""
Structured Output Utilities for AI Agents

Provides utilities for using Pydantic models with LangChain's StructuredOutputParser
to ensure robust, type-safe data flow between agents.
"""

import json
import logging
import re
from typing import Type, TypeVar, Optional, Dict, Any
from pydantic import BaseModel, ValidationError
from langchain_core.output_parsers import PydanticOutputParser
from langchain_core.prompts import PromptTemplate
from app.modules.ai.utils import metrics

logger = logging.getLogger(__name__)

# Logger for raw LLM failures (rotating)
from logging.handlers import RotatingFileHandler
_LLM_RAW_LOGGER_NAME = "ai.llm_raw_failures"
logger_llm_raw = logging.getLogger(_LLM_RAW_LOGGER_NAME)
if not logger_llm_raw.handlers:
    try:
        handler = RotatingFileHandler("logs/llm_raw_failures.log", maxBytes=10 * 1024 * 1024, backupCount=5, encoding="utf-8")
        formatter = logging.Formatter("%(asctime)s - %(levelname)s - %(message)s")
        handler.setFormatter(formatter)
        logger_llm_raw.addHandler(handler)
        logger_llm_raw.setLevel(logging.ERROR)
    except Exception:
        # If file handler cannot be created (permission, path), fallback silently
        pass

T = TypeVar('T', bound=BaseModel)


class StructuredOutputHandler:
    """
    Handler for structured outputs using Pydantic models with LangChain.
    
    This ensures:
    - Type safety and validation
    - Guaranteed field presence
    - Robust error handling
    - Complete field tracking
    """
    
    def __init__(self, model_class: Type[BaseModel]):
        """
        Initialize with a Pydantic model class.
        
        Args:
            model_class: Pydantic model class for structured output
        """
        self.model_class = model_class
        self.parser = PydanticOutputParser(pydantic_object=model_class)
    
    def get_format_instructions(self) -> str:
        """Get format instructions for LLM prompt."""
        return self.parser.get_format_instructions()
    
    def parse_output(self, llm_output: str) -> tuple[Optional[BaseModel], Optional[Dict[str, Any]]]:
        """
        Parse LLM output into structured Pydantic model.
        
        Args:
            llm_output: Raw output from LLM
            
        Returns:
            Tuple of (parsed_model, error_info)
            - parsed_model: Parsed Pydantic model if successful, None otherwise
            - error_info: Dict with error details if parsing failed, None otherwise
        """
        try:
            # If this parser is expecting SQL, apply aggressive SQL sanitization to raw output first
            model_name = getattr(self.model_class, "__name__", "") or ""
            if "SQL" in model_name.upper() or "SQLGENERATION" in model_name.upper():
                try:
                    llm_output = self._sanitize_sql_text(llm_output)
                except Exception:
                    pass
            # First, attempt to find and sanitize any embedded JSON snippet to improve parser success
            try:
                sanitized = self._extract_and_sanitize_json(llm_output)
                if sanitized:
                    parsed = self.parser.parse(sanitized)
                    logger.info(f"✅ Successfully parsed {self.model_class.__name__} from sanitized JSON snippet")
                    try:
                        metrics.inc_parse_success()
                    except Exception:
                        pass
                    return parsed, None
            except Exception:
                # If sanitized attempt fails, continue to try the raw output
                pass

            # Try to parse using the parser on raw output
            parsed = self.parser.parse(llm_output)
            logger.info(f"✅ Successfully parsed {self.model_class.__name__} from LLM output")
            # Post-process SQL fields if present: unescape JSON-escaped sequences often emitted by LLMs
            try:
                model_name = getattr(self.model_class, "__name__", "") or ""
                if "SQL" in model_name.upper() or "SQLGENERATION" in model_name.upper():
                    # parsed may be a pydantic model instance
                    if hasattr(parsed, "sql_query"):
                        sql_val = getattr(parsed, "sql_query", None)
                        if isinstance(sql_val, str):
                            # Unescape common JSON-escaped sequences and remove stray backslashes
                            clean_sql = sql_val.replace('\\\\n', '\\n').replace('\\\\r', '\\r').replace('\\\\t', '\\t')
                            clean_sql = clean_sql.replace('\\n', '\n').replace('\\r', '\r').replace('\\t', '\t')
                            clean_sql = clean_sql.replace('\\\\', '')
                            clean_sql = clean_sql.strip().strip('"').strip("'")
                            try:
                                # set attribute on parsed model if possible
                                if hasattr(parsed, 'model_dump') and hasattr(parsed, 'model_validate'):
                                    # pydantic v2 - rebuild with updated sql_query
                                    data = parsed.model_dump()
                                    data['sql_query'] = clean_sql
                                    parsed = self.model_class.model_validate(data) if hasattr(self.model_class, 'model_validate') else self.model_class(**data)
                                else:
                                    # pydantic v1 - set attribute directly
                                    setattr(parsed, 'sql_query', clean_sql)
                            except Exception:
                                try:
                                    setattr(parsed, 'sql_query', clean_sql)
                                except Exception:
                                    pass
            except Exception:
                pass
            try:
                metrics.inc_parse_success()
            except Exception:
                pass
            return parsed, None
        except ValidationError as e:
            logger.warning(f"⚠️ Validation error parsing {self.model_class.__name__}: {e}")
            error_info = {
                "error_type": "validation_error",
                "errors": e.errors(),
                "raw_output": llm_output[:500]  # First 500 chars for debugging
            }
            try:
                metrics.inc_parse_failure()
            except Exception:
                pass
            # Capture raw LLM output for offline analysis
            try:
                self._capture_raw_llm_output(llm_output, error_info)
            except Exception:
                pass
            return None, error_info
        except json.JSONDecodeError as e:
            logger.warning(f"⚠️ JSON decode error parsing {self.model_class.__name__}: {e}")
            # Try to extract JSON from markdown code blocks
            try:
                import re
                json_snippet = self._extract_and_sanitize_json(llm_output)
                if json_snippet:
                    parsed = self.parser.parse(json_snippet)
                    logger.info(f"✅ Successfully parsed {self.model_class.__name__} from extracted/sanitized JSON")
                    return parsed, None
            except Exception as e2:
                logger.debug(f"Failed to extract JSON: {e2}")
            
            error_info = {
                "error_type": "json_decode_error",
                "error": str(e),
                "raw_output": llm_output[:500]
            }
            try:
                metrics.inc_parse_failure()
            except Exception:
                pass
            # Capture raw LLM output for offline analysis
            try:
                self._capture_raw_llm_output(llm_output, {"error_type": "json_decode_error", "error": str(e)})
            except Exception:
                pass
            return None, error_info
        except Exception as e:
            logger.error(f"❌ Unexpected error parsing {self.model_class.__name__}: {e}", exc_info=True)
            error_info = {
                "error_type": "unexpected_error",
                "error": str(e),
                "raw_output": llm_output[:500]
            }
            try:
                metrics.inc_parse_failure()
            except Exception:
                pass
            # Special-case fallback for SQLGenerationOutput: try to extract raw SQL from text
            try:
                if getattr(self.model_class, "__name__", "") == "SQLGenerationOutput":
                    # Look for ```sql``` blocks first
                    m = re.search(r'```sql\\s*(.*?)\\s*```', llm_output, re.DOTALL | re.IGNORECASE)
                    sql_text = None
                    if m:
                        sql_text = m.group(1).strip()
                    else:
                        # Try any fenced code block
                        m2 = re.search(r'```\\s*(.*?)\\s*```', llm_output, re.DOTALL)
                        if m2:
                            sql_text = m2.group(1).strip()
                        else:
                            # Fallback: find first SELECT ...; or starting with SELECT
                            m3 = re.search(r'(SELECT[\\s\\S]*?;)', llm_output, re.IGNORECASE)
                            if m3:
                                sql_text = m3.group(1).strip()
                            else:
                                m4 = re.search(r'^(SELECT[\\s\\S]*)', llm_output.strip(), re.IGNORECASE)
                                if m4:
                                    sql_text = m4.group(1).strip()
                    if sql_text:
                        # Sanitize extracted SQL text before creating fallback model
                        try:
                            sql_text = self._sanitize_sql_text(sql_text)
                            # Unescape common JSON-escaped sequences
                            sql_text = sql_text.replace('\\\\n', '\n').replace('\\\\r', '\r').replace('\\\\t', '\t')
                            # Trim surrounding quotes
                            if sql_text.startswith('"') and sql_text.endswith('"'):
                                sql_text = sql_text[1:-1]
                            if sql_text.startswith("'") and sql_text.endswith("'"):
                                sql_text = sql_text[1:-1]
                            sql_text = sql_text.strip()
                        except Exception:
                            # fallback to raw extracted text
                            sql_text = sql_text.strip()

                        fallback = {
                            "success": True,
                            "sql_query": sql_text,
                            "explanation": "Extracted and sanitized SQL from model output (fallback)",
                            "validation_result": {},
                            "confidence": 0.0,
                            "reasoning_steps": [],
                            "error": None,
                            "execution_time_ms": None
                        }
                            try:
                                # Pydantic v2 compatibility: model_validate if available
                                if hasattr(self.model_class, "model_validate"):
                                    parsed_model = self.model_class.model_validate(fallback)
                                else:
                                    parsed_model = self.model_class(**fallback)
                                logger.info("✅ Fallback parsed SQLGenerationOutput from sanitized SQL text")
                                # Capture raw and sanitized examples for triage
                                try:
                                    self._capture_raw_llm_output(sql_text, {"error_type": "fallback_sql_extracted", "errors": None})
                                except Exception:
                                    pass
                                return parsed_model, None
                            except Exception as e2:
                                logger.debug(f"Fallback SQLGenerationOutput creation failed: {e2}")
            except Exception:
                pass
            # Capture raw LLM output for offline analysis
            try:
                self._capture_raw_llm_output(llm_output, error_info)
            except Exception:
                pass
            return None, error_info

    def _extract_and_sanitize_json(self, text: str) -> Optional[str]:
        """
        Try to extract a JSON-like snippet from text and sanitize common JS/LLM artifacts
        so it can be parsed as JSON.
        """
        try:
            # Priority 1: explicit ```json``` blocks
            m = re.search(r'```json\s*(.*?)\s*```', text, re.DOTALL | re.IGNORECASE)
            if m:
                js = m.group(1)
                return self._sanitize_json_string(js)

            # Priority 2: any top-level JSON object that contains chart-related keys
            m = re.search(r'\{[\s\S]*"(?:chart_config|echarts_config|primary_chart|title|series)"[\s\S]*\}', text, re.IGNORECASE)
            if m:
                js = m.group(0)
                return self._sanitize_json_string(js)

            # Priority 3: any JSON-like object (last resort)
            m = re.search(r'\{[\s\S]*\}', text, re.DOTALL)
            if m:
                js = m.group(0)
                return self._sanitize_json_string(js)

        except Exception as e:
            logger.debug(f"_extract_and_sanitize_json failed: {e}")
        return None

    def _capture_raw_llm_output(self, raw: str, info: Dict[str, Any]) -> None:
        """
        Persist a bounded excerpt of raw LLM output on parse failures for diagnostics.
        Writes to rotating log via logger_llm_raw.
        """
        try:
            model_name = getattr(self.model_class, "__name__", "UnknownModel")
            excerpt = raw if len(raw) <= 3000 else raw[:3000] + "...[truncated]"
            msg = {
                "model": model_name,
                "error": info.get("error_type") or info.get("error") or "parse_failure",
                "details": info.get("errors") or info.get("error") or None,
                "excerpt": excerpt
            }
            # Log as a single-line JSON safe string
            import json as _json
            logger_llm_raw.error(_json.dumps(msg, default=str, ensure_ascii=False))
        except Exception:
            # Best-effort; do not raise from logging helper
            pass

    def _sanitize_json_string(self, s: str) -> str:
        """
        Sanitize a JSON-like string by:
        - Removing JS single-line and block comments
        - Replacing JS function(...) { ... } blocks with placeholders
        - Removing trailing commas before }, ]
        - Replacing smart single quotes with double quotes for JSON keys/strings (best-effort)
        - CRITICAL: Remove "idididididididididididid" corruption pattern from JSON strings
        """
        try:
            # CRITICAL: Remove "idididididididididididid" corruption FIRST (before other processing)
            # Pattern: "id" as a group repeated 3+ times - replace with single space
            s = re.sub(r'(id){3,}', ' ', s, flags=re.IGNORECASE)
            # Remove corruption between words in JSON string values
            s = re.sub(r'([A-Za-z]+)(id){3,}([A-Za-z]+)', r'\1 \3', s, flags=re.IGNORECASE)
            s = re.sub(r'(id){3,}([A-Za-z]+)', r'\2', s, flags=re.IGNORECASE)
            s = re.sub(r'([A-Za-z]+)(id){3,}', r'\1', s, flags=re.IGNORECASE)
            # Normalize whitespace after removal
            s = re.sub(r'\s+', ' ', s)
            
            # Remove // single-line comments
            s = re.sub(r'//.*?\n', '\n', s)
            # Remove /* ... */ block comments
            s = re.sub(r'/\*[\s\S]*?\*/', '', s)
            # Remove/replace JS function(...) { ... } blocks with a placeholder (broad removal)
            s = re.sub(r'function[\s\S]*?\}', '"__FUNCTION_PLACEHOLDER__"', s, flags=re.IGNORECASE)
            # Also replace any remaining 'function' tokens with placeholder to be safe
            s = s.replace('function', '"__FUNCTION_PLACEHOLDER__"')
            # Replace function(...) { ... } with a placeholder string (secondary, more precise)
            s = re.sub(r'function\s*\([^)]*\)\s*\{[\s\S]*?\}', '"__FUNCTION_PLACEHOLDER__"', s)
            # Replace arrow functions (...) => { ... } with placeholder
            s = re.sub(r'\([^)]*\)\s*=>\s*\{[\s\S]*?\}', '"__FUNCTION_PLACEHOLDER__"', s)
            # Remove trailing commas before } or ]
            s = re.sub(r',\s*(?=[}\]])', '', s)
            # Replace single quotes around keys/strings with double quotes (best-effort)
            s = re.sub(r"(?<!\\)'([^']*?)'(?!\\)", r'"\1"', s)
            # Normalize special quotes
            s = s.replace('"', '"').replace('"', '"').replace("\\'", "'")
            # Unescape common JSON-escaped sequences (but preserve actual newlines in SQL strings)
            s = s.replace('\\\\n', '\\n').replace('\\\\r', '\\r').replace('\\\\t', '\\t')
            # Don't replace single \n in JSON string values - they should remain as escaped
            # Only remove stray backslashes that aren't part of valid escapes
            s = re.sub(r'\\(?!["\\/bfnrt])', '', s)  # Remove invalid escape sequences
            return s
        except Exception as e:
            logger.debug(f"_sanitize_json_string failed: {e}")
            return s

    def _sanitize_sql_text(self, sql_text: str) -> str:
        """
        Aggressively sanitize SQL-like LLM output:
        - Remove control characters and weird Unicode
        - Collapse repeated short substrings (ididid... or abcabcabc)
        - Remove runs of a single char repeated many times
        - Remove stray tokens before SELECT (e.g., idididSELECT -> SELECT)
        - CRITICAL: Remove "idididididididididididid" corruption pattern
        """
        try:
            s = sql_text
            # Unescape common escaped sequences produced inside JSON strings
            s = s.replace('\\\\n', '\n').replace('\\\\r', '\r').replace('\\\\t', '\t')
            # Remove escaped quotes
            s = s.replace('\\"', '"').replace("\\'", "'")
            # Trim surrounding quotes if entire SQL was returned as a quoted string
            if s.startswith('"') and s.endswith('"'):
                s = s[1:-1]
            if s.startswith("'") and s.endswith("'"):
                s = s[1:-1]
            
            # CRITICAL: Remove "idididididididididididid" corruption pattern FIRST
            # Pattern: "id" as a group repeated 3+ times (handles idididididididididididid)
            s = re.sub(r'(id){3,}', ' ', s, flags=re.IGNORECASE)
            # Also handle case-insensitive and with word boundaries
            s = re.sub(r'\b(id){3,}\b', ' ', s, flags=re.IGNORECASE)
            # Remove "idididididididididididid" between words (no spaces)
            s = re.sub(r'([A-Za-z]+)(id){3,}([A-Za-z]+)', r'\1 \3', s, flags=re.IGNORECASE)
            # Remove "idididididididididididid" at start of words
            s = re.sub(r'(id){3,}([A-Za-z]+)', r'\2', s, flags=re.IGNORECASE)
            # Remove "idididididididididididid" at end of words
            s = re.sub(r'([A-Za-z]+)(id){3,}', r'\1', s, flags=re.IGNORECASE)
            
            # Remove non-printable/control chars
            s = re.sub(r'[\x00-\x1f\x7f-\x9f]', ' ', s)
            # Normalize multiple whitespace to single space
            s = re.sub(r'\s+', ' ', s)
            # Collapse runs of a single character >6 e.g., "aaaaaaaa"
            s = re.sub(r'(.)\1{6,}', r'\1', s)
            # Collapse repeated short substrings (2-6 chars) repeated >=3 times e.g., idididid
            s = re.sub(r'(\w{1,6})(?:\1){2,}', r'\1', s, flags=re.IGNORECASE)
            # Specific: remove repeated 'id' clusters preceding SELECT or other keywords
            s = re.sub(r'(?:id){3,}\s*(SELECT)', r'\1', s, flags=re.IGNORECASE)
            # Remove stray repeated tokens like 'idididSELECT' without separators
            s = re.sub(r'((?:id){3,})(SELECT)', r'\2', s, flags=re.IGNORECASE)
            # Trim leading/trailing junk before first SELECT
            m = re.search(r'(SELECT[\s\S]*)', s, re.IGNORECASE)
            if m:
                s = m.group(1)
            return s.strip()
        except Exception:
            return sql_text
    
    def create_prompt_with_schema(self, base_prompt: str) -> PromptTemplate:
        """
        Create a prompt template that includes format instructions.
        
        Args:
            base_prompt: Base prompt text
            
        Returns:
            PromptTemplate with format instructions appended
        """
        format_instructions = self.get_format_instructions()
        full_prompt = f"""{base_prompt}

{format_instructions}

IMPORTANT: You must return your response in the exact format specified above. 
The response must be valid JSON that matches the Pydantic schema exactly."""
        
        return PromptTemplate.from_template(full_prompt)
    
    def parse_with_fallback(self, llm_output: str, fallback_data: Optional[Dict[str, Any]] = None) -> BaseModel:
        """
        Parse output with fallback to partial model if validation fails.
        
        Args:
            llm_output: Raw output from LLM
            fallback_data: Optional fallback data to use if parsing fails
            
        Returns:
            Parsed Pydantic model (may be partial if validation failed)
        """
        parsed, error_info = self.parse_output(llm_output)
        
        if parsed:
            return parsed
        
        # If parsing failed, try to create a partial model
        logger.warning(f"⚠️ Parsing failed, attempting to create partial {self.model_class.__name__}")
        
        # Try to extract what we can from the output
        extracted_data = self._extract_partial_data(llm_output)
        
        # Merge with fallback data if provided
        if fallback_data:
            extracted_data = {**extracted_data, **fallback_data}
        
        # Try to create model with partial data (will use defaults for missing fields)
        try:
            # Get field defaults from model
            model_fields = self.model_class.__fields__
            for field_name, field_info in model_fields.items():
                if field_name not in extracted_data:
                    # Use default if available
                    if hasattr(field_info, 'default') and field_info.default is not None:
                        extracted_data[field_name] = field_info.default
                    elif hasattr(field_info, 'default_factory') and field_info.default_factory:
                        extracted_data[field_name] = field_info.default_factory()
            
            # Create model (will raise ValidationError if required fields are missing)
            partial_model = self.model_class(**extracted_data)
            logger.info(f"✅ Created partial {self.model_class.__name__} with extracted data")
            return partial_model
        except ValidationError as e:
            logger.error(f"❌ Failed to create even partial {self.model_class.__name__}: {e}")
            # Return a minimal model with error information
            error_data = {
                "success": False,
                "error": f"Failed to parse output: {error_info.get('error', 'Unknown error') if error_info else 'Validation failed'}",
                "raw_output": llm_output[:500]
            }
            # Try to add any fields that are optional
            for field_name in model_fields:
                if field_name not in error_data and field_name != "success":
                    field_info = model_fields[field_name]
                    if hasattr(field_info, 'default') and field_info.default is not None:
                        error_data[field_name] = field_info.default
                    elif hasattr(field_info, 'default_factory') and field_info.default_factory:
                        error_data[field_name] = field_info.default_factory()
            
            return self.model_class(**error_data)
    
    def _extract_partial_data(self, llm_output: str) -> Dict[str, Any]:
        """Extract partial data from LLM output even if it's not perfectly formatted."""
        extracted = {}
        
        try:
            # Try to find JSON
            import re
            json_match = re.search(r'\{.*\}', llm_output, re.DOTALL)
            if json_match:
                json_str = json_match.group(0)
                try:
                    data = json.loads(json_str)
                    if isinstance(data, dict):
                        extracted = data
                except json.JSONDecodeError:
                    pass
        except Exception as e:
            logger.debug(f"Could not extract partial data: {e}")
        
        return extracted


def create_structured_chain(
    llm,
    model_class: Type[BaseModel],
    prompt_template: str,
    output_key: str = "output"
) -> Any:
    """
    Create a LangChain chain that uses structured output parsing.
    
    Args:
        llm: LangChain LLM instance
        model_class: Pydantic model class for output
        prompt_template: Prompt template string
        output_key: Key for output in chain result
        
    Returns:
        LangChain chain with structured output parsing
    """
    from langchain_core.runnables import RunnablePassthrough
    from langchain_core.output_parsers import StrOutputParser
    
    handler = StructuredOutputHandler(model_class)
    prompt = handler.create_prompt_with_schema(prompt_template)
    
    # Create chain: prompt -> llm -> parse
    chain = (
        {"input": RunnablePassthrough()}
        | prompt
        | llm
        | StrOutputParser()
        | handler.parse_with_fallback
    )
    
    return chain

