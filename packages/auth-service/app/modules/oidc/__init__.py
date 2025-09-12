"""OIDC integration scaffolding.

This module provides a small hook to load OIDC configuration and a helper
to exchange tokens. Fill provider-specific logic when integrating with a
real IDP.
"""
from .oidc import OIDCClient


