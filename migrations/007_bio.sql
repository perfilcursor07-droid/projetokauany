-- ===========================================================================
-- 007_bio.sql
-- Modulo opcional de Bio publica com foto, capa e links.
-- Quando habilitado, a pagina publica principal abre a Bio; o agendamento
-- continua acessivel pelo link especial /?agendar=1.
-- ===========================================================================

SET NAMES utf8mb4;

CREATE TABLE IF NOT EXISTS bio_settings (
    id              BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    business_id     BIGINT UNSIGNED NOT NULL,
    enabled         BOOLEAN NOT NULL DEFAULT FALSE,
    title           VARCHAR(150) NULL,
    subtitle        VARCHAR(255) NULL,
    avatar_url      LONGTEXT NULL,
    cover_url       LONGTEXT NULL,
    background_url  LONGTEXT NULL,
    instagram_url   VARCHAR(500) NULL,
    created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_bio_settings_business (business_id),
    CONSTRAINT fk_bio_settings_business FOREIGN KEY (business_id)
        REFERENCES businesses (id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS bio_links (
    id          BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    business_id BIGINT UNSIGNED NOT NULL,
    label       VARCHAR(120) NOT NULL,
    url         VARCHAR(800) NULL,
    type        VARCHAR(30) NOT NULL DEFAULT 'external',
    sort_order  INT NOT NULL DEFAULT 0,
    active      BOOLEAN NOT NULL DEFAULT TRUE,
    created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    KEY idx_bio_links_business_order (business_id, sort_order, id),
    CONSTRAINT fk_bio_links_business FOREIGN KEY (business_id)
        REFERENCES businesses (id) ON DELETE CASCADE
);

INSERT INTO bio_settings (business_id, enabled, title, subtitle)
SELECT id, FALSE, name, 'Agendamento online'
FROM businesses
ON DUPLICATE KEY UPDATE business_id = business_id;

INSERT INTO bio_links (business_id, label, url, type, sort_order, active)
SELECT b.id, 'Agendamento online', NULL, 'booking', 0, TRUE
FROM businesses b
WHERE NOT EXISTS (
    SELECT 1
    FROM bio_links l
    WHERE l.business_id = b.id
      AND l.type = 'booking'
);
