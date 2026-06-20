import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import ProposedCruiseRejectionReasonFields from "./ProposedCruiseRejectionReasonFields";
import {
  buildProposedCruiseRejectionPayload,
  EMPTY_PROPOSED_CRUISE_REJECTION,
  validateProposedCruiseRejectionInput,
} from "./proposedCruiseRejection";
import type { ProposedCruise } from "./types";
import { formatDate } from "./utils";

type ProposedCruiseRejectModalProps = {
  open: boolean;
  cruise: ProposedCruise | null;
  rejecting: boolean;
  onCancel: () => void;
  onConfirm: (payload: ReturnType<typeof buildProposedCruiseRejectionPayload>) => void;
};

export default function ProposedCruiseRejectModal({
  open,
  cruise,
  rejecting,
  onCancel,
  onConfirm,
}: ProposedCruiseRejectModalProps) {
  const [rejection, setRejection] = useState(EMPTY_PROPOSED_CRUISE_REJECTION);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) {
      setRejection(EMPTY_PROPOSED_CRUISE_REJECTION);
      setError("");
    }
  }, [open]);

  if (!open || !cruise) {
    return null;
  }

  function handleConfirm() {
    const validationError = validateProposedCruiseRejectionInput(rejection);
    if (validationError) {
      setError(validationError);
      return;
    }
    setError("");
    onConfirm(buildProposedCruiseRejectionPayload(rejection));
  }

  return createPortal(
    <div className="modal-backdrop" role="presentation" onClick={rejecting ? undefined : onCancel}>
      <div
        className="modal-card proposed-cruise-reject-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="proposed-cruise-reject-title"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="modal-card-header">
          <h3 id="proposed-cruise-reject-title">Reject proposed cruise</h3>
        </header>
        <div className="modal-card-body">
          <p className="proposed-cruise-reject-summary">
            <strong>
              {cruise.cruise_line} · {cruise.ship}
            </strong>
            <span className="meta">
              Departs {formatDate(cruise.departure_date)} · {cruise.itinerary_name}
            </span>
          </p>
          <ProposedCruiseRejectionReasonFields
            idPrefix={`reject-cruise-${cruise.id}`}
            value={rejection}
            disabled={rejecting}
            onChange={setRejection}
          />
          {error ? <p className="status error">{error}</p> : null}
        </div>
        <footer className="modal-card-footer">
          <button type="button" className="modal-ghost" disabled={rejecting} onClick={onCancel}>
            Cancel
          </button>
          <button type="button" className="modal-primary danger-button" disabled={rejecting} onClick={handleConfirm}>
            {rejecting ? "Rejecting..." : "Reject cruise"}
          </button>
        </footer>
      </div>
    </div>,
    document.body,
  );
}
