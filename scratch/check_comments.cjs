const fs = require('fs');
const content = fs.readFileSync('src/pages/Dashboard.jsx', 'utf8');
const openComment = (content.match(/\/\*/g) || []).length;
const closeComment = (content.match(/\*\//g) || []).length;
console.log(`Open Comment: ${openComment}`);
console.log(`Close Comment: ${closeComment}`);
if (openComment !== closeComment) console.log('COMMENT UNBALANCED!');
