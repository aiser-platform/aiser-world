from app.common.model import BaseModel
from sqlalchemy import (
    UUID,
    Column,
    String,
    Boolean,
    Integer,
    ForeignKey,
    DateTime,
    Text,
)
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
    chart_library = Column(String(50), default="echarts")
    status = Column(String(50), default="pending")
    complexity_score = Column(Integer, default=5)
    data_source = Column(String(255), nullable=True)

    # Chat integration fields (from original chart table)
    form_data = Column(JSONB, nullable=True)
    result = Column(JSONB, nullable=True)
    datasource = Column(JSONB, nullable=True)
    message_id = Column(UUID, nullable=True)

    # User and organization fields
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    conversation_id = Column(UUID, ForeignKey("conversation.id"), nullable=True)
    tenant_id = Column(String(50), default="default")

    # Timestamps
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, onupdate=func.now())
    deleted_at = Column(DateTime, nullable=True)
    is_active = Column(Boolean, default=True)
    is_deleted = Column(Boolean, default=False)


class Dashboard(BaseModel):
    """Dashboard model for organizing widgets and visualizations"""

    __tablename__ = "dashboards"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=True)
    created_by = Column(
        Integer, ForeignKey("users.id"), nullable=True
    )  # Changed to Integer to match users table

    # Dashboard settings
    layout_config = Column(JSONB, nullable=True)  # Grid layout configuration
    theme_config = Column(JSONB, nullable=True)  # Theme and styling
    global_filters = Column(JSONB, nullable=True)  # Global filter configuration
    refresh_interval = Column(Integer, default=300)  # Auto-refresh interval in seconds

    # Access control
    is_public = Column(Boolean, default=False)
    is_active = Column(Boolean, default=True)
    is_template = Column(Boolean, default=False)

    # Plan-based restrictions
    max_widgets = Column(Integer, default=10)  # Based on plan
    max_pages = Column(Integer, default=5)  # Based on plan

    # Timestamps - match existing database pattern
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, onupdate=func.now())
    deleted_at = Column(DateTime, nullable=True)
    is_deleted = Column(Boolean, default=False)
    last_viewed_at = Column(DateTime, nullable=True)


class DashboardWidget(BaseModel):
    """Widget model for dashboard components"""

    __tablename__ = "dashboard_widgets"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    dashboard_id = Column(
        UUID(as_uuid=True), ForeignKey("dashboards.id"), nullable=False
    )

    # Widget identification
    name = Column(String(255), nullable=False)
    widget_type = Column(String(50), nullable=False)  # chart, table, text, image, etc.
    chart_type = Column(String(50), nullable=True)  # bar, line, pie, etc.

    # Widget configuration
    config = Column(JSONB, nullable=True)  # Widget-specific configuration
    data_config = Column(JSONB, nullable=True)  # Data source and query configuration
    style_config = Column(JSONB, nullable=True)  # Styling and appearance

    # Layout and positioning
    x = Column(Integer, default=0)
    y = Column(Integer, default=0)
    width = Column(Integer, default=4)
    height = Column(Integer, default=3)
    z_index = Column(Integer, default=0)

    # Widget state
    is_visible = Column(Boolean, default=True)
    is_locked = Column(Boolean, default=False)
    is_resizable = Column(Boolean, default=True)
    is_draggable = Column(Boolean, default=True)

    # Timestamps - match existing database pattern
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, onupdate=func.now())
    deleted_at = Column(DateTime, nullable=True)
    is_deleted = Column(Boolean, default=False)

    # Relationships
    dashboard = relationship("Dashboard")


class DashboardShare(BaseModel):
    """Dashboard sharing model for collaboration"""

    __tablename__ = "dashboard_shares"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    dashboard_id = Column(
        UUID(as_uuid=True), ForeignKey("dashboards.id"), nullable=False
    )
    shared_by = Column(
        Integer, ForeignKey("users.id"), nullable=False
    )  # Changed to Integer to match users table
    shared_with = Column(
        Integer, ForeignKey("users.id"), nullable=True
    )  # Changed to Integer to match users table

    # Share settings
    permission = Column(String(20), default="view")  # view, edit, admin
    expires_at = Column(DateTime, nullable=True)
    is_active = Column(Boolean, default=True)

    # Share metadata
    share_token = Column(String(255), nullable=True)  # For public shares
    access_count = Column(Integer, default=0)
    last_accessed_at = Column(DateTime, nullable=True)

    # Timestamps - match existing database pattern
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, onupdate=func.now())
    deleted_at = Column(DateTime, nullable=True)
    is_deleted = Column(Boolean, default=False)


# Plan-based feature restrictions
PLAN_LIMITS = {
    "free": {
        "max_dashboards": 3,
        "max_widgets_per_dashboard": 10,
        "max_pages_per_dashboard": 3,
        "max_shared_dashboards": 1,
        "export_formats": ["png"],
        "refresh_interval_min": 300,  # 5 minutes
        "data_retention_days": 30,
        "collaboration": False,
        "custom_themes": False,
        "advanced_filters": False,
        "real_time_data": False,
    },
    "pro": {
        "max_dashboards": 20,
        "max_widgets_per_dashboard": 50,
        "max_pages_per_dashboard": 10,
        "max_shared_dashboards": 10,
        "export_formats": ["png", "pdf", "html"],
        "refresh_interval_min": 60,  # 1 minute
        "data_retention_days": 90,
        "collaboration": True,
        "custom_themes": True,
        "advanced_filters": True,
        "real_time_data": False,
    },
    "team": {
        "max_dashboards": 100,
        "max_widgets_per_dashboard": 100,
        "max_pages_per_dashboard": 20,
        "max_shared_dashboards": 50,
        "export_formats": ["png", "pdf", "html", "excel"],
        "refresh_interval_min": 30,  # 30 seconds
        "data_retention_days": 180,
        "collaboration": True,
        "custom_themes": True,
        "advanced_filters": True,
        "real_time_data": True,
        "api_access": True,
        "webhooks": True,
    },
    "enterprise": {
        "max_dashboards": -1,  # Unlimited
        "max_widgets_per_dashboard": -1,  # Unlimited
        "max_pages_per_dashboard": -1,  # Unlimited
        "max_shared_dashboards": -1,  # Unlimited
        "export_formats": ["png", "pdf", "html", "excel", "csv", "json"],
        "refresh_interval_min": 10,  # 10 seconds
        "data_retention_days": 365,
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
    },
}
