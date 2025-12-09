import os
import time
from typing import Dict, Any, Optional

class LicenseValidator:
    """Minimal license validator skeleton.

    - Reads LICENSE_KEY from env
    - Supports local cache with TTL
    - Provides a `validate` method that checks cache first then (optionally)
      calls a remote license service endpoint.
    """

    def __init__(self, remote_url: Optional[str] = None, cache_ttl: int = 300):
        self.remote_url = remote_url or os.environ.get('LICENSE_SERVICE_URL')
        self.cache_ttl = cache_ttl
        self._cache: Dict[str, Any] = {}

    def _get_cached(self, key: str) -> Optional[Dict[str, Any]]:
        item = self._cache.get(key)
        if not item:
            return None
        if time.time() - item['ts'] > self.cache_ttl:
            del self._cache[key]
            return None
        return item['val']

    def _set_cache(self, key: str, val: Dict[str, Any]):
        self._cache[key] = {'ts': time.time(), 'val': val}

    def validate(self, license_key: Optional[str] = None) -> Dict[str, Any]:
        key = license_key or os.environ.get('LICENSE_KEY')
        if not key:
            return {'valid': False, 'reason': 'missing_key'}

        cached = self._get_cached(key)
        if cached:
            return cached

        # Local heuristic: simple key shape validation (placeholder)
        if len(key) < 16:
            result = {'valid': False, 'reason': 'invalid_format'}
            self._set_cache(key, result)
            return result

        # Optionally call remote service (not implemented) and default to valid in dev
        result = {'valid': True, 'tier': 'enterprise', 'features': []}
        self._set_cache(key, result)
        return result


