// Global error handler
const errorHandler = (err, req, res, next) => {
  console.error('Error:', err);

  let statusCode = err.statusCode || 500;
  let code = err.code || 'INTERNAL_ERROR';
  let message = err.message || 'Internal Server Error';

  // Database connection errors
  if (err.code === 'PROTOCOL_CONNECTION_LOST' || err.code === 'ECONNREFUSED') {
    statusCode = 503;
    code = 'DATABASE_CONNECTION_ERROR';
    message = 'Database service unavailable';
  } else if (err.code === 'ER_ACCESS_DENIED_ERROR') {
    statusCode = 503;
    code = 'DATABASE_ACCESS_ERROR';
    message = 'Database access denied';
  } else if (err.code === 'ER_DUP_ENTRY') {
    statusCode = 409;
    code = 'DUPLICATE_ENTRY';
    message = 'Duplicate entry detected';
  } else if (err.code === 'ER_NO_SUCH_TABLE') {
    statusCode = 500;
    code = 'DATABASE_TABLE_ERROR';
    message = 'Database table not found';
  }

  // JWT errors
  if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    code = 'TOKEN_EXPIRED';
    message = 'Token expired';
  } else if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    code = 'INVALID_TOKEN';
    message = 'Invalid token';
  }

  // Validation errors
  if (err.name === 'ValidationError') {
    statusCode = 400;
    code = 'VALIDATION_ERROR';
  }

  // Cast errors
  if (err.name === 'CastError') {
    statusCode = 400;
    code = 'INVALID_ID';
    message = 'Invalid ID format';
  }

  if (process.env.NODE_ENV === 'production' && statusCode === 500) {
    message = 'Internal Server Error';
  }

  return res.status(statusCode).json({
    success: false,
    error: {
      code,
      message
    }
  });
};

// 404 handler
const notFoundHandler = (req, res) => {
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: `Route ${req.originalUrl} not found`
    }
  });
};

module.exports = {
  errorHandler,
  notFoundHandler
};