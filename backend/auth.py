
from datetime import datetime, timedelta, timezone
from types import SimpleNamespace
import os

from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from passlib.context import CryptContext
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy import create_engine, Column, Integer, String
from sqlalchemy.orm import declarative_base, sessionmaker


# --------------------------------------------------
# DATABASE CONFIGURATION
# --------------------------------------------------

DATABASE_URL = "sqlite:///./prepwise.db"

SECRET_KEY = os.getenv("PREPWISE_SECRET_KEY")

if not SECRET_KEY:
    raise RuntimeError(
        "Set the PREPWISE_SECRET_KEY environment variable before starting."
    )

ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24

engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False},
)

SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine,
)

Base = declarative_base()

router = APIRouter(
    prefix="/api/auth",
    tags=["Authentication"],
)

pwd_context = CryptContext(
    schemes=["bcrypt"],
    deprecated="auto",
)

oauth2_scheme = OAuth2PasswordBearer(
    tokenUrl="/api/auth/login"
)


# --------------------------------------------------
# USER DATABASE MODEL
# --------------------------------------------------

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    email = Column(String(255), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)


Base.metadata.create_all(bind=engine)


# --------------------------------------------------
# INPUT SCHEMAS
# --------------------------------------------------

class RegisterInput(BaseModel):
    name: str = Field(min_length=2, max_length=100)
    email: EmailStr
    password: str = Field(min_length=8, max_length=72)


class LoginInput(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1, max_length=72)


# --------------------------------------------------
# JWT TOKEN
# --------------------------------------------------

def create_access_token(user_id: int):
    expires = datetime.now(timezone.utc) + timedelta(
        minutes=ACCESS_TOKEN_EXPIRE_MINUTES
    )

    return jwt.encode(
        {
            "sub": str(user_id),
            "exp": expires,
        },
        SECRET_KEY,
        algorithm=ALGORITHM,
    )


# --------------------------------------------------
# CURRENT USER AUTHENTICATION
# --------------------------------------------------

def get_current_user(
    token: str = Depends(oauth2_scheme),
):
    credentials_error = HTTPException(
        status_code=401,
        detail="Invalid or expired login. Please log in again.",
        headers={"WWW-Authenticate": "Bearer"},
    )

    try:
        payload = jwt.decode(
            token,
            SECRET_KEY,
            algorithms=[ALGORITHM],
        )

        user_id = payload.get("sub")

        if not user_id:
            raise credentials_error

        user_id = int(user_id)

    except (JWTError, ValueError, TypeError):
        raise credentials_error

    with SessionLocal() as db:
        user = (
            db.query(User)
            .filter(User.id == user_id)
            .first()
        )

        if not user:
            raise credentials_error

        # Return an object so current_user.id works
        # throughout main.py and the other routers.
        return SimpleNamespace(
            id=user.id,
            name=user.name,
            email=user.email,
        )


# --------------------------------------------------
# REGISTER
# --------------------------------------------------

@router.post("/register")
def register(data: RegisterInput):
    with SessionLocal() as db:
        email = str(data.email).lower().strip()

        existing_user = (
            db.query(User)
            .filter(User.email == email)
            .first()
        )

        if existing_user:
            raise HTTPException(
                status_code=409,
                detail="An account with this email already exists.",
            )

        user = User(
            name=data.name.strip(),
            email=email,
            hashed_password=pwd_context.hash(data.password),
        )

        db.add(user)
        db.commit()
        db.refresh(user)

        token = create_access_token(user.id)

        return {
            "message": "Registration successful.",
            "access_token": token,
            "token_type": "bearer",
            "user": {
                "id": user.id,
                "name": user.name,
                "email": user.email,
            },
        }


# --------------------------------------------------
# LOGIN
# --------------------------------------------------

@router.post("/login")
def login(data: LoginInput):
    with SessionLocal() as db:
        email = str(data.email).lower().strip()

        user = (
            db.query(User)
            .filter(User.email == email)
            .first()
        )

        if not user or not pwd_context.verify(
            data.password,
            user.hashed_password,
        ):
            raise HTTPException(
                status_code=401,
                detail="Incorrect email or password.",
            )

        token = create_access_token(user.id)

        return {
            "message": "Login successful.",
            "access_token": token,
            "token_type": "bearer",
            "user": {
                "id": user.id,
                "name": user.name,
                "email": user.email,
            },
        }


# --------------------------------------------------
# CURRENT USER PROFILE
# --------------------------------------------------

@router.get("/me")
def get_profile(
    current_user=Depends(get_current_user),
):
    return {
        "id": current_user.id,
        "name": current_user.name,
        "email": current_user.email,
    }
