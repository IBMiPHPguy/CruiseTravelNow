export const SALES_REJECTION_SEGMENT_OPEN_ACTIVE = "open_active_lead";
export const SALES_REJECTION_SEGMENT_CLOSED_LOST = "closed_lost_lead";

export type SalesRejectionSegment =
  | typeof SALES_REJECTION_SEGMENT_OPEN_ACTIVE
  | typeof SALES_REJECTION_SEGMENT_CLOSED_LOST;

export const SALES_REJECTION_SEGMENTS: ReadonlyArray<{
  id: SalesRejectionSegment;
  badgeLabel: string;
  title: string;
}> = [
  {
    id: SALES_REJECTION_SEGMENT_OPEN_ACTIVE,
    badgeLabel: "Active Leads",
    title: "Active leads quote rejection reasons",
  },
  {
    id: SALES_REJECTION_SEGMENT_CLOSED_LOST,
    badgeLabel: "Closed Leads",
    title: "Closed leads quote rejection reasons",
  },
];

export function groupRejectionReasonsBySegment<
  T extends { segment: string; reason: string; count: number },
>(reasons: T[]): Map<SalesRejectionSegment, T[]> {
  const grouped = new Map<SalesRejectionSegment, T[]>();
  for (const segment of SALES_REJECTION_SEGMENTS) {
    grouped.set(segment.id, []);
  }
  for (const item of reasons) {
    if (item.segment === SALES_REJECTION_SEGMENT_OPEN_ACTIVE) {
      grouped.get(SALES_REJECTION_SEGMENT_OPEN_ACTIVE)?.push(item);
    } else if (item.segment === SALES_REJECTION_SEGMENT_CLOSED_LOST) {
      grouped.get(SALES_REJECTION_SEGMENT_CLOSED_LOST)?.push(item);
    }
  }
  return grouped;
}
