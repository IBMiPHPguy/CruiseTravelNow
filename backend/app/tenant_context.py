from __future__ import annotations

from contextvars import ContextVar

_current_agency_id: ContextVar[str | None] = ContextVar("current_agency_id", default=None)


def get_current_agency_id() -> str | None:
    return _current_agency_id.get()


def set_current_agency_id(agency_id: str | None) -> None:
    _current_agency_id.set(agency_id)


def clear_current_agency_id() -> None:
    _current_agency_id.set(None)


def require_current_agency_id() -> str:
    agency_id = get_current_agency_id()
    if agency_id is None:
        raise RuntimeError("Tenant context is not set.")
    return agency_id
