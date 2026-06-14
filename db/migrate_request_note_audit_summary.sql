ALTER TABLE request_note_audits
    ADD COLUMN from_summary VARCHAR(160) NULL AFTER request_note_id,
    ADD COLUMN to_summary VARCHAR(160) NULL AFTER from_summary;

UPDATE request_note_audits rna
INNER JOIN request_notes rn ON rn.id = rna.request_note_id
SET rna.to_summary = rn.summary
WHERE rna.from_content IS NULL
  AND rna.to_content IS NOT NULL
  AND rna.to_summary IS NULL;
