import requests
import json
import urllib.parse


def test_upgrade_and_dashboard_crud():
    base = 'http://localhost:8000'
    s = requests.Session()
    # Fail fast for network hangs during integration tests
    TIMEOUT = 15

    # Simulate demo cookie on frontend origin
    user = {"user_id": "6", "username": "admin1", "email": "admin1@aiser.world", "is_verified": False, "is_active": True, "roles": ["member"], "provider": "internal"}
    demo_token = 'demo_token_6_1758623524.282077'
    # Try server-side upgrade via body (handles frontend-scoped cookies)
    r = s.post(f'{base}/auth/upgrade-demo', json={'demo_token': demo_token, 'user': urllib.parse.quote(json.dumps(user))}, timeout=TIMEOUT)
    assert r.status_code == 200, f"upgrade-demo failed: {r.status_code} {r.text}"
    body = r.json()
    assert body.get('upgraded') is True
    access = body.get('access_token')
    assert access, 'no access token returned by upgrade-demo'

    # Set cookie on session to simulate browser
    s.cookies.set('c2c_access_token', access, domain='localhost', path='/')

    # Verify whoami
    who = s.get(f'{base}/auth/whoami', timeout=TIMEOUT)
    assert who.status_code == 200
    whoj = who.json()
    assert whoj.get('authenticated') is True

    # Create dashboard
    dash_payload = {
        "name": "Integration Test Dashboard",
        "description": "Created by automated test",
        "project_id": 1,
        "layout_config": {},
        "theme_config": {"theme": "light"},
        "global_filters": {},
        "refresh_interval": 300,
        "is_public": False,
        "is_template": False,
    }
    create = s.post(f'{base}/charts/dashboards/', json=dash_payload, timeout=TIMEOUT)
    assert create.status_code == 200, f"create failed: {create.status_code} {create.text}"
    created = create.json()
    dashboard_id = created.get('id')
    assert dashboard_id

    # Get dashboard
    getd = s.get(f'{base}/charts/dashboards/{dashboard_id}', timeout=TIMEOUT)
    assert getd.status_code == 200
    gd = getd.json()
    assert gd.get('id') == dashboard_id

    # Update dashboard
    update_payload = {"name": "Integration Test Dashboard - Updated"}
    upd = s.put(f'{base}/charts/dashboards/{dashboard_id}', json=update_payload, timeout=TIMEOUT)
    assert upd.status_code == 200
    upj = upd.json()
    assert upj.get('name') == update_payload['name']

    # Delete dashboard
    delt = s.delete(f'{base}/charts/dashboards/{dashboard_id}', timeout=TIMEOUT)
    assert delt.status_code == 200
    assert delt.json().get('success') is True

    # Confirm deletion
    confirm = s.get(f'{base}/charts/dashboards/{dashboard_id}', timeout=TIMEOUT)
    assert confirm.status_code == 404


