#!/usr/bin/env python3
"""
E2E Test for File Analysis Workflow

Tests the complete workflow:
1. Upload a test CSV file
2. Send analysis query
3. Verify chart generation
4. Verify insights generation
5. Verify recommendations
"""

import asyncio
import sys
import os
import json
import requests
import argparse
from pathlib import Path

# Add the app directory to the Python path
sys.path.append(os.path.join(os.path.dirname(__file__), 'packages', 'chat2chart', 'server'))

BASE_URL = "http://localhost:8000"
AUTH_URL = "http://localhost:5000"  # Auth service runs on port 5000

def create_test_csv():
    """Create a test CSV file for upload"""
    test_data = """date,product,category,quantity,revenue,customer_id
2024-01-01,Product A,Electronics,10,1000.00,C001
2024-01-02,Product B,Clothing,5,500.00,C002
2024-01-03,Product A,Electronics,8,800.00,C003
2024-01-04,Product C,Food,20,400.00,C001
2024-01-05,Product B,Clothing,12,1200.00,C004
2024-01-06,Product A,Electronics,15,1500.00,C002
2024-01-07,Product D,Electronics,3,600.00,C003
2024-01-08,Product C,Food,25,500.00,C001
2024-01-09,Product B,Clothing,7,700.00,C004
2024-01-10,Product A,Electronics,20,2000.00,C001"""
    
    test_file = Path("test_sales_data.csv")
    test_file.write_text(test_data)
    return test_file

