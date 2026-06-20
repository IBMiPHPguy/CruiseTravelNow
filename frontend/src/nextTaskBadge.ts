import {
  LEGACY_TASK_KEY_COLLECT_LEAD_PASSENGER_ADDRESSES,
  TASK_KEY_CLIENT_RESPONSE,
  TASK_KEY_COLLECT_PASSENGER_ADDRESSES,
  TASK_KEY_COLLECT_PAYMENT_AND_SEND_BOOKING,
  TASK_KEY_CREATE_CABIN_HOLDS,
  TASK_KEY_CREATE_PROPOSED_CRUISES,
  TASK_KEY_CREATE_TRIP_IN_CRM,
  TASK_KEY_DRAFT_RESEARCH_COMMUNICATION,
  TASK_KEY_FOLLOW_UP_RESEARCH,
  TASK_KEY_RESEARCH_CRUISE_OPTIONS,
  TASK_KEY_SEND_RESEARCH_COMMUNICATION,
  TASK_KEY_UPLOAD_RESEARCH_DOCUMENT,
  TASK_KEY_VERIFY_PASSENGER_DETAILS,
} from "./formOptions";

const NEXT_TASK_BADGE_CLASS_BY_KEY: Record<string, string> = {
  [TASK_KEY_RESEARCH_CRUISE_OPTIONS]: "next-task-badge-research",
  [TASK_KEY_UPLOAD_RESEARCH_DOCUMENT]: "next-task-badge-upload",
  [TASK_KEY_CREATE_PROPOSED_CRUISES]: "next-task-badge-proposals",
  [TASK_KEY_DRAFT_RESEARCH_COMMUNICATION]: "next-task-badge-draft",
  [TASK_KEY_SEND_RESEARCH_COMMUNICATION]: "next-task-badge-send",
  [TASK_KEY_FOLLOW_UP_RESEARCH]: "next-task-badge-follow-up",
  [TASK_KEY_CLIENT_RESPONSE]: "next-task-badge-client-response",
  [TASK_KEY_VERIFY_PASSENGER_DETAILS]: "next-task-badge-verify",
  [TASK_KEY_COLLECT_PASSENGER_ADDRESSES]: "next-task-badge-addresses",
  [LEGACY_TASK_KEY_COLLECT_LEAD_PASSENGER_ADDRESSES]: "next-task-badge-addresses",
  [TASK_KEY_CREATE_CABIN_HOLDS]: "next-task-badge-cabin-holds",
  [TASK_KEY_COLLECT_PAYMENT_AND_SEND_BOOKING]: "next-task-badge-payment",
  [TASK_KEY_CREATE_TRIP_IN_CRM]: "next-task-badge-crm",
};

export function getNextTaskBadgeClass(taskKey: string | undefined): string {
  if (!taskKey) {
    return "next-task-badge-default";
  }
  return NEXT_TASK_BADGE_CLASS_BY_KEY[taskKey] ?? "next-task-badge-default";
}
