import type { RequestPassengerInput } from "./types";

type PassengerFieldsProps = {
  value: RequestPassengerInput;
  onChange: (value: RequestPassengerInput) => void;
  disabled: boolean;
  showDateOfBirth?: boolean;
};

export default function PassengerFields({
  value,
  onChange,
  disabled,
  showDateOfBirth = true,
}: PassengerFieldsProps) {
  return (
    <>
      <div className="field-row">
        <label>
          First name
          <input
            required
            disabled={disabled}
            value={value.first_name ?? ""}
            onChange={(event) => onChange({ ...value, first_name: event.target.value })}
          />
        </label>
        <label>
          Last name
          <input
            required
            disabled={disabled}
            value={value.last_name ?? ""}
            onChange={(event) => onChange({ ...value, last_name: event.target.value })}
          />
        </label>
      </div>
      <label>
        Email
        <input
          required
          disabled={disabled}
          type="email"
          value={value.email ?? ""}
          onChange={(event) => onChange({ ...value, email: event.target.value })}
        />
      </label>
      <label>
        Phone number
        <input
          required
          disabled={disabled}
          type="tel"
          value={value.phone ?? ""}
          onChange={(event) => onChange({ ...value, phone: event.target.value })}
        />
      </label>
      {showDateOfBirth ? (
        <label>
          Date of birth
          <input
            disabled={disabled}
            type="date"
            value={value.date_of_birth ?? ""}
            onChange={(event) => onChange({ ...value, date_of_birth: event.target.value })}
          />
        </label>
      ) : null}
    </>
  );
}

export function emptyPassengerInput(): RequestPassengerInput {
  return {
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    date_of_birth: "",
  };
}

export function toPassengerPayload(value: RequestPassengerInput): RequestPassengerInput {
  return {
    ...value,
    first_name: value.first_name?.trim() ?? "",
    last_name: value.last_name?.trim() ?? "",
    email: value.email?.trim() ?? "",
    phone: value.phone?.trim() ?? "",
    date_of_birth: value.date_of_birth?.trim() || null,
  };
}
