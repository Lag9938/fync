const fs = require('fs');
const { parse } = require('@babel/parser');

const code = fs.readFileSync('src/pages/Dashboard.jsx', 'utf8');

// We will split the file by "const render" and try to parse each chunk as a standalone function
const lines = code.split('\n');
let currentFunc = [];
let funcName = 'TopLevel';

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  if (line.includes('const render') && line.includes(' = () => {')) {
    checkFunc(currentFunc.join('\n'), funcName);
    currentFunc = [];
    funcName = line.match(/const (render\w+)/)[1];
  }
  currentFunc.push(line);
}
checkFunc(currentFunc.join('\n'), funcName);

function checkFunc(funcCode, name) {
  // We wrap it in a component so Babel can parse it
  const wrapped = `
    import React from 'react';
    export default function Test() {
      ${funcCode}
      return null;
    }
  `;
  try {
    parse(wrapped, { sourceType: 'module', plugins: ['jsx'] });
  } catch (e) {
    console.error(`Syntax Error in section ${name}: ${e.message}`);
  }
}
