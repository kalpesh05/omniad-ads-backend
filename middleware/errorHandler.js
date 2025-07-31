const { errorResponse } = require('../utils/response');

// Global error handler
const errorHandler = (err, req, res, next) => {
  console.error('Error:', err);

  // Database connection errors
  if (err.code === 'PROTOCOL_CONNECTION_LOST') {
    return errorResponse(res, 'Database connection lost', 503);
  }

  if (err.code === 'ER_ACCESS_DENIED_ERROR') {
    return errorResponse(res, 'Database access denied', 503);
  }

  if (err.code === 'ECONNREFUSED') {
    return errorResponse(res, 'Database connection refused', 503);
  }

  // MySQL errors
  if (err.code === 'ER_DUP_ENTRY') {
    return errorResponse(res, 'Duplicate entry detected', 409);
  }

  if (err.code === 'ER_NO_SUCH_TABLE') {
    return errorResponse(res, 'Database table not found', 500);
  }

  // JWT errors
  if (err.name === 'TokenExpiredError') {
    return errorResponse(res, 'Token expired', 401);
  }

  if (err.name === 'JsonWebTokenError') {
    return errorResponse(res, 'Invalid token', 401);
  }

  // Validation errors
  if (err.name === 'ValidationError') {
    return errorResponse(res, err.message, 400);
  }

  // Cast errors (invalid ObjectId, etc.)
  if (err.name === 'CastError') {
    return errorResponse(res, 'Invalid ID format', 400);
  }

  // Default server error
  const statusCode = err.statusCode || 500;
  const message = process.env.NODE_ENV === 'production' 
    ? 'Internal Server Error' 
    : err.message || 'Internal Server Error';

  return errorResponse(res, message, statusCode);
};

// 404 handler
const notFoundHandler = (req, res) => {
  errorResponse(res, `Route ${req.originalUrl} not found`, 404);
};

module.exports = {
  errorHandler,
  notFoundHandler
};