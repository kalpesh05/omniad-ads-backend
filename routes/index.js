const express = require('express');
const { successResponse } = require('../utils/response');
const { healthCheck } = require('../middleware/monitoring');

const router = express.Router();

// Health check endpoint
router.get('/health', healthCheck);

// API info endpoint
router.get('/', (req, res) => {
  successResponse(res, {
    name: 'Express JWT Auth API',
    version: '1.0.0',
    description: 'Node.js Express API with MySQL, JWT authentication, and role-based authorization',
    endpoints: {
      auth: '/api/auth',
      users: '/api/users',
      health: '/api/health'
    }
  }, 'Welcome to the API');
});

module.exports = router;