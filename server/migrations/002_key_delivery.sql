-- Migration 002: Key Delivery System
-- product_keys: inventory of keys/accounts per product
CREATE TABLE IF NOT EXISTS product_keys (
  id INT AUTO_INCREMENT PRIMARY KEY,
  product_id INT NOT NULL,
  key_value VARCHAR(500),
  account_username VARCHAR(255),
  account_password VARCHAR(255),
  status ENUM('available','assigned','revoked') DEFAULT 'available',
  assigned_order_item_id INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  assigned_at TIMESTAMP NULL,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
  FOREIGN KEY (assigned_order_item_id) REFERENCES order_items(id) ON DELETE SET NULL
);

-- Add delivery_type to products table
ALTER TABLE products ADD COLUMN delivery_type ENUM('key','account') DEFAULT 'key' AFTER stock;

-- Add delivery columns to order_items
ALTER TABLE order_items ADD COLUMN product_key_id INT AFTER product_id;
ALTER TABLE order_items ADD COLUMN delivery_type ENUM('key','account') DEFAULT 'key' AFTER product_key_id;
ALTER TABLE order_items ADD COLUMN assigned_key VARCHAR(500) AFTER delivery_type;
ALTER TABLE order_items ADD COLUMN account_username VARCHAR(255) AFTER assigned_key;
ALTER TABLE order_items ADD COLUMN account_password VARCHAR(255) AFTER account_username;
ALTER TABLE order_items ADD COLUMN key_revealed_at TIMESTAMP NULL AFTER account_password;
ALTER TABLE order_items ADD FOREIGN KEY (product_key_id) REFERENCES product_keys(id);