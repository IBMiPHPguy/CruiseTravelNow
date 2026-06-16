import { useEffect, useRef, useState } from "react";
import {
  OTHER_CLOSE_REASONS,
  PRIMARY_CLOSE_REASON,
} from "./formOptions";

type CloseReasonPickerProps = {
  value: string;
  onChange: (value: string) => void;
  includePrimaryReason?: boolean;
};

function reasonClassName(reason: string): string {
  return reason === PRIMARY_CLOSE_REASON ? "close-reason-success" : "close-reason-negative";
}

export default function CloseReasonPicker({
  value,
  onChange,
  includePrimaryReason = true,
}: CloseReasonPickerProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function selectReason(reason: string) {
    onChange(reason);
    setOpen(false);
  }

  return (
    <div className="close-reason-picker" ref={rootRef}>
      <span className="field-label">Close reason</span>
      <button
        type="button"
        className="close-reason-dropdown-trigger"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
      >
        {value ? (
          <span className={reasonClassName(value)}>{value}</span>
        ) : (
          <span className="close-reason-placeholder">Select a close reason</span>
        )}
        <span className="close-reason-chevron" aria-hidden="true">
          ▾
        </span>
      </button>

      {open ? (
        <div className="close-reason-dropdown-menu" role="listbox" aria-label="Close reason">
          {includePrimaryReason ? (
            <>
              <button
                type="button"
                role="option"
                aria-selected={value === PRIMARY_CLOSE_REASON}
                className={`close-reason-dropdown-option ${reasonClassName(PRIMARY_CLOSE_REASON)} ${
                  value === PRIMARY_CLOSE_REASON ? "selected" : ""
                }`}
                onClick={() => selectReason(PRIMARY_CLOSE_REASON)}
              >
                {PRIMARY_CLOSE_REASON}
              </button>
              <hr className="close-reason-divider" />
            </>
          ) : null}
          {OTHER_CLOSE_REASONS.map((reason) => (
            <button
              key={reason}
              type="button"
              role="option"
              aria-selected={value === reason}
              className={`close-reason-dropdown-option ${reasonClassName(reason)} ${
                value === reason ? "selected" : ""
              }`}
              onClick={() => selectReason(reason)}
            >
              {reason}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
