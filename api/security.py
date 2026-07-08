"""
Security middleware and utilities for CivicSight API.
Provides HTTP security headers, request size limiting, and input sanitization.
"""

import os
import re
import time
import logging
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response, JSONResponse

logger = logging.getLogger("civicsight.security")

# ---------------------------------------------------------------------------
# Security Headers Middleware
# ---------------------------------------------------------------------------

class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """
    Injects standard security headers into every HTTP response to mitigate
    clickjacking, MIME-sniffing, XSS, and other common web attacks.
    """

    async def dispatch(self, request: Request, call_next) -> Response:
        response = await call_next(request)

        # Prevent MIME-type sniffing
        response.headers["X-Content-Type-Options"] = "nosniff"

        # Prevent clickjacking via iframes
        response.headers["X-Frame-Options"] = "DENY"

        # XSS filter (legacy browsers)
        response.headers["X-XSS-Protection"] = "1; mode=block"

        # Force HTTPS for 1 year
        response.headers["Strict-Transport-Security"] = (
            "max-age=31536000; includeSubDomains"
        )

        # Content Security Policy
        # In dev mode, allow Swagger UI CDN assets; in production docs are disabled entirely
        is_prod = os.getenv("ENV", "development") == "production"
        if is_prod:
            response.headers["Content-Security-Policy"] = "default-src 'self'"
        else:
            response.headers["Content-Security-Policy"] = (
                "default-src 'self'; "
                "script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net; "
                "style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net; "
                "img-src 'self' data: https://fastapi.tiangolo.com"
            )

        # Referrer Policy — don't leak full URL to third parties
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"

        # Permissions Policy — disable unused browser features
        response.headers["Permissions-Policy"] = (
            "camera=(), microphone=(), geolocation=(), payment=()"
        )

        # Hide server implementation details
        response.headers["Server"] = "CivicSight"

        return response


# ---------------------------------------------------------------------------
# Request Size Limit Middleware
# ---------------------------------------------------------------------------

MAX_REQUEST_BODY_BYTES = 15 * 1024 * 1024  # 15 MB


class RequestSizeLimitMiddleware(BaseHTTPMiddleware):
    """
    Rejects requests whose Content-Length header exceeds the configured max.
    This prevents denial-of-service via excessively large payloads before
    the body is fully read into memory.
    """

    async def dispatch(self, request: Request, call_next) -> Response:
        content_length = request.headers.get("content-length")
        if content_length and int(content_length) > MAX_REQUEST_BODY_BYTES:
            return JSONResponse(
                status_code=413,
                content={"detail": "Request body too large. Maximum size is 15 MB."},
            )
        return await call_next(request)


# ---------------------------------------------------------------------------
# Input Sanitization Utilities
# ---------------------------------------------------------------------------

# Patterns commonly used in SQL injection and XSS
_SQL_INJECTION_PATTERNS = re.compile(
    r"(--|;|'|\"|\b(SELECT|INSERT|UPDATE|DELETE|DROP|UNION|ALTER|EXEC|EXECUTE)\b)",
    re.IGNORECASE,
)

_XSS_PATTERNS = re.compile(
    r"(<\s*script|javascript\s*:|on\w+\s*=)",
    re.IGNORECASE,
)


def sanitize_string(value: str) -> str:
    """
    Strip leading/trailing whitespace and collapse internal whitespace.
    Does NOT alter the string beyond normalising whitespace — the Pydantic
    validators enforce length and format constraints separately.
    """
    if not value:
        return value
    return " ".join(value.split())


def contains_sql_injection(value: str) -> bool:
    """Heuristic check for common SQL injection patterns."""
    return bool(_SQL_INJECTION_PATTERNS.search(value))


def contains_xss(value: str) -> bool:
    """Heuristic check for common XSS patterns."""
    return bool(_XSS_PATTERNS.search(value))


def validate_safe_text(value: str, field_name: str = "input") -> str:
    """
    Validate that a text field does not contain obvious injection payloads.
    Raises ValueError if dangerous patterns are detected.
    """
    if contains_sql_injection(value):
        raise ValueError(f"{field_name} contains invalid characters")
    if contains_xss(value):
        raise ValueError(f"{field_name} contains invalid characters")
    return sanitize_string(value)
