import pytest
from fastapi.testclient import TestClient
from app.main import app
import json


def test_create_project_connection_endpoint(monkeypatch):
    client = TestClient(app)

    # Mock RBAC to allow
    async def fake_verify(request, organization_id, project_id):
        return True

    monkeypatch.setattr('app.modules.data.api.verify_project_access', fake_verify)

    payload = {
        'type': 'postgresql',
        'host': 'localhost',
        'port': 5432,
        'database': 'testdb',
        'username': 'test',
        'password': 'secret',
        'name': 'pytest-conn'
    }

    # data router is mounted under /data, so the endpoint is /data/api/...
    r = client.post('/data/api/organizations/1/projects/1/connections', json=payload)
    assert r.status_code == 200
    body = r.json()
    assert body.get('success') is True
    conn = body.get('connection')
    assert conn.get('id')
    assert conn.get('connection_info') is not None
    # Ensure password is masked
    assert 'password' in conn['connection_info']
    assert '...' in conn['connection_info']['password'] or conn['connection_info']['password'] == '***'


