const fs = require('fs');
const content = fs.readFileSync('src/pages/Dashboard.jsx', 'utf8');
const openBrace = (content.match(/{/g) || []).length;
const closeBrace = (content.match(/}/g) || []).length;
const backticks = (content.match(/`/g) || []).length;
const singleQuotes = (content.match(/'/g) || []).length;
const doubleQuotes = (content.match(/"/g) || []).length;
const openParen = (content.match(/\(/g) || []).length;
const closeParen = (content.match(/\)/g) || []).length;

console.log(`Open Brace: ${openBrace}`);
console.log(`Close Brace: ${closeBrace}`);
console.log(`Backticks: ${backticks}`);
console.log(`Single Quotes: ${singleQuotes}`);
console.log(`Double Quotes: ${doubleQuotes}`);
console.log(`Open Paren: ${openParen}`);
console.log(`Close Paren: ${closeParen}`);

if (openBrace !== closeBrace) console.log('BRACE UNBALANCED!');
if (backticks % 2 !== 0) console.log('BACKTICK UNBALANCED!');
if (openParen !== closeParen) console.log('PAREN UNBALANCED!');
