from datetime import date, datetime

from sqlalchemy import JSON, Boolean, Date, DateTime, ForeignKey, Integer, Numeric, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    username: Mapped[str] = mapped_column(String(80), nullable=False, unique=True)
    email: Mapped[str] = mapped_column(String(255), nullable=False, unique=True)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), onupdate=func.now()
    )


class TravelRequest(Base):
    __tablename__ = "travel_requests"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    first_name: Mapped[str] = mapped_column(String(80), nullable=False)
    last_name: Mapped[str] = mapped_column(String(80), nullable=False)
    email: Mapped[str] = mapped_column(String(255), nullable=False)
    phone: Mapped[str] = mapped_column(String(30), nullable=False)
    state_of_residency: Mapped[str] = mapped_column(String(50), nullable=False)
    cruise_line: Mapped[str] = mapped_column(String(120), nullable=False)
    excluded_cruise_line: Mapped[str | None] = mapped_column(String(120), nullable=True)
    destination: Mapped[str] = mapped_column(String(120), nullable=False)
    destination_details: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    departure_date: Mapped[date] = mapped_column(Date, nullable=False)
    return_date: Mapped[date] = mapped_column(Date, nullable=False)
    cabin_types: Mapped[list[str]] = mapped_column(JSON, nullable=False)
    qualifiers: Mapped[list[str]] = mapped_column(JSON, nullable=False, server_default="[]")
    passengers: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    cabins_needed: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    status: Mapped[str] = mapped_column(String(40), nullable=False, default="Open")
    close_reason: Mapped[str | None] = mapped_column(String(120), nullable=True)
    created_by_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    updated_by_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), onupdate=func.now()
    )

    created_by: Mapped[User] = relationship(foreign_keys=[created_by_id])
    updated_by: Mapped[User] = relationship(foreign_keys=[updated_by_id])
    call_transcripts: Mapped[list["CallTranscript"]] = relationship(
        back_populates="travel_request",
        cascade="all, delete-orphan",
    )
    chat_logs: Mapped[list["ChatLog"]] = relationship(
        back_populates="travel_request",
        cascade="all, delete-orphan",
    )
    request_passengers: Mapped[list["RequestPassenger"]] = relationship(
        back_populates="travel_request",
        cascade="all, delete-orphan",
        order_by="RequestPassenger.id",
    )
    request_notes: Mapped[list["RequestNote"]] = relationship(
        back_populates="travel_request",
        cascade="all, delete-orphan",
        order_by="RequestNote.id.desc()",
    )
    request_audits: Mapped[list["TravelRequestAudit"]] = relationship(
        back_populates="travel_request",
        cascade="all, delete-orphan",
        order_by="TravelRequestAudit.changed_at.asc()",
    )
    passenger_audits: Mapped[list["RequestPassengerAudit"]] = relationship(
        cascade="all, delete-orphan",
        order_by="RequestPassengerAudit.changed_at.asc()",
    )
    proposed_cruises: Mapped[list["ProposedCruise"]] = relationship(
        back_populates="travel_request",
        cascade="all, delete-orphan",
        order_by="ProposedCruise.id.desc()",
    )
    quoted_insurance: Mapped[list["QuotedInsurance"]] = relationship(
        back_populates="travel_request",
        cascade="all, delete-orphan",
        order_by="QuotedInsurance.id.desc()",
    )


class RequestPassenger(Base):
    __tablename__ = "request_passengers"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    travel_request_id: Mapped[int] = mapped_column(ForeignKey("travel_requests.id"), nullable=False)
    first_name: Mapped[str] = mapped_column(String(80), nullable=False)
    last_name: Mapped[str] = mapped_column(String(80), nullable=False)
    email: Mapped[str] = mapped_column(String(255), nullable=False)
    phone: Mapped[str] = mapped_column(String(30), nullable=False)
    date_of_birth: Mapped[date | None] = mapped_column(Date, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), onupdate=func.now()
    )

    travel_request: Mapped[TravelRequest] = relationship(back_populates="request_passengers")


