import { useEffect } from "react";
import { createPortal } from "react-dom";
import type { ClientImportResult } from "./types";

type ClientImportSuccessModalProps = {
  open: boolean;
  result: ClientImportResult | null;
  onClose: () => void;
};

function buildSummary(result: ClientImportResult): string {
  const importedLabel = `${result.imported_count} client${result.imported_count === 1 ? "" : "s"}`;
  if (result.imported_count === 0) {
    return "No clients were imported.";
  }
  if (result.errors.length === 0) {
    return `Successfully imported ${importedLabel}.`;
  }
  return `Imported ${importedLabel}. Some rows could not be imported.`;
}

export default function ClientImportSuccessModal({ open, result, onClose }: ClientImportSuccessModalProps) {
  useEffect(() => {
    if (!open) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  if (!open || !result) {
    return null;
  }

  const hasFailures = result.errors.length > 0;

  return createPortal(
    <div className="modal-backdrop client-import-success-backdrop" role="presentation" onClick={onClose}>
      <div
        className="modal-card client-import-success-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="client-import-success-title"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="modal-card-header client-import-success-header">
          <h3 id="client-import-success-title">{hasFailures ? "Import finished with issues" : "Import complete"}</h3>
          <p className="client-import-success-subtitle">{buildSummary(result)}</p>
        </header>

        <div className="client-import-success-body">
          <section className="client-import-success-metrics" aria-label="Import summary">
            <p className="client-import-success-metric">
              <span className="client-import-success-metric-label">Imported</span>
              <span className="client-import-success-metric-value">{result.imported_count}</span>
            </p>
            {result.skipped_count > 0 ? (
              <p className="client-import-success-metric">
                <span className="client-import-success-metric-label">Skipped blank rows</span>
                <span className="client-import-success-metric-value">{result.skipped_count}</span>
              </p>
            ) : null}
            {hasFailures ? (
              <p className="client-import-success-metric client-import-success-metric-failed">
                <span className="client-import-success-metric-label">Failed</span>
                <span className="client-import-success-metric-value">{result.errors.length}</span>
              </p>
            ) : null}
          </section>

          {hasFailures ? (
            <section className="client-import-success-failures" aria-label="Failed import rows">
              <p className="client-importer-info-title">Records that failed</p>
              <div className="client-import-success-failures-table-wrap">
                <table className="client-import-success-failures-table">
                  <thead>
                    <tr>
                      <th scope="col">Row</th>
                      <th scope="col">Record</th>
                      <th scope="col">Reason</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.errors.map((error) => (
                      <tr key={`${error.row_number}-${error.message}`}>
                        <td>{error.row_number}</td>
                        <td>{error.record_label}</td>
                        <td>{error.message}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          ) : null}
        </div>

        <footer className="modal-actions-footer client-import-success-footer">
          <button type="button" className="modal-primary" onClick={onClose}>
            Close
          </button>
        </footer>
      </div>
    </div>,
    document.body,
  );
}
