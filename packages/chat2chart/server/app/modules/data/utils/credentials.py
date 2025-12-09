from typing import Dict, Any
import os
import logging

logger = logging.getLogger(__name__)

try:
    from cryptography.fernet import Fernet, InvalidToken
except Exception:
    Fernet = None
    InvalidToken = Exception


def _get_fernet():
    key = os.getenv("ENCRYPTION_KEY")
    if not key or Fernet is None:
        logger.warning("⚠️ ENCRYPTION_KEY not set or Fernet not available - credentials will not be encrypted/decrypted")
        return None
    try:
        # ENCRYPTION_KEY should be urlsafe_base64
        return Fernet(key)
    except Exception as e:
        logger.exception("Invalid ENCRYPTION_KEY: %s", e)
        return None


def encrypt_credentials(config: Dict[str, Any]) -> Dict[str, Any]:
    """Encrypt sensitive fields in-place and return a copy.

    Only encrypts known sensitive keys when ENCRYPTION_KEY is available.
    """
    if not isinstance(config, dict):
        return config
    f = _get_fernet()
    if not f:
        return dict(config)

    sensitive = {"password", "api_key", "token", "secret_access_key", "access_key_id", "connection_string", "credentials"}
    out = dict(config)
    for k in list(out.keys()):
        if k in sensitive and out.get(k) not in (None, ""):
            try:
                val = str(out[k]).encode("utf-8")
                out[k] = f.encrypt(val).decode("utf-8")
                out[f"__enc_{k}"] = True
            except Exception:
                logger.exception("Failed to encrypt key %s", k)
    return out


def decrypt_credentials(config: Dict[str, Any]) -> Dict[str, Any]:
    """Decrypt any encrypted sensitive fields when possible and return a copy."""
    if not isinstance(config, dict):
        return config
    f = _get_fernet()
    if not f:
        return dict(config)

    out = dict(config)
    for k in list(out.keys()):
        if k.startswith("__enc_"):
            orig = k[len("__enc_"):]
            encval = out.get(orig)
            if encval:
                try:
                    dec = f.decrypt(encval.encode("utf-8")).decode("utf-8")
                    out[orig] = dec
                except InvalidToken:
                    logger.warning("Invalid token when decrypting %s", orig)
                except Exception:
                    logger.exception("Failed to decrypt key %s", orig)
            # remove marker
            out.pop(k, None)
    return out


