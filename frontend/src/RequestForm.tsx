import { FormEvent } from "react";
import CruiseLineMultiSelect from "./CruiseLineMultiSelect";
import DestinationFields from "./DestinationFields";
import TravelDatesField, { isReturnAfterDeparture } from "./TravelDatesField";
import WorkspaceBandHeader from "./WorkspaceBandHeader";
import { CABIN_TYPES, DESTINATIONS } from "./formOptions";
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
  layout?: "default" | "workspace";
  creationNote?: string;
  onCreationNoteChange?: (value: string) => void;
};

function toggleListItem(values: string[], item: string): string[] {
  return values.includes(item) ? values.filter((value) => value !== item) : [...values, item];
}

function cabinInformationMeta(form: TravelRequestInput): string {
  const parts = [
    `${form.passengers} passenger${form.passengers === 1 ? "" : "s"}`,
    `${form.cabins_needed} cabin${form.cabins_needed === 1 ? "" : "s"}`,
  ];
  if (form.cabin_types.length > 0) {
    parts.push(form.cabin_types.join(", "));
  }
  return parts.join(" · ");
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
  layout = "default",
  creationNote,
  onCreationNoteChange,
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

  function toggleCabinType(cabinType: string) {
    setForm({
      ...form,
      cabin_types: toggleListItem(form.cabin_types, cabinType),
    });
  }

  const contactFields = (
    <>
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
    </>
  );

  const cruiseLineFields = (
    <>
      <CruiseLineMultiSelect
        label="Preferred cruise lines"
        hint="Search and select every cruise line the client is open to sailing."
        value={form.cruise_lines}
        onChange={(cruise_lines) => setForm({ ...form, cruise_lines })}
        disabled={disabled}
      />

      <CruiseLineMultiSelect
        label="Cruise lines to avoid"
        hint="Search and select any cruise line the client absolutely does not want to sail."
        value={form.excluded_cruise_lines ?? []}
        onChange={(excluded_cruise_lines) => setForm({ ...form, excluded_cruise_lines })}
        disabled={disabled}
        placeholder="Search lines to avoid..."
      />
    </>
  );

  const itineraryFields = (
    <>
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
    </>
  );

  const travelDateFields = (
    <TravelDatesField
      departureDate={form.departure_date}
      returnDate={form.return_date}
      disabled={disabled}
      onChange={(departureDate, returnDate) =>
        setForm({ ...form, departure_date: departureDate, return_date: returnDate })
      }
    />
  );

  const capacityFields = (
    <>
      <div>
        <span className="field-label">Cabin types (select all that apply)</span>
        <div className="checkbox-group">
          {CABIN_TYPES.map((cabinType) => (
            <label className="checkbox-inline" key={cabinType}>
              <input
                type="checkbox"
                disabled={disabled}
                checked={form.cabin_types.includes(cabinType)}
                onChange={() => toggleCabinType(cabinType)}
              />
              {cabinType}
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
    </>
  );

  const formActions = (
    <>
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
    </>
  );

  if (layout === "workspace") {
    return (
      <form id={formId} className="request-form request-form--workspace" onSubmit={onSubmit}>
        <section className="request-form-band" aria-label="Contact and cruise line preferences">
          <div className="request-form-zone">
            <div className="request-form-zone-panel">
              <WorkspaceBandHeader title="Contact" panel />
              <div className="request-form-panel-body">{contactFields}</div>
            </div>
            <div className="request-form-zone-divider" role="separator" aria-orientation="vertical" />
            <div className="request-form-zone-panel">
              <WorkspaceBandHeader title="Cruise line preferences" panel />
              <div className="request-form-panel-body">
                <CruiseLineMultiSelect
                  label="Preferred cruise lines"
                  value={form.cruise_lines}
                  onChange={(cruise_lines) => setForm({ ...form, cruise_lines })}
                  disabled={disabled}
                />
                <CruiseLineMultiSelect
                  label="Cruise lines to avoid"
                  value={form.excluded_cruise_lines ?? []}
                  onChange={(excluded_cruise_lines) => setForm({ ...form, excluded_cruise_lines })}
                  disabled={disabled}
                  placeholder="Search lines to avoid..."
                />
              </div>
            </div>
          </div>
        </section>

        <section className="request-form-band" aria-label="Itinerary and travel dates">
          <div className="request-form-zone">
            <div className="request-form-zone-panel">
              <WorkspaceBandHeader title="Itinerary" panel />
              <div className="request-form-panel-body">{itineraryFields}</div>
            </div>
            <div className="request-form-zone-divider" role="separator" aria-orientation="vertical" />
            <div className="request-form-zone-panel">
              <WorkspaceBandHeader title="Travel dates" panel />
              <div className="request-form-panel-body">
                <TravelDatesField
                  departureDate={form.departure_date}
                  returnDate={form.return_date}
                  disabled={disabled}
                  hideLabel
                  embedded
                  onChange={(departureDate, returnDate) =>
                    setForm({ ...form, departure_date: departureDate, return_date: returnDate })
                  }
                />
              </div>
            </div>
          </div>
        </section>

        <section className="request-form-band" aria-label="Cabin types and party size">
          <WorkspaceBandHeader title="Cabin information" meta={cabinInformationMeta(form)} />
          <div className="request-form-band-body">
            <div className="stateroom-occupancy-constraints">
              <h5 className="stateroom-occupancy-constraints-title">Stateroom &amp; occupancy constraints</h5>
              <div className="stateroom-occupancy-constraints-row">
                <div className="stateroom-occupancy-cluster">
                  <div className="request-cabin-chip-row">
                  {CABIN_TYPES.map((cabinType) => {
                    const selected = form.cabin_types.includes(cabinType);
                    return (
                      <button
                        key={cabinType}
                        type="button"
                        className={`request-cabin-chip${selected ? " is-selected" : ""}`}
                        disabled={disabled}
                        aria-pressed={selected}
                        onClick={() => toggleCabinType(cabinType)}
                      >
                        {cabinType}
                      </button>
                    );
                  })}
                </div>

                <div className="stateroom-occupancy-divider" role="separator" aria-orientation="vertical" />

                <div className="stateroom-occupancy-metrics">
                  <div className="stateroom-occupancy-metric">
                    <PassengerIcon />
                    <span className="stateroom-occupancy-metric-label">Passengers</span>
                    <input
                      required
                      disabled={disabled}
                      type="number"
                      min={1}
                      max={20}
                      className="request-capacity-metric-input"
                      value={form.passengers}
                      onChange={(event) => setForm({ ...form, passengers: Number(event.target.value) })}
                      aria-label="Passengers"
                    />
                    <PassengerVisual count={form.passengers} />
                  </div>

                  <div className="stateroom-occupancy-metric">
                    <CabinIcon />
                    <span className="stateroom-occupancy-metric-label">Cabins needed</span>
                    <input
                      required
                      disabled={disabled}
                      type="number"
                      min={1}
                      max={10}
                      className="request-capacity-metric-input"
                      value={form.cabins_needed}
                      onChange={(event) =>
                        setForm({ ...form, cabins_needed: Number(event.target.value) })
                      }
                      aria-label="Cabins needed"
                    />
                    <CabinVisual count={form.cabins_needed} />
                  </div>
                </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {onCreationNoteChange ? (
          <section className="request-form-band" aria-label="Quick intake note">
            <WorkspaceBandHeader title="Quick note" />
            <div className="request-form-band-body">
              <label className="request-creation-note-field">
                <span className="field-label">Add an optional note for this request</span>
                <textarea
                  rows={4}
                  disabled={disabled}
                  value={creationNote ?? ""}
                  placeholder="Capture intake details, client preferences, or follow-up reminders..."
                  onChange={(event) => onCreationNoteChange(event.target.value)}
                />
              </label>
            </div>
          </section>
        ) : null}

        {formActions}
      </form>
    );
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

      {contactFields}

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

      {cruiseLineFields}
      {itineraryFields}
      {travelDateFields}
      {capacityFields}
      {formActions}
    </form>
  );
}

function PassengerIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="8" r="4" />
      <path d="M5 20c0-3.3 3.1-6 7-6s7 2.7 7 6" />
    </svg>
  );
}

function CabinIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M4 10h16v10H4z" />
      <path d="M8 10V7h8v3" />
      <path d="M10 14h4" />
    </svg>
  );
}

