#!/usr/bin/env python3
"""
Script to fix user passwords by generating proper pbkdf2_sha256 hashes
using the correct salt from the auth service
"""

import hashlib
import binascii


def generate_pbkdf2_hash_with_salt(
    password: str, salt: str, iterations: int = 600000
) -> str:
    """Generate a proper pbkdf2_sha256 hash using the specified salt"""
    # Generate the hash
    hash_obj = hashlib.pbkdf2_hmac(
        "sha256", password.encode("utf-8"), salt.encode("ascii"), iterations
    )
    hash_hex = binascii.hexlify(hash_obj).decode("ascii")

    # Format: pbkdf2:sha256:iterations$salt$hash
    return f"pbkdf2:sha256:{iterations}${salt}${hash_hex}"


def main():
    """Generate proper password hashes with correct salt"""
    print("🔐 Generating proper password hashes with correct salt...")

    # The auth service uses this secret as salt
    AUTH_SALT = "9e25a2588fcee7d21ea15fb1a63d5135"

    # Generate hashes for common passwords
    passwords = {
        "admin": "admin123",
        "user": "user123",
        "analyst": "analyst123",
        "testuser": "test123456",
    }

    print(f"\n📝 Generated password hashes using salt: {AUTH_SALT}")
    print("=" * 80)

    for username, password in passwords.items():
        hash_value = generate_pbkdf2_hash_with_salt(password, AUTH_SALT)
        print(f"Username: {username}")
        print(f"Password: {password}")
        print(f"Hash: {hash_value}")
        print("-" * 80)

    print("\n💡 Use these hashes to update the database:")
    print("UPDATE users SET password = 'HASH_VALUE' WHERE username = 'USERNAME';")


if __name__ == "__main__":
    main()
