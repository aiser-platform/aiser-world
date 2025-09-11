from app.common.model import BaseModel
from sqlalchemy import (
    Column,
    String,
    Text,
    UUID,
    Boolean,
    Integer,
    ForeignKey,
    DateTime,
    JSON,
    Float,
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import uuid

# Import models from other modules


class Dashboard(BaseModel):
    """Dashboard model for organizing widgets and visualizations"""

    __tablename__ = "dashboards"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=False)
    created_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)

    # Dashboard settings
    layout_config = Column(JSON, nullable=True)  # Grid layout configuration
    theme_config = Column(JSON, nullable=True)  # Theme and styling
    global_filters = Column(JSON, nullable=True)  # Global filter configuration
    refresh_interval = Column(Integer, default=300)  # Auto-refresh interval in seconds

    # Access control
    is_public = Column(Boolean, default=False)
    is_active = Column(Boolean, default=True)
    is_template = Column(Boolean, default=False)

    # Plan-based restrictions
    max_widgets = Column(Integer, default=10)  # Based on plan
    max_pages = Column(Integer, default=5)  # Based on plan

    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    last_viewed_at = Column(DateTime(timezone=True), nullable=True)

    # Relationships
    project = relationship("Project")
    creator = relationship("User")
    widgets = relationship(
        "DashboardWidget", back_populates="dashboard", cascade="all, delete-orphan"
    )
    pages = relationship(
        "DashboardPage", back_populates="dashboard", cascade="all, delete-orphan"
    )
    shares = relationship(
        "DashboardShare", back_populates="dashboard", cascade="all, delete-orphan"
    )


class DashboardPage(BaseModel):
    """Dashboard page model for multi-page dashboards"""

    __tablename__ = "dashboard_pages"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    dashboard_id = Column(
        UUID(as_uuid=True), ForeignKey("dashboards.id"), nullable=False
    )
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    page_order = Column(Integer, default=0)

    # Page settings
    layout_config = Column(JSON, nullable=True)  # Page-specific layout
    filters = Column(JSON, nullable=True)  # Page-specific filters

    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    dashboard = relationship("Dashboard", back_populates="pages")
    widgets = relationship(
        "DashboardWidget", back_populates="page", cascade="all, delete-orphan"
    )


class DashboardWidget(BaseModel):
    """Widget model for dashboard components"""

    __tablename__ = "dashboard_widgets"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    dashboard_id = Column(
        UUID(as_uuid=True), ForeignKey("dashboards.id"), nullable=False
    )
    page_id = Column(
        UUID(as_uuid=True), ForeignKey("dashboard_pages.id"), nullable=True
    )

    # Widget identification
    name = Column(String(255), nullable=False)
    widget_type = Column(String(50), nullable=False)  # chart, table, text, image, etc.
    chart_type = Column(String(50), nullable=True)  # bar, line, pie, etc.

    # Widget configuration
    config = Column(JSON, nullable=True)  # Widget-specific configuration
    data_config = Column(JSON, nullable=True)  # Data source and query configuration
    style_config = Column(JSON, nullable=True)  # Styling and appearance

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

    # Data and performance
    last_data_refresh = Column(DateTime(timezone=True), nullable=True)
    data_cache_ttl = Column(Integer, default=300)  # Cache TTL in seconds
    query_execution_time = Column(Float, nullable=True)  # Last query execution time

    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    dashboard = relationship("Dashboard", back_populates="widgets")
    page = relationship("DashboardPage", back_populates="widgets")


class DashboardShare(BaseModel):
    """Dashboard sharing model for collaboration"""

    __tablename__ = "dashboard_shares"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    dashboard_id = Column(
        UUID(as_uuid=True), ForeignKey("dashboards.id"), nullable=False
    )
    shared_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    shared_with = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    organization_id = Column(Integer, ForeignKey("organizations.id"), nullable=True)

    # Share settings
    permission = Column(String(20), default="view")  # view, edit, admin
    expires_at = Column(DateTime(timezone=True), nullable=True)
    is_active = Column(Boolean, default=True)

    # Share metadata
    share_token = Column(String(255), nullable=True)  # For public shares
    access_count = Column(Integer, default=0)
    last_accessed_at = Column(DateTime(timezone=True), nullable=True)

    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    dashboard = relationship("Dashboard", back_populates="shares")
    sharer = relationship("User", foreign_keys=[shared_by])
    sharee = relationship("User", foreign_keys=[shared_with])
    organization = relationship("Organization")


class DashboardTemplate(BaseModel):
    """Dashboard template model for reusable dashboard designs"""

    __tablename__ = "dashboard_templates"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    category = Column(String(100), nullable=True)  # sales, marketing, finance, etc.

    # Template configuration
    template_config = Column(JSON, nullable=False)  # Complete dashboard configuration
    preview_image_url = Column(String(500), nullable=True)

    # Template metadata
    is_public = Column(Boolean, default=False)
    is_featured = Column(Boolean, default=False)
    usage_count = Column(Integer, default=0)
    rating = Column(Float, default=0.0)

    # Plan requirements
    required_plan = Column(String(20), default="free")  # free, pro, team, enterprise

    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    created_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    creator = relationship("User")


class DashboardAnalytics(BaseModel):
    """Dashboard analytics model for usage tracking"""

    __tablename__ = "dashboard_analytics"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    dashboard_id = Column(
        UUID(as_uuid=True), ForeignKey("dashboards.id"), nullable=False
    )
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)

    # Analytics data
    event_type = Column(String(50), nullable=False)  # view, edit, share, export, etc.
    event_data = Column(JSON, nullable=True)  # Additional event metadata
    session_id = Column(String(255), nullable=True)

    # Performance metrics
    load_time = Column(Float, nullable=True)  # Dashboard load time
    render_time = Column(Float, nullable=True)  # Widget render time
    query_time = Column(Float, nullable=True)  # Data query time

    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    dashboard = relationship("Dashboard")
    user = relationship("User")


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
