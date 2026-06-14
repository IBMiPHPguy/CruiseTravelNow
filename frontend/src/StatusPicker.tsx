import { useEffect, useRef, useState } from "react";

type StatusPickerProps = {
  label: string;
  value: string;
  options: readonly string[];
  onChange: (value: string) => void;
  disabled?: boolean;
  getOptionClassName?: (option: string) => string;
};

export default function StatusPicker({
  label,
  value,
  options,
  onChange,
  disabled = false,
  getOptionClassName,
}: StatusPickerProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (open && menuRef.current) {
      menuRef.current.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }
  }, [open]);

  function selectOption(option: string) {
    onChange(option);
    setOpen(false);
  }

  return (
    <div className={`status-picker${open ? " status-picker-open" : ""}`} ref={rootRef}>
      <span className="field-label">{label}</span>
      <button
        type="button"
        className="status-picker-trigger"
        aria-haspopup="listbox"
        aria-expanded={open}
        disabled={disabled}
        onClick={() => setOpen((current) => !current)}
      >
        <span className={getOptionClassName?.(value) ?? ""}>{value}</span>
        <span className="status-picker-chevron" aria-hidden="true">
          ▾
        </span>
      </button>

      {open ? (
        <div
          ref={menuRef}
          className="status-picker-menu"
          role="listbox"
          aria-label={label}
        >
          {options.map((option) => (
            <button
              key={option}
              type="button"
              role="option"
              aria-selected={value === option}
              className={`status-picker-option ${getOptionClassName?.(option) ?? ""} ${
                value === option ? "selected" : ""
              }`}
              onClick={() => selectOption(option)}
            >
              {option}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
