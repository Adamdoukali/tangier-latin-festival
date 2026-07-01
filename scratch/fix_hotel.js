const fs = require('fs');
let text = fs.readFileSync('src/routes/program.tsx', 'utf8');
text = text.replace(/"Hôtel Solazur"/g, '"Hôtel Kenzi Solazur"');
text = text.replace(/"Hotel Solazur"/g, '"Hotel Kenzi Solazur"');
fs.writeFileSync('src/routes/program.tsx', text);
console.log('Replaced all hotel names in program.tsx');
