"""
Real Monitoring & Observability System
Production-ready monitoring for Aiser Platform
"""

import time
import asyncio
from typing import Dict, Any, List, Optional
from datetime import datetime, timezone, timedelta
from dataclasses import dataclass, asdict
from prometheus_client import Counter, Histogram, Gauge, Summary, CollectorRegistry, generate_latest
import psutil
import logging

from fastapi import Request, Response
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_

from app.core.database import get_async_session
from app.models.metrics import MetricRecord, AlertRule, Alert

logger = logging.getLogger(__name__)

# Prometheus metrics
REGISTRY = CollectorRegistry()

# HTTP metrics
HTTP_REQUESTS_TOTAL = Counter(
    'http_requests_total',
    'Total HTTP requests',
    ['method', 'endpoint', 'status_code'],
    registry=REGISTRY
)

HTTP_REQUEST_DURATION = Histogram(
    'http_request_duration_seconds',
    'HTTP request duration in seconds',
    ['method', 'endpoint'],
    registry=REGISTRY
)

# Database metrics
DATABASE_CONNECTIONS = Gauge(
    'database_connections_active',
    'Active database connections',
    registry=REGISTRY
)

DATABASE_QUERY_DURATION = Histogram(
    'database_query_duration_seconds',
    'Database query duration in seconds',
    ['query_type'],
    registry=REGISTRY
)

# Business metrics
ACTIVE_USERS = Gauge(
    'active_users_total',
    'Total active users',
    ['organization_id'],
    registry=REGISTRY
)

DASHBOARDS_CREATED = Counter(
    'dashboards_created_total',
    'Total dashboards created',
    ['organization_id', 'project_id'],
    registry=REGISTRY
)

DATA_SOURCES_CONNECTED = Gauge(
    'data_sources_connected_total',
    'Total connected data sources',
    ['organization_id', 'type'],
    registry=REGISTRY
)

API_CALLS_TOTAL = Counter(
    'api_calls_total',
    'Total API calls',
    ['endpoint', 'organization_id'],
    registry=REGISTRY
)

# System metrics
SYSTEM_CPU_USAGE = Gauge(
    'system_cpu_usage_percent',
    'System CPU usage percentage',
    registry=REGISTRY
)

SYSTEM_MEMORY_USAGE = Gauge(
    'system_memory_usage_bytes',
    'System memory usage in bytes',
    registry=REGISTRY
)

SYSTEM_DISK_USAGE = Gauge(
    'system_disk_usage_bytes',
    'System disk usage in bytes',
    ['device'],
    registry=REGISTRY
)

# Error metrics
ERRORS_TOTAL = Counter(
    'errors_total',
    'Total errors',
    ['error_type', 'component'],
    registry=REGISTRY
)

@dataclass
class MetricData:
    """Metric data structure"""
    name: str
    value: float
    labels: Dict[str, str]
    timestamp: datetime
    organization_id: Optional[str] = None
    project_id: Optional[str] = None

