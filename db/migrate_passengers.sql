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

INSERT INTO request_passengers (travel_request_id, first_name, last_name, email, phone)
SELECT tr.id, tr.first_name, tr.last_name, tr.email, tr.phone
FROM travel_requests tr
WHERE NOT EXISTS (
    SELECT 1 FROM request_passengers rp WHERE rp.travel_request_id = tr.id
);
