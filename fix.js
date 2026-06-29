const fs = require('fs');
const files = [
  'src/routes/artists.tsx',
  'src/routes/gallery.tsx',
  'src/routes/hotel.tsx',
  'src/routes/partners.tsx',
  'src/routes/program.tsx',
  'src/routes/tourism.tsx',
  'src/routes/index.tsx'
];

const ctaContent = \
      {/* CTA */}
      <section className="relative py-24 md:py-32 overflow-hidden bg-gradient-to-b from-card/10 to-gold/5 border-t border-border/20">
        <div className="relative mx-auto max-w-4xl px-6 text-center space-y-6">
          <p className="text-xs tracking-[0.4em] uppercase text-gold font-bold">
            {lang === "fr"
              ? "Premier arrivé, premier servi !"
              : lang === "es"
                ? "¡Plazas limitadas!"
                : "First come, first served!"}
          </p>
          <h2 className="font-display text-4xl md:text-6xl uppercase leading-tight">
            {lang === "fr"
              ? "Vous n'avez pas encore réservé votre place ?"
              : lang === "es"
                ? "¿Aún no has reservado tu plaza?"
                : "Haven't booked your spot yet?"}
          </h2>
          <p className="text-muted-foreground max-w-lg mx-auto text-sm md:text-base">
            {lang === "fr"
              ? "Prêt à rejoindre l'événement ? Réservez votre pack et découvrez nos offres exclusives sans plus attendre."
              : lang === "es"
                ? "¿Listo para unirte al evento? Reserva tu pack y descubre nuestras ofertas exclusivas sin perder tiempo."
                : "Ready to join the magic? Reserve your pack and discover our exclusive offers right now."}
          </p>
          <div className="pt-6">
            <a
              href="/#packs"
              className="inline-flex items-center gap-2 rounded-full bg-gold px-10 py-5 text-sm font-bold tracking-wider text-primary-foreground uppercase shadow-[0_0_20px_rgba(212,175,55,0.3)] hover:shadow-[0_0_30px_rgba(212,175,55,0.5)] hover:scale-105 active:scale-95 transition-all duration-300 cursor-pointer"
            >
              <span>{t("buyPackBtn")}</span>
              <ArrowRight className="h-5 w-5" />
            </a>
          </div>
        </div>
      </section>
\;

for (let file of files) {
  if (!fs.existsSync(file)) continue;
  let code = fs.readFileSync(file, 'utf8');
  
  if (code.includes('{/* CTA */}')) {
    code = code.replace(/\\{\\/\\* CTA \\*\\/\\}[\\s\\S]*?<\\/section>/, ctaContent.trim());
  } else {
    const parts = code.split('  );\\n}\\n');
    if (parts.length > 1) {
       parts[0] = parts[0].trimEnd() + '\\n' + ctaContent;
       code = parts.join('\\n  );\\n}\\n');
    } else {
       const parts2 = code.split('</div>\\n    </div>\\n  );\\n}');
       if(parts2.length > 1){
         parts2[0] = parts2[0].trimEnd() + '\\n' + ctaContent;
         code = parts2.join('\\n</div>\\n    </div>\\n  );\\n}');
       }
    }
  }

  if (!code.includes('ArrowRight')) {
    code = code.replace(/import \\{ ([^}]+) \\} from "lucide-react";/, (match, p1) => {
      if (!p1.includes('ArrowRight')) {
        return \import { \, ArrowRight } from "lucide-react";\;
      }
      return match;
    });
  }
  
  fs.writeFileSync(file, code, 'utf8');
}
console.log('CTAs updated!');
