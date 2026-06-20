import { useEffect, useMemo, useState } from "react";
import { formatAuditValue } from "./auditLabels";
import {
  buildNoteAuditSearchText,
  getTrueNoteChangeEntries,
  matchesAuditSearch,
  type NoteHistoryEntry,
} from "./noteForm";
import type { RequestNote } from "./types";
import { formatTimestamp } from "./utils";

type NoteChangeHistoryModalProps = {
  open: boolean;
  note: RequestNote | null;
  loading: boolean;
  onClose: () => void;
};

function NoteChangeHistoryRow({ entry }: { entry: NoteHistoryEntry }) {
  return (
    <tr>
      <td className="meta note-history-table-changed">{formatTimestamp(entry.audit.changed_at)}</td>
      <td>
        <span className="note-history-field-tag">{entry.fieldLabel}</span>
      </td>
      <td>{entry.audit.changed_by.username}</td>
      <td className="note-history-table-value">{formatAuditValue(entry.fromValue)}</td>
      <td className="note-history-table-value">{formatAuditValue(entry.toValue)}</td>
    </tr>
  );
}

export default function NoteChangeHistoryModal({
  open,
  note,
  loading,
  onClose,
}: NoteChangeHistoryModalProps) {
  const [searchQuery, setSearchQuery] = useState("");

  const entries = useMemo(
    () => (note ? getTrueNoteChangeEntries(note.audits) : []),
    [note],
  );

  const filteredEntries = useMemo(() => {
    const trimmed = searchQuery.trim();
    if (!trimmed) {
      return entries;
    }
    return entries.filter((entry) => matchesAuditSearch(buildNoteAuditSearchText(entry), trimmed));
  }, [entries, searchQuery]);

  const isSearching = searchQuery.trim().length > 0;

  useEffect(() => {
    if (!open) {
      setSearchQuery("");
    }
  }, [open, note?.id]);

  if (!open) {
    return null;
  }

  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <div
        className="modal-card modal-card-wide note-change-history-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="note-change-history-title"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="modal-card-header">
          <h3 id="note-change-history-title">{note?.summary ?? "Change history"}</h3>
        </header>

        <div className="modal-scroll-body note-change-history-modal-body">
          {loading ? <p className="meta">Loading change history...</p> : null}

          {!loading && note ? (
            <>
              <div className="modal-meta-row">
                <span>
                  {isSearching
                    ? `${filteredEntries.length} of ${entries.length} change${entries.length === 1 ? "" : "s"}`
                    : `${entries.length} change${entries.length === 1 ? "" : "s"}`}
                </span>
                <span className="modal-meta-separator" aria-hidden="true">
                  |
                </span>
                <span>Created by {note.created_by.username}</span>
                <span className="modal-meta-separator" aria-hidden="true">
                  |
                </span>
                <span>{formatTimestamp(note.created_at)}</span>
              </div>

              {entries.length === 0 ? (
                <p className="meta">No edits recorded for this note.</p>
              ) : (
                <>
                  <label className="note-history-search">
                    Search change history
                    <input
                      type="search"
                      value={searchQuery}
                      placeholder="Field, user, old or new value..."
                      onChange={(event) => setSearchQuery(event.target.value)}
                    />
                  </label>

                  {filteredEntries.length === 0 ? (
                    <p className="meta">
                      {isSearching
                        ? `No changes match "${searchQuery.trim()}".`
                        : "No edits recorded for this note."}
                    </p>
                  ) : (
                    <div className="note-history-table-wrap">
                      <table className="note-history-table">
                        <thead>
                          <tr>
                            <th scope="col">Date / time</th>
                            <th scope="col">Field</th>
                            <th scope="col">Changed by</th>
                            <th scope="col">From</th>
                            <th scope="col">To</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredEntries.map((entry) => (
                            <NoteChangeHistoryRow entry={entry} key={entry.id} />
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </>
              )}
            </>
          ) : null}

          {!loading && !note ? <p className="meta">Unable to load change history.</p> : null}
        </div>

        <div className="modal-actions modal-actions-footer">
          <button type="button" className="modal-secondary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
