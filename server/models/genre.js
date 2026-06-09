const { pool } = require('../config/db');

async function findAll() {
  const [rows] = await pool.query('SELECT * FROM genres ORDER BY name ASC');
  return rows;
}

async function findById(id) {
  const [rows] = await pool.query('SELECT * FROM genres WHERE id = ?', [id]);
  return rows[0] || null;
}

async function findBySlug(slug) {
  const [rows] = await pool.query('SELECT * FROM genres WHERE slug = ?', [slug]);
  return rows[0] || null;
}

async function create({ name, slug }) {
  const [result] = await pool.query(
    'INSERT INTO genres (name, slug) VALUES (?, ?)',
    [name, slug]
  );
  return result.insertId;
}

async function update(id, { name, slug }) {
  const fields = [];
  const params = [];
  if (name !== undefined) { fields.push('name = ?'); params.push(name); }
  if (slug !== undefined) { fields.push('slug = ?'); params.push(slug); }
  if (!fields.length) return;
  params.push(id);
  await pool.query(`UPDATE genres SET ${fields.join(', ')} WHERE id = ?`, params);
}

async function remove(id) {
  await pool.query('DELETE FROM genres WHERE id = ?', [id]);
}

module.exports = { findAll, findById, findBySlug, create, update, remove };