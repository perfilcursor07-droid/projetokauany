-- ===========================================================================
-- 002_whatsapp_notifications.sql
-- Estrutura para WhatsApp (Baileys) e notificacoes automaticas.
-- O worker/lembretes serao implementados numa versao futura; aqui deixamos
-- as tabelas prontas (inclusive guardando a sessao do Baileys em SQL, e nao
-- em arquivos, como recomendado para producao).
-- ===========================================================================

SET NAMES utf8mb4;

-- Estado de autenticacao do Baileys por negocio (creds, keys, etc.).
CREATE TABLE whatsapp_auth (
    id           BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    business_id  BIGINT UNSIGNED NOT NULL,
    -- ex.: 'creds', 'app-state-sync-key-XXXX', 'pre-key-1', 'session-55...'
    `key`        VARCHAR(190) NOT NULL,
    value        LONGTEXT NOT NULL,
    updated_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_wa_auth (business_id, `key`),
    CONSTRAINT fk_wa_auth_business FOREIGN KEY (business_id)
        REFERENCES businesses (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Status da conexao do WhatsApp (numero conectado, ultimo QR, etc.).
CREATE TABLE whatsapp_sessions (
    id            BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    business_id   BIGINT UNSIGNED NOT NULL,
    status        ENUM('disconnected','connecting','connected') NOT NULL DEFAULT 'disconnected',
    phone_number  VARCHAR(30) NULL,
    last_qr       TEXT NULL,
    connected_at  DATETIME NULL,
    updated_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_wa_session_business (business_id),
    CONSTRAINT fk_wa_session_business FOREIGN KEY (business_id)
        REFERENCES businesses (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Templates de mensagem configuraveis (confirmacao, lembrete 24h/2h, etc.).
CREATE TABLE notification_templates (
    id           BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    business_id  BIGINT UNSIGNED NOT NULL,
    trigger_key  VARCHAR(60) NOT NULL,  -- ex.: 'confirmed', 'reminder_24h', 'reminder_2h', 'cancelled'
    channel      ENUM('whatsapp') NOT NULL DEFAULT 'whatsapp',
    body         TEXT NOT NULL,
    active       BOOLEAN NOT NULL DEFAULT TRUE,
    created_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_template (business_id, trigger_key, channel),
    CONSTRAINT fk_template_business FOREIGN KEY (business_id)
        REFERENCES businesses (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Fila/log de mensagens (o worker BullMQ consome/atualiza isto).
CREATE TABLE notification_jobs (
    id              BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    business_id     BIGINT UNSIGNED NOT NULL,
    appointment_id  BIGINT UNSIGNED NULL,
    trigger_key     VARCHAR(60) NOT NULL,
    channel         ENUM('whatsapp') NOT NULL DEFAULT 'whatsapp',
    to_phone        VARCHAR(30) NOT NULL,
    body            TEXT NOT NULL,
    scheduled_for   DATETIME NOT NULL,
    status          ENUM('pending','sent','failed','cancelled') NOT NULL DEFAULT 'pending',
    sent_at         DATETIME NULL,
    error           TEXT NULL,
    created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    KEY idx_notif_due (status, scheduled_for),
    KEY idx_notif_appointment (appointment_id),
    CONSTRAINT fk_notif_business FOREIGN KEY (business_id)
        REFERENCES businesses (id) ON DELETE CASCADE,
    CONSTRAINT fk_notif_appointment FOREIGN KEY (appointment_id)
        REFERENCES appointments (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
