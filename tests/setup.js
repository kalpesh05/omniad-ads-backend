const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env.test') });
const prisma = require('../config/prisma');

beforeAll(async () => {
    // Make sure we are in the test environment before wiping data
    if (process.env.NODE_ENV !== 'test') {
        throw new Error('NOT IN TEST ENVIRONMENT');
    }
});

beforeEach(async () => {
    // Clean up the database before each test
    const tableNames = await prisma.$queryRaw`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'omniads_test'
    `;
    
    await prisma.$executeRawUnsafe('SET FOREIGN_KEY_CHECKS = 0;');
    for (const { table_name } of tableNames) {
        if (table_name !== '_prisma_migrations') {
            await prisma.$executeRawUnsafe(`TRUNCATE TABLE \`${table_name}\`;`);
        }
    }
    await prisma.$executeRawUnsafe('SET FOREIGN_KEY_CHECKS = 1;');
});

afterAll(async () => {
    await prisma.$disconnect();
});
