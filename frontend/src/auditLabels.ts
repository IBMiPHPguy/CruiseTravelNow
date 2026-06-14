const FIELD_LABELS: Record<string, string> = {
  first_name: "First name",
  last_name: "Last name",
  email: "Email",
  phone: "Phone",
  state_of_residency: "State / province",
  cruise_line: "Cruise line",
  excluded_cruise_line: "Cruise lines to avoid",
  destination: "Destination",
  destination_details: "Destination details",
  departure_date: "Departure date",
  return_date: "Return date",
  cabin_types: "Cabin types",
  qualifiers: "Qualifiers",
  passengers: "Passenger count",
  cabins_needed: "Cabins needed",
  status: "Status",
  close_reason: "Close reason",
  date_of_birth: "Date of birth",
  passenger_removed: "Passenger removed",
};

export function formatAuditFieldName(fieldName: string): string {
  return FIELD_LABELS[fieldName] ?? fieldName.replace(/_/g, " ");
}

export function formatAuditValue(value: string | null): string {
  if (value === null || value === "") {
    return "(empty)";
  }

  try {
    const parsed = JSON.parse(value) as unknown;
    if (Array.isArray(parsed)) {
      return parsed.join(", ");
    }
    if (parsed && typeof parsed === "object") {
      return Object.entries(parsed as Record<string, unknown>)
        .flatMap(([key, entry]) => {
          if (Array.isArray(entry)) {
            return entry.map((item) => `${key}: ${String(item)}`);
          }
          return [`${key}: ${String(entry)}`];
        })
        .join(", ");
    }
  } catch {
    // Keep plain text values as-is.
  }

  return value;
}

export function buildAuditEntrySearchText(input: {
  kind: "request" | "passenger";
  fieldName: string;
  fromValue: string | null;
  toValue: string | null;
  changedBy: string;
  changedAtLabel: string;
  scopeLabel: string;
  passengerId?: number | null;
  passengerLabel?: string | null;
}): string {
  const labelParts = (input.passengerLabel ?? "")
    .replace(/\s*\(#\d+\)$/, "")
    .split(/\s+/)
    .filter(Boolean);

  return [
    input.kind,
    input.scopeLabel,
    input.passengerLabel,
    ...labelParts,
    input.fieldName,
    formatAuditFieldName(input.fieldName),
    input.fromValue,
    formatAuditValue(input.fromValue),
    input.toValue,
    formatAuditValue(input.toValue),
    input.changedBy,
    input.changedAtLabel,
    input.passengerId ? String(input.passengerId) : "",
  ]
    .filter(Boolean)
    .join(" ");
}

export function matchesAuditSearch(haystack: string, query: string): boolean {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) {
    return true;
  }

  const tokens = normalizedQuery.split(/\s+/).filter(Boolean);
  const normalizedHaystack = haystack.toLowerCase();
  return tokens.every((token) => normalizedHaystack.includes(token));
}
