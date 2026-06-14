import { useState } from "react";
import { addPassenger, deletePassenger, updatePassenger } from "./api";
import type { RequestPassenger, RequestPassengerInput } from "./types";

const emptyPassenger: RequestPassengerInput = {
  first_name: "",
  last_name: "",
  email: "",
  phone: "",
  date_of_birth: "",
};

type PassengersSectionProps = {
  requestId: number;
  passengers: RequestPassenger[];
  disabled: boolean;
  onChanged: () => Promise<void>;
  onError: (message: string) => void;
};

function PassengerFields({
  value,
  onChange,
  disabled,
}: {
  value: RequestPassengerInput;
  onChange: (value: RequestPassengerInput) => void;
  disabled: boolean;
}) {
  return (
    <>
      <div className="field-row">
        <label>
          First name
          <input
            required
            disabled={disabled}
            value={value.first_name}
            onChange={(event) => onChange({ ...value, first_name: event.target.value })}
          />
        </label>
        <label>
          Last name
          <input
            required
            disabled={disabled}
            value={value.last_name}
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
          value={value.email}
          onChange={(event) => onChange({ ...value, email: event.target.value })}
        />
      </label>
      <label>
        Phone number
        <input
          required
          disabled={disabled}
          type="tel"
          value={value.phone}
          onChange={(event) => onChange({ ...value, phone: event.target.value })}
        />
      </label>
      <label>
        Date of birth
        <input
          disabled={disabled}
          type="date"
          value={value.date_of_birth ?? ""}
          onChange={(event) => onChange({ ...value, date_of_birth: event.target.value })}
        />
      </label>
    </>
  );
}

function EditIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M3 6h18" />
      <path d="M8 6V4h8v2" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
      <path d="M10 11v6" />
      <path d="M14 11v6" />
    </svg>
  );
}

function toPayload(value: RequestPassengerInput): RequestPassengerInput {
  return {
    ...value,
    date_of_birth: value.date_of_birth?.trim() || null,
  };
}

export default function PassengersSection({
  requestId,
  passengers,
  disabled,
  onChanged,
  onError,
}: PassengersSectionProps) {
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<RequestPassengerInput>(emptyPassenger);
  const [addForm, setAddForm] = useState<RequestPassengerInput>(emptyPassenger);
  const [showAddForm, setShowAddForm] = useState(false);
  const [saving, setSaving] = useState(false);

  if (passengers.length === 0) {
    return null;
  }

  function startEdit(passenger: RequestPassenger) {
    setEditingId(passenger.id);
    setEditForm({
      first_name: passenger.first_name,
      last_name: passenger.last_name,
      email: passenger.email,
      phone: passenger.phone,
      date_of_birth: passenger.date_of_birth ?? "",
    });
  }

  async function handleSaveEdit(passengerId: number) {
    setSaving(true);
    onError("");
    try {
      await updatePassenger(requestId, passengerId, toPayload(editForm));
      setEditingId(null);
      await onChanged();
    } catch (saveError) {
      onError(saveError instanceof Error ? saveError.message : "Unable to update passenger.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(passengerId: number) {
    if (!window.confirm("Remove this passenger?")) {
      return;
    }
    setSaving(true);
    onError("");
    try {
      await deletePassenger(requestId, passengerId);
      if (editingId === passengerId) {
        setEditingId(null);
      }
      await onChanged();
    } catch (deleteError) {
      onError(deleteError instanceof Error ? deleteError.message : "Unable to delete passenger.");
    } finally {
      setSaving(false);
    }
  }

  async function handleAddPassenger() {
    setSaving(true);
    onError("");
    try {
      await addPassenger(requestId, toPayload(addForm));
      setAddForm(emptyPassenger);
      setShowAddForm(false);
      await onChanged();
    } catch (addError) {
      onError(addError instanceof Error ? addError.message : "Unable to add passenger.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="section-card passengers-card">
      <header className="section-card-header">
        <h3>Passengers</h3>
      </header>
      <div className="section-card-body">
      <div className="passenger-list">
        {passengers.map((passenger, index) => (
          <article className="passenger-item" key={passenger.id}>
            {editingId === passenger.id ? (
              <div className="passenger-edit-form">
                <PassengerFields value={editForm} onChange={setEditForm} disabled={disabled || saving} />
                <div className="passenger-actions">
                  <button type="button" disabled={saving} onClick={() => handleSaveEdit(passenger.id)}>
                    {saving ? "Saving..." : "Save passenger"}
                  </button>
                  <button
                    type="button"
                    className="modal-secondary"
                    disabled={saving}
                    onClick={() => setEditingId(null)}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="passenger-item-header">
                  <div>
                    <strong>
                      {index === 0 ? "Primary · " : ""}
                      {passenger.first_name} {passenger.last_name}
                    </strong>
                    <div className="meta">{passenger.email} · {passenger.phone}</div>
                    {passenger.date_of_birth ? (
                      <div className="meta">Date of birth: {passenger.date_of_birth}</div>
                    ) : null}
                  </div>
                  {!disabled ? (
                    <div className="passenger-icon-actions item-icon-actions">
                      <button
                        type="button"
                        className="icon-button"
                        aria-label={`Edit ${passenger.first_name} ${passenger.last_name}`}
                        onClick={() => startEdit(passenger)}
                      >
                        <EditIcon />
                      </button>
                      <button
                        type="button"
                        className="icon-button icon-button-danger"
                        aria-label={`Delete ${passenger.first_name} ${passenger.last_name}`}
                        disabled={saving || passengers.length <= 1}
                        onClick={() => handleDelete(passenger.id)}
                      >
                        <TrashIcon />
                      </button>
                    </div>
                  ) : null}
                </div>
              </>
            )}
          </article>
        ))}
      </div>

      {!disabled ? (
        <div className="passenger-add">
          {showAddForm ? (
            <div className="passenger-edit-form">
              <h4>Add passenger</h4>
              <PassengerFields value={addForm} onChange={setAddForm} disabled={saving} />
              <div className="passenger-actions">
                <button type="button" disabled={saving} onClick={handleAddPassenger}>
                  {saving ? "Saving..." : "Add passenger"}
                </button>
                <button
                  type="button"
                  className="modal-secondary"
                  disabled={saving}
                  onClick={() => {
                    setShowAddForm(false);
                    setAddForm(emptyPassenger);
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button type="button" onClick={() => setShowAddForm(true)}>
              Add passenger
            </button>
          )}
        </div>
      ) : null}
      </div>
    </section>
  );
}
