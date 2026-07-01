const fs = require('fs');
let text = fs.readFileSync('src/lib/translations.ts', 'utf8');
text = text.replace(/l'Hôtel Solazur/g, "l'Hôtel Kenzi Solazur");
text = text.replace(/Hôtel Solazur/g, "Hôtel Kenzi Solazur");
text = text.replace(/Hotel Solazur/g, "Hotel Kenzi Solazur");
fs.writeFileSync('src/lib/translations.ts', text);
console.log('Replaced all hotel names in translations.ts');
