export const QUALIFIER_BADGE_CLASS: Record<string, string> = {
  Military: "passenger-qualifier-badge--military",
  Educator: "passenger-qualifier-badge--educator",
  "First Responder": "passenger-qualifier-badge--first-responder",
  "55+ (Senior)": "passenger-qualifier-badge--senior",
};

export function qualifierBadgeClass(qualifier: string): string {
  return QUALIFIER_BADGE_CLASS[qualifier] ?? "passenger-qualifier-badge--default";
}
