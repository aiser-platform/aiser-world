import os
from typing import Dict, Any

class FeatureFlagService:
    """Minimal feature flag service backed by environment overrides.

    For enterprise, this will be backed by a remote feature flag service and local cache.
    """

    def __init__(self):
        # flags can be provided via env as JSON-like mapping in prod, for dev use simple mapping
        self.flags: Dict[str, Dict[str, Any]] = {}

    def is_enabled(self, feature_name: str, context: Dict[str, Any] = None) -> bool:
        entry = self.flags.get(feature_name)
        if entry is None:
            # default allow for core features, block for enterprise features
            return not feature_name.startswith('enterprise:')
        return bool(entry.get('enabled', False))

    def set_flag(self, feature_name: str, enabled: bool):
        self.flags[feature_name] = {'enabled': enabled}


