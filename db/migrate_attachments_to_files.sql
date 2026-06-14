ALTER TABLE call_transcripts
    ADD COLUMN original_filename VARCHAR(255) NULL AFTER travel_request_id,
    ADD COLUMN stored_path VARCHAR(500) NULL,
    ADD COLUMN mime_type VARCHAR(120) NULL,
    ADD COLUMN size_bytes INT NULL;

ALTER TABLE chat_logs
    ADD COLUMN original_filename VARCHAR(255) NULL AFTER travel_request_id,
    ADD COLUMN stored_path VARCHAR(500) NULL,
    ADD COLUMN mime_type VARCHAR(120) NULL,
    ADD COLUMN size_bytes INT NULL;
