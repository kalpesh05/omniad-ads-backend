/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function(knex) {
  // Create tables in order of dependencies (no FK issues)
  
  await knex.raw(`
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

  await knex.raw(`
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

  await knex.raw(`
    CREATE TABLE IF NOT EXISTS ads_tokens (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      platform VARCHAR(50) NOT NULL,         
      access_token TEXT NOT NULL,
      refresh_token TEXT,
      expiry_date TIMESTAMP NULL,                    
      token_type VARCHAR(50),               
      scope TEXT,                           
      last_refreshed TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY unique_user_platform (user_id, platform)
    )
  `);

  await knex.raw(`
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
      last_sync_at TIMESTAMP NULL,
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

  await knex.raw(`
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

  await knex.raw(`
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

  await knex.raw(`
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

  await knex.raw(`
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

  await knex.raw(`
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

  await knex.raw(`
    CREATE TABLE IF NOT EXISTS selected_properties (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      property_id VARCHAR(50) NOT NULL,  
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      UNIQUE KEY unique_selected_properties_per_user_platform_property (user_id, property_id)
    )
  `);

  await knex.raw(`
    CREATE TABLE IF NOT EXISTS teams (
      id VARCHAR(36) PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      slug VARCHAR(100) UNIQUE NOT NULL,
      owner_id INT,
      plan VARCHAR(20) DEFAULT 'free',
      settings JSON,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE SET NULL,
      INDEX idx_owner_id (owner_id)
    )
  `);

  await knex.raw(`
    CREATE TABLE IF NOT EXISTS team_members (
      id VARCHAR(36) PRIMARY KEY,
      team_id VARCHAR(36) NOT NULL,
      user_id INT NOT NULL,
      role ENUM('admin', 'manager', 'editor', 'viewer') DEFAULT 'viewer',
      invited_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      joined_at TIMESTAMP NULL,
      FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      UNIQUE KEY unique_team_user (team_id, user_id),
      INDEX idx_team_id (team_id),
      INDEX idx_user_id (user_id)
    )
  `);

  await knex.raw(`
    CREATE TABLE IF NOT EXISTS audit_logs (
      id VARCHAR(36) PRIMARY KEY,
      team_id VARCHAR(36) NOT NULL,
      user_id INT,
      action VARCHAR(100) NOT NULL,
      resource VARCHAR(50) NOT NULL,
      resource_id VARCHAR(100),
      resource_name VARCHAR(200),
      details JSON,
      ip_address VARCHAR(45),
      user_agent TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
      INDEX idx_audit_team (team_id, created_at DESC)
    )
  `);

  await knex.raw(`
    CREATE TABLE IF NOT EXISTS content_posts (
      id VARCHAR(36) PRIMARY KEY,
      team_id VARCHAR(36) NOT NULL,
      author_id INT NOT NULL,
      title VARCHAR(200) NOT NULL,
      content TEXT,
      platforms JSON,
      status ENUM('draft', 'scheduled', 'published', 'failed') DEFAULT 'draft',
      scheduled_for TIMESTAMP NULL,
      published_at TIMESTAMP NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE,
      FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE CASCADE,
      INDEX idx_content_team_status (team_id, status),
      INDEX idx_content_scheduled (scheduled_for)
    )
  `);

  await knex.raw(`
    CREATE TABLE IF NOT EXISTS content_media (
      id VARCHAR(36) PRIMARY KEY,
      post_id VARCHAR(36) NOT NULL,
      filename VARCHAR(255) NOT NULL,
      original_name VARCHAR(255) NOT NULL,
      mime_type VARCHAR(100) NOT NULL,
      size INT NOT NULL,
      url VARCHAR(500) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (post_id) REFERENCES content_posts(id) ON DELETE CASCADE
    )
  `);

  await knex.raw(`
    CREATE TABLE IF NOT EXISTS notifications (
      id VARCHAR(36) PRIMARY KEY,
      user_id INT NOT NULL,
      team_id VARCHAR(36),
      type VARCHAR(50) NOT NULL,
      title VARCHAR(150) NOT NULL,
      message TEXT,
      read_at TIMESTAMP NULL,
      action_url VARCHAR(255),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE,
      INDEX idx_user_unread (user_id, read_at)
    )
  `);

  await knex.raw(`
    CREATE TABLE IF NOT EXISTS inbox_messages (
      id VARCHAR(36) PRIMARY KEY,
      team_id VARCHAR(36) NOT NULL,
      platform VARCHAR(50) NOT NULL,
      external_id VARCHAR(100),
      sender_name VARCHAR(100),
      sender_avatar VARCHAR(255),
      message TEXT NOT NULL,
      status ENUM('unread', 'read', 'replied', 'archived') DEFAULT 'unread',
      received_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE,
      INDEX idx_inbox_team (team_id, status)
    )
  `);

  await knex.raw(`
    CREATE TABLE IF NOT EXISTS subscriptions (
      id VARCHAR(36) PRIMARY KEY,
      team_id VARCHAR(36) NOT NULL UNIQUE,
      plan_id VARCHAR(50) NOT NULL DEFAULT 'free',
      status ENUM('trialing', 'active', 'past_due', 'canceled', 'unpaid') DEFAULT 'trialing',
      stripe_customer_id VARCHAR(100),
      stripe_subscription_id VARCHAR(100),
      billing_interval ENUM('monthly', 'yearly') NULL,
      trial_ends_at TIMESTAMP NULL,
      current_period_end TIMESTAMP NULL,
      cancel_at_period_end BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE
    )
  `);

  await knex.raw(`
    CREATE TABLE IF NOT EXISTS team_settings (
      team_id VARCHAR(36) PRIMARY KEY,
      timezone VARCHAR(50) DEFAULT 'UTC',
      notification_preferences JSON,
      auto_publish BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE
    )
  `);
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function(knex) {
  // Drop tables in reverse order of dependencies (no FK blocks)
  
  await knex.raw('DROP TABLE IF EXISTS team_settings');
  await knex.raw('DROP TABLE IF EXISTS subscriptions');
  await knex.raw('DROP TABLE IF EXISTS inbox_messages');
  await knex.raw('DROP TABLE IF EXISTS notifications');
  await knex.raw('DROP TABLE IF EXISTS content_media');
  await knex.raw('DROP TABLE IF EXISTS content_posts');
  await knex.raw('DROP TABLE IF EXISTS audit_logs');
  await knex.raw('DROP TABLE IF EXISTS team_members');
  await knex.raw('DROP TABLE IF EXISTS teams');
  await knex.raw('DROP TABLE IF EXISTS selected_properties');
  await knex.raw('DROP TABLE IF EXISTS analytics');
  await knex.raw('DROP TABLE IF EXISTS ads_platforms');
  await knex.raw('DROP TABLE IF EXISTS ads_insights');
  await knex.raw('DROP TABLE IF EXISTS ads_creatives');
  await knex.raw('DROP TABLE IF EXISTS ads_campaigns');
  await knex.raw('DROP TABLE IF EXISTS connected_accounts');
  await knex.raw('DROP TABLE IF EXISTS ads_tokens');
  await knex.raw('DROP TABLE IF EXISTS refresh_tokens');
  await knex.raw('DROP TABLE IF EXISTS users');
};
