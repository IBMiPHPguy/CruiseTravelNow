import { useEffect, useRef, useState } from "react";
import { updateRequest } from "./api";
import CloseRequestModal from "./CloseRequestModal";
import { REQUEST_STATUS_CLOSED, REQUEST_STATUS_OPEN } from "./formOptions";
import IconTooltip from "./IconTooltip";
import StatusMenuIcon from "./StatusMenuIcon";
import ViewIcon from "./ViewIcon";
import type { DashboardOpenRequest } from "./types";

type OpenRequestQuickActionsProps = {
  request: DashboardOpenRequest;
  onView: () => void;
  onStatusChanged: () => void;
  onError: (message: string) => void;
};

export default function OpenRequestQuickActions({
  request,
  onView,
  onStatusChanged,
  onError,
}: OpenRequestQuickActionsProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [showCloseModal, setShowCloseModal] = useState(false);
  const [closing, setClosing] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const clientName = `${request.first_name} ${request.last_name}`;

  useEffect(() => {
    if (!menuOpen) {
      return;
    }

    function handlePointerDown(event: MouseEvent) {
      if (!menuRef.current?.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setMenuOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [menuOpen]);

  async function handleCloseRequest(closeReason: string) {
    setClosing(true);
    onError("");

    try {
      await updateRequest(request.id, {
        status: REQUEST_STATUS_CLOSED,
        close_reason: closeReason,
      });
      setShowCloseModal(false);
      setMenuOpen(false);
      onStatusChanged();
    } catch (closeError) {
      onError(closeError instanceof Error ? closeError.message : "Unable to close request.");
    } finally {
      setClosing(false);
    }
  }

  return (
    <>
      <div className="dashboard-table-actions" ref={menuRef}>
        <IconTooltip label={`View request for ${clientName}`} align="end">
          <button
            type="button"
            className="icon-button"
            aria-label={`View request for ${clientName}`}
            onClick={onView}
          >
            <ViewIcon />
          </button>
        </IconTooltip>

        <div className="quick-status-menu">
          <IconTooltip label={`Quick edit status for ${clientName}`} placement="below" align="end">
            <button
              type="button"
              className="icon-button"
              aria-label={`Quick edit status for ${clientName}`}
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen((open) => !open)}
            >
              <StatusMenuIcon />
            </button>
          </IconTooltip>

          {menuOpen ? (
            <div className="quick-status-menu-popover" role="menu" aria-label={`Status options for ${clientName}`}>
              <p className="quick-status-menu-label">Request status</p>
              <button
                type="button"
                role="menuitemradio"
                className="quick-status-menu-item is-current"
                aria-checked="true"
                disabled
              >
                {REQUEST_STATUS_OPEN}
                <span className="quick-status-menu-current">Current</span>
              </button>
              <button
                type="button"
                role="menuitemradio"
                className="quick-status-menu-item"
                aria-checked="false"
                onClick={() => {
                  setMenuOpen(false);
                  setShowCloseModal(true);
                }}
              >
                {REQUEST_STATUS_CLOSED}
              </button>
            </div>
          ) : null}
        </div>
      </div>

      <CloseRequestModal
        open={showCloseModal}
        request={request}
        closing={closing}
        onCancel={() => setShowCloseModal(false)}
        onConfirm={handleCloseRequest}
      />
    </>
  );
}
