const { pool } = require('../config/db');

async function findAll({ search, platformId, genreId, minPrice, maxPrice, isActive, limit = 20, offset = 0, sortBy = 'created_at', sortOrder = 'DESC' } = {}) {
  const allowedSorts = ['name', 'sale_price', 'discount_percent', 'created_at'];
  const sort = allowedSorts.includes(sortBy) ? sortBy : 'created_at';
  const order = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

  let sql = `SELECT p.*, pl.name as platform_name, pl.slug as platform_slug
    FROM products p
    JOIN platforms pl ON p.platform_id = pl.id`;
  const params = [];
  const where = [];

  if (search) {
    where.push('(p.name LIKE ? OR p.description LIKE ?)');
    params.push(`%${search}%`, `%${search}%`);
  }
  if (platformId) {
    where.push('p.platform_id = ?');
    params.push(platformId);
  }
  if (genreId) {
    sql += ' JOIN product_genres pg ON p.id = pg.product_id';
    where.push('pg.genre_id = ?');
    params.push(genreId);
  }
  if (minPrice !== undefined) {
    where.push('p.sale_price >= ?');
    params.push(minPrice);
  }
  if (maxPrice !== undefined) {
    where.push('p.sale_price <= ?');
    params.push(maxPrice);
  }
  if (isActive !== undefined) {
    where.push('p.is_active = ?');
    params.push(isActive ? 1 : 0);
  } else {
    where.push('p.is_active = 1');
  }

  if (where.length) sql += ' WHERE ' + where.join(' AND ');
  sql += ` ORDER BY p.${sort} ${order} LIMIT ? OFFSET ?`;
  params.push(limit, offset);

  const [rows] = await pool.query(sql, params);

  // Attach genres to each product
  for (const row of rows) {
    row.genres = await getProductGenres(row.id);
  }

  return rows;
}

async function getProductGenres(productId) {
  const [rows] = await pool.query(
    'SELECT g.id, g.name, g.slug FROM genres g JOIN product_genres pg ON g.id = pg.genre_id WHERE pg.product_id = ?',
    [productId]
  );
  return rows;
}

async function count({ search, platformId, genreId, isActive } = {}) {
  let sql = 'SELECT COUNT(DISTINCT p.id) as total FROM products p';
  const params = [];
  const where = [];

  if (search) {
    where.push('(p.name LIKE ? OR p.description LIKE ?)');
    params.push(`%${search}%`, `%${search}%`);
  }
  if (platformId) {
    where.push('p.platform_id = ?');
    params.push(platformId);
  }
  if (genreId) {
    sql += ' JOIN product_genres pg ON p.id = pg.product_id';
    where.push('pg.genre_id = ?');
    params.push(genreId);
  }
  if (isActive !== undefined) {
    where.push('p.is_active = ?');
    params.push(isActive ? 1 : 0);
  } else {
    where.push('p.is_active = 1');
  }

  if (where.length) sql += ' WHERE ' + where.join(' AND ');
  const [rows] = await pool.query(sql, params);
  return rows[0].total;
}

async function findById(id) {
  const [rows] = await pool.query(
    `SELECT p.*, pl.name as platform_name, pl.slug as platform_slug
     FROM products p
     JOIN platforms pl ON p.platform_id = pl.id
     WHERE p.id = ?`,
    [id]
  );
  if (!rows.length) return null;
  const product = rows[0];
  product.genres = await getProductGenres(id);
  return product;
}

async function create({ name, platformId, region, activation, originalPrice, salePrice, discountPercent, imageUrl, description, osReq, cpuReq, ramReq, gpuReq, stock, deliveryType, genreIds, isActive }) {
  const [result] = await pool.query(
    `INSERT INTO products (name, platform_id, region, activation, original_price, sale_price, discount_percent, image_url, description, os_req, cpu_req, ram_req, gpu_req, stock, delivery_type, is_active)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [name, platformId, region, activation, originalPrice, salePrice, discountPercent || 0, imageUrl || null, description || null, osReq || null, cpuReq || null, ramReq || null, gpuReq || null, stock || 100, deliveryType || 'key', isActive !== undefined ? isActive : 1]
  );
  const productId = result.insertId;

  if (genreIds && genreIds.length) {
    for (const gid of genreIds) {
      await pool.query('INSERT INTO product_genres (product_id, genre_id) VALUES (?, ?)', [productId, gid]);
    }
  }

  return productId;
}

async function update(id, fields) {
  const allowed = ['name', 'platform_id', 'region', 'activation', 'original_price', 'sale_price', 'discount_percent', 'image_url', 'description', 'os_req', 'cpu_req', 'ram_req', 'gpu_req', 'stock', 'delivery_type', 'is_active'];
  const sets = [];
  const params = [];

  for (const [key, val] of Object.entries(fields)) {
    const col = key.replace(/([A-Z])/g, '_$1').toLowerCase();
    if (allowed.includes(col)) {
      sets.push(`${col} = ?`);
      params.push(val);
    }
  }

  if (fields.genreIds !== undefined) {
    await pool.query('DELETE FROM product_genres WHERE product_id = ?', [id]);
    if (fields.genreIds && fields.genreIds.length) {
      for (const gid of fields.genreIds) {
        await pool.query('INSERT INTO product_genres (product_id, genre_id) VALUES (?, ?)', [id, gid]);
      }
    }
  }

  if (sets.length) {
    params.push(id);
    await pool.query(`UPDATE products SET ${sets.join(', ')} WHERE id = ?`, params);
  }
}

async function remove(id) {
  await pool.query('UPDATE products SET is_active = FALSE WHERE id = ?', [id]);
}

async function updateImageUrl(id, imageUrl) {
  await pool.query('UPDATE products SET image_url = ? WHERE id = ?', [imageUrl, id]);
}

module.exports = { findAll, findById, create, update, remove, count, updateImageUrl };
