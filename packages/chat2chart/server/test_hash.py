#!/usr/bin/env python3
"""
Test script to generate password hash using the same method as the auth service
"""

try:
    from passlib.hash import pbkdf2_sha256
    print("✅ passlib imported successfully")
    
    # Use the same salt as the auth service
    SECRET = "9e25a2588fcee7d21ea15fb1a63d5135"
    password = "admin123"
    
    # Generate hash using the same method as auth service
    hashed = pbkdf2_sha256.hash(password, salt=SECRET.encode("utf-8"))
    print(f"✅ Hash generated successfully")
    print(f"Password: {password}")
    print(f"Salt: {SECRET}")
    print(f"Hash: {hashed}")
    
    # Test verification
    is_valid = pbkdf2_sha256.verify(password, hashed)
    print(f"✅ Verification test: {is_valid}")
    
except ImportError as e:
    print(f"❌ Import error: {e}")
except Exception as e:
    print(f"❌ Error: {e}")
