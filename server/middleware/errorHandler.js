function errorHandler(err, req, res, next) {
  let statusCode = 500;
  let message = 'Internal server error';

  if (err.isOperational) {
    statusCode = err.statusCode;
    message = err.message;
  } else if (err.isJoi) {
    statusCode = 422;
    message = err.details.map(d => d.message).join(', ');
  } else if (err.name === 'UnauthorizedError') {
    statusCode = 401;
    message = 'Invalid token';
  }

  if (statusCode === 500) {
    console.error('[ERROR]', err.stack || err.message);
  }

  res.status(statusCode).json({
    status: 'error',
    statusCode,
    message,
    ...(process.env.NODE_ENV !== 'production' && statusCode === 500 ? { stack: err.stack } : {})
  });
}

module.exports = errorHandler;