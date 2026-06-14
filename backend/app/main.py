from datetime import UTC, datetime, timedelta

from fastapi import Depends, FastAPI, File, HTTPException, UploadFile, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import PlainTextResponse
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy import text
from sqlalchemy.orm import Session, joinedload

from app.attachment_storage import migrate_legacy_attachment_content, read_attachment_text, store_upload_file
from app.audit_helpers import (
    PASSENGER_AUDIT_FIELDS,
    TRAVEL_REQUEST_AUDIT_FIELDS,
    apply_updates,
    collect_field_changes,
    record_passenger_deletion,
    record_passenger_field_changes,
    record_travel_request_field_changes,
)
from app.config import settings
from app.constants import (
    PROPOSED_CRUISE_STATUS_PROPOSED,
    QUOTED_INSURANCE_STATUS_DECLINED,
    QUOTED_INSURANCE_STATUS_PROPOSED,
    REQUEST_STATUS_CLOSED,
    REQUEST_STATUS_OPEN,
    STALE_DAYS,
)
from app.database import Base, engine, get_db
from app.deps import get_current_user
from app.models import (
    CallTranscript,
    ChatLog,
    ProposedCruise,
    ProposedCruisePassenger,
    QuotedInsurance,
    RequestNote,
    RequestNoteAudit,
    RequestPassenger,
    RequestPassengerAudit,
    TravelRequest,
    TravelRequestAudit,
    User,
)
from app.schemas import (
    AttachmentRead,
    DashboardOpenRequest,
    DashboardResponse,
    ProposedCruiseCreate,
    ProposedCruiseRead,
    ProposedCruiseUpdate,
    QuotedInsuranceCreate,
    QuotedInsuranceRead,
    QuotedInsuranceUpdate,
    RequestNoteCreate,
    RequestNoteRead,
    RequestNoteUpdate,
    RequestPassengerCreate,
    RequestPassengerRead,
    RequestPassengerUpdate,
    TokenResponse,
    TravelRequestCreate,
    TravelRequestDetailRead,
    TravelRequestRead,
    TravelRequestUpdate,
    UserCreate,
    UserRead,
)
from app.security import create_access_token, hash_password, verify_password

