const express = require('express');
const router = express.Router();
const Joi = require('joi');
const userModel = require('../models/user');
const authenticate = require('../middleware/auth');
const requireAdmin = require('../middleware/admin');
const validate = require('../middleware/validate');
const AppError = require('../utils/AppError');
const { parsePagination, buildPaginatedResponse } = require('../utils/pagination');

const roleSchema = {
  body: Joi.object({
    role: Joi.string().valid('customer', 'admin').required()
  })
};

// GET /api/users
router.get('/', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const { limit, offset, page } = parsePagination(req.query);
    const users = await userModel.findAll({ limit, offset, role: req.query.role });
    const total = await userModel.count({ role: req.query.role });
    res.json(buildPaginatedResponse(users, total, page, limit));
  } catch (err) { next(err); }
});

// PUT /api/users/:id/role
router.put('/:id/role', authenticate, requireAdmin, validate(roleSchema), async (req, res, next) => {
  try {
    const user = await userModel.findById(req.params.id);
    if (!user) return next(new AppError(404, 'User not found'));
    await userModel.updateRole(req.params.id, req.body.role);
    const updated = await userModel.findById(req.params.id);
    res.json(updated);
  } catch (err) { next(err); }
});

// PUT /api/users/:id/deactivate
router.put('/:id/deactivate', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const user = await userModel.findById(req.params.id);
    if (!user) return next(new AppError(404, 'User not found'));
    await userModel.deactivate(req.params.id);
    const updated = await userModel.findById(req.params.id);
    res.json(updated);
  } catch (err) { next(err); }
});

module.exports = router;