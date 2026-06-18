from datetime import UTC, datetime, timedelta

import pytest

from app.security import (
    create_access_token,
    decode_access_token,
    hash_password,
    validate_password,
    verify_password,
)


def test_validate_password_rejects_invalid_values():
    with pytest.raises(ValueError, match="spaces"):
        validate_password("Has Space1!")
    with pytest.raises(ValueError, match="more than 10"):
        validate_password("Short1!")
    with pytest.raises(ValueError, match="uppercase"):
        validate_password("alllowercase1!")


def test_hash_and_verify_password():
    hashed = hash_password("ValidPass1!")
    assert hashed != "ValidPass1!"
    assert verify_password("ValidPass1!", hashed) is True
    assert verify_password("WrongPass1!", hashed) is False


def test_create_and_decode_access_token():
    token = create_access_token("agent-one")
    assert decode_access_token(token) == "agent-one"


def test_decode_access_token_rejects_invalid_token():
    with pytest.raises(ValueError, match="Invalid or expired"):
        decode_access_token("not-a-valid-token")


def test_decode_access_token_rejects_missing_subject():
    from jose import jwt

    from app.config import settings

    token = jwt.encode({"exp": datetime.now(UTC) + timedelta(minutes=5)}, settings.jwt_secret, algorithm=settings.jwt_algorithm)
    with pytest.raises(ValueError, match="Invalid or expired"):
        decode_access_token(token)
