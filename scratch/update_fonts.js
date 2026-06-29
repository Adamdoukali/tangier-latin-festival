const fs = require('fs');

// 1. index.tsx
let idx = fs.readFileSync('src/routes/index.tsx', 'utf-8');
idx = idx.replaceAll(
  'className="text-sm md:text-base font-display tracking-[0.4em] uppercase text-primary mb-4"',
  'className="text-sm md:text-base font-sans font-semibold tracking-[0.25em] uppercase text-primary mb-4"'
);
fs.writeFileSync('src/routes/index.tsx', idx);

// 2. gallery.tsx
let gal = fs.readFileSync('src/routes/gallery.tsx', 'utf-8');
gal = gal.replaceAll(
  'className="text-sm md:text-base font-display tracking-[0.4em] uppercase text-primary mb-4 flex items-center justify-center gap-2"',
  'className="text-sm md:text-base font-sans font-semibold tracking-[0.25em] uppercase text-primary mb-4 flex items-center justify-center gap-2"'
);
fs.writeFileSync('src/routes/gallery.tsx', gal);

// 3. testimonials.tsx
let test = fs.readFileSync('src/routes/testimonials.tsx', 'utf-8');
test = test.replaceAll(
  'className="text-sm md:text-base font-display tracking-[0.4em] uppercase text-primary mb-4"',
  'className="text-sm md:text-base font-sans font-semibold tracking-[0.25em] uppercase text-primary mb-4"'
);
test = test.replaceAll(
  'className="text-xs tracking-[0.35em] uppercase text-primary mb-3"',
  'className="text-sm md:text-base font-sans font-semibold tracking-[0.25em] uppercase text-primary mb-4"'
);
fs.writeFileSync('src/routes/testimonials.tsx', test);

console.log('Fonts updated!');
