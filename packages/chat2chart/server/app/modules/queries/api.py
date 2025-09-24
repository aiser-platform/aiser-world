from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from typing import List, Optional, Any, Dict
import asyncio
from datetime import datetime, timedelta
import logging

from app.db.session import get_async_session
import json
from app.core.config import settings
from app.modules.authentication.deps.auth_bearer import JWTCookieBearer
from app.modules.authentication.auth import Auth
import inspect
import types

router = APIRouter(tags=["queries"])

# Guard to prevent concurrent DDL execution in development mode which can
# trigger asyncpg "another operation is in progress" errors when multiple
# requests race to create missing tables. Use an in-process lock — sufficient
# for local development/testing.
_ensure_tables_lock = asyncio.Lock()


def _resolve_user_payload(token_or_dict: Any) -> Dict[str, Any]:
    """Accept either a JWT token string or a dict returned by test overrides and
    return a user payload dict."""
    if isinstance(token_or_dict, dict):
        return token_or_dict
    try:
        return Auth().decodeJWT(token_or_dict) or {}
    except Exception:
        return {}


async def ensure_tables(db: AsyncSession):
    # In production, schema should be managed via Alembic migrations. Only run
    # ad-hoc table creations in development mode to aid local dev environments.
    if settings.ENVIRONMENT != "development":
        return

    # Quick short-circuit: if the main table already exists, skip DDL to avoid
    # repeated heavy operations during request handling (and avoid async loop
    # reattachment issues in some test environments).
    try:
        exists_res = await db.execute(text("SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='query_snapshots' LIMIT 1"))
        if exists_res.first():
            return
    except Exception:
        # If the/schema check fails for any reason, continue to attempt creation
        # below — safer than silently skipping in dev.
        pass

    # Split the DDL into individual statements and execute separately because
    # asyncpg (used by SQLAlchemy asyncpg dialect) does not allow preparing
    # multiple statements in a single prepared statement.
    ddl = """
    -- Development-only: create minimal persisted tables if missing
    CREATE TABLE IF NOT EXISTS query_tabs (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL,
        organization_id INTEGER,
        project_id INTEGER,
        tabs JSONB NOT NULL,
        active_key VARCHAR(255),
        updated_at TIMESTAMP DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_query_tabs_scope ON query_tabs (user_id, organization_id, project_id);

    CREATE TABLE IF NOT EXISTS saved_queries (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL,
        organization_id INTEGER,
        project_id INTEGER,
        name VARCHAR(255) NOT NULL,
        sql TEXT NOT NULL,
        metadata JSONB,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_saved_queries_SCOPE ON saved_queries (user_id, organization_id, project_id);

    CREATE TABLE IF NOT EXISTS query_schedules (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL,
        organization_id INTEGER,
        project_id INTEGER,
        name VARCHAR(255) NOT NULL,
        sql TEXT NOT NULL,
        cron VARCHAR(255),
        enabled BOOLEAN DEFAULT TRUE,
        last_run_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_query_schedules_scope ON query_schedules (user_id, organization_id, project_id);

    CREATE TABLE IF NOT EXISTS query_snapshots (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL,
        organization_id INTEGER,
        project_id INTEGER,
        name VARCHAR(255),
        data_source_id VARCHAR(255),
        sql TEXT,
        columns JSONB,
        rows JSONB,
        row_count INT,
        metadata JSONB,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_query_snapshots_scope ON query_snapshots (user_id, organization_id, project_id);
    """

    # Execute each statement separately under a lock to avoid concurrent DDL
    # operations when multiple requests start at once in dev/test environments.
    async with _ensure_tables_lock:
        for stmt in [s.strip() for s in ddl.split(';') if s.strip()]:
            await db.execute(text(stmt))
        await db.commit()

    # Development-only table creation only; do not seed users here. Tests
    # should create any required test users via fixtures to keep production
    # code and migrations separate from test setup.


