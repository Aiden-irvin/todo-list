from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.security import hash_password, verify_password
from app.models.user import User
from app.schemas.auth import UserCreate

# Verified against when the email is unknown, so timing does not reveal registered emails.
DUMMY_HASH = hash_password("timing-equaliser")


def register_user(db: Session, payload: UserCreate) -> User:
    email = payload.email.lower()
    existing = db.scalar(select(User).where(User.email == email))
    if existing:
        raise ValueError("An account with this email already exists")
    user = User(
        name=payload.name.strip(), email=email, hashed_password=hash_password(payload.password)
    )
    db.add(user)
    try:
        db.commit()
    except IntegrityError as error:
        db.rollback()
        raise ValueError("An account with this email already exists") from error
    db.refresh(user)
    return user


def authenticate_user(db: Session, email: str, password: str) -> User | None:
    user = db.scalar(select(User).where(User.email == email.lower()))
    if user is None:
        verify_password(password, DUMMY_HASH)
        return None
    return user if verify_password(password, user.hashed_password) else None
