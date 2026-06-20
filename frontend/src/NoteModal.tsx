import { FormEvent, useEffect, useState } from "react";
import { emptyNoteForm, NOTE_SUMMARY_MAX_LENGTH, noteToForm } from "./noteForm";
import type { RequestNote, RequestNoteInput } from "./types";

type NoteModalProps = {
  open: boolean;
  note: RequestNote | null;
  saving: boolean;
  disabled: boolean;
  onCancel: () => void;
  onSave: (payload: RequestNoteInput) => Promise<void>;
};

export default function NoteModal({
  open,
  note,
  saving,
  disabled,
  onCancel,
  onSave,
}: NoteModalProps) {
  const [form, setForm] = useState<RequestNoteInput>(emptyNoteForm);

  useEffect(() => {
    if (!open) {
      setForm(emptyNoteForm);
      return;
    }
    setForm(note ? noteToForm(note) : emptyNoteForm);
  }, [open, note]);

  if (!open) {
    return null;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (disabled || !form.summary.trim() || !form.content.trim()) {
      return;
    }
    await onSave({
      summary: form.summary.trim(),
      content: form.content.trim(),
    });
  }

  return (
    <div className="modal-backdrop" role="presentation" onClick={onCancel}>
      <div
        className="modal-card modal-card-wide note-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="note-modal-title"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="modal-card-header">
          <h3 id="note-modal-title">{note ? "Edit note" : "Add note"}</h3>
        </header>

        <form className="modal-form-layout" onSubmit={handleSubmit}>
          <div className="modal-scroll-body note-form">
            <div className="modal-section-panel">
              <label>
                Summary
                <input
                  required
                  maxLength={NOTE_SUMMARY_MAX_LENGTH}
                  disabled={disabled || saving}
                  value={form.summary}
                  placeholder="Short description shown in the notes list"
                  onChange={(event) => setForm({ ...form, summary: event.target.value })}
                />
              </label>
              <div className="field-hint">
                {form.summary.length}/{NOTE_SUMMARY_MAX_LENGTH} characters
              </div>

              <label>
                Note
                <textarea
                  required
                  rows={8}
                  disabled={disabled || saving}
                  value={form.content}
                  placeholder="Enter the full note details"
                  onChange={(event) => setForm({ ...form, content: event.target.value })}
                />
              </label>
            </div>
          </div>

          <div className="modal-actions modal-actions-footer">
            <button type="button" className="modal-secondary" disabled={saving} onClick={onCancel}>
              Cancel
            </button>
            {!disabled ? (
              <button type="submit" className="modal-primary" disabled={saving || !form.summary.trim() || !form.content.trim()}>
                {saving ? "Saving..." : note ? "Save note" : "Add note"}
              </button>
            ) : null}
          </div>
        </form>
      </div>
    </div>
  );
}
