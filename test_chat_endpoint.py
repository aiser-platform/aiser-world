#!/usr/bin/env python3
"""
Test script for /chat endpoint end-to-end
Tests NL→SQL→Chart→Narration flow with ClickHouse data source
"""

import requests
import json
import sys

# Configuration
BASE_URL = "http://localhost:8000"
TEST_USERNAME = "admin"
TEST_USER_PASSWORD = "admin123"  # Adjust if needed

# ClickHouse data source ID (get from database)
CLICKHOUSE_DS_ID = "db_clickhouse_1762496160"  # Update if needed

def login():
    """Login and get JWT token"""
    print("🔐 Step 1: Logging in...")
    response = requests.post(
        f"{BASE_URL}/auth/login",
        json={"username": TEST_USERNAME, "password": TEST_USER_PASSWORD},
        headers={"Content-Type": "application/json"}
    )
    
    if response.status_code != 200:
        print(f"❌ Login failed: {response.status_code} - {response.text}")
        return None, None
    
    # Extract token from cookies (preferred method)
    cookies = response.cookies
    token = cookies.get("c2c_access_token") or cookies.get("access_token") or cookies.get("token")
    
    # Also check response body for token
    response_data = {}
    try:
        response_data = response.json()
        if not token:
            token = response_data.get("access_token") or response_data.get("token")
    except Exception:
        pass
    
    # Get user info from response
    user_id = None
    if response_data:
        user_id = response_data.get("user", {}).get("id") or response_data.get("user_id") or response_data.get("id")
    
    if token:
        print("✅ Login successful")
        print(f"   Token: {token[:30]}...")
        print(f"   User ID: {user_id}")
        print(f"   Cookies: {list(cookies.keys())}")
        return token, cookies
    else:
        print("❌ No token found in response.")
        print(f"   Cookies: {dict(cookies)}")
        print(f"   Response: {response.text[:200]}")
        return None, None

def get_data_sources(token, cookies):
    """Get available data sources"""
    print("\n📊 Step 2: Getting data sources...")
    # Use both Authorization header and cookies
    headers = {}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    
    # Convert cookies object to dict if needed
    cookie_dict = dict(cookies) if cookies else {}
    if token and "c2c_access_token" not in cookie_dict and "access_token" not in cookie_dict:
        cookie_dict["c2c_access_token"] = token
        cookie_dict["access_token"] = token
    
    response = requests.get(
        f"{BASE_URL}/data/sources",
        headers=headers,
        cookies=cookie_dict
    )
    
    if response.status_code == 200:
        data = response.json()
        sources = data if isinstance(data, list) else data.get("data", [])
        clickhouse_sources = [s for s in sources if "clickhouse" in s.get("type", "").lower() or "clickhouse" in s.get("name", "").lower()]
        print(f"✅ Found {len(sources)} data sources")
        if clickhouse_sources:
            print(f"✅ Found {len(clickhouse_sources)} ClickHouse source(s):")
            for ds in clickhouse_sources:
                print(f"   - {ds.get('id')}: {ds.get('name')}")
            return clickhouse_sources[0].get("id") if clickhouse_sources else CLICKHOUSE_DS_ID
        return CLICKHOUSE_DS_ID
    else:
        print(f"⚠️ Could not get data sources: {response.status_code}")
        return CLICKHOUSE_DS_ID

def test_chat_endpoint(token, cookies, data_source_id, query):
    """Test the /chat endpoint"""
    print(f"\n💬 Step 3: Testing /chat endpoint with query: '{query}'")
    print(f"   Using data source: {data_source_id}")
    
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    
    # Convert cookies object to dict if needed
    cookie_dict = dict(cookies) if cookies else {}
    if token and "c2c_access_token" not in cookie_dict and "access_token" not in cookie_dict:
        cookie_dict["c2c_access_token"] = token
        cookie_dict["access_token"] = token
    
    payload = {
        "query": query,
        "data_source_id": data_source_id,
        "analysis_mode": "standard"
    }
    
    print(f"📤 Sending request to {BASE_URL}/chat...")
    print(f"   Payload: {json.dumps(payload, indent=2)}")
    
    try:
        response = requests.post(
            f"{BASE_URL}/chat",
            json=payload,
            headers=headers,
            cookies=cookie_dict,
            timeout=120  # 2 minute timeout for AI processing
        )
        
        print(f"\n📥 Response status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print("✅ Chat request successful!")
            print("\n📋 Response structure:")
            print(f"   - Keys: {list(data.keys())}")
            
            # Check for SQL
            if "sql" in data or "query" in data:
                sql = data.get("sql") or data.get("query")
                print("\n🔍 Generated SQL:")
                print(f"   {sql[:200]}..." if len(str(sql)) > 200 else f"   {sql}")
            
            # Check for chart
            if "chart" in data or "echarts_config" in data:
                chart = data.get("chart") or data.get("echarts_config")
                print(f"\n📊 Chart generated: {type(chart)}")
                if isinstance(chart, dict):
                    print(f"   Chart type: {chart.get('type', 'unknown')}")
            
            # Check for narration
            if "narration" in data or "insights" in data or "answer" in data:
                narration = data.get("narration") or data.get("insights") or data.get("answer")
                print("\n💭 Narration/Insights:")
                print(f"   {str(narration)[:300]}..." if len(str(narration)) > 300 else f"   {narration}")
            
            # Check for data
            if "data" in data:
                data_rows = data.get("data", [])
                print(f"\n📈 Data rows returned: {len(data_rows)}")
                if data_rows:
                    print(f"   First row: {data_rows[0]}")
            
            return True, data
        else:
            print(f"❌ Chat request failed: {response.status_code}")
            print(f"   Response: {response.text[:500]}")
            return False, None
            
    except requests.exceptions.Timeout:
        print("❌ Request timed out after 120 seconds")
        return False, None
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
        return False, None

def main():
    """Main test flow"""
    print("=" * 60)
    print("🧪 Testing /chat Endpoint End-to-End")
    print("=" * 60)
    
    # Step 1: Login
    token, cookies = login()
    if not token:
        print("\n❌ Cannot proceed without authentication token")
        sys.exit(1)
    
    # Step 2: Get data sources
    data_source_id = get_data_sources(token, cookies)
    if not data_source_id:
        print("\n❌ Cannot proceed without data source")
        sys.exit(1)
    
    # Step 3: Test chat endpoint with various queries
    test_queries = [
        "Show me total sales by month",
        "What are the top 10 products by revenue?",
        "SELECT * FROM sales_data LIMIT 10"
    ]
    
    success_count = 0
    for i, query in enumerate(test_queries, 1):
        print(f"\n{'=' * 60}")
        print(f"Test {i}/{len(test_queries)}: {query}")
        print(f"{'=' * 60}")
        
        success, response_data = test_chat_endpoint(token, cookies, data_source_id, query)
        if success:
            success_count += 1
            print(f"✅ Test {i} passed")
        else:
            print(f"❌ Test {i} failed")
        
        # Small delay between tests
        import time
        time.sleep(2)
    
    # Summary
    print(f"\n{'=' * 60}")
    print(f"📊 Test Summary: {success_count}/{len(test_queries)} tests passed")
    print(f"{'=' * 60}")
    
    if success_count == len(test_queries):
        print("✅ All tests passed!")
        sys.exit(0)
    else:
        print("⚠️ Some tests failed. Check logs above.")
        sys.exit(1)

if __name__ == "__main__":
    main()

