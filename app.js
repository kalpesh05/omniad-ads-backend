const express = require('express');
const cors = require('cors');
const compression = require('./middleware/compression');
const { logger, requestLogger } = require('./middleware/logging');
const { metricsCollector } = require('./middleware/monitoring');
const { apiVersioning } = require('./middleware/apiVersioning');
const { swaggerSetup } = require('./config/swagger');
const { connectRedis } = require('./config/redis');
require('dotenv').config();

// Import middleware
const { securityHeaders, generalLimiter, authLimiter, passwordLimiter } = require('./middleware/security');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');

// Import routes
const indexRoutes = require('./routes/index');
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const adsAuthRoutes = require('./routes/adsAuthRoutes');

// Import database
const { testConnection, initializeDatabase } = require('./config/database');

const app = express();

// Setup Swagger documentation
swaggerSetup(app);

// Compression middleware
app.use(compression);

// Security middleware
app.use(securityHeaders);
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://yourdomain.com'] 
    : ['http://localhost:3000', 'http://localhost:5173'],
  credentials: true
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging and monitoring
app.use(requestLogger);
app.use(metricsCollector);

// API versioning
app.use('/api', apiVersioning);

// Rate limiting
app.use('/api', generalLimiter);
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);
app.use('/api/auth/change-password', passwordLimiter);

// Routes
app.use('/api', indexRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/ads', adsAuthRoutes);

// Error handling middleware
app.use(notFoundHandler);
app.use(errorHandler);

// Initialize database and start server
const initializeApp = async () => {
  try {
    // Connect to Redis (optional)
    await connectRedis();
    
    // Test database connection
    await testConnection();
    
    // Initialize database tables
    await initializeDatabase();
    
    logger.info('✅ Application initialized successfully');
  } catch (error) {
    logger.error('❌ Application initialization failed:', { error: error.message });
    process.exit(1);
  }
};

// Initialize the application
initializeApp();

module.exports = app;