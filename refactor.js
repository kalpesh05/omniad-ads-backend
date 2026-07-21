const fs = require('fs');
const { globSync } = require('glob');
const path = require('path');

const files = globSync('**/*.js', { ignore: ['node_modules/**', 'dist/**'] });

let modifiedCount = 0;

files.forEach(file => {
    let originalContent = fs.readFileSync(file, 'utf8');
    let content = originalContent;

    // Replace const prisma = require('/prisma'); (handling variable path depths)
    content = content.replace(/const\s+\{\s*pool\s*\}\s*=\s*require\('([^']+?)config\/database'\);/g, "const prisma = require('/prisma');");
    content = content.replace(/const\s+pool\s*=\s*require\('([^']+?)config\/database'\)\.pool;/g, "const prisma = require('/prisma');");

    // Replace const var = await prisma.(query, ...params) -> const var = await prisma.(query, ...params)
    content = content.replace(/const\s+\[(.*?)\]\s*=\s*await\s+pool\.execute\(([\s\S]*?)\);/g, (match, varName, argsText) => {
        let args = argsText.trim();
        let firstComma = args.indexOf(',');
        if (firstComma > -1 && args.slice(firstComma + 1).trim() !== '') {
            let queryPart = args.slice(0, firstComma);
            let paramsPart = args.slice(firstComma + 1).trim();
            return "const " + varName + " = await prisma.(" + queryPart + ", ..." + paramsPart + ");";
        } else {
            return "const " + varName + " = await prisma.(" + args + ");";
        }
    });

    // Replace wait pool.execute(query, params) -> wait prisma.(query, ...params)
    content = content.replace(/await\s+pool\.execute\(([\s\S]*?)\)(;)?/g, (match, argsText, semicolon) => {
        let args = argsText.trim();
        let semi = semicolon || '';
        let firstComma = args.indexOf(',');
        if (firstComma > -1 && args.slice(firstComma + 1).trim() !== '') {
            let queryPart = args.slice(0, firstComma);
            let paramsPart = args.slice(firstComma + 1).trim();
            return "await prisma.(" + queryPart + ", ..." + paramsPart + ")" + semi;
        } else {
            return "await prisma.(" + args + ")" + semi;
        }
    });

    if (content !== originalContent) {
        fs.writeFileSync(file, content);
        console.log('Processed', file);
        modifiedCount++;
    }
});
console.log('Total files modified:', modifiedCount);
