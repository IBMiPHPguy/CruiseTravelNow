import { PROPOSED_CRUISE_REJECTION_REASON_OTHER, PROPOSED_CRUISE_REJECTION_REASONS } from "./formOptions";
import type { ProposedCruiseRejectionInput } from "./proposedCruiseRejection";

type ProposedCruiseRejectionReasonFieldsProps = {
  value: ProposedCruiseRejectionInput;
  onChange: (value: ProposedCruiseRejectionInput) => void;
  disabled?: boolean;
  idPrefix?: string;
};

export default function ProposedCruiseRejectionReasonFields({
  value,
  onChange,
  disabled = false,
  idPrefix = "proposed-cruise-rejection",
}: ProposedCruiseRejectionReasonFieldsProps) {
  const reasonId = `${idPrefix}-reason`;
  const detailId = `${idPrefix}-detail`;

  return (
    <div className="proposed-cruise-rejection-fields">
      <label className="proposed-cruise-rejection-label" htmlFor={reasonId}>
        Rejected reason
        <select
          id={reasonId}
          value={value.rejection_reason}
          disabled={disabled}
          onChange={(event) =>
            onChange({
              ...value,
              rejection_reason: event.target.value as ProposedCruiseRejectionInput["rejection_reason"],
              rejection_reason_detail:
                event.target.value === PROPOSED_CRUISE_REJECTION_REASON_OTHER
                  ? value.rejection_reason_detail
                  : "",
            })
          }
        >
          <option value="">Select a reason</option>
          {PROPOSED_CRUISE_REJECTION_REASONS.map((reason) => (
            <option key={reason} value={reason}>
              {reason}
            </option>
          ))}
        </select>
      </label>

      {value.rejection_reason === PROPOSED_CRUISE_REJECTION_REASON_OTHER ? (
        <label className="proposed-cruise-rejection-label" htmlFor={detailId}>
          Rejection details
          <textarea
            id={detailId}
            rows={3}
            value={value.rejection_reason_detail}
            disabled={disabled}
            placeholder="Describe why this option was rejected"
            onChange={(event) =>
              onChange({
                ...value,
                rejection_reason_detail: event.target.value,
              })
            }
          />
        </label>
      ) : null}
    </div>
  );
}
