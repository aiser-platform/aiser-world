"""Compatibility shim for `packages/auth`.

This module inserts the sibling `packages/auth-service` directory onto
`sys.path` so existing imports (e.g. `from app import ...`) continue to
work during the consolidation. It also emits a DeprecationWarning so
callers can be migrated to `packages/auth-service`.
"""
from __future__ import annotations

import os
import sys
import warnings

_here = os.path.dirname(__file__)
_service_dir = os.path.abspath(os.path.join(_here, "..", "auth-service"))

if _service_dir not in sys.path:
    sys.path.insert(0, _service_dir)

warnings.warn(
    "packages.auth is deprecated: import from packages.auth-service instead",
    DeprecationWarning,
)

# Re-export the `app` package provided by the auth-service so existing
# code that does `from app import ...` continues to work.
try:
    from app import *  # noqa: F401,F403
except Exception:
    # If importing fails, keep shim in-place; callers will see the original
    # import error which is clearer than silently masking it.
    pass


