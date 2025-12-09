"""
Data Retention Service
Plan-based cleanup for file data sources per organization.
"""

import logging
from datetime import datetime, timedelta
from typing import Optional

import sqlalchemy as sa
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.pricing.plans import get_plan_limits
from app.modules.data.services.cloud_storage_service import CloudStorageService

logger = logging.getLogger(__name__)


class DataRetentionService:
    """Clean up file-based data sources according to plan data_history_days."""

    def __init__(self, db: AsyncSession):
        self.db = db
        self.storage = CloudStorageService()

    async def cleanup_expired_file_sources(self, organization_id: Optional[int] = None) -> int:
        """
        Delete/deactivate file data sources older than plan-based retention.

        Returns number of data sources affected.
        """
        try:
            # Get organizations (all or single)
            if organization_id is not None:
                org_query = sa.text(
                    "SELECT id, plan_type FROM organizations WHERE id = :org_id"
                )
                org_result = await self.db.execute(org_query, {"org_id": organization_id})
            else:
                org_query = sa.text("SELECT id, plan_type FROM organizations")
                org_result = await self.db.execute(org_query)

            org_rows = org_result.fetchall() or []
            total_affected = 0

            for org in org_rows:
                org_id = int(org.id)
                plan_type = org.plan_type or "free"
                limits = get_plan_limits(plan_type)
                days = limits.get("data_history_days")

                # Skip if unlimited or not configured
                if not days or days <= 0:
                    continue

                cutoff = datetime.utcnow() - timedelta(days=days)

                # Find expired file data sources for this organization
                ds_query = sa.text(
                    """
                    SELECT id, file_path
                    FROM data_sources
                    WHERE type = 'file'
                      AND tenant_id::text = :tenant_id
                      AND is_active = TRUE
                      AND created_at < :cutoff
                    """
                )
                ds_result = await self.db.execute(
                    ds_query,
                    {"tenant_id": str(org_id), "cutoff": cutoff},
                )
                ds_rows = ds_result.fetchall() or []

                if not ds_rows:
                    continue

                logger.info(
                    f"🧹 Data retention: org={org_id}, plan={plan_type}, "
                    f"days={days}, expired_sources={len(ds_rows)}"
                )

                # Delete physical files (best-effort) and soft-delete data_sources
                for ds in ds_rows:
                    file_path = ds.file_path
                    ds_id = ds.id

                    if file_path:
                        try:
                            await self.storage.delete_file(file_path)
                        except Exception as e:
                            logger.warning(
                                f"⚠️ Failed to delete file for data_source {ds_id}: {e}"
                            )

                    # Soft-delete: mark inactive so it won't appear in UI/queries
                    update_q = sa.text(
                        """
                        UPDATE data_sources
                        SET is_active = FALSE,
                            updated_at = NOW()
                        WHERE id = :id
                        """
                    )
                    await self.db.execute(update_q, {"id": ds_id})
                    total_affected += 1

            await self.db.commit()
            logger.info(f"✅ Data retention cleanup completed. Total sources affected: {total_affected}")
            return total_affected

        except Exception as e:
            logger.error(f"❌ Data retention cleanup failed: {e}", exc_info=True)
            try:
                await self.db.rollback()
            except Exception:
                pass
            return 0






