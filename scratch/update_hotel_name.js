const fs = require('fs');

let trans = fs.readFileSync('src/lib/translations.ts', 'utf-8');

// Replace "Hotel Solazur" with "Hotel Kenzi Solazur"
trans = trans.replaceAll('Hotel Solazur', 'Hotel Kenzi Solazur');
trans = trans.replaceAll('Hôtel Solazur', 'Hôtel Kenzi Solazur');

fs.writeFileSync('src/lib/translations.ts', trans);
console.log('Done!');
