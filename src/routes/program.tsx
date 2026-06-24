import { createFileRoute, Link } from "@tanstack/react-router";
import { Download, Clock, MapPin } from "lucide-react";
import { z } from "zod";
import { Nav } from "@/components/Nav";
import { useLanguage } from "@/hooks/useLanguage";
import { translations, Language } from "@/lib/translations";

const programSearchSchema = z.object({
  lang: z.enum(["en", "fr", "es"]).optional(),
});

export const Route = createFileRoute("/program")({
  validateSearch: (search) => programSearchSchema.parse(search),
  head: (ctx) => {
    const search = (ctx.search || {}) as { lang?: string };
    const lang = (search?.lang || "en") as Language;
    const dict = translations[lang] || translations.en;
    return {
      meta: [
        { title: dict.seoProgramTitle },
        { name: "description", content: dict.seoProgramDesc },
        { property: "og:title", content: dict.seoProgramTitle },
        { property: "og:description", content: dict.seoProgramDesc },
      ],
    };
  },
  component: ProgramPage,
});

type Item = { title: string; time: string; place: string; note?: string };
type Day = { day: string; date: string; items: Item[] };

const translatedDays: Record<Language, Day[]> = {
  en: [
    {
      day: "Day 1",
      date: "Thursday · January 7, 2027",
      items: [
        { title: "Check-in", time: "From 14:00", place: "Hotel Solazur" },
        { title: "Dinner (Buffet)", time: "19:00 — 23:00", place: "Hotel Solazur" },
        { title: "Opening Night", time: "22:00 — 05:00", place: "Hotel Solazur", note: "1 room" },
      ],
    },
    {
      day: "Day 2",
      date: "Friday · January 8, 2027",
      items: [
        { title: "Breakfast (Buffet)", time: "05:00 — 11:00", place: "Hotel Solazur" },
        { title: "Afternoon Workshops", time: "14:00 — 19:00", place: "Hotel Solazur" },
        { title: "Dinner (Buffet)", time: "19:00 — 23:00", place: "Hotel Solazur" },
        { title: "Artists' Shows", time: "22:00 — 00:00", place: "Hotel Solazur" },
        { title: "Evening « BLACK PARTY »", time: "00:00 — 05:00", place: "Hotel Solazur", note: "3 rooms" },
      ],
    },
    {
      day: "Day 3",
      date: "Saturday · January 9, 2027",
      items: [
        { title: "Breakfast (Buffet)", time: "05:00 — 11:00", place: "Hotel Solazur" },
        { title: "Morning Workshops", time: "11:00 — 13:00", place: "Hotel Solazur" },
        { title: "Excursion in Assilah", time: "12:00", place: "City of Assilah" },
        { title: "Lunch Break", time: "13:00 — 14:00", place: "Hotel Solazur" },
        { title: "Excursion in Tangier", time: "15:00", place: "City of Tangier" },
        { title: "Afternoon Workshops", time: "14:00 — 19:00", place: "Hotel Solazur" },
        { title: "Dinner (Buffet)", time: "19:00 — 23:00", place: "Hotel Solazur" },
        { title: "Competition & Artist Shows", time: "22:00 — 00:00", place: "Hotel Solazur" },
        { title: "Evening « WHITE PARTY »", time: "00:00 — 06:00", place: "Hotel Solazur", note: "3 rooms" },
      ],
    },
    {
      day: "Day 4",
      date: "Sunday · January 10, 2027",
      items: [
        { title: "Breakfast (Buffet)", time: "05:00 — 11:00", place: "Hotel Solazur" },
        { title: "Excursion to Chefchaouen", time: "11:00", place: "City of Chefchaouen" },
        { title: "Morning Workshops", time: "11:00 — 13:00", place: "Hotel Solazur" },
        { title: "Lunch Break", time: "13:00 — 14:00", place: "Hotel Solazur" },
        { title: "Afternoon Workshops", time: "14:00 — 18:00", place: "Hotel Solazur" },
        { title: "Afternoon & Pool Party", time: "16:00 — 19:00", place: "Hotel Solazur" },
        { title: "Dinner (Buffet)", time: "19:00 — 23:00", place: "Hotel Solazur" },
        { title: "Closing Party", time: "22:00 — 05:00", place: "Hotel Solazur", note: "2 rooms" },
      ],
    },
    {
      day: "Day 5",
      date: "Monday · January 11, 2027",
      items: [
        { title: "Breakfast (Buffet)", time: "05:00 — 11:00", place: "Hotel Solazur" },
        { title: "Check out", time: "From 13:00", place: "Hotel Solazur" },
      ],
    },
  ],
  fr: [
    {
      day: "Jour 1",
      date: "Jeudi · 7 Janvier, 2027",
      items: [
        { title: "Check-in", time: "À partir de 14:00", place: "Hôtel Solazur" },
        { title: "Diner (Buffet)", time: "19:00 — 23:00", place: "Hôtel Solazur" },
        { title: "Soirée d'ouverture", time: "22:00 — 05:00", place: "Hôtel Solazur", note: "1 salle" },
      ],
    },
    {
      day: "Jour 2",
      date: "Vendredi · 8 Janvier, 2027",
      items: [
        { title: "Petit déjeuner (Buffet)", time: "05:00 — 11:00", place: "Hôtel Solazur" },
        { title: "Workshops", time: "14:00 — 19:00", place: "Hôtel Solazur" },
        { title: "Diner (Buffet)", time: "19:00 — 23:00", place: "Hôtel Solazur" },
        { title: "Shows des artistes", time: "22:00 — 00:00", place: "Hôtel Solazur" },
        { title: "Soirée « BLACK PARTY »", time: "00:00 — 05:00", place: "Hôtel Solazur", note: "3 salles" },
      ],
    },
    {
      day: "Jour 3",
      date: "Samedi · 9 Janvier, 2027",
      items: [
        { title: "Petit déjeuner (Buffet)", time: "05:00 — 11:00", place: "Hôtel Solazur" },
        { title: "Workshops matin", time: "11:00 — 13:00", place: "Hôtel Solazur" },
        { title: "Excursion à Assilah", time: "12:00", place: "Ville d'Assilah" },
        { title: "Pause déjeuner", time: "13:00 — 14:00", place: "Hôtel Solazur" },
        { title: "Excursion à Tanger", time: "15:00", place: "Ville de Tanger" },
        { title: "Workshops", time: "14:00 — 19:00", place: "Hôtel Solazur" },
        { title: "Diner (Buffet)", time: "19:00 — 23:00", place: "Hôtel Solazur" },
        { title: "Compétition et shows des artistes", time: "22:00 — 00:00", place: "Hôtel Solazur" },
        { title: "Soirée « WHITE PARTY »", time: "00:00 — 06:00", place: "Hôtel Solazur", note: "3 salles" },
      ],
    },
    {
      day: "Jour 4",
      date: "Dimanche · 10 Janvier, 2027",
      items: [
        { title: "Petit déjeuner (Buffet)", time: "05:00 — 11:00", place: "Hôtel Solazur" },
        { title: "Excursion à Chefchaouen", time: "11:00", place: "Ville de Chefchaouen" },
        { title: "Workshops", time: "11:00 — 13:00", place: "Hôtel Solazur" },
        { title: "Pause déjeuner", time: "13:00 — 14:00", place: "Hôtel Solazur" },
        { title: "Workshops", time: "14:00 — 18:00", place: "Hôtel Solazur" },
        { title: "Afternoon & Pool party", time: "16:00 — 19:00", place: "Hôtel Solazur" },
        { title: "Diner (Buffet)", time: "19:00 — 23:00", place: "Hôtel Solazur" },
        { title: "Soirée de clôture", time: "22:00 — 05:00", place: "Hôtel Solazur", note: "2 salles" },
      ],
    },
    {
      day: "Jour 5",
      date: "Lundi · 11 Janvier, 2027",
      items: [
        { title: "Petit déjeuner (Buffet)", time: "05:00 — 11:00", place: "Hôtel Solazur" },
        { title: "Check out", time: "À partir de 13:00", place: "Hôtel Solazur" },
      ],
    },
  ],
  es: [
    {
      day: "Día 1",
      date: "Jueves · 7 de Enero, 2027",
      items: [
        { title: "Check-in", time: "A partir de 14:00", place: "Hotel Solazur" },
        { title: "Cena (Buffet)", time: "19:00 — 23:00", place: "Hotel Solazur" },
        { title: "Noche de apertura", time: "22:00 — 05:00", place: "Hotel Solazur", note: "1 sala" },
      ],
    },
    {
      day: "Día 2",
      date: "Viernes · 8 de Enero, 2027",
      items: [
        { title: "Desayuno (Buffet)", time: "05:00 — 11:00", place: "Hotel Solazur" },
        { title: "Talleres de tarde", time: "14:00 — 19:00", place: "Hotel Solazur" },
        { title: "Cena (Buffet)", time: "19:00 — 23:00", place: "Hotel Solazur" },
        { title: "Espectáculos", time: "22:00 — 00:00", place: "Hotel Solazur" },
        { title: "Noche « BLACK PARTY »", time: "00:00 — 05:00", place: "Hotel Solazur", note: "3 salas" },
      ],
    },
    {
      day: "Día 3",
      date: "Sábado · 9 de Enero, 2027",
      items: [
        { title: "Desayuno (Buffet)", time: "05:00 — 11:00", place: "Hotel Solazur" },
        { title: "Talleres matutinos", time: "11:00 — 13:00", place: "Hotel Solazur" },
        { title: "Excursión en Assilah", time: "12:00", place: "Ciudad de Assilah" },
        { title: "Almuerzo", time: "13:00 — 14:00", place: "Hotel Solazur" },
        { title: "Excursión en Tánger", time: "15:00", place: "Ciudad de Tánger" },
        { title: "Talleres de tarde", time: "14:00 — 19:00", place: "Hotel Solazur" },
        { title: "Cena (Buffet)", time: "19:00 — 23:00", place: "Hotel Solazur" },
        { title: "Concurso y espectáculos", time: "22:00 — 00:00", place: "Hotel Solazur" },
        { title: "Noche « WHITE PARTY »", time: "00:00 — 06:00", place: "Hotel Solazur", note: "3 salas" },
      ],
    },
    {
      day: "Día 4",
      date: "Domingo · 10 de Enero, 2027",
      items: [
        { title: "Desayuno (Buffet)", time: "05:00 — 11:00", place: "Hotel Solazur" },
        { title: "Excursión en Chefchaouen", time: "11:00", place: "Ciudad de Chefchaouen" },
        { title: "Talleres matutinos", time: "11:00 — 13:00", place: "Hotel Solazur" },
        { title: "Almuerzo", time: "13:00 — 14:00", place: "Hotel Solazur" },
        { title: "Talleres de tarde", time: "14:00 — 18:00", place: "Hotel Solazur" },
        { title: "Pool Party", time: "16:00 — 19:00", place: "Hotel Solazur" },
        { title: "Cena (Buffet)", time: "19:00 — 23:00", place: "Hotel Solazur" },
        { title: "Fiesta de clausura", time: "22:00 — 05:00", place: "Hotel Solazur", note: "2 salas" },
      ],
    },
    {
      day: "Día 5",
      date: "Lunes · 11 de Enero, 2027",
      items: [
        { title: "Desayuno (Buffet)", time: "05:00 — 11:00", place: "Hotel Solazur" },
        { title: "Check out", time: "A partir de 13:00", place: "Hotel Solazur" },
      ],
    },
  ],
};

