"""
Unified Result Extraction Utility

Single source of truth for extracting structured components (SQL, chart, insights, narration)
from orchestrator results, regardless of execution path (enhanced pipeline or standard flow).

This ensures consistent result structure and prevents "no meaningful results" issues.
"""

import logging
from typing import Dict, Any, List, Optional

logger = logging.getLogger(__name__)


def extract_structured_components(
    result: Dict[str, Any],
    primary_result: Optional[Dict[str, Any]] = None,
    collaborating_results: Optional[List[Dict[str, Any]]] = None
) -> Dict[str, Any]:
    """
    Extract all structured components from orchestrator result.
    
    This is the SINGLE SOURCE OF TRUTH for result extraction.
    Works for both enhanced pipeline and standard flow results.
    
    Args:
        result: Main result dictionary from orchestrator
        primary_result: Optional primary agent result (for standard flow)
        collaborating_results: Optional list of collaborating agent results (for standard flow)
    
    Returns:
        Dictionary with extracted components:
        - sql_query: str or None
        - query_result: dict or None
        - echarts_config: dict or None
        - chart_data: list or None
        - insights: list
        - recommendations: list
        - narration: str or None
        - executive_summary: str or None
    """
    extracted = {
        "sql_query": None,
        "query_result": None,
        "echarts_config": None,
        "chart_data": None,
        "insights": [],
        "recommendations": [],
        "narration": None,
        "executive_summary": None
    }
    
    # Check if enhanced pipeline was used
    is_enhanced = result.get("metadata", {}).get("pipeline_used") == "enhanced"
    
    if is_enhanced:
        # Enhanced pipeline returns components directly at top level
        logger.info("🔍 Extracting from enhanced pipeline result")
        extracted["sql_query"] = result.get("sql_query")
        extracted["query_result"] = result.get("query_result")
        
        # Extract chart config - handle primary_chart nesting
        echarts_config = result.get("echarts_config")
        if echarts_config:
            if isinstance(echarts_config, dict) and echarts_config.get("primary_chart"):
                extracted["echarts_config"] = echarts_config.get("primary_chart")
                logger.info("✅ Extracted primary_chart from nested echarts_config")
            else:
                extracted["echarts_config"] = echarts_config
        
        extracted["chart_data"] = result.get("chart_data")
        extracted["insights"] = result.get("insights", [])
        extracted["recommendations"] = result.get("recommendations", [])
        extracted["narration"] = result.get("narration")
        extracted["executive_summary"] = result.get("executive_summary")
        
    else:
        # Standard flow - extract from multiple locations
        logger.info("🔍 Extracting from standard flow result")
        
        # 1. Check top level of result first
        extracted["sql_query"] = result.get("sql_query")
        extracted["query_result"] = result.get("query_result")
        extracted["echarts_config"] = result.get("echarts_config") or result.get("primary_chart") or result.get("chart_config")
        extracted["chart_data"] = result.get("chart_data")
        extracted["insights"] = result.get("insights", [])
        extracted["recommendations"] = result.get("recommendations", [])
        extracted["narration"] = result.get("narration") or result.get("analysis") or result.get("result")
        extracted["executive_summary"] = result.get("executive_summary")
        
        # 2. Check primary_result if provided
        if primary_result:
            if not extracted["sql_query"]:
                extracted["sql_query"] = primary_result.get("sql_query")
            if not extracted["query_result"]:
                # CRITICAL: Check multiple locations for query_result
                query_result = (
                    primary_result.get("query_result") or
                    primary_result.get("data") or
                    ({"success": True, "data": primary_result.get("data")} if primary_result.get("data") else None)
                )
                if query_result:
                    # Ensure query_result is in proper format
                    if isinstance(query_result, list):
                        extracted["query_result"] = {"success": True, "data": query_result, "row_count": len(query_result)}
                    elif isinstance(query_result, dict):
                        extracted["query_result"] = query_result
                    else:
                        extracted["query_result"] = {"success": True, "data": query_result}
        
        # 3. Check collaborating_results if provided
        if collaborating_results:
            for collab_result in collaborating_results:
                agent_id = collab_result.get("agent_id", "unknown")
                
                # Extract chart from chart_generation agent
                if not extracted["echarts_config"] and agent_id == "chart_generation":
                    chart = (
                        collab_result.get("primary_chart") or
                        collab_result.get("echarts_config") or
                        collab_result.get("chart_config") or
                        (collab_result.get("result", {}).get("primary_chart") if isinstance(collab_result.get("result"), dict) else None) or
                        (collab_result.get("result", {}).get("echarts_config") if isinstance(collab_result.get("result"), dict) else None) or
                        (collab_result.get("result", {}).get("chart_config") if isinstance(collab_result.get("result"), dict) else None)
                    )
                    
                    # CRITICAL: If chart not found in dict fields, try extracting from result string (JSON)
                    if not chart or not isinstance(chart, dict):
                        result_text = collab_result.get("result", "")
                        if isinstance(result_text, str) and result_text.strip():
                            # Try to extract JSON chart config from text
                            import re
                            import json
                            # Look for JSON object in the text
                            json_match = re.search(r'\{[\s\S]*"title"[\s\S]*"series"[\s\S]*\}', result_text, re.DOTALL)
                            if json_match:
                                try:
                                    from app.modules.ai.utils.echarts_validation import fix_json_string, validate_echarts_config
                                    json_str = fix_json_string(json_match.group(0))
                                    chart = json.loads(json_str)
                                    # CRITICAL: Validate the extracted chart config
                                    is_valid, error_msg, validated_chart = validate_echarts_config(chart, strict=False)
                                    if is_valid and validated_chart:
                                        chart = validated_chart
                                        logger.info("✅ Extracted and validated chart config from result text (JSON string)")
                                    else:
                                        logger.warning(f"⚠️ Extracted chart config failed validation: {error_msg}")
                                        chart = None
                                except json.JSONDecodeError as e:
                                    logger.warning(f"⚠️ JSON decode error: {e}")
                                    # Try to find JSON after "ECharts Configuration:" or similar
                                    json_match2 = re.search(r'(?:ECharts Configuration|chart config|echarts_config)[:\s]*(\{[\s\S]*\})', result_text, re.IGNORECASE | re.DOTALL)
                                    if json_match2:
                                        try:
                                            from app.modules.ai.utils.echarts_validation import fix_json_string, validate_echarts_config
                                            json_str = fix_json_string(json_match2.group(1))
                                            chart = json.loads(json_str)
                                            # CRITICAL: Validate the extracted chart config
                                            is_valid, error_msg, validated_chart = validate_echarts_config(chart, strict=False)
                                            if is_valid and validated_chart:
                                                chart = validated_chart
                                                logger.info("✅ Extracted and validated chart config from prefixed result text")
                                            else:
                                                logger.warning(f"⚠️ Extracted chart config failed validation: {error_msg}")
                                                chart = None
                                        except json.JSONDecodeError:
                                            pass
                    
                    if chart and isinstance(chart, dict) and len(chart) > 0:
                        extracted["echarts_config"] = chart
                        extracted["chart_data"] = (
                            collab_result.get("data") or
                            collab_result.get("chart_data") or
                            (collab_result.get("result", {}).get("data") if isinstance(collab_result.get("result"), dict) else None)
                        )
                        logger.info(f"✅ Extracted chart from {agent_id} agent")
                
                # Extract insights from insights agent
                if not extracted["insights"] and (agent_id == "insights" or "insights" in str(agent_id).lower()):
                    insights = (
                        collab_result.get("insights") or
                        (collab_result.get("result", {}).get("insights") if isinstance(collab_result.get("result"), dict) else None)
                    )
                    if insights and isinstance(insights, list) and len(insights) > 0:
                        extracted["insights"] = insights
                        logger.info(f"✅ Extracted insights from {agent_id} agent: {len(insights)} insights")
                    
                    # Extract recommendations
                    recs = (
                        collab_result.get("recommendations") or
                        (collab_result.get("result", {}).get("recommendations") if isinstance(collab_result.get("result"), dict) else None)
                    )
                    if recs and isinstance(recs, list) and len(recs) > 0:
                        extracted["recommendations"] = recs
                        logger.info(f"✅ Extracted recommendations from {agent_id} agent: {len(recs)} recommendations")
                    
                    # Extract narration/executive_summary
                    exec_summary = collab_result.get("executive_summary")
                    if exec_summary:
                        if isinstance(exec_summary, dict):
                            narration_text = exec_summary.get("text") or exec_summary.get("summary") or exec_summary.get("content") or str(exec_summary)
                        else:
                            narration_text = str(exec_summary)
                        if narration_text and len(narration_text.strip()) > 50:
                            extracted["narration"] = narration_text
                            extracted["executive_summary"] = narration_text
                            logger.info(f"✅ Extracted narration from {agent_id} agent: {len(narration_text)} chars")
        
        # 4. Check metadata for nested results (standard flow stores them there)
        metadata = result.get("metadata", {})
        if not extracted["echarts_config"]:
            primary_agent_result = metadata.get("primary_agent_result", {})
            collaborating_results_meta = metadata.get("collaborating_results", [])
            
            # Check primary agent result
            if primary_agent_result:
                if not extracted["sql_query"]:
                    extracted["sql_query"] = primary_agent_result.get("sql_query")
                if not extracted["query_result"]:
                    extracted["query_result"] = primary_agent_result.get("query_result")
            
            # Check collaborating results in metadata
            for collab_result in collaborating_results_meta:
                agent_id = collab_result.get("agent_id", "unknown")
                
                if not extracted["echarts_config"] and agent_id == "chart_generation":
                    chart = (
                        collab_result.get("primary_chart") or
                        collab_result.get("echarts_config") or
                        collab_result.get("chart_config")
                    )
                    
                    # CRITICAL: If chart not found in dict fields, try extracting from result string (JSON)
                    if not chart or not isinstance(chart, dict):
                        result_text = collab_result.get("result", "")
                        if isinstance(result_text, str) and result_text.strip():
                            # Try to extract JSON chart config from text
                            import re
                            import json
                            # Look for JSON object in the text (ECharts config typically has "title" and "series")
                            json_match = re.search(r'\{[\s\S]*"title"[\s\S]*"series"[\s\S]*\}', result_text, re.DOTALL)
                            if json_match:
                                try:
                                    from app.modules.ai.utils.echarts_validation import fix_json_string, validate_echarts_config
                                    json_str = fix_json_string(json_match.group(0))
                                    chart = json.loads(json_str)
                                    # CRITICAL: Validate the extracted chart config
                                    is_valid, error_msg, validated_chart = validate_echarts_config(chart, strict=False)
                                    if is_valid and validated_chart:
                                        chart = validated_chart
                                        logger.info("✅ Extracted and validated chart config from metadata result text (JSON string)")
                                    else:
                                        logger.warning(f"⚠️ Extracted chart config failed validation: {error_msg}")
                                        chart = None
                                except json.JSONDecodeError as e:
                                    logger.warning(f"⚠️ JSON decode error: {e}")
                                    # Try to find JSON after "ECharts Configuration:" or similar
                                    json_match2 = re.search(r'(?:ECharts Configuration|chart config|echarts_config)[:\s]*(\{[\s\S]*\})', result_text, re.IGNORECASE | re.DOTALL)
                                    if json_match2:
                                        try:
                                            from app.modules.ai.utils.echarts_validation import fix_json_string, validate_echarts_config
                                            json_str = fix_json_string(json_match2.group(1))
                                            chart = json.loads(json_str)
                                            # CRITICAL: Validate the extracted chart config
                                            is_valid, error_msg, validated_chart = validate_echarts_config(chart, strict=False)
                                            if is_valid and validated_chart:
                                                chart = validated_chart
                                                logger.info("✅ Extracted and validated chart config from prefixed metadata result text")
                                            else:
                                                logger.warning(f"⚠️ Extracted chart config failed validation: {error_msg}")
                                                chart = None
                                        except json.JSONDecodeError:
                                            pass
                    
                    if chart and isinstance(chart, dict) and len(chart) > 0:
                        extracted["echarts_config"] = chart
                        logger.info(f"✅ Extracted chart from metadata {agent_id} agent")
                
                if not extracted["insights"] and agent_id == "insights":
                    insights = collab_result.get("insights")
                    if insights and isinstance(insights, list) and len(insights) > 0:
                        extracted["insights"] = insights
                        logger.info(f"✅ Extracted insights from metadata {agent_id} agent")
                    
                    exec_summary = collab_result.get("executive_summary")
                    if exec_summary and not extracted["narration"]:
                        if isinstance(exec_summary, dict):
                            narration_text = exec_summary.get("text") or exec_summary.get("summary") or exec_summary.get("content") or str(exec_summary)
                        else:
                            narration_text = str(exec_summary)
                        if narration_text and len(narration_text.strip()) > 50:
                            extracted["narration"] = narration_text
                            extracted["executive_summary"] = narration_text
    
    # Log what was extracted
    logger.info(f"📊 Extracted components: SQL={bool(extracted['sql_query'])}, Chart={bool(extracted['echarts_config'])}, Insights={len(extracted['insights'])}, Narration={bool(extracted['narration'])}")
    
    return extracted


