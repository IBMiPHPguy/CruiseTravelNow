import { useRef, useState } from "react";

type ResearchUploadPanelProps = {
  disabled: boolean;
  uploading: boolean;
  onUpload: (file: File) => Promise<void>;
};

export default function ResearchUploadPanel({ disabled, uploading, onUpload }: ResearchUploadPanelProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  async function handleFile(file: File | null | undefined) {
    if (!file || uploading || disabled) {
      return;
    }
    await onUpload(file);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  return (
    <div className="research-task-upload">
      <div
        className={`attachment-dropzone research-task-dropzone${dragOver ? " is-dragover" : ""}${
          uploading ? " is-uploading" : ""
        }`}
        onDrop={(event) => {
          event.preventDefault();
          event.stopPropagation();
          setDragOver(false);
          void handleFile(event.dataTransfer.files?.[0]);
        }}
        onDragEnter={(event) => {
          event.preventDefault();
          event.stopPropagation();
          setDragOver(true);
        }}
        onDragOver={(event) => {
          event.preventDefault();
          event.stopPropagation();
          setDragOver(true);
        }}
        onDragLeave={(event) => {
          event.stopPropagation();
          if (event.currentTarget.contains(event.relatedTarget as Node)) {
            return;
          }
          setDragOver(false);
        }}
        onClick={() => {
          if (!uploading && !disabled) {
            fileInputRef.current?.click();
          }
        }}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            if (!uploading && !disabled) {
              fileInputRef.current?.click();
            }
          }
        }}
        role="button"
        tabIndex={disabled ? -1 : 0}
        aria-busy={uploading}
        aria-label="Upload research document"
      >
        <input
          ref={fileInputRef}
          className="attachment-dropzone-input"
          type="file"
          accept=".txt,text/plain"
          disabled={uploading || disabled}
          onChange={(event) => {
            void handleFile(event.target.files?.[0]);
          }}
          onClick={(event) => event.stopPropagation()}
        />
        <p className="attachment-dropzone-title">
          {uploading ? "Uploading..." : "Drop .txt research file here"}
        </p>
        <p className="attachment-dropzone-hint">
          {uploading ? "Please wait." : "or click to browse"}
        </p>
      </div>
    </div>
  );
}
