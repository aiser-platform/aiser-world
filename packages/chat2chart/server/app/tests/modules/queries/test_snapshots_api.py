from fastapi import FastAPI
from fastapi.testclient import TestClient
import pytest
from unittest.mock import patch

from app.modules.queries import api as queries_api


@pytest.fixture(scope="session")
def app(mock_auth):
    # Ensure mock_auth is applied before routes are registered so the
    # JWTCookieBearer dependency is replaced for the test app.
    app = FastAPI()
    app.include_router(queries_api.router, prefix="/api/queries")
    # Use FastAPI dependency_overrides to ensure the dependency returns a dict
    # for all routes consistently during tests.
    app.dependency_overrides[queries_api.JWTCookieBearer] = lambda: {"id": 1}
    return app


@pytest.fixture(scope="session")
def client(app):
    with TestClient(app) as c:
        yield c


@pytest.fixture(scope="session", autouse=True)
def mock_auth():
    with patch("app.modules.queries.api.JWTCookieBearer") as m:
        m.return_value = lambda: {"id": 1}
        yield m


@pytest.fixture(scope="session", autouse=True)
def ensure_test_user():
    # Ensure a test integer user exists in the DB for endpoints expecting integer user_id
    import os
    import psycopg2
    # Use the same DB settings as the backend to ensure tests run against the
    # dev DB used by the application container.
    db_url = os.environ.get('DATABASE_URL') or os.environ.get('DATABASE_URI') or 'postgresql://aiser:aiser_password@aiser-postgres-dev:5432/aiser_world'
    conn = None
    try:
        conn = psycopg2.connect(db_url)
        cur = conn.cursor()
        cur.execute("INSERT INTO users (id, email, username, password, created_at, updated_at) VALUES (1, 'test-user@example.com', 'testuser', 'temp', NOW(), NOW()) ON CONFLICT (id) DO NOTHING;")
        # Also ensure organization/project default rows used by other code paths
        cur.execute("INSERT INTO organizations (id, name, slug, is_active, created_at, updated_at) VALUES (1, 'Aiser', 'aiser', true, NOW(), NOW()) ON CONFLICT (id) DO NOTHING;")
        cur.execute("INSERT INTO projects (id, name, description, organization_id, created_by, is_active, created_at, updated_at) VALUES (1, 'Default', 'Default project', 1, 1, true, NOW(), NOW()) ON CONFLICT (id) DO NOTHING;")
        conn.commit()
    finally:
        if conn:
            conn.close()


def test_create_and_list_snapshots(client, monkeypatch):
    # Mock data service and multi_engine
    async def fake_get_data_source_by_id(self, ds_id):
        return {"id": ds_id, "type": "file", "file_path": "/tmp/test.csv", "format": "csv", "sample_data": [{"a":1}], "row_count":1}

    async def fake_execute_query(self, query, ds, engine=None, optimization=True):
        return {"success": True, "data": [{"a":1}], "columns": ["a"], "row_count": 1, "engine": "demo", "execution_time": 0.01}

    monkeypatch.setattr("app.modules.data.services.data_connectivity_service.DataConnectivityService.get_data_source_by_id", fake_get_data_source_by_id, raising=False)
    monkeypatch.setattr("app.modules.data.services.multi_engine_query_service.MultiEngineQueryService.execute_query", fake_execute_query, raising=False)

    # Create snapshot
    res = client.post("/api/queries/snapshots", json={"data_source_id": "demo_ds", "sql": "SELECT 1", "name": "snap1", "preview_rows": 10})
    assert res.status_code == 200
    body = res.json()
    assert body["success"] is True
    assert "snapshot_id" in body

    # List snapshots
    res2 = client.get("/api/queries/snapshots")
    assert res2.status_code == 200
    j = res2.json()
    assert j["success"] is True
    assert isinstance(j["items"], list)


