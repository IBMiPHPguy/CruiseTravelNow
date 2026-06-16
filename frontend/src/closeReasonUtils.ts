import { PRIMARY_CLOSE_REASON } from "./formOptions";
import type { TravelRequest } from "./types";

export function closeReasonClassName(reason: string | null | undefined): string {
  if (!reason) {
    return "";
  }
  return reason === PRIMARY_CLOSE_REASON ? "close-reason-success" : "close-reason-negative";
}

export function canReopenClosedRequest(request: TravelRequest): boolean {
  return request.close_reason !== PRIMARY_CLOSE_REASON;
}
