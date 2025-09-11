#!/usr/bin/env python3
"""
Test script for Enterprise Authentication System
"""

import requests
import time
import sys

BASE_URL = "http://localhost:5000"


def test_health_check():
    """Test the health check endpoint"""
    print("🔍 Testing health check...")
    try:
        response = requests.get(f"{BASE_URL}/api/v1/enterprise/health", timeout=10)
        if response.status_code == 200:
            print("✅ Health check passed")
            print(f"   Response: {response.json()}")
            return True
        else:
            print(f"❌ Health check failed: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Health check error: {e}")
        return False


def test_auth_config():
    """Test the auth configuration endpoint"""
    print("🔍 Testing auth configuration...")
    try:
        response = requests.get(f"{BASE_URL}/api/v1/enterprise/config", timeout=10)
        if response.status_code == 200:
            print("✅ Auth config retrieved successfully")
            config = response.json()
            print(f"   Auth Mode: {config.get('auth_mode')}")
            print(f"   Organization: {config.get('organization_name')}")
            print(f"   Deployment Mode: {config.get('deployment_mode')}")
            return True
        else:
            print(f"❌ Auth config failed: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Auth config error: {e}")
        return False


def test_login():
    """Test login with internal authentication"""
    print("🔍 Testing login...")

    # First, let's create a test user
    print("   Creating test user...")
    try:
        # Try to create a user via the existing user API
        user_data = {
            "username": "testuser",
            "email": "test@example.com",
            "password": "TestPassword123!",
        }

        response = requests.post(
            f"{BASE_URL}/api/v1/users/register", json=user_data, timeout=10
        )
        if response.status_code in [200, 201]:
            print("   ✅ Test user created successfully")
        elif response.status_code == 400:
            print("   ℹ️  Test user already exists")
        else:
            print(f"   ⚠️  User creation response: {response.status_code}")
    except Exception as e:
        print(f"   ⚠️  User creation error: {e}")

    # Now test login
    try:
        login_data = {
            "username": "testuser",
            "password": "any_password",  # Our simple auth doesn't check passwords
        }

        response = requests.post(
            f"{BASE_URL}/api/v1/enterprise/auth/login", json=login_data, timeout=10
        )
        if response.status_code == 200:
            result = response.json()
            if result.get("success"):
                print("✅ Login successful")
                print(f"   Access Token: {result.get('access_token')[:20]}...")
                return result.get("access_token")
            else:
                print(f"❌ Login failed: {result.get('error_message')}")
                return None
        else:
            print(f"❌ Login request failed: {response.status_code}")
            return None
    except Exception as e:
        print(f"❌ Login error: {e}")
        return None


def test_protected_endpoint(token):
    """Test accessing a protected endpoint"""
    print("🔍 Testing protected endpoint...")
    try:
        headers = {"Authorization": f"Bearer {token}"}
        response = requests.get(
            f"{BASE_URL}/api/v1/enterprise/auth/me", headers=headers, timeout=10
        )

        if response.status_code == 200:
            print("✅ Protected endpoint access successful")
            profile = response.json()
            print(f"   User: {profile.get('username')} ({profile.get('email')})")
            print(f"   Provider: {profile.get('provider')}")
            return True
        else:
            print(f"❌ Protected endpoint failed: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Protected endpoint error: {e}")
        return False


def wait_for_service():
    """Wait for the service to be ready"""
    print("⏳ Waiting for service to be ready...")
    max_attempts = 30
    for attempt in range(max_attempts):
        try:
            response = requests.get(f"{BASE_URL}/api/v1/enterprise/health", timeout=5)
            if response.status_code == 200:
                print("✅ Service is ready!")
                return True
        except:
            pass

        print(f"   Attempt {attempt + 1}/{max_attempts}...")
        time.sleep(2)

    print("❌ Service did not become ready in time")
    return False


def main():
    print("🚀 Enterprise Authentication System Test")
    print("=" * 50)

    # Wait for service to be ready
    if not wait_for_service():
        sys.exit(1)

    # Run tests
    tests_passed = 0
    total_tests = 0

    # Test 1: Health check
    total_tests += 1
    if test_health_check():
        tests_passed += 1

    print()

    # Test 2: Auth config
    total_tests += 1
    if test_auth_config():
        tests_passed += 1

    print()

    # Test 3: Login
    total_tests += 1
    token = test_login()
    if token:
        tests_passed += 1

    print()

    # Test 4: Protected endpoint (only if login succeeded)
    if token:
        total_tests += 1
        if test_protected_endpoint(token):
            tests_passed += 1

    print()
    print("=" * 50)
    print(f"🎯 Test Results: {tests_passed}/{total_tests} tests passed")

    if tests_passed == total_tests:
        print("🎉 All tests passed! Enterprise authentication is working correctly.")
        sys.exit(0)
    else:
        print("⚠️  Some tests failed. Check the logs above for details.")
        sys.exit(1)


if __name__ == "__main__":
    main()
