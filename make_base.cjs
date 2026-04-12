const fs = require('fs'); 
const data = fs.readFileSync('public/logo.png'); 
const b64 = 'data:image/png;base64,' + data.toString('base64'); 
fs.mkdirSync('src/utils', {recursive:true}); 
fs.writeFileSync('src/utils/logoBase64.js', 'export const logoBase64 = `' + b64 + '`;');
