-- Phase 0 multi-tenant foundation: agencies + agency_id on root tables.
-- Safe to run once on existing databases that predate multi-tenant support.

CREATE TABLE IF NOT EXISTS agencies (
    id CHAR(36) PRIMARY KEY,
    name VARCHAR(120) NOT NULL,
    slug VARCHAR(80) NOT NULL UNIQUE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

INSERT INTO agencies (id, name, slug, is_active)
VALUES ('00000000-0000-4000-8000-000000000001', 'Default Agency', 'default', TRUE)
ON DUPLICATE KEY UPDATE name = VALUES(name);

ALTER TABLE users
    ADD COLUMN agency_id CHAR(36) NULL AFTER id;

UPDATE users
SET agency_id = '00000000-0000-4000-8000-000000000001'
WHERE agency_id IS NULL;

ALTER TABLE users
    MODIFY agency_id CHAR(36) NOT NULL,
    ADD CONSTRAINT fk_users_agency FOREIGN KEY (agency_id) REFERENCES agencies(id);

ALTER TABLE travel_requests
    ADD COLUMN agency_id CHAR(36) NULL AFTER id;

UPDATE travel_requests tr
JOIN users u ON u.id = tr.created_by_id
SET tr.agency_id = u.agency_id
WHERE tr.agency_id IS NULL;

UPDATE travel_requests
SET agency_id = '00000000-0000-4000-8000-000000000001'
WHERE agency_id IS NULL;

ALTER TABLE travel_requests
    MODIFY agency_id CHAR(36) NOT NULL,
    ADD CONSTRAINT fk_travel_requests_agency FOREIGN KEY (agency_id) REFERENCES agencies(id);

ALTER TABLE passengers
    ADD COLUMN agency_id CHAR(36) NULL AFTER id;

UPDATE passengers p
LEFT JOIN users u ON u.id = p.created_by_id
SET p.agency_id = COALESCE(u.agency_id, '00000000-0000-4000-8000-000000000001')
WHERE p.agency_id IS NULL;

ALTER TABLE passengers
    MODIFY agency_id CHAR(36) NOT NULL,
    ADD CONSTRAINT fk_passengers_agency FOREIGN KEY (agency_id) REFERENCES agencies(id);

CREATE INDEX idx_users_agency ON users(agency_id);
CREATE INDEX idx_travel_requests_agency ON travel_requests(agency_id);
CREATE INDEX idx_travel_requests_agency_status ON travel_requests(agency_id, status);
CREATE INDEX idx_passengers_agency ON passengers(agency_id);
CREATE INDEX idx_passengers_agency_active ON passengers(agency_id, is_active);
