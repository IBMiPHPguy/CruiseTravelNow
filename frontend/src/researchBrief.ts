import type { RequestNote, TravelRequestDetail, TravelRequestInput } from "./types";
import { formatDestinationSummary } from "./utils";

function line(label: string, value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === "") {
    return `${label}: —`;
  }
  return `${label}: ${value}`;
}

export function buildResearchBriefText(
  request: TravelRequestDetail,
  form: TravelRequestInput,
  notesWithContent: Pick<RequestNote, "summary" | "content">[] = [],
): string {
  const summaryRequest = {
    ...request,
    first_name: form.first_name,
    last_name: form.last_name,
    email: form.email,
    phone: form.phone,
    state_of_residency: form.state_of_residency,
    cruise_line: form.cruise_line,
    excluded_cruise_line: form.excluded_cruise_line ?? null,
    destination: form.destination,
    destination_details: ["Caribbean", "Alaska", "Asia", "Europe"].includes(form.destination)
      ? form.destination_details ?? null
      : null,
    departure_date: form.departure_date,
    return_date: form.return_date,
    cabin_types: form.cabin_types,
    qualifiers: form.qualifiers,
    passengers: form.passengers,
    cabins_needed: form.cabins_needed,
  };

  const sections: string[] = [
    "Cruise Travel Now — Research Brief",
    line("Request", `#${request.id}`),
    line("Generated", new Date().toLocaleString()),
    "",
    "CLIENT",
    line("Name", `${form.first_name} ${form.last_name}`.trim()),
    line("Email", form.email),
    line("Phone", form.phone),
    line("State of residency", form.state_of_residency),
    "",
    "CRUISE PREFERENCES",
    line("Cruise line", form.cruise_line),
    line("Excluded cruise line", form.excluded_cruise_line?.trim() || null),
    line("Destination", formatDestinationSummary(summaryRequest)),
    line("Departure date", form.departure_date),
    line("Return date", form.return_date),
    line("Cabin types", form.cabin_types.join(", ") || null),
    line("Qualifiers", form.qualifiers.join(", ") || null),
    line("Passenger count", form.passengers),
    line("Cabins needed", form.cabins_needed),
    "",
    "PASSENGERS",
    ...(request.request_passengers.length === 0
      ? ["  (none)"]
      : request.request_passengers.map((passenger, index) => {
          const name = `${passenger.first_name} ${passenger.last_name}`.trim();
          const dob = passenger.date_of_birth ? `DOB ${passenger.date_of_birth}` : "DOB not set";
          return `  ${index + 1}. ${name} — ${dob} — ${passenger.email} — ${passenger.phone}`;
        })),
    "",
    "NOTES",
    ...(notesWithContent.length === 0
      ? ["  (none)"]
      : notesWithContent.map((note) => {
          const summary = note.summary.trim();
          const preview = note.content.trim().replace(/\s+/g, " ");
          const content = preview.length > 200 ? `${preview.slice(0, 200)}…` : preview;
          return summary ? `  - ${summary}: ${content}` : `  - ${content}`;
        })),
    "",
    "ATTACHMENTS ON FILE",
    line(
      "Call transcripts",
      request.call_transcripts.map((item) => item.original_filename).join(", ") || null,
    ),
    line("Chat logs", request.chat_logs.map((item) => item.original_filename).join(", ") || null),
    line(
      "Research documents",
      request.research_documents.map((item) => item.original_filename).join(", ") || null,
    ),
  ];

  return sections.join("\n");
}

export function downloadResearchBrief(
  request: TravelRequestDetail,
  form: TravelRequestInput,
  notesWithContent: Pick<RequestNote, "summary" | "content">[] = [],
): void {
  const content = buildResearchBriefText(request, form, notesWithContent);
  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `request-${request.id}-research-brief.txt`;
  anchor.click();
  URL.revokeObjectURL(url);
}
