import { useState } from "react";
import { addNote, fetchNote, updateNote } from "./api";
import { isNoteModified } from "./noteForm";
import NoteModal from "./NoteModal";
import type { RequestNote, RequestNoteInput, RequestNoteSummary } from "./types";
import { formatTimestamp } from "./utils";

type NotesSectionProps = {
  requestId: number;
  notes: RequestNoteSummary[];
  disabled: boolean;
  onChanged: () => Promise<void>;
  onError: (message: string) => void;
  embedded?: boolean;
};

function EditIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
    </svg>
  );
}

export default function NotesSection({
  requestId,
  notes,
  disabled,
  onChanged,
  onError,
  embedded = false,
}: NotesSectionProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<RequestNote | null>(null);
  const [saving, setSaving] = useState(false);

  const [loadingNote, setLoadingNote] = useState(false);

  function openCreateModal() {
    setEditingNote(null);
    setModalOpen(true);
  }

  async function openEditModal(note: RequestNoteSummary) {
    setModalOpen(true);
    setLoadingNote(true);
    setEditingNote(null);
    onError("");
    try {
      setEditingNote(await fetchNote(requestId, note.id));
    } catch (loadError) {
      setModalOpen(false);
      onError(loadError instanceof Error ? loadError.message : "Unable to load note.");
    } finally {
      setLoadingNote(false);
    }
  }

  async function handleSave(payload: RequestNoteInput) {
    setSaving(true);
    onError("");
    try {
      if (editingNote) {
        await updateNote(requestId, editingNote.id, payload);
      } else {
        await addNote(requestId, payload);
      }
      setModalOpen(false);
      setEditingNote(null);
      await onChanged();
    } catch (saveError) {
      onError(saveError instanceof Error ? saveError.message : "Unable to save note.");
    } finally {
      setSaving(false);
    }
  }

  const body = (
    <>
      {!disabled ? (
        <button type="button" onClick={openCreateModal}>
          Add note
        </button>
      ) : null}

      {notes.length === 0 ? (
        <p className="meta notes-empty">No notes yet.</p>
      ) : (
        <div className="notes-table-wrap">
          <table className="notes-table">
            <thead>
              <tr>
                <th scope="col">Summary</th>
                <th scope="col">Created</th>
                <th scope="col">Modified</th>
                {!disabled ? <th scope="col" className="notes-table-actions-heading" /> : null}
              </tr>
            </thead>
            <tbody>
              {notes.map((note) => (
                <tr key={note.id}>
                  <td className="notes-table-summary">
                    <button
                      type="button"
                      className="link-button notes-summary-link"
                      title={note.summary}
                      onClick={() => openEditModal(note)}
                    >
                      <span className="attachment-truncate">{note.summary}</span>
                    </button>
                  </td>
                  <td className="notes-table-meta">
                    <strong>{note.created_by.username}</strong>
                    <span className="meta">{formatTimestamp(note.created_at)}</span>
                  </td>
                  <td className="notes-table-meta">
                    {isNoteModified(note) ? (
                      <>
                        <strong>{note.updated_by.username}</strong>
                        <span className="meta">{formatTimestamp(note.updated_at)}</span>
                      </>
                    ) : (
                      <span className="meta">—</span>
                    )}
                  </td>
                  {!disabled ? (
                    <td className="notes-table-actions">
                      <button
                        type="button"
                        className="icon-button"
                        aria-label={`Edit note ${note.summary}`}
                        onClick={() => openEditModal(note)}
                      >
                        <EditIcon />
                      </button>
                    </td>
                  ) : null}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );

  return (
    <>
      {embedded ? (
        body
      ) : (
        <section className="section-card notes-card">
          <header className="section-card-header">
            <h3>Notes</h3>
          </header>
          <div className="section-card-body">{body}</div>
        </section>
      )}

      <NoteModal
        open={modalOpen}
        note={editingNote}
        saving={saving || loadingNote}
        disabled={disabled}
        onCancel={() => {
          setModalOpen(false);
          setEditingNote(null);
        }}
        onSave={handleSave}
      />
    </>
  );
}