def normalize_result_structure(result: Dict[str, Any]) -> Dict[str, Any]:
    """
    Normalize result structure to ensure consistent format.
    
    This ensures both enhanced pipeline and standard flow results
    have the same structure for the chat endpoint.
    
    Args:
        result: Raw result from orchestrator
    
    Returns:
        Normalized result with guaranteed structure
    """
    # Extract components using single source of truth
    extracted = extract_structured_components(result)
    
    # Build normalized structure
    normalized = {
        "success": result.get("success", True),  # Default to True if components exist
        "sql_query": extracted["sql_query"],
        "query_result": extracted["query_result"],
        "echarts_config": extracted["echarts_config"],
        "chart_data": extracted["chart_data"],
        "insights": extracted["insights"],
        "recommendations": extracted["recommendations"],
        "narration": extracted["narration"] or extracted["executive_summary"],
        "analysis": extracted["narration"] or extracted["executive_summary"],
        "result": extracted["narration"] or extracted["executive_summary"] or result.get("result", ""),
        "metadata": result.get("metadata", {}),
        "progress": result.get("progress", {})
    }
    
    # If we have components, mark as success
    has_components = any([
        normalized["sql_query"],
        normalized["echarts_config"],
        normalized["insights"],
        normalized["narration"]
    ])
    
    if has_components and not normalized["success"]:
        logger.info("✅ Components found - overriding success=False to success=True")
        normalized["success"] = True
    
    return normalized

