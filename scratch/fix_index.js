const fs = require('fs');

function fixIndex() {
  const filePath = 'src/routes/index.tsx';
  let content = fs.readFileSync(filePath, 'utf8');

  // Fix Overview section
  content = content.replace(
    'Welcome to the{" "}',
    '{t("overviewWelcome")}{" "}'
  );
  content = content.replace(
    '<span className="text-gold italic">',
    '<span className="text-gold italic py-1 leading-normal block md:inline-block">'
  );

  // Fix Artists section
  content = content.replace(
    'Discover our <span className="text-gold italic">artists</span>',
    '{t("discoverArtists")} <span className="text-gold italic py-1 leading-normal inline-block">{t("lineupTitleHighlight")}</span>'
  );

  fs.writeFileSync(filePath, content);
}

function fixFooter() {
  const filePath = 'src/components/Footer.tsx';
  if (fs.existsSync(filePath)) {
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Add translations for footer description if not present
    // actually, let's just hardcode the translation inside Footer for now since they gave me the text, 
    // or I can check if useLanguage is available
    content = content.replace(
      'Tangier Latin Festival',
      '<img src="/logo.png" alt="Tangier Latin Festival" className="h-16 w-auto mb-4 invert" />'
    );
    
    // Wait, the user said "put the logo, the black logo". If the logo is black, maybe we don't invert it, or we invert it if it's on a dark footer. 
    // Usually the footer is dark, so a black logo might need invert. Let's look at Footer.tsx first to see its colors.
  }
}

fixIndex();
