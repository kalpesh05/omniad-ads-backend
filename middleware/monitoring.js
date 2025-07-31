const { logger } = require('./logging');

// Health check with detailed system info
const healthCheck = (req, res) => {
  const healthData = {
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV,
    version: process.env.npm_package_version || '1.0.0',
    memory: {
      used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + ' MB',
      total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024) + ' MB'
    },
    cpu: process.cpuUsage(),
    pid: process.pid
  };

  // Check database connection
  const { pool } = require('../config/database');
  pool.execute('SELECT 1')
    .then(() => {
      healthData.database = 'connected';
      res.status(200).json({
        success: true,
        data: healthData
      });
    })
    .catch((error) => {
      logger.error('Database health check failed', { error: error.message });
      healthData.database = 'disconnected';
      res.status(503).json({
        success: false,
        data: healthData
      });
    });
};

// Metrics collection middleware
const metricsCollector = (req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    
    // Log metrics (in production, you'd send this to monitoring service)
    logger.info('Request metrics', {
      method: req.method,
      route: req.route?.path || req.url,
      statusCode: res.statusCode,
      duration,
      contentLength: res.get('content-length') || 0,
      timestamp: new Date().toISOString()
    });
  });

  next();
};

module.exports = {
  healthCheck,
  metricsCollector
};