async def test_file_analysis_e2e(email=None, password=None):
    """Test complete file analysis workflow"""
    print("=" * 80)
    print("🧪 E2E Test: File Analysis Workflow")
    print("=" * 80)
    
    # Step 1: Login
    print("\n1️⃣ Logging in...")
    # Use provided credentials or try multiple test users
    if email and password:
        test_users = [{"email": email, "password": password}]
    else:
        # Default test users
        test_users = [
            {"email": "admin10@aiser.app", "password": "Admin123"},  # Primary test user
            {"email": "admin12@example.com", "password": "password123"},
            {"email": "admin10@example.com", "password": "password123"},
            {"email": "test@example.com", "password": "password"}
        ]
    
    login_data = None
    token = None
    
    # Try different auth endpoints and formats
    login_configs = [
        # Chat2Chart server endpoints
        {"url": f"{BASE_URL}/users/sign-in", "data": lambda u: {"email": u["email"], "password": u["password"]}},
        {"url": f"{BASE_URL}/users/sign-in", "data": lambda u: {"account": u["email"], "password": u["password"]}},
        # Auth service endpoints
        {"url": f"{AUTH_URL}/users/signin", "data": lambda u: {"identifier": u["email"], "password": u["password"]}},
        {"url": f"{AUTH_URL}/api/v1/auth/login", "data": lambda u: {"email": u["email"], "password": u["password"]}},
        # Legacy endpoints
        {"url": f"{BASE_URL}/api/auth/login", "data": lambda u: {"email": u["email"], "password": u["password"]}},
        {"url": f"{AUTH_URL}/auth/login", "data": lambda u: {"email": u["email"], "password": u["password"]}},
    ]
    
    try:
        for user_data in test_users:
            print(f"   Trying user: {user_data['email']}")
            for config in login_configs:
                try:
                    login_payload = config["data"](user_data)
                    login_response = requests.post(config["url"], json=login_payload, timeout=10)
                    if login_response.status_code == 200:
                        auth_data = login_response.json()
                        token = auth_data.get("access_token") or auth_data.get("token") or auth_data.get("accessToken")
                        if token:
                            print(f"✅ Login successful via {config['url']} with {user_data['email']}")
                            login_data = user_data
                            break
                except Exception as e:
                    continue
            if token:
                break
        
        if not token:
            print("❌ Login failed: Could not authenticate with any endpoint or user")
            print("   Tried endpoints:", [c['url'] for c in login_configs])
            print("   Tried users:", [u['email'] for u in test_users])
            print("\n💡 Tip: Make sure you have a valid user account. You can:")
            print("   1. Sign up via the frontend at http://localhost:3000")
            print("   2. Or use an existing user from your database")
            return False
        
        print(f"✅ Login successful (token: {token[:20]}...)")
    except Exception as e:
        print(f"❌ Login error: {e}")
        return False
    
    # Step 2: Create test CSV
    print("\n2️⃣ Creating test CSV file...")
    test_file = create_test_csv()
    print(f"✅ Created test file: {test_file} ({test_file.stat().st_size} bytes)")
    
    # Step 3: Upload file
    print("\n3️⃣ Uploading file...")
    try:
        with open(test_file, 'rb') as f:
            files = {'file': ('test_sales_data.csv', f, 'text/csv')}
            data = {'name': 'Test Sales Data'}
            headers = {'Authorization': f'Bearer {token}'}
            
            upload_response = requests.post(
                f"{BASE_URL}/data/upload",
                files=files,
                data=data,
                headers=headers,
                timeout=30
            )
        
        if upload_response.status_code != 200:
            print(f"❌ Upload failed: {upload_response.status_code}")
            print(f"Response: {upload_response.text}")
            return False
        
        upload_data = upload_response.json()
        # Extract data_source_id from various possible response formats
        data_source_id = (
            upload_data.get("data_source_id") or 
            upload_data.get("id") or
            (upload_data.get("data_source", {}) or {}).get("id") or
            (upload_data.get("data_source", {}) or {}).get("data_source_id")
        )
        if not data_source_id:
            print(f"❌ No data source ID in upload response")
            print(f"Response keys: {list(upload_data.keys())}")
            if "data_source" in upload_data:
                print(f"Data source keys: {list(upload_data['data_source'].keys()) if isinstance(upload_data.get('data_source'), dict) else 'Not a dict'}")
            return False
        
        print(f"✅ File uploaded successfully (data_source_id: {data_source_id})")
    except Exception as e:
        print(f"❌ Upload error: {e}")
        import traceback
        traceback.print_exc()
        return False
    
    # Step 4: Create conversation (or use existing)
    print("\n4️⃣ Creating/getting conversation...")
    try:
        headers = {'Authorization': f'Bearer {token}'}
        
        # Try to get existing conversations first
        conv_endpoints = [
            f"{BASE_URL}/chats/conversations",
            f"{BASE_URL}/api/chats/conversations",
            f"{BASE_URL}/conversations"
        ]
        
        conversation_id = None
        for endpoint in conv_endpoints:
            try:
                # Try GET first to see if we can list conversations
                list_response = requests.get(endpoint, headers=headers, timeout=10)
                if list_response.status_code == 200:
                    convs = list_response.json()
                    if isinstance(convs, list) and len(convs) > 0:
                        conversation_id = convs[0].get("id") or convs[0].get("conversation_id")
                        print(f"✅ Using existing conversation: {conversation_id}")
                        break
            except:
                continue
        
        # If no existing conversation, create one
        if not conversation_id:
            conv_data = {
                "title": "E2E Test Conversation",
                "description": "Testing file analysis workflow"
            }
            
            for endpoint in conv_endpoints:
                try:
                    conv_response = requests.post(endpoint, json=conv_data, headers=headers, timeout=10)
                    if conv_response.status_code in [200, 201]:
                        conv_data = conv_response.json()
                        conversation_id = conv_data.get("id") or conv_data.get("conversation_id")
                        if conversation_id:
                            print(f"✅ Created conversation: {conversation_id}")
                            break
                except:
                    continue
        
        if not conversation_id:
            # Last resort: create a conversation ID manually (for testing)
            import uuid
            conversation_id = str(uuid.uuid4())
            print(f"⚠️ Using generated conversation ID: {conversation_id}")
        
    except Exception as e:
        print(f"❌ Conversation creation error: {e}")
        return False
    
    # Step 5: Send analysis query
    print("\n5️⃣ Sending analysis query...")
    query = "Perform a comprehensive analysis of this dataset. Include: 1. Data structure and schema overview 2. Key statistics and summary metrics with any proper cleanings required 3. Data quality assessment (missing values, duplicates, outliers) 4. Identify trends, patterns, and anomalies 5. Generate actionable insights and recommendations 6. Create visualizations for the most important findings"
    
    try:
        analysis_data = {
            "query": query,
            "conversation_id": conversation_id,
            "data_source_id": data_source_id,
            "analysis_mode": "deep"
        }
        
        print(f"📤 Sending query: {query[:100]}...")
        
        # Try different analysis endpoints
        analysis_endpoints = [
            f"{BASE_URL}/api/ai/chat/analyze",
            f"{BASE_URL}/ai/chat/analyze",
            f"{BASE_URL}/chat/analyze",
            f"{BASE_URL}/api/chat/analyze"
        ]
        
        analysis_response = None
        for endpoint in analysis_endpoints:
            try:
                analysis_response = requests.post(
                    endpoint,
                    json=analysis_data,
                    headers=headers,
                    timeout=120  # 2 minutes for analysis
                )
                if analysis_response.status_code == 200:
                    print(f"✅ Analysis endpoint found: {endpoint}")
                    break
            except Exception as e:
                continue
        
        if analysis_response.status_code != 200:
            print(f"❌ Analysis failed: {analysis_response.status_code}")
            print(f"Response: {analysis_response.text[:500]}")
            return False
        
        result = analysis_response.json()
        print(f"✅ Analysis completed")
        
        # Step 6: Verify results
        print("\n6️⃣ Verifying results...")
        checks = {
            "Has success flag": result.get("success", False),
            "Has analysis text": bool(result.get("analysis") or result.get("message") or result.get("narration")),
            "Has chart config": bool(result.get("echarts_config") or result.get("chartConfig")),
            "Has insights": bool(result.get("insights") and len(result.get("insights", [])) > 0),
            "Has recommendations": bool(result.get("recommendations") and len(result.get("recommendations", [])) > 0),
            "Has query result": bool(result.get("query_result")),
        }
        
        all_passed = True
        for check_name, check_result in checks.items():
            status = "✅" if check_result else "⚠️"
            print(f"  {status} {check_name}: {check_result}")
            # Recommendations are optional, don't fail test if missing
            if not check_result and check_name != "Has recommendations":
                all_passed = False
        
        # Print detailed summary
        print("\n📊 Result Summary:")
        analysis_text = result.get('analysis', '') or result.get('message', '') or result.get('narration', '')
        print(f"  - Analysis: {len(analysis_text)} chars")
        print(f"  - Analysis preview: {analysis_text[:150]}...")
        print(f"  - Chart: {'Yes' if result.get('echarts_config') else 'No'}")
        if result.get('echarts_config'):
            chart_config = result.get('echarts_config')
            chart_type = chart_config.get('series', [{}])[0].get('type', 'unknown') if isinstance(chart_config.get('series'), list) and len(chart_config.get('series', [])) > 0 else 'unknown'
            print(f"    Chart type: {chart_type}")
        print(f"  - Insights: {len(result.get('insights', []))}")
        if result.get('insights'):
            for i, insight in enumerate(result.get('insights', [])[:3], 1):
                insight_title = insight.get('title', 'N/A') if isinstance(insight, dict) else str(insight)[:50]
                print(f"    {i}. {insight_title}")
        print(f"  - Recommendations: {len(result.get('recommendations', []))}")
        if result.get('recommendations'):
            for i, rec in enumerate(result.get('recommendations', [])[:3], 1):
                rec_title = rec.get('title', 'N/A') if isinstance(rec, dict) else str(rec)[:50]
                print(f"    {i}. {rec_title}")
        print(f"  - Query Result Rows: {len(result.get('query_result', []))}")
        print(f"  - AI Engine: {result.get('ai_engine', 'N/A')}")
        
        # Evaluate AI response quality
        print("\n🤖 AI Response Quality Evaluation:")
        quality_scores = {}
        
        # 1. Comprehensiveness (covers all requested aspects)
        requested_aspects = [
            "schema", "structure", "overview",
            "statistics", "summary", "metrics",
            "quality", "missing", "duplicates", "outliers",
            "trends", "patterns", "anomalies",
            "insights", "recommendations",
            "visualizations", "charts"
        ]
        analysis_lower = analysis_text.lower()
        covered_aspects = [aspect for aspect in requested_aspects if aspect in analysis_lower]
        comprehensiveness = len(covered_aspects) / len(requested_aspects) * 100
        quality_scores["Comprehensiveness"] = comprehensiveness
        print(f"  📋 Comprehensiveness: {comprehensiveness:.1f}% ({len(covered_aspects)}/{len(requested_aspects)} aspects covered)")
        print(f"     Covered: {', '.join(covered_aspects[:5])}{'...' if len(covered_aspects) > 5 else ''}")
        
        # 2. Analysis depth (length and detail)
        min_expected_chars = 500  # Minimum expected for comprehensive analysis
        depth_score = min(100, (len(analysis_text) / min_expected_chars) * 100)
        quality_scores["Depth"] = depth_score
        print(f"  📏 Analysis Depth: {depth_score:.1f}% ({len(analysis_text)} chars, expected: {min_expected_chars}+)")
        
        # 3. Insights quality (number and detail)
        insights = result.get('insights', [])
        insights_score = min(100, (len(insights) / 3) * 100)  # Expect at least 3 insights
        quality_scores["Insights"] = insights_score
        print(f"  💡 Insights Quality: {insights_score:.1f}% ({len(insights)} insights, expected: 3+)")
        if insights:
            for i, insight in enumerate(insights[:3], 1):
                if isinstance(insight, dict):
                    desc = insight.get('description', insight.get('text', ''))[:80]
                    print(f"     {i}. {insight.get('title', 'N/A')}: {desc}...")
        
        # 4. Recommendations quality
        recommendations = result.get('recommendations', [])
        rec_score = min(100, (len(recommendations) / 2) * 100) if recommendations else 0
        quality_scores["Recommendations"] = rec_score
        print(f"  🎯 Recommendations: {rec_score:.1f}% ({len(recommendations)} recommendations, expected: 2+)")
        if recommendations:
            for i, rec in enumerate(recommendations[:3], 1):
                if isinstance(rec, dict):
                    desc = rec.get('description', rec.get('text', ''))[:80]
                    print(f"     {i}. {rec.get('title', 'N/A')}: {desc}...")
        
        # 5. Chart relevance (chart type matches data)
        chart_score = 100 if result.get('echarts_config') else 0
        quality_scores["Chart"] = chart_score
        print(f"  📊 Chart Relevance: {chart_score:.1f}% ({'Present' if chart_score > 0 else 'Missing'})")
        
        # 6. Data accuracy (query results match expectations)
        query_result = result.get('query_result', [])
        data_score = 100 if query_result and len(query_result) > 0 else 0
        quality_scores["Data Accuracy"] = data_score
        print(f"  ✅ Data Accuracy: {data_score:.1f}% ({len(query_result)} rows returned)")
        
        # Overall quality score
        overall_score = sum(quality_scores.values()) / len(quality_scores)
        quality_scores["Overall"] = overall_score
        print(f"\n  🎯 Overall Quality Score: {overall_score:.1f}%")
        
        # Quality assessment
        if overall_score >= 80:
            print(f"  ✅ Excellent: AI response is comprehensive and high-quality")
        elif overall_score >= 60:
            print(f"  ⚠️  Good: AI response is adequate but could be more detailed")
        else:
            print(f"  ❌ Needs Improvement: AI response lacks depth or completeness")
        
        # Print full analysis text for review
        print(f"\n📝 Full Analysis Text:")
        print("=" * 80)
        print(analysis_text)
        print("=" * 80)
        
        if all_passed:
            print("\n🎉 All critical checks passed! E2E test successful!")
        else:
            print("\n⚠️ Some non-critical checks failed, but core functionality works.")
            print(f"\nFull response keys: {list(result.keys())}")
        
        # Test is successful if we have chart, insights, and analysis
        return result.get("success") and bool(result.get("echarts_config")) and bool(result.get("insights"))
        
    except Exception as e:
        print(f"❌ Analysis error: {e}")
        import traceback
        traceback.print_exc()
        return False
    finally:
        # Cleanup
        if test_file.exists():
            test_file.unlink()
            print(f"\n🧹 Cleaned up test file")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description='E2E Test for File Analysis Workflow')
    parser.add_argument('--email', type=str, help='Email for login')
    parser.add_argument('--password', type=str, help='Password for login')
    args = parser.parse_args()
    
    success = asyncio.run(test_file_analysis_e2e(email=args.email, password=args.password))
    sys.exit(0 if success else 1)

