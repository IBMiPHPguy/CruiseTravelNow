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
    field_name VARCHAR(80) NOT NULL,
    from_value TEXT NULL,
    to_value TEXT NULL,
    changed_by_id INT NOT NULL,
    changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_request_passenger_audits_request FOREIGN KEY (travel_request_id) REFERENCES travel_requests(id) ON DELETE CASCADE,
    CONSTRAINT fk_request_passenger_audits_user FOREIGN KEY (changed_by_id) REFERENCES users(id)
);