function PassengerVisual({ count }: { count: number }) {
  const slots = Math.min(Math.max(count, 1), 8);
  const overflow = count > 8 ? count - 8 : 0;

  return (
    <div className="request-capacity-visual request-capacity-visual-passengers" aria-hidden="true">
      {Array.from({ length: slots }, (_, index) => (
        <span
          key={index}
          className={`request-capacity-slot request-capacity-slot-person${
            index < count ? " is-filled" : ""
          }`}
        />
      ))}
      {overflow > 0 ? <span className="request-capacity-overflow">+{overflow}</span> : null}
    </div>
  );
}

function CabinVisual({ count }: { count: number }) {
  const slots = Math.min(Math.max(count, 1), 6);
  const overflow = count > 6 ? count - 6 : 0;

  return (
    <div className="request-capacity-visual request-capacity-visual-cabins" aria-hidden="true">
      {Array.from({ length: slots }, (_, index) => (
        <span
          key={index}
          className={`request-capacity-slot request-capacity-slot-cabin${
            index < count ? " is-filled" : ""
          }`}
        />
      ))}
      {overflow > 0 ? <span className="request-capacity-overflow">+{overflow}</span> : null}
    </div>
  );
}

export const emptyRequestForm: TravelRequestInput = {
  first_name: "",
  last_name: "",
  email: "",
  phone: "",
  cruise_lines: [],
  excluded_cruise_lines: [],
  destination: "",
  destination_details: {},
  departure_date: "",
  return_date: "",
  cabin_types: [],
  passengers: 2,
  cabins_needed: 1,
  first_passenger_date_of_birth: "",
};

export { isReturnAfterDeparture };
