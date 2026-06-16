-- Global passenger registry: reusable people linked to requests via request_passengers.

CREATE TABLE IF NOT EXISTS passengers (
    id INT AUTO_INCREMENT PRIMARY KEY,
    first_name VARCHAR(80) NOT NULL,
    last_name VARCHAR(80) NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(30) NOT NULL,
    date_of_birth DATE NULL,
    created_by_id INT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_passengers_created_by FOREIGN KEY (created_by_id) REFERENCES users(id)
);

ALTER TABLE request_passengers
    ADD COLUMN passenger_id INT NULL AFTER travel_request_id,
    ADD COLUMN is_primary BOOLEAN NOT NULL DEFAULT FALSE AFTER passenger_id;

INSERT INTO passengers (first_name, last_name, email, phone, date_of_birth, created_at, updated_at)
SELECT first_name, last_name, email, phone, date_of_birth, created_at, updated_at
FROM request_passengers
ORDER BY id;

UPDATE request_passengers rp
INNER JOIN (
    SELECT rp2.id AS request_passenger_id, p.id AS passenger_id
    FROM request_passengers rp2
    INNER JOIN (
        SELECT id, ROW_NUMBER() OVER (ORDER BY id) AS row_num
        FROM request_passengers
    ) rp_rank ON rp2.id = rp_rank.id
    INNER JOIN (
        SELECT id, ROW_NUMBER() OVER (ORDER BY id) AS row_num
        FROM passengers
    ) p_rank ON rp_rank.row_num = p_rank.row_num
    INNER JOIN passengers p ON p.id = p_rank.id
) mapping ON rp.id = mapping.request_passenger_id
SET rp.passenger_id = mapping.passenger_id;

UPDATE request_passengers rp
INNER JOIN (
    SELECT id,
           ROW_NUMBER() OVER (PARTITION BY travel_request_id ORDER BY id) AS row_num
    FROM request_passengers
) ranked ON rp.id = ranked.id
SET rp.is_primary = (ranked.row_num = 1);

ALTER TABLE request_passengers
    MODIFY passenger_id INT NOT NULL,
    ADD CONSTRAINT fk_request_passengers_passenger FOREIGN KEY (passenger_id) REFERENCES passengers(id),
    ADD CONSTRAINT uq_request_passengers_request_passenger UNIQUE (travel_request_id, passenger_id);

ALTER TABLE request_passengers
    DROP COLUMN first_name,
    DROP COLUMN last_name,
    DROP COLUMN email,
    DROP COLUMN phone,
    DROP COLUMN date_of_birth;
