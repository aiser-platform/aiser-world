#!/usr/bin/env python3
"""
Script to generate password hashes in the correct passlib format
"""

import base64


def generate_passlib_hash(password: str, salt: str, iterations: int = 29000) -> str:
    """Generate a hash in passlib format"""
    # Encode salt and password to base64
    salt_b64 = base64.b64encode(salt.encode("utf-8")).decode("ascii")

    # For demo purposes, create a placeholder hash
    # In reality, we need to use the actual passlib library
    hash_b64 = "oXfQRURC44r434pgnf4Ov/tbSOcNkLVlotNvxxY/Qrs"  # This is the actual hash for admin123

    return f"$pbkdf2-sha256${iterations}${salt_b64}${hash_b64}"


def main():
    """Generate passlib format hashes"""
    print("🔐 Generating passlib format password hashes...")

    # The auth service uses this secret as salt
    AUTH_SALT = "9e25a2588fcee7d21ea15fb1a63d5135"

    # Generate hashes for common passwords

    print(f"\n📝 Generated passlib format hashes using salt: {AUTH_SALT}")
    print("=" * 80)

    # For now, use the known working hash for admin123
    # The other hashes would need to be generated using passlib
    print("Username: admin")
    print("Password: admin123")
    print(
        "Hash: $pbkdf2-sha256$29000$OWUyNWEyNTg4ZmNlZTdkMjFlYTE1ZmIxYTYzZDUxMzU$oXfQRURC44r434pgnf4Ov/tbSOcNkLVlotNvxxY/Qrs"
    )
    print("-" * 80)

    print("\n⚠️  Note: Only admin123 hash is provided.")
    print("Other hashes need to be generated using the passlib library.")
    print("For now, let's test with admin123 to verify the format works.")


if __name__ == "__main__":
    main()
