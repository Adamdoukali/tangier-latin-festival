const fs = require('fs');
let content = fs.readFileSync('src/lib/translations.ts', 'utf-8');

// Replace exact strings
const replacements = [
  ['"8ème Édition · Maroc"', '"8ème Édition · Morocco"'],
  ['heroTitleSub: "Maroc"', 'heroTitleSub: "Morocco"'],
  ['"Tanger, Maroc"', '"Tanger, Morocco"'],
  ['"07–11 Janvier, 2027 · Tanger, Maroc"', '"07–11 Janvier, 2027 · Tanger, Morocco"'],
  ['"07–11 Janvier, 2027 · Hôtel Kenzi Solazur, Tanger, Maroc"', '"07–11 Janvier, 2027 · Hôtel Kenzi Solazur, Tanger, Morocco"'],
  ['tourismHeroTitlePart2: "Maroc"', 'tourismHeroTitlePart2: "Morocco"'],
  ['"8ª Edición · Marruecos"', '"8ª Edición · Morocco"'],
  ['heroTitleSub: "Marruecos"', 'heroTitleSub: "Morocco"'],
  ['"Tánger, Marruecos"', '"Tánger, Morocco"'],
  ['"07–11 Enero, 2027 · Tánger, Marruecos"', '"07–11 Enero, 2027 · Tánger, Morocco"'],
  ['"07–11 Enero, 2027 · Hotel Kenzi Solazur, Tánger, Marruecos"', '"07–11 Enero, 2027 · Hotel Kenzi Solazur, Tánger, Morocco"'],
  ['tourismHeroTitlePart2: "Marruecos"', 'tourismHeroTitlePart2: "Morocco"'],
];

for (const [from, to] of replacements) {
  content = content.replaceAll(from, to);
}

fs.writeFileSync('src/lib/translations.ts', content);
console.log('Done!');
