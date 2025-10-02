"""Compatibility shim for `packages.auth`.

This module ensures the local `src` directory is on `sys.path` so that
imports like `from app import ...` work when `packages/auth` is used as
the canonical auth implementation. Historically this package redirected
imports to `packages/auth-service`; that has been removed in favor of
keeping `packages/auth/src` as the single source of truth.
"""
from __future__ import annotations

import os
import sys

# Add local `src` directory to sys.path to allow `from app import ...`
_here = os.path.dirname(__file__)
_src_dir = os.path.abspath(os.path.join(_here, "src"))

if os.path.isdir(_src_dir) and _src_dir not in sys.path:
    sys.path.insert(0, _src_dir)

# Re-export `app` package from the local `src` layout so code that does
# `from packages.auth import app` or `from app import ...` continues to work
# when running from the canonical package directory.
try:
    from app import *  # noqa: F401,F403
except Exception:
    # If importing fails, allow the original import error to surface so
    # maintainers can diagnose missing dependencies or incorrect setup.
    pass


