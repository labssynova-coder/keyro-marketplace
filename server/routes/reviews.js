const express = require('express');
const router = express.Router();
const Joi = require('joi');
const reviewModel = require('../models/review');
const authenticate = require('../middleware/auth');
const requireAdmin = require('../middleware/admin');
const validate = require('../middleware/validate');
const AppError = require('../utils/AppError');
const { parsePagination, buildPaginatedResponse } = require('../utils/pagination');

const createSchema = {
  body: Joi.object({
    rating: Joi.number().integer().min(1).max(5).required(),
    text: Joi.string().min(1).required()
  })
};

const updateSchema = {
  body: Joi.object({
    rating: Joi.number().integer().min(1).max(5),
    text: Joi.string().min(1)
  })
};

// GET /api/products/:productId/reviews
router.get('/products/:productId/reviews', async (req, res, next) => {
  try {
    const { limit, offset, page } = parsePagination(req.query);
    const reviews = await reviewModel.findByProductId(req.params.productId, { limit, offset });
    const total = await reviewModel.countByProductId(req.params.productId);
    res.json(buildPaginatedResponse(reviews, total, page, limit));
  } catch (err) { next(err); }
});

// GET /api/reviews — admin: all reviews
router.get('/', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const { limit, offset, page } = parsePagination(req.query);
    const reviews = await reviewModel.findAllAdmin({ limit, offset });
    const total = await reviewModel.countAll();
    res.json(buildPaginatedResponse(reviews, total, page, limit));
  } catch (err) { next(err); }
});

// POST /api/products/:productId/reviews
router.post('/products/:productId/reviews', authenticate, validate(createSchema), async (req, res, next) => {
  try {
    const id = await reviewModel.create({
      productId: req.params.productId,
      userId: req.user.userId,
      rating: req.body.rating,
      text: req.body.text
    });
    const review = await reviewModel.findById(id);
    res.status(201).json(review);
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') return next(new AppError(409, 'You already reviewed this product'));
    next(err);
  }
});

// PUT /api/reviews/:id
router.put('/:id', authenticate, validate(updateSchema), async (req, res, next) => {
  try {
    const review = await reviewModel.findById(req.params.id);
    if (!review) return next(new AppError(404, 'Review not found'));
    if (review.user_id !== req.user.userId && req.user.role !== 'admin') {
      return next(new AppError(403, 'Access denied'));
    }
    await reviewModel.update(req.params.id, req.body);
    const updated = await reviewModel.findById(req.params.id);
    res.json(updated);
  } catch (err) { next(err); }
});

// DELETE /api/reviews/:id
router.delete('/:id', authenticate, async (req, res, next) => {
  try {
    const review = await reviewModel.findById(req.params.id);
    if (!review) return next(new AppError(404, 'Review not found'));
    if (review.user_id !== req.user.userId && req.user.role !== 'admin') {
      return next(new AppError(403, 'Access denied'));
    }
    await reviewModel.remove(req.params.id);
    res.json({ message: 'Review deleted' });
  } catch (err) { next(err); }
});

// PUT /api/reviews/:id/approve — admin toggle
router.put('/:id/approve', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const review = await reviewModel.findById(req.params.id);
    if (!review) return next(new AppError(404, 'Review not found'));
    await reviewModel.setApproved(req.params.id, !review.is_approved);
    const updated = await reviewModel.findById(req.params.id);
    res.json(updated);
  } catch (err) { next(err); }
});

module.exports = router;