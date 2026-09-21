-- 012_service_sort_order.sql
-- Permite controlar manualmente a ordem dos servicos no catalogo publico.

ALTER TABLE services
    ADD COLUMN sort_order INT NOT NULL DEFAULT 0 AFTER buffer_minutes,
    ADD INDEX idx_services_business_active_order (business_id, active, sort_order);

UPDATE services
SET sort_order = id * 10
WHERE sort_order = 0;
