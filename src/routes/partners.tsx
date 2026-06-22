import { createFileRoute, Link } from "@tanstack/react-router";
import { z } from "zod";
import { Nav } from "@/components/Nav";

import salsero from "@/assets/partners/salsero.png";
import salsaGroup from "@/assets/partners/salsa-group.png";
import summerBachata from "@/assets/partners/summer-bachata.png";
import salsaSpain from "@/assets/partners/salsa-spain.png";
import bachataSpain from "@/assets/partners/bachata-spain.png";
import bachataAllTheWorld from "@/assets/partners/bachata-all-the-world.png";
import allIn from "@/assets/partners/all-in.png";
import socialDanceSpain from "@/assets/partners/social-dance-spain.png";
import oaxaca from "@/assets/partners/oaxaca.png";
import salsaBachataTurkey from "@/assets/partners/salsa-bachata-turkey.png";
import { useLanguage } from "@/hooks/useLanguage";
import { translations, Language } from "@/lib/translations";

const partnersSearchSchema = z.object({
  lang: z.enum(["en", "fr", "es"]).optional(),
});

export const Route = createFileRoute("/partners")({
  validateSearch: (search) => partnersSearchSchema.parse(search),
  head: (ctx) => {
    const search = (ctx.search || {}) as { lang?: string };
    const lang = (search?.lang || "en") as Language;
    const dict = translations[lang] || translations.en;
    return {
      meta: [
        { title: dict.seoPartnersTitle },
        { name: "description", content: dict.seoPartnersDesc },
        { property: "og:title", content: dict.seoPartnersTitle },
        { property: "og:description", content: dict.seoPartnersDesc },
      ],
    };
  },
  component: PartnersPage,
});

type Partner = { name: string; logo: string; url?: string };

const partners: Partner[] = [
  { name: "Salsero", logo: salsero, url: "https://www.salsero.es/index" },
  { name: "Salsa Group", logo: salsaGroup },
  { name: "Summer Bachata", logo: summerBachata, url: "https://www.facebook.com/BachataSummer/" },
  { name: "Salsa Spain", logo: salsaSpain, url: "https://www.instagram.com/salsaspain_official/" },
  {
    name: "Bachata Spain",
    logo: bachataSpain,
    url: "https://www.instagram.com/bachataspain_official/",
  },
  {
    name: "Bachata All The World",
    logo: bachataAllTheWorld,
    url: "https://www.instagram.com/bachata_alltheworld/",
  },
  { name: "All In", logo: allIn, url: "https://kizomba-festival.fr/fr/" },
  {
    name: "Social Dance Spain",
    logo: socialDanceSpain,
    url: "https://www.instagram.com/social_dance_spain/",
  },
  { name: "Oaxaca Paramount Cup", logo: oaxaca, url: "https://www.instagram.com/oaxacasbf/" },
  {
    name: "Salsa & Bachata Turkey",
    logo: salsaBachataTurkey,
    url: "https://www.instagram.com/salsaybachataturkey/",
  },
];

function PartnerCard({ p }: { p: Partner }) {
  const inner = (
    <div className="group relative aspect-[4/3] rounded-2xl border border-border/60 bg-background hover:border-primary/60 transition flex items-center justify-center p-6 md:p-8 overflow-hidden">
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition bg-[radial-gradient(circle_at_center,oklch(0.78_0.13_75/0.12),transparent_70%)]" />
      <img
        src={p.logo}
        alt={`${p.name} logo`}
        loading="lazy"
        className="relative max-h-full max-w-full object-contain transition group-hover:scale-105"
      />
    </div>
  );
  return p.url ? (
    <a href={p.url} target="_blank" rel="noreferrer" aria-label={p.name}>
      {inner}
    </a>
  ) : (
    inner
  );
}

