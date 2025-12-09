# This file ensures all model definitions are loaded when 'app.modules' is imported.
# IMPORT ORDER MATTERS: dashboards must be imported AFTER charts to avoid circular imports

from .user import models
from .chats.conversations import models
from .authentication import models
from .files import models
from .projects import models
from .chats.messages import models
from .chats.node_memory import models
# Import charts AFTER other modules but BEFORE dashboards (dashboards depends on charts)
from .charts import models
# Import dashboards LAST to ensure all dependencies are loaded first
from .dashboards import models

from app.common.model import Base
import logging

logger = logging.getLogger(__name__)

