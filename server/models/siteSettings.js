const { pool } = require('../config/db');

const DEFAULT_HOME_CONTENT = {
  heroMode: 'auto',
  heroProductId: null,
  heroEyebrow: '',
  heroTitle: '',
  heroSubtitle: '',
  heroImageUrl: '',
  heroButtonLabel: 'Acheter maintenant',
  featuredProductIds: []
};

let ensured = false;

async function ensureTable() {
  if (ensured) return;
  await pool.query(
    `CREATE TABLE IF NOT EXISTS site_settings (
      setting_key VARCHAR(100) PRIMARY KEY,
      setting_value JSON NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB`
  );
  ensured = true;
}

function normalizeHomeContent(value) {
  const data = value && typeof value === 'object' ? value : {};
  return {
    ...DEFAULT_HOME_CONTENT,
    ...data,
    heroProductId: data.heroProductId ? Number(data.heroProductId) : null,
    featuredProductIds: Array.isArray(data.featuredProductIds)
      ? data.featuredProductIds.map(Number).filter(Boolean)
      : []
  };
}

async function findByKey(key) {
  await ensureTable();
  const [rows] = await pool.query('SELECT setting_value FROM site_settings WHERE setting_key = ?', [key]);
  if (!rows.length) return null;
  if (typeof rows[0].setting_value === 'object') return rows[0].setting_value;
  try {
    return JSON.parse(rows[0].setting_value);
  } catch (_) {
    return null;
  }
}

async function getHomeContent() {
  return normalizeHomeContent(await findByKey('home_content'));
}

async function updateHomeContent(content) {
  await ensureTable();
  const value = normalizeHomeContent(content);
  await pool.query(
    `INSERT INTO site_settings (setting_key, setting_value)
     VALUES (?, ?)
     ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value), updated_at = CURRENT_TIMESTAMP`,
    ['home_content', JSON.stringify(value)]
  );
  return value;
}

module.exports = { DEFAULT_HOME_CONTENT, getHomeContent, updateHomeContent, normalizeHomeContent };
