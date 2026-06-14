import { useEffect, useMemo, useRef, useState } from "react";
import { formatAuditValue } from "./auditLabels";
import {
  buildNoteAuditSearchText,
  flattenNoteAudits,
  matchesAuditSearch,
  type NoteHistoryEntry,
} from "./noteForm";
import type { RequestNoteAudit } from "./types";
import { formatTimestamp } from "./utils";

const INITIAL_VISIBLE_COUNT = 3;
const LOAD_BATCH_SIZE = 10;

type NoteChangeHistoryPanelProps = {
  audits: RequestNoteAudit[];
};

function NoteChangeHistoryItem({ entry }: { entry: NoteHistoryEntry }) {
  return (
    <article className="change-history-item">
      <div className="meta">
        Note · {entry.fieldLabel} · {entry.audit.changed_by.username} ·{" "}
        {formatTimestamp(entry.audit.changed_at)}
      </div>
      <div className="change-history-values">
        <div>
          <span className="note-audit-label">From</span>
          <div>{formatAuditValue(entry.fromValue)}</div>
        </div>
        <div>
          <span className="note-audit-label">To</span>
          <div>{formatAuditValue(entry.toValue)}</div>
        </div>
      </div>
    </article>
  );
}

export default function NoteChangeHistoryPanel({ audits }: NoteChangeHistoryPanelProps) {
  const [expanded, setExpanded] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [visibleCount, setVisibleCount] = useState(INITIAL_VISIBLE_COUNT);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  const entries = useMemo(() => flattenNoteAudits(audits), [audits]);

  const filteredEntries = useMemo(() => {
    if (!searchQuery.trim()) {
      return entries;
    }
    return entries.filter((entry) => matchesAuditSearch(buildNoteAuditSearchText(entry), searchQuery));
  }, [entries, searchQuery]);

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
    <div className="note-change-history-panel">
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
              placeholder="Search field, user, old or new value..."
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
              visibleEntries.map((entry) => <NoteChangeHistoryItem entry={entry} key={entry.id} />)
            )}
            {hasMore ? <div className="change-history-load-more" ref={loadMoreRef} aria-hidden="true" /> : null}
          </div>
        </>
      ) : null}
    </div>
  );
}
