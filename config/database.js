const mysql = require('mysql2');
require('dotenv').config();
const knexConfig = require('../knexfile');
const env = process.env.NODE_ENV || 'development';
const knex = require('knex')(knexConfig[env] || knexConfig.development);

// Ensure database exists before creating pool
async function ensureDatabaseExists() {
  const dbName = process.env.DB_NAME || process.env.MYSQLDATABASE;
  if (!dbName) {
    throw new Error('DB_NAME or MYSQLDATABASE must be set in environment');
  }
  // Connect WITHOUT database - we can't connect to a DB that doesn't exist yet
  const connection = mysql.createConnection({
    host: process.env.DB_HOST || process.env.MYSQLHOST,
    port: process.env.DB_PORT || process.env.MYSQLPORT,
    user: process.env.DB_USER || process.env.MYSQLUSER,
    password: process.env.DB_PASSWORD || process.env.MYSQLPASSWORD,
  });
  return new Promise((resolve, reject) => {
    connection.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`, (err) => {
      if (err) {
        connection.destroy();
        return reject(err);
      }
      connection.destroy();
      resolve();
    });
  });
}

// Must complete before pool is used - creates DB if it doesn't exist
const dbReady = (async () => {
  try {
    await ensureDatabaseExists();
    // eslint-disable-next-line no-console
    console.log(`✅ Database "${process.env.DB_NAME || process.env.MYSQLDATABASE}" exists or was created`);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('❌ Failed to ensure database exists:', err.message);
    process.exit(1);
  }
})();

// Create connection pool for better performance
const pool = mysql.createPool({
  host: process.env.DB_HOST || process.env.MYSQLHOST,
  port: process.env.DB_PORT || process.env.MYSQLPORT,
  user: process.env.DB_USER || process.env.MYSQLUSER,
  password: process.env.DB_PASSWORD || process.env.MYSQLPASSWORD,
  database: process.env.DB_NAME || process.env.MYSQLDATABASE,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  connectTimeout: 60000,   // valid
});

// Get promise-based connection
const promisePool = pool.promise();

// Keep-alive ping every 5 minutes
setInterval(async () => {
  try {
    await promisePool.query('SELECT 1');
    // console.log('✅ MySQL keep-alive ping');
  } catch (err) {
    console.error('❌ MySQL keep-alive failed:', err.message);
  }
}, 5 * 60 * 1000);

// Pool error handling
pool.on('error', (err) => {
  console.error('❌ MySQL Pool Error:', err.code);
});

// Test database connection
const testConnection = async () => {
  try {
    const connection = await promisePool.getConnection();
    console.log('✅ Database connected successfully');
    connection.release();
  } catch (error) {
    console.error('❌ Database connection failed:', error.message, {
      host: process.env.DB_HOST || process.env.MYSQLHOST,
      port: process.env.DB_PORT || process.env.MYSQLPORT,
      user: process.env.DB_USER || process.env.MYSQLUSER,
      password: process.env.DB_PASSWORD || process.env.MYSQLPASSWORD,
      database: process.env.DB_NAME || process.env.MYSQLDATABASE,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      connectTimeout: 60000,   // valid
    });
    process.exit(1);
  }
};

// Initialize database tables via migrations
const initializeDatabase = async () => {
  try {
    console.log('🔄 Running database migrations via Knex...');
    await knex.migrate.latest();
    console.log('✅ Database migrations completed successfully');
  } catch (error) {
    console.error('❌ Database initialization / migration failed:', error.message);
    throw error;
  }
};

module.exports = {
  pool: promisePool,
  knex,
  dbReady,
  testConnection,
  initializeDatabase
};
