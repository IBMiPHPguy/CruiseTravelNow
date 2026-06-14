ALTER TABLE request_passenger_audits
    ADD COLUMN passenger_label VARCHAR(161) NULL AFTER request_passenger_id;

UPDATE request_passenger_audits rpa
INNER JOIN request_passengers rp ON rp.id = rpa.request_passenger_id
SET rpa.passenger_label = CONCAT(rp.first_name, ' ', rp.last_name)
WHERE rpa.passenger_label IS NULL;

UPDATE request_passenger_audits
SET passenger_label = TRIM(SUBSTRING_INDEX(from_value, ' (#', 1))
WHERE field_name = 'passenger_removed'
  AND passenger_label IS NULL
  AND from_value IS NOT NULL;

UPDATE request_passenger_audits rpa
INNER JOIN (
    SELECT request_passenger_id, passenger_label
    FROM request_passenger_audits
    WHERE field_name = 'passenger_removed'
      AND passenger_label IS NOT NULL
) removed ON removed.request_passenger_id = rpa.request_passenger_id
SET rpa.passenger_label = removed.passenger_label
WHERE rpa.passenger_label IS NULL;
