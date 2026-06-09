const { pool } = require('../config/db');

async function findByProductId(productId, { limit = 20, offset = 0 } = {}) {
  const [rows] = await pool.query(
    `SELECT r.id, r.rating, r.text, r.is_approved, r.created_at,
       u.first_name, u.last_name
     FROM reviews r
     JOIN users u ON r.user_id = u.id
     WHERE r.product_id = ? AND r.is_approved = 1
     ORDER BY r.created_at DESC
     LIMIT ? OFFSET ?`,
    [productId, limit, offset]
  );
  return rows;
}

async function findByProductIdAdmin(productId, { limit = 20, offset = 0 } = {}) {
  const [rows] = await pool.query(
    `SELECT r.id, r.rating, r.text, r.is_approved, r.created_at,
       u.first_name, u.last_name, u.email,
       p.name as product_name
     FROM reviews r
     JOIN users u ON r.user_id = u.id
     JOIN products p ON r.product_id = p.id
     WHERE r.product_id = ?
     ORDER BY r.created_at DESC
     LIMIT ? OFFSET ?`,
    [productId, limit, offset]
  );
  return rows;
}

async function findAllAdmin({ limit = 20, offset = 0 } = {}) {
  const [rows] = await pool.query(
    `SELECT r.id, r.rating, r.text, r.is_approved, r.created_at,
       u.first_name, u.last_name, u.email,
       p.name as product_name
     FROM reviews r
     JOIN users u ON r.user_id = u.id
     JOIN products p ON r.product_id = p.id
     ORDER BY r.created_at DESC
     LIMIT ? OFFSET ?`,
    [limit, offset]
  );
  return rows;
}

async function countByProductId(productId) {
  const [rows] = await pool.query('SELECT COUNT(*) as total FROM reviews WHERE product_id = ? AND is_approved = 1', [productId]);
  return rows[0].total;
}

async function countAll() {
  const [rows] = await pool.query('SELECT COUNT(*) as total FROM reviews');
  return rows[0].total;
}

async function create({ productId, userId, rating, text }) {
  const [result] = await pool.query(
    'INSERT INTO reviews (product_id, user_id, rating, text) VALUES (?, ?, ?, ?)',
    [productId, userId, rating, text]
  );
  return result.insertId;
}

async function findById(id) {
  const [rows] = await pool.query('SELECT * FROM reviews WHERE id = ?', [id]);
  return rows[0] || null;
}

async function update(id, { rating, text }) {
  const fields = [];
  const params = [];
  if (rating !== undefined) { fields.push('rating = ?'); params.push(rating); }
  if (text !== undefined) { fields.push('text = ?'); params.push(text); }
  if (!fields.length) return;
  params.push(id);
  await pool.query(`UPDATE reviews SET ${fields.join(', ')} WHERE id = ?`, params);
}

async function remove(id) {
  await pool.query('DELETE FROM reviews WHERE id = ?', [id]);
}

async function setApproved(id, isApproved) {
  await pool.query('UPDATE reviews SET is_approved = ? WHERE id = ?', [isApproved ? 1 : 0, id]);
}

async function getAverageRating(productId) {
  const [rows] = await pool.query(
    'SELECT AVG(rating) as avg, COUNT(*) as count FROM reviews WHERE product_id = ? AND is_approved = 1',
    [productId]
  );
  return { average: rows[0].avg ? Math.round(rows[0].avg * 10) / 10 : 0, count: rows[0].count };
}

module.exports = { findByProductId, findByProductIdAdmin, findAllAdmin, countByProductId, countAll, create, findById, update, remove, setApproved, getAverageRating };