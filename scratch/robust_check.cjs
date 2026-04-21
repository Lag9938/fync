const fs = require('fs');
const content = fs.readFileSync('src/pages/Dashboard.jsx', 'utf8');
try {
    // This will only work if the file is valid JS (not JSX)
    // But we can check for basic syntax errors if we strip JSX or just try to parse
    // For now, let's just use a more robust balance check
    
    let stack = [];
    let line = 1;
    let col = 1;
    let inString = null; // ' " `
    let inComment = null; // // /*
    
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
        
        if (inString) {
            if (char === '\\') { i++; continue; }
            if (char === inString) inString = null;
            continue;
        }
        
        if (char === '/' && nextChar === '/') { inComment = '//'; i++; continue; }
        if (char === '/' && nextChar === '*') { inComment = '/*'; i++; continue; }
        
        if (char === "'" || char === '"' || char === '`') { inString = char; continue; }
        
        if (char === '{') stack.push({ char, line, col });
        if (char === '}') {
            if (stack.length === 0) {
                console.log(`EXTRA } at line ${line}, col ${col}`);
            } else {
                stack.pop();
            }
        }
        if (char === '(') stack.push({ char, line, col });
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
        console.log('PERFECTLY BALANCED (ignoring strings and comments)');
    }
    
} catch (err) {
    console.error(err);
}
