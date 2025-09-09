from fastapi import FastAPI
from fastapi.testclient import TestClient
import app.modules.data.services.data_connectivity_service as dcs_mod
import app.modules.data.services.multi_engine_query_service as me_mod
from app.modules.queries import api as queries_api

async def fake_get(self, ds_id):
    return {"id": ds_id, "type": "file", "file_path": "/tmp/test.csv", "format": "csv", "sample_data": [{"a":1}], "row_count":1}

async def fake_exec(self, query, ds, engine=None, optimization=True):
    return {"success": True, "data": [{"a":1}], "columns": ["a"], "row_count": 1, "engine": "demo", "execution_time": 0.01}

setattr(dcs_mod.DataConnectivityService, 'get_data_source_by_id', fake_get)
setattr(me_mod.MultiEngineQueryService, 'execute_query', fake_exec)

app = FastAPI(); app.include_router(queries_api.router, prefix='/api/queries')
client = TestClient(app)
resp = client.post('/api/queries/snapshots', json={'data_source_id':'demo_ds','sql':'SELECT 1','name':'snap1','preview_rows':10})
print('STATUS', resp.status_code)
print('TEXT', resp.text)
try:
    print('JSON', resp.json())
except Exception as e:
    print('JSON_ERROR', e)
