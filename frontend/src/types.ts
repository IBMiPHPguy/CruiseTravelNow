export type User = {
  id: number;
  username: string;
  email: string;
};

export type UserAudit = {
  id: number;
  username: string;
};

export type AuthResponse = {
  access_token: string;
  token_type: string;
  user: User;
};

export type DestinationDetails = {
  caribbean_regions?: string[];
  alaska_options?: string[];
  asia_regions?: string[];
  europe_regions?: string[];
};

export type DestinationDetailField = keyof DestinationDetails;

export type Attachment = {
  id: number;
  original_filename: string;
  mime_type: string;
  size_bytes: number;
  created_by: UserAudit;
  created_at: string;
};

export type AttachmentKind = "transcripts" | "chats";

export type RequestPassenger = {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  date_of_birth: string | null;
  created_at: string;
  updated_at: string;
};

export type RequestPassengerInput = {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  date_of_birth?: string | null;
};

export type RequestNoteAudit = {
  id: number;
  from_summary: string | null;
  to_summary: string | null;
  from_content: string | null;
  to_content: string | null;
  changed_by: UserAudit;
  changed_at: string;
};

export type TravelRequestAudit = {
  id: number;
  field_name: string;
  from_value: string | null;
  to_value: string | null;
  changed_by: UserAudit;
  changed_at: string;
};

export type RequestPassengerAudit = {
  id: number;
  request_passenger_id: number | null;
  passenger_label: string | null;
  field_name: string;
  from_value: string | null;
  to_value: string | null;
  changed_by: UserAudit;
  changed_at: string;
};

export type RequestNote = {
  id: number;
  summary: string;
  content: string;
  created_by: UserAudit;
  updated_by: UserAudit;
  created_at: string;
  updated_at: string;
  audits: RequestNoteAudit[];
};

export type RequestNoteInput = {
  summary: string;
  content: string;
};

export type NamedInclude = {
  included: boolean;
  name?: string | null;
};

export type CreditInclude = {
  included: boolean;
  amount?: number | null;
};

export type ProposedCruiseIncludes = {
  drink_package: NamedInclude;
  wifi: NamedInclude;
  excursion_credit: CreditInclude;
  onboard_credit: CreditInclude;
  tips: boolean;
  excursion: boolean;
};

export type ProposedCruise = {
  id: number;
  departure_date: string;
  cruise_line: string;
  ship: string;
  number_of_nights: number;
  itinerary_name: string;
  room_category: string;
  room_number: string;
  passengers_in_room: number;
  deposit_amount: number;
  deposit_due_date: string;
  final_payment_due_date: string;
  cost: number;
  includes: ProposedCruiseIncludes;
  status: string;
  passengers: RequestPassenger[];
  created_by: UserAudit;
  updated_by: UserAudit;
  created_at: string;
  updated_at: string;
};

export type ProposedCruiseInput = {
  departure_date: string;
  cruise_line: string;
  ship: string;
  number_of_nights: number;
  itinerary_name: string;
  room_category: string;
  room_number: string;
  passengers_in_room: number;
  deposit_amount: number;
  deposit_due_date: string;
  final_payment_due_date: string;
  cost: number;
  includes: ProposedCruiseIncludes;
  passenger_ids: number[];
  status?: string;
};

export type QuotedInsurance = {
  id: number;
  carrier: string;
  premium_cost: number;
  plan_name: string;
  cancellation_coverage: number;
  medical_coverage: number;
  medical_evac_coverage: number;
  status: string;
  declined_at: string | null;
  created_by: UserAudit;
  updated_by: UserAudit;
  created_at: string;
  updated_at: string;
};

export type QuotedInsuranceInput = {
  carrier: string;
  premium_cost: number;
  plan_name: string;
  cancellation_coverage: number;
  medical_coverage: number;
  medical_evac_coverage: number;
  status?: string;
};

export type TravelRequest = {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  state_of_residency: string;
  cruise_line: string;
  excluded_cruise_line: string | null;
  destination: string;
  destination_details: DestinationDetails | null;
  departure_date: string;
  return_date: string;
  cabin_types: string[];
  qualifiers: string[];
  passengers: number;
  cabins_needed: number;
  status: string;
  close_reason: string | null;
  created_by: UserAudit;
  updated_by: UserAudit;
  created_at: string;
  updated_at: string;
};

export type TravelRequestDetail = TravelRequest & {
  request_passengers: RequestPassenger[];
  request_notes: RequestNote[];
  request_audits: TravelRequestAudit[];
  passenger_audits: RequestPassengerAudit[];
  call_transcripts: Attachment[];
  chat_logs: Attachment[];
  proposed_cruises: ProposedCruise[];
  quoted_insurance: QuotedInsurance[];
};

export type DashboardOpenRequest = TravelRequest & {
  is_stale: boolean;
};

export type DashboardData = {
  open_count: number;
  stale_count: number;
  open_requests: DashboardOpenRequest[];
};

export type TravelRequestInput = {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  state_of_residency: string;
  cruise_line: string;
  excluded_cruise_line?: string;
  destination: string;
  destination_details?: DestinationDetails | null;
  departure_date: string;
  return_date: string;
  cabin_types: string[];
  qualifiers: string[];
  passengers: number;
  cabins_needed: number;
  first_passenger_date_of_birth?: string;
};

export type TravelRequestUpdateInput = TravelRequestInput & {
  status?: string;
  close_reason?: string | null;
};

export type RegisterInput = {
  username: string;
  email: string;
  password: string;
};

export type AppView =
  | { type: "dashboard" }
  | { type: "new" }
  | { type: "edit"; requestId: number };