@router.get("/tabs")
async def get_query_tabs(
    organization_id: Optional[str] = None,
    project_id: Optional[str] = None,
    current_user: Dict[str, Any] = Depends(JWTCookieBearer()),
    db: AsyncSession = Depends(get_async_session)
):
    await ensure_tables(db)
    # `current_user` can be a dict (from test override) or a token string; use
    # helper to normalize. Support both shapes across endpoints.
    user_payload = _resolve_user_payload(current_user)
    user_id = str(user_payload.get("id") or user_payload.get("email") or "guest")
    # Compare numeric FK columns by casting to text to avoid binding errors when
    # test fixtures provide string values (e.g. 'guest') or empty strings.
    res = await db.execute(text(
        """
        SELECT tabs, active_key FROM query_tabs
        WHERE CAST(user_id AS TEXT) = CAST(:user_id AS TEXT)
          AND COALESCE(CAST(organization_id AS TEXT), '') = COALESCE(CAST(:org_id AS TEXT), '')
          AND COALESCE(CAST(project_id AS TEXT), '') = COALESCE(CAST(:proj_id AS TEXT), '')
        ORDER BY updated_at DESC LIMIT 1
        """
    ), {"user_id": user_id, "org_id": organization_id, "proj_id": project_id})
    row = res.first()
    return {"success": True, "tabs": (row[0] if row else []), "active_key": (row[1] if row else None)}


@router.post("/tabs")
async def save_query_tabs(
    payload: Dict[str, Any],
    organization_id: Optional[str] = None,
    project_id: Optional[str] = None,
    current_user: Dict[str, Any] = Depends(JWTCookieBearer()),
    db: AsyncSession = Depends(get_async_session)
):
    await ensure_tables(db)
    user_payload = _resolve_user_payload(current_user)
    user_id = str(user_payload.get("id") or user_payload.get("email") or "guest")
    tabs = payload.get("tabs", [])
    active_key = payload.get("active_key")
    await db.execute(text(
        """
        INSERT INTO query_tabs (user_id, organization_id, project_id, tabs, active_key, updated_at)
        VALUES (:user_id, :org_id, :proj_id, CAST(:tabs AS JSONB), :active_key, NOW())
        """
    ), {"user_id": user_id, "org_id": organization_id, "proj_id": project_id, "tabs": json.dumps(tabs), "active_key": active_key})
    await db.commit()
    return {"success": True}


@router.get("/saved-queries")
async def list_saved_queries(
    organization_id: Optional[str] = None,
    project_id: Optional[str] = None,
    current_user: Dict[str, Any] = Depends(JWTCookieBearer()),
    db: AsyncSession = Depends(get_async_session)
):
    await ensure_tables(db)
    user_payload = _resolve_user_payload(current_user)
    try:
        user_id = int(user_payload.get("id") or user_payload.get('sub') or 1)
    except Exception:
        user_id = 1

    res = await db.execute(text(
        """
        SELECT id, name, sql, metadata, created_at FROM saved_queries
        WHERE user_id = :user_id AND COALESCE(organization_id,0) = COALESCE(:org_id,0) AND COALESCE(project_id,0) = COALESCE(:proj_id,0)
        ORDER BY updated_at DESC
        """
    ), {"user_id": user_id, "org_id": organization_id, "proj_id": project_id})
    rows = [{"id": r[0], "name": r[1], "sql": r[2], "metadata": r[3], "created_at": r[4]} for r in res.fetchall()]
    return {"success": True, "items": rows}


@router.post("/saved-queries")
async def save_query(
    payload: Dict[str, Any],
    organization_id: Optional[str] = None,
    project_id: Optional[str] = None,
    current_user: Dict[str, Any] = Depends(JWTCookieBearer()),
    db: AsyncSession = Depends(get_async_session)
):
    await ensure_tables(db)
    user_payload = _resolve_user_payload(current_user)
    try:
        user_id = int(user_payload.get("id") or user_payload.get('sub') or 1)
    except Exception:
        user_id = 1
    name = payload.get("name")
    sql = payload.get("sql")
    metadata = payload.get("metadata")
    if not name or not sql:
        raise HTTPException(status_code=400, detail="name and sql required")
    await db.execute(text(
        """
        INSERT INTO saved_queries (user_id, organization_id, project_id, name, sql, metadata, created_at, updated_at)
        VALUES (:user_id, :org_id, :proj_id, :name, :sql, CAST(:metadata AS JSONB), NOW(), NOW())
        """
    ), {"user_id": user_id, "org_id": organization_id, "proj_id": project_id, "name": name, "sql": sql, "metadata": json.dumps(metadata or {})})
    await db.commit()
    return {"success": True}


