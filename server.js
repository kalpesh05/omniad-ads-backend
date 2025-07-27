const app = require('./app');
const { PORT } = require('./src/config/jwt');

const server = app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log('📝 Available endpoints:');
  console.log('  POST /api/auth/signup - User registration');
  console.log('  POST /api/auth/login - User login');
  console.log('  GET /api/user/profile - Get user profile');
  console.log('  PUT /api/user/profile - Update user profile');
  console.log('  POST /api/upload - File upload');
  console.log('  POST /api/user/profile-picture - Upload profile picture');
  console.log('  GET /api/admin/users - Get all users (admin only)');
  console.log('  DELETE /api/admin/users/:id - Delete user (admin/moderator)');
});

module.exports = server;
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
});
process.on('unhandledRejection', (error) => {
  console.error('Unhandled Rejection:', error);
});
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
  });
});
process.on('SIGINT', () => {
  console.log('SIGINT signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
  });
});
process.on('exit', (code) => {
  console.log(`Process exited with code: ${code}`);
});
process.on('beforeExit', (code) => {
  console.log(`Process beforeExit with code: ${code}`);
});
process.on('warning', (warning) => {
  console.warn('Warning:', warning.name, warning.message);
});
process.on('multipleResolves', (type, promise, reason) => {
  console.warn(`Multiple resolves detected: ${type}`, promise, reason);
});
process.on('rejectionHandled', (promise) => {
  console.warn('Rejection handled:', promise);
});
process.on('message', (message) => {
  console.log('Message from parent process:', message);
});
process.on('disconnect', () => {
  console.log('Disconnected from parent process');
});
process.on('listening', () => {
  console.log('Server is listening for requests');
});
process.on('close', () => {
  console.log('Server is closing');
});
process.on('error', (error) => {
  console.error('Server error:', error);
});
process.on('warning', (warning) => {
  console.warn('Warning:', warning.name, warning.message);
});
process.on('uncaughtExceptionMonitor', (error) => {
  console.error('Uncaught Exception Monitor:', error);
});
process.on('exit', (code) => {
  console.log(`Process exited with code: ${code}`);
});

