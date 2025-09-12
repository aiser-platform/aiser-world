from app.main import app as application
from app.middleware.auth_mode import is_enterprise_mode

# Provide expected module name 'main' exporting ASGI app at 'app'
app = application

# Example: log selected auth mode on startup
if is_enterprise_mode():
    print("Auth service running in ENTERPRISE mode")
else:
    print("Auth service running in BASIC mode")


