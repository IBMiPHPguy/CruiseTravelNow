import { useState } from "react";
import { addProposedCruise, updateProposedCruise } from "./api";
import ProposedCruiseModal from "./ProposedCruiseModal";
import { proposedCruiseStatusClass } from "./proposedCruiseForm";
import type { ProposedCruise, ProposedCruiseInput, RequestPassenger } from "./types";

type ProposedCruisesSectionProps = {
  requestId: number;
  cruises: ProposedCruise[];
  passengers: RequestPassenger[];
  disabled: boolean;
  onChanged: () => Promise<void>;
  onError: (message: string) => void;
};

function formatMoney(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(value);
}

export default function ProposedCruisesSection({
  requestId,
  cruises,
  passengers,
  disabled,
  onChanged,
  onError,
}: ProposedCruisesSectionProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCruise, setEditingCruise] = useState<ProposedCruise | null>(null);
  const [saving, setSaving] = useState(false);

  function openCreateModal() {
    setEditingCruise(null);
    setModalOpen(true);
  }

  function openEditModal(cruise: ProposedCruise) {
    setEditingCruise(cruise);
    setModalOpen(true);
  }

  async function handleSave(payload: ProposedCruiseInput) {
    setSaving(true);
    onError("");
    try {
      if (editingCruise) {
        await updateProposedCruise(requestId, editingCruise.id, payload);
      } else {
        await addProposedCruise(requestId, payload);
      }
      setModalOpen(false);
      setEditingCruise(null);
      await onChanged();
    } catch (saveError) {
      onError(saveError instanceof Error ? saveError.message : "Unable to save proposed cruise.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <section className="section-card proposed-cruises-card">
        <header className="section-card-header">
          <h3>Proposed Cruises</h3>
        </header>
        <div className="section-card-body">
          {!disabled ? (
            <button type="button" onClick={openCreateModal}>
              Add proposed cruise
            </button>
          ) : null}

          <div className="proposed-cruise-list">
            {cruises.length === 0 ? (
              <p className="meta">No proposed cruises yet.</p>
            ) : (
              cruises.map((cruise) => (
                <article className="proposed-cruise-item" key={cruise.id}>
                  <div className="proposed-cruise-item-header">
                    <div>
                      <strong>
                        {cruise.cruise_line} · {cruise.ship}
                      </strong>
                      <div className="meta">
                        Departs {cruise.departure_date} · {cruise.number_of_nights} nights ·{" "}
                        {cruise.itinerary_name}
                      </div>
                      <div className="meta">
                        Room {cruise.room_category} · {cruise.room_number} ·{" "}
                        {formatMoney(cruise.cost)}
                      </div>
                      {cruise.passengers.length > 0 ? (
                        <div className="meta">
                          Passengers:{" "}
                          {cruise.passengers
                            .map((passenger) => `${passenger.first_name} ${passenger.last_name}`)
                            .join(", ")}
                        </div>
                      ) : null}
                    </div>
                    <span className={`proposed-cruise-status ${proposedCruiseStatusClass(cruise.status)}`}>
                      {cruise.status}
                    </span>
                  </div>
                  {!disabled ? (
                    <button type="button" className="modal-secondary" onClick={() => openEditModal(cruise)}>
                      Edit
                    </button>
                  ) : null}
                </article>
              ))
            )}
          </div>
        </div>
      </section>

      <ProposedCruiseModal
        open={modalOpen}
        cruise={editingCruise}
        passengers={passengers}
        saving={saving}
        disabled={disabled}
        onCancel={() => {
          setModalOpen(false);
          setEditingCruise(null);
        }}
        onSave={handleSave}
      />
    </>
  );
}
