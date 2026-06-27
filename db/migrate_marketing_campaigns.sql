-- Marketing campaigns and lead attribution on travel requests.

CREATE TABLE IF NOT EXISTS marketing_campaigns (
    id CHAR(36) NOT NULL PRIMARY KEY,
    agency_id CHAR(36) NOT NULL,
    campaign_name VARCHAR(255) NOT NULL,
    campaign_type VARCHAR(100) NOT NULL,
    monthly_spend DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    start_date DATE NOT NULL,
    end_date DATE NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_marketing_campaigns_agency FOREIGN KEY (agency_id) REFERENCES agencies(id),
    INDEX idx_marketing_campaigns_agency (agency_id),
    INDEX idx_marketing_campaigns_agency_start (agency_id, start_date)
);

ALTER TABLE travel_requests
    ADD COLUMN lead_source VARCHAR(100) NULL AFTER close_reason,
    ADD COLUMN referral_source_name VARCHAR(255) NULL AFTER lead_source,
    ADD COLUMN marketing_campaign_id CHAR(36) NULL AFTER referral_source_name;

ALTER TABLE travel_requests
    ADD CONSTRAINT fk_travel_requests_marketing_campaign
        FOREIGN KEY (marketing_campaign_id) REFERENCES marketing_campaigns(id) ON DELETE SET NULL;

CREATE INDEX idx_travel_requests_marketing_campaign ON travel_requests(marketing_campaign_id);
