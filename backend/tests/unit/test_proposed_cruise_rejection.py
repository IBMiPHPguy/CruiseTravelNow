import pytest
from fastapi import HTTPException

from app.constants import (
    PROPOSED_CRUISE_REJECTION_REASON_OTHER,
    PROPOSED_CRUISE_REJECTION_REASON_PRICE,
    PROPOSED_CRUISE_STATUS_ACCEPTED,
    PROPOSED_CRUISE_STATUS_REJECTED,
)
from app.proposed_cruise_helpers import validate_proposed_cruise_rejection


def test_validate_proposed_cruise_rejection_clears_fields_for_non_rejected_status():
    reason, detail = validate_proposed_cruise_rejection(
        status=PROPOSED_CRUISE_STATUS_ACCEPTED,
        rejection_reason=PROPOSED_CRUISE_REJECTION_REASON_PRICE,
        rejection_reason_detail=None,
        require_reason=True,
    )
    assert reason is None
    assert detail is None


def test_validate_proposed_cruise_rejection_requires_reason_when_requested():
    with pytest.raises(HTTPException) as exc_info:
        validate_proposed_cruise_rejection(
            status=PROPOSED_CRUISE_STATUS_REJECTED,
            rejection_reason=None,
            rejection_reason_detail=None,
            require_reason=True,
        )
    assert exc_info.value.status_code == 400


def test_validate_proposed_cruise_rejection_requires_detail_for_other():
    with pytest.raises(HTTPException) as exc_info:
        validate_proposed_cruise_rejection(
            status=PROPOSED_CRUISE_STATUS_REJECTED,
            rejection_reason=PROPOSED_CRUISE_REJECTION_REASON_OTHER,
            rejection_reason_detail="   ",
            require_reason=True,
        )
    assert exc_info.value.status_code == 400


def test_validate_proposed_cruise_rejection_accepts_other_with_detail():
    reason, detail = validate_proposed_cruise_rejection(
        status=PROPOSED_CRUISE_STATUS_REJECTED,
        rejection_reason=PROPOSED_CRUISE_REJECTION_REASON_OTHER,
        rejection_reason_detail=" Client wanted a balcony guarantee.",
        require_reason=True,
    )
    assert reason == PROPOSED_CRUISE_REJECTION_REASON_OTHER
    assert detail == "Client wanted a balcony guarantee."
