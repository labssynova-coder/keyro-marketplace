const required = [
  'DB_HOST', 'DB_PORT', 'DB_USER', 'DB_NAME',
  'JWT_SECRET', 'JWT_REFRESH_SECRET',
  'JWT_EXPIRES_IN', 'JWT_REFRESH_EXPIRES_IN'
];

const missing = required.filter(k => !process.env[k]);
if (missing.length) {
  throw new Error(`Missing env vars: ${missing.join(', ')}`);
}

module.exports = {
  port: parseInt(process.env.PORT, 10) || 3000,
  db: {
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT, 10),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME
  },
  jwt: {
    secret: process.env.JWT_SECRET,
    refreshSecret: process.env.JWT_REFRESH_SECRET,
    expiresIn: process.env.JWT_EXPIRES_IN,
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN
  },
  payment: {
    provider: process.env.PAYMENT_PROVIDER || 'custom',
    currency: process.env.PAYMENT_CURRENCY || 'eur',
    confirmSecret: process.env.PAYMENT_CONFIRM_SECRET || ''
  },
  frontendUrl: process.env.FRONTEND_URL || '',
  uploadDir: process.env.UPLOAD_DIR || 'public/img/products',
  maxFileSize: parseInt(process.env.MAX_FILE_SIZE, 10) || 5242880
};
