CREATE TABLE IF NOT EXISTS request_notes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    travel_request_id INT NOT NULL,
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
    from_content TEXT NULL,
    to_content TEXT NULL,
    changed_by_id INT NOT NULL,
    changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_request_note_audits_note FOREIGN KEY (request_note_id) REFERENCES request_notes(id) ON DELETE CASCADE,
    CONSTRAINT fk_request_note_audits_user FOREIGN KEY (changed_by_id) REFERENCES users(id)
);

INSERT INTO request_notes (travel_request_id, content, created_by_id, updated_by_id, created_at, updated_at)
SELECT id, notes, created_by_id, updated_by_id, created_at, updated_at
FROM travel_requests
WHERE notes IS NOT NULL AND TRIM(notes) <> '';

INSERT INTO request_note_audits (request_note_id, from_content, to_content, changed_by_id, changed_at)
SELECT rn.id, NULL, rn.content, rn.created_by_id, rn.created_at
FROM request_notes rn
WHERE NOT EXISTS (
    SELECT 1 FROM request_note_audits rna WHERE rna.request_note_id = rn.id
);

ALTER TABLE travel_requests DROP COLUMN notes;
