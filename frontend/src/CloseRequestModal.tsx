import { useEffect, useState } from "react";
import CloseReasonPicker from "./CloseReasonPicker";
import { PRIMARY_CLOSE_REASON } from "./formOptions";
import RequestSummary from "./RequestSummary";
import type { TravelRequest } from "./types";

type CloseRequestModalProps = {
  open: boolean;
  request: TravelRequest;
  closing: boolean;
  onCancel: () => void;
  onConfirm: (closeReason: string) => void;
};

export default function CloseRequestModal({
  open,
  request,
  closing,
  onCancel,
  onConfirm,
}: CloseRequestModalProps) {
  const [step, setStep] = useState<"select" | "confirm">("select");
  const [closeReason, setCloseReason] = useState("");

  useEffect(() => {
    if (!open) {
      setStep("select");
      setCloseReason("");
    }
  }, [open]);

  if (!open) {
    return null;
  }

  function handleContinue() {
    if (!closeReason) {
      return;
    }
    setStep("confirm");
  }

  return (
    <div className="modal-backdrop" role="presentation" onClick={onCancel}>
      <div
        className="modal-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="close-request-title"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="modal-card-header">
          <h3 id="close-request-title">{step === "select" ? "Close request" : "Confirm close"}</h3>
        </header>

        <div className="modal-card-body">
          <RequestSummary request={request} />

          {step === "select" ? (
            <>
              <p>Select a close reason for this request.</p>
              <CloseReasonPicker value={closeReason} onChange={setCloseReason} />
              <div className="modal-actions">
                <button type="button" className="secondary-button modal-secondary" onClick={onCancel}>
                  Cancel
                </button>
                <button
                  type="button"
                  className="danger-button"
                  disabled={!closeReason}
                  onClick={handleContinue}
                >
                  Continue
                </button>
              </div>
            </>
          ) : (
            <>
              <p>Close this request with reason:</p>
              <p
                className={
                  closeReason === PRIMARY_CLOSE_REASON
                    ? "confirm-reason confirm-reason-success"
                    : "confirm-reason confirm-reason-negative"
                }
              >
                {closeReason}
              </p>
              <p className="field-hint">This action cannot be undone from the request form.</p>
              <div className="modal-actions">
                <button
                  type="button"
                  className="secondary-button modal-secondary"
                  disabled={closing}
                  onClick={() => setStep("select")}
                >
                  Back
                </button>
                <button
                  type="button"
                  className="danger-button"
                  disabled={closing}
                  onClick={() => onConfirm(closeReason)}
                >
                  {closing ? "Closing..." : "Confirm close"}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
