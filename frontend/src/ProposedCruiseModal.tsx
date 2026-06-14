import { FormEvent, useEffect, useState } from "react";
import { PROPOSED_CRUISE_STATUSES } from "./formOptions";
import {
  buildProposedCruisePayload,
  emptyProposedCruiseForm,
  proposedCruiseStatusOptionClass,
  proposedCruiseToForm,
} from "./proposedCruiseForm";
import StatusPicker from "./StatusPicker";
import type { ProposedCruise, ProposedCruiseInput, RequestPassenger } from "./types";

type ProposedCruiseModalProps = {
  open: boolean;
  cruise: ProposedCruise | null;
  passengers: RequestPassenger[];
  saving: boolean;
  disabled: boolean;
  onCancel: () => void;
  onSave: (payload: ProposedCruiseInput) => Promise<void>;
};

function togglePassengerId(ids: number[], passengerId: number): number[] {
  return ids.includes(passengerId)
    ? ids.filter((id) => id !== passengerId)
    : [...ids, passengerId];
}

export default function ProposedCruiseModal({
  open,
  cruise,
  passengers,
  saving,
  disabled,
  onCancel,
  onSave,
}: ProposedCruiseModalProps) {
  const [form, setForm] = useState<ProposedCruiseInput>(emptyProposedCruiseForm);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) {
      setForm(emptyProposedCruiseForm);
      setError("");
      return;
    }
    setForm(cruise ? proposedCruiseToForm(cruise) : emptyProposedCruiseForm);
    setError("");
  }, [cruise, open]);

  if (!open) {
    return null;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (disabled) {
      return;
    }

    if (form.final_payment_due_date < form.deposit_due_date) {
      setError("Final payment due date must be on or after the deposit due date.");
      return;
    }

    if (form.passenger_ids.length > form.passengers_in_room) {
      setError("Passengers in room must be at least the number of attached passengers.");
      return;
    }

    setError("");
    await onSave(buildProposedCruisePayload(form));
  }

  return (
    <div className="modal-backdrop" role="presentation" onClick={onCancel}>
      <div
        className="modal-card modal-card-wide"
        role="dialog"
        aria-modal="true"
        aria-labelledby="proposed-cruise-title"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="modal-card-header">
          <h3 id="proposed-cruise-title">{cruise ? "Edit proposed cruise" : "Proposed cruise"}</h3>
        </header>

        <form className="modal-form-layout" onSubmit={handleSubmit}>
          <div className="modal-scroll-body proposed-cruise-form">
          <div className="field-row">
            <label>
              Departure date
              <input
                required
                disabled={disabled || saving}
                type="date"
                value={form.departure_date}
                onChange={(event) => setForm({ ...form, departure_date: event.target.value })}
              />
            </label>
            <label>
              Number of nights
              <input
                required
                disabled={disabled || saving}
                type="number"
                min={1}
                max={365}
                value={form.number_of_nights}
                onChange={(event) =>
                  setForm({ ...form, number_of_nights: Number(event.target.value) })
                }
              />
            </label>
          </div>

          <div className="field-row">
            <label>
              Cruise line
              <input
                required
                disabled={disabled || saving}
                value={form.cruise_line}
                onChange={(event) => setForm({ ...form, cruise_line: event.target.value })}
              />
            </label>
            <label>
              Ship
              <input
                required
                disabled={disabled || saving}
                value={form.ship}
                onChange={(event) => setForm({ ...form, ship: event.target.value })}
              />
            </label>
          </div>

          <label>
            Itinerary name
            <input
              required
              disabled={disabled || saving}
              value={form.itinerary_name}
              onChange={(event) => setForm({ ...form, itinerary_name: event.target.value })}
            />
          </label>

          <div className="field-row">
            <label>
              Room category
              <input
                required
                disabled={disabled || saving}
                value={form.room_category}
                onChange={(event) => setForm({ ...form, room_category: event.target.value })}
              />
            </label>
            <label>
              Room number
              <span className="field-hint">Use GTY for guaranteed cabin.</span>
              <input
                required
                disabled={disabled || saving}
                value={form.room_number}
                onChange={(event) => setForm({ ...form, room_number: event.target.value })}
                placeholder="e.g. GTY"
              />
            </label>
          </div>

          <label>
            Passengers in room
            <input
              required
              disabled={disabled || saving}
              type="number"
              min={1}
              max={20}
              value={form.passengers_in_room}
              onChange={(event) =>
                setForm({ ...form, passengers_in_room: Number(event.target.value) })
              }
            />
          </label>

          <fieldset className="checkbox-group proposed-cruise-passengers">
            <legend className="field-label">Attached passengers</legend>
            {passengers.length === 0 ? (
              <p className="meta">Add passengers to the request before attaching them here.</p>
            ) : (
              passengers.map((passenger) => (
                <label className="checkbox-inline" key={passenger.id}>
                  <input
                    type="checkbox"
                    disabled={disabled || saving}
                    checked={form.passenger_ids.includes(passenger.id)}
                    onChange={() =>
                      setForm({
                        ...form,
                        passenger_ids: togglePassengerId(form.passenger_ids, passenger.id),
                      })
                    }
                  />
                  {passenger.first_name} {passenger.last_name}
                </label>
              ))
            )}
          </fieldset>

          <div className="field-row">
            <label>
              Deposit amount
              <input
                required
                disabled={disabled || saving}
                type="number"
                min={0}
                step="0.01"
                value={form.deposit_amount}
                onChange={(event) =>
                  setForm({ ...form, deposit_amount: Number(event.target.value) })
                }
              />
            </label>
            <label>
              Cost of cruise
              <input
                required
                disabled={disabled || saving}
                type="number"
                min={0}
                step="0.01"
                value={form.cost}
                onChange={(event) => setForm({ ...form, cost: Number(event.target.value) })}
              />
            </label>
          </div>

          <div className="field-row">
            <label>
              Deposit due date
              <input
                required
                disabled={disabled || saving}
                type="date"
                value={form.deposit_due_date}
                onChange={(event) => setForm({ ...form, deposit_due_date: event.target.value })}
              />
            </label>
            <label>
              Final payment due date
              <input
                required
                disabled={disabled || saving}
                type="date"
                value={form.final_payment_due_date}
                onChange={(event) =>
                  setForm({ ...form, final_payment_due_date: event.target.value })
                }
              />
            </label>
          </div>

          <fieldset className="proposed-cruise-includes">
            <legend className="field-label">Includes</legend>
            <div className="checkbox-group">
              <label className="checkbox-inline">
                <input
                  type="checkbox"
                  disabled={disabled || saving}
                  checked={form.includes.drink_package.included}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      includes: {
                        ...form.includes,
                        drink_package: {
                          ...form.includes.drink_package,
                          included: event.target.checked,
                        },
                      },
                    })
                  }
                />
                Drink package
              </label>
              {form.includes.drink_package.included ? (
                <label>
                  Drink package name
                  <input
                    disabled={disabled || saving}
                    value={form.includes.drink_package.name ?? ""}
                    onChange={(event) =>
                      setForm({
                        ...form,
                        includes: {
                          ...form.includes,
                          drink_package: {
                            ...form.includes.drink_package,
                            name: event.target.value,
                          },
                        },
                      })
                    }
                  />
                </label>
              ) : null}

              <label className="checkbox-inline">
                <input
                  type="checkbox"
                  disabled={disabled || saving}
                  checked={form.includes.wifi.included}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      includes: {
                        ...form.includes,
                        wifi: { ...form.includes.wifi, included: event.target.checked },
                      },
                    })
                  }
                />
                Wi-Fi
              </label>
              {form.includes.wifi.included ? (
                <label>
                  Wi-Fi package name
                  <input
                    disabled={disabled || saving}
                    value={form.includes.wifi.name ?? ""}
                    onChange={(event) =>
                      setForm({
                        ...form,
                        includes: {
                          ...form.includes,
                          wifi: { ...form.includes.wifi, name: event.target.value },
                        },
                      })
                    }
                  />
                </label>
              ) : null}

              <label className="checkbox-inline">
                <input
                  type="checkbox"
                  disabled={disabled || saving}
                  checked={form.includes.tips}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      includes: { ...form.includes, tips: event.target.checked },
                    })
                  }
                />
                Tips
              </label>

              <label className="checkbox-inline">
                <input
                  type="checkbox"
                  disabled={disabled || saving}
                  checked={form.includes.excursion}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      includes: { ...form.includes, excursion: event.target.checked },
                    })
                  }
                />
                Excursion
              </label>

              <label className="checkbox-inline">
                <input
                  type="checkbox"
                  disabled={disabled || saving}
                  checked={form.includes.excursion_credit.included}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      includes: {
                        ...form.includes,
                        excursion_credit: {
                          ...form.includes.excursion_credit,
                          included: event.target.checked,
                        },
                      },
                    })
                  }
                />
                Excursion credit
              </label>
              {form.includes.excursion_credit.included ? (
                <label>
                  Excursion credit amount
                  <input
                    disabled={disabled || saving}
                    type="number"
                    min={0}
                    step="0.01"
                    value={form.includes.excursion_credit.amount ?? ""}
                    onChange={(event) =>
                      setForm({
                        ...form,
                        includes: {
                          ...form.includes,
                          excursion_credit: {
                            ...form.includes.excursion_credit,
                            amount: event.target.value ? Number(event.target.value) : null,
                          },
                        },
                      })
                    }
                  />
                </label>
              ) : null}

              <label className="checkbox-inline">
                <input
                  type="checkbox"
                  disabled={disabled || saving}
                  checked={form.includes.onboard_credit.included}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      includes: {
                        ...form.includes,
                        onboard_credit: {
                          ...form.includes.onboard_credit,
                          included: event.target.checked,
                        },
                      },
                    })
                  }
                />
                Onboard credit
              </label>
              {form.includes.onboard_credit.included ? (
                <label>
                  Onboard credit amount
                  <input
                    disabled={disabled || saving}
                    type="number"
                    min={0}
                    step="0.01"
                    value={form.includes.onboard_credit.amount ?? ""}
                    onChange={(event) =>
                      setForm({
                        ...form,
                        includes: {
                          ...form.includes,
                          onboard_credit: {
                            ...form.includes.onboard_credit,
                            amount: event.target.value ? Number(event.target.value) : null,
                          },
                        },
                      })
                    }
                  />
                </label>
              ) : null}
            </div>
          </fieldset>

          {cruise ? (
            <StatusPicker
              label="Status"
              value={form.status ?? cruise.status}
              options={PROPOSED_CRUISE_STATUSES}
              onChange={(status) => setForm({ ...form, status })}
              disabled={disabled || saving}
              getOptionClassName={proposedCruiseStatusOptionClass}
            />
          ) : null}

          {error ? <p className="status error">{error}</p> : null}
          </div>

          <div className="modal-actions modal-actions-footer">
            <button type="button" className="modal-secondary" disabled={saving} onClick={onCancel}>
              Cancel
            </button>
            {!disabled ? (
              <button type="submit" disabled={saving}>
                {saving ? "Saving..." : cruise ? "Save proposed cruise" : "Add proposed cruise"}
              </button>
            ) : null}
          </div>
        </form>
      </div>
    </div>
  );
}
