import { useEffect, useState } from "react";
import { fetchAttachmentContent } from "./api";
import type { Attachment, AttachmentKind } from "./types";
import { formatFileSize, formatTimestamp } from "./utils";

type AttachmentReaderModalProps = {
  open: boolean;
  title: string;
  requestId: number;
  kind: AttachmentKind;
  attachment: Attachment | null;
  onClose: () => void;
};

export default function AttachmentReaderModal({
  open,
  title,
  requestId,
  kind,
  attachment,
  onClose,
}: AttachmentReaderModalProps) {
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open || !attachment) {
      setContent("");
      setError("");
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError("");

    fetchAttachmentContent(requestId, kind, attachment.id)
      .then((text) => {
        if (!cancelled) {
          setContent(text);
        }
      })
      .catch((loadError) => {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : "Unable to load attachment.");
          setContent("");
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [open, attachment, kind, requestId]);

  if (!open || !attachment) {
    return null;
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal-card modal-card-wide attachment-reader-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="attachment-reader-title"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="modal-card-header">
          <h3 id="attachment-reader-title">{title}</h3>
        </header>
        <div className="attachment-reader-meta meta">
          {attachment.original_filename} · {formatFileSize(attachment.size_bytes)} · Added by{" "}
          {attachment.created_by.username} · {formatTimestamp(attachment.created_at)}
        </div>

        <div className="attachment-reader-body">
          {loading ? <p>Loading file...</p> : null}
          {error ? <p className="status error">{error}</p> : null}
          {!loading && !error ? <pre className="attachment-reader-content">{content}</pre> : null}
        </div>

        <div className="modal-actions modal-actions-footer attachment-reader-actions">
          <button type="button" className="modal-secondary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
