-- ===========================================================================
-- 003_financial.sql
-- Financeiro simples (caixa, despesas) e auditoria.
-- Relatorios avancados serao construidos sobre estas tabelas depois.
-- ===========================================================================

SET NAMES utf8mb4;

-- Despesas do salao (produtos, aluguel, etc.).
CREATE TABLE expenses (
    id           BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    business_id  BIGINT UNSIGNED NOT NULL,
    description  VARCHAR(200) NOT NULL,
    category     VARCHAR(80) NULL,
    amount       DECIMAL(10,2) NOT NULL,
    spent_at     DATE NOT NULL,
    created_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    KEY idx_expenses_business_date (business_id, spent_at),
    CONSTRAINT fk_expenses_business FOREIGN KEY (business_id)
        REFERENCES businesses (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Movimentacoes de caixa (entradas/saidas). Entradas podem vir de pagamentos.
CREATE TABLE cash_transactions (
    id              BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    business_id     BIGINT UNSIGNED NOT NULL,
    appointment_id  BIGINT UNSIGNED NULL,
    payment_id      BIGINT UNSIGNED NULL,
    type            ENUM('in','out') NOT NULL,
    description     VARCHAR(200) NOT NULL,
    amount          DECIMAL(10,2) NOT NULL,
    occurred_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    KEY idx_cash_business_date (business_id, occurred_at),
    CONSTRAINT fk_cash_business FOREIGN KEY (business_id)
        REFERENCES businesses (id) ON DELETE CASCADE,
    CONSTRAINT fk_cash_appointment FOREIGN KEY (appointment_id)
        REFERENCES appointments (id) ON DELETE SET NULL,
    CONSTRAINT fk_cash_payment FOREIGN KEY (payment_id)
        REFERENCES payments (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Trilha de auditoria de acoes do painel.
CREATE TABLE audit_logs (
    id           BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    business_id  BIGINT UNSIGNED NULL,
    user_id      BIGINT UNSIGNED NULL,
    action       VARCHAR(100) NOT NULL,
    entity       VARCHAR(60) NULL,
    entity_id    BIGINT UNSIGNED NULL,
    metadata     JSON NULL,
    ip           VARCHAR(45) NULL,
    created_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    KEY idx_audit_business (business_id, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
