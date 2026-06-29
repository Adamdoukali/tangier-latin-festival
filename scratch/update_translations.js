const fs = require('fs');

function updateTranslations() {
  const filePath = 'src/lib/translations.ts';
  let content = fs.readFileSync(filePath, 'utf8');

  // English
  if (!content.includes('footerDesc: "THE FESTIVAL IS')) {
    content = content.replace(
      'footerDesc: "An internationally renowned',
      'footerDesc: "THE FESTIVAL IS AN INTERNATIONALLY RENOWNED CULTURAL EVENT IN THE LANDS OF TANGIER.",\n    oldFooterDesc: "An internationally renowned'
    );
  }

  // French
  if (!content.includes('footerDesc: "LE FESTIVAL EST')) {
    content = content.replace(
      'footerDesc: "Un événement culturel de renommée internationale',
      'footerDesc: "LE FESTIVAL EST UN ÉVÉNEMENT CULTUREL DE RENOMMÉE INTERNATIONALE SUR LE SOL DE TANGER",\n    oldFooterDesc: "Un événement culturel de renommée internationale'
    );
  }

  // Spanish
  if (!content.includes('footerDesc: "EL FESTIVAL ES')) {
    content = content.replace(
      'footerDesc: "Un evento cultural de renombre internacional',
      'footerDesc: "EL FESTIVAL ES UN EVENTO CULTURAL DE RENOMBRE INTERNACIONAL EN LAS TIERRAS DE TÁNGER",\n    oldFooterDesc: "Un evento cultural de renombre internacional'
    );
  }

  // Fallback in case old ones don't exist
  if (!content.includes('footerDesc: "THE FESTIVAL IS')) {
    content = content.replace(
      'footerCopyright: "All rights reserved.",',
      'footerCopyright: "All rights reserved.",\n    footerDesc: "THE FESTIVAL IS AN INTERNATIONALLY RENOWNED CULTURAL EVENT IN THE LANDS OF TANGIER",'
    );
  }
  if (!content.includes('footerDesc: "LE FESTIVAL EST')) {
    content = content.replace(
      'footerCopyright: "Tous droits réservés.",',
      'footerCopyright: "Tous droits réservés.",\n    footerDesc: "LE FESTIVAL EST UN ÉVÉNEMENT CULTUREL DE RENOMMÉE INTERNATIONALE SUR LE SOL DE TANGER",'
    );
  }
  if (!content.includes('footerDesc: "EL FESTIVAL ES')) {
    content = content.replace(
      'footerCopyright: "Todos los derechos reservados.",',
      'footerCopyright: "Todos los derechos reservados.",\n    footerDesc: "EL FESTIVAL ES UN EVENTO CULTURAL DE RENOMBRE INTERNACIONAL EN LAS TIERRAS DE TÁNGER",'
    );
  }

  fs.writeFileSync(filePath, content);
}

updateTranslations();
