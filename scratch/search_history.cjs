const fs = require('fs');
const path = require('path');

const historyDir = path.join(process.env.APPDATA, 'Code', 'User', 'History');

function search(dir) {
    let results = [];
    if (!fs.existsSync(dir)) return results;
    const files = fs.readdirSync(dir);
    for (const f of files) {
        const fullPath = path.join(dir, f);
        const stat = fs.statSync(fullPath);
        if (stat.isDirectory()) {
            results = results.concat(search(fullPath));
        } else {
            try {
                const content = fs.readFileSync(fullPath, 'utf8');
                if (content.includes('APP_VERSION = \'1.6.0.2\'') || content.includes('Hub do Investidor <span')) {
                    results.push({ path: fullPath, time: stat.mtimeMs });
                }
            } catch(e) {}
        }
    }
    return results;
}

const matches = search(historyDir);
matches.sort((a,b) => b.time - a.time);
console.log('Matches found: ' + matches.length);
matches.slice(0, 10).forEach(m => console.log(m.path + ' - ' + new Date(m.time).toLocaleString()));
