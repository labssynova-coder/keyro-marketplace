const express = require('express');
const router = express.Router();
const Joi = require('joi');
const wishlistModel = require('../models/wishlist');
const authenticate = require('../middleware/auth');
const validate = require('../middleware/validate');
const AppError = require('../utils/AppError');

const addSchema = {
  body: Joi.object({
    productId: Joi.number().integer().required()
  })
};

// GET /api/wishlist
router.get('/', authenticate, async (req, res, next) => {
  try {
    const items = await wishlistModel.findByUserId(req.user.userId);
    res.json(items);
  } catch (err) { next(err); }
});

// POST /api/wishlist/items
router.post('/items', authenticate, validate(addSchema), async (req, res, next) => {
  try {
    await wishlistModel.addItem({ userId: req.user.userId, productId: req.body.productId });
    const items = await wishlistModel.findByUserId(req.user.userId);
    res.status(201).json(items);
  } catch (err) { next(err); }
});

// DELETE /api/wishlist/items/:productId
router.delete('/items/:productId', authenticate, async (req, res, next) => {
  try {
    await wishlistModel.removeItem({ userId: req.user.userId, productId: req.params.productId });
    const items = await wishlistModel.findByUserId(req.user.userId);
    res.json(items);
  } catch (err) { next(err); }
});

module.exports = router;