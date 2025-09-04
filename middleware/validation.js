const { body, validationResult } = require('express-validator');

// Handle validation errors
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array().map(error => ({
        field: error.path,
        message: error.msg,
        value: error.value
      }))
    });
  }

  next();
};

// Registration validation rules
const validateRegistration = [
  body('username')
    .optional()
    .trim()
    .isLength({ min: 3, max: 50 })
    .withMessage('Username must be between 3 and 50 characters')
    .matches(/^[a-zA-Z0-9_-]+$/)
    .withMessage('Username can only contain letters, numbers, underscores, and hyphens'),

  body('email')
    .trim()
    .isEmail()
    .withMessage('Please provide a valid email address')
    .isLength({ max: 100 })
    .withMessage('Email must not exceed 100 characters')
    .normalizeEmail(),

  body('password')
    .isLength({ min: 8, max: 128 })
    .withMessage('Password must be between 8 and 128 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage('Password must contain at least one lowercase letter, one uppercase letter, one number, and one special character'),

  body('confirmPassword')
    .optional()
    .custom((value, { req }) => {
      if (value !== req.body.password) {
        throw new Error('Password confirmation does not match password');
      }
      return true;
    }),

  body('role')
    .optional()
    .isIn(['admin', 'user', 'moderator'])
    .withMessage('Role must be admin, user, or moderator'),

  handleValidationErrors
];

// Login validation rules
const validateLogin = [
  body('email')
    .trim()
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail(),

  body('password')
    .notEmpty()
    .withMessage('Password is required'),

  handleValidationErrors
];

// Update user validation rules
const validateUserUpdate = [
  body('username')
    .optional()
    .trim()
    .isLength({ min: 3, max: 50 })
    .withMessage('Username must be between 3 and 50 characters')
    .matches(/^[a-zA-Z0-9_-]+$/)
    .withMessage('Username can only contain letters, numbers, underscores, and hyphens'),

  body('email')
    .optional()
    .trim()
    .isEmail()
    .withMessage('Please provide a valid email address')
    .isLength({ max: 100 })
    .withMessage('Email must not exceed 100 characters')
    .normalizeEmail(),

  body('role')
    .optional()
    .isIn(['admin', 'user', 'moderator'])
    .withMessage('Role must be admin, user, or moderator'),

  body('is_active')
    .optional()
    .isBoolean()
    .withMessage('is_active must be a boolean value'),

  handleValidationErrors
];

// Change password validation rules
const validatePasswordChange = [
  body('currentPassword')
    .notEmpty()
    .withMessage('Current password is required'),

  body('newPassword')
    .isLength({ min: 8, max: 128 })
    .withMessage('New password must be between 8 and 128 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage('New password must contain at least one lowercase letter, one uppercase letter, one number, and one special character'),

  body('confirmNewPassword')
    .custom((value, { req }) => {
      if (value !== req.body.newPassword) {
        throw new Error('New password confirmation does not match new password');
      }
      return true;
    }),

  handleValidationErrors
];

// Ads: Create Campaign validation
const validateCreateCampaign = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Campaign name is required')
    .isLength({ max: 100 })
    .withMessage('Campaign name must not exceed 100 characters'),
  body('objective')
    .optional()
    .isString()
    .withMessage('Objective must be a string'),
  body('status')
    .optional()
    .isIn(['ACTIVE', 'PAUSED', 'ENABLED', 'DISABLED'])
    .withMessage('Invalid campaign status'),
  body('dailyBudget')
    .optional()
    .isNumeric()
    .withMessage('Daily budget must be a number'),
  body('lifetimeBudget')
    .optional()
    .isNumeric()
    .withMessage('Lifetime budget must be a number'),
  body('startDate')
    .optional()
    .isISO8601()
    .withMessage('Start date must be a valid date'),
  body('endDate')
    .optional()
    .isISO8601()
    .withMessage('End date must be a valid date'),
  handleValidationErrors
];

// Ads: Update Campaign validation
const validateUpdateCampaign = [
  body('name')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Campaign name must not exceed 100 characters'),
  body('status')
    .optional()
    .isIn(['ACTIVE', 'PAUSED', 'ENABLED', 'DISABLED'])
    .withMessage('Invalid campaign status'),
  body('dailyBudget')
    .optional()
    .isNumeric()
    .withMessage('Daily budget must be a number'),
  body('lifetimeBudget')
    .optional()
    .isNumeric()
    .withMessage('Lifetime budget must be a number'),
  handleValidationErrors
];

// Ads: Create AdSet validation
const validateCreateAdSet = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Ad set name is required')
    .isLength({ max: 100 })
    .withMessage('Ad set name must not exceed 100 characters'),
  body('status')
    .optional()
    .isString()
    .withMessage('Status must be a string'),
  body('dailyBudget')
    .optional()
    .isNumeric()
    .withMessage('Daily budget must be a number'),
  body('targeting')
    .optional()
    .isObject()
    .withMessage('Targeting must be an object'),
  body('optimizationGoal')
    .optional()
    .isString()
    .withMessage('Optimization goal must be a string'),
  handleValidationErrors
];

// Ads: Create Ad validation
const validateCreateAd = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Ad name is required')
    .isLength({ max: 100 })
    .withMessage('Ad name must not exceed 100 characters'),
  body('status')
    .optional()
    .isString()
    .withMessage('Status must be a string'),
  body('creativeId')
    .optional()
    .isString()
    .withMessage('Creative ID must be a string'),
  body('headlines')
    .optional()
    .isArray()
    .withMessage('Headlines must be an array of strings'),
  body('descriptions')
    .optional()
    .isArray()
    .withMessage('Descriptions must be an array of strings'),
  body('finalUrls')
    .optional()
    .isArray()
    .withMessage('Final URLs must be an array of strings'),
  handleValidationErrors
];

// Ads: Get Insights validation (for query params)
const validateGetInsights = [
  // You can add query validation here if needed
  handleValidationErrors
];

module.exports = {
  validateRegistration,
  validateLogin,
  validateUserUpdate,
  validatePasswordChange,
  handleValidationErrors,
  // Ads validations
  validateCreateCampaign,
  validateUpdateCampaign,
  validateCreateAdSet,
  validateCreateAd,
  validateGetInsights
};