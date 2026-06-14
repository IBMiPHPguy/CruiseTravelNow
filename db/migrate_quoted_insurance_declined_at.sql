ALTER TABLE quoted_insurance
    ADD COLUMN declined_at TIMESTAMP NULL AFTER status;

UPDATE quoted_insurance
SET declined_at = updated_at
WHERE status = 'Declined'
  AND declined_at IS NULL;
