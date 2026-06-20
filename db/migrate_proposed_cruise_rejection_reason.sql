ALTER TABLE proposed_cruises
    ADD COLUMN rejection_reason VARCHAR(120) NULL AFTER status,
    ADD COLUMN rejection_reason_detail VARCHAR(500) NULL AFTER rejection_reason;
