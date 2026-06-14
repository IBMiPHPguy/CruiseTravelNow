ALTER TABLE request_notes
    ADD COLUMN summary VARCHAR(160) NOT NULL DEFAULT '' AFTER travel_request_id;

UPDATE request_notes
SET summary = LEFT(content, 160)
WHERE summary = '';
