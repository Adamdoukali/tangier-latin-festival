const fs = require('fs');

function revertStuff() {
  const filePath = 'src/routes/index.tsx';
  let content = fs.readFileSync(filePath, 'utf8');

  // Revert Discover our artists to EXACTLY how it was in f41727f
  content = content.replace(
    '{t("discoverArtists")} <span className="text-gold italic py-1 leading-normal inline-block">{t("lineupTitleHighlight")}</span>',
    'Discover our <span className="text-gold italic py-1 leading-normal inline-block">artists</span>'
  );

  // Revert Welcome to the
  content = content.replace(
    '{t("overviewWelcome")}{" "}',
    'Welcome to the{" "}'
  );

  // Remove The Node Group from footer
  content = content.replace(
    '<span>Made with love by <a href="https://clarodigi.com/" target="_blank" rel="noopener noreferrer" className="text-primary hover:text-primary/80 transition underline decoration-primary/50">Claro</a> & <span className="font-bold">The Node Group</span></span>',
    '<span>Made with love by <a href="https://clarodigi.com/" target="_blank" rel="noopener noreferrer" className="text-primary hover:text-primary/80 transition underline decoration-primary/50">Claro</a></span>'
  );

  fs.writeFileSync(filePath, content);
}

revertStuff();
