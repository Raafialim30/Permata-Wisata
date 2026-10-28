CREATE TABLE IF NOT EXISTS owner_registration_requests (
    id INT NOT NULL AUTO_INCREMENT,
    villa_id INT NOT NULL,
    contact_name VARCHAR(100) NOT NULL,
    phone VARCHAR(30) NOT NULL,
    username VARCHAR(50) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'Menunggu',
    admin_note TEXT NULL,
    processed_by INT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    processed_at TIMESTAMP NULL DEFAULT NULL,
    PRIMARY KEY (id),
    KEY idx_owner_registration_status (status),
    KEY idx_owner_registration_villa (villa_id),
    KEY idx_owner_registration_username (username),
    CONSTRAINT fk_owner_registration_villa
        FOREIGN KEY (villa_id) REFERENCES villas (id)
        ON DELETE CASCADE,
    CONSTRAINT fk_owner_registration_admin
        FOREIGN KEY (processed_by) REFERENCES users (id)
        ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
