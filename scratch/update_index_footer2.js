const fs = require('fs');

function updateIndexFooterSafely() {
  const filePath = 'src/routes/index.tsx';
  let content = fs.readFileSync(filePath, 'utf8');

  // Replace hardcoded language logic with {t("footerDesc")} securely
  // We can just replace the exact text we added
  content = content.replace(
    'lang === "fr" \n                ? "LE FESTIVAL EST UN ÉVÉNEMENT CULTUREL DE RENOMMÉE INTERNATIONALE SUR LE SOL DE TANGER"\n                : lang === "es"\n                ? "EL FESTIVAL ES UN EVENTO CULTURAL DE RENOMBRE INTERNACIONAL EN LAS TIERRAS DE TÁNGER"\n                : "THE FESTIVAL IS AN INTERNATIONALLY RENOWNED CULTURAL EVENT IN THE LANDS OF TANGIER"',
    '{t("footerDesc")}'
  );
  
  // Replace Made by Claro
  content = content.replace(
    '<span>Made with love by <a href="https://clarodigi.com/" target="_blank" rel="noopener noreferrer" className="text-primary hover:text-primary/80 transition underline decoration-primary/50">Claro</a></span>',
    '<span>Made by <span className="font-bold">The Node Group</span></span>'
  );

  fs.writeFileSync(filePath, content);
}

updateIndexFooterSafely();
