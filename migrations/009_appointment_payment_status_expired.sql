ALTER TABLE appointments
    MODIFY payment_status ENUM('pending','paid','expired','refunded','failed')
    NOT NULL DEFAULT 'pending';
