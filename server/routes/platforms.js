const express = require('express');
const router = express.Router();
const Joi = require('joi');
const platformModel = require('../models/platform');
const authenticate = require('../middleware/auth');
const requireAdmin = require('../middleware/admin');
const validate = require('../middleware/validate');
const AppError = require('../utils/AppError');

const schema = {
  body: Joi.object({
    name: Joi.string().min(1).max(50).required(),
    slug: Joi.string().min(1).max(50).required(),
    iconUrl: Joi.string().allow('', null),
    sortOrder: Joi.number().integer().default(0)
  })
};

const updateSchema = {
  body: Joi.object({
    name: Joi.string().min(1).max(50),
    slug: Joi.string().min(1).max(50),
    iconUrl: Joi.string().allow('', null),
    sortOrder: Joi.number().integer()
  })
};

router.get('/', async (req, res, next) => {
  try {
    const platforms = await platformModel.findAll();
    res.json(platforms);
  } catch (err) { next(err); }
});

router.get('/:id', async (req, res, next) => {
  try {
    const platform = await platformModel.findById(req.params.id);
    if (!platform) return next(new AppError(404, 'Platform not found'));
    res.json(platform);
  } catch (err) { next(err); }
});

router.post('/', authenticate, requireAdmin, validate(schema), async (req, res, next) => {
  try {
    const id = await platformModel.create(req.body);
    const platform = await platformModel.findById(id);
    res.status(201).json(platform);
  } catch (err) { next(err); }
});

router.put('/:id', authenticate, requireAdmin, validate(updateSchema), async (req, res, next) => {
  try {
    const existing = await platformModel.findById(req.params.id);
    if (!existing) return next(new AppError(404, 'Platform not found'));
    await platformModel.update(req.params.id, req.body);
    const platform = await platformModel.findById(req.params.id);
    res.json(platform);
  } catch (err) { next(err); }
});

router.delete('/:id', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const existing = await platformModel.findById(req.params.id);
    if (!existing) return next(new AppError(404, 'Platform not found'));
    await platformModel.remove(req.params.id);
    res.json({ message: 'Platform deleted' });
  } catch (err) { next(err); }
});

module.exports = router;