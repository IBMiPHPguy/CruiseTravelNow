from datetime import UTC, datetime, timedelta

from fastapi import Body, Depends, FastAPI, File, HTTPException, UploadFile, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import PlainTextResponse
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy import text
from sqlalchemy.orm import Session, joinedload, noload, selectinload

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
from app.database import Base, engine, get_db
from app.constants import (
    COMMUNICATION_STATUS_DRAFT,
    COMMUNICATION_STATUS_SENT,
    COMMUNICATION_TYPE_RESEARCH_PROPOSAL,
    PROPOSED_CRUISE_STATUS_PROPOSED,
    QUOTED_INSURANCE_STATUS_DECLINED,
    QUOTED_INSURANCE_STATUS_PROPOSED,
    REQUEST_STATUS_CLOSED,
    REQUEST_STATUS_OPEN,
    PRIMARY_CLOSE_REASON,
    STALE_DAYS,
    TASK_STATUS_DONE,
    TASK_STATUS_OPEN,
    WORKFLOW_STATUS_ACTIVE,
    WORKFLOW_STATUS_CANCELLED,
    WORKFLOW_STATUS_COMPLETED,
    WORKFLOW_TYPE_RESEARCH,
)
from app.gemini_service import (
    GeminiConfigurationError,
    GeminiParseError,
    generate_proposed_cruises_from_research,
    generate_research_communication_from_proposals,
)
from app.deps import get_current_user
from app.models import (
    CallTranscript,
    ChatLog,
    Passenger,
    ProposedCruise,
    ProposedCruisePassenger,
    QuotedInsurance,
    RequestNote,
    RequestNoteAudit,
    RequestPassenger,
    RequestPassengerAudit,
    RequestCommunication,
    RequestResearchDocument,
    RequestTask,
    RequestWorkflow,
    TravelRequest,
    TravelRequestAudit,
    User,
)
from app.passenger_helpers import attach_passenger_to_request, create_passenger_record, search_passengers
from app.schemas import (
    AttachmentRead,
    DashboardNextOpenTaskRead,
    DashboardOpenRequest,
    DashboardResponse,
    PassengerRead,
    GenerateProposedCruisesRequest,
    GenerateProposedCruisesResponse,
    GenerateResearchCommunicationRequest,
    GenerateResearchCommunicationResponse,
    BulkProposedCruiseCreate,
    BulkProposedCruiseCreateResponse,
    ProposedCruiseCreate,
    ProposedCruiseRead,
    ProposedCruiseUpdate,
    QuotedInsuranceCreate,
    QuotedInsuranceRead,
    QuotedInsuranceUpdate,
    RequestNoteCreate,
    RequestNoteRead,
    RequestNoteSummaryRead,
    RequestNoteUpdate,
    RequestPassengerCreate,
    RequestPassengerRead,
    RequestPassengerUpdate,
    RequestPassengerAuditRead,
    RequestCommunicationCreate,
    RequestCommunicationRead,
    RequestCommunicationSummaryRead,
    RequestCommunicationUpdate,
    RequestChangeHistoryRead,
    RequestTaskUpdate,
    RequestWorkflowCreate,
    RequestWorkflowRead,
    RequestWorkflowUpdate,
    ResearchDocumentRead,
    TokenResponse,
    WorkflowTemplateRead,
    TravelRequestCreate,
    TravelRequestDetailRead,
    TravelRequestRead,
    TravelRequestAuditRead,
    TravelRequestUpdate,
    UserCreate,
    UserRead,
    UserAudit,
)
from app.security import create_access_token, hash_password, verify_password
from app.workflow_helpers import (
    WORKFLOW_DEFINITIONS,
    ensure_follow_up_due_date,
    get_successor_workflow_type,
    get_task_templates,
    get_workflow_label,
    record_follow_up_reached_out,
    schedule_follow_up_due_date,
    TASK_KEY_FOLLOW_UP_RESEARCH,
    TASK_KEY_SEND_RESEARCH_COMMUNICATION,
)

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


def is_stale_by_last_worked(last_worked_at: datetime) -> bool:
    threshold = datetime.now(UTC) - timedelta(days=STALE_DAYS)
    if last_worked_at.tzinfo is None:
        return last_worked_at.replace(tzinfo=UTC) < threshold
    return last_worked_at < threshold


def _build_dashboard_open_request(request: TravelRequest) -> DashboardOpenRequest:
    last_worked_at, last_worked_by = _resolve_last_worked(request)
    base = TravelRequestRead.model_validate(request)
    return DashboardOpenRequest(
        **base.model_dump(),
        is_stale=is_stale_by_last_worked(last_worked_at),
        next_open_task=_resolve_next_open_task(request),
        last_worked_at=last_worked_at,
        last_worked_by=UserAudit.model_validate(last_worked_by),
    )


def _dashboard_query(db: Session):
    return db.query(TravelRequest).options(
        joinedload(TravelRequest.created_by),
        joinedload(TravelRequest.updated_by),
        joinedload(TravelRequest.request_workflows).options(
            joinedload(RequestWorkflow.started_by),
            joinedload(RequestWorkflow.completed_by),
            joinedload(RequestWorkflow.tasks).joinedload(RequestTask.completed_by),
        ),
    )


