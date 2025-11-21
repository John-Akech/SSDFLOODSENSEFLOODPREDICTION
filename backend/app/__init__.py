"""FloodSense backend package initializer.

This file keeps backward compatibility with legacy relative imports such as
``core.database`` or ``api.routes`` by aliasing them to the fully qualified
``app.*`` modules whenever the package is imported. This avoids duplicate
module instances when running the app as a package (pytest, uvicorn -m) while
still supporting direct script execution.
"""

from importlib import import_module
import sys

_MODULE_ALIASES = {
    # Core utilities
    "core": "app.core",
    "core.config": "app.core.config",
    "core.database": "app.core.database",
    "core.security": "app.core.security",
    # Data models and schemas
    "models": "app.models",
    "models.database_models": "app.models.database_models",
    "schemas": "app.schemas",
    "schemas.schemas": "app.schemas.schemas",
    # Services
    "services": "app.services",
    "services.alert_service": "app.services.alert_service",
    "services.model_service": "app.services.model_service",
    "services.crud_service": "app.services.crud_service",
    # API routers
    "api": "app.api",
    "api.routes": "app.api.routes",
    "api.auth_routes": "app.api.auth_routes",
    "api.admin_routes": "app.api.admin_routes",
    "api.crud_routes": "app.api.crud_routes",
    # Middleware
    "middleware": "app.middleware",
    "middleware.request_logger": "app.middleware.request_logger",
    "middleware.security_headers": "app.middleware.security_headers",
    "middleware.rate_limiter": "app.middleware.rate_limiter",
    "middleware.ip_whitelist": "app.middleware.ip_whitelist",
    "middleware.error_handler": "app.middleware.error_handler",
}

for legacy_name, fq_name in _MODULE_ALIASES.items():
    if legacy_name in sys.modules:
        continue
    try:
        module = import_module(fq_name)
    except ModuleNotFoundError:
        continue
    sys.modules.setdefault(fq_name, module)
    sys.modules[legacy_name] = module

__all__ = []
