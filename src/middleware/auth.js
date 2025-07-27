const { verifyToken, sendError } = require('../utils/helpers');
const { HTTP_STATUS, ROLES } = require('../utils/constants');
const database = require('../config/database');

const authenticateToken = (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return sendError(res, HTTP_STATUS.UNAUTHORIZED, 'Access token required');
    }

    const decoded = verifyToken(token);
    const user = database.findUserById(decoded.id);
    
    if (!user) {
      return sendError(res, HTTP_STATUS.UNAUTHORIZED, 'User not found');
    }

    req.user = decoded;
    next();
  } catch (error) {
    return sendError(res, HTTP_STATUS.FORBIDDEN, 'Invalid or expired token');
  }
};

const authorizeRoles = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return sendError(res, HTTP_STATUS.UNAUTHORIZED, 'Authentication required');
    }

    if (!roles.includes(req.user.role)) {
      return sendError(res, HTTP_STATUS.FORBIDDEN, 'Insufficient permissions');
    }

    next();
  };
};

module.exports = {
  authenticateToken,
  authorizeRoles
};
