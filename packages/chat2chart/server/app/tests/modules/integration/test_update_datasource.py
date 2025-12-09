from fastapi.testclient import TestClient
from app.main import app


def test_update_data_source_name(monkeypatch):
    client = TestClient(app)

    async def fake_verify(request, organization_id, project_id):
        return True

    monkeypatch.setattr('app.modules.data.api.verify_project_access', fake_verify)

    # Create a data source
    payload = {
        'name': 'update-test',
        'type': 'file',
        'description': 'created for update test',
        'config': {},
        'metadata': {}
    }
    r = client.post('/data/api/organizations/1/projects/1/data-sources', json=payload)
    assert r.status_code == 200
    ds = r.json().get('data_source')
    ds_id = ds['id']

    # Update name
    update_payload = {'name': 'updated-name'}
    ur = client.put(f'/data/api/organizations/1/projects/1/data-sources/{ds_id}', json=update_payload)
    assert ur.status_code == 200
    body = ur.json()
    assert body.get('success') is True
    assert body.get('data_source') and body['data_source']['name'] == 'updated-name'


