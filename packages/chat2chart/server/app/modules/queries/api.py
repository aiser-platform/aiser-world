from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from typing import Optional, Any, Dict

from app.db.session import get_async_session
from app.modules.authentication.deps.auth_bearer import JWTCookieBearer

router = APIRouter(prefix="/api/queries", tags=["queries"])


async def ensure_tables(db: AsyncSession):
    await db.execute(
        text(
            """
        CREATE TABLE IF NOT EXISTS query_tabs (
            id SERIAL PRIMARY KEY,
            user_id VARCHAR(255) NOT NULL,
            organization_id VARCHAR(255),
            project_id VARCHAR(255),
            tabs JSONB NOT NULL,
            active_key VARCHAR(255),
            updated_at TIMESTAMP DEFAULT NOW()
        );
        CREATE INDEX IF NOT EXISTS idx_query_tabs_scope ON query_tabs (user_id, organization_id, project_id);

        CREATE TABLE IF NOT EXISTS saved_queries (
            id SERIAL PRIMARY KEY,
            user_id VARCHAR(255) NOT NULL,
            organization_id VARCHAR(255),
            project_id VARCHAR(255),
            name VARCHAR(255) NOT NULL,
            sql TEXT NOT NULL,
            metadata JSONB,
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW()
        );
        CREATE INDEX IF NOT EXISTS idx_saved_queries_scope ON saved_queries (user_id, organization_id, project_id);

        CREATE TABLE IF NOT EXISTS query_schedules (
            id SERIAL PRIMARY KEY,
            user_id VARCHAR(255) NOT NULL,
            organization_id VARCHAR(255),
            project_id VARCHAR(255),
            name VARCHAR(255) NOT NULL,
            sql TEXT NOT NULL,
            cron VARCHAR(255),
            enabled BOOLEAN DEFAULT TRUE,
            last_run_at TIMESTAMP,
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW()
        );
        CREATE INDEX IF NOT EXISTS idx_query_schedules_scope ON query_schedules (user_id, organization_id, project_id);
        """
        )
    )
    await db.commit()


@router.get("/tabs")
async def get_query_tabs(
    organization_id: Optional[str] = None,
    project_id: Optional[str] = None,
    current_user: Dict[str, Any] = Depends(JWTCookieBearer()),
    db: AsyncSession = Depends(get_async_session),
):
    await ensure_tables(db)
    user_id = str(current_user.get("id") or current_user.get("email") or "guest")
    res = await db.execute(
        text(
            """
        SELECT tabs, active_key FROM query_tabs
        WHERE user_id = :user_id AND COALESCE(organization_id,'') = COALESCE(:org_id,'') AND COALESCE(project_id,'') = COALESCE(:proj_id,'')
        ORDER BY updated_at DESC LIMIT 1
        """
        ),
        {
            "user_id": user_id,
            "org_id": organization_id or "",
            "proj_id": project_id or "",
        },
    )
    row = res.first()
    return {
        "success": True,
        "tabs": (row[0] if row else []),
        "active_key": (row[1] if row else None),
    }


@router.post("/tabs")
async def save_query_tabs(
    payload: Dict[str, Any],
    organization_id: Optional[str] = None,
    project_id: Optional[str] = None,
    current_user: Dict[str, Any] = Depends(JWTCookieBearer()),
    db: AsyncSession = Depends(get_async_session),
):
    await ensure_tables(db)
    user_id = str(current_user.get("id") or current_user.get("email") or "guest")
    tabs = payload.get("tabs", [])
    active_key = payload.get("active_key")
    await db.execute(
        text(
            """
        INSERT INTO query_tabs (user_id, organization_id, project_id, tabs, active_key, updated_at)
        VALUES (:user_id, :org_id, :proj_id, CAST(:tabs AS JSONB), :active_key, NOW())
        """
        ),
        {
            "user_id": user_id,
            "org_id": organization_id,
            "proj_id": project_id,
            "tabs": text(str(tabs).replace("'", '"')),
            "active_key": active_key,
        },
    )
    await db.commit()
    return {"success": True}


