import type { RequestNote } from "./types";
import { formatTimestamp } from "./utils";

type NoteViewModalProps = {
  open: boolean;
  note: RequestNote | null;
  loading: boolean;
  disabled: boolean;
  onClose: () => void;
  onEdit?: () => void;
};

export default function NoteViewModal({
  open,
  note,
  loading,
  disabled,
  onClose,
  onEdit,
}: NoteViewModalProps) {
  if (!open) {
    return null;
  }

  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <div
        className="modal-card modal-card-wide note-view-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="note-view-modal-title"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="modal-card-header">
          <h3 id="note-view-modal-title">{note?.summary ?? "View note"}</h3>
        </header>

        {loading ? (
          <div className="modal-scroll-body note-view-modal-body">
            <p className="meta">Loading note...</p>
          </div>
        ) : note ? (
          <div className="modal-scroll-body note-view-modal-body">
            <div className="modal-meta-row note-view-modal-meta">
              <span>Created by {note.created_by.username}</span>
              <span className="modal-meta-separator" aria-hidden="true">
                |
              </span>
              <span>{formatTimestamp(note.created_at)}</span>
              {note.updated_at !== note.created_at || note.created_by.id !== note.updated_by.id ? (
                <>
                  <span className="modal-meta-separator" aria-hidden="true">
                    |
                  </span>
                  <span>Updated by {note.updated_by.username}</span>
                  <span className="modal-meta-separator" aria-hidden="true">
                    |
                  </span>
                  <span>{formatTimestamp(note.updated_at)}</span>
                </>
              ) : null}
            </div>

            <div className="modal-section-panel note-view-modal-content">
              <h4 className="note-view-modal-content-label">Note</h4>
              <div className="note-view-modal-content-body">{note.content}</div>
            </div>
          </div>
        ) : (
          <div className="modal-scroll-body note-view-modal-body">
            <p className="meta">Unable to load this note.</p>
          </div>
        )}

        <div className="modal-actions modal-actions-footer">
          <button type="button" className="modal-secondary" onClick={onClose}>
            Close
          </button>
          {!disabled && note && onEdit ? (
            <button type="button" className="modal-primary" onClick={onEdit}>
              Edit note
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
