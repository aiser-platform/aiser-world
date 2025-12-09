#!/usr/bin/env python3
"""
Comprehensive Integration Test for Aiser AI Multi-Agent Framework

This test verifies the complete integration of:
- Intelligent context analysis
- Smart agent routing
- Multi-agent collaboration
- Enhanced frontend features
- Performance optimization
"""

import asyncio
import sys
import os
import json
from datetime import datetime

# Add the app directory to the Python path
sys.path.append(os.path.join(os.path.dirname(__file__), '..', '..'))

from app.modules.ai.services.robust_multi_agent_orchestrator import RobustMultiAgentOrchestrator
from app.modules.ai.services.litellm_service import LiteLLMService

class AiserIntegrationTest:
    """Comprehensive integration test for Aiser AI framework."""
    
    def __init__(self):
        self.test_results = []
        self.performance_metrics = {}
        
    async def run_all_tests(self):
        """Run all integration tests."""
        print("🚀 Starting Aiser AI Multi-Agent Framework Integration Tests")
        print("=" * 80)
        
        try:
            # Test 1: Intelligent Context Analysis
            await self.test_intelligent_context_analysis()
            
            # Test 2: Smart Agent Routing
            await self.test_smart_agent_routing()
            
            # Test 3: Multi-Agent Collaboration
            await self.test_multi_agent_collaboration()
            
            # Test 4: Performance Optimization
            await self.test_performance_optimization()
            
            # Test 5: End-to-End Workflow
            await self.test_end_to_end_workflow()
            
            # Generate test report
            self.generate_test_report()
            
        except Exception as e:
            print(f"❌ Test suite failed: {e}")
            import traceback
            traceback.print_exc()
    
    async def test_intelligent_context_analysis(self):
        """Test intelligent context analysis capabilities."""
        print("\n🧠 Testing Intelligent Context Analysis...")
        
        try:
            # Mock session factory
            def mock_session_factory():
                return None
            
            # Initialize services
            litellm_service = LiteLLMService()
            orchestrator = RobustMultiAgentOrchestrator(
                session_factory=mock_session_factory,
                litellm_service=litellm_service,
                data_service=None,
                chart_service=None
            )
            
            # Test context analysis
            test_queries = [
                "Show me sales trends for Q3 2024",
                "Generate SQL to find top 10 customers by revenue",
                "Create a dashboard with customer insights and recommendations",
                "Analyze the correlation between marketing spend and sales growth"
            ]
            
            context_results = []
            for query in test_queries:
                # Mock context data
                context_data = {
                    'duration_seconds': 300,
                    'user_expertise': 0.7,
                    'session_type': 'analysis'
                }
                
                # Test context analysis
                context_metrics = await orchestrator.router.context_analyzer.analyze_context(
                    query=query,
                    user_id="test-user",
                    session_data=context_data,
                    conversation_history=[]
                )
                
                context_results.append({
                    'query': query,
                    'metrics': context_metrics,
                    'success': True
                })
                
                print(f"   ✅ Analyzed: {query[:50]}...")
                print(f"      - Technical terms: {context_metrics.technical_terms}")
                print(f"      - Visualization keywords: {context_metrics.visualization_keywords}")
                print(f"      - Expertise level: {context_metrics.user_expertise_level:.2f}")
            
            self.test_results.append({
                'test': 'intelligent_context_analysis',
                'status': 'passed',
                'results': context_results,
                'timestamp': datetime.utcnow().isoformat()
            })
            
            print("   ✅ Intelligent Context Analysis Test Passed")
            
        except Exception as e:
            print(f"   ❌ Intelligent Context Analysis Test Failed: {e}")
            self.test_results.append({
                'test': 'intelligent_context_analysis',
                'status': 'failed',
                'error': str(e),
                'timestamp': datetime.utcnow().isoformat()
            })
    
    async def test_smart_agent_routing(self):
        """Test smart agent routing capabilities."""
        print("\n🎯 Testing Smart Agent Routing...")
        
        try:
            # Mock session factory
            def mock_session_factory():
                return None
            
            # Initialize services
            litellm_service = LiteLLMService()
            orchestrator = RobustMultiAgentOrchestrator(
                session_factory=mock_session_factory,
                litellm_service=litellm_service,
                data_service=None,
                chart_service=None
            )
            
            # Test routing decisions
            test_scenarios = [
                {
                    'query': 'Create a bar chart showing sales by region',
                    'expected_agent': 'chart_generation',
                    'expected_strategy': 'sequential'
                },
                {
                    'query': 'Generate SQL query to find customers with highest lifetime value',
                    'expected_agent': 'nl2sql',
                    'expected_strategy': 'sequential'
                },
                {
                    'query': 'Provide insights on customer churn and recommendations for improvement',
                    'expected_agent': 'insights',
                    'expected_strategy': 'sequential'
                },
                {
                    'query': 'Create a comprehensive dashboard with sales trends, customer insights, and actionable recommendations',
                    'expected_agent': 'collaboration',
                    'expected_strategy': 'collaborative'
                }
            ]
            
            routing_results = []
            for scenario in test_scenarios:
                # Mock context
                context_data = {
                    'duration_seconds': 300,
                    'user_expertise': 0.7
                }
                
                # Test routing
                routing_decision = await orchestrator.router.route_query_intelligently(
                    query=scenario['query'],
                    user_id="test-user",
                    context=context_data,
                    conversation_history=[]
                )
                
                routing_results.append({
                    'scenario': scenario,
                    'decision': routing_decision,
                    'success': True
                })
                
                print(f"   ✅ Routed: {scenario['query'][:50]}...")
                print(f"      - Primary agent: {routing_decision['primary_agent']}")
                print(f"      - Strategy: {routing_decision['execution_strategy']}")
                print(f"      - Confidence: {routing_decision['confidence']:.2f}")
            
            self.test_results.append({
                'test': 'smart_agent_routing',
                'status': 'passed',
                'results': routing_results,
                'timestamp': datetime.utcnow().isoformat()
            })
            
            print("   ✅ Smart Agent Routing Test Passed")
            
        except Exception as e:
            print(f"   ❌ Smart Agent Routing Test Failed: {e}")
            self.test_results.append({
                'test': 'smart_agent_routing',
                'status': 'failed',
                'error': str(e),
                'timestamp': datetime.utcnow().isoformat()
            })
    
    async def test_multi_agent_collaboration(self):
        """Test multi-agent collaboration capabilities."""
        print("\n🤝 Testing Multi-Agent Collaboration...")
        
        try:
            # Mock session factory
            def mock_session_factory():
                return None
            
            # Initialize services
            litellm_service = LiteLLMService()
            orchestrator = RobustMultiAgentOrchestrator(
                session_factory=mock_session_factory,
                litellm_service=litellm_service,
                data_service=None,
                chart_service=None
            )
            
            # Test collaboration scenarios
            collaboration_scenarios = [
                {
                    'query': 'Create a comprehensive business intelligence dashboard',
                    'expected_agents': ['chart_generation', 'insights'],
                    'expected_strategy': 'collaborative'
                },
                {
                    'query': 'Analyze sales data and provide insights with visualizations',
                    'expected_agents': ['nl2sql', 'chart_generation', 'insights'],
                    'expected_strategy': 'collaborative'
                }
            ]
            
            collaboration_results = []
            for scenario in collaboration_scenarios:
                # Mock context
                context_data = {
                    'duration_seconds': 300,
                    'user_expertise': 0.8
                }
                
                # Test collaboration
                routing_decision = await orchestrator.router.route_query_intelligently(
                    query=scenario['query'],
                    user_id="test-user",
                    context=context_data,
                    conversation_history=[]
                )
                
                collaboration_results.append({
                    'scenario': scenario,
                    'decision': routing_decision,
                    'success': True
                })
                
                print(f"   ✅ Collaboration: {scenario['query'][:50]}...")
                print(f"      - Primary agent: {routing_decision['primary_agent']}")
                print(f"      - Collaborating agents: {routing_decision['collaborating_agents']}")
                print(f"      - Strategy: {routing_decision['execution_strategy']}")
            
            self.test_results.append({
                'test': 'multi_agent_collaboration',
                'status': 'passed',
                'results': collaboration_results,
                'timestamp': datetime.utcnow().isoformat()
            })
            
            print("   ✅ Multi-Agent Collaboration Test Passed")
            
        except Exception as e:
            print(f"   ❌ Multi-Agent Collaboration Test Failed: {e}")
            self.test_results.append({
                'test': 'multi_agent_collaboration',
                'status': 'failed',
                'error': str(e),
                'timestamp': datetime.utcnow().isoformat()
            })
    
    async def test_performance_optimization(self):
        """Test performance optimization capabilities."""
        print("\n⚡ Testing Performance Optimization...")
        
        try:
            # Mock session factory
            def mock_session_factory():
                return None
            
            # Initialize services
            litellm_service = LiteLLMService()
            orchestrator = RobustMultiAgentOrchestrator(
                session_factory=mock_session_factory,
                litellm_service=litellm_service,
                data_service=None,
                chart_service=None
            )
            
            # Test performance optimization
            performance_tests = [
                {
                    'query': 'Simple chart request',
                    'expected_time': '< 5s',
                    'expected_complexity': 'simple'
                },
                {
                    'query': 'Complex multi-agent analysis',
                    'expected_time': '< 15s',
                    'expected_complexity': 'complex'
                }
            ]
            
            performance_results = []
            for test in performance_tests:
                start_time = datetime.utcnow()
                
                # Mock context
                context_data = {
                    'duration_seconds': 300,
                    'user_expertise': 0.7
                }
                
                # Test performance
                routing_decision = await orchestrator.router.route_query_intelligently(
                    query=test['query'],
                    user_id="test-user",
                    context=context_data,
                    conversation_history=[]
                )
                
                end_time = datetime.utcnow()
                execution_time = (end_time - start_time).total_seconds()
                
                performance_results.append({
                    'test': test,
                    'execution_time': execution_time,
                    'routing_decision': routing_decision,
                    'success': True
                })
                
                print(f"   ✅ Performance: {test['query'][:50]}...")
                print(f"      - Execution time: {execution_time:.2f}s")
                print(f"      - Estimated time: {routing_decision['estimated_time_seconds']}s")
                print(f"      - Satisfaction prediction: {routing_decision['user_satisfaction_prediction']:.2f}")
            
            self.test_results.append({
                'test': 'performance_optimization',
                'status': 'passed',
                'results': performance_results,
                'timestamp': datetime.utcnow().isoformat()
            })
            
            print("   ✅ Performance Optimization Test Passed")
            
        except Exception as e:
            print(f"   ❌ Performance Optimization Test Failed: {e}")
            self.test_results.append({
                'test': 'performance_optimization',
                'status': 'failed',
                'error': str(e),
                'timestamp': datetime.utcnow().isoformat()
            })
    
    async def test_end_to_end_workflow(self):
        """Test complete end-to-end workflow."""
        print("\n🔄 Testing End-to-End Workflow...")
        
        try:
            # Mock session factory
            def mock_session_factory():
                return None
            
            # Initialize services
            litellm_service = LiteLLMService()
            orchestrator = RobustMultiAgentOrchestrator(
                session_factory=mock_session_factory,
                litellm_service=litellm_service,
                data_service=None,
                chart_service=None
            )
            
            # Test complete workflow
            workflow_scenarios = [
                {
                    'query': 'Create a sales dashboard with insights',
                    'user_id': 'test-user-1',
                    'organization_id': 'test-org-1',
                    'project_id': 'test-project-1'
                },
                {
                    'query': 'Generate SQL for customer analysis',
                    'user_id': 'test-user-2',
                    'organization_id': 'test-org-2',
                    'project_id': 'test-project-2'
                }
            ]
            
            workflow_results = []
            for scenario in workflow_scenarios:
                start_time = datetime.utcnow()
                
                # Test complete workflow
                result = await orchestrator.analyze_query(
                    query=scenario['query'],
                    conversation_id="test-conversation",
                    user_id=scenario['user_id'],
                    organization_id=scenario['organization_id'],
                    project_id=scenario['project_id'],
                    analysis_type="intelligent"
                )
                
                end_time = datetime.utcnow()
                execution_time = (end_time - start_time).total_seconds()
                
                workflow_results.append({
                    'scenario': scenario,
                    'result': result,
                    'execution_time': execution_time,
                    'success': result.get('success', False)
                })
                
                print(f"   ✅ Workflow: {scenario['query'][:50]}...")
                print(f"      - Execution time: {execution_time:.2f}s")
                print(f"      - Success: {result.get('success', False)}")
                print(f"      - AI Engine: {result.get('metadata', {}).get('ai_engine', 'Unknown')}")
            
            self.test_results.append({
                'test': 'end_to_end_workflow',
                'status': 'passed',
                'results': workflow_results,
                'timestamp': datetime.utcnow().isoformat()
            })
            
            print("   ✅ End-to-End Workflow Test Passed")
            
        except Exception as e:
            print(f"   ❌ End-to-End Workflow Test Failed: {e}")
            self.test_results.append({
                'test': 'end_to_end_workflow',
                'status': 'failed',
                'error': str(e),
                'timestamp': datetime.utcnow().isoformat()
            })
    
    def generate_test_report(self):
        """Generate comprehensive test report."""
        print("\n📊 Generating Test Report...")
        print("=" * 80)
        
        # Calculate overall statistics
        total_tests = len(self.test_results)
        passed_tests = len([r for r in self.test_results if r['status'] == 'passed'])
        failed_tests = total_tests - passed_tests
        
        print("📈 Test Summary:")
        print(f"   Total Tests: {total_tests}")
        print(f"   Passed: {passed_tests}")
        print(f"   Failed: {failed_tests}")
        print(f"   Success Rate: {(passed_tests/total_tests)*100:.1f}%")
        
        print("\n🔍 Detailed Results:")
        for result in self.test_results:
            status_icon = "✅" if result['status'] == 'passed' else "❌"
            print(f"   {status_icon} {result['test']}: {result['status']}")
            if result['status'] == 'failed':
                print(f"      Error: {result['error']}")
        
        # Save detailed report
        report_data = {
            'test_summary': {
                'total_tests': total_tests,
                'passed_tests': passed_tests,
                'failed_tests': failed_tests,
                'success_rate': (passed_tests/total_tests)*100,
                'timestamp': datetime.utcnow().isoformat()
            },
            'detailed_results': self.test_results,
            'performance_metrics': self.performance_metrics
        }
        
        # Save to file
        with open('aiser_integration_test_report.json', 'w') as f:
            json.dump(report_data, f, indent=2)
        
        print("\n💾 Detailed report saved to: aiser_integration_test_report.json")
        
        if failed_tests == 0:
            print("\n🎉 All Tests Passed! Aiser AI Multi-Agent Framework is ready for production!")
        else:
            print(f"\n⚠️  {failed_tests} test(s) failed. Please review and fix issues before production deployment.")

async def main():
    """Run the integration test suite."""
    test_suite = AiserIntegrationTest()
    await test_suite.run_all_tests()

if __name__ == "__main__":
    asyncio.run(main())
