const { pool } = require('../config/db');

async function tableExists(tableName) {
  const [rows] = await pool.query(
    `SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?`,
    [tableName]
  );
  return rows.length > 0;
}

async function columnExists(tableName, columnName) {
  const [rows] = await pool.query(
    `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
    [tableName, columnName]
  );
  return rows.length > 0;
}

async function indexExists(tableName, indexName) {
  const [rows] = await pool.query(
    `SELECT INDEX_NAME FROM INFORMATION_SCHEMA.STATISTICS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND INDEX_NAME = ?`,
    [tableName, indexName]
  );
  return rows.length > 0;
}

async function foreignKeyExists(tableName, columnName) {
  const [rows] = await pool.query(
    `SELECT CONSTRAINT_NAME FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?
       AND REFERENCED_TABLE_NAME IS NOT NULL`,
    [tableName, columnName]
  );
  return rows.length > 0;
}

async function ensureDeliverySchema() {
  if (!(await tableExists('product_keys'))) {
    await pool.query(
      `CREATE TABLE product_keys (
        id INT AUTO_INCREMENT PRIMARY KEY,
        product_id INT NOT NULL,
        key_value VARCHAR(1000),
        account_username VARCHAR(1000),
        account_password VARCHAR(1000),
        status ENUM('available','assigned','revoked') DEFAULT 'available',
        assigned_order_item_id INT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        assigned_at TIMESTAMP NULL,
        FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
        FOREIGN KEY (assigned_order_item_id) REFERENCES order_items(id) ON DELETE SET NULL
      ) ENGINE=InnoDB`
    );
  }

  if (!(await columnExists('products', 'delivery_type'))) {
    await pool.query("ALTER TABLE products ADD COLUMN delivery_type ENUM('key','account') DEFAULT 'key' AFTER stock");
  }

  if (!(await columnExists('order_items', 'product_key_id'))) {
    await pool.query('ALTER TABLE order_items ADD COLUMN product_key_id INT AFTER product_id');
  }
  if (!(await columnExists('order_items', 'delivery_type'))) {
    await pool.query("ALTER TABLE order_items ADD COLUMN delivery_type ENUM('key','account') DEFAULT 'key' AFTER product_key_id");
  }
  if (!(await columnExists('order_items', 'assigned_key'))) {
    await pool.query('ALTER TABLE order_items ADD COLUMN assigned_key VARCHAR(1000) AFTER delivery_type');
  }
  if (!(await columnExists('order_items', 'account_username'))) {
    await pool.query('ALTER TABLE order_items ADD COLUMN account_username VARCHAR(1000) AFTER assigned_key');
  }
  if (!(await columnExists('order_items', 'account_password'))) {
    await pool.query('ALTER TABLE order_items ADD COLUMN account_password VARCHAR(1000) AFTER account_username');
  }
  if (!(await columnExists('order_items', 'key_revealed_at'))) {
    await pool.query('ALTER TABLE order_items ADD COLUMN key_revealed_at TIMESTAMP NULL AFTER account_password');
  }
  if (!(await foreignKeyExists('order_items', 'product_key_id'))) {
    await pool.query(
      `ALTER TABLE order_items
       ADD CONSTRAINT fk_order_items_product_key
       FOREIGN KEY (product_key_id) REFERENCES product_keys(id)`
    );
  }
}

async function ensureRuntimeSchema() {
  await ensureDeliverySchema();
}

module.exports = { ensureRuntimeSchema };
