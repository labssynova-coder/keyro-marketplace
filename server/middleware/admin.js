const AppError = require('../utils/AppError');

function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== 'admin') {
    return next(new AppError(403, 'Admin access required'));
  }
  next();
}

module.exports = requireAdmin;