def _resolve_last_worked(request: TravelRequest) -> tuple[datetime, User]:
    candidates: list[tuple[datetime, User]] = [
        (request.updated_at, request.updated_by),
    ]
    for workflow in request.request_workflows:
        candidates.append((workflow.created_at, workflow.started_by))
        if workflow.completed_at is not None and workflow.completed_by is not None:
            candidates.append((workflow.completed_at, workflow.completed_by))
        for task in workflow.tasks:
            if task.completed_at is not None and task.completed_by is not None:
                candidates.append((task.completed_at, task.completed_by))
    return max(candidates, key=lambda item: item[0])


def _resolve_next_open_task(request: TravelRequest) -> DashboardNextOpenTaskRead | None:
    active_workflow = next(
        (workflow for workflow in request.request_workflows if workflow.status == WORKFLOW_STATUS_ACTIVE),
        None,
    )
    if active_workflow is None:
        return None

    open_tasks = sorted(
        (task for task in active_workflow.tasks if task.status == TASK_STATUS_OPEN),
        key=lambda task: task.sort_order,
    )
    if not open_tasks:
        return None

    task = open_tasks[0]
    return DashboardNextOpenTaskRead(
        id=task.id,
        task_key=task.task_key,
        title=task.title,
        workflow_type=active_workflow.workflow_type,
        workflow_name=get_workflow_label(active_workflow.workflow_type),
    )


def _request_query(db: Session):
    return db.query(TravelRequest).options(
        joinedload(TravelRequest.created_by),
        joinedload(TravelRequest.updated_by),
    )


def _detail_query(db: Session):
    return db.query(TravelRequest).options(
        joinedload(TravelRequest.created_by),
        joinedload(TravelRequest.updated_by),
        selectinload(TravelRequest.request_passengers).joinedload(RequestPassenger.passenger),
        selectinload(TravelRequest.request_notes).options(
            joinedload(RequestNote.created_by),
            joinedload(RequestNote.updated_by),
        ),
        selectinload(TravelRequest.proposed_cruises).options(
            joinedload(ProposedCruise.created_by),
            joinedload(ProposedCruise.updated_by),
            selectinload(ProposedCruise.passenger_links)
            .joinedload(ProposedCruisePassenger.request_passenger)
            .joinedload(RequestPassenger.passenger),
        ),
        selectinload(TravelRequest.quoted_insurance).options(
            joinedload(QuotedInsurance.created_by),
            joinedload(QuotedInsurance.updated_by),
        ),
        selectinload(TravelRequest.call_transcripts).joinedload(CallTranscript.created_by),
        selectinload(TravelRequest.chat_logs).joinedload(ChatLog.created_by),
        selectinload(TravelRequest.request_workflows).options(
            joinedload(RequestWorkflow.started_by),
            joinedload(RequestWorkflow.completed_by),
            selectinload(RequestWorkflow.tasks).joinedload(RequestTask.completed_by),
        ),
        selectinload(TravelRequest.request_communications).options(
            joinedload(RequestCommunication.created_by),
            joinedload(RequestCommunication.updated_by),
        ),
        selectinload(TravelRequest.research_documents).joinedload(RequestResearchDocument.uploaded_by),
    )