function ProgramPage() {
  const { lang, t } = useLanguage();

  const langSuffix = lang && lang !== "en" ? `?lang=${lang}` : "";
  const localizedHref = (href: string) => `${href}${langSuffix}`;

  const days = translatedDays[lang] || translatedDays.en;

  return (
    <div className="min-h-screen">
      <Nav />

      {/* HERO */}
      <section className="relative py-20 md:py-32 border-b border-border/20 overflow-hidden flex items-center min-h-[70vh]">
        <div className="absolute inset-0 -z-10 bg-slate-950">
          <div className="absolute -top-[30%] -left-[10%] w-[70%] h-[70%] rounded-full bg-gold/15 blur-[120px] mix-blend-screen animate-pulse" style={{ animationDuration: '8s' }} />
          <div className="absolute top-[20%] -right-[10%] w-[60%] h-[60%] rounded-full bg-primary/10 blur-[120px] mix-blend-screen animate-pulse" style={{ animationDuration: '10s' }} />
          <div className="absolute -bottom-[20%] left-[20%] w-[50%] h-[50%] rounded-full bg-purple-500/10 blur-[120px] mix-blend-screen animate-pulse" style={{ animationDuration: '12s' }} />
          {/* Subtle grid pattern overlay */}
          <div className="absolute inset-0 bg-[linear-gradient(rgba(212,175,55,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(212,175,55,0.03)_1px,transparent_1px)] bg-[size:64px_64px] [mask-image:radial-gradient(ellipse_60%_60%_at_50%_50%,black,transparent)]" />
        </div>
        
        <div className="mx-auto max-w-5xl px-4 md:px-6 relative z-10 w-full">
          <div className="rounded-3xl border border-gold/20 bg-black/40 backdrop-blur-2xl p-8 md:p-16 text-center shadow-2xl relative overflow-hidden group">
            {/* Hover flare effect inside card */}
            <div className="absolute inset-0 bg-gradient-to-br from-gold/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />
            <div className="absolute -inset-1 bg-gradient-to-r from-gold/20 via-primary/20 to-purple-500/20 blur-xl opacity-0 group-hover:opacity-30 transition-opacity duration-700 pointer-events-none" />
            
            <p className="relative text-xs tracking-[0.4em] uppercase text-primary mb-6 flex items-center justify-center gap-4">
              <span className="w-12 h-[1px] bg-gradient-to-r from-transparent to-primary/50 hidden sm:block" />
              {t("programHeroSubtitle")}
              <span className="w-12 h-[1px] bg-gradient-to-l from-transparent to-primary/50 hidden sm:block" />
            </p>
            <h1 className="relative font-display text-5xl md:text-7xl lg:text-8xl leading-[0.95] text-white drop-shadow-lg">
              {t("programHeroTitle")}
            </h1>
            <p className="relative mt-8 text-slate-300 max-w-2xl mx-auto leading-relaxed text-sm md:text-base">{t("programHeroDesc")}</p>
            
            <div className="relative mt-12 flex flex-col sm:flex-row justify-center gap-4 sm:gap-6">
              <a
                href={`/Program-${lang || "en"}.pdf`}
                target="_blank"
                rel="noreferrer"
                className="group/btn relative inline-flex items-center justify-center gap-3 rounded-full bg-gold px-8 py-4 text-sm font-bold text-primary-foreground shadow-[0_0_20px_rgba(212,175,55,0.3)] overflow-hidden transition-all hover:scale-105 hover:shadow-[0_0_30px_rgba(212,175,55,0.5)] active:scale-95"
              >
                <div className="absolute inset-0 bg-white/20 translate-y-full group-hover/btn:translate-y-0 transition-transform duration-300 ease-out rounded-full" />
                <Download className="relative z-10 h-4.5 w-4.5 group-hover/btn:animate-bounce" /> 
                <span className="relative z-10 tracking-wide uppercase">{t("programDownloadPdf")}</span>
              </a>
              <Link
                to={localizedHref("/")}
                hash="packs"
                className="inline-flex items-center justify-center gap-2 rounded-full border border-gold/30 bg-gold/5 backdrop-blur-md px-8 py-4 text-sm font-bold text-gold hover:bg-gold/10 hover:border-gold/50 transition-all hover:scale-105 active:scale-95 tracking-wide uppercase"
              >
                {t("programSeePacks")}
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* TIMELINE */}
      <section className="py-20 md:py-28">
        <div className="mx-auto max-w-5xl px-6 space-y-20">
          {days.map((d, idx) => (
            <article key={d.day} className="relative">
              <header className="flex items-baseline justify-between flex-wrap gap-2 mb-10">
                <div className="flex items-baseline gap-5">
                  <span className="font-display text-6xl md:text-7xl text-gold leading-none">
                    {String(idx + 1).padStart(2, "0")}
                  </span>
                  <div>
                    <p className="font-display text-3xl">{d.day}</p>
                    <p className="text-xs tracking-[0.3em] uppercase text-muted-foreground mt-1">
                      {d.date}
                    </p>
                  </div>
                </div>
                <span className="text-xs tracking-[0.25em] uppercase text-muted-foreground">
                  {d.items.length} {t("programMoments")}
                </span>
              </header>

              <ol className="relative border-l border-border/60 ml-2 md:ml-6 space-y-4">
                {d.items.map((it) => (
                  <li key={it.title + it.time} className="relative pl-8 group">
                    <span className="absolute -left-[7px] top-5 h-3 w-3 rounded-full bg-gold ring-4 ring-background" />
                    <div className="rounded-2xl border border-border/60 bg-card/60 p-5 md:p-6 hover:border-primary/50 transition">
                      <div className="flex flex-wrap items-baseline justify-between gap-3">
                        <h3 className="font-display text-xl md:text-2xl">
                          {it.title}
                          {it.note && (
                            <span className="ml-3 align-middle text-[10px] tracking-[0.25em] uppercase text-primary border border-primary/40 rounded-full px-2 py-0.5 animate-pulse">
                              {it.note}
                            </span>
                          )}
                        </h3>
                        <span className="inline-flex items-center justify-center gap-2 text-xs tracking-[0.2em] uppercase text-primary">
                          <Clock className="h-3.5 w-3.5 align-middle" /> {it.time}
                        </span>
                      </div>
                      <p className="mt-2 inline-flex items-center gap-2 text-sm text-muted-foreground">
                        <MapPin className="h-3.5 w-3.5" /> {it.place}
                      </p>
                    </div>
                  </li>
                ))}
              </ol>
            </article>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="relative py-24 overflow-hidden">
        <div className="absolute inset-0 bg-gold opacity-95" />
        <div className="relative mx-auto max-w-5xl px-6 text-center text-primary-foreground">
          <h2 className="font-display text-4xl md:text-5xl leading-tight">
            {t("programCtaTitle")}
          </h2>
          <p className="mt-4 opacity-90">{t("programCtaDesc")}</p>
          <Link
            to={localizedHref("/")}
            hash="packs"
            className="mt-8 inline-flex items-center gap-2 rounded-full bg-background px-8 py-3.5 text-sm font-medium text-foreground hover:opacity-90 transition shadow-soft cursor-pointer"
          >
            {t("programCtaBtn")}
          </Link>
        </div>
      </section>
    </div>
  );
}
