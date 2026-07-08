"""
Authentication module for CivicSight API.
Verifies AWS Cognito JWT tokens with FULL claim validation (exp, iss, aud, token_use).
"""

import os
import json
import time
import logging
import urllib.request
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import jwt, JWTError
from sqlalchemy.orm import Session
from database import get_db
from models import User, RoleEnum

logger = logging.getLogger("civicsight.auth")

COGNITO_REGION = os.getenv("COGNITO_REGION", "us-east-1")
COGNITO_USER_POOL_ID = os.getenv("COGNITO_USER_POOL_ID", "")
COGNITO_APP_CLIENT_ID = os.getenv("COGNITO_APP_CLIENT_ID")

COGNITO_ISSUER = f"https://cognito-idp.{COGNITO_REGION}.amazonaws.com/{COGNITO_USER_POOL_ID}" if COGNITO_USER_POOL_ID else ""
JWKS_URL = f"{COGNITO_ISSUER}/.well-known/jwks.json" if COGNITO_ISSUER else ""

security = HTTPBearer()

# ---------------------------------------------------------------------------
# JWKS Key Cache — refreshes automatically when keys rotate
# ---------------------------------------------------------------------------

_jwks_cache: dict = {"keys": [], "fetched_at": 0}
_JWKS_CACHE_TTL = 3600  # Re-fetch keys every hour


def _fetch_jwks() -> list:
    """Fetch the JSON Web Key Set from Cognito."""
    if not JWKS_URL:
        return []
        
    try:
        with urllib.request.urlopen(JWKS_URL, timeout=10) as response:
            return json.loads(response.read().decode("utf-8"))["keys"]
    except Exception as e:
        logger.error("Failed to fetch JWKS from Cognito: %s", e)
        return []


def get_cognito_public_keys() -> list:
    """
    Return cached JWKS keys, refreshing them if the cache is stale.
    This ensures key rotation is handled automatically.
    """
    now = time.time()
    if not _jwks_cache["keys"] or (now - _jwks_cache["fetched_at"]) > _JWKS_CACHE_TTL:
        _jwks_cache["keys"] = _fetch_jwks()
        _jwks_cache["fetched_at"] = now
    return _jwks_cache["keys"]


# Warm the cache on startup
get_cognito_public_keys()


# ---------------------------------------------------------------------------
# Token Verification — FULL claim validation
# ---------------------------------------------------------------------------

def _build_rsa_key(kid: str) -> dict | None:
    """Find the RSA public key matching the given key ID."""
    keys = get_cognito_public_keys()
    for key in keys:
        if key["kid"] == kid:
            return key

    # Key not found — try refreshing in case keys rotated
    _jwks_cache["fetched_at"] = 0
    keys = get_cognito_public_keys()
    for key in keys:
        if key["kid"] == kid:
            return key

    return None


def verify_token(token: str) -> dict:
    """
    Decode and FULLY verify a JWT token (Cognito or Local).
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

    # Local Development Fallback
    if not COGNITO_USER_POOL_ID:
        try:
            LOCAL_SECRET_KEY = os.getenv("LOCAL_SECRET_KEY", "local_dev_secret_key")
            claims = jwt.decode(
                token, 
                LOCAL_SECRET_KEY, 
                algorithms=["HS256"], 
                issuer="local-dev"
            )
            return claims
        except JWTError as e:
            logger.warning("Local JWT verification failed: %s", e)
            raise credentials_exception

    # AWS Cognito Verification
    try:
        unverified_headers = jwt.get_unverified_headers(token)
        kid = unverified_headers.get("kid")
        if not kid:
            raise credentials_exception

        rsa_key = _build_rsa_key(kid)
        if not rsa_key:
            raise credentials_exception

        decode_options = {
            "verify_exp": True,
            "verify_iss": True,
            "verify_aud": bool(COGNITO_APP_CLIENT_ID),
        }

        claims = jwt.decode(
            token,
            rsa_key,
            algorithms=["RS256"],
            audience=COGNITO_APP_CLIENT_ID if COGNITO_APP_CLIENT_ID else None,
            issuer=COGNITO_ISSUER,
            options=decode_options,
        )

        token_use = claims.get("token_use")
        if token_use != "id":
            logger.warning("Rejected token with token_use=%s", token_use)
            raise credentials_exception

        return claims

    except JWTError as e:
        logger.warning("JWT verification failed: %s", e)
        raise credentials_exception
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Unexpected error during token verification: %s", e)
        raise credentials_exception


# ---------------------------------------------------------------------------
# FastAPI Dependencies
# ---------------------------------------------------------------------------

def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db),
) -> User:
    """Extract and validate the current user from the JWT token."""
    claims = verify_token(credentials.credentials)

    user_id = claims.get("sub")
    email = claims.get("email")

    if not user_id or not email:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
        )

    # Check if user exists in our DB
    user = db.query(User).filter(User.id == user_id).first()

    if not user:
        # Check if this is the first user
        is_first_user = db.query(User).count() == 0
        
        # Auto-create user on first login
        user = User(
            id=user_id,
            email=email,
            full_name=claims.get("name", ""),
            role=RoleEnum.admin if is_first_user else RoleEnum.citizen,
        )
        db.add(user)
        db.commit()
        db.refresh(user)

    return user


def require_admin(user: User = Depends(get_current_user)):
    """Dependency that ensures the current user has admin privileges."""
    if user.role != RoleEnum.admin:
        raise HTTPException(status_code=403, detail="Admin privileges required")
    return user


def require_staff(user: User = Depends(get_current_user)):
    """Dependency that ensures the current user has staff or admin privileges."""
    if user.role not in [RoleEnum.staff, RoleEnum.admin]:
        raise HTTPException(status_code=403, detail="Staff privileges required")
    return user
