-- Permite guardar QR Code em data URL no modo de teste.
ALTER TABLE payments
    MODIFY qr_code_image_url TEXT NULL;
