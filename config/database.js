const knexConfig = require('../knexfile');
const env = process.env.NODE_ENV || 'development';
const knex = require('knex')(knexConfig[env] || knexConfig.development);
const prisma = require('./prisma');

// Provide a mock pool that redirects legacy raw SQL to Prisma ORM
const promisePool = {
  execute: async (query, params) => {
    const isSelect = query.trim().toUpperCase().startsWith('SELECT');
    try {
      if (isSelect) {
        let result;
        if (params && params.length > 0) {
          result = await prisma.$queryRawUnsafe(query, ...params);
        } else {
          result = await prisma.$queryRawUnsafe(query);
        }
        return [result, null]; // [rows, fields]
      } else {
        let result;
        if (params && params.length > 0) {
          result = await prisma.$executeRawUnsafe(query, ...params);
        } else {
          result = await prisma.$executeRawUnsafe(query);
        }
        // $executeRawUnsafe returns number of affected rows
        return [{ affectedRows: result }, null];
      }
    } catch (err) {
      console.error('[Prisma Proxy Error]', err);
      throw err;
    }
  },
  query: async (query, params) => {
    return promisePool.execute(query, params);
  },
  getConnection: async () => {
    return {
      release: () => {},
      query: async () => [[{ 1: 1 }]], // Keep-alive mock
      execute: promisePool.execute
    };
  }
};

const dbReady = Promise.resolve();

const testConnection = async () => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    console.log('✅ Database connected successfully via Prisma Proxy');
  } catch (error) {
    console.error('❌ Database connection failed via Prisma Proxy:', error.message);
    process.exit(1);
  }
};

const initializeDatabase = async () => {
  try {
    console.log('🔄 Running database migrations via Knex (Legacy Init)...');
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
