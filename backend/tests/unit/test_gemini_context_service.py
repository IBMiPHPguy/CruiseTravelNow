from datetime import date
from decimal import Decimal
from types import SimpleNamespace

import pytest
from fastapi import HTTPException

from app.constants import PROPOSED_CRUISE_STATUS_PROPOSED
from app.services.gemini_context_service import (
    build_request_context_for_gemini,
    proposed_cruise_label,
    proposed_cruise_to_gemini_dict,
    validate_proposed_cruises_for_proposal_email,
)


def test_build_request_context_for_gemini_aggregates_passengers_and_qualifiers():
    request = SimpleNamespace(
        id=7,
        first_name="Jane",
        last_name="Cruiser",
        email="jane@example.com",
        cruise_lines=["Royal Caribbean International"],
        excluded_cruise_lines=[],
        destination="Caribbean",
        destination_details={"caribbean_regions": ["Eastern"]},
        departure_date=date(2026, 6, 1),
        return_date=date(2026, 6, 8),
        cabin_types=["Balcony"],
        passengers=2,
        cabins_needed=1,
        request_passengers=[
            SimpleNamespace(
                id=2,
                first_name="Bob",
                last_name="Guest",
                email="bob@example.com",
                phone="5550000002",
                qualifiers=["Senior"],
                is_primary=False,
            ),
            SimpleNamespace(
                id=1,
                first_name="Jane",
                last_name="Cruiser",
                email="jane@example.com",
                phone="5551234567",
                qualifiers=["Military"],
                is_primary=True,
            ),
        ],
    )

    context = build_request_context_for_gemini(request)

    assert context["request_id"] == 7
    assert context["client_name"] == "Jane Cruiser"
    assert context["qualifiers"] == ["Military", "Senior"]
    assert context["passenger_details"][0]["name"] == "Jane Cruiser"
    assert context["passenger_details"][0]["is_primary"] is True


def test_validate_proposed_cruises_for_proposal_email_rejects_invalid_options():
    cruise = SimpleNamespace(
        status=PROPOSED_CRUISE_STATUS_PROPOSED,
        cruise_line="Royal Caribbean",
        ship="Wonder",
        departure_date=date(2026, 7, 1),
        cost=Decimal("0"),
        deposit_amount=Decimal("0"),
    )

    with pytest.raises(HTTPException) as exc:
        validate_proposed_cruises_for_proposal_email([cruise])

    assert exc.value.status_code == 400
    assert "cost must be greater" in exc.value.detail


def test_validate_proposed_cruises_for_proposal_email_requires_proposed_status():
    with pytest.raises(HTTPException) as exc:
        validate_proposed_cruises_for_proposal_email([])

    assert "No proposed cruises" in exc.value.detail


def test_validate_proposed_cruises_for_proposal_email_returns_proposed_only():
    valid = SimpleNamespace(
        status=PROPOSED_CRUISE_STATUS_PROPOSED,
        cruise_line="Royal Caribbean",
        ship="Wonder",
        departure_date=date(2026, 7, 1),
        cost=Decimal("1000"),
        deposit_amount=Decimal("100"),
    )
    rejected = SimpleNamespace(status="Rejected")

    assert validate_proposed_cruises_for_proposal_email([valid, rejected]) == [valid]


def test_proposed_cruise_label_and_gemini_dict():
    cruise = SimpleNamespace(
        departure_date=date(2026, 7, 10),
        cruise_line="Princess",
        ship="Discovery",
        number_of_nights=7,
        itinerary_name="Alaska",
        itinerary_details="Day 1",
        room_category="Balcony",
        room_number="1234",
        passengers_in_room=2,
        deposit_amount=Decimal("250.00"),
        deposit_due_date=date(2026, 5, 1),
        final_payment_due_date=date(2026, 6, 1),
        cost=Decimal("4200.00"),
        includes={"tips": True},
    )

    assert "Princess" in proposed_cruise_label(cruise)
    payload = proposed_cruise_to_gemini_dict(cruise, 1)
    assert payload["option_number"] == 1
    assert payload["cost"] == "4200.00"
    assert payload["includes"] == {"tips": True}
