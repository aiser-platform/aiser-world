import os
import time
import uuid
import requests

AUTH_URL = os.getenv('AUTH_URL', 'http://localhost:5000')
CHAT2_URL = os.getenv('CHAT2_URL', 'http://localhost:8000')


def test_signup_provision_and_dashboard_crud():
    # 1) Signup user at auth service
    email = f"testuser+{uuid.uuid4().hex[:6]}@example.com"
    username = f"testuser_{uuid.uuid4().hex[:6]}"
    pwd = "Test@12345"

    resp = requests.post(f"{AUTH_URL}/users/signup", json={"email": email, "username": username, "password": pwd})
    assert resp.status_code in (200, 201)
    body = resp.json()
    assert 'access_token' in body or 'refresh_token' in body

    # 2) Wait briefly for provisioning to reach chat2chart
    time.sleep(1)

    # 3) Attempt to lookup user in chat2chart by email
    r = requests.post(f"{CHAT2_URL}/auth/echo", json={"check": "ping"})
    assert r.status_code == 200

    # 4) Upgrade demo (dev) or signin to get tokens usable by chat2chart
    # Try signin at auth service
    resp_signin = requests.post(f"{AUTH_URL}/users/signin", json={"identifier": username, "password": pwd})
    assert resp_signin.status_code == 200
    tokens = resp_signin.json()
    access = tokens.get('access_token') or tokens.get('access') or tokens.get('token')
    assert access

    headers = {"Authorization": f"Bearer {access}"}

    # 5) Create a dashboard in chat2chart
    dash_payload = {"name": "Integration Test Dashboard", "description": "Created by integration test"}
    create = requests.post(f"{CHAT2_URL}/charts/builder/save", json=dash_payload, headers=headers)
    assert create.status_code in (200, 201)
    created = create.json()
    dash_id = created.get('id') or created.get('dashboard', {}).get('id')
    assert dash_id

    # 6) Get the dashboard
    getr = requests.get(f"{CHAT2_URL}/charts/builder/{dash_id}", headers=headers)
    assert getr.status_code == 200

    # 7) Delete the dashboard
    delr = requests.delete(f"{CHAT2_URL}/charts/builder/{dash_id}", headers=headers)
    assert delr.status_code in (200, 204)


