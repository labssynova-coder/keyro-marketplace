const express = require('express');
const router = express.Router();
const Joi = require('joi');
const userModel = require('../models/user');
const { hashPassword, verifyPassword } = require('../utils/hash');
const { signAccessToken, signRefreshToken, verifyRefreshToken } = require('../utils/token');
const AppError = require('../utils/AppError');
const authenticate = require('../middleware/auth');
const validate = require('../middleware/validate');
const { pool } = require('../config/db');

const registerSchema = {
  body: Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().min(8).required(),
    firstName: Joi.string().min(1).max(100).required(),
    lastName: Joi.string().min(1).max(100).required()
  })
};

const loginSchema = {
  body: Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().required()
  })
};

async function setRefreshCookie(res, token) {
  res.cookie('refreshToken', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60 * 1000
  });
}

async function storeRefreshToken(userId, token) {
  const crypto = require('crypto');
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  const decoded = verifyRefreshToken(token);
  await pool.query(
    'INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES (?, ?, FROM_UNIXTIME(?))',
    [userId, tokenHash, decoded.exp]
  );
}

async function deleteRefreshToken(token) {
  const crypto = require('crypto');
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  await pool.query('DELETE FROM refresh_tokens WHERE token_hash = ?', [tokenHash]);
}

// POST /api/auth/register
router.post('/register', validate(registerSchema), async (req, res, next) => {
  try {
    const { email, password, firstName, lastName } = req.body;

    const existing = await userModel.findByEmail(email);
    if (existing) return next(new AppError(409, 'Email already registered'));

    const passwordHash = await hashPassword(password);
    const userId = await userModel.create({ email, passwordHash, firstName, lastName });

    const payload = { userId, role: 'customer' };
    const accessToken = signAccessToken(payload);
    const refreshToken = signRefreshToken(payload);

    await storeRefreshToken(userId, refreshToken);
    setRefreshCookie(res, refreshToken);

    const user = await userModel.findById(userId);

    res.status(201).json({ accessToken, user });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/login
router.post('/login', validate(loginSchema), async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const user = await userModel.findByEmail(email);
    if (!user) return next(new AppError(401, 'Invalid credentials'));
    if (!user.is_active) return next(new AppError(403, 'Account deactivated'));

    const valid = await verifyPassword(password, user.password_hash);
    if (!valid) return next(new AppError(401, 'Invalid credentials'));

    const payload = { userId: user.id, role: user.role };
    const accessToken = signAccessToken(payload);
    const refreshToken = signRefreshToken(payload);

    await storeRefreshToken(user.id, refreshToken);
    setRefreshCookie(res, refreshToken);

    const safeUser = await userModel.findById(user.id);

    res.json({ accessToken, user: safeUser });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/refresh
router.post('/refresh', async (req, res, next) => {
  try {
    const token = req.cookies && req.cookies.refreshToken;
    if (!token) return next(new AppError(401, 'No refresh token'));

    const decoded = verifyRefreshToken(token);
    await deleteRefreshToken(token);

    const user = await userModel.findById(decoded.userId);
    if (!user || !user.is_active) return next(new AppError(401, 'Invalid user'));

    const payload = { userId: user.id, role: user.role };
    const accessToken = signAccessToken(payload);
    const refreshToken = signRefreshToken(payload);

    await storeRefreshToken(user.id, refreshToken);
    setRefreshCookie(res, refreshToken);

    res.json({ accessToken, user });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/logout
router.post('/logout', authenticate, async (req, res, next) => {
  try {
    const token = req.cookies && req.cookies.refreshToken;
    if (token) await deleteRefreshToken(token);
    res.clearCookie('refreshToken');
    res.json({ message: 'Logged out' });
  } catch (err) {
    next(err);
  }
});

// GET /api/auth/me
router.get('/me', authenticate, async (req, res, next) => {
  try {
    const user = await userModel.findById(req.user.userId);
    if (!user) return next(new AppError(404, 'User not found'));
    res.json(user);
  } catch (err) {
    next(err);
  }
});

module.exports = router;