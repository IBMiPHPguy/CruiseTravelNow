from fastapi import HTTPException
from sqlalchemy.orm import Session, joinedload

from app.attachment_storage import read_attachment_text
from app.config import settings
from app.constants import REQUEST_STATUS_CLOSED
from app.gemini_service import (
    GeminiConfigurationError,
    GeminiParseError,
    generate_communication_ai_summary,
)
from app.models import CallTranscript, ChatLog, TravelRequest
from app.services.gemini_context_service import build_request_context_for_gemini

AUTO_AI_SUMMARY_PREFIX = "✨ AI Summary · "

_COMMUNICATION_KIND_LABELS = {
    "transcripts": "Call transcript",
    "chats": "Chat log",
}


def communication_ref_marker(kind: str, attachment_id: int) -> str:
    return f"communication-ref:{kind}:{attachment_id}"


def communication_ref_label(kind: str, filename: str) -> str:
    return f"{_COMMUNICATION_KIND_LABELS.get(kind, 'Communication')} · {filename}"


def build_ai_summary_note_fields(
    *,
    kind: str,
    attachment_id: int,
    filename: str,
    summary_text: str,
    research_brief: str,
) -> dict[str, str]:
    label = communication_ref_label(kind, filename)
    note_summary = f"{AUTO_AI_SUMMARY_PREFIX}{label}"
    if len(note_summary) > 160:
        note_summary = note_summary[:159] + "…"

    content = (
        f"{communication_ref_marker(kind, attachment_id)}\n\n"
        f"## Summary\n\n{summary_text.strip()}\n\n"
        f"## Research Brief\n\n{research_brief.strip()}\n\n"
        f"## Source\n\n- {label}\n"
    )
    return {"summary": note_summary, "content": content}


def _load_request_for_ai(db: Session, request_id: int) -> TravelRequest:
    request = (
        db.query(TravelRequest)
        .options(joinedload(TravelRequest.request_passengers))
        .filter(TravelRequest.id == request_id)
        .one_or_none()
    )
    if request is None:
        raise HTTPException(status_code=404, detail="Travel request not found.")
    if request.status == REQUEST_STATUS_CLOSED:
        raise HTTPException(status_code=400, detail="Closed requests cannot be updated.")
    return request


def _read_transcript_text(transcript: CallTranscript) -> str:
    return read_attachment_text(
        settings.attachments_dir,
        transcript.stored_path,
        transcript.mime_type,
    )


def _read_chat_log_text(chat_log: ChatLog) -> str:
    return read_attachment_text(
        settings.attachments_dir,
        chat_log.stored_path,
        chat_log.mime_type,
    )


def generate_transcript_ai_summary_note(
    db: Session,
    *,
    request_id: int,
    transcript_id: int,
) -> dict[str, str]:
    request = _load_request_for_ai(db, request_id)
    transcript = db.get(CallTranscript, transcript_id)
    if transcript is None or transcript.travel_request_id != request_id:
        raise HTTPException(status_code=404, detail="Call transcript not found.")

    return _generate_attachment_ai_summary_note(
        request=request,
        kind="transcripts",
        attachment_id=transcript.id,
        filename=transcript.original_filename,
        communication_text=_read_transcript_text(transcript),
    )


def generate_chat_log_ai_summary_note(
    db: Session,
    *,
    request_id: int,
    chat_id: int,
) -> dict[str, str]:
    request = _load_request_for_ai(db, request_id)
    chat_log = db.get(ChatLog, chat_id)
    if chat_log is None or chat_log.travel_request_id != request_id:
        raise HTTPException(status_code=404, detail="Chat log not found.")

    return _generate_attachment_ai_summary_note(
        request=request,
        kind="chats",
        attachment_id=chat_log.id,
        filename=chat_log.original_filename,
        communication_text=_read_chat_log_text(chat_log),
    )


def _generate_attachment_ai_summary_note(
    *,
    request: TravelRequest,
    kind: str,
    attachment_id: int,
    filename: str,
    communication_text: str,
) -> dict[str, str]:
    try:
        summary_text, research_brief = generate_communication_ai_summary(
            api_key=settings.gemini_api_key or "",
            model_name=settings.gemini_model,
            communication_kind=kind,
            filename=filename,
            communication_text=communication_text,
            request_context=build_request_context_for_gemini(request),
        )
    except GeminiConfigurationError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except GeminiParseError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc

    return build_ai_summary_note_fields(
        kind=kind,
        attachment_id=attachment_id,
        filename=filename,
        summary_text=summary_text,
        research_brief=research_brief,
    )
