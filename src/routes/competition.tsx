import { createFileRoute, Link } from "@tanstack/react-router";
import { Trophy, Star, Globe2, Flame } from "lucide-react";
import { useState } from "react";
import { z } from "zod";
import { Nav } from "@/components/Nav";
import competitionImg from "@/assets/competition.jpg";
import { useLanguage } from "@/hooks/useLanguage";
import { translations, Language } from "@/lib/translations";

const competitionSearchSchema = z.object({
  lang: z.enum(["en", "fr", "es"]).optional(),
});

export const Route = createFileRoute("/competition")({
  validateSearch: (search) => competitionSearchSchema.parse(search),
  head: (ctx) => {
    const search = (ctx.search || {}) as { lang?: string };
    const lang = (search?.lang || "en") as Language;
    const dict = translations[lang] || translations.en;
    return {
      meta: [
        { title: dict.seoCompetitionTitle },
        { name: "description", content: dict.seoCompetitionDesc },
        { property: "og:title", content: dict.seoCompetitionTitle },
        { property: "og:description", content: dict.seoCompetitionDesc },
      ],
    };
  },
  component: CompetitionPage,
});

function CompetitionPage() {
  const [sent, setSent] = useState(false);
  const { lang, t } = useLanguage();

  const langSuffix = lang && lang !== "en" ? `?lang=${lang}` : "";
  const localizedHref = (href: string) => `${href}${langSuffix}`;

  const criteria = [
    {
      label: lang === "fr" ? "Exigence" : lang === "es" ? "Exigencia" : "Requirement",
      value: 94,
      icon: Star,
    },
    {
      label: lang === "fr" ? "Performance" : lang === "es" ? "Rendimiento" : "Performance",
      value: 100,
      icon: Flame,
    },
    {
      label: lang === "fr" ? "Originalité" : lang === "es" ? "Originalidad" : "Originality",
      value: 90,
      icon: Trophy,
    },
    {
      label: lang === "fr" ? "musicalité" : lang === "es" ? "Musicalidad" : "Musicality",
      value: 92,
      icon: Globe2,
    },
  ];

  return (
    <div className="min-h-screen">
      <Nav />

      {/* HERO */}
      <section className="relative py-28 md:py-36 overflow-hidden border-b border-border/40 bg-slate-950">
        <div className="absolute inset-0">
          <img src={competitionImg} alt="" className="h-full w-full object-cover opacity-30" />
          <div className="absolute inset-0 hero-overlay" />
        </div>
        <div className="relative mx-auto max-w-5xl px-6 text-center">
          <p className="text-xs tracking-[0.4em] uppercase text-primary mb-4">
            <Trophy className="inline h-3.5 w-3.5 mr-2 -mt-0.5" />
            {t("competitionHeroSubtitle")}
          </p>
          <h1 className="font-display text-5xl md:text-7xl leading-[0.95] text-white drop-shadow-lg">
            {t("competitionHeroTitlePart1")}{" "}
            <span className="text-gold italic">{t("competitionHeroTitlePart2")}</span>{" "}
            {t("competitionHeroTitlePart3")}
          </h1>
          <p className="mt-6 text-slate-300 max-w-3xl mx-auto leading-relaxed drop-shadow-md">
            {t("competitionHeroDesc")}
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <span className="rounded-full border border-primary/40 bg-primary/10 px-4 py-1.5 text-xs tracking-[0.25em] uppercase text-primary">
              {t("competitionCategorySalsa")}
            </span>
            <span className="rounded-full border border-primary/40 bg-primary/10 px-4 py-1.5 text-xs tracking-[0.25em] uppercase text-primary">
              {t("competitionCategoryBachata")}
            </span>
          </div>
        </div>
      </section>

      {/* OVERVIEW & VIDEO */}
      <section className="py-24">
        <div className="mx-auto max-w-7xl px-6 grid lg:grid-cols-2 gap-16 items-start">
          {/* Left Column: Premium Responsive Glassy Video Player */}
          <div className="relative">
            <div className="rounded-2xl overflow-hidden border border-gold/20 shadow-soft bg-black/40 h-[480px] w-full flex items-center justify-center">
              <video
                className="w-full h-full object-cover"
                src="https://www.tangierlatinfestival.com/wp-content/uploads/2025/10/IMG_7013.mov"
                controls
                preload="metadata"
                playsInline
              />
            </div>
            {/* Floating gold medal tag */}
            <div className="absolute -bottom-4 -right-4 hidden md:flex flex-col items-center justify-center h-28 w-28 rounded-2xl bg-gold text-primary-foreground shadow-gold border border-gold/40 select-none z-10">
              <Trophy className="h-7 w-7" />
              <p className="mt-1 text-[9px] tracking-[0.25em] uppercase font-bold">Champion</p>
            </div>
          </div>

          {/* Right Column: Title, Description, and Embedded Criteria Progress Bars */}
          <div>
            <h2 className="font-display text-3xl md:text-4xl text-gold leading-tight">
              {t("competitionOverviewTitle")}
            </h2>
            <div className="mt-6 space-y-4 text-muted-foreground leading-relaxed text-sm md:text-base">
              <p>{t("competitionOverviewDesc1")}</p>
              <p>{t("competitionOverviewDesc2")}</p>
              <p>{t("competitionOverviewDesc3")}</p>
            </div>

            {/* Embedded Criteria Grid */}
            <div className="mt-10 border-t border-border/40 pt-8">
              <h3 className="font-display text-sm tracking-[0.25em] text-primary uppercase mb-6 flex items-center gap-2 font-bold">
                <Star className="h-4 w-4 text-gold" />
                {t("competitionCriteriaTitle")}
              </h3>
              <div className="grid sm:grid-cols-2 gap-4">
                {criteria.map(({ label, value, icon: Icon }) => (
                  <div
                    key={label}
                    className="rounded-xl border border-border/60 bg-card/60 p-5 backdrop-blur-sm shadow-soft"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Icon className="h-4 w-4 text-gold" />
                        <p className="text-xs tracking-[0.2em] uppercase font-semibold text-muted-foreground">
                          {label}
                        </p>
                      </div>
                      <span className="font-display text-2xl text-gold tabular-nums">{value}%</span>
                    </div>
                    <div className="mt-3 h-1.5 rounded-full bg-secondary overflow-hidden border border-border/20">
                      <div
                        className="h-full bg-gradient-to-r from-gold/70 to-gold rounded-full transition-all duration-700 shadow-gold"
                        style={{ width: `${value}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* APPLY FORM */}
      <section className="py-24 border-t border-border/40 bg-card/20">
        <div className="mx-auto max-w-2xl px-6">
          <div className="text-center mb-12">
            <p className="text-xs tracking-[0.4em] uppercase text-primary mb-3">
              {t("competitionFormSubtitle")}
            </p>
            <h2 className="font-display text-4xl md:text-5xl text-glow">
              {t("competitionFormTitle")}
            </h2>
            <p className="mt-4 text-muted-foreground text-sm tracking-wide">
              {t("competitionFormInstructions")}
            </p>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              setSent(true);
            }}
            className="rounded-2xl border border-border/60 bg-card/40 backdrop-blur-xl p-8 md:p-12 space-y-6 shadow-soft"
          >
            <div className="space-y-5">
              <div>
                <label
                  htmlFor="form-name"
                  className="block text-xs tracking-[0.25em] uppercase text-muted-foreground mb-2"
                >
                  {lang === "fr"
                    ? "Nom et prénom"
                    : lang === "es"
                      ? "Nombre y apellido"
                      : "Full Name"}
                  <span className="text-primary ml-1">*</span>
                </label>
                <input
                  id="form-name"
                  name="name"
                  type="text"
                  required
                  placeholder={t("competitionFormNamePlaceholder")}
                  className="w-full rounded-xl border border-border/60 bg-background/50 px-4 py-3.5 text-sm focus:outline-none focus:border-gold focus:ring-1 focus:ring-gold/30 transition placeholder:text-muted-foreground/50 text-foreground"
                />
              </div>

              <div>
                <label
                  htmlFor="form-email"
                  className="block text-xs tracking-[0.25em] uppercase text-muted-foreground mb-2"
                >
                  Email <span className="text-primary ml-1">*</span>
                </label>
                <input
                  id="form-email"
                  name="email"
                  type="email"
                  required
                  placeholder={t("competitionFormEmailPlaceholder")}
                  className="w-full rounded-xl border border-border/60 bg-background/50 px-4 py-3.5 text-sm focus:outline-none focus:border-gold focus:ring-1 focus:ring-gold/30 transition placeholder:text-muted-foreground/50 text-foreground"
                />
              </div>

              <div>
                <label
                  htmlFor="form-phone"
                  className="block text-xs tracking-[0.25em] uppercase text-muted-foreground mb-2"
                >
                  {lang === "fr" ? "Téléphone" : lang === "es" ? "Teléfono" : "Phone Number"}
                </label>
                <input
                  id="form-phone"
                  name="phone"
                  type="tel"
                  placeholder={t("competitionFormPhonePlaceholder")}
                  className="w-full rounded-xl border border-border/60 bg-background/50 px-4 py-3.5 text-sm focus:outline-none focus:border-gold focus:ring-1 focus:ring-gold/30 transition placeholder:text-muted-foreground/50 text-foreground"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full rounded-full bg-gold px-6 py-4 text-sm font-bold text-primary-foreground hover:opacity-90 active:scale-[0.98] transition-all shadow-gold cursor-pointer uppercase tracking-[0.2em]"
            >
              {sent
                ? "✓ " + (lang === "fr" ? "Envoyé" : lang === "es" ? "Enviado" : "Sent")
                : t("competitionFormSubmitBtn")}
            </button>

            {sent && (
              <p className="text-center text-sm text-gold font-semibold mt-4 animate-fade-in">
                {t("competitionFormSuccess")}
              </p>
            )}
          </form>
        </div>
      </section>

      {/* CTA */}
      <section className="relative py-24 overflow-hidden">
        <div className="absolute inset-0 bg-gold opacity-95" />
        <div className="relative mx-auto max-w-5xl px-6 text-center text-primary-foreground">
          <h2 className="font-display text-4xl md:text-5xl leading-tight">
            {t("competitionCtaTitle")}
          </h2>
          <p className="mt-4 opacity-90">{t("competitionCtaDesc")}</p>
          <Link
            to={localizedHref("/program")}
            className="mt-8 inline-flex items-center gap-2 rounded-full bg-background px-8 py-3.5 text-sm font-medium text-foreground hover:opacity-90 transition shadow-soft cursor-pointer"
          >
            {t("competitionCtaBtn")}
          </Link>
        </div>
      </section>
    </div>
  );
}

function Field({
  label,
  name,
  type = "text",
  required,
}: {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
}) {
  return (
    <div>
      <label
        htmlFor={name}
        className="block text-xs tracking-[0.25em] uppercase text-muted-foreground mb-2"
      >
        {label}
        {required && <span className="text-primary ml-1">*</span>}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        required={required}
        className="w-full rounded-lg border border-border bg-background px-4 py-3 text-sm focus:outline-none focus:border-primary transition"
      />
    </div>
  );
}
