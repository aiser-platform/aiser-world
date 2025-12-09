#!/usr/bin/env python3
"""
Generate seed data SQL with hashed passwords and organizations
Run this script to generate the SQL for seeding users with passwords
"""

import sys
import os

# Add the auth package to path to use the Auth class
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'packages', 'auth', 'src'))

try:
    from app.modules.authentication.auth import Auth
    auth = Auth()
    DEFAULT_PASSWORD = "FirstUsers@123"
    password_hash = auth.hash_password(DEFAULT_PASSWORD)
    
    print("-- Generated password hash for: FirstUsers@123")
    print(f"-- Hash: {password_hash}")
    print()
    print("-- Use this hash in the SQL seed script below:")
    print(f"'{password_hash}'")
    
except Exception as e:
    print(f"Error generating hash: {e}")
    print("Using fallback hash (you may need to update this manually)")
    # Fallback - this is a sample hash format, replace with actual
    password_hash = "$pbkdf2-sha256$29000$...$..."  # Placeholder





