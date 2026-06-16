import { useState } from "react";
import NotesSection from "./NotesSection";
import ResearchDocumentsSection from "./ResearchDocumentsSection";
import type { RequestNote, ResearchDocument } from "./types";

type NotesResearchTab = "notes" | "research";

type RequestNotesResearchSectionProps = {
  requestId: number;
  notes: RequestNote[];
  researchDocuments: ResearchDocument[];
  disabled: boolean;
  onChanged: () => Promise<void>;
  onError: (message: string) => void;
};

export default function RequestNotesResearchSection({
  requestId,
  notes,
  researchDocuments,
  disabled,
  onChanged,
  onError,
}: RequestNotesResearchSectionProps) {
  const [activeTab, setActiveTab] = useState<NotesResearchTab>("notes");

  return (
    <section className="section-card section-tabs-card request-notes-research-section">
      <div className="section-tablist" role="tablist" aria-label="Notes and research documents">
        <button
          type="button"
          role="tab"
          id="notes-research-tab-notes"
          aria-selected={activeTab === "notes"}
          aria-controls="notes-research-panel-notes"
          className={`section-tab${activeTab === "notes" ? " is-active" : ""}`}
          onClick={() => setActiveTab("notes")}
        >
          Notes ({notes.length})
        </button>
        <button
          type="button"
          role="tab"
          id="notes-research-tab-research"
          aria-selected={activeTab === "research"}
          aria-controls="notes-research-panel-research"
          className={`section-tab${activeTab === "research" ? " is-active" : ""}`}
          onClick={() => setActiveTab("research")}
        >
          Research documents ({researchDocuments.length})
        </button>
      </div>

      <div className="section-card-body section-tab-body">
        {activeTab === "notes" ? (
          <div role="tabpanel" id="notes-research-panel-notes" aria-labelledby="notes-research-tab-notes">
            <NotesSection
              embedded
              requestId={requestId}
              notes={notes}
              disabled={disabled}
              onChanged={onChanged}
              onError={onError}
            />
          </div>
        ) : (
          <div role="tabpanel" id="notes-research-panel-research" aria-labelledby="notes-research-tab-research">
            <ResearchDocumentsSection embedded requestId={requestId} items={researchDocuments} />
          </div>
        )}
      </div>
    </section>
  );
}
