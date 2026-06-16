import { FormEvent } from "react";
import DestinationFields from "./DestinationFields";
import TravelDatesField, { isReturnAfterDeparture } from "./TravelDatesField";
import {
  CABIN_TYPES,
  CANADIAN_PROVINCES,
  DESTINATIONS,
  QUALIFIERS,
  US_STATES,
} from "./formOptions";
import type { DestinationDetailField, TravelRequestInput } from "./types";

type RequestFormProps = {
  form: TravelRequestInput;
  setForm: (form: TravelRequestInput) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  submitting: boolean;
  submitLabel: string;
  disabled?: boolean;
  showCloseButton?: boolean;
  onCloseClick?: () => void;
  showPrimaryPassengerDob?: boolean;
  onFindExistingClient?: () => void;
  formId?: string;
  hideActions?: boolean;
};

function toggleListItem(values: string[], item: string): string[] {
  return values.includes(item) ? values.filter((value) => value !== item) : [...values, item];
}

export default function RequestForm({
  form,
  setForm,
  onSubmit,
  submitting,
  submitLabel,
  disabled = false,
  showCloseButton = false,
  onCloseClick,
  showPrimaryPassengerDob = false,
  onFindExistingClient,
  formId,
  hideActions = false,
}: RequestFormProps) {
  function patchForm(patch: Partial<TravelRequestInput>, clearLinkedPassenger = false) {
    setForm({
      ...form,
      ...patch,
      ...(clearLinkedPassenger ? { primary_passenger_id: undefined } : {}),
    });
  }

  function updateDestination(destination: string) {
    setForm({
      ...form,
      destination,
      destination_details: {},
    });
  }

  function toggleDestinationDetail(field: DestinationDetailField, value: string) {
    const current = form.destination_details?.[field] ?? [];
    setForm({
      ...form,
      destination_details: {
        ...form.destination_details,
        [field]: toggleListItem(current, value),
      },
    });
  }

  return (
    <form id={formId} onSubmit={onSubmit}>
      {showPrimaryPassengerDob && onFindExistingClient ? (
        <div className="requestor-picker">
          <button type="button" className="modal-secondary" disabled={disabled} onClick={onFindExistingClient}>
            Find existing client
          </button>
          {form.primary_passenger_id ? (
            <p className="field-hint">
              Linked to an existing passenger record. Edit the requestor contact fields below to enter someone new
              instead.
            </p>
          ) : (
            <p className="field-hint">
              The requestor is always the primary passenger. Search for a returning client or enter new contact details
              below.
            </p>
          )}
        </div>
      ) : null}

      <div className="field-row">
        <label>
          First name
          <input
            required
            disabled={disabled}
            value={form.first_name}
            onChange={(event) => patchForm({ first_name: event.target.value }, true)}
          />
        </label>

        <label>
          Last name
          <input
            required
            disabled={disabled}
            value={form.last_name}
            onChange={(event) => patchForm({ last_name: event.target.value }, true)}
          />
        </label>
      </div>

      <label>
        Email
        <input
          required
          disabled={disabled}
          type="email"
          value={form.email}
          onChange={(event) => patchForm({ email: event.target.value }, true)}
        />
      </label>

      <label>
        Phone number
        <input
          required
          disabled={disabled}
          type="tel"
          value={form.phone}
          onChange={(event) => patchForm({ phone: event.target.value }, true)}
        />
      </label>

      {showPrimaryPassengerDob ? (
        <label>
          Date of birth (primary passenger)
          <input
            disabled={disabled}
            type="date"
            value={form.first_passenger_date_of_birth ?? ""}
            onChange={(event) =>
              setForm({ ...form, first_passenger_date_of_birth: event.target.value })
            }
          />
        </label>
      ) : null}

      <label>
        State / province of residency
        <select
          required
          disabled={disabled}
          value={form.state_of_residency}
          onChange={(event) => setForm({ ...form, state_of_residency: event.target.value })}
        >
          <option value="" disabled>
            Select a state or province
          </option>
          <optgroup label="United States">
            {US_STATES.map((state) => (
              <option key={state} value={state}>
                {state}
              </option>
            ))}
          </optgroup>
          <optgroup label="Canada">
            {CANADIAN_PROVINCES.map((province) => (
              <option key={province} value={province}>
                {province}
              </option>
            ))}
          </optgroup>
        </select>
      </label>

      <label>
        Preferred cruise line
        <input
          required
          disabled={disabled}
          value={form.cruise_line}
          onChange={(event) => setForm({ ...form, cruise_line: event.target.value })}
        />
      </label>

      <label>
        Cruise lines to avoid
        <span className="field-hint">
          Enter any cruise line the client absolutely does not want to sail.
        </span>
        <input
          disabled={disabled}
          value={form.excluded_cruise_line ?? ""}
          onChange={(event) => setForm({ ...form, excluded_cruise_line: event.target.value })}
          placeholder="e.g. Brand the client will not consider"
        />
      </label>

      <label>
        Destination
        <select
          required
          disabled={disabled}
          value={form.destination}
          onChange={(event) => updateDestination(event.target.value)}
        >
          <option value="" disabled>
            Select a destination
          </option>
          {DESTINATIONS.map((destination) => (
            <option key={destination} value={destination}>
              {destination}
            </option>
          ))}
        </select>
      </label>

      <DestinationFields
        destination={form.destination}
        details={form.destination_details ?? {}}
        onToggleDetail={toggleDestinationDetail}
      />

      <TravelDatesField
        departureDate={form.departure_date}
        returnDate={form.return_date}
        disabled={disabled}
        onChange={(departureDate, returnDate) =>
          setForm({ ...form, departure_date: departureDate, return_date: returnDate })
        }
      />

      <div>
        <span className="field-label">Cabin types (select all that apply)</span>
        <div className="checkbox-group">
          {CABIN_TYPES.map((cabinType) => (
            <label className="checkbox-inline" key={cabinType}>
              <input
                type="checkbox"
                disabled={disabled}
                checked={form.cabin_types.includes(cabinType)}
                onChange={() =>
                  setForm({
                    ...form,
                    cabin_types: toggleListItem(form.cabin_types, cabinType),
                  })
                }
              />
              {cabinType}
            </label>
          ))}
        </div>
      </div>

      <div>
        <span className="field-label">Qualifying discounts</span>
        <div className="checkbox-group">
          {QUALIFIERS.map((qualifier) => (
            <label className="checkbox-inline" key={qualifier}>
              <input
                type="checkbox"
                disabled={disabled}
                checked={form.qualifiers.includes(qualifier)}
                onChange={() =>
                  setForm({
                    ...form,
                    qualifiers: toggleListItem(form.qualifiers, qualifier),
                  })
                }
              />
              {qualifier}
            </label>
          ))}
        </div>
      </div>

      <div className="field-row">
        <label>
          Passengers
          <input
            required
            disabled={disabled}
            type="number"
            min={1}
            max={20}
            value={form.passengers}
            onChange={(event) => setForm({ ...form, passengers: Number(event.target.value) })}
          />
        </label>

        <label>
          Max cabins needed
          <input
            required
            disabled={disabled}
            type="number"
            min={1}
            max={10}
            value={form.cabins_needed}
            onChange={(event) =>
              setForm({ ...form, cabins_needed: Number(event.target.value) })
            }
          />
        </label>
      </div>

      {!disabled && !hideActions ? (
        <button type="submit" disabled={submitting}>
          {submitting ? "Saving..." : submitLabel}
        </button>
      ) : null}

      {!disabled && !hideActions && showCloseButton ? (
        <div className="close-panel">
          <button type="button" className="danger-button" onClick={onCloseClick}>
            Close request
          </button>
        </div>
      ) : null}
    </form>
  );
}

export const emptyRequestForm: TravelRequestInput = {
  first_name: "",
  last_name: "",
  email: "",
  phone: "",
  state_of_residency: "",
  cruise_line: "",
  excluded_cruise_line: "",
  destination: "",
  destination_details: {},
  departure_date: "",
  return_date: "",
  cabin_types: [],
  qualifiers: [],
  passengers: 2,
  cabins_needed: 1,
  first_passenger_date_of_birth: "",
};

export { isReturnAfterDeparture };