@router.get("/schedules")
async def list_schedules(
    organization_id: Optional[str] = None,
    project_id: Optional[str] = None,
    current_user: Dict[str, Any] = Depends(JWTCookieBearer()),
    db: AsyncSession = Depends(get_async_session)
):
    await ensure_tables(db)
    user_payload = _resolve_user_payload(current_user)
    try:
        user_id = int(user_payload.get("id") or user_payload.get('sub') or 1)
    except Exception:
        user_id = 1
    # Normalize optional filters
    try:
        org_id_param = int(organization_id) if organization_id is not None else None
    except Exception:
        org_id_param = None
    try:
        proj_id_param = int(project_id) if project_id is not None else None
    except Exception:
        proj_id_param = None
    res = await db.execute(text(
        """
        SELECT id, name, sql, cron, enabled, last_run_at FROM query_schedules
        WHERE user_id = :user_id AND COALESCE(organization_id,0) = COALESCE(:org_id,0) AND COALESCE(project_id,0) = COALESCE(:proj_id,0)
        ORDER BY updated_at DESC
        """
    ), {"user_id": user_id, "org_id": org_id_param, "proj_id": proj_id_param})
    rows = [{"id": r[0], "name": r[1], "sql": r[2], "cron": r[3], "enabled": r[4], "last_run_at": r[5]} for r in res.fetchall()]
    return {"success": True, "items": rows}


@router.post("/schedules")
async def create_schedule(
    payload: Dict[str, Any],
    organization_id: Optional[str] = None,
    project_id: Optional[str] = None,
    current_user: Dict[str, Any] = Depends(JWTCookieBearer()),
    db: AsyncSession = Depends(get_async_session)
):
    await ensure_tables(db)
    user_payload = _resolve_user_payload(current_user)
    try:
        user_id = int(user_payload.get("id") or user_payload.get('sub') or 1)
    except Exception:
        user_id = 1
    name = payload.get("name")
    sql = payload.get("sql")
    cron = payload.get("cron")
    enabled = bool(payload.get("enabled", True))
    if not name or not sql:
        raise HTTPException(status_code=400, detail="name and sql required")
    await db.execute(text(
        """
        INSERT INTO query_schedules (user_id, organization_id, project_id, name, sql, cron, enabled, created_at, updated_at)
        VALUES (:user_id, :org_id, :proj_id, :name, :sql, :cron, :enabled, NOW(), NOW())
        """
    ), {"user_id": user_id, "org_id": organization_id, "proj_id": project_id, "name": name, "sql": sql, "cron": cron, "enabled": enabled})
    await db.commit()
    return {"success": True}


