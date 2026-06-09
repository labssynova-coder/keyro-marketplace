const express = require('express');
const router = express.Router({ mergeParams: true });
const Joi = require('joi');
const authenticate = require('../middleware/auth');
const requireAdmin = require('../middleware/admin');
const validate = require('../middleware/validate');
const AppError = require('../utils/AppError');
const productKeyModel = require('../models/productKey');
const productModel = require('../models/product');

const addKeySchema = {
  body: Joi.object({
    keyValue: Joi.string().allow('', null),
    accountUsername: Joi.string().allow('', null),
    accountPassword: Joi.string().allow('', null)
  })
};

// GET /api/products/:productId/keys/count
router.get('/keys/count', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const productId = req.params.productId;
    const counts = await productKeyModel.countByProduct(productId);
    res.json(counts);
  } catch (err) { next(err); }
});

// GET /api/products/:productId/keys
router.get('/keys', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const productId = req.params.productId;
    const keys = await productKeyModel.findByProduct(productId);
    res.json(keys);
  } catch (err) { next(err); }
});

// POST /api/products/:productId/keys
router.post('/keys', authenticate, requireAdmin, validate(addKeySchema), async (req, res, next) => {
  try {
    const productId = req.params.productId;
    const product = await productModel.findById(productId);
    if (!product) return next(new AppError(404, 'Product not found'));

    const { keyValue, accountUsername, accountPassword } = req.body;
    if (product.delivery_type === 'key' && !keyValue) {
      return next(new AppError(422, 'keyValue is required for key delivery type'));
    }
    if (product.delivery_type === 'account' && (!accountUsername || !accountPassword)) {
      return next(new AppError(422, 'accountUsername and accountPassword are required for account delivery type'));
    }

    const id = await productKeyModel.create({ productId, keyValue, accountUsername, accountPassword });
    const key = await productKeyModel.findById(id);
    res.status(201).json(key);
  } catch (err) { next(err); }
});

// DELETE /api/products/:productId/keys/:keyId
router.delete('/keys/:keyId', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const deleted = await productKeyModel.remove(req.params.keyId);
    if (!deleted) return next(new AppError(400, 'Key not found or already assigned'));
    res.json({ message: 'Key deleted' });
  } catch (err) { next(err); }
});

module.exports = router;