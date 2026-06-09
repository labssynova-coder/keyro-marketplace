-- Migration 004: Custom payment tracking
ALTER TABLE orders ADD COLUMN payment_provider VARCHAR(50) DEFAULT NULL AFTER order_number;
ALTER TABLE orders ADD COLUMN payment_reference VARCHAR(255) DEFAULT NULL AFTER payment_provider;
ALTER TABLE orders ADD COLUMN payment_transaction_id VARCHAR(255) DEFAULT NULL AFTER payment_reference;
ALTER TABLE orders ADD COLUMN paid_at TIMESTAMP NULL AFTER total;
ALTER TABLE orders ADD UNIQUE KEY uk_orders_payment_reference (payment_reference);
ALTER TABLE orders ADD INDEX idx_orders_paid_at (paid_at);
