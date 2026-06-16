import { useEffect, useMemo, useRef, useState } from "react";
import { fetchRequestChangeHistory } from "./api";
import {
  buildAuditEntrySearchText,
  formatAuditFieldName,
  formatAuditValue,
  matchesAuditSearch,
} from "./auditLabels";
import type { RequestPassenger, RequestPassengerAudit, TravelRequestAudit } from "./types";
import { formatTimestamp } from "./utils";

const INITIAL_VISIBLE_COUNT = 3;
const LOAD_BATCH_SIZE = 10;

type ChangeHistoryPanelProps = {
  requestId: number;
  passengers: RequestPassenger[];
  onEntryCountChange?: (count: number) => void;
};

function resolvePassengerLabel(
  audit: RequestPassengerAudit,
  passengers: RequestPassenger[],
): string | null {
  if (audit.passenger_label) {
    return audit.passenger_label;
  }

  if (audit.request_passenger_id) {
    const passenger = passengers.find((item) => item.id === audit.request_passenger_id);
    if (passenger) {
      return `${passenger.first_name} ${passenger.last_name}`;
    }
  }

  if (audit.field_name === "passenger_removed" && audit.from_value) {
    return audit.from_value.replace(/\s*\(#\d+\)$/, "");
  }

  return null;
}

type CombinedAuditEntry =
  | { kind: "request"; entry: TravelRequestAudit }
  | { kind: "passenger"; entry: RequestPassengerAudit };

function getEntrySearchText(item: CombinedAuditEntry, passengers: RequestPassenger[]): string {
  const passengerLabel =
    item.kind === "passenger" ? resolvePassengerLabel(item.entry, passengers) : null;

  return buildAuditEntrySearchText({
    kind: item.kind,
    fieldName: item.entry.field_name,
    fromValue: item.entry.from_value,
    toValue: item.entry.to_value,
    changedBy: item.entry.changed_by.username,
    changedAtLabel: formatTimestamp(item.entry.changed_at),
    scopeLabel: renderScopeLabel(item, passengerLabel),
    passengerId: item.kind === "passenger" ? item.entry.request_passenger_id : null,
    passengerLabel,
  });
}

function renderScopeLabel(item: CombinedAuditEntry, passengerLabel?: string | null): string {
  if (item.kind === "request") {
    return "Request";
  }
  if (passengerLabel) {
    return passengerLabel;
  }
  return item.entry.request_passenger_id
    ? `Passenger #${item.entry.request_passenger_id}`
    : "Passenger";
}

function ChangeHistoryRow({
  item,
  passengers,
}: {
  item: CombinedAuditEntry;
  passengers: RequestPassenger[];
}) {
  const passengerLabel = item.kind === "passenger" ? resolvePassengerLabel(item.entry, passengers) : null;
  const scopeLabel = renderScopeLabel(item, passengerLabel);

  return (
    <tr>
      <td className="meta change-history-table-changed">{formatTimestamp(item.entry.changed_at)}</td>
      <td>{scopeLabel}</td>
      <td>{formatAuditFieldName(item.entry.field_name)}</td>
      <td className="meta">{item.entry.changed_by.username}</td>
      <td className="change-history-table-value">{formatAuditValue(item.entry.from_value)}</td>
      <td className="change-history-table-value">{formatAuditValue(item.entry.to_value)}</td>
    </tr>
  );
}

export default function ChangeHistoryPanel({
  requestId,
  passengers,
  onEntryCountChange,
}: ChangeHistoryPanelProps) {
  const [requestAudits, setRequestAudits] = useState<TravelRequestAudit[]>([]);
  const [passengerAudits, setPassengerAudits] = useState<RequestPassengerAudit[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [visibleCount, setVisibleCount] = useState(INITIAL_VISIBLE_COUNT);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setLoadError("");

    fetchRequestChangeHistory(requestId)
      .then((history) => {
        if (cancelled) {
          return;
        }
        setRequestAudits(history.request_audits);
        setPassengerAudits(history.passenger_audits);
        onEntryCountChange?.(history.request_audits.length + history.passenger_audits.length);
      })
      .catch((error) => {
        if (cancelled) {
          return;
        }
        setLoadError(error instanceof Error ? error.message : "Unable to load change history.");
        setRequestAudits([]);
        setPassengerAudits([]);
        onEntryCountChange?.(0);
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [requestId, onEntryCountChange]);

  const entries = useMemo(() => {
    const combined: CombinedAuditEntry[] = [
      ...requestAudits.map((entry) => ({ kind: "request" as const, entry })),
      ...passengerAudits.map((entry) => ({ kind: "passenger" as const, entry })),
    ];
    return combined.sort(
      (left, right) =>
        new Date(right.entry.changed_at).getTime() - new Date(left.entry.changed_at).getTime(),
    );
  }, [passengerAudits, requestAudits]);

  const filteredEntries = useMemo(() => {
    if (!searchQuery.trim()) {
      return entries;
    }
    return entries.filter((item) => matchesAuditSearch(getEntrySearchText(item, passengers), searchQuery));
  }, [entries, passengers, searchQuery]);

  const visibleEntries = filteredEntries.slice(0, visibleCount);
  const hasMore = visibleCount < filteredEntries.length;
  const isSearching = searchQuery.trim().length > 0;

  useEffect(() => {
    setVisibleCount(INITIAL_VISIBLE_COUNT);
    scrollRef.current?.scrollTo({ top: 0 });
  }, [searchQuery]);

  useEffect(() => {
    if (!hasMore) {
      return;
    }

    const sentinel = loadMoreRef.current;
    const scrollContainer = scrollRef.current;
    if (!sentinel || !scrollContainer) {
      return;
    }

    const observer = new IntersectionObserver(
      (observerEntries) => {
        if (observerEntries.some((entry) => entry.isIntersecting)) {
          setVisibleCount((current) => Math.min(current + LOAD_BATCH_SIZE, filteredEntries.length));
        }
      },
      {
        root: scrollContainer,
        rootMargin: "80px",
      },
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [filteredEntries.length, hasMore, visibleCount]);

  if (loading) {
    return <p className="meta">Loading change history...</p>;
  }

  if (loadError) {
    return <p className="status error">{loadError}</p>;
  }

  if (entries.length === 0) {
    return <p className="meta">No request or passenger field changes recorded yet.</p>;
  }

  return (
    <>
      <label className="change-history-search">
        Search change history
        <input
          type="search"
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
          placeholder="Search passenger name, field, user, old or new value..."
        />
      </label>

      <p className="meta change-history-summary">
        {isSearching
          ? filteredEntries.length === 0
            ? `No changes match "${searchQuery.trim()}".`
            : hasMore
              ? `Showing ${visibleCount} of ${filteredEntries.length} matching changes (${entries.length} total). Scroll for more.`
              : `${filteredEntries.length} matching change${filteredEntries.length === 1 ? "" : "s"} (${entries.length} total).`
          : filteredEntries.length > INITIAL_VISIBLE_COUNT
            ? hasMore
              ? `Showing ${visibleCount} of ${filteredEntries.length} changes. Scroll for more.`
              : `${filteredEntries.length} total changes.`
            : `${filteredEntries.length} total change${filteredEntries.length === 1 ? "" : "s"}.`}
      </p>

      <div className="change-history-table-wrap change-history-scroll" ref={scrollRef}>
        {visibleEntries.length === 0 ? (
          <p className="meta">Try a different search term.</p>
        ) : (
          <table className="change-history-table">
            <thead>
              <tr>
                <th scope="col">Changed</th>
                <th scope="col">Scope</th>
                <th scope="col">Field</th>
                <th scope="col">Changed by</th>
                <th scope="col">From</th>
                <th scope="col">To</th>
              </tr>
            </thead>
            <tbody>
              {visibleEntries.map((item) => (
                <ChangeHistoryRow item={item} passengers={passengers} key={`${item.kind}-${item.entry.id}`} />
              ))}
            </tbody>
          </table>
        )}
        {hasMore ? <div className="change-history-load-more" ref={loadMoreRef} aria-hidden="true" /> : null}
      </div>
    </>
  );
}
