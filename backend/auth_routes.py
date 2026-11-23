import hashlib
import secrets
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, Response, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import func, or_, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from database import get_db
from models import Follow, LoginSession, User
from schemas import (
    LoginRequest,
    MessageResponse,
    ProfileUpdateRequest,
    SettingsUpdateRequest,
    SignupRequest,
    TokenResponse,
    UserResponse,
)
from security import hash_password, verify_password


router = APIRouter(prefix="/auth", tags=["authentication"])
bearer_scheme = HTTPBearer(auto_error=False)
SESSION_DURATION = timedelta(hours=24)


def hash_token(token: str) -> str:
    """Hash a bearer token before it is stored in the database."""
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


@router.post(
    "/signup",
    response_model=UserResponse,
    status_code=status.HTTP_201_CREATED,
)
def signup(payload: SignupRequest, db: Session = Depends(get_db)):
    existing_user = db.scalar(
        select(User).where(
            or_(
                func.lower(User.username) == payload.username,
                func.lower(User.email) == payload.email,
            )
        )
    )
    if existing_user:
        if existing_user.username.lower() == payload.username:
            detail = "That username is already taken."
        else:
            detail = "An account with that email already exists."
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=detail)

    user = User(
        username=payload.username,
        email=payload.email,
        display_name=payload.display_name,
        password_hash=hash_password(payload.password),
    )
    db.add(user)

    try:
        db.commit()
        db.refresh(user)
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="That username or email is already in use.",
        ) from None

    return user


@router.post("/login", response_model=TokenResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)):
    identifier = payload.identifier.strip().lower()
    user = db.scalar(
        select(User).where(
            or_(
                func.lower(User.username) == identifier,
                func.lower(User.email) == identifier,
            )
        )
    )
    if user is None or not verify_password(payload.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username/email or password.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # The raw token is returned to the caller once; only its hash is persisted.
    access_token = secrets.token_urlsafe(32)
    expires_at = datetime.now(timezone.utc) + SESSION_DURATION
    db.add(
        LoginSession(
            user_id=user.id,
            hashed_token=hash_token(access_token),
            expires_at=expires_at,
        )
    )
    db.commit()

    return TokenResponse(access_token=access_token, expires_at=expires_at)


def get_current_session(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    db: Session = Depends(get_db),
) -> LoginSession:
    if credentials is None or credentials.scheme.lower() != "bearer":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication is required.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    session = db.scalar(
        select(LoginSession).where(
            LoginSession.hashed_token == hash_token(credentials.credentials)
        )
    )
    if session is None or session.is_revoked:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="This session is invalid or has been logged out.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # SQLite may return timezone-aware columns as naive datetimes.
    expiry = session.expires_at
    if expiry.tzinfo is None:
        expiry = expiry.replace(tzinfo=timezone.utc)
    if expiry <= datetime.now(timezone.utc):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="This session has expired. Please log in again.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return session


def get_current_user(
    session: LoginSession = Depends(get_current_session),
) -> User:
    return session.user


def get_optional_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    db: Session = Depends(get_db),
) -> User | None:
    """Return the authenticated user when a valid token is provided."""
    if credentials is None:
        return None
    session = get_current_session(credentials=credentials, db=db)
    return session.user


@router.get("/me", response_model=UserResponse)
def get_me(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return user_profile_response(db, current_user)


def user_profile_response(db: Session, user: User) -> dict:
    follower_count = db.scalar(
        select(func.count()).select_from(Follow).where(Follow.followed_id == user.id)
    ) or 0
    following_count = db.scalar(
        select(func.count()).select_from(Follow).where(Follow.follower_id == user.id)
    ) or 0
    return {
        "id": user.id,
        "username": user.username,
        "email": user.email,
        "display_name": user.display_name,
        "bio": user.bio,
        "profile_picture_url": user.profile_picture_url,
        "website": user.website,
        "theme": user.theme,
        "language": user.language,
        "notifications_enabled": user.notifications_enabled,
        "follower_count": follower_count,
        "following_count": following_count,
    }


@router.patch("/me", response_model=UserResponse)
def update_me(
    payload: ProfileUpdateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    duplicate = db.scalar(
        select(User).where(
            func.lower(User.username) == payload.username,
            User.id != current_user.id,
        )
    )
    if duplicate:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="That username is already taken.",
        )

    current_user.username = payload.username
    current_user.display_name = payload.display_name.strip()
    current_user.bio = payload.bio.strip()
    current_user.profile_picture_url = payload.profile_picture_url
    current_user.website = payload.website.strip()
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="That username is already taken.",
        ) from None
    db.refresh(current_user)
    return user_profile_response(db, current_user)


@router.patch("/settings", response_model=UserResponse)
def update_settings(
    payload: SettingsUpdateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    for field_name, value in payload.model_dump(exclude_unset=True).items():
        setattr(current_user, field_name, value)
    db.commit()
    db.refresh(current_user)
    return user_profile_response(db, current_user)


@router.post(
    "/logout",
    status_code=status.HTTP_204_NO_CONTENT,
    response_class=Response,
)
def logout(
    current_session: LoginSession = Depends(get_current_session),
    db: Session = Depends(get_db),
):
    current_session.is_revoked = True
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