class TravelRequestAudit(Base):
    __tablename__ = "travel_request_audits"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    travel_request_id: Mapped[int] = mapped_column(ForeignKey("travel_requests.id"), nullable=False)
    field_name: Mapped[str] = mapped_column(String(80), nullable=False)
    from_value: Mapped[str | None] = mapped_column(Text, nullable=True)
    to_value: Mapped[str | None] = mapped_column(Text, nullable=True)
    changed_by_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    changed_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    travel_request: Mapped[TravelRequest] = relationship(back_populates="request_audits")
    changed_by: Mapped[User] = relationship(foreign_keys=[changed_by_id])


class RequestPassengerAudit(Base):
    __tablename__ = "request_passenger_audits"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    travel_request_id: Mapped[int] = mapped_column(ForeignKey("travel_requests.id"), nullable=False)
    request_passenger_id: Mapped[int | None] = mapped_column(Integer, nullable=True)
    passenger_label: Mapped[str | None] = mapped_column(String(161), nullable=True)
    field_name: Mapped[str] = mapped_column(String(80), nullable=False)
    from_value: Mapped[str | None] = mapped_column(Text, nullable=True)
    to_value: Mapped[str | None] = mapped_column(Text, nullable=True)
    changed_by_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    changed_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    travel_request: Mapped[TravelRequest] = relationship(back_populates="passenger_audits")
    changed_by: Mapped[User] = relationship(foreign_keys=[changed_by_id])


class RequestNote(Base):
    __tablename__ = "request_notes"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    travel_request_id: Mapped[int] = mapped_column(ForeignKey("travel_requests.id"), nullable=False)
    summary: Mapped[str] = mapped_column(String(160), nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    created_by_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    updated_by_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), onupdate=func.now()
    )

    travel_request: Mapped[TravelRequest] = relationship(back_populates="request_notes")
    created_by: Mapped[User] = relationship(foreign_keys=[created_by_id])
    updated_by: Mapped[User] = relationship(foreign_keys=[updated_by_id])
    audits: Mapped[list["RequestNoteAudit"]] = relationship(
        back_populates="request_note",
        cascade="all, delete-orphan",
        order_by="RequestNoteAudit.changed_at.asc()",
    )


class RequestNoteAudit(Base):
    __tablename__ = "request_note_audits"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    request_note_id: Mapped[int] = mapped_column(ForeignKey("request_notes.id"), nullable=False)
    from_summary: Mapped[str | None] = mapped_column(String(160), nullable=True)
    to_summary: Mapped[str | None] = mapped_column(String(160), nullable=True)
    from_content: Mapped[str | None] = mapped_column(Text, nullable=True)
    to_content: Mapped[str | None] = mapped_column(Text, nullable=True)
    changed_by_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    changed_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    request_note: Mapped[RequestNote] = relationship(back_populates="audits")
    changed_by: Mapped[User] = relationship(foreign_keys=[changed_by_id])


class CallTranscript(Base):
    __tablename__ = "call_transcripts"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    travel_request_id: Mapped[int] = mapped_column(ForeignKey("travel_requests.id"), nullable=False)
    original_filename: Mapped[str] = mapped_column(String(255), nullable=False)
    stored_path: Mapped[str] = mapped_column(String(500), nullable=False)
    mime_type: Mapped[str] = mapped_column(String(120), nullable=False)
    size_bytes: Mapped[int] = mapped_column(Integer, nullable=False)
    created_by_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    travel_request: Mapped[TravelRequest] = relationship(back_populates="call_transcripts")
    created_by: Mapped[User] = relationship(foreign_keys=[created_by_id])


