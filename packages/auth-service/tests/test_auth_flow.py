import requests
import os
import uuid

AUTH_URL = os.environ.get('AUTH_URL', 'http://127.0.0.1:5000')


def test_signin_refresh_logout_flow():
    # Signup with unique user to avoid collisions from prior runs
    suffix = uuid.uuid4().hex[:8]
    email = f'testflow+{suffix}@example.com'
    username = f'testflow_{suffix}'
    pw = 'password123'
    r = requests.post(f'{AUTH_URL}/users/signup', json={'email': email, 'username': username, 'password': pw})
    assert r.status_code == 200

    # Signin
    r = requests.post(f'{AUTH_URL}/users/signin', json={'identifier': username, 'password': pw})
    assert r.status_code == 200
    data = r.json()
    access = data.get('access_token')
    assert access

    # Refresh using refresh endpoint -- cookie not set in this test harness
    refresh = data.get('refresh_token')
    if refresh:
        r2 = requests.post(f'{AUTH_URL}/api/v1/auth/refresh', json={'refresh_token': refresh})
        assert r2.status_code == 200

    # Logout
    # Send refresh to logout endpoint
    r3 = requests.post(f'{AUTH_URL}/api/v1/auth/logout', json={'refresh_token': refresh})
    assert r3.status_code == 200


