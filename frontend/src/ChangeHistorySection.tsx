import { useEffect, useMemo, useRef, useState } from "react";
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

type ChangeHistorySectionProps = {
  requestAudits: TravelRequestAudit[];
  passengerAudits: RequestPassengerAudit[];
  passengers: RequestPassenger[];
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

function ChangeHistoryItem({
  item,
  passengers,
}: {
  item: CombinedAuditEntry;
  passengers: RequestPassenger[];
}) {
  const passengerLabel = item.kind === "passenger" ? resolvePassengerLabel(item.entry, passengers) : null;
  const scopeLabel = renderScopeLabel(item, passengerLabel);

  return (
    <article className="change-history-item">
      <div className="meta">
        {scopeLabel} · {formatAuditFieldName(item.entry.field_name)} ·{" "}
        {item.entry.changed_by.username} · {formatTimestamp(item.entry.changed_at)}
      </div>
      <div className="change-history-values">
        <div>
          <span className="note-audit-label">From</span>
          <div>{formatAuditValue(item.entry.from_value)}</div>
        </div>
        <div>
          <span className="note-audit-label">To</span>
          <div>{formatAuditValue(item.entry.to_value)}</div>
        </div>
      </div>
    </article>
  );
}

export default function ChangeHistorySection({
  requestAudits,
  passengerAudits,
  passengers,
}: ChangeHistorySectionProps) {
  const [expanded, setExpanded] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [visibleCount, setVisibleCount] = useState(INITIAL_VISIBLE_COUNT);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);

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
    if (!expanded) {
      setVisibleCount(INITIAL_VISIBLE_COUNT);
      setSearchQuery("");
    }
  }, [expanded]);

  useEffect(() => {
    setVisibleCount(INITIAL_VISIBLE_COUNT);
    scrollRef.current?.scrollTo({ top: 0 });
  }, [searchQuery]);

  useEffect(() => {
    if (!expanded || !hasMore) {
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
  }, [expanded, filteredEntries.length, hasMore, visibleCount]);

  if (entries.length === 0) {
    return null;
  }

  return (
    <section className="section-card change-history-card">
      <header className="section-card-header">
        <h3>Change History</h3>
      </header>
      <div className="section-card-body">
        <button
          type="button"
          className={expanded ? "change-history-toggle modal-secondary" : "change-history-toggle"}
          onClick={() => setExpanded((current) => !current)}
        >
          {expanded ? "Hide change history" : `Show change history (${entries.length})`}
        </button>
        {expanded ? (
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

            <div className="change-history-list change-history-scroll" ref={scrollRef}>
              {visibleEntries.length === 0 ? (
                <p className="meta">Try a different search term.</p>
              ) : (
                visibleEntries.map((item) => (
                  <ChangeHistoryItem item={item} passengers={passengers} key={`${item.kind}-${item.entry.id}`} />
                ))
              )}
              {hasMore ? <div className="change-history-load-more" ref={loadMoreRef} aria-hidden="true" /> : null}
            </div>
          </>
        ) : null}
      </div>
    </section>
  );
}
