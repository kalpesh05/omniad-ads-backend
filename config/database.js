const mysql = require('mysql2');
require('dotenv').config();

// Ensure database exists before creating pool
async function ensureDatabaseExists() {
  const connection = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT
    // Do NOT specify database here
  });
  const dbName = process.env.DB_NAME;
  return new Promise((resolve, reject) => {
    connection.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`, (err) => {
      connection.end();
      if (err) return reject(err);
      resolve();
    });
  });
}

// Call ensureDatabaseExists before pool creation
(async () => {
  try {
    await ensureDatabaseExists();
    // eslint-disable-next-line no-console
    console.log(`✅ Database "${process.env.DB_NAME}" exists or was created`);
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
  connectTimeout: 60000,   // instead of timeout
  acquireTimeout: 60000,
});

// Get promise-based connection
const promisePool = pool.promise();

// Test database connection
const testConnection = async () => {
  try {
    const connection = await promisePool.getConnection();
    console.log('✅ Database connected successfully');
    connection.release();
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    process.exit(1);
  }
};

// Initialize database tables
const initializeDatabase = async () => {
  try {
    // Create users table
    await promisePool.execute(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(50) UNIQUE NOT NULL,
        email VARCHAR(100) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        role ENUM('admin', 'user', 'moderator') DEFAULT 'user',
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_email (email),
        INDEX idx_username (username),
        INDEX idx_role (role)
      )
    `);

    // Create refresh_tokens table
    await promisePool.execute(`
      CREATE TABLE IF NOT EXISTS refresh_tokens (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        token VARCHAR(500) NOT NULL,
        type ENUM('access', 'refresh') DEFAULT 'access',
        expires_at TIMESTAMP NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        INDEX idx_user_id (user_id),
        INDEX idx_token (token(255))
      )
    `);
    // Create ads_tokens table
    await promisePool.execute(`
      CREATE TABLE IF NOT EXISTS ads_tokens (
          id INT AUTO_INCREMENT PRIMARY KEY,
          user_id INT NOT NULL,
          platform VARCHAR(50) NOT NULL,         
          access_token TEXT NOT NULL,
          refresh_token TEXT,
          expiry_date TIMESTAMP ,                    
          token_type VARCHAR(50),               
          scope TEXT,                           
          last_refreshed TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

          UNIQUE KEY unique_user_platform (user_id, platform)
      )`);

    // Create connected_accounts table
    await promisePool.execute(`
      CREATE TABLE IF NOT EXISTS connected_accounts (
        id INT AUTO_INCREMENT PRIMARY KEY,
        token_id INT NOT NULL,
        account_id VARCHAR(255) NOT NULL,
        account_name VARCHAR(255) NOT NULL,
        platform VARCHAR(50) NOT NULL,
        account_type ENUM('personal', 'business', 'agency') DEFAULT 'business',
        permissions JSON,
        account_owner_name VARCHAR(255),
        account_owner_email VARCHAR(255),
        timezone VARCHAR(50) DEFAULT 'UTC',
        country_code VARCHAR(5),
        currency VARCHAR(10),
        billing_currency VARCHAR(10),
        status VARCHAR(50),
        is_active BOOLEAN DEFAULT true,
        sync_enabled BOOLEAN DEFAULT true,
        last_sync_at TIMESTAMP,
        sync_frequency ENUM('hourly', 'daily', 'weekly') DEFAULT 'daily',
        metadata JSON,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (token_id) REFERENCES ads_tokens(id) ON DELETE CASCADE,
        UNIQUE KEY unique_account_per_token (token_id, account_id),
        INDEX idx_platform (platform),
        INDEX idx_sync_enabled (sync_enabled),
        INDEX idx_last_sync_at (last_sync_at)
      )
    `);
    // Create ads_campaigns table
    await promisePool.execute(`
      CREATE TABLE IF NOT EXISTS ads_campaigns (  
        id INT AUTO_INCREMENT PRIMARY KEY,
        account_id INT NOT NULL,
        campaign_id VARCHAR(255) NOT NULL,  
        campaign_name VARCHAR(255) NOT NULL,
        status VARCHAR(50),
        objective VARCHAR(100), 
        budget DECIMAL(10, 2),
        start_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        end_date  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (account_id) REFERENCES connected_accounts(id) ON DELETE CASCADE,         
        UNIQUE KEY unique_campaign_per_account (account_id, campaign_id)
      )
    `);
    // Create ads_creatives table
    await promisePool.execute(`
      CREATE TABLE IF NOT EXISTS ads_creatives (  
        id INT AUTO_INCREMENT PRIMARY KEY,
        campaign_id INT NOT NULL,
        creative_id VARCHAR(255) NOT NULL,  
        creative_name VARCHAR(255) NOT NULL,  
        type ENUM('image', 'video', 'carousel') NOT NULL,
        status VARCHAR(50),
        content TEXT, 
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (campaign_id) REFERENCES ads_campaigns(id) ON DELETE CASCADE,         
        UNIQUE KEY unique_creative_per_campaign (campaign_id, creative_id)
      )
    `);
    // Create ads_insights table
    await promisePool.execute(`
      CREATE TABLE IF NOT EXISTS ads_insights (
        id INT AUTO_INCREMENT PRIMARY KEY,
        campaign_id INT NOT NULL,
        date DATE NOT NULL,
        impressions INT DEFAULT 0,  
        clicks INT DEFAULT 0,
        spend DECIMAL(10, 2) DEFAULT 0.00,
        conversions INT DEFAULT 0,
        revenue DECIMAL(10, 2) DEFAULT 0.00,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP, 
        FOREIGN KEY (campaign_id) REFERENCES ads_campaigns(id) ON DELETE CASCADE,
        UNIQUE KEY unique_insight_per_campaign_date (campaign_id, date)
      )
    `);
    // Create ads_platforms table
    await promisePool.execute(`
      CREATE TABLE IF NOT EXISTS ads_platforms (
        id INT AUTO_INCREMENT PRIMARY KEY,
        platform_name VARCHAR(50) NOT NULL UNIQUE,
        api_url VARCHAR(255) NOT NULL,
        auth_url VARCHAR(255) NOT NULL,
        token_url VARCHAR(255) NOT NULL,
        client_id VARCHAR(255) NOT NULL,  
        client_secret VARCHAR(255) NOT NULL,
        redirect_uri VARCHAR(255) NOT NULL,
        scopes TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_platform_name (platform_name) 
      )
    `);
    // Ceate analytics table
    await promisePool.execute(`
      CREATE TABLE IF NOT EXISTS analytics (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        platform VARCHAR(50) NOT NULL,
        metric VARCHAR(50) NOT NULL,  
        value DECIMAL(10, 2) NOT NULL,
        date DATE NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (platform) REFERENCES ads_platforms(platform_name) ON DELETE CASCADE,
        UNIQUE KEY unique_analytics_per_user_platform_metric_date (user_id, platform, metric, date)
      )
    `);
    // eslint-disable-next-line no-console
    console.log('�� Database tables created successfully');

    console.log('✅ Database tables initialized successfully');
  } catch (error) {
    console.error('❌ Database initialization failed:', error.message);
    throw error;
  }
};

module.exports = {
  pool: promisePool,
  testConnection,
  initializeDatabase
};