const { pool } = require('../config/db');
const { encryptSecret, decryptDeliveryRow } = require('../utils/secretCrypto');

async function create({ productId, keyValue, accountUsername, accountPassword }) {
  const [result] = await pool.query(
    `INSERT INTO product_keys (product_id, key_value, account_username, account_password)
     VALUES (?, ?, ?, ?)`,
    [
      productId,
      encryptSecret(keyValue),
      encryptSecret(accountUsername),
      encryptSecret(accountPassword)
    ]
  );
  return result.insertId;
}

async function findAvailableByProduct(productId) {
  const [rows] = await pool.query(
    `SELECT * FROM product_keys WHERE product_id = ? AND status = 'available' ORDER BY created_at ASC`,
    [productId]
  );
  return rows.map(decryptDeliveryRow);
}

async function countByProduct(productId) {
  const [rows] = await pool.query(
    `SELECT status, COUNT(*) as count FROM product_keys WHERE product_id = ? GROUP BY status`,
    [productId]
  );
  const counts = { total: 0, available: 0, assigned: 0, revoked: 0 };
  for (const row of rows) {
    counts[row.status] = row.count;
    counts.total += row.count;
  }
  return counts;
}

async function assignToOrderItem(productKeyId, orderItemId, conn) {
  const db = conn || pool;
  await db.query(
    `UPDATE product_keys SET status = 'assigned', assigned_order_item_id = ?, assigned_at = NOW() WHERE id = ?`,
    [orderItemId, productKeyId]
  );
}

async function releaseKey(productKeyId, conn) {
  const db = conn || pool;
  await db.query(
    `UPDATE product_keys SET status = 'available', assigned_order_item_id = NULL, assigned_at = NULL WHERE id = ?`,
    [productKeyId]
  );
}

async function findByOrderItem(orderItemId) {
  const [rows] = await pool.query(
    `SELECT * FROM product_keys WHERE assigned_order_item_id = ?`,
    [orderItemId]
  );
  return rows.length ? decryptDeliveryRow(rows[0]) : null;
}

async function findByProduct(productId) {
  const [rows] = await pool.query(
    `SELECT * FROM product_keys WHERE product_id = ? ORDER BY created_at DESC`,
    [productId]
  );
  return rows.map(decryptDeliveryRow);
}

async function remove(id) {
  const [result] = await pool.query(
    `DELETE FROM product_keys WHERE id = ? AND status = 'available'`,
    [id]
  );
  return result.affectedRows > 0;
}

async function findById(id) {
  const [rows] = await pool.query(
    `SELECT * FROM product_keys WHERE id = ?`,
    [id]
  );
  return rows.length ? decryptDeliveryRow(rows[0]) : null;
}

module.exports = { create, findAvailableByProduct, countByProduct, assignToOrderItem, releaseKey, findByOrderItem, findByProduct, remove, findById };
