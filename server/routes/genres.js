const express = require('express');
const router = express.Router();
const Joi = require('joi');
const genreModel = require('../models/genre');
const authenticate = require('../middleware/auth');
const requireAdmin = require('../middleware/admin');
const validate = require('../middleware/validate');
const AppError = require('../utils/AppError');

const schema = {
  body: Joi.object({
    name: Joi.string().min(1).max(50).required(),
    slug: Joi.string().min(1).max(50).required()
  })
};

const updateSchema = {
  body: Joi.object({
    name: Joi.string().min(1).max(50),
    slug: Joi.string().min(1).max(50)
  })
};

router.get('/', async (req, res, next) => {
  try {
    const genres = await genreModel.findAll();
    res.json(genres);
  } catch (err) { next(err); }
});

router.get('/:id', async (req, res, next) => {
  try {
    const genre = await genreModel.findById(req.params.id);
    if (!genre) return next(new AppError(404, 'Genre not found'));
    res.json(genre);
  } catch (err) { next(err); }
});

router.post('/', authenticate, requireAdmin, validate(schema), async (req, res, next) => {
  try {
    const id = await genreModel.create(req.body);
    const genre = await genreModel.findById(id);
    res.status(201).json(genre);
  } catch (err) { next(err); }
});

router.put('/:id', authenticate, requireAdmin, validate(updateSchema), async (req, res, next) => {
  try {
    const existing = await genreModel.findById(req.params.id);
    if (!existing) return next(new AppError(404, 'Genre not found'));
    await genreModel.update(req.params.id, req.body);
    const genre = await genreModel.findById(req.params.id);
    res.json(genre);
  } catch (err) { next(err); }
});

router.delete('/:id', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const existing = await genreModel.findById(req.params.id);
    if (!existing) return next(new AppError(404, 'Genre not found'));
    await genreModel.remove(req.params.id);
    res.json({ message: 'Genre deleted' });
  } catch (err) { next(err); }
});

module.exports = router;