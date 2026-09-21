ALTER TABLE clients
    ADD COLUMN deleted_at DATETIME NULL AFTER cancel_count;
