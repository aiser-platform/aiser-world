"""
SQL Relevance Detector Service

Uses AI to determine if a current SQL query is relevant to a new user query.
This helps decide whether to include the current SQL as context when generating new SQL.
"""

import json
import logging
from typing import Dict, Any, Optional

logger = logging.getLogger(__name__)


class SQLRelevanceDetector:
    """
    Service that uses AI to determine if a current SQL query provides relevant
    context for a new user query.
    """
    
    def __init__(self, litellm_service):
        """
        Initialize the SQL Relevance Detector.
        
        Args:
            litellm_service: LiteLLMService instance for AI calls
        """
        self.litellm_service = litellm_service
    
    async def is_sql_relevant(
        self, 
        user_query: str, 
        current_sql: str
    ) -> Dict[str, Any]:
        """
        Determine if the current SQL is relevant to the new user query using AI.
        
        Args:
            user_query: The new user's natural language query
            current_sql: The current SQL query in the editor
        
        Returns:
            Dictionary with:
            - is_relevant: bool - Whether the SQL is relevant
            - confidence: float - Confidence score (0.0-1.0)
            - reasoning: str - Brief explanation of the decision
        """
        if not user_query or not current_sql:
            return {
                "is_relevant": False,
                "confidence": 0.0,
                "reasoning": "Missing user query or current SQL"
            }
        
        try:
            # Build the prompt for relevance detection
            system_context = """You are an expert at analyzing SQL queries and natural language questions to determine if a previous SQL query provides relevant context for a new question.

Your task is to analyze whether the previous SQL query is relevant to answering the new user query. Consider:
1. Is the new query a modification or follow-up to the previous SQL? (e.g., "how about over 200 thousand?" after a query about "over 100 thousand")
2. Do they reference similar tables, columns, or concepts?
3. Would the previous SQL help understand the user's intent?

Return ONLY valid JSON in this exact format:
{"is_relevant": true/false, "confidence": 0.0-1.0, "reasoning": "brief explanation"}

Be strict: only return true if the SQL is clearly relevant. If the queries are about completely different topics, return false."""

            user_prompt = f"""User Query: "{user_query}"

Previous SQL: ```sql
{current_sql}
```

Analyze if the previous SQL query is relevant to answering the new user query. Return JSON with is_relevant (boolean), confidence (0.0-1.0), and reasoning (brief explanation)."""

            # Use a fast model for relevance detection to minimize latency
            response = await self.litellm_service.generate_completion(
                prompt=user_prompt,
                system_context=system_context,
                max_tokens=200,
                temperature=0.3,  # Lower temperature for more consistent results
                model_id=None  # Use default model (should be fast like gpt-4o-mini)
            )
            
            if not response.get("success"):
                logger.warning(f"Relevance detection failed: {response.get('error', 'Unknown error')}")
                # Fail-safe: default to not relevant
                return {
                    "is_relevant": False,
                    "confidence": 0.0,
                    "reasoning": "Relevance detection failed, defaulting to not relevant"
                }
            
            content = response.get("content", "").strip()
            if not content:
                logger.warning("Empty response from relevance detection")
                return {
                    "is_relevant": False,
                    "confidence": 0.0,
                    "reasoning": "Empty response from relevance detection"
                }
            
            # Try to extract JSON from the response
            # The AI might return JSON wrapped in markdown code blocks or with extra text
            json_content = content
            
            # Remove markdown code blocks if present
            if "```json" in json_content:
                json_content = json_content.split("```json")[1].split("```")[0].strip()
            elif "```" in json_content:
                json_content = json_content.split("```")[1].split("```")[0].strip()
            
            # Try to find JSON object in the response
            try:
                # Look for JSON object pattern
                start_idx = json_content.find("{")
                end_idx = json_content.rfind("}")
                if start_idx >= 0 and end_idx > start_idx:
                    json_content = json_content[start_idx:end_idx + 1]
                
                result = json.loads(json_content)
                
                # Validate the result structure
                is_relevant = bool(result.get("is_relevant", False))
                confidence = float(result.get("confidence", 0.0))
                reasoning = str(result.get("reasoning", "No reasoning provided"))
                
                # Clamp confidence to 0-1 range
                confidence = max(0.0, min(1.0, confidence))
                
                logger.info(f"Relevance detection: is_relevant={is_relevant}, confidence={confidence:.2f}, reasoning={reasoning[:100]}")
                
                return {
                    "is_relevant": is_relevant,
                    "confidence": confidence,
                    "reasoning": reasoning
                }
                
            except json.JSONDecodeError as e:
                logger.warning(f"Failed to parse JSON from relevance detection response: {e}. Content: {content[:200]}")
                # Fail-safe: default to not relevant
                return {
                    "is_relevant": False,
                    "confidence": 0.0,
                    "reasoning": f"Failed to parse relevance detection response: {str(e)}"
                }
                
        except Exception as e:
            logger.error(f"Error in SQL relevance detection: {e}", exc_info=True)
            # Fail-safe: default to not relevant
            return {
                "is_relevant": False,
                "confidence": 0.0,
                "reasoning": f"Error during relevance detection: {str(e)}"
            }

