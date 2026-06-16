import { useState } from "react";
import AttachmentsSection from "./AttachmentsSection";
import CommunicationsSection from "./CommunicationsSection";
import type { Attachment, RequestCommunicationSummary, RequestWorkflow } from "./types";

type ClientContentTab = "transcripts" | "chats" | "communications";

type RequestClientContentSectionProps = {
  requestId: number;
  callTranscripts: Attachment[];
  chatLogs: Attachment[];
  communications: RequestCommunicationSummary[];
  workflows: RequestWorkflow[];
  disabled: boolean;
  uploadingTranscript: boolean;
  uploadingChat: boolean;
  onUploadTranscript: (file: File) => Promise<void>;
  onUploadChat: (file: File) => Promise<void>;
  onChanged: () => Promise<void>;
  onError: (message: string) => void;
};

export default function RequestClientContentSection({
  requestId,
  callTranscripts,
  chatLogs,
  communications,
  workflows,
  disabled,
  uploadingTranscript,
  uploadingChat,
  onUploadTranscript,
  onUploadChat,
  onChanged,
  onError,
}: RequestClientContentSectionProps) {
  const [activeTab, setActiveTab] = useState<ClientContentTab>("transcripts");

  return (
    <section className="section-card section-tabs-card section-tabs-card--sidebar request-client-content-section">
      <div className="section-tablist" role="tablist" aria-label="Client content">
        <button
          type="button"
          role="tab"
          id="client-content-tab-transcripts"
          aria-selected={activeTab === "transcripts"}
          aria-controls="client-content-panel-transcripts"
          className={`section-tab${activeTab === "transcripts" ? " is-active" : ""}`}
          onClick={() => setActiveTab("transcripts")}
        >
          Call transcripts ({callTranscripts.length})
        </button>
        <button
          type="button"
          role="tab"
          id="client-content-tab-chats"
          aria-selected={activeTab === "chats"}
          aria-controls="client-content-panel-chats"
          className={`section-tab${activeTab === "chats" ? " is-active" : ""}`}
          onClick={() => setActiveTab("chats")}
        >
          Chat logs ({chatLogs.length})
        </button>
        <button
          type="button"
          role="tab"
          id="client-content-tab-communications"
          aria-selected={activeTab === "communications"}
          aria-controls="client-content-panel-communications"
          className={`section-tab${activeTab === "communications" ? " is-active" : ""}`}
          onClick={() => setActiveTab("communications")}
        >
          Communications ({communications.length})
        </button>
      </div>

      <div className="section-card-body section-tab-body">
        {activeTab === "transcripts" ? (
          <div
            role="tabpanel"
            id="client-content-panel-transcripts"
            aria-labelledby="client-content-tab-transcripts"
          >
            <AttachmentsSection
              embedded
              title="Call Transcripts"
              kind="transcripts"
              requestId={requestId}
              items={callTranscripts}
              disabled={disabled}
              uploading={uploadingTranscript}
              onUpload={onUploadTranscript}
            />
          </div>
        ) : activeTab === "chats" ? (
          <div role="tabpanel" id="client-content-panel-chats" aria-labelledby="client-content-tab-chats">
            <AttachmentsSection
              embedded
              title="Chat Logs"
              kind="chats"
              requestId={requestId}
              items={chatLogs}
              disabled={disabled}
              uploading={uploadingChat}
              onUpload={onUploadChat}
            />
          </div>
        ) : (
          <div
            role="tabpanel"
            id="client-content-panel-communications"
            aria-labelledby="client-content-tab-communications"
          >
            <CommunicationsSection
              embedded
              requestId={requestId}
              communications={communications}
              workflows={workflows}
              disabled={disabled}
              onChanged={onChanged}
              onError={onError}
            />
          </div>
        )}
      </div>
    </section>
  );
}
