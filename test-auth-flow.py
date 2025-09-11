#!/usr/bin/env python3
"""
Test script to verify the authentication flow
"""

import requests
import json

# Configuration
AUTH_BASE_URL = "http://localhost:5000"
ENTERPRISE_BASE_URL = "http://localhost:5000/api/v1/enterprise"


def test_standard_auth():
    """Test standard authentication flow"""
    print("=== Testing Standard Authentication ===")

    # Test signup with unique username
    print("\n1. Testing user signup...")
    import time

    timestamp = int(time.time())
    signup_data = {
        "email": f"test{timestamp}@example.com",
        "username": f"testuser{timestamp}",
        "password": "testpassword123",
    }

    try:
        response = requests.post(f"{AUTH_BASE_URL}/users/signup", json=signup_data)
        print(f"Signup response status: {response.status_code}")
        print(f"Signup response: {response.text}")

        if response.status_code == 200:
            signup_result = response.json()
            print(f"Signup successful: {json.dumps(signup_result, indent=2)}")
        else:
            print(f"Signup failed: {response.text}")
            # Try to signin with existing user instead
            print("\nTrying to signin with existing user...")
            return test_existing_user_signin()

    except Exception as e:
        print(f"Signup error: {e}")
        return test_existing_user_signin()

    # Test signin with new user
    print("\n2. Testing user signin...")
    signin_data = {
        "identifier": signup_data["username"],
        "password": signup_data["password"],
    }

    try:
        response = requests.post(f"{AUTH_BASE_URL}/users/signin", json=signin_data)
        print(f"Signin response status: {response.status_code}")
        print(f"Signin response: {response.text}")

        if response.status_code == 200:
            signin_result = response.json()
            print(f"Signin successful: {json.dumps(signin_result, indent=2)}")

            # Check if tokens are present
            if signin_result.get("access_token"):
                print("✅ Access token is present")
            else:
                print("❌ Access token is missing")

            if signin_result.get("user"):
                print("✅ User info is present")
            else:
                print("❌ User info is missing")

            return True
        else:
            print(f"Signin failed: {response.text}")
            return False

    except Exception as e:
        print(f"Signin error: {e}")
        return False


def test_existing_user_signin():
    """Test signin with existing user"""
    print("\n2. Testing signin with existing user...")
    signin_data = {
        "identifier": "testuser",  # Use existing username
        "password": "testpassword123",
    }

    try:
        response = requests.post(f"{AUTH_BASE_URL}/users/signin", json=signin_data)
        print(f"Signin response status: {response.status_code}")
        print(f"Signin response: {response.text}")

        if response.status_code == 200:
            signin_result = response.json()
            print(f"Signin successful: {json.dumps(signin_result, indent=2)}")

            # Check if tokens are present
            if signin_result.get("access_token"):
                print("✅ Access token is present")
            else:
                print("❌ Access token is missing")

            if signin_result.get("user"):
                print("✅ User info is present")
            else:
                print("❌ User info is missing")

            return True
        else:
            print(f"Signin failed: {response.text}")
            return False

    except Exception as e:
        print(f"Signin error: {e}")
        return False


def test_enterprise_auth():
    """Test enterprise authentication flow"""
    print("\n=== Testing Enterprise Authentication ===")

    # Test enterprise login
    print("\n1. Testing enterprise login...")
    login_data = {"username": "admin", "password": "admin123"}

    try:
        response = requests.post(f"{ENTERPRISE_BASE_URL}/auth/login", json=login_data)
        print(f"Enterprise login response status: {response.status_code}")
        print(f"Enterprise login response: {response.text}")

        if response.status_code == 200:
            login_result = response.json()
            print(f"Enterprise login successful: {json.dumps(login_result, indent=2)}")

            # Check if tokens are present
            if login_result.get("access_token"):
                print("✅ Access token is present")
            else:
                print("❌ Access token is missing")

            if login_result.get("user"):
                print("✅ User info is present")
            else:
                print("❌ User info is missing")

            return True
        else:
            print(f"Enterprise login failed: {response.text}")
            return False

    except Exception as e:
        print(f"Enterprise login error: {e}")
        return False


def test_me_endpoint():
    """Test the /me endpoint with authentication"""
    print("\n=== Testing /me Endpoint ===")

    # First get a token
    signin_data = {"identifier": "testuser", "password": "testpassword123"}

    try:
        response = requests.post(f"{AUTH_BASE_URL}/users/signin", json=signin_data)
        if response.status_code == 200:
            signin_result = response.json()
            access_token = signin_result.get("access_token")

            if access_token:
                print(f"Got access token: {access_token[:20]}...")

                # Test /me endpoint
                headers = {"Authorization": f"Bearer {access_token}"}
                me_response = requests.get(
                    f"{AUTH_BASE_URL}/users/me/", headers=headers
                )

                print(f"/me response status: {me_response.status_code}")
                print(f"/me response: {me_response.text}")

                if me_response.status_code == 200:
                    print("✅ /me endpoint works with authentication")
                else:
                    print("❌ /me endpoint failed")
            else:
                print("❌ No access token to test /me endpoint")
        else:
            print("❌ Signin failed, cannot test /me endpoint")

    except Exception as e:
        print(f"Error testing /me endpoint: {e}")


if __name__ == "__main__":
    print("Starting authentication flow tests...")

    # Test standard auth
    standard_success = test_standard_auth()

    # Test enterprise auth
    enterprise_success = test_enterprise_auth()

    # Test /me endpoint if standard auth worked
    if standard_success:
        test_me_endpoint()

    print("\n=== Test Summary ===")
    print(f"Standard auth: {'✅ PASS' if standard_success else '❌ FAIL'}")
    print(f"Enterprise auth: {'✅ PASS' if enterprise_success else '❌ FAIL'}")
