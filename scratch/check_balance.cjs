const fs = require('fs');
const lines = fs.readFileSync('src/pages/Dashboard.jsx', 'utf8').split('\n');
lines.forEach((line, i) => {
    const open = (line.match(/{/g) || []).length;
    const close = (line.match(/}/g) || []).length;
    if (open !== close) {
        // console.log(`Line ${i + 1}: Open=${open} Close=${close} -> ${line.trim()}`);
    }
});

let balance = 0;
lines.forEach((line, i) => {
    const open = (line.match(/{/g) || []).length;
    const close = (line.match(/}/g) || []).length;
    balance += (open - close);
    if (balance < 0) {
        console.log(`NEGATIVE BALANCE at line ${i + 1}: ${line.trim()}`);
        balance = 0; // Reset to find more
    }
});
console.log(`Final balance: ${balance}`);
