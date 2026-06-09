const { pool } = require('../config/db');

async function create({ email, passwordHash, firstName, lastName, role = 'customer' }) {
  const [result] = await pool.query(
    'INSERT INTO users (email, password_hash, first_name, last_name, role) VALUES (?, ?, ?, ?, ?)',
    [email, passwordHash, firstName, lastName, role]
  );
  return result.insertId;
}

async function findByEmail(email) {
  const [rows] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
  return rows[0] || null;
}

async function findById(id) {
  const [rows] = await pool.query(
    'SELECT id, email, first_name, last_name, role, avatar_url, is_active, created_at FROM users WHERE id = ?',
    [id]
  );
  return rows[0] || null;
}

async function findAll({ limit = 20, offset = 0, role } = {}) {
  let sql = 'SELECT id, email, first_name, last_name, role, is_active, created_at FROM users';
  const params = [];
  if (role) {
    sql += ' WHERE role = ?';
    params.push(role);
  }
  sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
  params.push(limit, offset);
  const [rows] = await pool.query(sql, params);
  return rows;
}

async function count({ role } = {}) {
  let sql = 'SELECT COUNT(*) as total FROM users';
  const params = [];
  if (role) {
    sql += ' WHERE role = ?';
    params.push(role);
  }
  const [rows] = await pool.query(sql, params);
  return rows[0].total;
}

async function updateRole(id, role) {
  await pool.query('UPDATE users SET role = ? WHERE id = ?', [role, id]);
}

async function deactivate(id) {
  await pool.query('UPDATE users SET is_active = FALSE WHERE id = ?', [id]);
}

async function updateProfile(id, { firstName, lastName, avatarUrl }) {
  const fields = [];
  const params = [];
  if (firstName !== undefined) { fields.push('first_name = ?'); params.push(firstName); }
  if (lastName !== undefined) { fields.push('last_name = ?'); params.push(lastName); }
  if (avatarUrl !== undefined) { fields.push('avatar_url = ?'); params.push(avatarUrl); }
  if (!fields.length) return;
  params.push(id);
  await pool.query(`UPDATE users SET ${fields.join(', ')} WHERE id = ?`, params);
}

module.exports = { create, findByEmail, findById, findAll, count, updateRole, deactivate, updateProfile };