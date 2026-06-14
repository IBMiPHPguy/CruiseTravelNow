import { authHeaders } from "./authApi";
import type {
  Attachment,
  AttachmentKind,
  DashboardData,
  RequestNote,
  RequestNoteInput,
  RequestPassenger,
  RequestPassengerInput,
  TravelRequest,
  TravelRequestDetail,
  TravelRequestInput,
  TravelRequestUpdateInput,
  ProposedCruise,
  ProposedCruiseInput,
  QuotedInsurance,
  QuotedInsuranceInput,
} from "./types";

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "/api";

async function parseError(response: Response, fallback: string): Promise<string> {
  const error = await response.json().catch(() => ({ detail: fallback }));
  if (Array.isArray(error.detail)) {
    return (
      error.detail
        .map((item: { msg?: string }) => item.msg)
        .filter(Boolean)
        .join(" ") || fallback
    );
  }
  return typeof error.detail === "string" ? error.detail : fallback;
}

export async function fetchDashboard(): Promise<DashboardData> {
  const response = await fetch(`${API_BASE}/dashboard`, {
    headers: authHeaders(),
  });
  if (!response.ok) {
    throw new Error(await parseError(response, "Unable to load dashboard."));
  }
  return response.json();
}

export async function fetchRequests(): Promise<TravelRequest[]> {
  const response = await fetch(`${API_BASE}/requests`, {
    headers: authHeaders(),
  });
  if (!response.ok) {
    throw new Error(await parseError(response, "Unable to load travel requests."));
  }
  return response.json();
}

export async function fetchRequest(requestId: number): Promise<TravelRequestDetail> {
  const response = await fetch(`${API_BASE}/requests/${requestId}`, {
    headers: authHeaders(),
  });
  if (!response.ok) {
    throw new Error(await parseError(response, "Unable to load travel request."));
  }
  return response.json();
}

export async function createRequest(payload: TravelRequestInput): Promise<TravelRequest> {
  const response = await fetch(`${API_BASE}/requests`, {
    method: "POST",
    headers: authHeaders(true),
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(await parseError(response, "Request failed."));
  }

  return response.json();
}

export async function updateRequest(
  requestId: number,
  payload: TravelRequestUpdateInput,
): Promise<TravelRequestDetail> {
  const response = await fetch(`${API_BASE}/requests/${requestId}`, {
    method: "PATCH",
    headers: authHeaders(true),
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(await parseError(response, "Update failed."));
  }

  return response.json();
}

export async function uploadTranscript(requestId: number, file: File): Promise<Attachment> {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch(`${API_BASE}/requests/${requestId}/transcripts`, {
    method: "POST",
    headers: authHeaders(),
    body: formData,
  });

  if (!response.ok) {
    throw new Error(await parseError(response, "Unable to upload call transcript."));
  }

  return response.json();
}

export async function uploadChatLog(requestId: number, file: File): Promise<Attachment> {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch(`${API_BASE}/requests/${requestId}/chats`, {
    method: "POST",
    headers: authHeaders(),
    body: formData,
  });

  if (!response.ok) {
    throw new Error(await parseError(response, "Unable to upload chat log."));
  }

  return response.json();
}

export async function fetchAttachmentContent(
  requestId: number,
  kind: AttachmentKind,
  attachmentId: number,
): Promise<string> {
  const response = await fetch(`${API_BASE}/requests/${requestId}/${kind}/${attachmentId}/content`, {
    headers: authHeaders(),
  });

  if (!response.ok) {
    throw new Error(await parseError(response, "Unable to load attachment."));
  }

  return response.text();
}

export async function addPassenger(
  requestId: number,
  payload: RequestPassengerInput,
): Promise<RequestPassenger> {
  const response = await fetch(`${API_BASE}/requests/${requestId}/passengers`, {
    method: "POST",
    headers: authHeaders(true),
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(await parseError(response, "Unable to add passenger."));
  }

  return response.json();
}

export async function updatePassenger(
  requestId: number,
  passengerId: number,
  payload: RequestPassengerInput,
): Promise<RequestPassenger> {
  const response = await fetch(`${API_BASE}/requests/${requestId}/passengers/${passengerId}`, {
    method: "PATCH",
    headers: authHeaders(true),
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(await parseError(response, "Unable to update passenger."));
  }

  return response.json();
}

export async function deletePassenger(requestId: number, passengerId: number): Promise<void> {
  const response = await fetch(`${API_BASE}/requests/${requestId}/passengers/${passengerId}`, {
    method: "DELETE",
    headers: authHeaders(),
  });

  if (!response.ok) {
    throw new Error(await parseError(response, "Unable to delete passenger."));
  }
}

export async function addNote(requestId: number, payload: RequestNoteInput): Promise<RequestNote> {
  const response = await fetch(`${API_BASE}/requests/${requestId}/notes`, {
    method: "POST",
    headers: authHeaders(true),
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(await parseError(response, "Unable to add note."));
  }

  return response.json();
}

export async function updateNote(
  requestId: number,
  noteId: number,
  payload: RequestNoteInput,
): Promise<RequestNote> {
  const response = await fetch(`${API_BASE}/requests/${requestId}/notes/${noteId}`, {
    method: "PATCH",
    headers: authHeaders(true),
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(await parseError(response, "Unable to update note."));
  }

  return response.json();
}

export async function addProposedCruise(
  requestId: number,
  payload: ProposedCruiseInput,
): Promise<ProposedCruise> {
  const response = await fetch(`${API_BASE}/requests/${requestId}/proposed-cruises`, {
    method: "POST",
    headers: authHeaders(true),
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(await parseError(response, "Unable to add proposed cruise."));
  }

  return response.json();
}

export async function updateProposedCruise(
  requestId: number,
  cruiseId: number,
  payload: ProposedCruiseInput,
): Promise<ProposedCruise> {
  const response = await fetch(`${API_BASE}/requests/${requestId}/proposed-cruises/${cruiseId}`, {
    method: "PATCH",
    headers: authHeaders(true),
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(await parseError(response, "Unable to update proposed cruise."));
  }

  return response.json();
}

export async function addQuotedInsurance(
  requestId: number,
  payload: QuotedInsuranceInput,
): Promise<QuotedInsurance> {
  const response = await fetch(`${API_BASE}/requests/${requestId}/quoted-insurance`, {
    method: "POST",
    headers: authHeaders(true),
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(await parseError(response, "Unable to add insurance quote."));
  }

  return response.json();
}

export async function updateQuotedInsurance(
  requestId: number,
  quoteId: number,
  payload: QuotedInsuranceInput,
): Promise<QuotedInsurance> {
  const response = await fetch(`${API_BASE}/requests/${requestId}/quoted-insurance/${quoteId}`, {
    method: "PATCH",
    headers: authHeaders(true),
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(await parseError(response, "Unable to update insurance quote."));
  }

  return response.json();
}

export async function fetchHealth(): Promise<{ status: string; service: string }> {
  const response = await fetch(`${API_BASE}/health`);
  if (!response.ok) {
    throw new Error("API health check failed.");
  }
  return response.json();
}
