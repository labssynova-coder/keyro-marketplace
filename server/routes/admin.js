const express = require('express');
const router = express.Router();
const adminModel = require('../models/admin');
const orderModel = require('../models/order');
const siteSettings = require('../models/siteSettings');
const authenticate = require('../middleware/auth');
const requireAdmin = require('../middleware/admin');
const Joi = require('joi');
const validate = require('../middleware/validate');
const { parsePagination, buildPaginatedResponse } = require('../utils/pagination');

const homeContentSchema = {
  body: Joi.object({
    heroMode: Joi.string().valid('auto', 'product', 'custom').default('auto'),
    heroProductId: Joi.number().integer().allow(null),
    heroEyebrow: Joi.string().allow('', null).max(120),
    heroTitle: Joi.string().allow('', null).max(160),
    heroSubtitle: Joi.string().allow('', null).max(500),
    heroImageUrl: Joi.string().allow('', null).max(500),
    heroButtonLabel: Joi.string().allow('', null).max(80),
    featuredProductIds: Joi.array().items(Joi.number().integer()).max(12).default([])
  })
};

// GET /api/admin/dashboard
router.get('/dashboard', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const stats = await adminModel.dashboardStats();
    res.json(stats);
  } catch (err) { next(err); }
});

// GET /api/admin/orders
router.get('/orders', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const { limit, offset, page } = parsePagination(req.query);
    const orders = await orderModel.findAll({ status: req.query.status, limit, offset });
    const total = await orderModel.countAll({ status: req.query.status });
    res.json(buildPaginatedResponse(orders, total, page, limit));
  } catch (err) { next(err); }
});

// GET /api/admin/site/home-content
router.get('/site/home-content', authenticate, requireAdmin, async (req, res, next) => {
  try {
    res.json(await siteSettings.getHomeContent());
  } catch (err) { next(err); }
});

// PUT /api/admin/site/home-content
router.put('/site/home-content', authenticate, requireAdmin, validate(homeContentSchema), async (req, res, next) => {
  try {
    res.json(await siteSettings.updateHomeContent(req.body));
  } catch (err) { next(err); }
});

module.exports = router;
