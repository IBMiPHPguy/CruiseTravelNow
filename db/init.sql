CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(80) NOT NULL UNIQUE,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS travel_requests (
    id INT AUTO_INCREMENT PRIMARY KEY,
    first_name VARCHAR(80) NOT NULL,
    last_name VARCHAR(80) NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(30) NOT NULL,
    state_of_residency VARCHAR(50) NOT NULL,
    cruise_line VARCHAR(120) NOT NULL,
    excluded_cruise_line VARCHAR(120) NULL,
    destination VARCHAR(120) NOT NULL,
    destination_details JSON NULL,
    departure_date DATE NOT NULL,
    return_date DATE NOT NULL,
    cabin_types JSON NOT NULL,
    qualifiers JSON NOT NULL DEFAULT (JSON_ARRAY()),
    passengers INT NOT NULL DEFAULT 1,
    cabins_needed INT NOT NULL DEFAULT 1,
    status VARCHAR(40) NOT NULL DEFAULT 'Open',
    close_reason VARCHAR(120) NULL,
    created_by_id INT NOT NULL,
    updated_by_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_travel_requests_created_by FOREIGN KEY (created_by_id) REFERENCES users(id),
    CONSTRAINT fk_travel_requests_updated_by FOREIGN KEY (updated_by_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS call_transcripts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    travel_request_id INT NOT NULL,
    original_filename VARCHAR(255) NOT NULL,
    stored_path VARCHAR(500) NOT NULL,
    mime_type VARCHAR(120) NOT NULL,
    size_bytes INT NOT NULL,
    created_by_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_call_transcripts_request FOREIGN KEY (travel_request_id) REFERENCES travel_requests(id) ON DELETE CASCADE,
    CONSTRAINT fk_call_transcripts_user FOREIGN KEY (created_by_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS chat_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    travel_request_id INT NOT NULL,
    original_filename VARCHAR(255) NOT NULL,
    stored_path VARCHAR(500) NOT NULL,
    mime_type VARCHAR(120) NOT NULL,
    size_bytes INT NOT NULL,
    created_by_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_chat_logs_request FOREIGN KEY (travel_request_id) REFERENCES travel_requests(id) ON DELETE CASCADE,
    CONSTRAINT fk_chat_logs_user FOREIGN KEY (created_by_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS request_passengers (
    id INT AUTO_INCREMENT PRIMARY KEY,
    travel_request_id INT NOT NULL,
    first_name VARCHAR(80) NOT NULL,
    last_name VARCHAR(80) NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(30) NOT NULL,
    date_of_birth DATE NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_request_passengers_request FOREIGN KEY (travel_request_id) REFERENCES travel_requests(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS request_notes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    travel_request_id INT NOT NULL,
    summary VARCHAR(160) NOT NULL,
    content TEXT NOT NULL,
    created_by_id INT NOT NULL,
    updated_by_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_request_notes_request FOREIGN KEY (travel_request_id) REFERENCES travel_requests(id) ON DELETE CASCADE,
    CONSTRAINT fk_request_notes_created_by FOREIGN KEY (created_by_id) REFERENCES users(id),
    CONSTRAINT fk_request_notes_updated_by FOREIGN KEY (updated_by_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS request_note_audits (
    id INT AUTO_INCREMENT PRIMARY KEY,
    request_note_id INT NOT NULL,
    from_summary VARCHAR(160) NULL,
    to_summary VARCHAR(160) NULL,
    from_content TEXT NULL,
    to_content TEXT NULL,
    changed_by_id INT NOT NULL,
    changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_request_note_audits_note FOREIGN KEY (request_note_id) REFERENCES request_notes(id) ON DELETE CASCADE,
    CONSTRAINT fk_request_note_audits_user FOREIGN KEY (changed_by_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS travel_request_audits (
    id INT AUTO_INCREMENT PRIMARY KEY,
    travel_request_id INT NOT NULL,
    field_name VARCHAR(80) NOT NULL,
    from_value TEXT NULL,
    to_value TEXT NULL,
    changed_by_id INT NOT NULL,
    changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_travel_request_audits_request FOREIGN KEY (travel_request_id) REFERENCES travel_requests(id) ON DELETE CASCADE,
    CONSTRAINT fk_travel_request_audits_user FOREIGN KEY (changed_by_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS request_passenger_audits (
    id INT AUTO_INCREMENT PRIMARY KEY,
    travel_request_id INT NOT NULL,
    request_passenger_id INT NULL,
    passenger_label VARCHAR(161) NULL,
    field_name VARCHAR(80) NOT NULL,
    from_value TEXT NULL,
    to_value TEXT NULL,
    changed_by_id INT NOT NULL,
    changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_request_passenger_audits_request FOREIGN KEY (travel_request_id) REFERENCES travel_requests(id) ON DELETE CASCADE,
    CONSTRAINT fk_request_passenger_audits_user FOREIGN KEY (changed_by_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS proposed_cruises (
    id INT AUTO_INCREMENT PRIMARY KEY,
    travel_request_id INT NOT NULL,
    departure_date DATE NOT NULL,
    cruise_line VARCHAR(120) NOT NULL,
    ship VARCHAR(120) NOT NULL,
    number_of_nights INT NOT NULL,
    itinerary_name VARCHAR(160) NOT NULL,
    room_category VARCHAR(120) NOT NULL,
    room_number VARCHAR(40) NOT NULL,
    passengers_in_room INT NOT NULL,
    deposit_amount DECIMAL(10, 2) NOT NULL,
    deposit_due_date DATE NOT NULL,
    final_payment_due_date DATE NOT NULL,
    cost DECIMAL(10, 2) NOT NULL,
    includes JSON NOT NULL,
    status VARCHAR(40) NOT NULL DEFAULT 'Proposed',
    created_by_id INT NOT NULL,
    updated_by_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_proposed_cruises_request FOREIGN KEY (travel_request_id) REFERENCES travel_requests(id) ON DELETE CASCADE,
    CONSTRAINT fk_proposed_cruises_created_by FOREIGN KEY (created_by_id) REFERENCES users(id),
    CONSTRAINT fk_proposed_cruises_updated_by FOREIGN KEY (updated_by_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS proposed_cruise_passengers (
    id INT AUTO_INCREMENT PRIMARY KEY,
    proposed_cruise_id INT NOT NULL,
    request_passenger_id INT NOT NULL,
    CONSTRAINT fk_proposed_cruise_passengers_cruise FOREIGN KEY (proposed_cruise_id) REFERENCES proposed_cruises(id) ON DELETE CASCADE,
    CONSTRAINT fk_proposed_cruise_passengers_passenger FOREIGN KEY (request_passenger_id) REFERENCES request_passengers(id) ON DELETE CASCADE,
    CONSTRAINT uq_proposed_cruise_passenger UNIQUE (proposed_cruise_id, request_passenger_id)
);

CREATE TABLE IF NOT EXISTS quoted_insurance (
    id INT AUTO_INCREMENT PRIMARY KEY,
    travel_request_id INT NOT NULL,
    carrier VARCHAR(120) NOT NULL,
    premium_cost DECIMAL(10, 2) NOT NULL,
    plan_name VARCHAR(160) NOT NULL,
    cancellation_coverage DECIMAL(10, 2) NOT NULL,
    medical_coverage DECIMAL(10, 2) NOT NULL,
    medical_evac_coverage DECIMAL(10, 2) NOT NULL,
    status VARCHAR(40) NOT NULL DEFAULT 'Proposed',
    declined_at TIMESTAMP NULL,
    created_by_id INT NOT NULL,
    updated_by_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_quoted_insurance_request FOREIGN KEY (travel_request_id) REFERENCES travel_requests(id) ON DELETE CASCADE,
    CONSTRAINT fk_quoted_insurance_created_by FOREIGN KEY (created_by_id) REFERENCES users(id),
    CONSTRAINT fk_quoted_insurance_updated_by FOREIGN KEY (updated_by_id) REFERENCES users(id)
);
