#!/usr/bin/env python3
import os
import time
import json
import hmac
import hashlib
import base64

try:
    import psycopg2
    from psycopg2.extras import RealDictCursor
except Exception as e:
    raise SystemExit(f"psycopg2 is required: {e}")

try:
    from jose import jwt as jose_jwt  # optional
    _HAS_JOSE = True
except Exception:
    _HAS_JOSE = False


def _b64url(b: bytes) -> str:
    return base64.urlsafe_b64encode(b).rstrip(b"=").decode("utf-8")


def _encode_jwt_hs256(header: dict, payload: dict, secret: str) -> str:
    h_b = json.dumps(header, separators=(",",":"), sort_keys=True).encode("utf-8")
    p_b = json.dumps(payload, separators=(",",":"), sort_keys=True).encode("utf-8")
    signing_input = (_b64url(h_b) + "." + _b64url(p_b)).encode("utf-8")
    sig = hmac.new(secret.encode("utf-8"), signing_input, hashlib.sha256).digest()
    return signing_input.decode("utf-8") + "." + base64.urlsafe_b64encode(sig).rstrip(b"=").decode("utf-8")


def main():
    secret = os.environ.get("SECRET_KEY") or os.environ.get("JWT_SECRET") or "dev-secret"

    dsn = os.environ.get("SYNC_DATABASE_URI") or os.environ.get("DATABASE_URL")
    if not dsn:
        user = os.environ.get("POSTGRES_USER", "aiser")
        pw = os.environ.get("POSTGRES_PASSWORD", "aiser")
        host = os.environ.get("POSTGRES_SERVER", os.environ.get("POSTGRES_HOST", "postgres"))
        port = os.environ.get("POSTGRES_PORT", "5432")
        db = os.environ.get("POSTGRES_DB", "aiser_world")
        dsn = f"postgresql://{user}:{pw}@{host}:{port}/{db}"

    print("Using DSN:", dsn)

    try:
        conn = psycopg2.connect(dsn)
        cur = conn.cursor(cursor_factory=RealDictCursor)
        cur.execute("SELECT id, email, username FROM users WHERE email = %s LIMIT 1", ("admin1@aiser.world",))
        row = cur.fetchone()
        if not row:
            cur.execute("SELECT id, email, username FROM users LIMIT 1")
            row = cur.fetchone()
        if not row:
            raise SystemExit("No users found to generate token for")

        uid = str(row["id"]) if isinstance(row["id"], str) else str(row[0])
        email = row.get("email") or row[1]
        username = row.get("username") or row[2]

        now = int(time.time())
        access_exp = now + 60 * 60
        refresh_exp = now + 7 * 24 * 60 * 60

        header = {"alg": "HS256", "typ": "JWT"}
        access_payload = {"sub": uid, "iat": now, "exp": access_exp, "scope": "access_token", "username": username, "email": email}
        refresh_payload = {"sub": uid, "iat": now, "exp": refresh_exp, "scope": "refresh_token"}

        if _HAS_JOSE:
            access = jose_jwt.encode(access_payload, secret, algorithm="HS256")
            refresh = jose_jwt.encode(refresh_payload, secret, algorithm="HS256")
        else:
            access = _encode_jwt_hs256(header, access_payload, secret)
            refresh = _encode_jwt_hs256(header, refresh_payload, secret)

        lines = [f"ACCESS_TOKEN={access}", f"REFRESH_TOKEN={refresh}", f"USER_ID={uid}"]
        target = os.path.join(os.getcwd(), "scripts", "dev_tokens.env")
        try:
            os.makedirs(os.path.dirname(target), exist_ok=True)
            with open(target, "w") as f:
                f.write("\n".join(lines) + "\n")
            print("WROTE TOKENS to", target)
        except Exception as e:
            print("FAILED TO WRITE:", e)

        print("\n".join(lines))

    except Exception as e:
        print("ERROR:", e)


if __name__ == "__main__":
    main()
