"""
Test script for LangGraph integration

Tests the LangGraph orchestrator with a simple query to verify:
1. End-to-end workflow execution
2. Response format compatibility with frontend
3. Progress state updates
4. Query result validation before chart/insights
"""

import asyncio
import os
import sys
import json
from pathlib import Path

# Add server to path
server_path = Path(__file__).parent / "packages" / "chat2chart" / "server"
sys.path.insert(0, str(server_path))

# Set environment variable to enable LangGraph
os.environ["USE_LANGGRAPH_ORCHESTRATOR"] = "true"

async def test_langgraph_workflow():
    """Test LangGraph workflow execution"""
    try:
        from app.modules.ai.services.langgraph_orchestrator import LangGraphMultiAgentOrchestrator
        from app.modules.ai.services.litellm_service import LiteLLMService
        from app.modules.data.services.data_connectivity_service import DataConnectivityService
        from app.modules.data.services.multi_engine_query_service import MultiEngineQueryService
        from app.modules.charts.services.chart_generation_service import ChartGenerationService
        from app.modules.chats.schemas import AgentContextSchema
        from app.db.session import async_session, get_sync_session
        
        print("🚀 Initializing LangGraph orchestrator...")
        
        litellm_service = LiteLLMService()
        data_service = DataConnectivityService()
        multi_query_service = MultiEngineQueryService()
        chart_service = ChartGenerationService()
        
        orchestrator = LangGraphMultiAgentOrchestrator(
            async_session_factory=async_session,
            sync_session_factory=get_sync_session,
            litellm_service=litellm_service,
            data_service=data_service,
            multi_query_service=multi_query_service,
            chart_service=chart_service
        )
        
        print("✅ Orchestrator initialized")
        
        # Test query
        test_query = "how many customers by year"
        conversation_id = "test-conversation-123"
        user_id = "test-user"
        organization_id = "test-org"
        
        # You'll need to provide a real data_source_id from your database
        # For testing, you can use None or a test data source ID
        data_source_id = None  # Replace with actual data source ID for real test
        
        print(f"\n📝 Testing query: '{test_query}'")
        print(f"   Data source: {data_source_id or 'None (will skip query execution)'}")
        
        # Build agent context
        agent_context = AgentContextSchema(
            user_id=user_id,
            user_role="user",
            organization_id=organization_id,
            project_id=None,
            data_sources=[data_source_id] if data_source_id else [],
            permissions={"read": True, "write": True},
            analysis_mode="standard"
        )
        
        # Execute workflow
        print("\n🔄 Executing workflow...")
        result = await orchestrator.execute(
            query=test_query,
            conversation_id=conversation_id,
            user_id=user_id,
            organization_id=organization_id,
            project_id=None,
            data_source_id=data_source_id,
            analysis_mode="standard",
            agent_context=agent_context,
            memory_state=None
        )
        
        # Print results
        print("\n📊 Results:")
        print(f"   Success: {result.get('success')}")
        print(f"   Query: {result.get('query')}")
        print(f"   SQL Query: {result.get('sql_query', 'None')[:100] if result.get('sql_query') else 'None'}...")
        
        query_result = result.get("query_result")
        if query_result:
            print(f"   Query Result: {query_result.get('row_count', 0)} rows")
        else:
            print(f"   Query Result: None")
        
        print(f"   Chart Config: {'Yes' if result.get('echarts_config') else 'No'}")
        print(f"   Insights: {len(result.get('insights', []))} items")
        print(f"   Recommendations: {len(result.get('recommendations', []))} items")
        print(f"   Narration: {result.get('narration', 'None')[:100]}...")
        
        progress = result.get("progress", {})
        print(f"   Progress: {progress.get('percentage', 0)}% - {progress.get('message', 'N/A')}")
        
        execution_metadata = result.get("execution_metadata", {})
        print(f"   Execution Time: {execution_metadata.get('execution_time_ms', 0)}ms")
        print(f"   Status: {execution_metadata.get('status', 'unknown')}")
        
        if result.get("error"):
            print(f"\n❌ Error: {result.get('error')}")
        else:
            print("\n✅ Workflow completed successfully!")
        
        # Verify response format compatibility
        print("\n🔍 Verifying response format compatibility...")
        required_fields = ["success", "query", "message", "narration", "analysis", "execution_metadata"]
        missing_fields = [field for field in required_fields if field not in result]
        
        if missing_fields:
            print(f"   ⚠️ Missing fields: {missing_fields}")
        else:
            print("   ✅ All required fields present")
        
        # Check if query results are validated before chart/insights
        has_query_result = bool(result.get("query_result") and result.get("query_result", {}).get("data"))
        has_chart = bool(result.get("echarts_config"))
        has_insights = bool(result.get("insights") and len(result.get("insights", [])) > 0)
        
        print(f"\n🔍 Validation checks:")
        print(f"   Has query result: {has_query_result}")
        print(f"   Has chart: {has_chart}")
        print(f"   Has insights: {has_insights}")
        
        if has_chart or has_insights:
            if has_query_result:
                print("   ✅ Chart/insights only generated when query results exist (correct)")
            else:
                print("   ⚠️ Chart/insights generated without query results (unexpected)")
        else:
            if not has_query_result:
                print("   ✅ No chart/insights when no query results (correct)")
            else:
                print("   ⚠️ No chart/insights despite having query results (may be expected if query failed)")
        
        return result
        
    except Exception as e:
        print(f"\n❌ Test failed: {e}")
        import traceback
        traceback.print_exc()
        return None