class ChatLog(Base):
    __tablename__ = "chat_logs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    travel_request_id: Mapped[int] = mapped_column(ForeignKey("travel_requests.id"), nullable=False)
    original_filename: Mapped[str] = mapped_column(String(255), nullable=False)
    stored_path: Mapped[str] = mapped_column(String(500), nullable=False)
    mime_type: Mapped[str] = mapped_column(String(120), nullable=False)
    size_bytes: Mapped[int] = mapped_column(Integer, nullable=False)
    created_by_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    travel_request: Mapped[TravelRequest] = relationship(back_populates="chat_logs")
    created_by: Mapped[User] = relationship(foreign_keys=[created_by_id])


def default_proposed_cruise_includes() -> dict:
    return {
        "drink_package": {"included": False, "name": None},
        "wifi": {"included": False, "name": None},
        "tips": False,
        "excursion": False,
        "excursion_credit": {"included": False, "amount": None},
        "onboard_credit": {"included": False, "amount": None},
    }


class ProposedCruise(Base):
    __tablename__ = "proposed_cruises"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    travel_request_id: Mapped[int] = mapped_column(ForeignKey("travel_requests.id"), nullable=False)
    departure_date: Mapped[date] = mapped_column(Date, nullable=False)
    cruise_line: Mapped[str] = mapped_column(String(120), nullable=False)
    ship: Mapped[str] = mapped_column(String(120), nullable=False)
    number_of_nights: Mapped[int] = mapped_column(Integer, nullable=False)
    itinerary_name: Mapped[str] = mapped_column(String(160), nullable=False)
    room_category: Mapped[str] = mapped_column(String(120), nullable=False)
    room_number: Mapped[str] = mapped_column(String(40), nullable=False)
    passengers_in_room: Mapped[int] = mapped_column(Integer, nullable=False)
    deposit_amount: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)
    deposit_due_date: Mapped[date] = mapped_column(Date, nullable=False)
    final_payment_due_date: Mapped[date] = mapped_column(Date, nullable=False)
    cost: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)
    includes: Mapped[dict] = mapped_column(JSON, nullable=False, default=default_proposed_cruise_includes)
    status: Mapped[str] = mapped_column(String(40), nullable=False, default="Proposed")
    created_by_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    updated_by_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), onupdate=func.now()
    )

    travel_request: Mapped[TravelRequest] = relationship(back_populates="proposed_cruises")
    created_by: Mapped[User] = relationship(foreign_keys=[created_by_id])
    updated_by: Mapped[User] = relationship(foreign_keys=[updated_by_id])
    passenger_links: Mapped[list["ProposedCruisePassenger"]] = relationship(
        back_populates="proposed_cruise",
        cascade="all, delete-orphan",
    )


class ProposedCruisePassenger(Base):
    __tablename__ = "proposed_cruise_passengers"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    proposed_cruise_id: Mapped[int] = mapped_column(ForeignKey("proposed_cruises.id"), nullable=False)
    request_passenger_id: Mapped[int] = mapped_column(
        ForeignKey("request_passengers.id"), nullable=False
    )

    proposed_cruise: Mapped[ProposedCruise] = relationship(back_populates="passenger_links")
    request_passenger: Mapped[RequestPassenger] = relationship()


class QuotedInsurance(Base):
    __tablename__ = "quoted_insurance"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    travel_request_id: Mapped[int] = mapped_column(ForeignKey("travel_requests.id"), nullable=False)
    carrier: Mapped[str] = mapped_column(String(120), nullable=False)
    premium_cost: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)
    plan_name: Mapped[str] = mapped_column(String(160), nullable=False)
    cancellation_coverage: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)
    medical_coverage: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)
    medical_evac_coverage: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)
    status: Mapped[str] = mapped_column(String(40), nullable=False, default="Proposed")
    declined_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    created_by_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    updated_by_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), onupdate=func.now()
    )

    travel_request: Mapped[TravelRequest] = relationship(back_populates="quoted_insurance")
    created_by: Mapped[User] = relationship(foreign_keys=[created_by_id])
    updated_by: Mapped[User] = relationship(foreign_keys=[updated_by_id])
