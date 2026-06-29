import { createFileRoute, Link } from "@tanstack/react-router";
import { Trophy, Star, Globe2, Flame, ArrowRight } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { z } from "zod";
import { Nav } from "@/components/Nav";
import { RollingNumber } from "@/components/RollingNumber";
import competitionImg from "@/assets/competition.jpg";
import { useLanguage } from "@/hooks/useLanguage";
import { translations, Language } from "@/lib/translations";
import { countries, getFlagEmoji } from "@/lib/countries";

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
  const [isSubmitting, setIsSubmitting] = useState(false);
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
          <p className="text-sm md:text-lg font-bold tracking-[0.4em] uppercase text-primary mb-6 flex items-center justify-center gap-3">
            <Trophy className="h-6 w-6 md:h-8 md:w-8" />
            {t("competitionHeroSubtitle")}
          </p>
          <h1 className="font-display text-4xl md:text-5xl lg:text-6xl xl:text-[4.5rem] leading-[1.1] text-white drop-shadow-xl py-2">
            <span className="block">{t("competitionHeroTitlePart1")}</span>
            <span className="block text-gold italic pr-6 whitespace-nowrap">{t("competitionHeroTitlePart2")}</span>
            <span className="block">{t("competitionHeroTitlePart3")}</span>
          </h1>
          <p className="mt-6 text-slate-300 max-w-3xl mx-auto leading-relaxed drop-shadow-md">
            {t("competitionHeroDesc")}
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <span className="rounded-full border-2 border-white bg-white/20 px-8 py-3 text-sm md:text-lg tracking-[0.25em] uppercase text-white font-bold backdrop-blur-md">
              {t("competitionCategorySalsa")}
            </span>
            <span className="rounded-full border-2 border-white bg-white/20 px-8 py-3 text-sm md:text-lg tracking-[0.25em] uppercase text-white font-bold backdrop-blur-md">
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
          </div>

          {/* Right Column: Title, Description, and Embedded Criteria Progress Bars */}
          <div>
            <h2 className="font-display text-4xl md:text-5xl lg:text-6xl text-foreground leading-[1.1] mb-6">
              <span className="block">{t("competitionHeroTitlePart1")}</span>
              <span className="block text-gold italic pr-6 whitespace-nowrap">{t("competitionHeroTitlePart2")}</span>
              <span className="block">{t("competitionHeroTitlePart3")}</span>
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
                      <span className="font-display text-2xl text-gold tabular-nums">
                        <RollingNumber value={value.toString()} />%
                      </span>
                    </div>
                    <AnimatedProgress value={value} />
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
            onSubmit={async (e) => {
              e.preventDefault();
              setIsSubmitting(true);
              const formData = new FormData(e.currentTarget);
              formData.append("access_key", "132f8460-381d-4f1b-861e-acb51f25e842");
              formData.append("subject", "New Competition Registration");
              
              try {
                await fetch("https://api.web3forms.com/submit", {
                  method: "POST",
                  body: formData,
                });
              } catch (err) {
                console.error(err);
              } finally {
                setIsSubmitting(false);
                setSent(true);
              }
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
                <div className="flex">
                  <select
                    name="phone_country"
                    defaultValue={`${getFlagEmoji("MA")} +212`}
                    className="rounded-l-xl border border-border/60 border-r-0 bg-background/50 px-3 py-3.5 text-sm focus:outline-none focus:border-gold focus:ring-1 focus:ring-gold/30 transition text-foreground max-w-[140px]"
                  >
                    {countries.map(c => {
                      const flag = getFlagEmoji(c.code);
                      return (
                        <option key={c.code} value={`${flag} ${c.dial_code}`}>
                          {flag} {c.dial_code} ({c.code})
                        </option>
                      );
                    })}
                  </select>
                  <input
                    id="form-phone"
                    name="phone"
                    type="tel"
                    placeholder={t("competitionFormPhonePlaceholder")}
                    className="w-full rounded-r-xl border border-border/60 bg-background/50 px-4 py-3.5 text-sm focus:outline-none focus:border-gold focus:ring-1 focus:ring-gold/30 transition placeholder:text-muted-foreground/50 text-foreground"
                  />
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full rounded-xl bg-gold px-4 py-4 text-sm font-bold tracking-widest text-primary-foreground uppercase hover:opacity-90 hover:scale-[1.02] active:scale-[0.98] transition-all shadow-[0_0_20px_rgba(212,175,55,0.3)] hover:shadow-[0_0_30px_rgba(212,175,55,0.5)] cursor-pointer disabled:opacity-70 disabled:hover:scale-100"
            >
              {isSubmitting
                ? (lang === "fr" ? "Envoi en cours..." : lang === "es" ? "Enviando..." : "Sending...")
                : sent
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
      <section className="relative py-24 md:py-32 overflow-hidden border-t border-border/40 select-none">
        <div className="absolute inset-0 bg-gold opacity-95" />
        <div className="relative mx-auto max-w-4xl px-6 text-center space-y-6 text-primary-foreground">
          <p className="text-xs tracking-[0.4em] uppercase font-bold opacity-90">
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
          <p className="opacity-90 max-w-lg mx-auto text-sm md:text-base">
            {lang === "fr"
              ? "Prêt à rejoindre l'événement ? Réservez votre pack et découvrez nos offres exclusives sans plus attendre."
              : lang === "es"
                ? "¿Listo para unirte al evento? Reserva tu pack y descubre nuestras ofertas exclusivas sin perder tiempo."
                : "Ready to join the magic? Reserve your pack and discover our exclusive offers right now."}
          </p>
          <div className="pt-6">
            <a
              href="/#packs"
              className="inline-flex items-center gap-2 rounded-full bg-background px-10 py-5 text-sm font-bold tracking-wider text-foreground uppercase hover:scale-105 active:scale-95 transition-all duration-300 cursor-pointer shadow-soft"
            >
              <span>{t("buyPackBtn")}</span>
              <ArrowRight className="h-5 w-5" />
            </a>
          </div>
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
        type={type}
        id={name}
        name={name}
        required={required}
        className="w-full rounded-xl border border-border/60 bg-background/50 px-4 py-3 text-sm focus:outline-none focus:border-gold focus:ring-1 focus:ring-gold/30 transition placeholder:text-muted-foreground/50 text-foreground"
      />
    </div>
  );
}

function AnimatedProgress({ value }: { value: number }) {
  const [inView, setInView] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setTimeout(() => setInView(true), 200); // Wait 200ms before setting to true to ensure animation runs
          observer.disconnect();
        }
      },
      { threshold: 0.3 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={ref} className="mt-4 h-3 rounded-full bg-secondary/50 overflow-hidden border border-border/30 shadow-inner">
      <div
        className="relative h-full bg-gradient-to-r from-rose-500 to-orange-500 rounded-full transition-all ease-out overflow-hidden shadow-[0_0_10px_rgba(244,63,94,0.5)]"
        style={{ width: inView ? `${value}%` : "0%", transitionDuration: "1500ms" }}
      >
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/50 to-transparent w-[200%] animate-progress-shimmer" />
      </div>
    </div>
  );
}

