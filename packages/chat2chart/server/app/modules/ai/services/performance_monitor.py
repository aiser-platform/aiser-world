"""
Performance Monitor for AI Services
Tracks execution times, token usage, and performance metrics
"""

import logging
import time
from typing import Dict, Any, Optional
from datetime import datetime

logger = logging.getLogger(__name__)


class PerformanceMonitor:
    """Monitor performance metrics for AI operations"""
    
    def __init__(self):
        self.metrics: Dict[str, Any] = {}
        self.start_times: Dict[str, float] = {}
    
    def start_timer(self, operation_id: str) -> None:
        """Start timing an operation"""
        self.start_times[operation_id] = time.time()
    
    def end_timer(self, operation_id: str) -> float:
        """End timing an operation and return duration"""
        if operation_id not in self.start_times:
            return 0.0
        duration = time.time() - self.start_times[operation_id]
        del self.start_times[operation_id]
        return duration
    
    def record_metric(self, name: str, value: Any) -> None:
        """Record a performance metric"""
        if name not in self.metrics:
            self.metrics[name] = []
        self.metrics[name].append({
            'value': value,
            'timestamp': datetime.now().isoformat()
        })
    
    def get_metrics(self) -> Dict[str, Any]:
        """Get all recorded metrics"""
        return self.metrics.copy()
    
    def reset(self) -> None:
        """Reset all metrics"""
        self.metrics.clear()
        self.start_times.clear()





