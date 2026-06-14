import re
from pathlib import Path
from uuid import uuid4

from fastapi import HTTPException, UploadFile
from sqlalchemy import text
from sqlalchemy.orm import Session

ALLOWED_EXTENSIONS = {".txt", ".md", ".csv", ".json", ".log", ".vtt", ".srt"}
MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024
TEXT_MIME_PREFIXES = ("text/",)
TEXT_MIME_TYPES = {
    "application/json",
    "application/csv",
    "application/x-subrip",
}


def attachments_root(attachments_dir: str) -> Path:
    root = Path(attachments_dir)
    root.mkdir(parents=True, exist_ok=True)
    return root


def sanitize_filename(filename: str) -> str:
    cleaned = Path(filename or "upload.txt").name.strip()
    cleaned = re.sub(r"[^\w.\- ]", "_", cleaned)
    return cleaned[:200] or "upload.txt"


def validate_upload(filename: str, size_bytes: int) -> None:
    extension = Path(filename).suffix.lower()
    if extension not in ALLOWED_EXTENSIONS:
        allowed = ", ".join(sorted(ALLOWED_EXTENSIONS))
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type. Allowed extensions: {allowed}.",
        )
    if size_bytes <= 0:
        raise HTTPException(status_code=400, detail="Uploaded file is empty.")
    if size_bytes > MAX_ATTACHMENT_BYTES:
        raise HTTPException(status_code=400, detail="Uploaded file is too large (max 10 MB).")


def resolve_mime_type(filename: str, content_type: str | None) -> str:
    if content_type and content_type != "application/octet-stream":
        return content_type
    extension = Path(filename).suffix.lower()
    mapping = {
        ".txt": "text/plain",
        ".md": "text/markdown",
        ".csv": "text/csv",
        ".json": "application/json",
        ".log": "text/plain",
        ".vtt": "text/vtt",
        ".srt": "application/x-subrip",
    }
    return mapping.get(extension, "text/plain")


def relative_storage_path(request_id: int, kind: str, stored_name: str) -> str:
    return f"requests/{request_id}/{kind}/{stored_name}"


async def read_upload_file(upload: UploadFile) -> tuple[bytes, str, str, int]:
    filename = sanitize_filename(upload.filename or "upload.txt")
    content = await upload.read()
    size_bytes = len(content)
    validate_upload(filename, size_bytes)
    mime_type = resolve_mime_type(filename, upload.content_type)
    return content, filename, mime_type, size_bytes


def write_bytes(attachments_dir: str, relative_path: str, content: bytes) -> None:
    target = attachments_root(attachments_dir) / relative_path
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_bytes(content)


async def store_upload_file(
    attachments_dir: str,
    request_id: int,
    kind: str,
    upload: UploadFile,
) -> tuple[str, str, str, int]:
    content, filename, mime_type, size_bytes = await read_upload_file(upload)
    stored_name = f"{uuid4().hex}_{filename}"
    relative_path = relative_storage_path(request_id, kind, stored_name)
    write_bytes(attachments_dir, relative_path, content)
    return relative_path, filename, mime_type, size_bytes


def read_attachment_text(attachments_dir: str, relative_path: str, mime_type: str) -> str:
    if not is_text_mime(mime_type):
        raise HTTPException(status_code=415, detail="This file type must be downloaded instead of previewed.")
    target = attachments_root(attachments_dir) / relative_path
    if not target.is_file():
        raise HTTPException(status_code=404, detail="Attachment file not found.")
    return target.read_text(encoding="utf-8", errors="replace")


def is_text_mime(mime_type: str) -> bool:
    lowered = mime_type.lower()
    return lowered.startswith(TEXT_MIME_PREFIXES) or lowered in TEXT_MIME_TYPES


def column_exists(db: Session, table_name: str, column_name: str) -> bool:
    result = db.execute(
        text(
            """
            SELECT COUNT(*)
            FROM information_schema.COLUMNS
            WHERE TABLE_SCHEMA = DATABASE()
              AND TABLE_NAME = :table_name
              AND COLUMN_NAME = :column_name
            """
        ),
        {"table_name": table_name, "column_name": column_name},
    ).scalar()
    return bool(result)


def migrate_legacy_attachment_content(db: Session, attachments_dir: str) -> None:
    for table_name, kind in (
        ("call_transcripts", "transcripts"),
        ("chat_logs", "chats"),
    ):
        if not column_exists(db, table_name, "content"):
            continue
        if not column_exists(db, table_name, "stored_path"):
            continue

        rows = db.execute(
            text(
                f"""
                SELECT id, travel_request_id, content
                FROM {table_name}
                WHERE (stored_path IS NULL OR stored_path = '')
                  AND content IS NOT NULL
                  AND content <> ''
                """
            )
        ).mappings()

        for row in rows:
            record_id = row["id"]
            request_id = row["travel_request_id"]
            filename = f"transcript-{record_id}.txt" if kind == "transcripts" else f"chat-{record_id}.txt"
            stored_name = f"{uuid4().hex}_{filename}"
            relative_path = relative_storage_path(request_id, kind, stored_name)
            content_bytes = str(row["content"]).encode("utf-8")
            write_bytes(attachments_dir, relative_path, content_bytes)
            db.execute(
                text(
                    f"""
                    UPDATE {table_name}
                    SET original_filename = :original_filename,
                        stored_path = :stored_path,
                        mime_type = 'text/plain',
                        size_bytes = :size_bytes
                    WHERE id = :record_id
                    """
                ),
                {
                    "original_filename": filename,
                    "stored_path": relative_path,
                    "size_bytes": len(content_bytes),
                    "record_id": record_id,
                },
            )

        db.commit()

        empty_rows = db.execute(
            text(
                f"""
                SELECT COUNT(*)
                FROM {table_name}
                WHERE stored_path IS NULL OR stored_path = ''
                """
            )
        ).scalar()
        if empty_rows:
            continue

        db.execute(text(f"ALTER TABLE {table_name} DROP COLUMN content"))
        db.execute(
            text(
                f"""
                ALTER TABLE {table_name}
                    MODIFY original_filename VARCHAR(255) NOT NULL,
                    MODIFY stored_path VARCHAR(500) NOT NULL,
                    MODIFY mime_type VARCHAR(120) NOT NULL,
                    MODIFY size_bytes INT NOT NULL
                """
            )
        )
        db.commit()
