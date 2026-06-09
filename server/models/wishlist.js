const { pool } = require('../config/db');

async function findByUserId(userId) {
  const [rows] = await pool.query(
    `SELECT wi.id, wi.created_at,
       p.id as product_id, p.name, p.sale_price, p.original_price, p.discount_percent, p.image_url,
       pl.name as platform_name, pl.slug as platform_slug
     FROM wishlist_items wi
     JOIN products p ON wi.product_id = p.id
     JOIN platforms pl ON p.platform_id = pl.id
     WHERE wi.user_id = ?
     ORDER BY wi.created_at DESC`,
    [userId]
  );
  return rows;
}

async function addItem({ userId, productId }) {
  const [result] = await pool.query(
    'INSERT IGNORE INTO wishlist_items (user_id, product_id) VALUES (?, ?)',
    [userId, productId]
  );
  return result.insertId;
}

async function removeItem({ userId, productId }) {
  await pool.query('DELETE FROM wishlist_items WHERE user_id = ? AND product_id = ?', [userId, productId]);
}

async function hasItem({ userId, productId }) {
  const [rows] = await pool.query(
    'SELECT 1 FROM wishlist_items WHERE user_id = ? AND product_id = ? LIMIT 1',
    [userId, productId]
  );
  return rows.length > 0;
}

module.exports = { findByUserId, addItem, removeItem, hasItem };