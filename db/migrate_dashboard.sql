ALTER TABLE travel_requests
    ADD COLUMN close_reason VARCHAR(120) NULL;

UPDATE travel_requests
SET status = 'Open'
WHERE status IN ('draft', 'submitted', 'Open') OR status IS NULL OR status = '';

UPDATE travel_requests
SET status = 'Closed'
WHERE status NOT IN ('Open', 'Closed');

ALTER TABLE travel_requests
    MODIFY status VARCHAR(40) NOT NULL DEFAULT 'Open';

CREATE TABLE IF NOT EXISTS call_transcripts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    travel_request_id INT NOT NULL,
    content TEXT NOT NULL,
    created_by_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_call_transcripts_request FOREIGN KEY (travel_request_id) REFERENCES travel_requests(id) ON DELETE CASCADE,
    CONSTRAINT fk_call_transcripts_user FOREIGN KEY (created_by_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS chat_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    travel_request_id INT NOT NULL,
    content TEXT NOT NULL,
    created_by_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_chat_logs_request FOREIGN KEY (travel_request_id) REFERENCES travel_requests(id) ON DELETE CASCADE,
    CONSTRAINT fk_chat_logs_user FOREIGN KEY (created_by_id) REFERENCES users(id)
);
