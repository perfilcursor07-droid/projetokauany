-- ===========================================================================
-- 006_financial_categories.sql
-- Categorias do financeiro e vinculo entre saidas e despesas.
-- ===========================================================================

SET NAMES utf8mb4;

CREATE TABLE financial_categories (
    id           BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    business_id  BIGINT UNSIGNED NOT NULL,
    name         VARCHAR(80) NOT NULL,
    type         ENUM('in','out') NOT NULL,
    active       BOOLEAN NOT NULL DEFAULT TRUE,
    created_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_financial_categories (business_id, type, name),
    KEY idx_financial_categories_business (business_id, type, active),
    CONSTRAINT fk_financial_categories_business FOREIGN KEY (business_id)
        REFERENCES businesses (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

ALTER TABLE cash_transactions
    ADD COLUMN expense_id BIGINT UNSIGNED NULL AFTER payment_id,
    ADD COLUMN category VARCHAR(80) NULL AFTER description,
    ADD KEY idx_cash_expense (expense_id),
    ADD CONSTRAINT fk_cash_expense FOREIGN KEY (expense_id)
        REFERENCES expenses (id) ON DELETE SET NULL;

INSERT INTO financial_categories (business_id, name, type)
SELECT id, 'Servicos', 'in' FROM businesses;

INSERT INTO financial_categories (business_id, name, type)
SELECT id, 'Produtos', 'out' FROM businesses;

INSERT INTO financial_categories (business_id, name, type)
SELECT id, 'Aluguel', 'out' FROM businesses;

INSERT INTO financial_categories (business_id, name, type)
SELECT id, 'Manutencao', 'out' FROM businesses;
