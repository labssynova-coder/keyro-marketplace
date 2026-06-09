const { pool } = require('../config/db');
const { encryptSecret, decryptSecret } = require('../utils/secretCrypto');

let paymentColumnsEnsured = false;

async function ensurePaymentColumns() {
  if (paymentColumnsEnsured) return;

  const [cols] = await pool.query(
    `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'orders'
       AND COLUMN_NAME IN ('payment_provider','payment_reference','payment_transaction_id','paid_at')`
  );
  const names = new Set(cols.map(c => c.COLUMN_NAME));

  if (!names.has('payment_provider')) {
    await pool.query('ALTER TABLE orders ADD COLUMN payment_provider VARCHAR(50) DEFAULT NULL AFTER order_number');
  }
  if (!names.has('payment_reference')) {
    await pool.query('ALTER TABLE orders ADD COLUMN payment_reference VARCHAR(255) DEFAULT NULL AFTER payment_provider');
  }
  if (!names.has('payment_transaction_id')) {
    await pool.query('ALTER TABLE orders ADD COLUMN payment_transaction_id VARCHAR(255) DEFAULT NULL AFTER payment_reference');
  }
  if (!names.has('paid_at')) {
    await pool.query('ALTER TABLE orders ADD COLUMN paid_at TIMESTAMP NULL AFTER total');
  }

  const [indexes] = await pool.query(
    `SELECT INDEX_NAME FROM INFORMATION_SCHEMA.STATISTICS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'orders'
       AND INDEX_NAME IN ('uk_orders_payment_reference','idx_orders_paid_at')`
  );
  const indexNames = new Set(indexes.map(i => i.INDEX_NAME));

  if (!indexNames.has('uk_orders_payment_reference')) {
    await pool.query('ALTER TABLE orders ADD UNIQUE KEY uk_orders_payment_reference (payment_reference)');
  }
  if (!indexNames.has('idx_orders_paid_at')) {
    await pool.query('ALTER TABLE orders ADD INDEX idx_orders_paid_at (paid_at)');
  }

  paymentColumnsEnsured = true;
}

function generateOrderNumber() {
  const year = new Date().getFullYear();
  const seq = String(Math.floor(Math.random() * 1000000)).padStart(6, '0');
  return `KEY-${year}-${seq}`;
}

async function create({ userId, items }) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    let subtotal = 0;
    let discount = 0;
    for (const item of items) {
      subtotal += Number(item.salePrice) * item.quantity;
      discount += (Number(item.originalPrice) - Number(item.salePrice)) * item.quantity;
    }

    const orderNumber = generateOrderNumber();
    const [orderResult] = await conn.query(
      'INSERT INTO orders (user_id, order_number, status, subtotal, discount, total) VALUES (?, ?, ?, ?, ?, ?)',
      [userId, orderNumber, 'pending', subtotal, discount, subtotal]
    );
    const orderId = orderResult.insertId;

    for (const item of items) {
      for (let i = 0; i < item.quantity; i++) {
        await conn.query(
          'INSERT INTO order_items (order_id, product_id, product_name, quantity, unit_price, original_price) VALUES (?, ?, ?, ?, ?, ?)',
          [orderId, item.productId, item.productName, 1, item.salePrice, item.originalPrice]
        );
      }
    }

    await conn.commit();
    return { orderId, orderNumber };
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

async function findByUserId(userId, { limit = 20, offset = 0 } = {}) {
  const [rows] = await pool.query(
    'SELECT o.* FROM orders o WHERE o.user_id = ? ORDER BY o.created_at DESC LIMIT ? OFFSET ?',
    [userId, limit, offset]
  );
  for (const order of rows) {
    order.items = await findItemsByOrderId(order.id);
  }
  return rows;
}

async function findById(id) {
  const [rows] = await pool.query('SELECT * FROM orders WHERE id = ?', [id]);
  if (!rows.length) return null;
  const order = rows[0];
  order.items = await findItemsByOrderId(id);
  return order;
}

async function findItemsByOrderId(orderId) {
  const [rows] = await pool.query('SELECT * FROM order_items WHERE order_id = ?', [orderId]);
  return rows;
}

async function findItemsByOrderIdForUpdate(conn, orderId) {
  const [rows] = await conn.query('SELECT * FROM order_items WHERE order_id = ? FOR UPDATE', [orderId]);
  return rows;
}

async function findAll({ status, limit = 20, offset = 0 } = {}) {
  let sql = `SELECT o.*, u.email as user_email, u.first_name, u.last_name
    FROM orders o JOIN users u ON o.user_id = u.id`;
  const params = [];
  if (status) {
    sql += ' WHERE o.status = ?';
    params.push(status);
  }
  sql += ' ORDER BY o.created_at DESC LIMIT ? OFFSET ?';
  params.push(limit, offset);
  const [rows] = await pool.query(sql, params);
  for (const order of rows) {
    order.items = await findItemsByOrderId(order.id);
  }
  return rows;
}

async function countAll({ status } = {}) {
  let sql = 'SELECT COUNT(*) as total FROM orders';
  const params = [];
  if (status) {
    sql += ' WHERE status = ?';
    params.push(status);
  }
  const [rows] = await pool.query(sql, params);
  return rows[0].total;
}

async function countByUserId(userId) {
  const [rows] = await pool.query('SELECT COUNT(*) as total FROM orders WHERE user_id = ?', [userId]);
  return rows[0].total;
}

