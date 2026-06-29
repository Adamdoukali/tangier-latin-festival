const fs = require('fs');

function fixPhoneAndPartners() {
  // 1. PackBookingModal.tsx
  let packModalPath = 'src/components/PackBookingModal.tsx';
  let packModal = fs.readFileSync(packModalPath, 'utf8');
  packModal = packModal.replace(
    /{flag} {c.dial_code.replace\('\+', ''\)} \({c.code}\)/g,
    '{flag} {c.dial_code} ({c.code})'
  );
  fs.writeFileSync(packModalPath, packModal);

  // 2. competition.tsx
  let competitionPath = 'src/routes/competition.tsx';
  let competition = fs.readFileSync(competitionPath, 'utf8');
  competition = competition.replace(
    /{flag} {c.dial_code.replace\('\+', ''\)} \({c.code}\)/g,
    '{flag} {c.dial_code} ({c.code})'
  );
  fs.writeFileSync(competitionPath, competition);

  // 3. tourism.tsx
  let tourismPath = 'src/routes/tourism.tsx';
  let tourism = fs.readFileSync(tourismPath, 'utf8');
  tourism = tourism.replace(
    /{flag} {c.dial_code.replace\('\+', ''\)} \({c.code}\)/g,
    '{flag} {c.dial_code} ({c.code})'
  );
  fs.writeFileSync(tourismPath, tourism);

  // 4. index.tsx
  let indexPath = 'src/routes/index.tsx';
  let indexContent = fs.readFileSync(indexPath, 'utf8');
  
  // A. Replace grayscale classes
  indexContent = indexContent.replace(/ grayscale hover:grayscale-0/g, '');
  
  // B. Add getFlagEmoji import if not there
  if (!indexContent.includes('getFlagEmoji')) {
    indexContent = indexContent.replace(
      /import { countries } from "@\/lib\/countries";/,
      'import { countries, getFlagEmoji } from "@/lib/countries";'
    );
  }
  
  // C. Update the select option in index.tsx
  // Find: {c.dial_code.replace('+', '')} ({c.code})
  // Replace with: {getFlagEmoji(c.code)} {c.dial_code} ({c.code})
  indexContent = indexContent.replace(
    /\{c\.dial_code\.replace\('\+', ''\)\} \(\{c\.code\}\)/g,
    '{getFlagEmoji(c.code)} {c.dial_code} ({c.code})'
  );
  // Also fix defaultValue if needed. Wait, defaultValue="+212" won't match if it's value={c.dial_code}?
  // The current value is value={c.dial_code}, so defaultValue="+212" is actually matching the value.
  // Wait, in tourism.tsx defaultValue is `{getFlagEmoji("MA")} +212`. If value is `{getFlagEmoji(c.code)} {c.dial_code}`.
  // Let's check what the value is in index.tsx.
  // Currently: <option key={c.code} value={c.dial_code}>
  // This means defaultValue="+212" matches value="+212".
  // If I change value to `{getFlagEmoji(c.code)} {c.dial_code}`, I MUST change defaultValue to match it!
  // Wait, in index.tsx it's:
  // value={c.dial_code}
  // Let's keep value={c.dial_code}! In the other files:
  // value={`${flag} ${c.dial_code}`}
  // Which is technically sending the flag in the form submission! That's what the user did.
  // So I'll change index.tsx to:
  // value={`${getFlagEmoji(c.code)} ${c.dial_code}`}
  // and defaultValue={`${getFlagEmoji("MA")} +212`}
  
  indexContent = indexContent.replace(
    /value=\{c\.dial_code\}/g,
    'value={`${getFlagEmoji(c.code)} ${c.dial_code}`}'
  );
  
  indexContent = indexContent.replace(
    /defaultValue="\+212"/g,
    'defaultValue={`${getFlagEmoji("MA")} +212`}'
  );

  fs.writeFileSync(indexPath, indexContent);
}

fixPhoneAndPartners();
