const fs = require('fs');

function updateIndexFooter() {
  const filePath = 'src/routes/index.tsx';
  let content = fs.readFileSync(filePath, 'utf8');

  // Replace hardcoded language logic with {t("footerDesc")}
  content = content.replace(
    /lang === "fr"[\s\S]*?IN THE LANDS OF TANGIER"/,
    '{t("footerDesc")}'
  );

  // Replace "Made with love by Claro" with "Made by The Node Group"
  content = content.replace(
    '<span>Made with love by <a href="https://clarodigi.com/" target="_blank" rel="noopener noreferrer" className="text-primary hover:text-primary/80 transition underline decoration-primary/50">Claro</a></span>',
    '<span>Made by <span className="font-bold">The Node Group</span></span>'
  );

  fs.writeFileSync(filePath, content);
}

updateIndexFooter();
