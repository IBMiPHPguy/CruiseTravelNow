import re
from datetime import UTC, datetime, timedelta

from jose import JWTError, jwt
from passlib.context import CryptContext

from app.config import settings

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

PASSWORD_PATTERN = re.compile(
    r"^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9])\S{11,}$"
)


def validate_password(password: str) -> None:
    if " " in password:
        raise ValueError("Password cannot contain spaces.")
    if len(password) <= 10:
        raise ValueError("Password must be more than 10 characters.")
    if not PASSWORD_PATTERN.match(password):
        raise ValueError(
            "Password must include at least one uppercase letter, one lowercase letter, "
            "one numeral, and one special character."
        )


def hash_password(password: str) -> str:
    validate_password(password)
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)


def create_access_token(subject: str) -> str:
    expire = datetime.now(UTC) + timedelta(minutes=settings.jwt_expire_minutes)
    payload = {"sub": subject, "exp": expire}
    return jwt.encode(payload, settings.jwt_secret, algorithm=settings.jwt_algorithm)


def decode_access_token(token: str) -> str:
    try:
        payload = jwt.decode(token, settings.jwt_secret, algorithms=[settings.jwt_algorithm])
        username = payload.get("sub")
        if not username:
            raise JWTError("Missing subject.")
        return username
    except JWTError as exc:
        raise ValueError("Invalid or expired token.") from exc
