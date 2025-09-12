from fastapi import Request
from typing import List

# Dev-friendly user role helper. Reads in-memory token map from main.py
try:
    # token_to_user is populated by signin endpoint in app.main
    from app.main import token_to_user
except Exception:
    token_to_user = {}


def get_user_roles_from_request(request: Request) -> List[str]:
    """Return a list of roles for the currently authenticated user.

    Development behavior: consults the in-memory `token_to_user` map created
    by the signin endpoint. For production, replace this with a DB lookup.
    """
    auth = request.headers.get('authorization') or request.headers.get('Authorization')
    if not auth or not auth.lower().startswith('bearer '):
        return []
    token = auth.split(' ', 1)[1]
    user = token_to_user.get(token)
    if not user:
        return []
    # simple heuristic: treat username 'admin' or role=='admin' as admin
    if isinstance(user, dict) and (user.get('username') == 'admin' or user.get('role') == 'admin'):
        return ['admin', 'user']
    return ['user']


