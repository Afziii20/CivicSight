"""
CivicSight API — Application entry point.

Security features:
- CORS restricted to configured origins
- Rate limiting on all endpoints
- Security headers middleware
- Request size limiting
- Production-safe error handling (no stack traces leaked)
- OpenAPI docs disabled in production
"""

import os
import logging
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from database import engine, Base
from routers import reports, users, departments, admin, local_auth
from security import SecurityHeadersMiddleware, RequestSizeLimitMiddleware

# ---------------------------------------------------------------------------
# Logging Configuration
# ---------------------------------------------------------------------------

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)s | %(name)s | %(message)s",
)
logger = logging.getLogger("civicsight")

# ---------------------------------------------------------------------------
# Environment
# ---------------------------------------------------------------------------

ENV = os.getenv("ENV", "development")
IS_PRODUCTION = ENV == "production"

# ---------------------------------------------------------------------------
# Database
# ---------------------------------------------------------------------------

# Create database tables if they don't exist
Base.metadata.create_all(bind=engine)

# Ensure uploads directory exists for local development
os.makedirs("uploads", exist_ok=True)

from database import SessionLocal
from models import Department
import uuid

def pre_seed_raipur_departments():
    db = SessionLocal()
    try:
        if db.query(Department).count() == 0:
            departments = [
                {"name": "Public Health & Sanitation", "email": "health@raipur.gov.in", "category_tags": ["garbage", "dead_animal", "sanitation"]},
                {"name": "Public Works & Infrastructure", "email": "pwd@raipur.gov.in", "category_tags": ["pothole", "road_damage", "park_damage"]},
                {"name": "Electrical", "email": "electrical@raipur.gov.in", "category_tags": ["broken_streetlight", "wiring"]},
                {"name": "Water Supply", "email": "water@raipur.gov.in", "category_tags": ["water_leak", "flooding", "pipeline"]},
                {"name": "Town Planning", "email": "planning@raipur.gov.in", "category_tags": ["illegal_construction", "encroachment"]},
                {"name": "Revenue", "email": "revenue@raipur.gov.in", "category_tags": ["tax", "property"]}
            ]
            for dep in departments:
                db_dep = Department(
                    id=str(uuid.uuid4()),
                    name=dep["name"],
                    email=dep["email"],
                    category_tags=dep["category_tags"]
                )
                db.add(db_dep)
            db.commit()
            logger.info("Pre-seeded Raipur Municipal Corporation departments.")
    finally:
        db.close()

pre_seed_raipur_departments()

# ---------------------------------------------------------------------------
# Rate Limiter
# ---------------------------------------------------------------------------

limiter = Limiter(key_func=get_remote_address)

# ---------------------------------------------------------------------------
# Application Factory
# ---------------------------------------------------------------------------

app = FastAPI(
    title="CivicSight API",
    version="2.0.0",
    description="Civic Issue Reporting Platform — Backend API (AWS Native)",
    # Disable interactive docs in production to reduce attack surface
    docs_url=None if IS_PRODUCTION else "/docs",
    redoc_url=None if IS_PRODUCTION else "/redoc",
    openapi_url=None if IS_PRODUCTION else "/openapi.json",
)

# Mount local uploads directory for development
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

# ---------------------------------------------------------------------------
# Rate Limiting
# ---------------------------------------------------------------------------

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# ---------------------------------------------------------------------------
# CORS — Restricted to allowed origins
# ---------------------------------------------------------------------------

ALLOWED_ORIGINS = os.getenv("ALLOWED_ORIGINS", "http://localhost:5173")
origins = [origin.strip() for origin in ALLOWED_ORIGINS.split(",") if origin.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"],
)

# ---------------------------------------------------------------------------
# Security Middleware Stack
# ---------------------------------------------------------------------------

# Order matters: outermost middleware runs first
app.add_middleware(SecurityHeadersMiddleware)
app.add_middleware(RequestSizeLimitMiddleware)

# Trusted Host — prevent Host header injection attacks
if IS_PRODUCTION:
    ALLOWED_HOSTS = os.getenv("ALLOWED_HOSTS", "").split(",")
    allowed = [h.strip() for h in ALLOWED_HOSTS if h.strip()]
    if allowed:
        app.add_middleware(TrustedHostMiddleware, allowed_hosts=allowed)

# ---------------------------------------------------------------------------
# Global Exception Handler — never leak internals
# ---------------------------------------------------------------------------

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    # Log the full error for debugging — but never send it to the client
    logger.error(
        "Unhandled error on %s %s: %s",
        request.method,
        request.url.path,
        exc,
        exc_info=True,
    )
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error. Please try again later."},
    )

# ---------------------------------------------------------------------------
# Routers
# ---------------------------------------------------------------------------

app.include_router(reports.router)
app.include_router(users.router)
app.include_router(departments.router)
app.include_router(admin.router)
app.include_router(local_auth.router)

# ---------------------------------------------------------------------------
# Root Endpoints
# ---------------------------------------------------------------------------

@app.get("/")
@limiter.limit("30/minute")
def root(request: Request):
    return {"message": "CivicSight API is running"}


@app.get("/health")
@limiter.limit("30/minute")
def health(request: Request):
    return {"status": "ok"}
