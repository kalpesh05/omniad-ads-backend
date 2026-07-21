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
const adsAuthRoutes = require('./routes/adsAuth');
const adsRoutes = require('./routes/ads');
const aiRoutes = require('./routes/ai');
const reportsRoutes = require('./routes/reports');
const teamRoutes = require('./routes/teams');
const auditRoutes = require('./routes/audit');
const campaignRoutes = require('./routes/campaigns');
const analyticsRoutes = require('./routes/analytics');
const contentRoutes = require('./routes/content');
const notificationRoutes = require('./routes/notifications');
const inboxRoutes = require('./routes/inbox');
const settingsRoutes = require('./routes/settings');
const billingRoutes = require('./routes/billing');
const dashboardRoutes = require('./routes/dashboard');
const brandRoutes = require('./routes/brand');

// Import database
const { dbReady, testConnection, initializeDatabase } = require('./config/database');

const app = express();

// Setup Swagger documentation
swaggerSetup(app);

// Compression middleware
app.use(compression);

// Security middleware
app.use(securityHeaders);
app.use(cors({
  origin: process.env.NODE_ENV === 'production'
    ? ['https://omnilens.netlify.app']
    : ['http://localhost:3000', 'http://localhost:8080', 'http://localhost:8081', 'https://omnilens.netlify.app'],
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
app.use('/api/ads-auth', adsAuthRoutes);
app.use('/api/ads', adsRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/domains', require('./routes/domains'));
app.use('/api/integrations', require('./routes/integrations'));
app.use('/api/teams', teamRoutes);
const path = require('path');

// Serve static media files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Mount API routes
app.use('/api/audit-logs', auditRoutes);
app.use('/api/campaigns', campaignRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/content', contentRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/inbox', inboxRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/billing', billingRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/brand', brandRoutes);

// Error handling middleware
app.use(notFoundHandler);
app.use(errorHandler);

// Initialize database and start server
const initializeApp = async () => {
  try {
    // Ensure database exists before any DB operations
    await dbReady;

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