async function attachPaymentReference({ id, provider, reference }) {
  await ensurePaymentColumns();
  await pool.query(
    'UPDATE orders SET payment_provider = ?, payment_reference = ? WHERE id = ?',
    [provider || 'custom', reference, id]
  );
}

async function assignDeliveryForItems(conn, items) {
  for (const item of items) {
    if (item.product_key_id) continue;

    const [availableKeys] = await conn.query(
      `SELECT id, key_value, account_username, account_password FROM product_keys
       WHERE product_id = ? AND status = 'available' ORDER BY created_at ASC LIMIT 1 FOR UPDATE`,
      [item.product_id]
    );
    if (!availableKeys.length) {
      const err = new Error(`No available key for product: ${item.product_name}`);
      err.code = 'NO_KEY_AVAILABLE';
      throw err;
    }

    const key = {
      ...availableKeys[0],
      key_value: decryptSecret(availableKeys[0].key_value),
      account_username: decryptSecret(availableKeys[0].account_username),
      account_password: decryptSecret(availableKeys[0].account_password)
    };
    await conn.query(
      "UPDATE product_keys SET status = 'assigned', assigned_order_item_id = ?, assigned_at = NOW() WHERE id = ?",
      [item.id, key.id]
    );

    const deliveryType = key.key_value ? 'key' : 'account';
    await conn.query(
      `UPDATE order_items
       SET product_key_id = ?, delivery_type = ?, assigned_key = ?, account_username = ?, account_password = ?
       WHERE id = ?`,
      [
        key.id,
        deliveryType,
        encryptSecret(key.key_value),
        encryptSecret(key.account_username),
        encryptSecret(key.account_password),
        item.id
      ]
    );
  }
}

async function markPaidFromPayment({ paymentReference, orderId, transactionId }) {
  await ensurePaymentColumns();
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [orders] = orderId
      ? await conn.query('SELECT * FROM orders WHERE id = ? FOR UPDATE', [orderId])
      : await conn.query('SELECT * FROM orders WHERE payment_reference = ? FOR UPDATE', [paymentReference]);
    if (!orders.length) {
      const err = new Error('Order not found for payment confirmation');
      err.code = 'ORDER_NOT_FOUND';
      throw err;
    }

    const order = orders[0];
    if (!['paid', 'delivered'].includes(order.status)) {
      const items = await findItemsByOrderIdForUpdate(conn, order.id);
      await assignDeliveryForItems(conn, items);
      await conn.query(
        `UPDATE orders
         SET status = 'paid', payment_transaction_id = ?, paid_at = COALESCE(paid_at, NOW())
         WHERE id = ?`,
        [transactionId || null, order.id]
      );
    }

    await conn.commit();
    return order.id;
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

async function updateStatus(id, status) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const order = await findById(id);
    if (!order) throw new Error('Order not found');

    if (status === 'paid') {
      const err = new Error('Paid status is set automatically by the payment confirmation endpoint');
      err.code = 'PAYMENT_REQUIRED';
      throw err;
    }

    if ((status === 'delivered') && order.status !== 'paid' && order.status !== 'delivered') {
      const err = new Error('Order must be paid before delivery');
      err.code = 'PAYMENT_REQUIRED';
      throw err;
    }

    if (status === 'cancelled' || status === 'refunded') {
      for (const item of order.items) {
        if (item.product_key_id) {
          await conn.query(
            "UPDATE product_keys SET status = 'available', assigned_order_item_id = NULL, assigned_at = NULL WHERE id = ?",
            [item.product_key_id]
          );
          await conn.query(
            `UPDATE order_items
             SET product_key_id = NULL, assigned_key = NULL, account_username = NULL, account_password = NULL, key_revealed_at = NULL
             WHERE id = ?`,
            [item.id]
          );
        }
      }
    }

    await conn.query('UPDATE orders SET status = ? WHERE id = ?', [status, id]);
    await conn.commit();
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

async function countByStatus() {
  const [rows] = await pool.query('SELECT status, COUNT(*) as count FROM orders GROUP BY status');
  return rows;
}

async function getTotalRevenue() {
  const [rows] = await pool.query(
    "SELECT COALESCE(SUM(total), 0) as revenue FROM orders WHERE status IN ('paid','delivered')"
  );
  return rows[0].revenue;
}

function maskItemDelivery(item) {
  item.assigned_key = decryptSecret(item.assigned_key);
  item.account_username = decryptSecret(item.account_username);
  item.account_password = decryptSecret(item.account_password);

  if (!item.assigned_key && !item.account_username) return item;

  if (item.delivery_type === 'account') {
    item.account_username = maskString(item.account_username);
    item.account_password = '********';
  } else {
    item.assigned_key = maskKey(item.assigned_key);
  }
  return item;
}

function maskKey(key) {
  if (!key) return null;
  const parts = key.split(/[-\s]+/);
  if (parts.length > 1) {
    return parts.slice(0, -1).join('-') + '-*****';
  }
  if (key.length > 6) {
    return key.slice(0, 6) + '*****';
  }
  return '*****';
}

function maskString(str) {
  if (!str) return null;
  if (str.length <= 2) return '*****';
  return str[0] + '*****';
}

module.exports = {
  create,
  findByUserId,
  findById,
  findAll,
  countAll,
  countByUserId,
  attachPaymentReference,
  markPaidFromPayment,
  updateStatus,
  countByStatus,
  getTotalRevenue,
  maskItemDelivery,
  ensurePaymentColumns
};
