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
