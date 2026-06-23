const fs = require('fs');
const content = fs.readFileSync('C:\\\\Users\\\\Claro\\\\.gemini\\\\antigravity-ide\\\\brain\\\\cddf87ea-9b19-4aec-88fb-0ec6d9cb5557\\\\.system_generated\\\\steps\\\\34\\\\content.md', 'utf8');

const regex = /<h2 class=\"profile-title\">\s*(.*?)\s*<\/h2>/g;
let match;
console.log("ARTISTS FOUND:");
while ((match = regex.exec(content)) !== null) {
  console.log(match[1]);
}
