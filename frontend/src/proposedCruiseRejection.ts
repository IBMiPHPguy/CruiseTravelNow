import {
  PROPOSED_CRUISE_REJECTION_REASON_OTHER,
  type ProposedCruiseRejectionReason,
} from "./formOptions";
import type { ProposedCruise } from "./types";

export type ProposedCruiseRejectionInput = {
  rejection_reason: ProposedCruiseRejectionReason | "";
  rejection_reason_detail: string;
};

export const EMPTY_PROPOSED_CRUISE_REJECTION: ProposedCruiseRejectionInput = {
  rejection_reason: "",
  rejection_reason_detail: "",
};

export function formatProposedCruiseRejectionReason(cruise: ProposedCruise): string | null {
  if (!cruise.rejection_reason) {
    return null;
  }
  if (cruise.rejection_reason === PROPOSED_CRUISE_REJECTION_REASON_OTHER) {
    return cruise.rejection_reason_detail?.trim() || "Other";
  }
  return cruise.rejection_reason;
}

export function validateProposedCruiseRejectionInput(
  input: ProposedCruiseRejectionInput,
): string | null {
  if (!input.rejection_reason) {
    return "Select a rejection reason.";
  }
  if (
    input.rejection_reason === PROPOSED_CRUISE_REJECTION_REASON_OTHER &&
    !input.rejection_reason_detail.trim()
  ) {
    return "Enter a rejection reason when Other is selected.";
  }
  return null;
}

export function buildProposedCruiseRejectionPayload(input: ProposedCruiseRejectionInput): {
  rejection_reason: ProposedCruiseRejectionReason;
  rejection_reason_detail?: string;
} {
  return {
    rejection_reason: input.rejection_reason as ProposedCruiseRejectionReason,
    rejection_reason_detail:
      input.rejection_reason === PROPOSED_CRUISE_REJECTION_REASON_OTHER
        ? input.rejection_reason_detail.trim()
        : undefined,
  };
}
