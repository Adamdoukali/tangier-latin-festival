const fs = require('fs');
let content = fs.readFileSync('src/lib/translations.ts', 'utf-8');

content = content.replace('8th Edition', '9th Edition');
content = content.replace('8th edition', '9th edition');
content = content.replace('8ème Édition', '9ème Édition');
content = content.replace('8ème édition', '9ème édition');
content = content.replace('8ª Edición', '9ª Edición');
content = content.replace('8ª edición', '9ª edición');

fs.writeFileSync('src/lib/translations.ts', content);
console.log('Done!');
