const fs = require('fs');

const code = fs.readFileSync('src/pages/Dashboard.jsx', 'utf8');

// A very naive JSX tag checker
const lines = code.split('\n');
const stack = [];

for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Find all tags: <Tag> or </Tag> or <Tag/>
    const regex = /<(\/)?([a-zA-Z0-9_.-]+)[^>]*?(\/?)>/g;
    let match;
    while ((match = regex.exec(line)) !== null) {
        const isClosing = match[1] === '/';
        const tagName = match[2];
        const isSelfClosing = match[3] === '/';
        
        if (isSelfClosing) continue;
        
        // Ignore html self-closing tags
        if (['br', 'hr', 'img', 'input', 'path', 'stop', 'col'].includes(tagName.toLowerCase())) continue;
        
        if (isClosing) {
            if (stack.length > 0 && stack[stack.length - 1].name === tagName) {
                stack.pop();
            } else {
                console.log(`Mismatched closing tag at line ${i+1}: </${tagName}>. Expected </${stack.length > 0 ? stack[stack.length - 1].name : 'none'}>`);
            }
        } else {
            stack.push({ name: tagName, line: i+1 });
        }
    }
}

console.log("Unclosed tags remaining:");
for (const tag of stack) {
    console.log(`<${tag.name}> at line ${tag.line}`);
}
