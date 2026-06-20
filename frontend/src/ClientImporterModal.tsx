import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { downloadClientImportTemplate, importClientSpreadsheet, parseClientImportFile } from "./api";
import type { ClientImportParseResponse, ClientImportResult } from "./types";

const ACCEPTED_IMPORT_TYPES = ".csv,.xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv";
const ACCEPTED_EXTENSIONS = [".csv", ".xlsx"];

type ImporterStep = "upload" | "map";

type ClientImporterModalProps = {
  open: boolean;
  onClose: () => void;
  onError: (message: string) => void;
  onImportComplete: (result: ClientImportResult) => void;
};

function UploadIcon() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.75">
      <path d="M12 16V4" />
      <path d="m7 9 5-5 5 5" />
      <path d="M4 20h16" />
    </svg>
  );
}

function isAcceptedImportFile(file: File): boolean {
  const lowerName = file.name.toLowerCase();
  return ACCEPTED_EXTENSIONS.some((extension) => lowerName.endsWith(extension));
}

function formatFieldLabel(fieldName: string): string {
  return fieldName
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function buildPreviewColumns(
  parseResult: ClientImportParseResponse,
  mapping: Record<string, string | null>,
): { fieldName: string; label: string; values: string[] }[] {
  return parseResult.target_fields
    .map((field) => {
      const sourceColumn = mapping[field.field_name];
      if (!sourceColumn) {
        return null;
      }
      const columnIndex = parseResult.source_columns.indexOf(sourceColumn);
      if (columnIndex < 0) {
        return null;
      }
      return {
        fieldName: field.field_name,
        label: formatFieldLabel(field.field_name),
        values: parseResult.preview_rows.map((row) => row[columnIndex] ?? ""),
      };
    })
    .filter((column): column is { fieldName: string; label: string; values: string[] } => column !== null);
}

export default function ClientImporterModal({ open, onClose, onError, onImportComplete }: ClientImporterModalProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<ImporterStep>("upload");
  const [dragOver, setDragOver] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState("");
  const [downloadingTemplate, setDownloadingTemplate] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [parseResult, setParseResult] = useState<ClientImportParseResponse | null>(null);
  const [mapping, setMapping] = useState<Record<string, string | null>>({});
  const [importing, setImporting] = useState(false);

  useEffect(() => {
    if (!open) {
      setStep("upload");
      setDragOver(false);
      setSelectedFile(null);
      setFileError("");
      setParsing(false);
      setParseResult(null);
      setMapping({});
      setImporting(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  const previewColumns = useMemo(
    () => (parseResult ? buildPreviewColumns(parseResult, mapping) : []),
    [parseResult, mapping],
  );

  const missingRequiredFields = useMemo(() => {
    if (!parseResult) {
      return [];
    }
    return parseResult.target_fields
      .filter((field) => field.required && !mapping[field.field_name])
      .map((field) => formatFieldLabel(field.field_name));
  }, [parseResult, mapping]);

  const canImport = missingRequiredFields.length === 0 && Boolean(selectedFile) && !importing;

  if (!open) {
    return null;
  }

  function handleClose() {
    onClose();
  }

  function handleDownloadTemplate() {
    setDownloadingTemplate(true);
    void downloadClientImportTemplate()
      .catch((downloadError) => {
        onError(
          downloadError instanceof Error
            ? downloadError.message
            : "Unable to download the client migration template.",
        );
      })
      .finally(() => {
        setDownloadingTemplate(false);
      });
  }

  function assignFile(file: File | null | undefined) {
    if (!file) {
      return;
    }
    if (!isAcceptedImportFile(file)) {
      setSelectedFile(null);
      setFileError("Upload a .csv or .xlsx file.");
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      return;
    }
    setFileError("");
    setSelectedFile(file);
  }

  function openFilePicker() {
    fileInputRef.current?.click();
  }

  function handleBackToUpload() {
    setStep("upload");
    setParseResult(null);
    setMapping({});
    setFileError("");
  }

  function handleUploadAndMap() {
    if (!selectedFile || parsing) {
      return;
    }

    setParsing(true);
    setFileError("");
    void parseClientImportFile(selectedFile)
      .then((result) => {
        setParseResult(result);
        setMapping(result.suggested_mapping);
        setStep("map");
      })
      .catch((parseError) => {
        onError(parseError instanceof Error ? parseError.message : "Unable to read the uploaded spreadsheet.");
      })
      .finally(() => {
        setParsing(false);
      });
  }

  function handleMappingChange(fieldName: string, sourceColumn: string) {
    setMapping((current) => ({
      ...current,
      [fieldName]: sourceColumn || null,
    }));
  }

  function handleImportClients() {
    if (!selectedFile || !canImport) {
      return;
    }

    setImporting(true);
    void importClientSpreadsheet(selectedFile, mapping)
      .then((result) => {
        onImportComplete(result);
      })
      .catch((importError) => {
        onError(importError instanceof Error ? importError.message : "Unable to import clients.");
      })
      .finally(() => {
        setImporting(false);
      });
  }

  const subtitle =
    step === "upload"
      ? "Bring client records into SailsPipeline with a guided spreadsheet upload."
      : "Match spreadsheet columns to SailsPipeline client fields before importing.";

  return createPortal(
    <div className="modal-backdrop client-importer-backdrop" role="presentation" onClick={handleClose}>
      <div
        className={`modal-card client-importer-modal${step === "map" ? " client-importer-modal-map-step" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="client-importer-title"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="modal-card-header client-importer-modal-header">
          <h3 id="client-importer-title">{step === "upload" ? "Client Importer" : "Map Spreadsheet Columns"}</h3>
          <p className="client-importer-modal-subtitle">{subtitle}</p>
        </header>

        {step === "upload" ? (
          <>
            <div className="client-importer-modal-body">
              <section className="client-importer-section">
                <button
                  type="button"
                  className="client-importer-template-button modal-primary"
                  disabled={downloadingTemplate}
                  onClick={handleDownloadTemplate}
                >
                  {downloadingTemplate ? "Preparing template..." : "Download Sample Migration Template (.xlsx)"}
                </button>
              </section>

              <section className="client-importer-section">
                <div
                  className={`attachment-dropzone client-importer-dropzone${dragOver ? " is-dragover" : ""}${
                    selectedFile ? " has-file" : ""
                  }`}
                  onDragEnter={(event) => {
                    event.preventDefault();
                    setDragOver(true);
                  }}
                  onDragOver={(event) => {
                    event.preventDefault();
                    setDragOver(true);
                  }}
                  onDragLeave={(event) => {
                    if (event.currentTarget.contains(event.relatedTarget as Node)) {
                      return;
                    }
                    setDragOver(false);
                  }}
                  onDrop={(event) => {
                    event.preventDefault();
                    setDragOver(false);
                    assignFile(event.dataTransfer.files?.[0]);
                  }}
                  onClick={openFilePicker}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      openFilePicker();
                    }
                  }}
                  role="button"
                  tabIndex={0}
                  aria-label="Upload client spreadsheet"
                >
                  <input
                    ref={fileInputRef}
                    className="attachment-dropzone-input"
                    type="file"
                    accept={ACCEPTED_IMPORT_TYPES}
                    onChange={(event) => {
                      assignFile(event.target.files?.[0]);
                    }}
                    onClick={(event) => event.stopPropagation()}
                  />
                  <div className="client-importer-dropzone-main">
                    <div className="attachment-dropzone-icon client-importer-dropzone-icon">
                      <UploadIcon />
                    </div>
                    <div className="client-importer-dropzone-copy">
                      <p className="attachment-dropzone-title">
                        {selectedFile ? selectedFile.name : "Drop client spreadsheet here"}
                      </p>
                      <p className="attachment-dropzone-hint">
                        {selectedFile
                          ? "Click or drop a different file to replace"
                          : "or click to browse from your computer"}
                      </p>
                      <div className="attachment-dropzone-types">CSV · XLSX</div>
                    </div>
                  </div>
                </div>
                {fileError ? <p className="status error client-importer-file-error">{fileError}</p> : null}
              </section>

              <section className="client-importer-info-card" aria-label="Import mapping information">
                <p className="client-importer-info-title">Next step: column mapping</p>
                <p className="client-importer-info-copy">
                  After upload, you&apos;ll match spreadsheet columns to SailsPipeline database tags such as passenger
                  names, contact info, and qualifiers before anything is saved.
                </p>
              </section>
            </div>

            <footer className="modal-actions-footer client-importer-modal-footer">
              <button type="button" className="modal-ghost" onClick={handleClose}>
                Cancel
              </button>
              <button
                type="button"
                className="modal-primary"
                disabled={!selectedFile || parsing}
                onClick={handleUploadAndMap}
              >
                {parsing ? "Reading file..." : "Upload & Map Data"}
              </button>
            </footer>
          </>
        ) : parseResult ? (
          <>
            <div className="client-importer-modal-body client-importer-map-body">
              <section className="client-importer-map-summary" aria-label="Uploaded file details">
                <p className="client-importer-map-file">
                  <span className="client-importer-map-file-label">File</span>
                  <span className="client-importer-map-file-value">{parseResult.filename}</span>
                </p>
                {parseResult.sheet_name ? (
                  <p className="client-importer-map-file">
                    <span className="client-importer-map-file-label">Sheet</span>
                    <span className="client-importer-map-file-value">{parseResult.sheet_name}</span>
                  </p>
                ) : null}
                <p className="client-importer-map-file">
                  <span className="client-importer-map-file-label">Columns found</span>
                  <span className="client-importer-map-file-value">{parseResult.source_columns.length}</span>
                </p>
              </section>

              <section className="client-importer-section" aria-label="Column mapping">
                <div className="client-importer-mapping-table-wrap">
                  <table className="client-importer-mapping-table">
                    <thead>
                      <tr>
                        <th scope="col">SailsPipeline field</th>
                        <th scope="col">Spreadsheet column</th>
                      </tr>
                    </thead>
                    <tbody>
                      {parseResult.target_fields.map((field) => (
                        <tr key={field.field_name}>
                          <td className="client-importer-mapping-target">
                            <span className="client-importer-mapping-field-name">
                              {formatFieldLabel(field.field_name)}
                            </span>
                            {field.required ? (
                              <span className="client-importer-mapping-required">Required</span>
                            ) : null}
                            <span className="client-importer-mapping-description">{field.description}</span>
                          </td>
                          <td className="client-importer-mapping-source">
                            <select
                              className="client-importer-mapping-select"
                              value={mapping[field.field_name] ?? ""}
                              onChange={(event) => handleMappingChange(field.field_name, event.target.value)}
                              aria-label={`Map ${formatFieldLabel(field.field_name)}`}
                            >
                              <option value="">Not mapped</option>
                              {parseResult.source_columns.map((column) => (
                                <option key={column} value={column}>
                                  {column}
                                </option>
                              ))}
                            </select>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>

              {missingRequiredFields.length > 0 ? (
                <p className="status error client-importer-map-validation">
                  Map required fields before importing: {missingRequiredFields.join(", ")}.
                </p>
              ) : null}

              {previewColumns.length > 0 ? (
                <section className="client-importer-section" aria-label="Mapped data preview">
                  <p className="client-importer-info-title">Preview mapped rows</p>
                  <div className="client-importer-preview-table-wrap">
                    <table className="client-importer-preview-table">
                      <thead>
                        <tr>
                          {previewColumns.map((column) => (
                            <th key={column.fieldName} scope="col">
                              {column.label}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {parseResult.preview_rows.map((_, rowIndex) => (
                          <tr key={`preview-row-${rowIndex}`}>
                            {previewColumns.map((column) => (
                              <td key={`${column.fieldName}-${rowIndex}`}>{column.values[rowIndex] || "—"}</td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>
              ) : null}
            </div>

            <footer className="modal-actions-footer client-importer-modal-footer">
              <button type="button" className="modal-ghost" onClick={handleBackToUpload} disabled={importing}>
                Back
              </button>
              <button
                type="button"
                className="modal-primary"
                disabled={!canImport}
                onClick={handleImportClients}
              >
                {importing ? "Importing..." : "Import Clients"}
              </button>
            </footer>
          </>
        ) : null}
      </div>
    </div>,
    document.body,
  );
}
