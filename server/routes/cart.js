const express = require('express');
const router = express.Router();
const Joi = require('joi');
const cartModel = require('../models/cart');
const authenticate = require('../middleware/auth');
const validate = require('../middleware/validate');
const AppError = require('../utils/AppError');

const addSchema = {
  body: Joi.object({
    productId: Joi.number().integer().required(),
    quantity: Joi.number().integer().min(1).default(1)
  })
};

const updateSchema = {
  body: Joi.object({
    quantity: Joi.number().integer().min(1).required()
  })
};

// GET /api/cart
router.get('/', authenticate, async (req, res, next) => {
  try {
    const items = await cartModel.findByUserId(req.user.userId);
    const count = await cartModel.countByUserId(req.user.userId);
    res.json({ items, count });
  } catch (err) { next(err); }
});

// POST /api/cart/items
router.post('/items', authenticate, validate(addSchema), async (req, res, next) => {
  try {
    const result = await cartModel.addItem({
      userId: req.user.userId,
      productId: req.body.productId,
      quantity: req.body.quantity
    });
    if (!result) return next(new AppError(404, 'Product not found'));
    const items = await cartModel.findByUserId(req.user.userId);
    const count = await cartModel.countByUserId(req.user.userId);
    res.status(201).json({ items, count });
  } catch (err) { next(err); }
});

// PUT /api/cart/items/:id
router.put('/items/:id', authenticate, validate(updateSchema), async (req, res, next) => {
  try {
    const ok = await cartModel.updateItemForUser({
      id: req.params.id,
      userId: req.user.userId,
      quantity: req.body.quantity
    });
    if (!ok) return next(new AppError(404, 'Cart item not found'));
    const items = await cartModel.findByUserId(req.user.userId);
    const count = await cartModel.countByUserId(req.user.userId);
    res.json({ items, count });
  } catch (err) { next(err); }
});

// DELETE /api/cart/items/:id
router.delete('/items/:id', authenticate, async (req, res, next) => {
  try {
    const ok = await cartModel.removeItemForUser({ id: req.params.id, userId: req.user.userId });
    if (!ok) return next(new AppError(404, 'Cart item not found'));
    const items = await cartModel.findByUserId(req.user.userId);
    const count = await cartModel.countByUserId(req.user.userId);
    res.json({ items, count });
  } catch (err) { next(err); }
});

// DELETE /api/cart
router.delete('/', authenticate, async (req, res, next) => {
  try {
    await cartModel.clearByUserId(req.user.userId);
    res.json({ items: [], count: 0 });
  } catch (err) { next(err); }
});

module.exports = router;
