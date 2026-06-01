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
      date: "Friday · January 22, 2027",
      items: [
        { title: "Check-in", time: "From 2:00 PM", place: "Hotel Solazur" },
        { title: "Dinner (Buffet)", time: "19:00 — 23:00", place: "Hotel Solazur" },
        { title: "Opening Party", time: "22:00 — 05:00", place: "Hotel Solazur", note: "1 hall" },
      ],
    },
    {
      day: "Day 2",
      date: "Saturday · January 23, 2027",
      items: [
        { title: "Buffet Breakfast", time: "05:00 — 11:00", place: "Hotel Solazur" },
        { title: "Workshops", time: "15:00 — 19:00", place: "Hotel Solazur" },
        { title: "Dinner (Buffet)", time: "19:00 — 23:00", place: "Hotel Solazur" },
        { title: "Artist Shows", time: "22:00 — 00:00", place: "Hotel Solazur" },
        {
          title: "Evening (Black Party)",
          time: "00:00 — 05:00",
          place: "Hotel Solazur",
          note: "3 halls",
        },
      ],
    },
    {
      day: "Day 3",
      date: "Sunday · January 24, 2027",
      items: [
        { title: "Buffet Breakfast", time: "05:00 — 10:00", place: "Hotel Solazur" },
        {
          title: "Excursion to Asilah",
          time: "From 11:00",
          place: "Hotel Solazur",
          note: "Optional",
        },
        { title: "Workshops", time: "11:00 — 13:00", place: "Hotel Solazur" },
        { title: "Lunch Break", time: "13:00 — 14:00", place: "Hotel Solazur" },
        {
          title: "Excursion to Tangier",
          time: "15:00 — 19:00",
          place: "Hotel Solazur",
          note: "Optional",
        },
        { title: "Workshops", time: "14:00 — 19:00", place: "Hotel Solazur" },
        { title: "Buffet Dinner", time: "19:00 — 23:00", place: "Hotel Solazur" },
        { title: "Competition & Artist Shows", time: "22:00 — 00:00", place: "Hotel Solazur" },
        { title: "White Party", time: "00:00 — 06:00", place: "Hotel Solazur", note: "3 halls" },
      ],
    },
    {
      day: "Day 4",
      date: "Monday · January 25, 2027",
      items: [
        { title: "Buffet Breakfast", time: "05:00 — 11:00", place: "Hotel Solazur" },
        {
          title: "Excursion to Chefchaouen",
          time: "From 11:00",
          place: "Hotel Solazur",
          note: "Optional extra",
        },
        { title: "Workshops", time: "11:00 — 13:00", place: "Hotel Solazur" },
        { title: "Lunch Break", time: "13:00 — 14:00", place: "Hotel Solazur" },
        { title: "Workshops", time: "14:00 — 17:00", place: "Hotel Solazur" },
        { title: "Pool Party", time: "16:00 — 19:00", place: "Hotel Solazur" },
        { title: "Buffet Dinner", time: "19:00 — 23:00", place: "Hotel Solazur" },
        { title: "Closing Party", time: "22:00 — 05:00", place: "Hotel Solazur", note: "2 halls" },
      ],
    },
    {
      day: "Day 5",
      date: "Tuesday · January 26, 2027",
      items: [
        { title: "Buffet Breakfast", time: "05:00 — 11:00", place: "Hotel Solazur" },
        { title: "Check-out", time: "From 13:00", place: "Hotel Solazur" },
      ],
    },
  ],
  fr: [
    {
      day: "Jour 1",
      date: "Vendredi · 22 Janvier, 2027",
      items: [
        { title: "Enregistrement", time: "À partir de 14:00", place: "Hôtel Solazur" },
        { title: "Dîner (Buffet)", time: "19:00 — 23:00", place: "Hôtel Solazur" },
        {
          title: "Soirée d'ouverture",
          time: "22:00 — 05:00",
          place: "Hôtel Solazur",
          note: "1 salle",
        },
      ],
    },
    {
      day: "Jour 2",
      date: "Samedi · 23 Janvier, 2027",
      items: [
        { title: "Petit-déjeuner Buffet", time: "05:00 — 11:00", place: "Hôtel Solazur" },
        { title: "Workshops / Cours", time: "15:00 — 19:00", place: "Hôtel Solazur" },
        { title: "Dîner (Buffet)", time: "19:00 — 23:00", place: "Hôtel Solazur" },
        { title: "Spectacles d'Artistes", time: "22:00 — 00:00", place: "Hôtel Solazur" },
        {
          title: "Soirée (Black Party)",
          time: "00:00 — 05:00",
          place: "Hôtel Solazur",
          note: "3 salles",
        },
      ],
    },
    {
      day: "Jour 3",
      date: "Dimanche · 24 Janvier, 2027",
      items: [
        { title: "Petit-déjeuner Buffet", time: "05:00 — 10:00", place: "Hôtel Solazur" },
        {
          title: "Excursion à Asilah",
          time: "À partir de 11:00",
          place: "Hôtel Solazur",
          note: "Optionnel",
        },
        { title: "Workshops / Cours", time: "11:00 — 13:00", place: "Hôtel Solazur" },
        { title: "Pause Déjeuner", time: "13:00 — 14:00", place: "Hôtel Solazur" },
        {
          title: "Excursion à Tanger",
          time: "15:00 — 19:00",
          place: "Hôtel Solazur",
          note: "Optionnel",
        },
        { title: "Workshops / Cours", time: "14:00 — 19:00", place: "Hôtel Solazur" },
        { title: "Dîner Buffet", time: "19:00 — 23:00", place: "Hôtel Solazur" },
        {
          title: "Compétition & Spectacles d'Artistes",
          time: "22:00 — 00:00",
          place: "Hôtel Solazur",
        },
        {
          title: "White Party (Soirée en Blanc)",
          time: "00:00 — 06:00",
          place: "Hôtel Solazur",
          note: "3 salles",
        },
      ],
    },
    {
      day: "Jour 4",
      date: "Lundi · 25 Janvier, 2027",
      items: [
        { title: "Petit-déjeuner Buffet", time: "05:00 — 11:00", place: "Hôtel Solazur" },
        {
          title: "Excursion à Chefchaouen",
          time: "À partir de 11:00",
          place: "Hôtel Solazur",
          note: "Optionnel en supplément",
        },
        { title: "Workshops / Cours", time: "11:00 — 13:00", place: "Hôtel Solazur" },
        { title: "Pause Déjeuner", time: "13:00 — 14:00", place: "Hôtel Solazur" },
        { title: "Workshops / Cours", time: "14:00 — 17:00", place: "Hôtel Solazur" },
        { title: "Pool Party (Piscine)", time: "16:00 — 19:00", place: "Hôtel Solazur" },
        { title: "Dîner Buffet", time: "19:00 — 23:00", place: "Hôtel Solazur" },
        {
          title: "Soirée de Clôture",
          time: "22:00 — 05:00",
          place: "Hôtel Solazur",
          note: "2 salles",
        },
      ],
    },
    {
      day: "Jour 5",
      date: "Mardi · 26 Janvier, 2027",
      items: [
        { title: "Petit-déjeuner Buffet", time: "05:00 — 11:00", place: "Hôtel Solazur" },
        { title: "Enregistrement de départ", time: "À partir de 13:00", place: "Hôtel Solazur" },
      ],
    },
  ],
  es: [
    {
      day: "Día 1",
      date: "Viernes · 22 de Enero, 2027",
      items: [
        { title: "Check-in", time: "Desde las 14:00", place: "Hotel Solazur" },
        { title: "Cena (Buffet)", time: "19:00 — 23:00", place: "Hotel Solazur" },
        {
          title: "Fiesta de Apertura",
          time: "22:00 — 05:00",
          place: "Hotel Solazur",
          note: "1 sala",
        },
      ],
    },
    {
      day: "Día 2",
      date: "Sábado · 23 de Enero, 2027",
      items: [
        { title: "Desayuno Buffet", time: "05:00 — 11:00", place: "Hotel Solazur" },
        { title: "Talleres (Workshops)", time: "15:00 — 19:00", place: "Hotel Solazur" },
        { title: "Cena (Buffet)", time: "19:00 — 23:00", place: "Hotel Solazur" },
        { title: "Espectáculos de Artistas", time: "22:00 — 00:00", place: "Hotel Solazur" },
        {
          title: "Fiesta Nocturna (Black Party)",
          time: "00:00 — 05:00",
          place: "Hotel Solazur",
          note: "3 salas",
        },
      ],
    },
    {
      day: "Día 3",
      date: "Domingo · 24 de Enero, 2027",
      items: [
        { title: "Desayuno Buffet", time: "05:00 — 10:00", place: "Hotel Solazur" },
        {
          title: "Excursión a Asilah",
          time: "Desde las 11:00",
          place: "Hotel Solazur",
          note: "Opcional",
        },
        { title: "Talleres (Workshops)", time: "11:00 — 13:00", place: "Hotel Solazur" },
        { title: "Pausa para Almorzar", time: "13:00 — 14:00", place: "Hotel Solazur" },
        {
          title: "Excursión a Tánger",
          time: "15:00 — 19:00",
          place: "Hotel Solazur",
          note: "Opcional",
        },
        { title: "Talleres (Workshops)", time: "14:00 — 19:00", place: "Hotel Solazur" },
        { title: "Cena Buffet", time: "19:00 — 23:00", place: "Hotel Solazur" },
        { title: "Competición y Shows de Artistas", time: "22:00 — 00:00", place: "Hotel Solazur" },
        {
          title: "White Party (Fiesta de Blanco)",
          time: "00:00 — 06:00",
          place: "Hotel Solazur",
          note: "3 salas",
        },
      ],
    },
    {
      day: "Día 4",
      date: "Lunes · 25 de Enero, 2027",
      items: [
        { title: "Desayuno Buffet", time: "05:00 — 11:00", place: "Hotel Solazur" },
        {
          title: "Excursión a Chefchaouen",
          time: "Desde las 11:00",
          place: "Hotel Solazur",
          note: "Opcional con cargo",
        },
        { title: "Talleres (Workshops)", time: "11:00 — 13:00", place: "Hotel Solazur" },
        { title: "Pausa para Almorzar", time: "13:00 — 14:00", place: "Hotel Solazur" },
        { title: "Talleres (Workshops)", time: "14:00 — 17:00", place: "Hotel Solazur" },
        { title: "Pool Party (Fiesta de Piscina)", time: "16:00 — 19:00", place: "Hotel Solazur" },
        { title: "Cena Buffet", time: "19:00 — 23:00", place: "Hotel Solazur" },
        {
          title: "Fiesta de Clausura",
          time: "22:00 — 05:00",
          place: "Hotel Solazur",
          note: "2 salas",
        },
      ],
    },
    {
      day: "Día 5",
      date: "Martes · 26 de Enero, 2027",
      items: [
        { title: "Desayuno Buffet", time: "05:00 — 11:00", place: "Hotel Solazur" },
        { title: "Check-out (Salida)", time: "Desde las 13:00", place: "Hotel Solazur" },
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
      <section className="relative py-24 md:py-32 border-b border-border/40">
        <div className="absolute inset-0 -z-10 opacity-40 [mask-image:radial-gradient(ellipse_at_top,black,transparent_70%)]">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,oklch(0.62_0.18_30/0.3),transparent_50%),radial-gradient(circle_at_70%_60%,oklch(0.78_0.13_75/0.2),transparent_50%)]" />
        </div>
        <div className="mx-auto max-w-7xl px-6 text-center">
          <p className="text-xs tracking-[0.4em] uppercase text-primary mb-4">
            {t("programHeroSubtitle")}
          </p>
          <h1 className="font-display text-5xl md:text-7xl leading-[0.95]">
            {t("programHeroTitle")}
          </h1>
          <p className="mt-6 text-muted-foreground max-w-2xl mx-auto">{t("programHeroDesc")}</p>
          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <a
              href="https://www.tangierlatinfestival.com/wp-content/uploads/2025/08/Program-en.pdf"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-full bg-gold px-7 py-3.5 text-sm font-medium text-primary-foreground shadow-gold hover:opacity-90 transition cursor-pointer"
            >
              <Download className="h-4 w-4" /> {t("programDownloadPdf")}
            </a>
            <Link
              to={localizedHref("/")}
              hash="packs"
              className="inline-flex items-center gap-2 rounded-full border border-border/80 bg-background/40 backdrop-blur px-7 py-3.5 text-sm font-medium hover:border-primary/60 hover:text-primary transition cursor-pointer"
            >
              {t("programSeePacks")}
            </Link>
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
                        <span className="inline-flex items-center gap-2 text-xs tracking-[0.2em] uppercase text-primary">
                          <Clock className="h-3.5 w-3.5" /> {it.time}
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
