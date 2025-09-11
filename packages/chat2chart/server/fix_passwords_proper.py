#!/usr/bin/env python3
"""
Script to fix user passwords by generating proper pbkdf2_sha256 hashes
"""

import hashlib
import os
import binascii


def generate_pbkdf2_hash(
    password: str, salt: str = None, iterations: int = 600000
) -> str:
    """Generate a proper pbkdf2_sha256 hash"""
    if salt is None:
        salt = binascii.hexlify(os.urandom(16)).decode("ascii")

    # Generate the hash
    hash_obj = hashlib.pbkdf2_hmac(
        "sha256", password.encode("utf-8"), salt.encode("ascii"), iterations
    )
    hash_hex = binascii.hexlify(hash_obj).decode("ascii")

    # Format: pbkdf2:sha256:iterations$salt$hash
    return f"pbkdf2:sha256:{iterations}${salt}${hash_hex}"


def main():
    """Generate proper password hashes"""
    print("🔐 Generating proper password hashes...")

    # Generate hashes for common passwords
    passwords = {
        "admin123": "admin123",
        "user123": "user123",
        "analyst123": "analyst123",
        "test123456": "test123456",
    }

    print("\n📝 Generated password hashes:")
    print("=" * 80)

    for username, password in passwords.items():
        hash_value = generate_pbkdf2_hash(password)
        print(f"Username: {username}")
        print(f"Password: {password}")
        print(f"Hash: {hash_value}")
        print("-" * 80)

    print("\n💡 Use these hashes to update the database:")
    print("UPDATE users SET password = 'HASH_VALUE' WHERE username = 'USERNAME';")


if __name__ == "__main__":
    main()