app = FastAPI(
    title="CruiseTravelNow API",
    description="Workflow API for new cruise travel requests.",
    version="0.3.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def seed_admin_user(db: Session) -> None:
    if not settings.seed_admin_username or not settings.seed_admin_password:
        return

    email = settings.seed_admin_email or f"{settings.seed_admin_username}@example.com"
    existing = db.query(User).filter(User.username == settings.seed_admin_username).first()
    if existing:
        if existing.email != email:
            existing.email = email
            db.commit()
        return

    user = User(
        username=settings.seed_admin_username,
        email=email,
        password_hash=hash_password(settings.seed_admin_password),
    )
    db.add(user)
    db.commit()


@app.on_event("startup")
def on_startup() -> None:
    Base.metadata.create_all(bind=engine)
    db = next(get_db())
    try:
        seed_admin_user(db)
        migrate_legacy_attachment_content(db, settings.attachments_dir)
    finally:
        db.close()


def is_stale(updated_at: datetime) -> bool:
    threshold = datetime.now(UTC) - timedelta(days=STALE_DAYS)
    if updated_at.tzinfo is None:
        return updated_at.replace(tzinfo=UTC) < threshold
    return updated_at < threshold


def _request_query(db: Session):
    return db.query(TravelRequest).options(
        joinedload(TravelRequest.created_by),
        joinedload(TravelRequest.updated_by),
    )


def _detail_query(db: Session):
    return db.query(TravelRequest).options(
        joinedload(TravelRequest.created_by),
        joinedload(TravelRequest.updated_by),
        joinedload(TravelRequest.request_passengers),
        joinedload(TravelRequest.request_notes).options(
            joinedload(RequestNote.created_by),
            joinedload(RequestNote.updated_by),
            joinedload(RequestNote.audits).joinedload(RequestNoteAudit.changed_by),
        ),
        joinedload(TravelRequest.request_audits).joinedload(TravelRequestAudit.changed_by),
        joinedload(TravelRequest.passenger_audits).joinedload(RequestPassengerAudit.changed_by),
        joinedload(TravelRequest.proposed_cruises).options(
            joinedload(ProposedCruise.created_by),
            joinedload(ProposedCruise.updated_by),
            joinedload(ProposedCruise.passenger_links).joinedload(ProposedCruisePassenger.request_passenger),
        ),
        joinedload(TravelRequest.quoted_insurance).options(
            joinedload(QuotedInsurance.created_by),
            joinedload(QuotedInsurance.updated_by),
        ),
        joinedload(TravelRequest.call_transcripts).joinedload(CallTranscript.created_by),
        joinedload(TravelRequest.chat_logs).joinedload(ChatLog.created_by),
    )


def _load_note(db: Session, note_id: int) -> RequestNote:
    return (
        db.query(RequestNote)
        .options(
            joinedload(RequestNote.created_by),
            joinedload(RequestNote.updated_by),
            joinedload(RequestNote.audits).joinedload(RequestNoteAudit.changed_by),
        )
        .filter(RequestNote.id == note_id)
        .one()
    )


def _record_note_audit(
    db: Session,
    note: RequestNote,
    current_user: User,
    *,
    from_summary: str | None = None,
    to_summary: str | None = None,
    from_content: str | None = None,
    to_content: str | None = None,
) -> None:
    db.add(
        RequestNoteAudit(
            request_note_id=note.id,
            from_summary=from_summary,
            to_summary=to_summary,
            from_content=from_content,
            to_content=to_content,
            changed_by_id=current_user.id,
        )
    )


def _get_primary_passenger(db: Session, request_id: int) -> RequestPassenger | None:
    return (
        db.query(RequestPassenger)
        .filter(RequestPassenger.travel_request_id == request_id)
        .order_by(RequestPassenger.id.asc())
        .first()
    )


def _sync_primary_passenger_from_request(
    request: TravelRequest,
    db: Session,
    current_user: User,
) -> None:
    primary = _get_primary_passenger(db, request.id)
    if primary is None:
        return
    sync_updates = {
        "first_name": request.first_name,
        "last_name": request.last_name,
        "email": request.email,
        "phone": request.phone,
    }
    passenger_changes = collect_field_changes(primary, sync_updates, PASSENGER_AUDIT_FIELDS)
    record_passenger_field_changes(db, primary, passenger_changes, current_user)
    apply_updates(primary, sync_updates)


def _sync_request_from_primary_passenger(
    db: Session,
    request: TravelRequest,
    passenger: RequestPassenger,
    current_user: User,
) -> None:
    primary = _get_primary_passenger(db, request.id)
    if primary is None or primary.id != passenger.id:
        return
    sync_updates = {
        "first_name": passenger.first_name,
        "last_name": passenger.last_name,
        "email": passenger.email,
        "phone": passenger.phone,
    }
    request_changes = collect_field_changes(request, sync_updates, TRAVEL_REQUEST_AUDIT_FIELDS)
    record_travel_request_field_changes(db, request, request_changes, current_user)
    apply_updates(request, sync_updates)


def _get_open_request(db: Session, request_id: int) -> TravelRequest:
    request = db.get(TravelRequest, request_id)
    if request is None:
        raise HTTPException(status_code=404, detail="Travel request not found.")
    if request.status == REQUEST_STATUS_CLOSED:
        raise HTTPException(status_code=400, detail="Closed requests cannot be updated.")
    return request


def _touch_request(request: TravelRequest, current_user: User) -> None:
    request.updated_by_id = current_user.id


def _load_proposed_cruise(db: Session, cruise_id: int) -> ProposedCruise:
    return (
        db.query(ProposedCruise)
        .options(
            joinedload(ProposedCruise.created_by),
            joinedload(ProposedCruise.updated_by),
            joinedload(ProposedCruise.passenger_links).joinedload(ProposedCruisePassenger.request_passenger),
        )
        .filter(ProposedCruise.id == cruise_id)
        .one()
    )


def _proposed_cruise_to_read(cruise: ProposedCruise) -> ProposedCruiseRead:
    base = ProposedCruiseRead.model_validate(cruise)
    return base.model_copy(
        update={
            "passengers": [link.request_passenger for link in cruise.passenger_links],
        }
    )


def _validate_proposed_cruise_passengers(
    db: Session,
    request_id: int,
    passenger_ids: list[int],
) -> None:
    if not passenger_ids:
        return
    valid_ids = {
        passenger.id
        for passenger in db.query(RequestPassenger)
        .filter(RequestPassenger.travel_request_id == request_id)
        .all()
    }
    invalid = [passenger_id for passenger_id in passenger_ids if passenger_id not in valid_ids]
    if invalid:
        raise HTTPException(status_code=400, detail="One or more selected passengers are invalid.")


def _sync_proposed_cruise_passengers(
    db: Session,
    cruise: ProposedCruise,
    passenger_ids: list[int],
    request_id: int,
) -> None:
    _validate_proposed_cruise_passengers(db, request_id, passenger_ids)
    cruise.passenger_links.clear()
    for passenger_id in passenger_ids:
        cruise.passenger_links.append(
            ProposedCruisePassenger(
                request_passenger_id=passenger_id,
            )
        )


def _request_detail_to_read(request: TravelRequest) -> TravelRequestDetailRead:
    detail = TravelRequestDetailRead.model_validate(request)
    return detail.model_copy(
        update={
            "proposed_cruises": [_proposed_cruise_to_read(cruise) for cruise in request.proposed_cruises],
        }
    )


@app.get("/api/health")
def health(db: Session = Depends(get_db)) -> dict[str, str]:
    db.execute(text("SELECT 1"))
    return {"status": "ok", "service": "cruisetravelnow-api"}


@app.post("/api/auth/register", response_model=UserRead, status_code=201)
def register_user(payload: UserCreate, db: Session = Depends(get_db)) -> User:
    if db.query(User).filter(User.username == payload.username).first():
        raise HTTPException(status_code=400, detail="Username is already taken.")
    if db.query(User).filter(User.email == payload.email).first():
        raise HTTPException(status_code=400, detail="Email is already registered.")

    try:
        password_hash = hash_password(payload.password)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    user = User(
        username=payload.username,
        email=payload.email,
        password_hash=password_hash,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@app.post("/api/auth/login", response_model=TokenResponse)
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)) -> TokenResponse:
    user = db.query(User).filter(User.username == form_data.username, User.is_active.is_(True)).first()
    if user is None or not verify_password(form_data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token = create_access_token(user.username)
    return TokenResponse(access_token=token, user=UserRead.model_validate(user))


@app.get("/api/auth/me", response_model=UserRead)
def read_current_user(current_user: User = Depends(get_current_user)) -> User:
    return current_user


@app.get("/api/dashboard", response_model=DashboardResponse)
def get_dashboard(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> DashboardResponse:
    open_requests = (
        _request_query(db)
        .filter(TravelRequest.status == REQUEST_STATUS_OPEN)
        .order_by(TravelRequest.updated_at.asc())
        .all()
    )

    dashboard_items: list[DashboardOpenRequest] = []
    stale_count = 0
    for request in open_requests:
        stale = is_stale(request.updated_at)
        if stale:
            stale_count += 1
        base = TravelRequestRead.model_validate(request)
        dashboard_items.append(DashboardOpenRequest(**base.model_dump(), is_stale=stale))

    return DashboardResponse(
        open_count=len(dashboard_items),
        stale_count=stale_count,
        open_requests=dashboard_items,
    )


@app.get("/api/requests", response_model=list[TravelRequestRead])
def list_requests(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[TravelRequest]:
    return _request_query(db).order_by(TravelRequest.created_at.desc()).all()


@app.post("/api/requests", response_model=TravelRequestRead, status_code=201)
def create_request(
    payload: TravelRequestCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> TravelRequest:
    if payload.return_date <= payload.departure_date:
        raise HTTPException(status_code=400, detail="Return date must be after departure date.")

    data = payload.model_dump(exclude={"first_passenger_date_of_birth"})
    if payload.destination_details:
        data["destination_details"] = payload.destination_details.model_dump(exclude_none=True)
    else:
        data["destination_details"] = None

    request = TravelRequest(
        **data,
        status=REQUEST_STATUS_OPEN,
        created_by_id=current_user.id,
        updated_by_id=current_user.id,
    )
    db.add(request)
    db.flush()
    db.add(
        RequestPassenger(
            travel_request_id=request.id,
            first_name=payload.first_name,
            last_name=payload.last_name,
            email=payload.email,
            phone=payload.phone,
            date_of_birth=payload.first_passenger_date_of_birth,
        )
    )
    db.commit()
    request = _request_query(db).filter(TravelRequest.id == request.id).one()
    return request


@app.get("/api/requests/{request_id}", response_model=TravelRequestDetailRead)
def get_request(
    request_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> TravelRequestDetailRead:
    request = _detail_query(db).filter(TravelRequest.id == request_id).first()
    if request is None:
        raise HTTPException(status_code=404, detail="Travel request not found.")
    return _request_detail_to_read(request)


@app.patch("/api/requests/{request_id}", response_model=TravelRequestDetailRead)
def update_request(
    request_id: int,
    payload: TravelRequestUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> TravelRequestDetailRead:
    request = db.get(TravelRequest, request_id)
    if request is None:
        raise HTTPException(status_code=404, detail="Travel request not found.")
    if request.status == REQUEST_STATUS_CLOSED:
        raise HTTPException(status_code=400, detail="Closed requests cannot be edited.")

    updates = payload.model_dump(exclude_unset=True)
    departure = updates.get("departure_date", request.departure_date)
    returning = updates.get("return_date", request.return_date)
    if returning <= departure:
        raise HTTPException(status_code=400, detail="Return date must be after departure date.")

    request_changes = collect_field_changes(request, updates, TRAVEL_REQUEST_AUDIT_FIELDS)
    record_travel_request_field_changes(db, request, request_changes, current_user)
    apply_updates(request, updates)

    _sync_primary_passenger_from_request(request, db, current_user)
    _touch_request(request, current_user)
    db.commit()
    request = _detail_query(db).filter(TravelRequest.id == request_id).one()
    return _request_detail_to_read(request)


@app.post("/api/requests/{request_id}/transcripts", response_model=AttachmentRead, status_code=201)
async def add_transcript(
    request_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> CallTranscript:
    request = db.get(TravelRequest, request_id)
    if request is None:
        raise HTTPException(status_code=404, detail="Travel request not found.")
    if request.status == REQUEST_STATUS_CLOSED:
        raise HTTPException(status_code=400, detail="Closed requests cannot be updated.")

    stored_path, original_filename, mime_type, size_bytes = await store_upload_file(
        settings.attachments_dir,
        request_id,
        "transcripts",
        file,
    )
    transcript = CallTranscript(
        travel_request_id=request_id,
        original_filename=original_filename,
        stored_path=stored_path,
        mime_type=mime_type,
        size_bytes=size_bytes,
        created_by_id=current_user.id,
    )
    _touch_request(request, current_user)
    db.add(transcript)
    db.commit()
    db.refresh(transcript)
    transcript = (
        db.query(CallTranscript)
        .options(joinedload(CallTranscript.created_by))
        .filter(CallTranscript.id == transcript.id)
        .one()
    )
    return transcript


@app.get("/api/requests/{request_id}/transcripts/{transcript_id}/content")
def get_transcript_content(
    request_id: int,
    transcript_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
) -> PlainTextResponse:
    transcript = db.get(CallTranscript, transcript_id)
    if transcript is None or transcript.travel_request_id != request_id:
        raise HTTPException(status_code=404, detail="Call transcript not found.")

    content = read_attachment_text(
        settings.attachments_dir,
        transcript.stored_path,
        transcript.mime_type,
    )
    return PlainTextResponse(content)


@app.post("/api/requests/{request_id}/chats", response_model=AttachmentRead, status_code=201)
async def add_chat_log(
    request_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ChatLog:
    request = db.get(TravelRequest, request_id)
    if request is None:
        raise HTTPException(status_code=404, detail="Travel request not found.")
    if request.status == REQUEST_STATUS_CLOSED:
        raise HTTPException(status_code=400, detail="Closed requests cannot be updated.")

    stored_path, original_filename, mime_type, size_bytes = await store_upload_file(
        settings.attachments_dir,
        request_id,
        "chats",
        file,
    )
    chat_log = ChatLog(
        travel_request_id=request_id,
        original_filename=original_filename,
        stored_path=stored_path,
        mime_type=mime_type,
        size_bytes=size_bytes,
        created_by_id=current_user.id,
    )
    _touch_request(request, current_user)
    db.add(chat_log)
    db.commit()
    db.refresh(chat_log)
    chat_log = (
        db.query(ChatLog)
        .options(joinedload(ChatLog.created_by))
        .filter(ChatLog.id == chat_log.id)
        .one()
    )
    return chat_log


@app.get("/api/requests/{request_id}/chats/{chat_id}/content")
def get_chat_log_content(
    request_id: int,
    chat_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
) -> PlainTextResponse:
    chat_log = db.get(ChatLog, chat_id)
    if chat_log is None or chat_log.travel_request_id != request_id:
        raise HTTPException(status_code=404, detail="Chat log not found.")

    content = read_attachment_text(
        settings.attachments_dir,
        chat_log.stored_path,
        chat_log.mime_type,
    )
    return PlainTextResponse(content)


@app.post("/api/requests/{request_id}/notes", response_model=RequestNoteRead, status_code=201)
def add_note(
    request_id: int,
    payload: RequestNoteCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> RequestNote:
    request = _get_open_request(db, request_id)
    content = payload.content.strip()
    summary = payload.summary.strip()
    note = RequestNote(
        travel_request_id=request_id,
        summary=summary,
        content=content,
        created_by_id=current_user.id,
        updated_by_id=current_user.id,
    )
    _touch_request(request, current_user)
    db.add(note)
    db.flush()
    _record_note_audit(
        db,
        note,
        current_user,
        to_summary=summary,
        to_content=content,
    )
    db.commit()
    return _load_note(db, note.id)


@app.patch("/api/requests/{request_id}/notes/{note_id}", response_model=RequestNoteRead)
def update_note(
    request_id: int,
    note_id: int,
    payload: RequestNoteUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> RequestNote:
    request = _get_open_request(db, request_id)
    note = db.get(RequestNote, note_id)
    if note is None or note.travel_request_id != request_id:
        raise HTTPException(status_code=404, detail="Note not found.")

    updates = payload.model_dump(exclude_unset=True)
    changed = False
    summary_changed = False
    content_changed = False
    old_summary = note.summary
    old_content = note.content
    new_summary = old_summary
    new_content = old_content

    if "summary" in updates and updates["summary"] is not None:
        new_summary = updates["summary"].strip()
        summary_changed = new_summary != old_summary

    if "content" in updates and updates["content"] is not None:
        new_content = updates["content"].strip()
        content_changed = new_content != old_content

    if summary_changed or content_changed:
        _record_note_audit(
            db,
            note,
            current_user,
            from_summary=old_summary if summary_changed else None,
            to_summary=new_summary if summary_changed else None,
            from_content=old_content if content_changed else None,
            to_content=new_content if content_changed else None,
        )
        if summary_changed:
            note.summary = new_summary
            changed = True
        if content_changed:
            note.content = new_content
            changed = True

    if changed:
        note.updated_by_id = current_user.id
        _touch_request(request, current_user)

    db.commit()
    return _load_note(db, note.id)


@app.post("/api/requests/{request_id}/proposed-cruises", response_model=ProposedCruiseRead, status_code=201)
def add_proposed_cruise(
    request_id: int,
    payload: ProposedCruiseCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ProposedCruiseRead:
    request = _get_open_request(db, request_id)
    _validate_proposed_cruise_passengers(db, request_id, payload.passenger_ids)
    data = payload.model_dump(exclude={"passenger_ids", "includes"})
    cruise = ProposedCruise(
        travel_request_id=request_id,
        **data,
        includes=payload.includes.model_dump(),
        status=PROPOSED_CRUISE_STATUS_PROPOSED,
        created_by_id=current_user.id,
        updated_by_id=current_user.id,
    )
    _touch_request(request, current_user)
    db.add(cruise)
    db.flush()
    _sync_proposed_cruise_passengers(db, cruise, payload.passenger_ids, request_id)
    db.commit()
    cruise = _load_proposed_cruise(db, cruise.id)
    return _proposed_cruise_to_read(cruise)


@app.patch(
    "/api/requests/{request_id}/proposed-cruises/{cruise_id}",
    response_model=ProposedCruiseRead,
)
def update_proposed_cruise(
    request_id: int,
    cruise_id: int,
    payload: ProposedCruiseUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ProposedCruiseRead:
    request = _get_open_request(db, request_id)
    cruise = db.get(ProposedCruise, cruise_id)
    if cruise is None or cruise.travel_request_id != request_id:
        raise HTTPException(status_code=404, detail="Proposed cruise not found.")

    updates = payload.model_dump(exclude_unset=True)
    passenger_ids = updates.pop("passenger_ids", None)
    includes = updates.pop("includes", None)

    if includes is not None:
        cruise.includes = includes.model_dump() if hasattr(includes, "model_dump") else includes

    for field, value in updates.items():
        setattr(cruise, field, value)

    if passenger_ids is not None:
        _sync_proposed_cruise_passengers(db, cruise, passenger_ids, request_id)

    cruise.updated_by_id = current_user.id
    _touch_request(request, current_user)
    db.commit()
    cruise = _load_proposed_cruise(db, cruise.id)
    return _proposed_cruise_to_read(cruise)


def _load_quoted_insurance(db: Session, quote_id: int) -> QuotedInsurance:
    return (
        db.query(QuotedInsurance)
        .options(
            joinedload(QuotedInsurance.created_by),
            joinedload(QuotedInsurance.updated_by),
        )
        .filter(QuotedInsurance.id == quote_id)
        .one()
    )


@app.post("/api/requests/{request_id}/quoted-insurance", response_model=QuotedInsuranceRead, status_code=201)
def add_quoted_insurance(
    request_id: int,
    payload: QuotedInsuranceCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> QuotedInsurance:
    request = _get_open_request(db, request_id)
    quote = QuotedInsurance(
        travel_request_id=request_id,
        **payload.model_dump(),
        status=QUOTED_INSURANCE_STATUS_PROPOSED,
        created_by_id=current_user.id,
        updated_by_id=current_user.id,
    )
    _touch_request(request, current_user)
    db.add(quote)
    db.commit()
    return _load_quoted_insurance(db, quote.id)


@app.patch(
    "/api/requests/{request_id}/quoted-insurance/{quote_id}",
    response_model=QuotedInsuranceRead,
)
def update_quoted_insurance(
    request_id: int,
    quote_id: int,
    payload: QuotedInsuranceUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> QuotedInsurance:
    request = _get_open_request(db, request_id)
    quote = db.get(QuotedInsurance, quote_id)
    if quote is None or quote.travel_request_id != request_id:
        raise HTTPException(status_code=404, detail="Quoted insurance not found.")

    updates = payload.model_dump(exclude_unset=True)
    if "status" in updates:
        new_status = updates["status"]
        if (
            new_status == QUOTED_INSURANCE_STATUS_DECLINED
            and quote.status != QUOTED_INSURANCE_STATUS_DECLINED
        ):
            quote.declined_at = datetime.now(UTC).replace(tzinfo=None)
        elif new_status != QUOTED_INSURANCE_STATUS_DECLINED:
            quote.declined_at = None

    for field, value in updates.items():
        setattr(quote, field, value)

    quote.updated_by_id = current_user.id
    _touch_request(request, current_user)
    db.commit()
    return _load_quoted_insurance(db, quote.id)


@app.post("/api/requests/{request_id}/passengers", response_model=RequestPassengerRead, status_code=201)
def add_passenger(
    request_id: int,
    payload: RequestPassengerCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> RequestPassenger:
    request = _get_open_request(db, request_id)
    passenger = RequestPassenger(
        travel_request_id=request_id,
        **payload.model_dump(),
    )
    _touch_request(request, current_user)
    db.add(passenger)
    db.commit()
    db.refresh(passenger)
    return passenger


@app.patch("/api/requests/{request_id}/passengers/{passenger_id}", response_model=RequestPassengerRead)
def update_passenger(
    request_id: int,
    passenger_id: int,
    payload: RequestPassengerUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> RequestPassenger:
    request = _get_open_request(db, request_id)
    passenger = db.get(RequestPassenger, passenger_id)
    if passenger is None or passenger.travel_request_id != request_id:
        raise HTTPException(status_code=404, detail="Passenger not found.")

    updates = payload.model_dump(exclude_unset=True)
    passenger_changes = collect_field_changes(passenger, updates, PASSENGER_AUDIT_FIELDS)
    record_passenger_field_changes(db, passenger, passenger_changes, current_user)
    apply_updates(passenger, updates)

    _sync_request_from_primary_passenger(db, request, passenger, current_user)
    _touch_request(request, current_user)
    db.commit()
    db.refresh(passenger)
    return passenger


@app.delete("/api/requests/{request_id}/passengers/{passenger_id}", status_code=204)
def delete_passenger(
    request_id: int,
    passenger_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> None:
    request = _get_open_request(db, request_id)
    passenger = db.get(RequestPassenger, passenger_id)
    if passenger is None or passenger.travel_request_id != request_id:
        raise HTTPException(status_code=404, detail="Passenger not found.")

    passenger_count = (
        db.query(RequestPassenger).filter(RequestPassenger.travel_request_id == request_id).count()
    )
    if passenger_count <= 1:
        raise HTTPException(status_code=400, detail="At least one passenger is required.")

    record_passenger_deletion(db, passenger, current_user)
    db.delete(passenger)
    _touch_request(request, current_user)
    db.commit()
