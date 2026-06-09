const express = require('express');
const router = express.Router();
const Joi = require('joi');
const orderModel = require('../models/order');
const cartModel = require('../models/cart');
const productKeyModel = require('../models/productKey');
const authenticate = require('../middleware/auth');
const requireAdmin = require('../middleware/admin');
const validate = require('../middleware/validate');
const AppError = require('../utils/AppError');
const { parsePagination, buildPaginatedResponse } = require('../utils/pagination');
const { decryptSecret } = require('../utils/secretCrypto');

const statusSchema = {
  body: Joi.object({
    status: Joi.string().valid('pending','paid','processing','delivered','cancelled','refunded').required()
  })
};

// GET /api/orders — user's orders
router.get('/', authenticate, async (req, res, next) => {
  try {
    const { limit, offset, page } = parsePagination(req.query);
    const orders = await orderModel.findByUserId(req.user.userId, { limit, offset });
    const total = await orderModel.countByUserId(req.user.userId);
    res.json(buildPaginatedResponse(orders, total, page, limit));
  } catch (err) { next(err); }
});

// POST /api/orders — legacy endpoint disabled; paid orders start through Checkout
router.post('/', authenticate, async (req, res, next) => {
  try {
    return next(new AppError(410, 'Use /api/payments/initiate to create a payable order'));
  } catch (err) { next(err); }
});

// GET /api/orders/:id
router.get('/:id', authenticate, async (req, res, next) => {
  try {
    const order = await orderModel.findById(req.params.id);
    if (!order) return next(new AppError(404, 'Order not found'));
    if (order.user_id !== req.user.userId && req.user.role !== 'admin') {
      return next(new AppError(403, 'Access denied'));
    }
    // Mask delivery info for non-admin users
    if (req.user.role !== 'admin') {
      order.items = order.items.map(item => orderModel.maskItemDelivery({ ...item }));
    }
    res.json(order);
  } catch (err) { next(err); }
});

// PUT /api/orders/:id/status — admin only
router.put('/:id/status', authenticate, requireAdmin, validate(statusSchema), async (req, res, next) => {
  try {
    const order = await orderModel.findById(req.params.id);
    if (!order) return next(new AppError(404, 'Order not found'));
    await orderModel.updateStatus(req.params.id, req.body.status);
    const updated = await orderModel.findById(req.params.id);
    res.json(updated);
  } catch (err) {
    if (err.code === 'NO_KEY_AVAILABLE' || err.code === 'PAYMENT_REQUIRED') {
      return next(new AppError(400, err.message));
    }
    next(err);
  }
});

// POST /api/orders/:id/items/:itemId/reveal — customer reveals key
router.post('/:id/items/:itemId/reveal', authenticate, async (req, res, next) => {
  try {
    const order = await orderModel.findById(req.params.id);
    if (!order) return next(new AppError(404, 'Order not found'));
    if (order.user_id !== req.user.userId) return next(new AppError(403, 'Access denied'));
    if (!['paid', 'delivered'].includes(order.status)) {
      return next(new AppError(400, 'Order must be paid to reveal keys'));
    }

    const item = order.items.find(i => i.id === parseInt(req.params.itemId));
    if (!item) return next(new AppError(404, 'Order item not found'));
    if (!item.assigned_key && !item.account_username) {
      return next(new AppError(400, 'No key assigned to this item'));
    }

    // Update key_revealed_at
    const { pool } = require('../config/db');
    await pool.query('UPDATE order_items SET key_revealed_at = NOW() WHERE id = ?', [item.id]);

    res.json({
      deliveryType: item.delivery_type,
      key: decryptSecret(item.assigned_key) || null,
      accountUsername: decryptSecret(item.account_username) || null,
      accountPassword: decryptSecret(item.account_password) || null,
      revealedAt: new Date().toISOString()
    });
  } catch (err) { next(err); }
});

module.exports = router;
