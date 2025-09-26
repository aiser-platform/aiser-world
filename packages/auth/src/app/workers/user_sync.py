import asyncio
import logging
import os
import requests

from app.db.session import db
from app.modules.user.repository import UserRepository

logger = logging.getLogger(__name__)


async def reconcile_users_once():
    """One-shot reconciliation: ensure users exist in chat2chart service.

    Idempotent: checks by email and skips existing.
    """
    provision_url = os.getenv('CHAT2CHART_PROVISION_URL')
    provision_secret = os.getenv('INTERNAL_PROVISION_SECRET')
    if not provision_url or not provision_secret:
        logger.info('Skipping user reconciliation; provision URL/secret not configured')
        return

    repo = UserRepository()
    # run limited set for safety
    async with db._session as session:
        users = await repo.get_active_users(session, offset=0, limit=200)

    for u in users:
        try:
            payload = {"id": str(u.id), "email": u.email, "username": u.username}
            headers = {"Content-Type": "application/json", "X-Internal-Auth": provision_secret}
            try:
                requests.post(provision_url, json=payload, headers=headers, timeout=5)
            except Exception:
                # fallback hostname for compose
                fallback = provision_url.replace('localhost', 'chat2chart-server').replace('127.0.0.1', 'chat2chart-server')
                requests.post(fallback, json=payload, headers=headers, timeout=5)
        except Exception:
            logger.exception(f'Failed to provision user {u.email}')


def start_periodic_reconcile(interval_seconds: int = 3600):
    loop = asyncio.get_event_loop()

    async def periodic():
        while True:
            try:
                await reconcile_users_once()
            except Exception:
                logger.exception('Periodic reconcile failed')
            await asyncio.sleep(interval_seconds)

    loop.create_task(periodic())


