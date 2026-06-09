require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');
const path = require('path');

const env = require('./config/env');
const { testConnection } = require('./config/db');
const errorHandler = require('./middleware/errorHandler');
const { ensureRuntimeSchema } = require('./utils/schemaEnsure');

// Routes
const authRoutes = require('./routes/auth');
const productRoutes = require('./routes/products');
const platformRoutes = require('./routes/platforms');
const genreRoutes = require('./routes/genres');
const orderRoutes = require('./routes/orders');
const reviewRoutes = require('./routes/reviews');
const cartRoutes = require('./routes/cart');
const wishlistRoutes = require('./routes/wishlist');
const userRoutes = require('./routes/users');
const adminRoutes = require('./routes/admin');
const steamRoutes = require('./routes/steam');
const productKeyRoutes = require('./routes/productKeys');
const siteRoutes = require('./routes/site');
const paymentRoutes = require('./routes/payments');

async function start() {
  // Test DB connection
  try {
    await testConnection();
    await ensureRuntimeSchema();
    console.log('Database connected');
  } catch (err) {
    console.error('Database connection failed:', err.message);
    process.exit(1);
  }

  const app = express();
  app.disable('x-powered-by');

  // Security
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'", 'https://cdn.akamai.steamstatic.com'],
        scriptSrcAttr: ["'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
        fontSrc: ["'self'", 'https://fonts.gstatic.com'],
        imgSrc: ["'self'", 'data:', 'https:'],
        connectSrc: ["'self'"],
        frameSrc: ["'none'"],
        objectSrc: ["'none'"],
        baseUri: ["'self'"],
        formAction: ["'self'"]
      }
    }
  }));
  app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
    methods: ['GET','POST','PUT','DELETE','PATCH'],
    allowedHeaders: ['Content-Type','Authorization']
  }));

  // Rate limiting
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: parseInt(process.env.API_RATE_LIMIT_MAX, 10) || 2000,
    standardHeaders: true,
    legacyHeaders: false,
    message: { message: 'Too many requests. Please wait a moment and retry.' }
  });
  app.use('/api/', limiter);

  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: parseInt(process.env.AUTH_RATE_LIMIT_MAX, 10) || 20,
    standardHeaders: true,
    legacyHeaders: false,
    message: { message: 'Too many login attempts. Please retry later.' }
  });
  app.use('/api/auth/login', authLimiter);
  app.use('/api/auth/register', authLimiter);

  // Parsing
  app.use(express.json({ limit: '1mb' }));
  app.use(cookieParser());

  // Logging
  if (process.env.NODE_ENV !== 'production') {
    app.use(morgan('dev'));
  }

  // Static files
  app.use(express.static(path.join(__dirname, '..', 'public')));

  // API routes
  app.use('/api/auth', authRoutes);
  app.use('/api/products', productRoutes);
  app.use('/api/products/:productId', productKeyRoutes);
  app.use('/api/platforms', platformRoutes);
  app.use('/api/genres', genreRoutes);
  app.use('/api/orders', orderRoutes);
  app.use('/api/reviews', reviewRoutes);
  app.use('/api/cart', cartRoutes);
  app.use('/api/wishlist', wishlistRoutes);
  app.use('/api/users', userRoutes);
  app.use('/api/admin', adminRoutes);
  app.use('/api/steam', steamRoutes);
  app.use('/api/site', siteRoutes);
  app.use('/api/payments', paymentRoutes);

  // SPA fallback — serve index.html for all non-API routes
  app.get('*', (req, res) => {
    if (req.path.startsWith('/api/')) {
      return res.status(404).json({ message: 'API endpoint not found' });
    }
    // Serve admin.html for /admin routes
    if (req.path === '/admin' || req.path === '/admin.html') {
      return res.sendFile(path.join(__dirname, '..', 'public', 'admin.html'));
    }
    res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
  });

  // Error handler
  app.use(errorHandler);

  const PORT = env.port;
  app.listen(PORT, () => {
    console.log(`Keyro server running on http://localhost:${PORT}`);
    console.log(`Admin panel: http://localhost:${PORT}/admin.html`);
  });
}

start().catch(err => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
