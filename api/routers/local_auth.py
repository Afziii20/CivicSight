from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, EmailStr
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from jose import jwt
import uuid

from database import get_db
from models import User, RoleEnum
import os

router = APIRouter(prefix="/auth", tags=["Local Auth"])

# Only active if running locally without Cognito
LOCAL_SECRET_KEY = os.getenv("LOCAL_SECRET_KEY", "local_dev_secret_key")

class SignupRequest(BaseModel):
    email: EmailStr
    password: str
    name: str

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(days=7)
    to_encode.update({"exp": expire, "iss": "local-dev", "token_use": "id"})
    encoded_jwt = jwt.encode(to_encode, LOCAL_SECRET_KEY, algorithm="HS256")
    return encoded_jwt

@router.post("/signup")
def signup(req: SignupRequest, db: Session = Depends(get_db)):
    if os.getenv("COGNITO_USER_POOL_ID"):
        raise HTTPException(status_code=400, detail="Local signup is disabled when Cognito is configured.")
    
    # Check if user exists
    existing = db.query(User).filter(User.email == req.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    user_id = str(uuid.uuid4())
    # In local mode, we ignore the password entirely for simplicity, just rely on email matching later
    user = User(
        id=user_id,
        email=req.email,
        full_name=req.name,
        role=RoleEnum.admin if "admin" in req.email else RoleEnum.citizen
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    return {"message": "User created successfully"}

@router.post("/login")
def login(req: LoginRequest, db: Session = Depends(get_db)):
    if os.getenv("COGNITO_USER_POOL_ID"):
        raise HTTPException(status_code=400, detail="Local login is disabled when Cognito is configured.")
    
    user = db.query(User).filter(User.email == req.email).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found. Please sign up first.")

    # Generate a local JWT
    token_data = {
        "sub": user.id,
        "email": user.email,
        "name": user.full_name
    }
    
    token = create_access_token(token_data)
    
    return {"token": token}
