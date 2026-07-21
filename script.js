const fs = require('fs');
const file = 'controllers/ads/analyticsController.js';

let content = fs.readFileSync(file, 'utf8');

// Replace const db = require('../../config/database').pool; with const prisma = require('../../config/prisma');
content = content.replace(/const\s+db\s*=\s*require\('\.\.\/\.\.\/config\/database'\)\.pool;/, "const prisma = require('../../config/prisma');");

// Replace const [var] = await db.execute( -> const var = await prisma.(
content = content.replace(/const\s+\[(.*?)\]\s*=\s*await\s+db\.execute\(([\s\S]*?)\);/g, (match, varName, args) => {
    return "const " + varName + " = await prisma.(" + args.replace(/, \[/, ', ...[') + ");";
});

fs.writeFileSync(file, content);
console.log('Processed', file);
