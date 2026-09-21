ALTER TABLE appointments
    MODIFY status ENUM(
        'pending_payment',
        'confirmed',
        'completed',
        'cancelled',
        'no_show',
        'expired',
        'removed'
    ) NOT NULL DEFAULT 'pending_payment';
