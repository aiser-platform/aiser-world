import os
from typing import Dict, Any


class OIDCClient:
    """Minimal OIDC client scaffold. Fill with provider-specific endpoints.

    Usage:
      client = OIDCClient()
      tokens = client.exchange_code(code)
    """

    def __init__(self):
        self.issuer = os.environ.get('OIDC_ISSUER')
        self.client_id = os.environ.get('OIDC_CLIENT_ID')
        self.client_secret = os.environ.get('OIDC_CLIENT_SECRET')

    def exchange_code(self, code: str) -> Dict[str, Any]:
        # TODO: implement token exchange using provider-specific endpoints
        return {'access_token': None, 'id_token': None}


