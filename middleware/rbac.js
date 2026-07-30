const AppError = require('../utils/AppError');

/**
 * Middleware to check if the authenticated user has one of the required roles.
 * Must be used AFTER authenticateToken middleware.
 * 
 * @param {Array<string>} allowedRoles - Array of roles that are allowed to access the route.
 *                                       e.g., ['admin', 'manager']
 */
const requireRole = (allowedRoles) => {
    return (req, res, next) => {
        if (!req.user) {
            return next(new AppError('User not authenticated', 401));
        }

        const userRole = req.user.role || 'viewer';

        if (!allowedRoles.includes(userRole)) {
            return next(new AppError(`Forbidden: Requires one of these roles: ${allowedRoles.join(', ')}`, 403));
        }

        next();
    };
};

module.exports = {
    requireRole
};