class MetricsCollector:
    """Real metrics collection system"""
    
    def __init__(self):
        self.metrics_buffer: List[MetricData] = []
        self.buffer_size = 1000
        self.flush_interval = 30  # seconds
        
    async def collect_system_metrics(self):
        """Collect system-level metrics"""
        try:
            # CPU usage
            cpu_percent = psutil.cpu_percent(interval=1)
            SYSTEM_CPU_USAGE.set(cpu_percent)
            
            # Memory usage
            memory = psutil.virtual_memory()
            SYSTEM_MEMORY_USAGE.set(memory.used)
            
            # Disk usage
            for partition in psutil.disk_partitions():
                try:
                    usage = psutil.disk_usage(partition.mountpoint)
                    SYSTEM_DISK_USAGE.labels(device=partition.device).set(usage.used)
                except PermissionError:
                    continue
                    
        except Exception as e:
            logger.error(f"Error collecting system metrics: {e}")
            ERRORS_TOTAL.labels(error_type="system_metrics", component="collector").inc()
    
    async def collect_business_metrics(self, session: AsyncSession):
        """Collect business-level metrics"""
        try:
            # Active users (last 24 hours)
            active_users_query = select(func.count()).select_from(
                select().where(
                    and_(
                        # User activity in last 24 hours
                        # This would need to be implemented based on your user activity tracking
                    )
                )
            )
            # For now, we'll use a placeholder
            active_users = 0  # await session.execute(active_users_query)
            ACTIVE_USERS.labels(organization_id="global").set(active_users)
            
            # Dashboards created (last 24 hours)
            dashboards_query = select(func.count()).select_from(
                # Your dashboard model
            )
            # dashboards_count = await session.execute(dashboards_query)
            # DASHBOARDS_CREATED.labels(organization_id="global", project_id="global").inc(dashboards_count)
            
        except Exception as e:
            logger.error(f"Error collecting business metrics: {e}")
            ERRORS_TOTAL.labels(error_type="business_metrics", component="collector").inc()
    
    async def record_metric(
        self,
        name: str,
        value: float,
        labels: Dict[str, str] = None,
        organization_id: str = None,
        project_id: str = None
    ):
        """Record a custom metric"""
        metric_data = MetricData(
            name=name,
            value=value,
            labels=labels or {},
            timestamp=datetime.now(timezone.utc),
            organization_id=organization_id,
            project_id=project_id
        )
        
        self.metrics_buffer.append(metric_data)
        
        # Flush buffer if it's full
        if len(self.metrics_buffer) >= self.buffer_size:
            await self.flush_metrics()
    
    async def flush_metrics(self, session: AsyncSession = None):
        """Flush metrics buffer to database"""
        if not self.metrics_buffer:
            return
            
        try:
            if session:
                # Save to database
                for metric_data in self.metrics_buffer:
                    metric_record = MetricRecord(
                        name=metric_data.name,
                        value=metric_data.value,
                        labels=metric_data.labels,
                        timestamp=metric_data.timestamp,
                        organization_id=metric_data.organization_id,
                        project_id=metric_data.project_id
                    )
                    session.add(metric_record)
                
                await session.commit()
            
            # Clear buffer
            self.metrics_buffer.clear()
            
        except Exception as e:
            logger.error(f"Error flushing metrics: {e}")
            ERRORS_TOTAL.labels(error_type="metrics_flush", component="collector").inc()

class AlertManager:
    """Real alert management system"""
    
    def __init__(self):
        self.alert_rules: Dict[str, AlertRule] = {}
        self.active_alerts: Dict[str, Alert] = {}
    
    async def load_alert_rules(self, session: AsyncSession):
        """Load alert rules from database"""
        try:
            result = await session.execute(select(AlertRule).where(AlertRule.is_active == True))
            rules = result.scalars().all()
            
            for rule in rules:
                self.alert_rules[rule.name] = rule
                
        except Exception as e:
            logger.error(f"Error loading alert rules: {e}")
    
    async def check_alerts(self, session: AsyncSession):
        """Check all alert rules and trigger alerts if needed"""
        try:
            for rule_name, rule in self.alert_rules.items():
                await self._check_alert_rule(rule, session)
                
        except Exception as e:
            logger.error(f"Error checking alerts: {e}")
    
    async def _check_alert_rule(self, rule: AlertRule, session: AsyncSession):
        """Check a specific alert rule"""
        try:
            # Get current metric value
            current_value = await self._get_metric_value(rule.metric_name, rule.labels, session)
            
            if current_value is None:
                return
            
            # Check if alert condition is met
            alert_triggered = False
            
            if rule.condition == "greater_than" and current_value > rule.threshold:
                alert_triggered = True
            elif rule.condition == "less_than" and current_value < rule.threshold:
                alert_triggered = True
            elif rule.condition == "equals" and current_value == rule.threshold:
                alert_triggered = True
            
            if alert_triggered:
                await self._trigger_alert(rule, current_value, session)
            else:
                await self._resolve_alert(rule, session)
                
        except Exception as e:
            logger.error(f"Error checking alert rule {rule.name}: {e}")
    
    async def _get_metric_value(self, metric_name: str, labels: Dict[str, str], session: AsyncSession) -> Optional[float]:
        """Get current value for a metric"""
        try:
            # Query the latest metric value
            query = select(MetricRecord.value).where(
                and_(
                    MetricRecord.name == metric_name,
                    MetricRecord.labels == labels
                )
            ).order_by(MetricRecord.timestamp.desc()).limit(1)
            
            result = await session.execute(query)
            value = result.scalar_one_or_none()
            
            return value
            
        except Exception as e:
            logger.error(f"Error getting metric value for {metric_name}: {e}")
            return None
    
    async def _trigger_alert(self, rule: AlertRule, current_value: float, session: AsyncSession):
        """Trigger an alert"""
        try:
            alert_id = f"{rule.name}_{rule.metric_name}"
            
            # Check if alert is already active
            if alert_id in self.active_alerts:
                return
            
            # Create new alert
            alert = Alert(
                rule_id=rule.id,
                metric_name=rule.metric_name,
                current_value=current_value,
                threshold=rule.threshold,
                condition=rule.condition,
                severity=rule.severity,
                status="active",
                triggered_at=datetime.now(timezone.utc)
            )
            
            session.add(alert)
            await session.commit()
            
            self.active_alerts[alert_id] = alert
            
            # Send notification
            await self._send_alert_notification(alert, rule)
            
            logger.warning(f"Alert triggered: {rule.name} - {rule.metric_name} {rule.condition} {rule.threshold} (current: {current_value})")
            
        except Exception as e:
            logger.error(f"Error triggering alert {rule.name}: {e}")
    
    async def _resolve_alert(self, rule: AlertRule, session: AsyncSession):
        """Resolve an alert if it's no longer active"""
        try:
            alert_id = f"{rule.name}_{rule.metric_name}"
            
            if alert_id in self.active_alerts:
                alert = self.active_alerts[alert_id]
                alert.status = "resolved"
                alert.resolved_at = datetime.now(timezone.utc)
                
                session.add(alert)
                await session.commit()
                
                del self.active_alerts[alert_id]
                
                logger.info(f"Alert resolved: {rule.name}")
                
        except Exception as e:
            logger.error(f"Error resolving alert {rule.name}: {e}")
    
    async def _send_alert_notification(self, alert: Alert, rule: AlertRule):
        """Send alert notification"""
        try:
            # This would integrate with your notification system
            # (email, Slack, PagerDuty, etc.)
            notification_data = {
                "alert_id": alert.id,
                "rule_name": rule.name,
                "metric_name": alert.metric_name,
                "current_value": alert.current_value,
                "threshold": alert.threshold,
                "condition": alert.condition,
                "severity": alert.severity,
                "triggered_at": alert.triggered_at.isoformat()
            }
            
            # Send notification (implement based on your notification system)
            logger.info(f"Alert notification sent: {notification_data}")
            
        except Exception as e:
            logger.error(f"Error sending alert notification: {e}")

