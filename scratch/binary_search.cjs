const fs = require('fs');
const { parse } = require('@babel/parser');

const code = fs.readFileSync('src/pages/Dashboard.jsx', 'utf8');

// The main return statement starts around line 4485
const lines = code.split('\n');
const returnIndex = lines.findIndex(l => l.includes('return (') && l.includes('dashboard-layout'));

console.log("Return starts at line", returnIndex + 1);

// Let's binary search
let low = returnIndex;
let high = lines.length - 1;

while (low <= high) {
  let mid = Math.floor((low + high) / 2);
  let chunk = lines.slice(returnIndex, mid + 1).join('\n');
  
  // Try to parse the chunk by closing it with divs and closing the function
  let testCode = `
    import React from 'react';
    export default function Test() {
      ${chunk}
      </div></div></div></div></div></div>); }
  `;
  
  try {
    parse(testCode, { sourceType: 'module', plugins: ['jsx'] });
    // If it succeeds, the syntax error is AFTER mid
    low = mid + 1;
  } catch (e) {
    if (e.message.includes('Unterminated')) {
        // If it's unterminated, it means we cut it off, which is expected!
        // But what if it's a REAL syntax error?
        // Actually this binary search is flawed because we are artificially closing it.
    }
    // We can't really do it this way easily.
  }
}
