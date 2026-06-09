const express = require('express');
const router = express.Router();
const path = require('path');
const multer = require('multer');
const Joi = require('joi');
const productModel = require('../models/product');
const platformModel = require('../models/platform');
const genreModel = require('../models/genre');
const authenticate = require('../middleware/auth');
const requireAdmin = require('../middleware/admin');
const validate = require('../middleware/validate');
const AppError = require('../utils/AppError');
const { parsePagination, buildPaginatedResponse } = require('../utils/pagination');
const { downloadExternalImage } = require('../utils/downloadImage');
const env = require('../config/env');

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, '..', '..', env.uploadDir)),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${Date.now()}-${Math.random().toString(36).slice(2, 8)}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: env.maxFileSize },
  fileFilter: (req, file, cb) => {
    const allowed = ['.jpg', '.jpeg', '.png', '.webp'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) cb(null, true);
    else cb(new AppError(422, 'Only jpg, png, webp images allowed'));
  }
});

const createSchema = {
  body: Joi.object({
    name: Joi.string().min(2).max(255).required(),
    platformId: Joi.number().integer().required(),
    region: Joi.string().max(100).default('Global'),
    activation: Joi.string().max(255).required(),
    originalPrice: Joi.number().positive().required(),
    salePrice: Joi.number().positive().required(),
    discountPercent: Joi.number().integer().min(0).max(100).default(0),
    description: Joi.string().allow('', null),
    osReq: Joi.string().allow('', null),
    cpuReq: Joi.string().allow('', null),
    ramReq: Joi.string().allow('', null),
    gpuReq: Joi.string().allow('', null),
    stock: Joi.number().integer().min(0).default(100),
    deliveryType: Joi.string().valid('key', 'account').default('key'),
    genreIds: Joi.array().items(Joi.number().integer()).single().default([]),
    isActive: Joi.boolean().default(true),
    imageUrl: Joi.string().allow('', null)
  })
};

const updateSchema = {
  body: Joi.object({
    name: Joi.string().min(2).max(255),
    platformId: Joi.number().integer(),
    region: Joi.string().max(100),
    activation: Joi.string().max(255),
    originalPrice: Joi.number().positive(),
    salePrice: Joi.number().positive(),
    discountPercent: Joi.number().integer().min(0).max(100),
    description: Joi.string().allow('', null),
    osReq: Joi.string().allow('', null),
    cpuReq: Joi.string().allow('', null),
    ramReq: Joi.string().allow('', null),
    gpuReq: Joi.string().allow('', null),
    stock: Joi.number().integer().min(0),
    deliveryType: Joi.string().valid('key', 'account'),
    isActive: Joi.boolean(),
    genreIds: Joi.array().items(Joi.number().integer()).single(),
    imageUrl: Joi.string().allow('', null)
  })
};

// GET /api/products
router.get('/', async (req, res, next) => {
  try {
    const { search, platform, genre, minPrice, maxPrice, sort, order } = req.query;
    const { limit, offset, page } = parsePagination(req.query);

    let platformId = null;
    if (platform) {
      const plat = await platformModel.findBySlug(platform);
      if (plat) platformId = plat.id;
    }

    let genreId = null;
    if (genre) {
      const gen = await genreModel.findBySlug(genre);
      if (gen) genreId = gen.id;
    }

    const products = await productModel.findAll({
      search, platformId, genreId,
      minPrice: minPrice ? parseFloat(minPrice) : undefined,
      maxPrice: maxPrice ? parseFloat(maxPrice) : undefined,
      limit, offset,
      sortBy: sort || 'created_at',
      sortOrder: order || 'DESC'
    });

    const total = await productModel.count({ search, platformId, genreId });

    res.json(buildPaginatedResponse(products, total, page, limit));
  } catch (err) {
    next(err);
  }
});

// GET /api/products/:id
router.get('/:id', async (req, res, next) => {
  try {
    const product = await productModel.findById(req.params.id);
    if (!product) return next(new AppError(404, 'Product not found'));
    res.json(product);
  } catch (err) {
    next(err);
  }
});

// POST /api/products
router.post('/', authenticate, requireAdmin, upload.single('image'), validate(createSchema), async (req, res, next) => {
  try {
    let imageUrl = req.file ? `/img/products/${req.file.filename}` : (req.body.imageUrl || null);
    if (!req.file && imageUrl && imageUrl.startsWith('http')) {
      const localPath = await downloadExternalImage(imageUrl);
      if (localPath) imageUrl = localPath;
    }
    const id = await productModel.create({ ...req.body, imageUrl });
    const product = await productModel.findById(id);
    res.status(201).json(product);
  } catch (err) {
    next(err);
  }
});

// PUT /api/products/:id
router.put('/:id', authenticate, requireAdmin, upload.single('image'), validate(updateSchema), async (req, res, next) => {
  try {
    const existing = await productModel.findById(req.params.id);
    if (!existing) return next(new AppError(404, 'Product not found'));

    if (req.file) {
      req.body.imageUrl = `/img/products/${req.file.filename}`;
    } else if (req.body.imageUrl && req.body.imageUrl.startsWith('http')) {
      const localPath = await downloadExternalImage(req.body.imageUrl);
      if (localPath) req.body.imageUrl = localPath;
    }

    await productModel.update(req.params.id, req.body);
    const product = await productModel.findById(req.params.id);
    res.json(product);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/products/:id
router.delete('/:id', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const existing = await productModel.findById(req.params.id);
    if (!existing) return next(new AppError(404, 'Product not found'));
    await productModel.remove(req.params.id);
    res.json({ message: 'Product deactivated' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
