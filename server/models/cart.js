const { pool } = require('../config/db');

async function findByUserId(userId) {
  const [rows] = await pool.query(
    `SELECT ci.id, ci.quantity, ci.created_at,
       p.id as product_id, p.name, p.sale_price, p.original_price, p.discount_percent, p.image_url, p.region,
       pl.name as platform_name, pl.slug as platform_slug
     FROM cart_items ci
     JOIN products p ON ci.product_id = p.id
     JOIN platforms pl ON p.platform_id = pl.id
     WHERE ci.user_id = ?
     ORDER BY ci.created_at DESC`,
    [userId]
  );
  return rows;
}

async function addItem({ userId, productId, quantity = 1 }) {
  const [result] = await pool.query(
    `INSERT INTO cart_items (user_id, product_id, quantity)
     SELECT ?, p.id, ? FROM products p WHERE p.id = ? AND p.is_active = 1
     ON DUPLICATE KEY UPDATE quantity = quantity + VALUES(quantity)`,
    [userId, quantity, productId]
  );
  return result.insertId || result.affectedRows;
}

async function updateItemForUser({ id, userId, quantity }) {
  if (quantity <= 0) {
    return removeItemForUser({ id, userId });
  }
  const [result] = await pool.query(
    'UPDATE cart_items SET quantity = ? WHERE id = ? AND user_id = ?',
    [quantity, id, userId]
  );
  return result.affectedRows > 0;
}

async function removeItemForUser({ id, userId }) {
  const [result] = await pool.query('DELETE FROM cart_items WHERE id = ? AND user_id = ?', [id, userId]);
  return result.affectedRows > 0;
}

async function updateItem(id, quantity) {
  if (quantity <= 0) {
    return removeItem(id);
  }
  await pool.query('UPDATE cart_items SET quantity = ? WHERE id = ?', [quantity, id]);
}

async function removeItem(id) {
  await pool.query('DELETE FROM cart_items WHERE id = ?', [id]);
}

async function removeByUserAndProduct({ userId, productId }) {
  await pool.query('DELETE FROM cart_items WHERE user_id = ? AND product_id = ?', [userId, productId]);
}

async function clearByUserId(userId) {
  await pool.query('DELETE FROM cart_items WHERE user_id = ?', [userId]);
}

async function countByUserId(userId) {
  const [rows] = await pool.query(
    'SELECT COALESCE(SUM(quantity), 0) as total FROM cart_items WHERE user_id = ?',
    [userId]
  );
  return rows[0].total;
}

module.exports = {
  findByUserId,
  addItem,
  updateItem,
  updateItemForUser,
  removeItem,
  removeItemForUser,
  removeByUserAndProduct,
  clearByUserId,
  countByUserId
};
