const { pool } = require('../config/db');

async function findAll() {
  const [rows] = await pool.query('SELECT * FROM platforms ORDER BY sort_order ASC');
  return rows;
}

async function findById(id) {
  const [rows] = await pool.query('SELECT * FROM platforms WHERE id = ?', [id]);
  return rows[0] || null;
}

async function findBySlug(slug) {
  const [rows] = await pool.query('SELECT * FROM platforms WHERE slug = ?', [slug]);
  return rows[0] || null;
}

async function create({ name, slug, iconUrl, sortOrder }) {
  const [result] = await pool.query(
    'INSERT INTO platforms (name, slug, icon_url, sort_order) VALUES (?, ?, ?, ?)',
    [name, slug, iconUrl || null, sortOrder || 0]
  );
  return result.insertId;
}

async function update(id, { name, slug, iconUrl, sortOrder }) {
  const fields = [];
  const params = [];
  if (name !== undefined) { fields.push('name = ?'); params.push(name); }
  if (slug !== undefined) { fields.push('slug = ?'); params.push(slug); }
  if (iconUrl !== undefined) { fields.push('icon_url = ?'); params.push(iconUrl); }
  if (sortOrder !== undefined) { fields.push('sort_order = ?'); params.push(sortOrder); }
  if (!fields.length) return;
  params.push(id);
  await pool.query(`UPDATE platforms SET ${fields.join(', ')} WHERE id = ?`, params);
}

async function remove(id) {
  await pool.query('DELETE FROM platforms WHERE id = ?', [id]);
}

module.exports = { findAll, findById, findBySlug, create, update, remove };