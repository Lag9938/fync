const fs = require('fs');
const content = fs.readFileSync('src/pages/Dashboard.jsx', 'utf8');

let stack = [];
let line = 1;
let col = 1;
let inString = null; // ' " `
let inComment = null; // // /*
let inTemplateExpr = 0;

for (let i = 0; i < content.length; i++) {
    const char = content[i];
    const nextChar = content[i+1];
    
    if (char === '\n') {
        line++;
        col = 1;
        if (inComment === '//') inComment = null;
    } else {
        col++;
    }
    
    if (inComment) {
        if (inComment === '//') continue;
        if (inComment === '/*' && char === '*' && nextChar === '/') {
            inComment = null;
            i++;
        }
        continue;
    }
    
    if (inString === '`') {
        if (char === '\\') { i++; continue; }
        if (char === '$' && nextChar === '{') {
            inTemplateExpr++;
            i++;
            stack.push({ char: '${', line, col });
            continue;
        }
        if (char === '`') { inString = null; continue; }
        continue;
    }
    
    if (inString) {
        if (char === '\\') { i++; continue; }
        if (char === inString) inString = null;
        continue;
    }
    
    if (char === '/' && nextChar === '/') { inComment = '//'; i++; continue; }
    if (char === '/' && nextChar === '*') { inComment = '/*'; i++; continue; }
    
    if (char === "'" || char === '"' || char === '`') { inString = char; continue; }
    
    if (char === '{') stack.push({ char: '{', line, col });
    if (char === '}') {
        if (stack.length === 0) {
            console.log(`EXTRA } at line ${line}, col ${col}`);
        } else {
            const last = stack.pop();
            if (last.char === '${') inTemplateExpr--;
        }
    }
    if (char === '(') stack.push({ char: '(', line, col });
    if (char === ')') {
        if (stack.length === 0 || stack[stack.length-1].char !== '(') {
            console.log(`MISMATCHED ) at line ${line}, col ${col}`);
        } else {
            stack.pop();
        }
    }
}

if (stack.length > 0) {
    console.log(`UNCLOSED:`);
    stack.forEach(s => console.log(`${s.char} opened at line ${s.line}, col ${s.col}`));
} else {
    console.log('PERFECTLY BALANCED (with template expressions)');
}
