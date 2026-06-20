import { useEffect, useState } from "react";
import NotesSection from "./NotesSection";
import ResearchDocumentsSection from "./ResearchDocumentsSection";
import type { RequestNoteSummary, ResearchDocument } from "./types";

type NotesResearchTab = "notes" | "research";

type RequestNotesResearchSectionProps = {
  requestId: number;
  notes: RequestNoteSummary[];
  researchDocuments: ResearchDocument[];
  focusedNoteId?: number | null;
  onFocusedNoteHandled?: () => void;
  disabled: boolean;
  onChanged: () => Promise<void>;
  onError: (message: string) => void;
  embeddedInWorkspace?: boolean;
};

export default function RequestNotesResearchSection({
  requestId,
  notes,
  researchDocuments,
  focusedNoteId = null,
  onFocusedNoteHandled,
  disabled,
  onChanged,
  onError,
  embeddedInWorkspace = false,
}: RequestNotesResearchSectionProps) {
  const [activeTab, setActiveTab] = useState<NotesResearchTab>("notes");

  useEffect(() => {
    if (focusedNoteId) {
      setActiveTab("notes");
    }
  }, [focusedNoteId]);

  const rootClassName = embeddedInWorkspace
    ? "workspace-nested-tabs request-notes-research-section"
    : "section-card section-tabs-card request-notes-research-section";

  return (
    <div className={rootClassName}>
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
              focusedNoteId={focusedNoteId}
              onFocusedNoteHandled={onFocusedNoteHandled}
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
    </div>
  );
}
