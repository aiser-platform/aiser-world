#!/usr/bin/env python3
"""
Generate pbkdf2_sha256 password hashes for seed users
Default password: FirstUsers@123
"""

from passlib.hash import pbkdf2_sha256

DEFAULT_PASSWORD = "FirstUsers@123"

def generate_hash(password: str) -> str:
    """Generate pbkdf2_sha256 hash for password"""
    return pbkdf2_sha256.hash(password)

if __name__ == "__main__":
    hashed = generate_hash(DEFAULT_PASSWORD)
    print(f"Password: {DEFAULT_PASSWORD}")
    print(f"Hash: {hashed}")
    print("\nUse this hash in the SQL seed script.")