@router.post("/snapshots")
async def create_snapshot(
    request: Dict[str, Any],
    organization_id: Optional[str] = None,
    project_id: Optional[str] = None,
    current_token: str = Depends(JWTCookieBearer()),
    db: AsyncSession = Depends(get_async_session)
):
    """Create a query snapshot by executing SQL and persisting a small result set"""
    await ensure_tables(db)
    # Decode JWT to get user context. Tests may patch JWTCookieBearer to return
    # a dict directly instead of a token string, so accept both shapes.
    if isinstance(current_token, dict):
        user_payload = current_token
    else:
        user_payload = Auth().decodeJWT(current_token) or {}

    # Align with DB: user_id and organization_id are integers. If the payload
    # does not contain a numeric id, default to 1 for tests/local dev to avoid
    # FK violations against users table (tests use mocked services).
    try:
        user_id = int(user_payload.get("id") or user_payload.get('sub') or 1)
    except Exception:
        user_id = 1
    try:
        org_id = int(user_payload.get("organization_id") or 0)
    except Exception:
        org_id = 0

    # Enforce organization/project scope if provided
    user_roles = user_payload.get('roles', []) or []
    # Enforce organization/project scope: allow if user belongs to organization or has admin roles
    from app.db.session import get_async_session as _get_session
    # Check organization membership
    if organization_id:
        # If user is not in same org and not admin, deny
        if org_id != int(organization_id):
            if 'admin' not in user_roles and 'org_admin' not in user_roles:
                raise HTTPException(status_code=403, detail="User not allowed to create snapshot for this organization")
    if project_id:
        # project-level checks delegated to project service in other modules; basic check here
        # allow for now if user is in org or admin
        if org_id != int(organization_id or org_id):
            if 'admin' not in user_roles and 'org_admin' not in user_roles:
                raise HTTPException(status_code=403, detail="User not allowed to create snapshot for this project")
    data_source_id = request.get("data_source_id")
    sql = request.get("sql")
    name = request.get("name") or None
    preview_rows = int(request.get("preview_rows", 100))

    # Accept precomputed rows/columns from the client to allow snapshotting
    # results of ad-hoc/client-executed queries without re-executing on server.
    pre_rows = request.get("rows")
    pre_cols = request.get("columns")

    if not sql and not pre_rows:
        raise HTTPException(status_code=400, detail="sql or rows are required")

    # Cap preview rows
    preview_rows = max(1, min(preview_rows, 1000))

    try:
        if pre_rows:
            # Use provided results directly
            rows = pre_rows[:preview_rows]
            columns = pre_cols or ([] if not rows else list((rows[0] or {}).keys()))
            row_count = len(rows)
            exec_engine = 'client'
            exec_time = None
        else:
            # Resolve data source info (uses existing service function)
            from app.modules.data.services.data_connectivity_service import DataConnectivityService
            data_service = DataConnectivityService()
            # Some test monkeypatches may replace the method with functions that
            # return awaitables or async generators. Normalize here.
            ds_maybe = data_service.get_data_source_by_id(data_source_id)
            if inspect.isawaitable(ds_maybe):
                ds = await ds_maybe
            elif inspect.isasyncgen(ds_maybe) or isinstance(ds_maybe, types.AsyncGeneratorType):
                # consume async generator
                ds = None
                async for item in ds_maybe:
                    ds = item
                    break
            else:
                ds = ds_maybe
            if not ds:
                raise HTTPException(status_code=404, detail="Data source not found")
            # If demo/file source without physical file, use connectivity_service parser
            if ds.get('source') == 'demo_data' or ds.get('id','').startswith('demo_') or (ds.get('type') == 'file' and not ds.get('file_path')):
                try:
                    exec_result = await data_service.execute_query_on_source(data_source_id, sql or '')
                except Exception as qe:
                    raise HTTPException(status_code=400, detail=f"Query execution failed: {qe}")
                if not exec_result or not exec_result.get('success'):
                    raise HTTPException(status_code=400, detail=exec_result.get('error', 'Query execution failed'))
                rows = exec_result.get('data', [])[:preview_rows]
                columns = exec_result.get('columns') or ([] if not rows else list((rows[0] or {}).keys()))
                row_count = exec_result.get('total_rows', len(rows))
                exec_engine = 'demo'
                exec_time = None
            else:
                # Use multi-engine execution path
                from app.modules.data.services.multi_engine_query_service import MultiEngineQueryService
                multi = MultiEngineQueryService()
                exec_maybe = multi.execute_query(sql, ds, engine=None, optimization=True)
                exec_result = await exec_maybe if inspect.isawaitable(exec_maybe) else exec_maybe

                if not exec_result.get('success'):
                    raise HTTPException(status_code=400, detail=exec_result.get('error', 'Query execution failed'))

                rows = exec_result.get('data', [])[:preview_rows]
                columns = exec_result.get('columns') or ([] if not rows else list(rows[0].keys()))
                row_count = exec_result.get('row_count', len(rows))
                exec_engine = exec_result.get('engine')
                exec_time = exec_result.get('execution_time')

        # Persist snapshot
        # Enforce per-user snapshot size limit (rows stored)
        MAX_SNAPSHOT_ROWS_PER_USER = 5000
        # Count user's existing snapshot rows total (best-effort)
        try:
            count_res = await db.execute(text("SELECT COALESCE(SUM(row_count),0) FROM query_snapshots WHERE user_id = :user_id"), {"user_id": user_id})
            total_rows = count_res.scalar() or 0
        except Exception:
            total_rows = 0
        if total_rows + row_count > MAX_SNAPSHOT_ROWS_PER_USER:
            raise HTTPException(status_code=413, detail="User snapshot storage limit exceeded")

        await db.execute(text(
            """
            INSERT INTO query_snapshots (user_id, organization_id, project_id, name, data_source_id, sql, columns, rows, row_count, metadata, created_at, updated_at)
            VALUES (:user_id, :org_id, :proj_id, :name, :data_source_id, :sql, CAST(:columns AS JSONB), CAST(:rows AS JSONB), :row_count, CAST(:metadata AS JSONB), NOW(), NOW())
            RETURNING id
            """
        ), {
            "user_id": user_id,
            "org_id": organization_id,
            "proj_id": project_id,
            "name": name,
            "data_source_id": data_source_id,
            "sql": sql,
            "columns": json.dumps(columns),
            "rows": json.dumps(rows),
            "row_count": row_count,
            "metadata": json.dumps({"engine": exec_engine, "execution_time": exec_time})
        })
        res = await db.execute(text("SELECT currval(pg_get_serial_sequence('query_snapshots','id'))"))
        new_id_row = res.first()
        new_id = new_id_row[0] if new_id_row else None
        await db.commit()

        return {
            "success": True,
            "snapshot_id": new_id,
            "columns": columns,
            "rows": rows,
            "row_count": row_count
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/snapshots")
async def list_snapshots(
    organization_id: Optional[str] = None,
    project_id: Optional[str] = None,
    current_token: str = Depends(JWTCookieBearer()),
    db: AsyncSession = Depends(get_async_session)
):
    await ensure_tables(db)
    if isinstance(current_token, dict):
        user_payload = current_token
    else:
        user_payload = Auth().decodeJWT(current_token) or {}
    # Use integer user_id consistently to match DB schema
    try:
        user_id = int(user_payload.get("id") or user_payload.get('sub') or 1)
    except Exception:
        user_id = 1
    user_roles = user_payload.get('roles', []) or []
    # If organization_id provided, ensure user has access
    if organization_id and str(user_payload.get('organization_id') or '') != str(organization_id) and 'admin' not in user_roles and 'org_admin' not in user_roles:
        raise HTTPException(status_code=403, detail="User not allowed to list snapshots for this organization")
    # Normalize optional filters to integers when provided
    try:
        org_id_param = int(organization_id) if organization_id is not None else None
    except Exception:
        org_id_param = None
    try:
        proj_id_param = int(project_id) if project_id is not None else None
    except Exception:
        proj_id_param = None
    res = await db.execute(text(
        """
        SELECT id, name, data_source_id, row_count, metadata, created_at
        FROM query_snapshots
        WHERE user_id = :user_id
          AND COALESCE(organization_id, 0) = COALESCE(:org_id, 0)
          AND COALESCE(project_id, 0) = COALESCE(:proj_id, 0)
        ORDER BY created_at DESC
        """
    ), {"user_id": user_id, "org_id": org_id_param, "proj_id": proj_id_param})
    rows = [{"id": r[0], "name": r[1], "data_source_id": r[2], "row_count": r[3], "metadata": r[4], "created_at": r[5]} for r in res.fetchall()]
    return {"success": True, "items": rows}


@router.get("/snapshots/{snapshot_id}")
async def get_snapshot(snapshot_id: int,
    organization_id: Optional[str] = None,
    project_id: Optional[str] = None,
    current_token: str = Depends(JWTCookieBearer()),
    db: AsyncSession = Depends(get_async_session)
):
    await ensure_tables(db)
    if isinstance(current_token, dict):
        user_payload = current_token
    else:
        user_payload = Auth().decodeJWT(current_token) or {}
    user_id = str(user_payload.get("id") or user_payload.get("email") or user_payload.get('sub') or "guest")
    user_roles = user_payload.get('roles', []) or []
    # In development tests, allow missing auth to map to the default dev user id
    if user_id == 'guest' and settings.ENVIRONMENT == 'development':
        user_id = '1'
    res = await db.execute(text(
        "SELECT id, name, data_source_id, sql, columns, rows, row_count, metadata, created_at FROM query_snapshots WHERE id = :id AND user_id = :user_id LIMIT 1"
    ), {"id": snapshot_id, "user_id": user_id})
    row = res.first()
    if not row:
        raise HTTPException(status_code=404, detail="Snapshot not found")
    # Permission check: ensure user owns the snapshot or has organization access
    # For now, simple ownership check (extend with RBAC later)
    snap_user = row[0]
    # row indices changed earlier; fetch using select instead for robust access
    # (we'll re-query by id)
    res2 = await db.execute(text("SELECT user_id, organization_id FROM query_snapshots WHERE id = :id"), {"id": snapshot_id})
    owner_row = res2.first()
    if owner_row:
        owner_user_id = int(owner_row[0]) if owner_row[0] is not None else None
        owner_org_id = int(owner_row[1]) if owner_row[1] is not None else None
        # current request user id is user_id (int)
        if owner_user_id is not None and owner_user_id != user_id:
            raise HTTPException(status_code=403, detail="Permission denied to access this snapshot")
    return {
        "success": True,
        "snapshot": {
            "id": row[0],
            "name": row[1],
            "data_source_id": row[2],
            "sql": row[3],
            "columns": row[4],
            "rows": row[5],
            "row_count": row[6],
            "metadata": row[7],
            "created_at": row[8]
        }
    }


@router.post("/snapshots/cleanup")
async def cleanup_snapshots(request: Dict[str, Any], db: AsyncSession = Depends(get_async_session)):
    """Cleanup snapshots older than retention_days. Body: { retention_days: int, organization_id?: str }

    Intended for admin or cron use.
    """
    retention_days = int(request.get('retention_days', 30))
    organization_id = request.get('organization_id')
    try:
        cutoff = datetime.utcnow() - timedelta(days=retention_days)
        if organization_id:
            await db.execute(text("DELETE FROM query_snapshots WHERE organization_id = :org AND created_at < :cutoff"), {"org": organization_id, "cutoff": cutoff})
        else:
            await db.execute(text("DELETE FROM query_snapshots WHERE created_at < :cutoff"), {"cutoff": cutoff})
        await db.commit()
        return {"success": True, "message": "Cleanup completed"}
    except Exception as e:
        logger.error(f"❌ Snapshot cleanup failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/snapshots/cleanup/schedule")
async def schedule_cleanup_snapshots(
    request: Dict[str, Any],
    db: AsyncSession = Depends(get_async_session)
):
    """Schedule a one-off cleanup run (admin). For production, replace with a cron or background task runner."""
    retention_days = int(request.get('retention_days', 30))
    organization_id = request.get('organization_id')
    # Run cleanup immediately for now (could schedule in a task queue)
    try:
        cutoff = datetime.utcnow() - timedelta(days=retention_days)
        if organization_id:
            await db.execute(text("DELETE FROM query_snapshots WHERE organization_id = :org AND created_at < :cutoff"), {"org": organization_id, "cutoff": cutoff})
        else:
            await db.execute(text("DELETE FROM query_snapshots WHERE created_at < :cutoff"), {"cutoff": cutoff})
        await db.commit()
        return {"success": True, "message": "Scheduled cleanup executed"}
    except Exception as e:
        logger.error(f"❌ Scheduled snapshot cleanup failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


async def perform_snapshot_cleanup(db: AsyncSession, retention_days: int = 30, organization_id: Optional[str] = None) -> int:
    """Perform snapshot cleanup and return number of deleted rows (best-effort).

    This is a helper so cleanup can be triggered from background tasks as well as
    via HTTP endpoints.
    """
    from logging import getLogger
    _logger = getLogger(__name__)
    try:
        cutoff = datetime.utcnow() - timedelta(days=retention_days)
        if organization_id:
            res = await db.execute(text("DELETE FROM query_snapshots WHERE organization_id = :org AND created_at < :cutoff RETURNING id"), {"org": organization_id, "cutoff": cutoff})
        else:
            res = await db.execute(text("DELETE FROM query_snapshots WHERE created_at < :cutoff RETURNING id"), {"cutoff": cutoff})
        # res.fetchall may not be available for all engines; try to get rowcount
        try:
            deleted = len(res.fetchall())
        except Exception:
            deleted = getattr(res, 'rowcount', 0) or 0
        await db.commit()
        _logger.info(f"✅ Snapshot cleanup removed {deleted} rows (retention_days={retention_days}, org={organization_id})")
        return deleted
    except Exception as e:
        _logger.error(f"❌ Snapshot cleanup failed: {e}")
        try:
            await db.rollback()
        except Exception:
            pass
        raise