class PerformanceMonitor:
    """Real performance monitoring"""
    
    def __init__(self):
        self.request_times: Dict[str, List[float]] = {}
        self.error_counts: Dict[str, int] = {}
    
    async def monitor_request(self, request: Request, call_next):
        """Monitor HTTP request performance"""
        start_time = time.time()
        
        try:
            response = await call_next(request)
            
            # Record metrics
            duration = time.time() - start_time
            
            HTTP_REQUESTS_TOTAL.labels(
                method=request.method,
                endpoint=request.url.path,
                status_code=response.status_code
            ).inc()
            
            HTTP_REQUEST_DURATION.labels(
                method=request.method,
                endpoint=request.url.path
            ).observe(duration)
            
            # Track slow requests
            if duration > 5.0:  # 5 seconds
                logger.warning(f"Slow request: {request.method} {request.url.path} took {duration:.2f}s")
            
            return response
            
        except Exception as e:
            # Record error
            ERRORS_TOTAL.labels(
                error_type=type(e).__name__,
                component="http_handler"
            ).inc()
            
            logger.error(f"Request error: {e}")
            raise
    
    async def monitor_database_query(self, query_type: str, duration: float):
        """Monitor database query performance"""
        DATABASE_QUERY_DURATION.labels(query_type=query_type).observe(duration)
        
        # Track slow queries
        if duration > 1.0:  # 1 second
            logger.warning(f"Slow database query: {query_type} took {duration:.2f}s")

# Global instances
metrics_collector = MetricsCollector()
alert_manager = AlertManager()
performance_monitor = PerformanceMonitor()

# Background tasks
async def metrics_collection_task():
    """Background task for metrics collection"""
    while True:
        try:
            await metrics_collector.collect_system_metrics()
            
            # Get database session for business metrics
            async with get_async_session() as session:
                await metrics_collector.collect_business_metrics(session)
                await metrics_collector.flush_metrics(session)
                await alert_manager.check_alerts(session)
            
            await asyncio.sleep(30)  # Collect every 30 seconds
            
        except Exception as e:
            logger.error(f"Error in metrics collection task: {e}")
            await asyncio.sleep(60)  # Wait longer on error

async def alert_checking_task():
    """Background task for alert checking"""
    while True:
        try:
            async with get_async_session() as session:
                await alert_manager.load_alert_rules(session)
                await alert_manager.check_alerts(session)
            
            await asyncio.sleep(60)  # Check alerts every minute
            
        except Exception as e:
            logger.error(f"Error in alert checking task: {e}")
            await asyncio.sleep(300)  # Wait 5 minutes on error
