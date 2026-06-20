import { useEffect, useState } from "react";
import { fetchResearchDocumentContent } from "./api";
import type { ResearchDocument } from "./types";
import { formatFileSize, formatTimestamp } from "./utils";

type ResearchDocumentReaderModalProps = {
  open: boolean;
  requestId: number;
  document: ResearchDocument | null;
  onClose: () => void;
};

export default function ResearchDocumentReaderModal({
  open,
  requestId,
  document,
  onClose,
}: ResearchDocumentReaderModalProps) {
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open || !document) {
      setContent("");
      setError("");
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError("");

    fetchResearchDocumentContent(requestId, document.id)
      .then((text) => {
        if (!cancelled) {
          setContent(text);
        }
      })
      .catch((loadError) => {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : "Unable to load research document.");
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
  }, [open, document, requestId]);

  if (!open || !document) {
    return null;
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal-card modal-card-wide attachment-reader-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="research-document-reader-title"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="modal-card-header">
          <h3 id="research-document-reader-title">Research document</h3>
        </header>
        <div className="modal-meta-row attachment-reader-meta">
          <span>{document.original_filename}</span>
          <span className="modal-meta-separator" aria-hidden="true">
            |
          </span>
          <span>{formatFileSize(document.size_bytes)}</span>
          <span className="modal-meta-separator" aria-hidden="true">
            |
          </span>
          <span>Uploaded by {document.uploaded_by.username}</span>
          <span className="modal-meta-separator" aria-hidden="true">
            |
          </span>
          <span>{formatTimestamp(document.created_at)}</span>
        </div>

        <div className="attachment-reader-body">
          {loading ? <p>Loading file...</p> : null}
          {error ? <p className="status error">{error}</p> : null}
          {!loading && !error ? (
            <div className="modal-section-panel">
              <pre className="attachment-reader-content">{content}</pre>
            </div>
          ) : null}
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
