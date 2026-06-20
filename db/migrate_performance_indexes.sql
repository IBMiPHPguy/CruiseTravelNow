-- Foundational performance indexes for dashboard, reports, and analytics.
-- Safe to re-run only on databases that have not yet received these indexes.

CREATE INDEX idx_travel_requests_status ON travel_requests(status);
CREATE INDEX idx_travel_requests_created_at ON travel_requests(created_at);
CREATE INDEX idx_travel_requests_created_by ON travel_requests(created_by_id);
CREATE INDEX idx_travel_requests_status_created ON travel_requests(status, created_at);

CREATE INDEX idx_proposed_cruises_status ON proposed_cruises(status);
CREATE INDEX idx_proposed_cruises_cruise_line ON proposed_cruises(cruise_line);
CREATE INDEX idx_proposed_cruises_departure ON proposed_cruises(departure_date);
CREATE INDEX idx_proposed_cruises_request_status ON proposed_cruises(travel_request_id, status);

CREATE INDEX idx_passengers_is_active ON passengers(is_active);
CREATE INDEX idx_passengers_last_first ON passengers(last_name, first_name);
CREATE INDEX idx_passengers_state ON passengers(state_or_province);
CREATE INDEX idx_passengers_email ON passengers(email);
CREATE INDEX idx_passengers_phone ON passengers(phone);

CREATE INDEX idx_tra_request_field ON travel_request_audits(travel_request_id, field_name);
CREATE INDEX idx_tra_changed_at ON travel_request_audits(changed_at);

CREATE INDEX idx_request_passengers_travel_request ON request_passengers(travel_request_id);
CREATE INDEX idx_request_passengers_passenger ON request_passengers(passenger_id);
