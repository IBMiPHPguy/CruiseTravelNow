from datetime import date, datetime
from decimal import Decimal
from typing import Any

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator, model_validator

from app.constants import (
    ALASKA_OPTIONS,
    ASIA_OPTIONS,
    CABIN_TYPES,
    CARIBBEAN_REGIONS,
    CLOSE_REASONS,
    DESTINATIONS,
    EUROPE_REGIONS,
    PROPOSED_CRUISE_STATUSES,
    QUALIFIERS,
    QUOTED_INSURANCE_STATUSES,
    REQUEST_STATUS_CLOSED,
    REQUEST_STATUS_OPEN,
    REQUEST_STATUSES,
    RESIDENCY_REGIONS,
)
from app.security import validate_password


class DestinationDetails(BaseModel):
    caribbean_regions: list[str] | None = None
    alaska_options: list[str] | None = None
    asia_regions: list[str] | None = None
    europe_regions: list[str] | None = None


class UserCreate(BaseModel):
    username: str = Field(min_length=3, max_length=80, pattern=r"^\S+$")
    email: EmailStr
    password: str = Field(min_length=11, max_length=128)

    @field_validator("password")
    @classmethod
    def validate_password_strength(cls, value: str) -> str:
        validate_password(value)
        return value


class UserLogin(BaseModel):
    username: str = Field(min_length=1, max_length=80)
    password: str = Field(min_length=1, max_length=128)


class UserRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    username: str
    email: EmailStr


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserRead


