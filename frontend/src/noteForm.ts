import { formatAuditValue, matchesAuditSearch } from "./auditLabels";
import type { RequestNote, RequestNoteAudit, RequestNoteInput } from "./types";
import { formatTimestamp } from "./utils";

export type { RequestNoteInput };

export type NoteHistoryEntry = {
  id: string;
  audit: RequestNoteAudit;
  field: "summary" | "content";
  fieldLabel: string;
  fromValue: string | null;
  toValue: string | null;
};

export const emptyNoteForm: RequestNoteInput = {
  summary: "",
  content: "",
};

export const NOTE_SUMMARY_MAX_LENGTH = 160;

export function noteToForm(note: RequestNote): RequestNoteInput {
  return {
    summary: note.summary,
    content: note.content,
  };
}

export function isNoteModified(note: RequestNote): boolean {
  return note.updated_at !== note.created_at || note.created_by.id !== note.updated_by.id;
}

export function formatNoteAuditLabel(audit: RequestNoteAudit): string {
  const isCreate =
    audit.from_summary === null &&
    audit.from_content === null &&
    (audit.to_summary !== null || audit.to_content !== null);

  if (isCreate) {
    return "Note created";
  }

  const summaryChanged = audit.from_summary !== null || audit.to_summary !== null;
  const contentChanged = audit.from_content !== null || audit.to_content !== null;

  if (summaryChanged && contentChanged) {
    return "Summary and note updated";
  }
  if (summaryChanged) {
    return "Summary updated";
  }
  return "Note updated";
}

export function flattenNoteAudits(audits: RequestNoteAudit[]): NoteHistoryEntry[] {
  const entries: NoteHistoryEntry[] = [];

  for (const audit of audits) {
    const hasSummary = audit.from_summary !== null || audit.to_summary !== null;
    const hasContent = audit.from_content !== null || audit.to_content !== null;

    if (hasSummary) {
      entries.push({
        id: `${audit.id}-summary`,
        audit,
        field: "summary",
        fieldLabel: "Summary",
        fromValue: audit.from_summary,
        toValue: audit.to_summary,
      });
    }

    if (hasContent) {
      entries.push({
        id: `${audit.id}-content`,
        audit,
        field: "content",
        fieldLabel: "Note",
        fromValue: audit.from_content,
        toValue: audit.to_content,
      });
    }
  }

  return entries.sort((left, right) => {
    const timeDiff =
      new Date(right.audit.changed_at).getTime() - new Date(left.audit.changed_at).getTime();
    if (timeDiff !== 0) {
      return timeDiff;
    }
    if (left.audit.id !== right.audit.id) {
      return right.audit.id - left.audit.id;
    }
    return left.field === "summary" ? -1 : 1;
  });
}

export function buildNoteAuditSearchText(entry: NoteHistoryEntry): string {
  return [
    "note",
    entry.fieldLabel,
    entry.field,
    formatNoteAuditLabel(entry.audit),
    entry.fromValue,
    formatAuditValue(entry.fromValue),
    entry.toValue,
    formatAuditValue(entry.toValue),
    entry.audit.changed_by.username,
    formatTimestamp(entry.audit.changed_at),
  ]
    .filter(Boolean)
    .join(" ");
}

export { matchesAuditSearch };
