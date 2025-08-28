#!/usr/bin/env python3
"""
Generate bcrypt password hashes for default users in init-db.sql
"""

from passlib.context import CryptContext

def generate_password_hashes():
    """Generate bcrypt password hashes for default users"""
    
    # Initialize password context with bcrypt
    pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
    
    # Default passwords for development
    default_passwords = {
        'admin@aiser.app': 'admin123',
        'user@aiser.app': 'user123', 
        'analyst@aiser.app': 'analyst123'
    }
    
    print("🔐 Generating bcrypt password hashes for default users...")
    print("=" * 60)
    
    for email, password in default_passwords.items():
        hashed_password = pwd_context.hash(password)
        print(f"Email: {email}")
        print(f"Password: {password}")
        print(f"Hash: {hashed_password}")
        print("-" * 60)
    
    print("\n📝 Copy these hashes to update init-db.sql")
    print("⚠️  Remember to change these passwords in production!")
    
    return default_passwords

if __name__ == "__main__":
    generate_password_hashes()