class UserAudit(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    username: str


class TravelRequestBase(BaseModel):
    first_name: str = Field(min_length=1, max_length=80)
    last_name: str = Field(min_length=1, max_length=80)
    email: EmailStr
    phone: str = Field(min_length=7, max_length=30)
    state_of_residency: str = Field(min_length=2, max_length=50)
    cruise_line: str = Field(min_length=1, max_length=120)
    excluded_cruise_line: str | None = Field(default=None, max_length=120)
    destination: str = Field(min_length=1, max_length=120)
    destination_details: DestinationDetails | None = None
    departure_date: date
    return_date: date
    cabin_types: list[str] = Field(min_length=1)
    qualifiers: list[str] = Field(default_factory=list)
    passengers: int = Field(ge=1, le=20)
    cabins_needed: int = Field(ge=1, le=10, default=1)

    @model_validator(mode="after")
    def validate_travel_dates(self) -> "TravelRequestBase":
        if self.return_date <= self.departure_date:
            raise ValueError("Return date must be after departure date.")
        return self

    @field_validator("destination")
    @classmethod
    def validate_destination(cls, value: str) -> str:
        if value not in DESTINATIONS:
            raise ValueError("Invalid destination selected.")
        return value

    @field_validator("state_of_residency")
    @classmethod
    def validate_state_of_residency(cls, value: str) -> str:
        if value not in RESIDENCY_REGIONS:
            raise ValueError("Invalid state or province selected.")
        return value

    @field_validator("cabin_types")
    @classmethod
    def validate_cabin_types(cls, value: list[str]) -> list[str]:
        if not value:
            raise ValueError("Select at least one cabin type.")
        invalid = [item for item in value if item not in CABIN_TYPES]
        if invalid:
            raise ValueError("Invalid cabin type selected.")
        return value

    @field_validator("qualifiers")
    @classmethod
    def validate_qualifiers(cls, value: list[str]) -> list[str]:
        invalid = [item for item in value if item not in QUALIFIERS]
        if invalid:
            raise ValueError("Invalid qualifier selected.")
        return value

    @model_validator(mode="after")
    def validate_destination_details(self) -> "TravelRequestBase":
        details = self.destination_details or DestinationDetails()

        if self.destination == "Caribbean":
            regions = details.caribbean_regions or []
            if not regions:
                raise ValueError("Select at least one Caribbean region.")
            invalid = [item for item in regions if item not in CARIBBEAN_REGIONS]
            if invalid:
                raise ValueError("Invalid Caribbean region selected.")
        elif self.destination == "Alaska":
            options = details.alaska_options or []
            if not options:
                raise ValueError("Select at least one Alaska itinerary option.")
            invalid = [item for item in options if item not in ALASKA_OPTIONS]
            if invalid:
                raise ValueError("Invalid Alaska itinerary option selected.")
        elif self.destination == "Asia":
            regions = details.asia_regions or []
            if not regions:
                raise ValueError("Select at least one Asia region option.")
            invalid = [item for item in regions if item not in ASIA_OPTIONS]
            if invalid:
                raise ValueError("Invalid Asia region option selected.")
        elif self.destination == "Europe":
            regions = details.europe_regions or []
            if not regions:
                raise ValueError("Select at least one Europe region.")
            invalid = [item for item in regions if item not in EUROPE_REGIONS]
            if invalid:
                raise ValueError("Invalid Europe region selected.")
        else:
            self.destination_details = None

        return self


class TravelRequestCreate(TravelRequestBase):
    first_passenger_date_of_birth: date | None = None
    primary_passenger_id: int | None = None


class PassengerRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    first_name: str
    last_name: str
    email: EmailStr
    phone: str
    date_of_birth: date | None = None
    created_at: datetime
    updated_at: datetime


class RequestPassengerBase(BaseModel):
    first_name: str = Field(min_length=1, max_length=80)
    last_name: str = Field(min_length=1, max_length=80)
    email: EmailStr
    phone: str = Field(min_length=7, max_length=30)
    date_of_birth: date | None = None


class RequestPassengerCreate(BaseModel):
    passenger_id: int | None = None
    first_name: str | None = Field(default=None, min_length=1, max_length=80)
    last_name: str | None = Field(default=None, min_length=1, max_length=80)
    email: EmailStr | None = None
    phone: str | None = Field(default=None, min_length=7, max_length=30)
    date_of_birth: date | None = None

    @model_validator(mode="after")
    def validate_create_mode(self) -> "RequestPassengerCreate":
        profile_fields = (
            self.first_name,
            self.last_name,
            self.email,
            self.phone,
            self.date_of_birth,
        )
        if self.passenger_id is not None:
            if any(value is not None for value in profile_fields):
                raise ValueError("Provide either passenger_id or passenger details, not both.")
            return self

        missing = [
            name
            for name, value in (
                ("first_name", self.first_name),
                ("last_name", self.last_name),
                ("email", self.email),
                ("phone", self.phone),
            )
            if value is None or (isinstance(value, str) and not value.strip())
        ]
        if missing:
            raise ValueError("New passengers require first name, last name, email, and phone.")
        return self


class RequestPassengerUpdate(BaseModel):
    first_name: str | None = Field(default=None, min_length=1, max_length=80)
    last_name: str | None = Field(default=None, min_length=1, max_length=80)
    email: EmailStr | None = None
    phone: str | None = Field(default=None, min_length=7, max_length=30)
    date_of_birth: date | None = None


class RequestPassengerRead(RequestPassengerBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    passenger_id: int
    is_primary: bool
    created_at: datetime
    updated_at: datetime


class TravelRequestUpdate(BaseModel):
    first_name: str | None = Field(default=None, min_length=1, max_length=80)
    last_name: str | None = Field(default=None, min_length=1, max_length=80)
    email: EmailStr | None = None
    phone: str | None = Field(default=None, min_length=7, max_length=30)
    state_of_residency: str | None = Field(default=None, min_length=2, max_length=50)
    cruise_line: str | None = Field(default=None, min_length=1, max_length=120)
    excluded_cruise_line: str | None = Field(default=None, max_length=120)
    destination: str | None = Field(default=None, min_length=1, max_length=120)
    destination_details: DestinationDetails | None = None
    departure_date: date | None = None
    return_date: date | None = None
    cabin_types: list[str] | None = None
    qualifiers: list[str] | None = None
    passengers: int | None = Field(default=None, ge=1, le=20)
    cabins_needed: int | None = Field(default=None, ge=1, le=10)
    status: str | None = Field(default=None, min_length=1, max_length=40)
    close_reason: str | None = Field(default=None, max_length=120)

    @model_validator(mode="after")
    def validate_close(self) -> "TravelRequestUpdate":
        if self.status == REQUEST_STATUS_CLOSED:
            if not self.close_reason:
                raise ValueError("Select a close reason when closing a request.")
            if self.close_reason not in CLOSE_REASONS:
                raise ValueError("Invalid close reason selected.")
        elif self.status == REQUEST_STATUS_OPEN:
            self.close_reason = None
        elif self.close_reason is not None and self.close_reason not in CLOSE_REASONS:
            raise ValueError("Invalid close reason selected.")
        if self.status is not None and self.status not in REQUEST_STATUSES:
            raise ValueError("Invalid request status selected.")
        return self


class AttachmentRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    original_filename: str
    mime_type: str
    size_bytes: int
    created_by: UserAudit
    created_at: datetime


class RequestNoteCreate(BaseModel):
    summary: str = Field(min_length=1, max_length=160)
    content: str = Field(min_length=1)


class RequestNoteUpdate(BaseModel):
    summary: str | None = Field(default=None, min_length=1, max_length=160)
    content: str | None = Field(default=None, min_length=1)


class RequestNoteAuditRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    from_summary: str | None = None
    to_summary: str | None = None
    from_content: str | None
    to_content: str | None
    changed_by: UserAudit
    changed_at: datetime


class TravelRequestAuditRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    field_name: str
    from_value: str | None
    to_value: str | None
    changed_by: UserAudit
    changed_at: datetime


class RequestPassengerAuditRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    request_passenger_id: int | None
    passenger_label: str | None = None
    field_name: str
    from_value: str | None
    to_value: str | None
    changed_by: UserAudit
    changed_at: datetime


class RequestNoteRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    summary: str
    content: str
    created_by: UserAudit
    updated_by: UserAudit
    created_at: datetime
    updated_at: datetime
    audits: list[RequestNoteAuditRead] = Field(default_factory=list)


class RequestNoteSummaryRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    summary: str
    created_by: UserAudit
    updated_by: UserAudit
    created_at: datetime
    updated_at: datetime


class NamedInclude(BaseModel):
    included: bool = False
    name: str | None = None


class CreditInclude(BaseModel):
    included: bool = False
    amount: Decimal | None = Field(default=None, ge=0)


class ProposedCruiseIncludes(BaseModel):
    drink_package: NamedInclude = Field(default_factory=NamedInclude)
    wifi: NamedInclude = Field(default_factory=NamedInclude)
    tips: bool = False
    excursion: bool = False
    excursion_credit: CreditInclude = Field(default_factory=CreditInclude)
    onboard_credit: CreditInclude = Field(default_factory=CreditInclude)


class ProposedCruiseBase(BaseModel):
    departure_date: date
    cruise_line: str = Field(min_length=1, max_length=120)
    ship: str = Field(min_length=1, max_length=120)
    number_of_nights: int = Field(ge=1, le=365)
    itinerary_name: str = Field(min_length=1, max_length=160)
    room_category: str = Field(min_length=1, max_length=120)
    room_number: str = Field(min_length=1, max_length=40)
    passengers_in_room: int = Field(ge=1, le=20)
    deposit_amount: Decimal = Field(ge=0)
    deposit_due_date: date
    final_payment_due_date: date
    cost: Decimal = Field(ge=0)
    includes: ProposedCruiseIncludes = Field(default_factory=ProposedCruiseIncludes)
    passenger_ids: list[int] = Field(default_factory=list)

    @model_validator(mode="after")
    def validate_dates(self) -> "ProposedCruiseBase":
        if self.final_payment_due_date < self.deposit_due_date:
            raise ValueError("Final payment due date must be on or after the deposit due date.")
        if len(self.passenger_ids) != len(set(self.passenger_ids)):
            raise ValueError("Each passenger can only be selected once.")
        if self.passengers_in_room < len(self.passenger_ids):
            raise ValueError("Passengers in room must be at least the number of attached passengers.")
        return self


class ProposedCruiseCreate(ProposedCruiseBase):
    pass


class GenerateProposedCruisesRequest(BaseModel):
    research_document_id: int


class GenerateProposedCruisesResponse(BaseModel):
    research_document_id: int
    research_document_filename: str
    model: str
    cruises: list[ProposedCruiseCreate]


class BulkProposedCruiseCreate(BaseModel):
    cruises: list[ProposedCruiseCreate] = Field(min_length=1)


class ProposedCruiseUpdate(BaseModel):
    departure_date: date | None = None
    cruise_line: str | None = Field(default=None, min_length=1, max_length=120)
    ship: str | None = Field(default=None, min_length=1, max_length=120)
    number_of_nights: int | None = Field(default=None, ge=1, le=365)
    itinerary_name: str | None = Field(default=None, min_length=1, max_length=160)
    room_category: str | None = Field(default=None, min_length=1, max_length=120)
    room_number: str | None = Field(default=None, min_length=1, max_length=40)
    passengers_in_room: int | None = Field(default=None, ge=1, le=20)
    deposit_amount: Decimal | None = Field(default=None, ge=0)
    deposit_due_date: date | None = None
    final_payment_due_date: date | None = None
    cost: Decimal | None = Field(default=None, ge=0)
    includes: ProposedCruiseIncludes | None = None
    passenger_ids: list[int] | None = None
    status: str | None = Field(default=None, min_length=1, max_length=40)

    @field_validator("status")
    @classmethod
    def validate_status(cls, value: str | None) -> str | None:
        if value is not None and value not in PROPOSED_CRUISE_STATUSES:
            raise ValueError("Invalid proposed cruise status selected.")
        return value


class ProposedCruiseRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    departure_date: date
    cruise_line: str
    ship: str
    number_of_nights: int
    itinerary_name: str
    room_category: str
    room_number: str
    passengers_in_room: int
    deposit_amount: Decimal
    deposit_due_date: date
    final_payment_due_date: date
    cost: Decimal
    includes: ProposedCruiseIncludes
    status: str
    passengers: list[RequestPassengerRead] = Field(default_factory=list)
    created_by: UserAudit
    updated_by: UserAudit
    created_at: datetime
    updated_at: datetime

    @field_validator("includes", mode="before")
    @classmethod
    def normalize_includes(cls, value: Any) -> ProposedCruiseIncludes:
        if isinstance(value, ProposedCruiseIncludes):
            return value
        return ProposedCruiseIncludes.model_validate(value or {})


class BulkProposedCruiseCreateResponse(BaseModel):
    cruises: list[ProposedCruiseRead]


class QuotedInsuranceBase(BaseModel):
    carrier: str = Field(min_length=1, max_length=120)
    premium_cost: Decimal = Field(ge=0)
    plan_name: str = Field(min_length=1, max_length=160)
    cancellation_coverage: Decimal = Field(ge=0)
    medical_coverage: Decimal = Field(ge=0)
    medical_evac_coverage: Decimal = Field(ge=0)


class QuotedInsuranceCreate(QuotedInsuranceBase):
    pass


class QuotedInsuranceUpdate(BaseModel):
    carrier: str | None = Field(default=None, min_length=1, max_length=120)
    premium_cost: Decimal | None = Field(default=None, ge=0)
    plan_name: str | None = Field(default=None, min_length=1, max_length=160)
    cancellation_coverage: Decimal | None = Field(default=None, ge=0)
    medical_coverage: Decimal | None = Field(default=None, ge=0)
    medical_evac_coverage: Decimal | None = Field(default=None, ge=0)
    status: str | None = Field(default=None, min_length=1, max_length=40)

    @field_validator("status")
    @classmethod
    def validate_status(cls, value: str | None) -> str | None:
        if value is not None and value not in QUOTED_INSURANCE_STATUSES:
            raise ValueError("Invalid quoted insurance status selected.")
        return value


class QuotedInsuranceRead(QuotedInsuranceBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    status: str
    declined_at: datetime | None = None
    created_by: UserAudit
    updated_by: UserAudit
    created_at: datetime
    updated_at: datetime


class TravelRequestRead(TravelRequestBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    status: str
    close_reason: str | None = None
    created_by: UserAudit
    updated_by: UserAudit
    created_at: datetime
    updated_at: datetime

    @field_validator("destination_details", mode="before")
    @classmethod
    def normalize_destination_details(cls, value: Any) -> DestinationDetails | None:
        if value is None:
            return None
        if isinstance(value, DestinationDetails):
            return value
        return DestinationDetails.model_validate(value)


class TravelRequestDetailRead(TravelRequestRead):
    last_worked_at: datetime
    last_worked_by: UserAudit
    request_passengers: list[RequestPassengerRead] = Field(default_factory=list)
    request_notes: list[RequestNoteSummaryRead] = Field(default_factory=list)
    call_transcripts: list[AttachmentRead] = Field(default_factory=list)
    chat_logs: list[AttachmentRead] = Field(default_factory=list)
    proposed_cruises: list[ProposedCruiseRead] = Field(default_factory=list)
    quoted_insurance: list[QuotedInsuranceRead] = Field(default_factory=list)
    request_workflows: list["RequestWorkflowRead"] = Field(default_factory=list)
    request_communications: list["RequestCommunicationSummaryRead"] = Field(default_factory=list)
    research_documents: list["ResearchDocumentRead"] = Field(default_factory=list)


class RequestChangeHistoryRead(BaseModel):
    request_audits: list[TravelRequestAuditRead] = Field(default_factory=list)
    passenger_audits: list[RequestPassengerAuditRead] = Field(default_factory=list)


class RequestTaskRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    task_key: str
    title: str
    description: str | None = None
    status: str
    sort_order: int
    due_at: datetime | None = None
    completed_at: datetime | None = None
    completed_by: UserAudit | None = None
    result: dict | None = None
    created_at: datetime
    updated_at: datetime


class RequestWorkflowRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    workflow_type: str
    status: str
    parent_workflow_id: int | None = None
    context: dict | None = None
    started_by: UserAudit
    completed_by: UserAudit | None = None
    tasks: list[RequestTaskRead] = Field(default_factory=list)
    created_at: datetime
    updated_at: datetime
    completed_at: datetime | None = None


class RequestWorkflowCreate(BaseModel):
    workflow_type: str = Field(min_length=1, max_length=40)
    parent_workflow_id: int | None = None

    @field_validator("workflow_type")
    @classmethod
    def validate_workflow_type(cls, value: str) -> str:
        from app.constants import WORKFLOW_TYPES

        if value not in WORKFLOW_TYPES:
            raise ValueError("Invalid workflow type selected.")
        return value


class RequestWorkflowUpdate(BaseModel):
    status: str | None = Field(default=None, min_length=1, max_length=40)

    @field_validator("status")
    @classmethod
    def validate_status(cls, value: str | None) -> str | None:
        from app.constants import WORKFLOW_STATUSES

        if value is not None and value not in WORKFLOW_STATUSES:
            raise ValueError("Invalid workflow status selected.")
        return value


class RequestTaskUpdate(BaseModel):
    status: str | None = Field(default=None, min_length=1, max_length=40)
    due_at: datetime | None = None
    result: dict | None = None
    reached_out: bool | None = None

    @field_validator("status")
    @classmethod
    def validate_status(cls, value: str | None) -> str | None:
        from app.constants import TASK_STATUSES

        if value is not None and value not in TASK_STATUSES:
            raise ValueError("Invalid task status selected.")
        return value


class RequestCommunicationCreate(BaseModel):
    communication_type: str = Field(min_length=1, max_length=40)
    subject: str = Field(min_length=1, max_length=255)
    body: str = Field(min_length=1)
    request_workflow_id: int | None = None
    status: str = Field(default="Draft", min_length=1, max_length=40)

    @field_validator("communication_type")
    @classmethod
    def validate_communication_type(cls, value: str) -> str:
        from app.constants import COMMUNICATION_TYPES

        if value not in COMMUNICATION_TYPES:
            raise ValueError("Invalid communication type selected.")
        return value

    @field_validator("status")
    @classmethod
    def validate_status(cls, value: str) -> str:
        from app.constants import COMMUNICATION_STATUSES

        if value not in COMMUNICATION_STATUSES:
            raise ValueError("Invalid communication status selected.")
        return value


class RequestCommunicationUpdate(BaseModel):
    communication_type: str | None = Field(default=None, min_length=1, max_length=40)
    subject: str | None = Field(default=None, min_length=1, max_length=255)
    body: str | None = Field(default=None, min_length=1)
    status: str | None = Field(default=None, min_length=1, max_length=40)

    @field_validator("communication_type")
    @classmethod
    def validate_communication_type(cls, value: str | None) -> str | None:
        from app.constants import COMMUNICATION_TYPES

        if value is not None and value not in COMMUNICATION_TYPES:
            raise ValueError("Invalid communication type selected.")
        return value

    @field_validator("status")
    @classmethod
    def validate_status(cls, value: str | None) -> str | None:
        from app.constants import COMMUNICATION_STATUSES

        if value is not None and value not in COMMUNICATION_STATUSES:
            raise ValueError("Invalid communication status selected.")
        return value


class RequestCommunicationRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    communication_type: str
    subject: str
    body: str
    status: str
    request_workflow_id: int | None = None
    sent_at: datetime | None = None
    created_by: UserAudit
    updated_by: UserAudit
    created_at: datetime
    updated_at: datetime


class RequestCommunicationSummaryRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    communication_type: str
    subject: str
    status: str
    request_workflow_id: int | None = None
    sent_at: datetime | None = None
    created_by: UserAudit
    updated_by: UserAudit
    created_at: datetime
    updated_at: datetime


class GenerateResearchCommunicationRequest(BaseModel):
    request_workflow_id: int | None = None


class GenerateResearchCommunicationResponse(BaseModel):
    model: str
    proposed_cruise_count: int
    subject: str
    email_subject: str
    body: str
    communication: RequestCommunicationRead


class ResearchDocumentRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    original_filename: str
    mime_type: str
    size_bytes: int
    uploaded_by: UserAudit
    created_at: datetime


class WorkflowTemplateRead(BaseModel):
    workflow_type: str
    name: str
    description: str


class DashboardNextOpenTaskRead(BaseModel):
    id: int
    task_key: str
    title: str
    workflow_type: str
    workflow_name: str


class DashboardOpenRequest(TravelRequestRead):
    is_stale: bool = Field(description="True when last_worked_at is older than the stale threshold.")
    next_open_task: DashboardNextOpenTaskRead | None = None
    last_worked_at: datetime
    last_worked_by: UserAudit


class DashboardResponse(BaseModel):
    open_count: int
    stale_count: int = Field(description="Open requests whose last_worked_at is older than the stale threshold.")
    closed_count: int = Field(description="Requests that have been closed.")
    open_requests: list[DashboardOpenRequest]