async def test_streaming():
    """Test streaming workflow execution"""
    try:
        from app.modules.ai.services.langgraph_orchestrator import LangGraphMultiAgentOrchestrator
        from app.modules.ai.services.litellm_service import LiteLLMService
        from app.modules.data.services.data_connectivity_service import DataConnectivityService
        from app.modules.data.services.multi_engine_query_service import MultiEngineQueryService
        from app.modules.charts.services.chart_generation_service import ChartGenerationService
        from app.modules.chats.schemas import AgentContextSchema
        from app.db.session import async_session, get_sync_session
        
        print("\n🌊 Testing streaming workflow...")
        
        litellm_service = LiteLLMService()
        data_service = DataConnectivityService()
        multi_query_service = MultiEngineQueryService()
        chart_service = ChartGenerationService()
        
        orchestrator = LangGraphMultiAgentOrchestrator(
            async_session_factory=async_session,
            sync_session_factory=get_sync_session,
            litellm_service=litellm_service,
            data_service=data_service,
            multi_query_service=multi_query_service,
            chart_service=chart_service
        )
        
        test_query = "show me customer trends"
        agent_context = AgentContextSchema(
            user_id="test-user",
            user_role="user",
            organization_id="test-org",
            data_sources=[],
            permissions={"read": True},
            analysis_mode="standard"
        )
        
        print("   Streaming progress updates...")
        update_count = 0
        async for update in orchestrator.stream_workflow(
            query=test_query,
            conversation_id="test-stream",
            user_id="test-user",
            organization_id="test-org",
            data_source_id=None,
            analysis_mode="standard",
            agent_context=agent_context,
            memory_state=None
        ):
            update_count += 1
            update_type = update.get("type", "unknown")
            if update_type == "progress":
                progress = update.get("progress", {})
                print(f"   [{update_count}] {progress.get('percentage', 0)}% - {progress.get('message', 'N/A')}")
            elif update_type == "complete":
                print(f"   [{update_count}] Complete: {update.get('success', False)}")
            elif update_type == "error":
                print(f"   [{update_count}] Error: {update.get('error', 'Unknown')}")
        
        print(f"   ✅ Received {update_count} streaming updates")
        
    except Exception as e:
        print(f"   ❌ Streaming test failed: {e}")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    print("=" * 60)
    print("LangGraph Integration Test")
    print("=" * 60)
    
    # Run tests
    asyncio.run(test_langgraph_workflow())
    # Uncomment to test streaming
    # asyncio.run(test_streaming())
    
    print("\n" + "=" * 60)
    print("Test completed")
    print("=" * 60)

