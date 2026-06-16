CREATE TABLE IF NOT EXISTS request_workflows (
    id INT AUTO_INCREMENT PRIMARY KEY,
    travel_request_id INT NOT NULL,
    workflow_type VARCHAR(40) NOT NULL,
    status VARCHAR(40) NOT NULL DEFAULT 'Active',
    parent_workflow_id INT NULL,
    context JSON NULL,
    started_by_id INT NOT NULL,
    completed_by_id INT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    completed_at TIMESTAMP NULL,
    CONSTRAINT fk_request_workflows_request FOREIGN KEY (travel_request_id) REFERENCES travel_requests(id) ON DELETE CASCADE,
    CONSTRAINT fk_request_workflows_parent FOREIGN KEY (parent_workflow_id) REFERENCES request_workflows(id) ON DELETE SET NULL,
    CONSTRAINT fk_request_workflows_started_by FOREIGN KEY (started_by_id) REFERENCES users(id),
    CONSTRAINT fk_request_workflows_completed_by FOREIGN KEY (completed_by_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS request_tasks (
    id INT AUTO_INCREMENT PRIMARY KEY,
    request_workflow_id INT NOT NULL,
    travel_request_id INT NOT NULL,
    task_key VARCHAR(80) NOT NULL,
    title VARCHAR(160) NOT NULL,
    description TEXT NULL,
    status VARCHAR(40) NOT NULL DEFAULT 'Open',
    sort_order INT NOT NULL DEFAULT 0,
    due_at TIMESTAMP NULL,
    completed_at TIMESTAMP NULL,
    completed_by_id INT NULL,
    result JSON NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_request_tasks_workflow FOREIGN KEY (request_workflow_id) REFERENCES request_workflows(id) ON DELETE CASCADE,
    CONSTRAINT fk_request_tasks_request FOREIGN KEY (travel_request_id) REFERENCES travel_requests(id) ON DELETE CASCADE,
    CONSTRAINT fk_request_tasks_completed_by FOREIGN KEY (completed_by_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS request_communications (
    id INT AUTO_INCREMENT PRIMARY KEY,
    travel_request_id INT NOT NULL,
    request_workflow_id INT NULL,
    communication_type VARCHAR(40) NOT NULL,
    subject VARCHAR(255) NOT NULL,
    body TEXT NOT NULL,
    status VARCHAR(40) NOT NULL DEFAULT 'Draft',
    sent_at TIMESTAMP NULL,
    created_by_id INT NOT NULL,
    updated_by_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_request_communications_request FOREIGN KEY (travel_request_id) REFERENCES travel_requests(id) ON DELETE CASCADE,
    CONSTRAINT fk_request_communications_workflow FOREIGN KEY (request_workflow_id) REFERENCES request_workflows(id) ON DELETE SET NULL,
    CONSTRAINT fk_request_communications_created_by FOREIGN KEY (created_by_id) REFERENCES users(id),
    CONSTRAINT fk_request_communications_updated_by FOREIGN KEY (updated_by_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS request_research_documents (
    id INT AUTO_INCREMENT PRIMARY KEY,
    travel_request_id INT NOT NULL,
    original_filename VARCHAR(255) NOT NULL,
    stored_path VARCHAR(500) NOT NULL,
    mime_type VARCHAR(120) NOT NULL,
    size_bytes INT NOT NULL,
    uploaded_by_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_request_research_documents_request FOREIGN KEY (travel_request_id) REFERENCES travel_requests(id) ON DELETE CASCADE,
    CONSTRAINT fk_request_research_documents_user FOREIGN KEY (uploaded_by_id) REFERENCES users(id)
);
