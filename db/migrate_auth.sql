CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(80) NOT NULL UNIQUE,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

DROP TABLE IF EXISTS travel_requests;

CREATE TABLE travel_requests (
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
    status VARCHAR(40) NOT NULL DEFAULT 'draft',
    notes TEXT NULL,
    created_by_id INT NOT NULL,
    updated_by_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_travel_requests_created_by FOREIGN KEY (created_by_id) REFERENCES users(id),
    CONSTRAINT fk_travel_requests_updated_by FOREIGN KEY (updated_by_id) REFERENCES users(id)
);
