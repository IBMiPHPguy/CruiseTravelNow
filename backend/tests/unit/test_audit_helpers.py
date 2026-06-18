from datetime import date, datetime, timezone
from types import SimpleNamespace

from app.audit_helpers import (
    PASSENGER_AUDIT_FIELDS,
    TRAVEL_REQUEST_AUDIT_FIELDS,
    apply_updates,
    collect_field_changes,
    passenger_name_label,
    record_passenger_deletion,
    record_passenger_field_changes,
    record_travel_request_field_changes,
    serialize_audit_value,
    values_differ,
)
from app.models import RequestPassengerAudit, TravelRequest, TravelRequestAudit, User
from app.security import hash_password


def test_serialize_audit_value_handles_common_types():
    assert serialize_audit_value(None) is None
    assert serialize_audit_value(date(2026, 6, 1)) == "2026-06-01"
    assert serialize_audit_value(datetime(2026, 6, 1, 12, 0, tzinfo=timezone.utc)).startswith("2026-06-01")
    assert serialize_audit_value(["a", "b"]) == '["a", "b"]'
    assert serialize_audit_value({"region": "Eastern"}) == '{"region": "Eastern"}'
    assert serialize_audit_value(42) == "42"


def test_values_differ_compares_serialized_values():
    assert values_differ(["a"], ["a"]) is False
    assert values_differ(["a"], ["b"]) is True
    assert values_differ(None, "") is True


def test_collect_field_changes_and_apply_updates():
    entity = SimpleNamespace(
        first_name="Jane",
        last_name="Cruiser",
        email="jane@example.com",
        phone=None,
    )
    updates = {"first_name": "Janet", "phone": "5551234567"}

    changes = collect_field_changes(entity, updates, TRAVEL_REQUEST_AUDIT_FIELDS)

    assert changes == {
        "first_name": ("Jane", "Janet"),
        "phone": (None, "5551234567"),
    }
    apply_updates(entity, updates)
    assert entity.first_name == "Janet"
    assert entity.phone == "5551234567"


def test_passenger_name_label():
    passenger = SimpleNamespace(first_name="Jane", last_name="Cruiser")
    assert passenger_name_label(passenger) == "Jane Cruiser"


def test_record_travel_request_field_changes_skips_unchanged_values(db):
    user = User(
        username="audit-skip",
        email="skip@example.com",
        password_hash=hash_password("AuditPass1!"),
    )
    request = TravelRequest(
        first_name="Jane",
        last_name="Cruiser",
        email="jane@example.com",
        phone="5551234567",
        cruise_lines=["Royal Caribbean International"],
        destination="Caribbean",
        destination_details={"caribbean_regions": ["Eastern"]},
        departure_date=date(2026, 6, 1),
        return_date=date(2026, 6, 8),
        cabin_types=["Balcony"],
        passengers=2,
        cabins_needed=1,
        status="Open",
        created_by=user,
        updated_by=user,
    )
    db.add_all([user, request])
    db.flush()

    record_travel_request_field_changes(db, request, {"first_name": ("Jane", "Jane")}, user)
    db.commit()

    assert db.query(TravelRequestAudit).filter(TravelRequestAudit.travel_request_id == request.id).count() == 0


def test_record_travel_request_field_changes(db):
    user = User(
        username="audit-user",
        email="audit@example.com",
        password_hash=hash_password("AuditPass1!"),
    )
    request = TravelRequest(
        first_name="Jane",
        last_name="Cruiser",
        email="jane@example.com",
        phone="5551234567",
        cruise_lines=["Royal Caribbean International"],
        destination="Caribbean",
        destination_details={"caribbean_regions": ["Eastern"]},
        departure_date=date(2026, 6, 1),
        return_date=date(2026, 6, 8),
        cabin_types=["Balcony"],
        passengers=2,
        cabins_needed=1,
        status="Open",
        created_by=user,
        updated_by=user,
    )
    db.add_all([user, request])
    db.flush()

    record_travel_request_field_changes(
        db,
        request,
        {"first_name": ("Jane", "Janet")},
        user,
    )
    db.commit()

    audit = db.query(TravelRequestAudit).filter(TravelRequestAudit.travel_request_id == request.id).one()
    assert audit.field_name == "first_name"
    assert audit.from_value == "Jane"
    assert audit.to_value == "Janet"


def test_record_passenger_field_changes_and_deletion(db):
    user = User(
        username="passenger-audit",
        email="passenger@example.com",
        password_hash=hash_password("AuditPass1!"),
    )
    request = TravelRequest(
        first_name="Jane",
        last_name="Cruiser",
        email="jane@example.com",
        phone="5551234567",
        cruise_lines=["Royal Caribbean International"],
        destination="Caribbean",
        destination_details={"caribbean_regions": ["Eastern"]},
        departure_date=date(2026, 6, 1),
        return_date=date(2026, 6, 8),
        cabin_types=["Balcony"],
        passengers=2,
        cabins_needed=1,
        status="Open",
        created_by=user,
        updated_by=user,
    )
    db.add_all([user, request])
    db.flush()

    from app.passenger_helpers import attach_passenger_to_request, create_passenger_record

    passenger = create_passenger_record(
        db,
        first_name="Jane",
        last_name="Cruiser",
        email="jane@example.com",
        phone="5551234567",
        date_of_birth=None,
        created_by_id=user.id,
    )
    link = attach_passenger_to_request(
        db,
        request.id,
        passenger.id,
        is_primary=True,
        qualifiers=["Military"],
    )
    db.flush()

    record_passenger_field_changes(db, link, {"qualifiers": (["Military"], ["Military"])}, user)
    record_passenger_field_changes(
        db,
        link,
        {"qualifiers": (["Military"], ["Senior"])},
        user,
    )
    record_passenger_deletion(db, link, user)
    db.commit()

    audits = (
        db.query(RequestPassengerAudit)
        .filter(RequestPassengerAudit.request_passenger_id == link.id)
        .order_by(RequestPassengerAudit.id.asc())
        .all()
    )
    assert audits[0].field_name == "qualifiers"
    assert '"Senior"' in (audits[0].to_value or "")
    assert any(audit.field_name == "passenger_removed" for audit in audits)
    assert any(audit.field_name in PASSENGER_AUDIT_FIELDS for audit in audits)
