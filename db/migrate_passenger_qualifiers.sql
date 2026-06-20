ALTER TABLE passengers
    ADD COLUMN qualifiers JSON NOT NULL DEFAULT (JSON_ARRAY()) AFTER country;

UPDATE passengers p
INNER JOIN (
    SELECT passenger_id, MIN(id) AS request_passenger_id
    FROM request_passengers
    GROUP BY passenger_id
) first_link ON first_link.passenger_id = p.id
INNER JOIN request_passengers rp ON rp.id = first_link.request_passenger_id
SET p.qualifiers = rp.qualifiers
WHERE JSON_LENGTH(COALESCE(rp.qualifiers, JSON_ARRAY())) > 0
  AND JSON_LENGTH(COALESCE(p.qualifiers, JSON_ARRAY())) = 0;