@router.get("/saved-queries")
async def list_saved_queries(
    organization_id: Optional[str] = None,
    project_id: Optional[str] = None,
    current_user: Dict[str, Any] = Depends(JWTCookieBearer()),
    db: AsyncSession = Depends(get_async_session),
):
    await ensure_tables(db)
    user_id = str(current_user.get("id") or current_user.get("email") or "guest")
    res = await db.execute(
        text(
            """
        SELECT id, name, sql, metadata, created_at FROM saved_queries
        WHERE user_id = :user_id AND COALESCE(organization_id,'') = COALESCE(:org_id,'') AND COALESCE(project_id,'') = COALESCE(:proj_id,'')
        ORDER BY updated_at DESC
        """
        ),
        {
            "user_id": user_id,
            "org_id": organization_id or "",
            "proj_id": project_id or "",
        },
    )
    rows = [
        {"id": r[0], "name": r[1], "sql": r[2], "metadata": r[3], "created_at": r[4]}
        for r in res.fetchall()
    ]
    return {"success": True, "items": rows}


@router.post("/saved-queries")
async def save_query(
    payload: Dict[str, Any],
    organization_id: Optional[str] = None,
    project_id: Optional[str] = None,
    current_user: Dict[str, Any] = Depends(JWTCookieBearer()),
    db: AsyncSession = Depends(get_async_session),
):
    await ensure_tables(db)
    user_id = str(current_user.get("id") or current_user.get("email") or "guest")
    name = payload.get("name")
    sql = payload.get("sql")
    metadata = payload.get("metadata")
    if not name or not sql:
        raise HTTPException(status_code=400, detail="name and sql required")
    await db.execute(
        text(
            """
        INSERT INTO saved_queries (user_id, organization_id, project_id, name, sql, metadata, created_at, updated_at)
        VALUES (:user_id, :org_id, :proj_id, :name, :sql, CAST(:metadata AS JSONB), NOW(), NOW())
        """
        ),
        {
            "user_id": user_id,
            "org_id": organization_id,
            "proj_id": project_id,
            "name": name,
            "sql": sql,
            "metadata": text(str(metadata or {}).replace("'", '"')),
        },
    )
    await db.commit()
    return {"success": True}


@router.get("/schedules")
async def list_schedules(
    organization_id: Optional[str] = None,
    project_id: Optional[str] = None,
    current_user: Dict[str, Any] = Depends(JWTCookieBearer()),
    db: AsyncSession = Depends(get_async_session),
):
    await ensure_tables(db)
    user_id = str(current_user.get("id") or current_user.get("email") or "guest")
    res = await db.execute(
        text(
            """
        SELECT id, name, sql, cron, enabled, last_run_at FROM query_schedules
        WHERE user_id = :user_id AND COALESCE(organization_id,'') = COALESCE(:org_id,'') AND COALESCE(project_id,'') = COALESCE(:proj_id,'')
        ORDER BY updated_at DESC
        """
        ),
        {
            "user_id": user_id,
            "org_id": organization_id or "",
            "proj_id": project_id or "",
        },
    )
    rows = [
        {
            "id": r[0],
            "name": r[1],
            "sql": r[2],
            "cron": r[3],
            "enabled": r[4],
            "last_run_at": r[5],
        }
        for r in res.fetchall()
    ]
    return {"success": True, "items": rows}


@router.post("/schedules")
async def create_schedule(
    payload: Dict[str, Any],
    organization_id: Optional[str] = None,
    project_id: Optional[str] = None,
    current_user: Dict[str, Any] = Depends(JWTCookieBearer()),
    db: AsyncSession = Depends(get_async_session),
):
    await ensure_tables(db)
    user_id = str(current_user.get("id") or current_user.get("email") or "guest")
    name = payload.get("name")
    sql = payload.get("sql")
    cron = payload.get("cron")
    enabled = bool(payload.get("enabled", True))
    if not name or not sql:
        raise HTTPException(status_code=400, detail="name and sql required")
    await db.execute(
        text(
            """
        INSERT INTO query_schedules (user_id, organization_id, project_id, name, sql, cron, enabled, created_at, updated_at)
        VALUES (:user_id, :org_id, :proj_id, :name, :sql, :cron, :enabled, NOW(), NOW())
        """
        ),
        {
            "user_id": user_id,
            "org_id": organization_id,
            "proj_id": project_id,
            "name": name,
            "sql": sql,
            "cron": cron,
            "enabled": enabled,
        },
    )
    await db.commit()
    return {"success": True}
