const { pool } = require('../config/db');

async function dashboardStats() {
  const [revenueRow] = await pool.query(
    "SELECT COALESCE(SUM(total), 0) as total FROM orders WHERE status IN ('paid','delivered')"
  );

  const [orderRow] = await pool.query('SELECT COUNT(*) as total FROM orders');
  const [userRow] = await pool.query('SELECT COUNT(*) as total FROM users WHERE is_active = 1');
  const [productRow] = await pool.query('SELECT COUNT(*) as total FROM products WHERE is_active = 1');

  const [recentOrders] = await pool.query(
    `SELECT o.id, o.order_number, o.status, o.total, o.created_at,
       u.email, u.first_name, u.last_name
     FROM orders o JOIN users u ON o.user_id = u.id
     ORDER BY o.created_at DESC LIMIT 5`
  );

  const [topProducts] = await pool.query(
    `SELECT oi.product_name, SUM(oi.quantity) as total_sold, SUM(oi.unit_price * oi.quantity) as revenue
     FROM order_items oi
     GROUP BY oi.product_id, oi.product_name
     ORDER BY total_sold DESC LIMIT 5`
  );

  const [ordersByStatus] = await pool.query(
    'SELECT status, COUNT(*) as count FROM orders GROUP BY status'
  );

  const [revenueByMonth] = await pool.query(
    `SELECT DATE_FORMAT(created_at, '%Y-%m') as month, SUM(total) as revenue
     FROM orders WHERE status IN ('paid','delivered') AND created_at >= DATE_SUB(NOW(), INTERVAL 6 MONTH)
     GROUP BY month ORDER BY month ASC`
  );

  return {
    totalRevenue: revenueRow[0].total,
    totalOrders: orderRow[0].total,
    totalUsers: userRow[0].total,
    totalProducts: productRow[0].total,
    recentOrders,
    topProducts,
    ordersByStatus,
    revenueByMonth
  };
}

module.exports = { dashboardStats };