import type { Attachment, AttachmentKind, RequestCommunicationSummary, RequestNoteSummary } from "./types";

export type CommunicationRefKind = AttachmentKind | "email";

export type CommunicationRef = {
  kind: CommunicationRefKind;
  id: number;
};

const AUTO_AI_SUMMARY_PREFIX = "✨ AI Summary · ";

export function communicationRefMarker(ref: CommunicationRef): string {
  return `communication-ref:${ref.kind}:${ref.id}`;
}

export function communicationRefLabel(ref: CommunicationRef, subject: string): string {
  if (ref.kind === "transcripts") {
    return `Call transcript · ${subject}`;
  }
  if (ref.kind === "chats") {
    return `Chat log · ${subject}`;
  }
  return `Email · ${subject}`;
}

export function findAiSummaryNoteId(
  notes: RequestNoteSummary[],
  ref: CommunicationRef,
  subject: string,
): number | null {
  const expectedSummary = `${AUTO_AI_SUMMARY_PREFIX}${communicationRefLabel(ref, subject)}`;
  return notes.find((note) => note.summary === expectedSummary)?.id ?? null;
}

export function buildAttachmentRecord(
  attachment: Attachment,
  kind: AttachmentKind,
  notes: RequestNoteSummary[],
) {
  const ref: CommunicationRef = { kind, id: attachment.id };
  return {
    id: attachment.id,
    kind,
    subject: attachment.original_filename,
    dateTime: attachment.created_at,
    uploadedBy: attachment.created_by.username,
    aiNoteId: findAiSummaryNoteId(notes, ref, attachment.original_filename),
    attachmentKind: kind,
  };
}

export function buildEmailRecord(communication: RequestCommunicationSummary, notes: RequestNoteSummary[]) {
  const ref: CommunicationRef = { kind: "email", id: communication.id };
  return {
    id: communication.id,
    kind: "email" as const,
    subject: communication.subject,
    dateTime: communication.updated_at,
    uploadedBy: communication.updated_by.username,
    aiNoteId: findAiSummaryNoteId(notes, ref, communication.subject),
    communication,
  };
}

export type CommunicationRecord = ReturnType<typeof buildAttachmentRecord> | ReturnType<typeof buildEmailRecord>;
