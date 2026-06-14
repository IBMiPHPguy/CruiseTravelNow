CREATE TABLE IF NOT EXISTS quoted_insurance (
    id INT AUTO_INCREMENT PRIMARY KEY,
    travel_request_id INT NOT NULL,
    carrier VARCHAR(120) NOT NULL,
    premium_cost DECIMAL(10, 2) NOT NULL,
    plan_name VARCHAR(160) NOT NULL,
    cancellation_coverage DECIMAL(10, 2) NOT NULL,
    medical_coverage DECIMAL(10, 2) NOT NULL,
    medical_evac_coverage DECIMAL(10, 2) NOT NULL,
    status VARCHAR(40) NOT NULL DEFAULT 'Proposed',
    created_by_id INT NOT NULL,
    updated_by_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_quoted_insurance_request FOREIGN KEY (travel_request_id) REFERENCES travel_requests(id) ON DELETE CASCADE,
    CONSTRAINT fk_quoted_insurance_created_by FOREIGN KEY (created_by_id) REFERENCES users(id),
    CONSTRAINT fk_quoted_insurance_updated_by FOREIGN KEY (updated_by_id) REFERENCES users(id)
);
