from sqlalchemy import func, or_
from sqlalchemy.orm import Session

from app.models import Passenger, RequestPassenger


def create_passenger_record(
    db: Session,
    *,
    first_name: str,
    last_name: str,
    email: str,
    phone: str,
    date_of_birth,
    created_by_id: int | None,
) -> Passenger:
    passenger = Passenger(
        first_name=first_name,
        last_name=last_name,
        email=email,
        phone=phone,
        date_of_birth=date_of_birth,
        created_by_id=created_by_id,
    )
    db.add(passenger)
    db.flush()
    return passenger


def get_request_passenger_link(
    db: Session,
    request_id: int,
    passenger_id: int,
) -> RequestPassenger | None:
    return (
        db.query(RequestPassenger)
        .filter(
            RequestPassenger.travel_request_id == request_id,
            RequestPassenger.passenger_id == passenger_id,
        )
        .first()
    )


def attach_passenger_to_request(
    db: Session,
    request_id: int,
    passenger_id: int,
    *,
    is_primary: bool = False,
) -> RequestPassenger:
    if get_request_passenger_link(db, request_id, passenger_id) is not None:
        raise ValueError("This passenger is already attached to the request.")

    link = RequestPassenger(
        travel_request_id=request_id,
        passenger_id=passenger_id,
        is_primary=is_primary,
    )
    db.add(link)
    db.flush()
    return link


def search_passengers(db: Session, query: str, *, limit: int = 20) -> list[Passenger]:
    term = query.strip()
    if not term:
        return (
            db.query(Passenger)
            .order_by(Passenger.last_name.asc(), Passenger.first_name.asc(), Passenger.id.desc())
            .limit(limit)
            .all()
        )

    pattern = f"%{term}%"
    phone_digits = "".join(character for character in term if character.isdigit())
    filters = [
        Passenger.first_name.like(pattern),
        Passenger.last_name.like(pattern),
        Passenger.email.like(pattern),
        Passenger.phone.like(pattern),
        func.concat(Passenger.first_name, " ", Passenger.last_name).like(pattern),
    ]
    if phone_digits:
        filters.append(Passenger.phone.like(f"%{phone_digits}%"))

    return (
        db.query(Passenger)
        .filter(or_(*filters))
        .order_by(Passenger.last_name.asc(), Passenger.first_name.asc(), Passenger.id.desc())
        .limit(limit)
        .all()
    )
