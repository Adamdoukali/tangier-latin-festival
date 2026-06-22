const fs = require('fs');
const path = require('path');

const files = [
  'src/lib/translations.ts',
  'src/routes/tourism.tsx',
  'src/routes/redeem.tsx',
  'src/routes/packs.tsx'
];

for (const file of files) {
  const filePath = path.join(__dirname, '..', file);
  if (!fs.existsSync(filePath)) continue;
  let content = fs.readFileSync(filePath, 'utf8');

  // Update Year
  content = content.replace(/2026/g, '2027');

  // English dates
  content = content.replace(/January 22(–| - | — |-|—)26/gi, 'January 07–11');
  // French dates
  content = content.replace(/Du 22 au 26 janvier/gi, 'Du 07 au 11 janvier');
  content = content.replace(/22( – | - | — |–|—)26 Janvier/gi, '07–11 Janvier');
  // Spanish dates
  content = content.replace(/Del 22 al 26 de enero/gi, 'Del 07 al 11 de enero');
  content = content.replace(/22( – | - | — |–|—)26 de Enero/gi, '07–11 de Enero');

  // Specific tourism dates
  content = content.replace(/Dimanche · 25 Janvier/g, 'Dimanche · 10 Janvier');
  content = content.replace(/Domingo · 25 de Enero/g, 'Domingo · 10 de Enero');
  content = content.replace(/Sunday · January 25/g, 'Sunday · January 10');
  
  content = content.replace(/Samedi · 24 Janvier/g, 'Samedi · 9 Janvier');
  content = content.replace(/Sábado · 24 de Enero/g, 'Sábado · 9 de Enero');
  content = content.replace(/Saturday · January 24/g, 'Saturday · January 9');

  fs.writeFileSync(filePath, content, 'utf8');
}
console.log('Dates replaced successfully.');
