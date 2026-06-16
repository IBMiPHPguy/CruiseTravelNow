import { useMemo, useState } from "react";
import { addProposedCruise, updateProposedCruise } from "./api";
import {
  PROPOSED_CRUISE_STATUS_ACCEPTED,
  PROPOSED_CRUISE_STATUS_PROPOSED,
  PROPOSED_CRUISE_STATUS_REJECTED,
} from "./formOptions";
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
  embedded?: boolean;
};

type CruiseTab = "active" | "rejected";

function formatMoney(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(value);
}

function isActiveProposedCruise(cruise: ProposedCruise): boolean {
  return cruise.status === PROPOSED_CRUISE_STATUS_PROPOSED || cruise.status === PROPOSED_CRUISE_STATUS_ACCEPTED;
}

export default function ProposedCruisesSection({
  requestId,
  cruises,
  passengers,
  disabled,
  onChanged,
  onError,
  embedded = false,
}: ProposedCruisesSectionProps) {
  const [activeTab, setActiveTab] = useState<CruiseTab>("active");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCruise, setEditingCruise] = useState<ProposedCruise | null>(null);
  const [saving, setSaving] = useState(false);

  const activeCruises = useMemo(() => cruises.filter(isActiveProposedCruise), [cruises]);
  const rejectedCruises = useMemo(
    () => cruises.filter((cruise) => cruise.status === PROPOSED_CRUISE_STATUS_REJECTED),
    [cruises],
  );
  const hasAcceptedCruise = useMemo(
    () => cruises.some((cruise) => cruise.status === PROPOSED_CRUISE_STATUS_ACCEPTED),
    [cruises],
  );

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

  function renderCruiseList(cruiseList: ProposedCruise[], emptyMessage: string) {
    if (cruiseList.length === 0) {
      return <p className="meta">{emptyMessage}</p>;
    }

    return cruiseList.map((cruise) => (
      <article className="proposed-cruise-item" key={cruise.id}>
        <div className="proposed-cruise-item-header">
          <div>
            <strong>
              {cruise.cruise_line} · {cruise.ship}
            </strong>
            <div className="meta">
              Departs {cruise.departure_date} · {cruise.number_of_nights} nights · {cruise.itinerary_name}
            </div>
            <div className="meta">
              Room {cruise.room_category} · {cruise.room_number} · {formatMoney(cruise.cost)}
            </div>
            {cruise.passengers.length > 0 ? (
              <div className="meta">
                Passengers:{" "}
                {cruise.passengers.map((passenger) => `${passenger.first_name} ${passenger.last_name}`).join(", ")}
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
    ));
  }

  const body = (
    <div className="proposed-cruises-section-body">
      <div className="proposed-cruises-toolbar">
        <div className="proposed-cruises-subtabs" role="tablist" aria-label="Proposed cruise status">
          <button
            type="button"
            role="tab"
            id="proposed-cruises-tab-active"
            aria-selected={activeTab === "active"}
            aria-controls="proposed-cruises-panel-active"
            className={`proposed-cruises-subtab proposed-cruises-subtab--active${
              activeTab === "active" ? " is-active" : ""
            }`}
            onClick={() => setActiveTab("active")}
          >
            <span className="proposed-cruises-subtab-label">Proposed &amp; accepted</span>
            <span className="proposed-cruises-subtab-count">{activeCruises.length}</span>
          </button>
          <button
            type="button"
            role="tab"
            id="proposed-cruises-tab-rejected"
            aria-selected={activeTab === "rejected"}
            aria-controls="proposed-cruises-panel-rejected"
            className={`proposed-cruises-subtab proposed-cruises-subtab--rejected${
              activeTab === "rejected" ? " is-active" : ""
            }`}
            onClick={() => setActiveTab("rejected")}
          >
            <span className="proposed-cruises-subtab-label">Rejected</span>
            <span className="proposed-cruises-subtab-count">{rejectedCruises.length}</span>
          </button>
        </div>

        {activeTab === "active" && !disabled && !hasAcceptedCruise ? (
          <button type="button" className="proposed-cruises-add-button" onClick={openCreateModal}>
            Add proposed cruise
          </button>
        ) : null}
      </div>

      {activeTab === "active" ? (
        <div
          className="proposed-cruises-panel"
          role="tabpanel"
          id="proposed-cruises-panel-active"
          aria-labelledby="proposed-cruises-tab-active"
        >
          <div className="proposed-cruise-list">
            {renderCruiseList(activeCruises, "No proposed or accepted cruises yet.")}
          </div>
        </div>
      ) : (
        <div
          className="proposed-cruises-panel"
          role="tabpanel"
          id="proposed-cruises-panel-rejected"
          aria-labelledby="proposed-cruises-tab-rejected"
        >
          <div className="proposed-cruise-list">
            {renderCruiseList(rejectedCruises, "No rejected cruises yet.")}
          </div>
        </div>
      )}
    </div>
  );

  return (
    <>
      {embedded ? (
        body
      ) : (
        <section className="section-card proposed-cruises-card">
          <header className="section-card-header">
            <h3>Proposed Cruises</h3>
          </header>
          <div className="section-card-body">{body}</div>
        </section>
      )}

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
