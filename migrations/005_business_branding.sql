-- ===========================================================================
-- 005_business_branding.sql
-- Permite personalizar a identidade do studio (nome ja existe; adiciona logo).
-- logo_url guarda uma URL OU um data URL (base64) de uma imagem pequena.
-- ===========================================================================

SET NAMES utf8mb4;

ALTER TABLE businesses
    ADD COLUMN logo_url LONGTEXT NULL AFTER name;
