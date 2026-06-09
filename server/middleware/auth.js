const { verifyAccessToken } = require('../utils/token');
const AppError = require('../utils/AppError');

function authenticate(req, res, next) {
  let token = null;

  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1];
  }

  if (!token && req.cookies && req.cookies.access_token) {
    token = req.cookies.access_token;
  }

  if (!token) {
    return next(new AppError(401, 'Authentication required'));
  }

  try {
    const decoded = verifyAccessToken(token);
    req.user = { userId: decoded.userId, role: decoded.role };
    next();
  } catch (err) {
    next(new AppError(401, 'Invalid or expired token'));
  }
}

module.exports = authenticate;