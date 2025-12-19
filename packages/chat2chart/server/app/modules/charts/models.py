from app.common.model import BaseModel
from sqlalchemy import UUID, Column, String, Boolean, Integer, ForeignKey, DateTime
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import uuid


class ChatVisualization(BaseModel):
    """ChatVisualizationModel - Now using consolidated charts table."""

    __tablename__ = "charts"

    # Core chart fields
    title = Column(String(255), nullable=True)
    chart_type = Column(String(100), nullable=True)
    chart_library = Column(String(50), default='echarts')
    status = Column(String(50), default='pending')
    complexity_score = Column(Integer, default=5)
    data_source = Column(String(255), nullable=True)
    
    # Chat integration fields (from original chart table)
    form_data = Column(JSONB, nullable=True)
    result = Column(JSONB, nullable=True)
    datasource = Column(JSONB, nullable=True)
    message_id = Column(UUID, nullable=True)
    
    # User and organization fields
    user_id = Column(UUID(as_uuid=True), nullable=True)
    conversation_id = Column(UUID, ForeignKey("conversation.id"), nullable=True)
    tenant_id = Column(String(50), default='default')
    
    # Timestamps
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, onupdate=func.now())
    deleted_at = Column(DateTime, nullable=True)
    is_active = Column(Boolean, default=True)
    is_deleted = Column(Boolean, default=False)


class DashboardEmbed(BaseModel):
    """Persisted embed tokens for dashboards"""
    __tablename__ = "dashboard_embeds"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    dashboard_id = Column(UUID(as_uuid=True), ForeignKey("dashboards.id"), nullable=False)
    created_by = Column(UUID(as_uuid=True), nullable=True)
    embed_token = Column(String(255), nullable=False)
    options = Column(JSONB, nullable=True)
    expires_at = Column(DateTime, nullable=True)
    is_active = Column(Boolean, default=True)
    access_count = Column(Integer, default=0)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, onupdate=func.now(), nullable=True)

    # Use fully qualified path to avoid duplicate mapper registration
    # Dashboard is now only defined in app.modules.dashboards.models
    dashboard = relationship("app.modules.dashboards.models.Dashboard", back_populates="embeds")


# Dashboard model moved to app.modules.dashboards.models to avoid duplicate mapper registration
# DashboardWidget model moved to app.modules.dashboards.models to avoid duplicate mapper registration
# DashboardShare model moved to app.modules.dashboards.models to avoid duplicate mapper registration
# This file now only contains ChartVisualization and DashboardEmbed


# Plan-based feature restrictions
PLAN_LIMITS = {
    "free": {
        "max_dashboards": 3,
        "max_widgets_per_dashboard": 10,
        "max_pages_per_dashboard": 3,
        "max_shared_dashboards": 1,
        "export_formats": ["png"],
        "refresh_interval_min": 300,  # 5 minutes
        "data_retention_days": 7,
        "collaboration": False,
        "custom_themes": False,
        "advanced_filters": False,
        "real_time_data": False
    },
    "pro": {
        "max_dashboards": 20,
        "max_widgets_per_dashboard": 50,
        "max_pages_per_dashboard": 10,
        "max_shared_dashboards": 10,
        "export_formats": ["png", "pdf", "html"],
        "refresh_interval_min": 60,   # 1 minute
        "data_retention_days": 180,
        "collaboration": True,
        "custom_themes": True,
        "advanced_filters": True,
        "real_time_data": False,
        "priority_support": True
    },
    "team": {
        "max_dashboards": 100,
        "max_widgets_per_dashboard": 120,
        "max_pages_per_dashboard": 20,
        "max_shared_dashboards": 50,
        "export_formats": ["png", "pdf", "html", "excel"],
        "refresh_interval_min": 30,   # 30 seconds
        "data_retention_days": 365,
        "collaboration": True,
        "custom_themes": True,
        "advanced_filters": True,
        "real_time_data": True,
        "api_access": True,
        "webhooks": True,
        "team_governance": True,
        "priority_support": True,
        "dedicated_support": True
    },
    "enterprise": {
        "max_dashboards": -1,  # Unlimited
        "max_widgets_per_dashboard": -1,  # Unlimited
        "max_pages_per_dashboard": -1,    # Unlimited
        "max_shared_dashboards": -1,      # Unlimited
        "export_formats": ["png", "pdf", "html", "excel", "csv", "json"],
        "refresh_interval_min": 10,       # 10 seconds
        "data_retention_days": 730,
        "collaboration": True,
        "custom_themes": True,
        "advanced_filters": True,
        "real_time_data": True,
        "api_access": True,
        "webhooks": True,
        "sso": True,
        "audit_logs": True,
        "custom_branding": True,
        "priority_support": True,
        "white_label": True,
        "compliance": True,
        "dedicated_success": True
    }
}
