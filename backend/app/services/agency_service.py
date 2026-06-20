from __future__ import annotations

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models import Agency, TravelRequest
from app.tenant_constants import DEFAULT_AGENCY_ID, DEFAULT_AGENCY_NAME, DEFAULT_AGENCY_SLUG


def ensure_default_agency(db: Session) -> Agency:
    agency = db.get(Agency, DEFAULT_AGENCY_ID)
    if agency is not None:
        return agency

    agency = Agency(
        id=DEFAULT_AGENCY_ID,
        name=DEFAULT_AGENCY_NAME,
        slug=DEFAULT_AGENCY_SLUG,
        is_active=True,
    )
    db.add(agency)
    db.flush()
    return agency


def assert_same_agency(*, entity_agency_id: str, expected_agency_id: str) -> None:
    if entity_agency_id != expected_agency_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not found.")


def get_travel_request_for_agency(db: Session, request_id: int, agency_id: str) -> TravelRequest:
    request = db.get(TravelRequest, request_id)
    if request is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Request not found.")
    assert_same_agency(entity_agency_id=request.agency_id, expected_agency_id=agency_id)
    return request
