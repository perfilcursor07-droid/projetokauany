-- ===========================================================================
-- 001_init.sql  -  Nucleo do sistema de agendamento
-- MySQL 8 / InnoDB / utf8mb4
--
-- Todas as tabelas principais tem business_id para ja deixar preparado
-- para virar SaaS (multi-salao) no futuro, mesmo comecando com 1 negocio.
-- ===========================================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 1;

-- ---------------------------------------------------------------------------
-- Negocios (salao / studio). Hoje: 1 registro (o da esposa).
-- ---------------------------------------------------------------------------
CREATE TABLE businesses (
    id            BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name          VARCHAR(150) NOT NULL,
    slug          VARCHAR(120) NOT NULL,
    phone         VARCHAR(30)  NULL,
    timezone      VARCHAR(60)  NOT NULL DEFAULT 'America/Sao_Paulo',
    active        BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_businesses_slug (slug)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- Usuarios do painel administrativo (a esposa / equipe).
-- ---------------------------------------------------------------------------
CREATE TABLE users (
    id             BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    business_id    BIGINT UNSIGNED NOT NULL,
    name           VARCHAR(150) NOT NULL,
    email          VARCHAR(190) NOT NULL,
    password_hash  VARCHAR(255) NOT NULL,
    role           ENUM('owner','staff') NOT NULL DEFAULT 'owner',
    active         BOOLEAN NOT NULL DEFAULT TRUE,
    created_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_users_email (email),
    KEY idx_users_business (business_id),
    CONSTRAINT fk_users_business FOREIGN KEY (business_id)
        REFERENCES businesses (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- Profissionais (quem atende). MVP: 1 profissional = a propria esposa.
-- ---------------------------------------------------------------------------
CREATE TABLE professionals (
    id           BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    business_id  BIGINT UNSIGNED NOT NULL,
    name         VARCHAR(150) NOT NULL,
    active       BOOLEAN NOT NULL DEFAULT TRUE,
    created_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    KEY idx_professionals_business (business_id),
    CONSTRAINT fk_professionals_business FOREIGN KEY (business_id)
        REFERENCES businesses (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- Clientes finais (nao criam conta; sao cadastradas no ato do agendamento).
-- ---------------------------------------------------------------------------
CREATE TABLE clients (
    id             BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    business_id    BIGINT UNSIGNED NOT NULL,
    name           VARCHAR(150) NOT NULL,
    phone          VARCHAR(30)  NOT NULL,
    email          VARCHAR(190) NULL,
    notes          TEXT NULL,
    no_show_count  INT NOT NULL DEFAULT 0,
    cancel_count   INT NOT NULL DEFAULT 0,
    created_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    KEY idx_clients_business_phone (business_id, phone),
    CONSTRAINT fk_clients_business FOREIGN KEY (business_id)
        REFERENCES businesses (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- Servicos oferecidos, com preco, duracao e regra de sinal.
-- deposit_type: none = sem sinal | fixed = valor fixo | percentage = % do preco
-- ---------------------------------------------------------------------------
CREATE TABLE services (
    id                BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    business_id       BIGINT UNSIGNED NOT NULL,
    name              VARCHAR(150) NOT NULL,
    description       TEXT NULL,
    price             DECIMAL(10,2) NOT NULL,
    deposit_type      ENUM('none','fixed','percentage') NOT NULL DEFAULT 'none',
    deposit_value     DECIMAL(10,2) NOT NULL DEFAULT 0,
    duration_minutes  INT NOT NULL,
    buffer_minutes    INT NOT NULL DEFAULT 0,
    active            BOOLEAN NOT NULL DEFAULT TRUE,
    created_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    KEY idx_services_business_active (business_id, active),
    CONSTRAINT fk_services_business FOREIGN KEY (business_id)
        REFERENCES businesses (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- Horario de funcionamento por dia da semana.
-- weekday: 0=Domingo ... 6=Sabado (padrao JS Date.getDay()).
-- ---------------------------------------------------------------------------
CREATE TABLE business_hours (
    id           BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    business_id  BIGINT UNSIGNED NOT NULL,
    weekday      TINYINT UNSIGNED NOT NULL,
    is_open      BOOLEAN NOT NULL DEFAULT TRUE,
    open_time    VARCHAR(5) NOT NULL DEFAULT '08:00',
    close_time   VARCHAR(5) NOT NULL DEFAULT '18:00',
    UNIQUE KEY uq_business_hours (business_id, weekday),
    CONSTRAINT fk_business_hours_business FOREIGN KEY (business_id)
        REFERENCES businesses (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- Sobrescrita opcional de horario por profissional (schema pronto p/ futuro).
-- ---------------------------------------------------------------------------
CREATE TABLE professional_hours (
    id               BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    professional_id  BIGINT UNSIGNED NOT NULL,
    weekday          TINYINT UNSIGNED NOT NULL,
    is_open          BOOLEAN NOT NULL DEFAULT TRUE,
    open_time        VARCHAR(5) NOT NULL DEFAULT '08:00',
    close_time       VARCHAR(5) NOT NULL DEFAULT '18:00',
    UNIQUE KEY uq_professional_hours (professional_id, weekday),
    CONSTRAINT fk_professional_hours_prof FOREIGN KEY (professional_id)
        REFERENCES professionals (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- Bloqueios pontuais (folga, consulta medica, feriado etc.).
-- professional_id NULL = bloqueia o negocio inteiro.
-- ---------------------------------------------------------------------------
CREATE TABLE blocked_times (
    id               BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    business_id      BIGINT UNSIGNED NOT NULL,
    professional_id  BIGINT UNSIGNED NULL,
    start_at         DATETIME NOT NULL,
    end_at           DATETIME NOT NULL,
    reason           VARCHAR(255) NULL,
    created_at       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    KEY idx_blocked_business_range (business_id, start_at, end_at),
    CONSTRAINT fk_blocked_business FOREIGN KEY (business_id)
        REFERENCES businesses (id) ON DELETE CASCADE,
    CONSTRAINT fk_blocked_professional FOREIGN KEY (professional_id)
        REFERENCES professionals (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- Agendamentos.
-- status:
--   pending_payment -> reservado temporariamente, aguardando pagamento do sinal
--   confirmed       -> sinal pago (ou confirmado manualmente)
--   completed       -> atendimento realizado
--   cancelled       -> cancelado
--   no_show         -> cliente faltou
--   expired         -> reserva expirou sem pagamento
-- token: identificador publico opaco para a cliente acompanhar sem login.
-- ---------------------------------------------------------------------------
CREATE TABLE appointments (
    id               BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    business_id      BIGINT UNSIGNED NOT NULL,
    client_id        BIGINT UNSIGNED NOT NULL,
    professional_id  BIGINT UNSIGNED NOT NULL,
    service_id       BIGINT UNSIGNED NOT NULL,

    token            CHAR(36) NOT NULL,

    start_at         DATETIME NOT NULL,
    end_at           DATETIME NOT NULL,

    total_amount     DECIMAL(10,2) NOT NULL,
    deposit_amount   DECIMAL(10,2) NOT NULL DEFAULT 0,

    status           ENUM('pending_payment','confirmed','completed','cancelled','no_show','expired')
                        NOT NULL DEFAULT 'pending_payment',
    payment_status   ENUM('pending','paid','refunded','failed')
                        NOT NULL DEFAULT 'pending',

    expires_at       DATETIME NULL,
    notes            TEXT NULL,

    created_at       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    UNIQUE KEY uq_appointments_token (token),
    KEY idx_appt_overlap (business_id, professional_id, start_at, end_at),
    KEY idx_appt_status (business_id, status),
    KEY idx_appt_client (client_id),

    CONSTRAINT fk_appt_business FOREIGN KEY (business_id)
        REFERENCES businesses (id) ON DELETE CASCADE,
    CONSTRAINT fk_appt_client FOREIGN KEY (client_id)
        REFERENCES clients (id) ON DELETE RESTRICT,
    CONSTRAINT fk_appt_professional FOREIGN KEY (professional_id)
        REFERENCES professionals (id) ON DELETE RESTRICT,
    CONSTRAINT fk_appt_service FOREIGN KEY (service_id)
        REFERENCES services (id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- Pagamentos (PagBank / Pix). 1 agendamento pode ter varias tentativas.
-- ---------------------------------------------------------------------------
CREATE TABLE payments (
    id                 BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    business_id        BIGINT UNSIGNED NOT NULL,
    appointment_id     BIGINT UNSIGNED NOT NULL,

    provider           ENUM('pagbank') NOT NULL DEFAULT 'pagbank',
    method             ENUM('pix') NOT NULL DEFAULT 'pix',

    provider_order_id  VARCHAR(100) NULL,
    provider_charge_id VARCHAR(100) NULL,

    amount             DECIMAL(10,2) NOT NULL,
    status             ENUM('pending','paid','expired','refunded','failed','cancelled')
                          NOT NULL DEFAULT 'pending',

    qr_code_text       TEXT NULL,
    qr_code_image_url  VARCHAR(500) NULL,

    expires_at         DATETIME NULL,
    paid_at            DATETIME NULL,

    raw_response       JSON NULL,

    created_at         DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at         DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    KEY idx_payments_appointment (appointment_id),
    KEY idx_payments_order (provider_order_id),
    KEY idx_payments_charge (provider_charge_id),
    CONSTRAINT fk_payments_business FOREIGN KEY (business_id)
        REFERENCES businesses (id) ON DELETE CASCADE,
    CONSTRAINT fk_payments_appointment FOREIGN KEY (appointment_id)
        REFERENCES appointments (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- Log bruto de webhooks recebidos do PagBank (auditoria / reprocessamento).
-- ---------------------------------------------------------------------------
CREATE TABLE payment_webhooks (
    id                 BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    provider           VARCHAR(30) NOT NULL DEFAULT 'pagbank',
    provider_order_id  VARCHAR(100) NULL,
    reference_id       VARCHAR(100) NULL,
    payload            JSON NOT NULL,
    signature_valid    BOOLEAN NOT NULL DEFAULT FALSE,
    processed          BOOLEAN NOT NULL DEFAULT FALSE,
    error              TEXT NULL,
    created_at         DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    KEY idx_webhooks_order (provider_order_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