function PartnersPage() {
  const { lang, t } = useLanguage();

  const langSuffix = lang && lang !== "en" ? `?lang=${lang}` : "";
  const localizedHref = (href: string) => `${href}${langSuffix}`;

  return (
    <div className="min-h-screen">
      <Nav />

      {/* HERO */}
      <section className="relative py-28 md:py-40 border-b border-border/20 overflow-hidden min-h-[60vh] flex flex-col justify-center">
        <style>{`
          @keyframes marquee-left {
            0% { transform: translateX(0); }
            100% { transform: translateX(-50%); }
          }
          @keyframes slide-up-fade {
            0% { transform: translateY(40px); opacity: 0; }
            100% { transform: translateY(0); opacity: 1; }
          }
          .animate-slide-up-1 { animation: slide-up-fade 1s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
          .animate-slide-up-2 { animation: slide-up-fade 1s cubic-bezier(0.16, 1, 0.3, 1) forwards 0.2s; opacity: 0; }
          .animate-slide-up-3 { animation: slide-up-fade 1s cubic-bezier(0.16, 1, 0.3, 1) forwards 0.4s; opacity: 0; }
        `}</style>

        {/* Network / Grid Background */}
        <div className="absolute inset-0 -z-20 bg-slate-950">
          <div className="absolute inset-0 opacity-20 [mask-image:linear-gradient(to_bottom,black,transparent)] bg-[linear-gradient(rgba(212,175,55,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(212,175,55,0.08)_1px,transparent_1px)] bg-[size:40px_40px]" />
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-3xl h-full bg-[radial-gradient(ellipse_at_top,oklch(0.62_0.18_30/0.15),transparent_60%)]" />
        </div>

        {/* Infinite Faded Logo Marquee Background */}
        <div className="absolute top-1/2 -translate-y-1/2 left-0 right-0 -z-10 flex overflow-hidden opacity-10 blur-[2px] pointer-events-none select-none">
          <div className="flex shrink-0 gap-16 items-center pr-16" style={{ animation: 'marquee-left 40s linear infinite', width: 'max-content' }}>
            {[...partners, ...partners].map((p, i) => (
              <img key={i} src={p.logo} alt="" className="h-16 md:h-24 w-auto object-contain grayscale" />
            ))}
          </div>
        </div>

        <div className="mx-auto max-w-4xl px-6 text-center relative z-10">
          <div className="inline-flex items-center gap-3 px-4 py-1.5 rounded-full border border-gold/20 bg-gold/5 backdrop-blur-sm mb-6 animate-slide-up-1 shadow-lg">
            <span className="h-2 w-2 rounded-full bg-gold animate-pulse" />
            <p className="text-xs tracking-[0.4em] uppercase text-gold font-bold">
              {t("partnersPageHeroSubtitle")}
            </p>
          </div>
          
          <h1 className="font-display text-5xl md:text-7xl lg:text-8xl leading-[0.95] text-white drop-shadow-2xl animate-slide-up-2">
            {t("partnersPageHeroTitle")}
          </h1>
          
          <p className="mt-8 text-slate-300 max-w-2xl mx-auto text-sm md:text-base leading-relaxed animate-slide-up-3 drop-shadow-md">
            {t("partnersPageHeroDesc")}
          </p>
        </div>
      </section>

      {/* DANCE PARTNERS */}
      <section className="py-20 md:py-28">
        <div className="mx-auto max-w-7xl px-6">
          <header className="mb-14 text-center">
            <p className="text-xs tracking-[0.4em] uppercase text-primary mb-3">
              {t("partnersPageSubtitle")}
            </p>
            <h2 className="font-display text-3xl md:text-5xl">{t("partnersPageTitle")}</h2>
          </header>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-5 md:gap-6">
            {partners.map((p) => (
              <PartnerCard key={p.name} p={p} />
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="relative py-24 overflow-hidden border-t border-border/40">
        <div className="absolute inset-0 bg-gold opacity-95" />
        <div className="relative mx-auto max-w-5xl px-6 text-center text-primary-foreground">
          <p className="text-xs tracking-[0.4em] uppercase mb-4 opacity-90">
            {t("partnersPageCtaBadge")}
          </p>
          <h2 className="font-display text-4xl md:text-5xl leading-tight">
            {t("partnersPageCtaTitle")}
          </h2>
          <p className="mt-4 opacity-90">{t("partnersPageCtaDesc")}</p>
          <Link
            to={localizedHref("/")}
            hash="packs"
            className="mt-8 inline-flex items-center gap-2 rounded-full bg-background px-8 py-3.5 text-sm font-medium text-foreground hover:opacity-90 transition shadow-soft cursor-pointer"
          >
            {t("partnersPageCtaBtn")}
          </Link>
        </div>
      </section>
    </div>
  );
}
