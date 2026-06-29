const fs = require('fs');

// 1. Update translations.ts
let trans = fs.readFileSync('src/lib/translations.ts', 'utf-8');

// Add overviewTitlePrefix
trans = trans.replace(
  'overviewTitle: "Welcome to the Tangier International Latin Festival",',
  'overviewTitlePrefix: "Welcome to the",\n    overviewTitle: "Welcome to the Tangier International Latin Festival",'
);
trans = trans.replace(
  'overviewTitle: "Bienvenue au Tangier International Latin Festival",',
  'overviewTitlePrefix: "Bienvenue au",\n    overviewTitle: "Bienvenue au Tangier International Latin Festival",'
);
trans = trans.replace(
  'overviewTitle: "Bienvenido al Festival Internacional Latino de Tánger",',
  'overviewTitlePrefix: "Bienvenido al",\n    overviewTitle: "Bienvenido al Festival Internacional Latino de Tánger",'
);

// Add lineupTitlePrefix and lineupTitleHighlight
trans = trans.replace(
  'lineupTitle: "Discover our artists",',
  'lineupTitlePrefix: "Discover our ",\n    lineupTitleHighlight: "artists",\n    lineupTitle: "Discover our artists",'
);
trans = trans.replace(
  'lineupTitle: "Découvrez nos artistes",',
  'lineupTitlePrefix: "Découvrez nos ",\n    lineupTitleHighlight: "artistes",\n    lineupTitle: "Découvrez nos artistes",'
);
trans = trans.replace(
  'lineupTitle: "Descubre a nuestros artistas",',
  'lineupTitlePrefix: "Descubre a nuestros ",\n    lineupTitleHighlight: "artistas",\n    lineupTitle: "Descubre a nuestros artistas",'
);

fs.writeFileSync('src/lib/translations.ts', trans);

// 2. Update index.tsx
let idx = fs.readFileSync('src/routes/index.tsx', 'utf-8');

// Salsa Bachata text
idx = idx.replace(
  'className="mt-6 text-primary tracking-[0.4em] text-xs uppercase"',
  'className="mt-6 text-white font-medium drop-shadow-md tracking-[0.4em] text-sm md:text-base uppercase"'
);

// Dates & location
idx = idx.replace(
  'className="mt-10 flex flex-wrap justify-center gap-x-10 gap-y-3 text-sm tracking-[0.25em] uppercase text-white/80"',
  'className="mt-10 flex flex-wrap justify-center gap-x-10 gap-y-3 text-base md:text-lg font-semibold tracking-[0.25em] uppercase text-white drop-shadow-sm"'
);

// bo/con bigger (Buttons in hero)
idx = idx.replace(
  'className="group relative flex items-center justify-center h-20 w-20',
  'className="group relative flex items-center justify-center h-24 w-24 md:h-28 md:w-28'
);
idx = idx.replace(
  'className="h-8 w-8 text-white',
  'className="h-10 w-10 md:h-12 md:w-12 text-white'
);

idx = idx.replace(
  'px-7 py-3.5 text-sm font-medium',
  'px-8 py-4 text-base font-bold'
);


// Overview
idx = idx.replace(
  'className="text-xs tracking-[0.4em] uppercase text-primary mb-4"',
  'className="text-sm md:text-base font-display tracking-[0.4em] uppercase text-primary mb-4"'
);
idx = idx.replace(
  'Welcome to the{" "}',
  '{t("overviewTitlePrefix")}{" "}'
);

// Artists
idx = idx.replace(
  'className="text-xs tracking-[0.4em] uppercase text-primary mb-3"',
  'className="text-sm md:text-base font-display tracking-[0.4em] uppercase text-primary mb-4"'
);
idx = idx.replace(
  'Discover our <span className="text-gold italic">artists</span>',
  '{t("lineupTitlePrefix")}<span className="text-gold italic">{t("lineupTitleHighlight")}</span>'
);
idx = idx.replaceAll(
  'className="h-full w-full object-cover',
  'className="h-full w-full object-cover object-top'
);

// Programme
idx = idx.replace(
  '<p className="text-xs tracking-[0.4em] uppercase text-primary mb-3">\\n              {t("programmeSubtitle")}',
  '<p className="text-sm md:text-base font-display tracking-[0.4em] uppercase text-primary mb-4">\\n              {t("programmeSubtitle")}'
);
idx = idx.replace(
  '<h2 className="font-display text-4xl md:text-5xl">{t("programmeTitle")}</h2>',
  '<h2 className="font-display text-5xl md:text-6xl">{t("programmeTitle")}</h2>'
);

// Packs
idx = idx.replace(
  '<p className="text-xs tracking-[0.4em] uppercase text-primary mb-3">\\n              {t("packsSubtitle")}',
  '<p className="text-sm md:text-base font-display tracking-[0.4em] uppercase text-primary mb-4">\\n              {t("packsSubtitle")}'
);
idx = idx.replace(
  '<h2 className="font-display text-4xl md:text-5xl">{t("packsTitle")}</h2>',
  '<h2 className="font-display text-5xl md:text-6xl">{t("packsTitle")}</h2>'
);

// Partners
idx = idx.replace(
  '<p className="text-xs tracking-[0.4em] uppercase text-primary mb-3">\\n              {t("partnersSubtitle")}',
  '<p className="text-sm md:text-base font-display tracking-[0.4em] uppercase text-primary mb-4">\\n              {t("partnersSubtitle")}'
);
idx = idx.replace(
  '<h2 className="font-display text-4xl md:text-5xl">{t("partnersTitle")}</h2>',
  '<h2 className="font-display text-5xl md:text-6xl">{t("partnersTitle")}</h2>'
);

// Gallery
idx = idx.replace(
  '<p className="text-xs tracking-[0.4em] uppercase text-primary mb-3">\\n              {t("gallerySubtitle")}',
  '<p className="text-sm md:text-base font-display tracking-[0.4em] uppercase text-primary mb-4">\\n              {t("gallerySubtitle")}'
);
idx = idx.replace(
  '<h2 className="font-display text-4xl md:text-5xl">{t("galleryTitle")}</h2>',
  '<h2 className="font-display text-5xl md:text-6xl">{t("galleryTitle")}</h2>'
);

// Testimonials
idx = idx.replace(
  '<p className="text-xs tracking-[0.4em] uppercase text-primary mb-3">\\n              {t("testimonialsSubtitle")}',
  '<p className="text-sm md:text-base font-display tracking-[0.4em] uppercase text-primary mb-4">\\n              {t("testimonialsSubtitle")}'
);
idx = idx.replace(
  '<h2 className="font-display text-4xl md:text-5xl text-foreground/90">{t("testimonialsTitle")}</h2>',
  '<h2 className="font-display text-5xl md:text-6xl text-foreground/90">{t("testimonialsTitle")}</h2>'
);
// Testimonials text (the quotes)
idx = idx.replaceAll(
  'className="mt-6 text-sm md:text-base text-muted-foreground leading-relaxed italic relative z-10"',
  'className="mt-6 text-base md:text-lg text-foreground font-medium leading-relaxed italic relative z-10"'
);

fs.writeFileSync('src/routes/index.tsx', idx);
console.log('Done!');
