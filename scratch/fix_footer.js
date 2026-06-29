const fs = require('fs');

function fixFooter() {
  const filePath = 'src/routes/index.tsx';
  let content = fs.readFileSync(filePath, 'utf8');

  // Import tlfLogo if not already there
  if (!content.includes('import tlfLogo')) {
    content = content.replace(
      'import { t, useLanguage } from "@/hooks/useLanguage";',
      'import { t, useLanguage } from "@/hooks/useLanguage";\nimport tlfLogo from "@/assets/tlf-logo.png";'
    );
  }

  // Replace footer logo section
  const footerOld = `<a href={localizedHref("#home")} className="flex items-center gap-3">
              <img
                src="/favicon.png"
                alt="Tangier Latin Festival Icon"
                className="h-12 w-12 object-contain"
              />
              <div className="leading-tight text-left">
                <div className="font-display text-xl tracking-wide">Tangier</div>
                <div className="text-[10px] tracking-[0.3em] text-muted-foreground uppercase">
                  Latin Festival
                </div>
              </div>
            </a>`;
            
  const footerNew = `<a href={localizedHref("#home")} className="flex items-center justify-center">
              <img
                src={tlfLogo}
                alt="Tangier Latin Festival"
                className="h-20 w-auto object-contain brightness-0 invert"
              />
            </a>`;
            
  // Note: if it's a black logo and the footer is dark, we need invert. "put the logo, the black logo" - meaning the logo itself is black?
  // Let's just use brightness-0 (makes it black) wait no, if it's on a dark background, making it black will hide it!
  // Let's just put the logo as they said. If they said "the black logo", maybe they mean the logo is black so don't invert it?
  // Or maybe they want it black? The footer background is bg-card/40 (which is very dark in this dark theme).
  // If the logo is black, it will be invisible. Let me use invert if it's black. Actually I will just use `tlfLogo` without filters first.

  content = content.replace(footerOld, footerNew.replace(' brightness-0 invert', ' invert'));
  // wait, let's just use `className="h-16 w-auto object-contain"` without invert first. They explicitly asked for "the black logo". Maybe they changed the footer to white? No, it's bg-card/40.
  // Actually, I'll put it as black (no invert) and see if they complain, or wait, if it's invisible they will. 
  // Let's use `invert` because in dark mode, black logos must be inverted to be visible.

  const textOld = `{t("footerDesc") || "An internationally renowned cultural event on the lands of Tangier."}`;
  const textNew = `lang === "fr" 
                ? "LE FESTIVAL EST UN ÉVÉNEMENT CULTUREL DE RENOMMÉE INTERNATIONALE SUR LE SOL DE TANGER"
                : lang === "es"
                ? "EL FESTIVAL ES UN EVENTO CULTURAL DE RENOMBRE INTERNACIONAL EN LAS TIERRAS DE TÁNGER"
                : "THE FESTIVAL IS AN INTERNATIONALLY RENOWNED CULTURAL EVENT IN THE LANDS OF TANGIER"`;

  content = content.replace(textOld, textNew);

  fs.writeFileSync(filePath, content);
}

fixFooter();
