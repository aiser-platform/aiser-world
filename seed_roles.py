#!/usr/bin/env python3
"""
Seed default roles for Aiser Platform
"""

import requests
import json

# Configuration
AUTH_BASE_URL = "http://localhost:5000"

def seed_default_roles():
    """Seed the default roles needed for the system to work"""
    print("=== Seeding Default Roles ===")
    
    # First, let's try to create an organization to see what error we get
    print("\n1. Testing organization creation to see the exact error...")
    
    # Get a valid token first
    signin_data = {
        "identifier": "testuser",
        "password": "testpassword123"
    }
    
    try:
        response = requests.post(f"{AUTH_BASE_URL}/users/signin", json=signin_data)
        if response.status_code == 200:
            signin_result = response.json()
            access_token = signin_result.get("access_token")
            
            if access_token:
                print(f"✅ Got access token: {access_token[:20]}...")
                
                # Try to create an organization
                headers = {"Authorization": f"Bearer {access_token}"}
                org_data = {
                    "name": "Test Organization",
                    "description": "Test organization for debugging",
                    "website": "https://test.com"
                }
                
                org_response = requests.post(
                    f"{AUTH_BASE_URL}/api/v1/organizations/", 
                    json=org_data,
                    headers=headers
                )
                
                print(f"Organization creation response status: {org_response.status_code}")
                print(f"Organization creation response: {org_response.text}")
                
                if org_response.status_code == 200:
                    print("✅ Organization created successfully!")
                    return True
                else:
                    print(f"❌ Organization creation failed: {org_response.text}")
                    
                    # If it's a 500 error, it's likely the role issue
                    if org_response.status_code == 500:
                        print("\n🔍 This looks like a server-side error. Let's check the database...")
                        print("The issue is likely that the default roles (owner, admin, member) don't exist.")
                        print("\nTo fix this, you need to:")
                        print("1. Connect to the database")
                        print("2. Insert the default roles")
                        print("3. Or run the create_admin_user.py script")
                        
                        return False
            else:
                print("❌ No access token received")
                return False
        else:
            print(f"❌ Signin failed: {response.text}")
            return False
            
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

def check_database_roles():
    """Check what roles exist in the database"""
    print("\n=== Database Role Check ===")
    print("To check what roles exist in the database, run:")
    print("\n1. Connect to the database:")
    print("   docker-compose exec postgres psql -U aiser -d aiser_world")
    print("\n2. Check existing roles:")
    print("   SELECT * FROM roles;")
    print("\n3. If no roles exist, insert the default ones:")
    print("   INSERT INTO roles (name, description, permissions, is_system_role, created_at, updated_at) VALUES")
    print("   ('owner', 'Organization owner with full access', '{\"all\": true}', true, NOW(), NOW()),")
    print("   ('admin', 'Organization administrator', '{\"organization\": [\"read\", \"write\"], \"projects\": [\"read\", \"write\"], \"users\": [\"read\", \"write\"]}', true, NOW(), NOW()),")
    print("   ('member', 'Organization member', '{\"organization\": [\"read\"], \"projects\": [\"read\", \"write\"]}', true, NOW(), NOW()),")
    print("   ('viewer', 'Organization viewer', '{\"organization\": [\"read\"], \"projects\": [\"read\"]}', true, NOW(), NOW());")

if __name__ == "__main__":
    print("Starting role seeding and debugging...")
    
    # Try to create an organization to see the error
    success = seed_default_roles()
    
    if not success:
        check_database_roles()
    
    print("\n=== Summary ===")
    if success:
        print("✅ Roles are working correctly!")
    else:
        print("❌ Roles need to be seeded. Check the database and insert default roles.")
