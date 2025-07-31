const app = require('./app');
const RefreshToken = require('./models/RefreshToken');
const { logger } = require('./middleware/logging');

const PORT = process.env.PORT || 3000;

// Cleanup expired refresh tokens periodically
const cleanupInterval = setInterval(async () => {
  try {
    await RefreshToken.cleanExpired();
    logger.info('🧹 Expired refresh tokens cleaned up');
  } catch (error) {
    logger.error('❌ Failed to clean up expired tokens:', { error: error.message });
  }
}, 60 * 60 * 1000); // Run every hour

// Graceful shutdown
const gracefulShutdown = (signal) => {
  logger.info(`📡 Received ${signal}. Starting graceful shutdown...`);
  
  // Clear cleanup interval
  clearInterval(cleanupInterval);
  
  // Close server
  server.close(() => {
    logger.info('🏁 Server closed');
    process.exit(0);
  });
};

// Start server
const server = app.listen(PORT, () => {
  const startupInfo = {
    port: PORT,
    environment: process.env.NODE_ENV || 'development',
    baseUrl: `http://localhost:${PORT}/api`,
    documentation: process.env.NODE_ENV !== 'production' ? `http://localhost:${PORT}/api-docs` : null,
    pid: process.pid
  };
  
  logger.info('🚀 Server started successfully', startupInfo);
  
  if (process.env.NODE_ENV !== 'production') {
    console.log(`\n🚀 Server running on port ${PORT}`);
    console.log(`📍 Environment: ${startupInfo.environment}`);
    console.log(`🌐 API Base URL: ${startupInfo.baseUrl}`);
    console.log(`📚 API Documentation: ${startupInfo.documentation}`);
    console.log('\n✨ Ready to accept connections!');
  }
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('❌ Uncaught Exception:', { error: error.message, stack: error.stack });
  process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.error('❌ Unhandled Rejection:', { reason, promise });
  process.exit(1);
});

// Handle graceful shutdown signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

module.exports = server;