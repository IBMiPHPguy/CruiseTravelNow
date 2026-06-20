import { useEffect, useRef, useState } from "react";
import { addNote, fetchNote, updateNote } from "./api";
import EditIcon from "./EditIcon";
import HistoryIcon from "./HistoryIcon";
import IconTooltip from "./IconTooltip";
import { isNoteModified } from "./noteForm";
import NoteChangeHistoryModal from "./NoteChangeHistoryModal";
import NoteModal from "./NoteModal";
import NoteViewModal from "./NoteViewModal";
import TabHeaderAddButton from "./TabHeaderAddButton";
import ViewIcon from "./ViewIcon";
import WorkspaceBandHeader from "./WorkspaceBandHeader";
import type { RequestNote, RequestNoteInput, RequestNoteSummary } from "./types";
import { formatTimestamp } from "./utils";

type NotesSectionProps = {
  requestId: number;
  notes: RequestNoteSummary[];
  focusedNoteId?: number | null;
  onFocusedNoteHandled?: () => void;
  disabled: boolean;
  onChanged: () => Promise<void>;
  onError: (message: string) => void;
  embedded?: boolean;
};

export default function NotesSection({
  requestId,
  notes,
  focusedNoteId = null,
  onFocusedNoteHandled,
  disabled,
  onChanged,
  onError,
  embedded = false,
}: NotesSectionProps) {
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  const [activeNote, setActiveNote] = useState<RequestNote | null>(null);
  const [historyNote, setHistoryNote] = useState<RequestNote | null>(null);
  const [saving, setSaving] = useState(false);
  const [loadingNote, setLoadingNote] = useState(false);
  const [loadingHistoryNote, setLoadingHistoryNote] = useState(false);
  const [highlightedNoteId, setHighlightedNoteId] = useState<number | null>(null);
  const handledFocusRef = useRef<number | null>(null);

  useEffect(() => {
    if (!focusedNoteId) {
      handledFocusRef.current = null;
      return;
    }

    if (handledFocusRef.current === focusedNoteId) {
      return;
    }

    const summary = notes.find((note) => note.id === focusedNoteId);
    if (!summary) {
      return;
    }

    handledFocusRef.current = focusedNoteId;
    setHighlightedNoteId(focusedNoteId);
    requestAnimationFrame(() => {
      document.getElementById(`request-note-${focusedNoteId}`)?.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
      });
    });
    void openViewModal(summary).finally(() => {
      onFocusedNoteHandled?.();
    });
  }, [focusedNoteId, notes, onFocusedNoteHandled]);

  async function openHistoryModal(note: RequestNoteSummary) {
    setHistoryModalOpen(true);
    setHistoryNote(null);
    const loaded = await loadNote(note, setLoadingHistoryNote);
    if (loaded) {
      setHistoryNote(loaded);
    } else {
      setHistoryModalOpen(false);
    }
  }

  async function loadNote(
    note: RequestNoteSummary,
    setLoading: (loading: boolean) => void = setLoadingNote,
  ): Promise<RequestNote | null> {
    setLoading(true);
    onError("");
    try {
      return await fetchNote(requestId, note.id);
    } catch (loadError) {
      onError(loadError instanceof Error ? loadError.message : "Unable to load note.");
      return null;
    } finally {
      setLoading(false);
    }
  }

  function openCreateModal() {
    setActiveNote(null);
    setEditModalOpen(true);
  }

  async function openViewModal(note: RequestNoteSummary) {
    setViewModalOpen(true);
    setActiveNote(null);
    const loaded = await loadNote(note);
    if (loaded) {
      setActiveNote(loaded);
    } else {
      setViewModalOpen(false);
    }
  }

  async function openEditModal(note: RequestNoteSummary) {
    setEditModalOpen(true);
    setActiveNote(null);
    const loaded = await loadNote(note);
    if (loaded) {
      setActiveNote(loaded);
    } else {
      setEditModalOpen(false);
    }
  }

  function closeHistoryModal() {
    setHistoryModalOpen(false);
    setHistoryNote(null);
  }

  function closeViewModal() {
    setViewModalOpen(false);
    if (!editModalOpen) {
      setActiveNote(null);
    }
  }

  function closeEditModal() {
    setEditModalOpen(false);
    setActiveNote(null);
  }

  function handleEditFromView() {
    setViewModalOpen(false);
    setEditModalOpen(true);
  }

  async function handleSave(payload: RequestNoteInput) {
    setSaving(true);
    onError("");
    try {
      if (activeNote) {
        await updateNote(requestId, activeNote.id, payload);
      } else {
        await addNote(requestId, payload);
      }
      setEditModalOpen(false);
      setActiveNote(null);
      await onChanged();
    } catch (saveError) {
      onError(saveError instanceof Error ? saveError.message : "Unable to save note.");
    } finally {
      setSaving(false);
    }
  }

  function renderAddNoteButton() {
    if (disabled) {
      return null;
    }

    return <TabHeaderAddButton label="Add Note" onClick={openCreateModal} />;
  }

  function renderTable() {
    return (
      <div className="notes-table-wrap">
        <table className="notes-table">
          <thead>
            <tr>
              <th scope="col">Summary</th>
              <th scope="col">Created</th>
              <th scope="col">Last updated</th>
              <th scope="col" className="notes-table-actions-col">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {notes.length === 0 ? (
              <tr>
                <td colSpan={4} className="notes-table-empty">
                  No notes on this request yet.
                </td>
              </tr>
            ) : (
              notes.map((note) => (
                <tr
                  key={note.id}
                  className={highlightedNoteId === note.id ? "notes-table-row-focused" : undefined}
                  id={highlightedNoteId === note.id ? `request-note-${note.id}` : undefined}
                >
                  <td>
                    <div className="notes-table-summary">
                      <strong title={note.summary}>{note.summary}</strong>
                    </div>
                  </td>
                  <td>
                    <div className="notes-table-meta">
                      <strong>{note.created_by.username}</strong>
                      <span className="meta">{formatTimestamp(note.created_at)}</span>
                    </div>
                  </td>
                  <td>
                    {isNoteModified(note) ? (
                      <div className="notes-table-meta">
                        <strong>{note.updated_by.username}</strong>
                        <span className="meta">{formatTimestamp(note.updated_at)}</span>
                      </div>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="notes-table-actions-col">
                    <div className="item-icon-actions">
                      <IconTooltip label={`View ${note.summary}`} placement="below" align="end" wide>
                        <button
                          type="button"
                          className="icon-button"
                          aria-label={`View ${note.summary}`}
                          onClick={() => void openViewModal(note)}
                        >
                          <ViewIcon />
                        </button>
                      </IconTooltip>
                      {!disabled ? (
                        <IconTooltip label={`Edit ${note.summary}`} placement="below" align="end" wide>
                          <button
                            type="button"
                            className="icon-button"
                            aria-label={`Edit ${note.summary}`}
                            onClick={() => void openEditModal(note)}
                          >
                            <EditIcon />
                          </button>
                        </IconTooltip>
                      ) : null}
                      {isNoteModified(note) ? (
                        <IconTooltip label={`Change history for ${note.summary}`} placement="below" align="end" wide>
                          <button
                            type="button"
                            className="icon-button icon-button-history"
                            aria-label={`Change history for ${note.summary}`}
                            onClick={() => void openHistoryModal(note)}
                          >
                            <HistoryIcon />
                          </button>
                        </IconTooltip>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    );
  }

  const body = renderTable();

  const modals = (
    <>
      <NoteViewModal
        open={viewModalOpen}
        note={activeNote}
        loading={loadingNote}
        disabled={disabled}
        onClose={closeViewModal}
        onEdit={!disabled && activeNote ? handleEditFromView : undefined}
      />

      <NoteChangeHistoryModal
        open={historyModalOpen}
        note={historyNote}
        loading={loadingHistoryNote}
        onClose={closeHistoryModal}
      />

      <NoteModal
        open={editModalOpen}
        note={activeNote}
        saving={saving || loadingNote}
        disabled={disabled}
        onCancel={closeEditModal}
        onSave={handleSave}
      />
    </>
  );

  if (embedded) {
    return (
      <>
        <div className="workspace-panel notes-panel">
          <section className="request-form-band">
            <WorkspaceBandHeader
              title="Notes"
              meta={`${notes.length} on request`}
              actions={renderAddNoteButton()}
            />
            <div className="request-form-band-body">{body}</div>
          </section>
        </div>
        {modals}
      </>
    );
  }

  const addNoteButton = renderAddNoteButton();

  return (
    <>
      <section className="section-card notes-card">
        <header className="section-card-header workspace-band-header--with-actions">
          <div className="workspace-band-header-title-group">
            <h3>Notes</h3>
          </div>
          {addNoteButton ? <div className="workspace-band-header-actions">{addNoteButton}</div> : null}
        </header>
        <div className="section-card-body">{body}</div>
      </section>
      {modals}
    </>
  );
}