def _load_change_history(db: Session, request_id: int) -> TravelRequest | None:
    return (
        db.query(TravelRequest)
        .options(
            selectinload(TravelRequest.request_audits).joinedload(TravelRequestAudit.changed_by),
            selectinload(TravelRequest.passenger_audits).joinedload(RequestPassengerAudit.changed_by),
        )
        .filter(TravelRequest.id == request_id)
        .first()
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


def _load_request_passenger(db: Session, link_id: int) -> RequestPassenger:
    return (
        db.query(RequestPassenger)
        .options(joinedload(RequestPassenger.passenger))
        .filter(RequestPassenger.id == link_id)
        .one()
    )


def _get_primary_passenger(db: Session, request_id: int) -> RequestPassenger | None:
    primary = (
        db.query(RequestPassenger)
        .options(joinedload(RequestPassenger.passenger))
        .filter(
            RequestPassenger.travel_request_id == request_id,
            RequestPassenger.is_primary.is_(True),
        )
        .first()
    )
    if primary is not None:
        return primary
    return (
        db.query(RequestPassenger)
        .options(joinedload(RequestPassenger.passenger))
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
    request.updated_at = datetime.now(UTC).replace(tzinfo=None)


def _load_proposed_cruise(db: Session, cruise_id: int) -> ProposedCruise:
    return (
        db.query(ProposedCruise)
        .options(
            joinedload(ProposedCruise.created_by),
            joinedload(ProposedCruise.updated_by),
            joinedload(ProposedCruise.passenger_links).joinedload(ProposedCruisePassenger.request_passenger).joinedload(
                RequestPassenger.passenger
            ),
        )
        .filter(ProposedCruise.id == cruise_id)
        .one()
    )


def _request_passenger_to_read(passenger: RequestPassenger) -> RequestPassengerRead:
    return RequestPassengerRead.model_validate(passenger)


def _proposed_cruise_to_read(cruise: ProposedCruise) -> ProposedCruiseRead:
    base = ProposedCruiseRead.model_validate(cruise)
    return base.model_copy(
        update={
            "passengers": [
                _request_passenger_to_read(link.request_passenger) for link in cruise.passenger_links
            ],
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
    last_worked_at, last_worked_by = _resolve_last_worked(request)
    base = TravelRequestRead.model_validate(request)
    return TravelRequestDetailRead(
        **base.model_dump(),
        last_worked_at=last_worked_at,
        last_worked_by=UserAudit.model_validate(last_worked_by),
        request_passengers=[RequestPassengerRead.model_validate(passenger) for passenger in request.request_passengers],
        request_notes=[RequestNoteSummaryRead.model_validate(note) for note in request.request_notes],
        call_transcripts=[AttachmentRead.model_validate(attachment) for attachment in request.call_transcripts],
        chat_logs=[AttachmentRead.model_validate(attachment) for attachment in request.chat_logs],
        proposed_cruises=[_proposed_cruise_to_read(cruise) for cruise in request.proposed_cruises],
        quoted_insurance=[QuotedInsuranceRead.model_validate(quote) for quote in request.quoted_insurance],
        request_workflows=[RequestWorkflowRead.model_validate(workflow) for workflow in request.request_workflows],
        request_communications=[
            RequestCommunicationSummaryRead.model_validate(communication)
            for communication in request.request_communications
        ],
        research_documents=[
            ResearchDocumentRead.model_validate(document) for document in request.research_documents
        ],
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
        _dashboard_query(db)
        .filter(TravelRequest.status == REQUEST_STATUS_OPEN)
        .all()
    )

    dashboard_items = [_build_dashboard_open_request(request) for request in open_requests]
    dashboard_items.sort(key=lambda item: item.last_worked_at)
    stale_count = sum(1 for item in dashboard_items if item.is_stale)
    closed_count = db.query(TravelRequest).filter(TravelRequest.status == REQUEST_STATUS_CLOSED).count()

    return DashboardResponse(
        open_count=len(dashboard_items),
        stale_count=stale_count,
        closed_count=closed_count,
        open_requests=dashboard_items,
    )


@app.get("/api/requests", response_model=list[TravelRequestRead])
def list_requests(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[TravelRequest]:
    return _request_query(db).order_by(TravelRequest.created_at.desc()).all()


@app.get("/api/requests/closed", response_model=list[TravelRequestRead])
def list_closed_requests(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[TravelRequest]:
    return (
        _request_query(db)
        .filter(TravelRequest.status == REQUEST_STATUS_CLOSED)
        .order_by(TravelRequest.updated_at.desc())
        .all()
    )


@app.post("/api/requests/{request_id}/reopen", response_model=TravelRequestRead)
def reopen_request(
    request_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> TravelRequest:
    request = db.get(TravelRequest, request_id)
    if request is None:
        raise HTTPException(status_code=404, detail="Travel request not found.")
    if request.status != REQUEST_STATUS_CLOSED:
        raise HTTPException(status_code=400, detail="Only closed requests can be reopened.")
    if request.close_reason == PRIMARY_CLOSE_REASON:
        raise HTTPException(
            status_code=400,
            detail="Requests closed as purchased trips cannot be reopened.",
        )

    updates = {
        "status": REQUEST_STATUS_OPEN,
        "close_reason": None,
    }
    request_changes = collect_field_changes(request, updates, TRAVEL_REQUEST_AUDIT_FIELDS)
    record_travel_request_field_changes(db, request, request_changes, current_user)
    apply_updates(request, updates)
    _touch_request(request, current_user)
    db.commit()
    return _request_query(db).filter(TravelRequest.id == request_id).one()


@app.post("/api/requests", response_model=TravelRequestRead, status_code=201)
def create_request(
    payload: TravelRequestCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> TravelRequest:
    if payload.return_date <= payload.departure_date:
        raise HTTPException(status_code=400, detail="Return date must be after departure date.")

    data = payload.model_dump(exclude={"first_passenger_date_of_birth", "primary_passenger_id"})
    if payload.destination_details:
        data["destination_details"] = payload.destination_details.model_dump(exclude_none=True)
    else:
        data["destination_details"] = None

    if payload.primary_passenger_id is not None:
        passenger = db.get(Passenger, payload.primary_passenger_id)
        if passenger is None:
            raise HTTPException(status_code=404, detail="Passenger not found.")
        data["first_name"] = passenger.first_name
        data["last_name"] = passenger.last_name
        data["email"] = passenger.email
        data["phone"] = passenger.phone
        if payload.first_passenger_date_of_birth is not None:
            passenger.date_of_birth = payload.first_passenger_date_of_birth

    request = TravelRequest(
        **data,
        status=REQUEST_STATUS_OPEN,
        created_by_id=current_user.id,
        updated_by_id=current_user.id,
    )
    db.add(request)
    db.flush()

    if payload.primary_passenger_id is not None:
        attach_passenger_to_request(
            db,
            request.id,
            payload.primary_passenger_id,
            is_primary=True,
        )
    else:
        passenger = create_passenger_record(
            db,
            first_name=payload.first_name,
            last_name=payload.last_name,
            email=payload.email,
            phone=payload.phone,
            date_of_birth=payload.first_passenger_date_of_birth,
            created_by_id=current_user.id,
        )
        attach_passenger_to_request(db, request.id, passenger.id, is_primary=True)
    db.commit()
    request = _request_query(db).filter(TravelRequest.id == request.id).one()
    return request


def _sync_communicate_research_follow_up_due_dates(db: Session, request: TravelRequest) -> None:
    changed = False
    for workflow in request.request_workflows:
        if workflow.status != WORKFLOW_STATUS_ACTIVE:
            continue
        follow_up = next(
            (task for task in workflow.tasks if task.task_key == TASK_KEY_FOLLOW_UP_RESEARCH),
            None,
        )
        previous_due_at = follow_up.due_at if follow_up is not None else None
        ensure_follow_up_due_date(workflow)
        if follow_up is not None and follow_up.due_at != previous_due_at:
            changed = True
    if changed:
        db.commit()


@app.get("/api/requests/{request_id}", response_model=TravelRequestDetailRead)
def get_request(
    request_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> TravelRequestDetailRead:
    request = _detail_query(db).filter(TravelRequest.id == request_id).first()
    if request is None:
        raise HTTPException(status_code=404, detail="Travel request not found.")
    _sync_communicate_research_follow_up_due_dates(db, request)
    return _request_detail_to_read(request)


@app.get("/api/requests/{request_id}/change-history", response_model=RequestChangeHistoryRead)
def get_request_change_history(
    request_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> RequestChangeHistoryRead:
    request = _load_change_history(db, request_id)
    if request is None:
        raise HTTPException(status_code=404, detail="Travel request not found.")
    return RequestChangeHistoryRead(
        request_audits=[TravelRequestAuditRead.model_validate(audit) for audit in request.request_audits],
        passenger_audits=[
            RequestPassengerAuditRead.model_validate(audit) for audit in request.passenger_audits
        ],
    )


@app.get("/api/requests/{request_id}/notes", response_model=list[RequestNoteRead])
def list_request_notes(
    request_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[RequestNote]:
    request = db.get(TravelRequest, request_id)
    if request is None:
        raise HTTPException(status_code=404, detail="Travel request not found.")
    return (
        db.query(RequestNote)
        .options(
            joinedload(RequestNote.created_by),
            joinedload(RequestNote.updated_by),
            noload(RequestNote.audits),
        )
        .filter(RequestNote.travel_request_id == request_id)
        .order_by(RequestNote.created_at.desc())
        .all()
    )


@app.get("/api/requests/{request_id}/notes/{note_id}", response_model=RequestNoteRead)
def get_request_note(
    request_id: int,
    note_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> RequestNote:
    note = (
        db.query(RequestNote)
        .options(
            joinedload(RequestNote.created_by),
            joinedload(RequestNote.updated_by),
            joinedload(RequestNote.audits).joinedload(RequestNoteAudit.changed_by),
        )
        .filter(RequestNote.id == note_id, RequestNote.travel_request_id == request_id)
        .first()
    )
    if note is None:
        raise HTTPException(status_code=404, detail="Note not found.")
    return note


@app.get(
    "/api/requests/{request_id}/communications/{communication_id}",
    response_model=RequestCommunicationRead,
)
def get_communication(
    request_id: int,
    communication_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> RequestCommunication:
    communication = (
        db.query(RequestCommunication)
        .options(
            joinedload(RequestCommunication.created_by),
            joinedload(RequestCommunication.updated_by),
        )
        .filter(
            RequestCommunication.id == communication_id,
            RequestCommunication.travel_request_id == request_id,
        )
        .first()
    )
    if communication is None:
        raise HTTPException(status_code=404, detail="Communication not found.")
    return communication


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


def _assign_default_passenger_ids(db: Session, request_id: int, passengers_in_room: int) -> list[int]:
    links = (
        db.query(RequestPassenger)
        .filter(RequestPassenger.travel_request_id == request_id)
        .order_by(RequestPassenger.is_primary.desc(), RequestPassenger.id.asc())
        .all()
    )
    if not links:
        return []
    count = min(max(passengers_in_room, 1), len(links))
    return [link.id for link in links[:count]]


def _build_request_context_for_gemini(request: TravelRequest) -> dict[str, object]:
    return {
        "request_id": request.id,
        "client_name": f"{request.first_name} {request.last_name}".strip(),
        "client_first_name": request.first_name,
        "client_email": request.email,
        "cruise_line_preference": request.cruise_line,
        "excluded_cruise_line": request.excluded_cruise_line,
        "destination": request.destination,
        "destination_details": request.destination_details,
        "departure_date": request.departure_date.isoformat(),
        "return_date": request.return_date.isoformat(),
        "cabin_types": request.cabin_types,
        "qualifiers": request.qualifiers,
        "passengers": request.passengers,
        "cabins_needed": request.cabins_needed,
    }


def _proposed_cruise_label(cruise: ProposedCruise) -> str:
    return f"{cruise.cruise_line} · {cruise.ship} (departs {cruise.departure_date.isoformat()})"


def _validate_proposed_cruises_for_proposal_email(cruises: list[ProposedCruise]) -> list[ProposedCruise]:
    proposed = [cruise for cruise in cruises if cruise.status == PROPOSED_CRUISE_STATUS_PROPOSED]
    issues: list[str] = []

    if not proposed:
        issues.append(
            "No proposed cruises in Proposed status were found. Add priced cruise options before drafting the email."
        )

    for cruise in proposed:
        label = _proposed_cruise_label(cruise)
        if cruise.cost <= 0:
            issues.append(f"{label}: cruise cost must be greater than $0.")
        if cruise.deposit_amount <= 0:
            issues.append(f"{label}: deposit amount must be greater than $0.")

    if issues:
        raise HTTPException(status_code=400, detail=" ".join(issues))

    return proposed


def _proposed_cruise_to_gemini_dict(cruise: ProposedCruise, option_number: int) -> dict[str, object]:
    return {
        "option_number": option_number,
        "departure_date": cruise.departure_date.isoformat(),
        "cruise_line": cruise.cruise_line,
        "ship": cruise.ship,
        "number_of_nights": cruise.number_of_nights,
        "itinerary_name": cruise.itinerary_name,
        "room_category": cruise.room_category,
        "room_number": cruise.room_number,
        "passengers_in_room": cruise.passengers_in_room,
        "deposit_amount": str(cruise.deposit_amount),
        "deposit_due_date": cruise.deposit_due_date.isoformat(),
        "final_payment_due_date": cruise.final_payment_due_date.isoformat(),
        "cost": str(cruise.cost),
        "includes": cruise.includes or {},
    }


def _create_proposed_cruise_record(
    db: Session,
    request: TravelRequest,
    payload: ProposedCruiseCreate,
    current_user: User,
) -> ProposedCruise:
    _validate_proposed_cruise_passengers(db, request.id, payload.passenger_ids)
    data = payload.model_dump(exclude={"passenger_ids", "includes"})
    cruise = ProposedCruise(
        travel_request_id=request.id,
        **data,
        includes=payload.includes.model_dump(),
        status=PROPOSED_CRUISE_STATUS_PROPOSED,
        created_by_id=current_user.id,
        updated_by_id=current_user.id,
    )
    db.add(cruise)
    db.flush()
    _sync_proposed_cruise_passengers(db, cruise, payload.passenger_ids, request.id)
    return cruise


@app.post("/api/requests/{request_id}/proposed-cruises", response_model=ProposedCruiseRead, status_code=201)
def add_proposed_cruise(
    request_id: int,
    payload: ProposedCruiseCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ProposedCruiseRead:
    request = _get_open_request(db, request_id)
    cruise = _create_proposed_cruise_record(db, request, payload, current_user)
    _touch_request(request, current_user)
    db.commit()
    return _proposed_cruise_to_read(_load_proposed_cruise(db, cruise.id))


@app.post(
    "/api/requests/{request_id}/proposed-cruises/generate-from-research",
    response_model=GenerateProposedCruisesResponse,
)
def generate_proposed_cruises_from_research_document(
    request_id: int,
    payload: GenerateProposedCruisesRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> GenerateProposedCruisesResponse:
    request = _get_open_request(db, request_id)
    document = db.get(RequestResearchDocument, payload.research_document_id)
    if document is None or document.travel_request_id != request_id:
        raise HTTPException(status_code=404, detail="Research document not found.")

    research_text = read_attachment_text(
        settings.attachments_dir,
        document.stored_path,
        document.mime_type,
    )
    request_context = _build_request_context_for_gemini(request)

    try:
        cruises, model_name = generate_proposed_cruises_from_research(
            api_key=settings.gemini_api_key or "",
            model_name=settings.gemini_model,
            research_text=research_text,
            request_context=request_context,
        )
    except GeminiConfigurationError as exc:
        raise HTTPException(
            status_code=503,
            detail="Gemini is not configured. Add GEMINI_API_KEY to your environment.",
        ) from exc
    except GeminiParseError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    enriched: list[ProposedCruiseCreate] = []
    for cruise in cruises:
        passenger_ids = _assign_default_passenger_ids(db, request_id, cruise.passengers_in_room)
        enriched.append(cruise.model_copy(update={"passenger_ids": passenger_ids}))

    return GenerateProposedCruisesResponse(
        research_document_id=document.id,
        research_document_filename=document.original_filename,
        model=model_name,
        cruises=enriched,
    )


@app.post(
    "/api/requests/{request_id}/proposed-cruises/bulk",
    response_model=BulkProposedCruiseCreateResponse,
    status_code=201,
)
def add_proposed_cruises_bulk(
    request_id: int,
    payload: BulkProposedCruiseCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> BulkProposedCruiseCreateResponse:
    request = _get_open_request(db, request_id)
    created_ids: list[int] = []
    for cruise_payload in payload.cruises:
        cruise = _create_proposed_cruise_record(db, request, cruise_payload, current_user)
        created_ids.append(cruise.id)
    _touch_request(request, current_user)
    db.commit()
    created = [_proposed_cruise_to_read(_load_proposed_cruise(db, cruise_id)) for cruise_id in created_ids]
    return BulkProposedCruiseCreateResponse(cruises=created)


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


@app.get("/api/passengers/search", response_model=list[PassengerRead])
def search_passenger_registry(
    q: str = "",
    limit: int = 20,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
) -> list[Passenger]:
    safe_limit = max(1, min(limit, 50))
    return search_passengers(db, q, limit=safe_limit)


@app.post("/api/requests/{request_id}/passengers", response_model=RequestPassengerRead, status_code=201)
def add_passenger(
    request_id: int,
    payload: RequestPassengerCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> RequestPassenger:
    request = _get_open_request(db, request_id)
    try:
        if payload.passenger_id is not None:
            passenger = db.get(Passenger, payload.passenger_id)
            if passenger is None:
                raise HTTPException(status_code=404, detail="Passenger not found.")
            link = attach_passenger_to_request(db, request_id, passenger.id)
        else:
            passenger = create_passenger_record(
                db,
                first_name=payload.first_name.strip(),
                last_name=payload.last_name.strip(),
                email=str(payload.email),
                phone=payload.phone.strip(),
                date_of_birth=payload.date_of_birth,
                created_by_id=current_user.id,
            )
            link = attach_passenger_to_request(db, request_id, passenger.id)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    _touch_request(request, current_user)
    db.commit()
    return _load_request_passenger(db, link.id)


@app.patch("/api/requests/{request_id}/passengers/{passenger_id}", response_model=RequestPassengerRead)
def update_passenger(
    request_id: int,
    passenger_id: int,
    payload: RequestPassengerUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> RequestPassenger:
    request = _get_open_request(db, request_id)
    passenger = _load_request_passenger(db, passenger_id)
    if passenger.travel_request_id != request_id:
        raise HTTPException(status_code=404, detail="Passenger not found.")

    updates = payload.model_dump(exclude_unset=True)
    passenger_changes = collect_field_changes(passenger, updates, PASSENGER_AUDIT_FIELDS)
    record_passenger_field_changes(db, passenger, passenger_changes, current_user)
    apply_updates(passenger, updates)

    _sync_request_from_primary_passenger(db, request, passenger, current_user)
    _touch_request(request, current_user)
    db.commit()
    return _load_request_passenger(db, passenger.id)


@app.delete("/api/requests/{request_id}/passengers/{passenger_id}", status_code=204)
def delete_passenger(
    request_id: int,
    passenger_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> None:
    request = _get_open_request(db, request_id)
    passenger = _load_request_passenger(db, passenger_id)
    if passenger.travel_request_id != request_id:
        raise HTTPException(status_code=404, detail="Passenger not found.")

    passenger_count = (
        db.query(RequestPassenger).filter(RequestPassenger.travel_request_id == request_id).count()
    )
    if passenger_count <= 1:
        raise HTTPException(status_code=400, detail="At least one passenger is required.")
    if passenger.is_primary:
        raise HTTPException(
            status_code=400,
            detail="The primary passenger cannot be removed from the request.",
        )

    record_passenger_deletion(db, passenger, current_user)
    db.delete(passenger)
    _touch_request(request, current_user)
    db.commit()


def _load_workflow(db: Session, workflow_id: int) -> RequestWorkflow:
    return (
        db.query(RequestWorkflow)
        .options(
            joinedload(RequestWorkflow.started_by),
            joinedload(RequestWorkflow.completed_by),
            joinedload(RequestWorkflow.tasks).joinedload(RequestTask.completed_by),
        )
        .filter(RequestWorkflow.id == workflow_id)
        .one()
    )


def _get_active_workflow(db: Session, request_id: int) -> RequestWorkflow | None:
    return (
        db.query(RequestWorkflow)
        .filter(
            RequestWorkflow.travel_request_id == request_id,
            RequestWorkflow.status == WORKFLOW_STATUS_ACTIVE,
        )
        .first()
    )


def _create_request_workflow(
    db: Session,
    *,
    request: TravelRequest,
    workflow_type: str,
    current_user: User,
    parent_workflow_id: int | None = None,
) -> RequestWorkflow:
    if parent_workflow_id is not None:
        parent = db.get(RequestWorkflow, parent_workflow_id)
        if parent is None or parent.travel_request_id != request.id:
            raise HTTPException(status_code=404, detail="Parent workflow not found.")

    workflow = RequestWorkflow(
        travel_request_id=request.id,
        workflow_type=workflow_type,
        status=WORKFLOW_STATUS_ACTIVE,
        parent_workflow_id=parent_workflow_id,
        started_by_id=current_user.id,
    )
    db.add(workflow)
    db.flush()

    for template in get_task_templates(workflow_type):
        db.add(
            RequestTask(
                request_workflow_id=workflow.id,
                travel_request_id=request.id,
                task_key=template.task_key,
                title=template.title,
                description=template.description,
                status=TASK_STATUS_OPEN,
                sort_order=template.sort_order,
            )
        )

    return workflow


@app.get("/api/workflow-templates", response_model=list[WorkflowTemplateRead])
def list_workflow_templates(_: User = Depends(get_current_user)) -> list[WorkflowTemplateRead]:
    return [
        WorkflowTemplateRead(
            workflow_type=workflow_type,
            name=definition["name"],
            description=definition["description"],
        )
        for workflow_type, definition in WORKFLOW_DEFINITIONS.items()
    ]


@app.post("/api/requests/{request_id}/workflows", response_model=RequestWorkflowRead, status_code=201)
def start_workflow(
    request_id: int,
    payload: RequestWorkflowCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> RequestWorkflow:
    request = _get_open_request(db, request_id)
    if _get_active_workflow(db, request_id) is not None:
        raise HTTPException(
            status_code=400,
            detail="This request already has an active workflow. Complete or cancel it before starting another.",
        )

    if payload.parent_workflow_id is not None:
        parent = db.get(RequestWorkflow, payload.parent_workflow_id)
        if parent is None or parent.travel_request_id != request_id:
            raise HTTPException(status_code=404, detail="Parent workflow not found.")

    workflow = _create_request_workflow(
        db,
        request=request,
        workflow_type=payload.workflow_type,
        current_user=current_user,
        parent_workflow_id=payload.parent_workflow_id,
    )
    _touch_request(request, current_user)
    db.commit()
    return _load_workflow(db, workflow.id)


@app.patch(
    "/api/requests/{request_id}/workflows/{workflow_id}",
    response_model=RequestWorkflowRead,
)
def update_workflow(
    request_id: int,
    workflow_id: int,
    payload: RequestWorkflowUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> RequestWorkflow:
    request = _get_open_request(db, request_id)
    workflow = db.get(RequestWorkflow, workflow_id)
    if workflow is None or workflow.travel_request_id != request_id:
        raise HTTPException(status_code=404, detail="Workflow not found.")

    just_completed = False
    if payload.status is not None and payload.status != workflow.status:
        if payload.status in {WORKFLOW_STATUS_COMPLETED, WORKFLOW_STATUS_CANCELLED}:
            workflow.status = payload.status
            workflow.completed_by_id = current_user.id
            workflow.completed_at = datetime.now(UTC).replace(tzinfo=None)
            just_completed = payload.status == WORKFLOW_STATUS_COMPLETED
        else:
            workflow.status = payload.status

    successor_workflow: RequestWorkflow | None = None
    if just_completed and workflow.workflow_type == WORKFLOW_TYPE_RESEARCH:
        successor_type = get_successor_workflow_type(workflow.workflow_type)
        if successor_type is not None:
            db.flush()
            successor_workflow = _create_request_workflow(
                db,
                request=request,
                workflow_type=successor_type,
                current_user=current_user,
                parent_workflow_id=workflow.id,
            )

    _touch_request(request, current_user)
    db.commit()
    if successor_workflow is not None:
        return _load_workflow(db, successor_workflow.id)
    return _load_workflow(db, workflow.id)


@app.patch("/api/requests/{request_id}/tasks/{task_id}", response_model=RequestWorkflowRead)
def update_task(
    request_id: int,
    task_id: int,
    payload: RequestTaskUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> RequestWorkflow:
    request = _get_open_request(db, request_id)
    task = db.get(RequestTask, task_id)
    if task is None or task.travel_request_id != request_id:
        raise HTTPException(status_code=404, detail="Task not found.")

    workflow = _load_workflow(db, task.request_workflow_id)
    if workflow.status != WORKFLOW_STATUS_ACTIVE:
        raise HTTPException(status_code=400, detail="Tasks can only be updated on active workflows.")

    if payload.status is not None:
        task.status = payload.status
        if payload.status == TASK_STATUS_DONE:
            task.completed_at = datetime.now(UTC).replace(tzinfo=None)
            task.completed_by_id = current_user.id
            if task.task_key == TASK_KEY_SEND_RESEARCH_COMMUNICATION:
                schedule_follow_up_due_date(workflow, task.completed_at)
        elif payload.status == TASK_STATUS_OPEN:
            task.completed_at = None
            task.completed_by_id = None

    payload_data = payload.model_dump(exclude_unset=True)
    if payload_data.get("reached_out"):
        try:
            record_follow_up_reached_out(task, now=datetime.now(UTC).replace(tzinfo=None))
        except ValueError as error:
            raise HTTPException(status_code=400, detail=str(error)) from error

    if "due_at" in payload_data:
        task.due_at = payload.due_at

    if "result" in payload_data:
        task.result = payload.result

    ensure_follow_up_due_date(workflow)

    _touch_request(request, current_user)
    db.commit()
    return _load_workflow(db, workflow.id)


def _load_communication(db: Session, communication_id: int) -> RequestCommunication:
    return (
        db.query(RequestCommunication)
        .options(
            joinedload(RequestCommunication.created_by),
            joinedload(RequestCommunication.updated_by),
        )
        .filter(RequestCommunication.id == communication_id)
        .one()
    )


def _build_research_proposal_communication_subject(request: TravelRequest, option_count: int) -> str:
    destination = request.destination.strip() or "Travel request"
    option_label = "option" if option_count == 1 else "options"
    return f"Cruise Proposal – {destination} ({option_count} {option_label})"[:255]


def _find_draft_research_proposal_communication(
    db: Session,
    request_id: int,
    request_workflow_id: int | None,
) -> RequestCommunication | None:
    query = db.query(RequestCommunication).filter(
        RequestCommunication.travel_request_id == request_id,
        RequestCommunication.communication_type == COMMUNICATION_TYPE_RESEARCH_PROPOSAL,
        RequestCommunication.status == COMMUNICATION_STATUS_DRAFT,
    )
    if request_workflow_id is None:
        query = query.filter(RequestCommunication.request_workflow_id.is_(None))
    else:
        query = query.filter(RequestCommunication.request_workflow_id == request_workflow_id)
    return query.order_by(RequestCommunication.updated_at.desc()).first()


def _save_research_proposal_communication(
    db: Session,
    *,
    request: TravelRequest,
    current_user: User,
    subject: str,
    body: str,
    request_workflow_id: int | None,
) -> RequestCommunication:
    if request_workflow_id is not None:
        workflow = db.get(RequestWorkflow, request_workflow_id)
        if workflow is None or workflow.travel_request_id != request.id:
            raise HTTPException(status_code=404, detail="Workflow not found.")

    communication = _find_draft_research_proposal_communication(db, request.id, request_workflow_id)
    if communication is None:
        communication = RequestCommunication(
            travel_request_id=request.id,
            request_workflow_id=request_workflow_id,
            communication_type=COMMUNICATION_TYPE_RESEARCH_PROPOSAL,
            subject=subject.strip(),
            body=body,
            status=COMMUNICATION_STATUS_DRAFT,
            created_by_id=current_user.id,
            updated_by_id=current_user.id,
        )
        db.add(communication)
    else:
        communication.subject = subject.strip()
        communication.body = body
        communication.updated_by_id = current_user.id

    _touch_request(request, current_user)
    db.commit()
    return _load_communication(db, communication.id)


@app.post(
    "/api/requests/{request_id}/communications/generate-from-proposals",
    response_model=GenerateResearchCommunicationResponse,
)
def generate_research_communication_from_proposed_cruises(
    request_id: int,
    payload: GenerateResearchCommunicationRequest = Body(default_factory=GenerateResearchCommunicationRequest),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> GenerateResearchCommunicationResponse:
    request = _get_open_request(db, request_id)
    request_workflow_id = payload.request_workflow_id
    proposed_cruises = (
        db.query(ProposedCruise)
        .filter(
            ProposedCruise.travel_request_id == request_id,
            ProposedCruise.status == PROPOSED_CRUISE_STATUS_PROPOSED,
        )
        .order_by(ProposedCruise.departure_date, ProposedCruise.id)
        .all()
    )
    validated_cruises = _validate_proposed_cruises_for_proposal_email(proposed_cruises)
    request_context = _build_request_context_for_gemini(request)
    cruise_payload = [
        _proposed_cruise_to_gemini_dict(cruise, index)
        for index, cruise in enumerate(validated_cruises, start=1)
    ]

    try:
        email_subject, body, model_name = generate_research_communication_from_proposals(
            api_key=settings.gemini_api_key or "",
            model_name=settings.gemini_model,
            request_context=request_context,
            proposed_cruises=cruise_payload,
        )
    except GeminiConfigurationError as exc:
        raise HTTPException(
            status_code=503,
            detail="Gemini is not configured. Add GEMINI_API_KEY to your environment.",
        ) from exc
    except GeminiParseError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    communication_subject = _build_research_proposal_communication_subject(request, len(validated_cruises))
    communication = _save_research_proposal_communication(
        db,
        request=request,
        current_user=current_user,
        subject=communication_subject,
        body=body,
        request_workflow_id=request_workflow_id,
    )

    return GenerateResearchCommunicationResponse(
        model=model_name,
        proposed_cruise_count=len(validated_cruises),
        subject=communication_subject,
        email_subject=email_subject,
        body=body,
        communication=communication,
    )


@app.post(
    "/api/requests/{request_id}/communications",
    response_model=RequestCommunicationRead,
    status_code=201,
)
def add_communication(
    request_id: int,
    payload: RequestCommunicationCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> RequestCommunication:
    request = _get_open_request(db, request_id)
    if payload.request_workflow_id is not None:
        workflow = db.get(RequestWorkflow, payload.request_workflow_id)
        if workflow is None or workflow.travel_request_id != request_id:
            raise HTTPException(status_code=404, detail="Workflow not found.")

    communication = RequestCommunication(
        travel_request_id=request_id,
        request_workflow_id=payload.request_workflow_id,
        communication_type=payload.communication_type,
        subject=payload.subject.strip(),
        body=payload.body,
        status=payload.status,
        created_by_id=current_user.id,
        updated_by_id=current_user.id,
    )
    if payload.status == COMMUNICATION_STATUS_SENT:
        communication.sent_at = datetime.now(UTC).replace(tzinfo=None)

    _touch_request(request, current_user)
    db.add(communication)
    db.commit()
    return _load_communication(db, communication.id)


@app.patch(
    "/api/requests/{request_id}/communications/{communication_id}",
    response_model=RequestCommunicationRead,
)
def update_communication(
    request_id: int,
    communication_id: int,
    payload: RequestCommunicationUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> RequestCommunication:
    request = _get_open_request(db, request_id)
    communication = db.get(RequestCommunication, communication_id)
    if communication is None or communication.travel_request_id != request_id:
        raise HTTPException(status_code=404, detail="Communication not found.")

    updates = payload.model_dump(exclude_unset=True)
    for field, value in updates.items():
        if field in {"subject", "communication_type", "body", "status"} and value is not None:
            setattr(communication, field, value.strip() if field == "subject" else value)

    if updates.get("status") == COMMUNICATION_STATUS_SENT and communication.sent_at is None:
        communication.sent_at = datetime.now(UTC).replace(tzinfo=None)

    communication.updated_by_id = current_user.id
    _touch_request(request, current_user)
    db.commit()
    return _load_communication(db, communication.id)


@app.post(
    "/api/requests/{request_id}/research-documents",
    response_model=ResearchDocumentRead,
    status_code=201,
)
async def upload_research_document(
    request_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> RequestResearchDocument:
    request = _get_open_request(db, request_id)
    filename = (file.filename or "").lower()
    if not filename.endswith(".txt"):
        raise HTTPException(status_code=400, detail="Research documents must be .txt files.")

    stored_path, original_filename, mime_type, size_bytes = await store_upload_file(
        settings.attachments_dir,
        request_id,
        "research",
        file,
    )
    document = RequestResearchDocument(
        travel_request_id=request_id,
        original_filename=original_filename,
        stored_path=stored_path,
        mime_type=mime_type,
        size_bytes=size_bytes,
        uploaded_by_id=current_user.id,
    )
    _touch_request(request, current_user)
    db.add(document)
    db.commit()
    db.refresh(document)
    document = (
        db.query(RequestResearchDocument)
        .options(joinedload(RequestResearchDocument.uploaded_by))
        .filter(RequestResearchDocument.id == document.id)
        .one()
    )
    return document


@app.get("/api/requests/{request_id}/research-documents/{document_id}/content")
def get_research_document_content(
    request_id: int,
    document_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
) -> PlainTextResponse:
    document = db.get(RequestResearchDocument, document_id)
    if document is None or document.travel_request_id != request_id:
        raise HTTPException(status_code=404, detail="Research document not found.")

    content = read_attachment_text(
        settings.attachments_dir,
        document.stored_path,
        document.mime_type,
    )
    return PlainTextResponse(content)
