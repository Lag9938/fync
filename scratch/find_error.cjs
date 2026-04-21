const fs = require('fs');

const code = fs.readFileSync('src/pages/Dashboard.jsx', 'utf8');

// Strip everything inside curly braces {} to remove JSX attributes that might contain tags like />
// We have to do this carefully.
let cleanCode = code;

// Very naive regex to find tags: <Tag ... > or </Tag>
// But wait, attributes can have `>` inside them like `<Tag attr={(a) => a > 2}>`!
// It's better to just use a real parser.

const { parse } = require('@babel/parser');

try {
  parse(code, {
    sourceType: 'module',
    plugins: ['jsx']
  });
  console.log("No syntax errors!");
} catch (e) {
  console.error("Syntax Error at:", e.loc);
  
  // Now let's binary search the file by returning null early in the main return statement!
}
