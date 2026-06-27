-- Marketing campaign ROI summary fields on agency dashboard rollups (Phase 3a extension).

ALTER TABLE agency_dashboard_rollups
    ADD COLUMN marketing_active_monthly_budget DECIMAL(15, 2) NOT NULL DEFAULT 0 AFTER total_pipeline_value,
    ADD COLUMN marketing_top_roi_campaign_name VARCHAR(255) NULL AFTER marketing_active_monthly_budget,
    ADD COLUMN marketing_top_roi_percent DECIMAL(10, 2) NULL AFTER marketing_top_roi_campaign_name,
    ADD COLUMN marketing_total_attributed_volume DECIMAL(15, 2) NOT NULL DEFAULT 0 AFTER marketing_top_roi_percent;
