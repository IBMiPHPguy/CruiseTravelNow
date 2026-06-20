from __future__ import annotations

from datetime import date

from sqlalchemy.orm import Session

from app.models import Passenger
from app.services.client_import_parse_service import read_client_import_sheet

IMPORTABLE_FIELDS = {
    "first_name",
    "last_name",
    "email",
    "phone",
    "date_of_birth",
    "address_line_1",
    "address_line_2",
    "city",
    "state_or_province",
    "postal_code",
    "country",
    "qualifiers",
    "is_active",
}


def _required_import_fields() -> list[str]:
    return [field_name for field_name, required_label, _ in _client_import_columns() if required_label == "Required"]


def _client_import_columns():
    from app.services.client_import_template_service import CLIENT_IMPORT_COLUMNS

    return CLIENT_IMPORT_COLUMNS


def validate_client_import_mapping(mapping: dict[str, str | None]) -> None:
    missing = [field for field in _required_import_fields() if not mapping.get(field)]
    if missing:
        labels = ", ".join(field.replace("_", " ") for field in missing)
        raise ValueError(f"Map required fields before importing: {labels}.")


def _parse_date(value: str) -> date | None:
    cleaned = value.strip()
    if not cleaned:
        return None
    try:
        return date.fromisoformat(cleaned)
    except ValueError as exc:
        raise ValueError(f"Use YYYY-MM-DD for dates (received {value!r}).") from exc


def _parse_is_active(value: str) -> bool:
    cleaned = value.strip().lower()
    if not cleaned:
        return True
    if cleaned in {"yes", "y", "true", "1", "active"}:
        return True
    if cleaned in {"no", "n", "false", "0", "inactive"}:
        return False
    raise ValueError(f"Use Yes or No for is_active (received {value!r}).")


def _normalize_optional_text(value: str) -> str | None:
    cleaned = value.strip()
    return cleaned or None


def _build_column_indexes(headers: list[str], mapping: dict[str, str | None]) -> dict[str, int]:
    indexes: dict[str, int] = {}
    for field_name, source_column in mapping.items():
        if field_name not in IMPORTABLE_FIELDS or not source_column:
            continue
        try:
            indexes[field_name] = headers.index(source_column)
        except ValueError as exc:
            raise ValueError(f"Spreadsheet column {source_column!r} was not found.") from exc
    return indexes


def _extract_row_values(row: list[str], column_indexes: dict[str, int]) -> dict[str, str]:
    values: dict[str, str] = {}
    for field_name, column_index in column_indexes.items():
        values[field_name] = row[column_index] if column_index < len(row) else ""
    return values


def _build_record_label(row_values: dict[str, str], row_number: int) -> str:
    first_name = row_values.get("first_name", "").strip()
    last_name = row_values.get("last_name", "").strip()
    if first_name or last_name:
        return " ".join(part for part in (first_name, last_name) if part)
    email = row_values.get("email", "").strip()
    if email:
        return email
    phone = row_values.get("phone", "").strip()
    if phone:
        return phone
    return f"Row {row_number}"


def _append_row_error(
    errors: list[dict[str, object]],
    *,
    row_number: int,
    row_values: dict[str, str],
    message: str,
) -> None:
    errors.append(
        {
            "row_number": row_number,
            "record_label": _build_record_label(row_values, row_number),
            "message": message,
        }
    )


def _parse_qualifiers(value: str) -> list[str]:
    from app.schemas import validate_qualifier_values

    cleaned = value.strip()
    if not cleaned:
        return []
    parts = [part.strip() for part in cleaned.split("|") if part.strip()]
    return validate_qualifier_values(parts)


def _build_passenger_from_row(
    row_values: dict[str, str],
    *,
    created_by_id: int | None,
) -> Passenger:
    first_name = _normalize_optional_text(row_values.get("first_name", ""))
    last_name = _normalize_optional_text(row_values.get("last_name", ""))
    if not first_name or not last_name:
        raise ValueError("first_name and last_name are required.")

    email = _normalize_optional_text(row_values.get("email", ""))
    phone = _normalize_optional_text(row_values.get("phone", ""))
    date_of_birth = _parse_date(row_values.get("date_of_birth", ""))
    is_active = _parse_is_active(row_values.get("is_active", ""))
    qualifiers = _parse_qualifiers(row_values.get("qualifiers", ""))

    return Passenger(
        first_name=first_name,
        last_name=last_name,
        email=email,
        phone=phone,
        date_of_birth=date_of_birth,
        address_line_1=_normalize_optional_text(row_values.get("address_line_1", "")),
        address_line_2=_normalize_optional_text(row_values.get("address_line_2", "")),
        city=_normalize_optional_text(row_values.get("city", "")),
        state_or_province=_normalize_optional_text(row_values.get("state_or_province", "")),
        postal_code=_normalize_optional_text(row_values.get("postal_code", "")),
        country=_normalize_optional_text(row_values.get("country", "")),
        qualifiers=qualifiers,
        is_active=is_active,
        created_by_id=created_by_id,
    )


def execute_client_import(
    db: Session,
    *,
    content: bytes,
    filename: str,
    mapping: dict[str, str | None],
    created_by_id: int | None,
) -> dict[str, object]:
    validate_client_import_mapping(mapping)
    _, headers, rows = read_client_import_sheet(content, filename)
    column_indexes = _build_column_indexes(headers, mapping)

    imported_count = 0
    skipped_count = 0
    errors: list[dict[str, object]] = []

    for spreadsheet_row_number, row in enumerate(rows, start=2):
        row_values = _extract_row_values(row, column_indexes)
        if not any(value.strip() for value in row_values.values()):
            skipped_count += 1
            continue

        try:
            passenger = _build_passenger_from_row(row_values, created_by_id=created_by_id)
        except ValueError as exc:
            _append_row_error(
                errors,
                row_number=spreadsheet_row_number,
                row_values=row_values,
                message=str(exc),
            )
            continue

        db.add(passenger)
        imported_count += 1

    if imported_count:
        db.commit()
    elif not errors:
        raise ValueError("The uploaded file has no client rows to import.")

    return {
        "imported_count": imported_count,
        "skipped_count": skipped_count,
        "errors": errors,
    }
