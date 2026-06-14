ALTER TABLE travel_requests
    ADD COLUMN cabins_needed INT NOT NULL DEFAULT 1 AFTER passengers;
