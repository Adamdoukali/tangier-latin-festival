import { Instagram, Facebook, Youtube, Mail, Phone, Calendar, Menu, X, User } from "lucide-react";
import { useEffect, useState } from "react";
import { useLocation } from "@tanstack/react-router";
import logo from "@/assets/tlf-logo.png";
import { useLanguage, Language } from "@/hooks/useLanguage";

export function TopBar() {
  const { lang, t } = useLanguage();

  const partnerLabel =
    lang === "fr" ? "Espace Partenaire" : lang === "es" ? "Área Colaboradores" : "Partner Portal";

  return (
    <div className="hidden md:block relative z-[60] border-b border-border/40 bg-background/60 backdrop-blur">
      <div className="mx-auto max-w-7xl px-6 py-2 flex items-center justify-between text-xs text-muted-foreground">
        <div className="flex items-center gap-3">
          <a
            href="https://www.instagram.com/tangierlatinfestival.official"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Instagram"
            className="hover:text-primary transition"
          >
            <Instagram className="h-4 w-4" />
          </a>
          <a
            href="https://www.facebook.com/TangierInternationalLatinfestival/"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Facebook"
            className="hover:text-primary transition"
          >
            <Facebook className="h-4 w-4" />
          </a>
          <a
            href="https://www.youtube.com/@tangierlatinfestival1622"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="YouTube"
            className="hover:text-primary transition"
          >
            <Youtube className="h-4 w-4" />
          </a>
        </div>
        <div className="flex items-center gap-6">
          <a
            href="mailto:contact@tangierlatinfestival.com"
            className="flex items-center gap-2 hover:text-primary transition"
          >
            <Mail className="h-3.5 w-3.5" />
            <span>contact@tangierlatinfestival.com</span>
          </a>
          <div className="flex items-center gap-2">
            <Phone className="h-3.5 w-3.5" />
            <div className="flex items-center gap-1.5">
              <a href="tel:+212664010279" className="hover:text-primary transition">
                +212 6 64 01 02 79
              </a>
              <span className="text-border">/</span>
              <a href="tel:+212664630632" className="hover:text-primary transition">
                +212 6 64 63 06 32
              </a>
            </div>
          </div>
          <span className="flex items-center gap-2 text-primary">
            <Calendar className="h-3.5 w-3.5" />
            <span className="uppercase">
              {t("overviewDates")} {t("overviewYear")}
            </span>
          </span>
          <a
            href={lang && lang !== "en" ? `/partner?lang=${lang}` : "/partner"}
            className="flex items-center gap-1.5 font-semibold text-amber-400 hover:text-amber-300 transition bg-amber-400/10 hover:bg-amber-400/20 px-3 py-1 rounded-full border border-amber-400/30"
          >
            <User className="h-3.5 w-3.5" />
            <span>{partnerLabel}</span>
          </a>
        </div>
      </div>
    </div>
  );
}

export function Nav() {
  const { lang, changeLanguage, t } = useLanguage();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const langSuffix = lang && lang !== "en" ? `?lang=${lang}` : "";

  const localizedHref = (href: string) => {
    if (href.includes("#")) {
      const [path, hash] = href.split("#");
      return `${path}${langSuffix}#${hash}`;
    }
    return `${href}${langSuffix}`;
  };

  const links = [
    { href: "/", label: t("navHome") },
    { href: "/program", label: t("navProgram") },
    { href: "/competition", label: t("navCompetition") },
    { href: "/hotel", label: t("navHotel") },
    { href: "/tourism", label: t("navTourism") },
    { href: "/partners", label: t("navPartners") },
    { href: "/gallery", label: t("navGallery") },
    { href: "/reels", label: t("navReels"), isNew: true },
    { href: "/testimonials", label: t("navTestimonials") },
    { href: "/artists", label: t("navArtists") },
    { href: "/#contact", label: t("navContact") },
  ];

  const languages: { code: Language; label: string; flagUrl: string }[] = [
    { code: "en", label: "English", flagUrl: "https://flagcdn.com/us.svg" },
    { code: "fr", label: "Français", flagUrl: "https://flagcdn.com/fr.svg" },
    { code: "es", label: "Español", flagUrl: "https://flagcdn.com/es.svg" },
  ];

  const isActiveLink = (href: string) => {
    const path = href.split("#")[0] || "/";
    if (href.includes("#")) return false;
    return path === "/"
      ? location.pathname === "/"
      : location.pathname === path || location.pathname.startsWith(`${path}/`);
  };

  useEffect(() => {
    if (!mobileMenuOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [mobileMenuOpen]);

  return (
    <header className="fixed top-0 left-0 right-0 w-full z-50">
      <TopBar />
      <div className="relative z-[55] border-b border-border/40 bg-background/70 backdrop-blur-xl shadow-[0_4px_12px_-4px_rgba(0,0,0,0.08)]">
        <div className="mx-auto max-w-7xl px-4 xl:px-6 h-16 lg:h-20 flex items-center justify-between gap-3 lg:gap-4">
          <a href={localizedHref("/")} className="flex items-center gap-3 shrink-0 mr-2">
            <img
              src={logo}
              alt="Tangier Latin Festival"
              className="h-8 md:h-10 w-auto max-w-[120px] md:max-w-[140px] object-contain transition duration-300 dark:brightness-100 brightness-0 shrink-0"
            />
          </a>

          {/* Desktop Nav */}
          <nav className="hidden lg:flex items-center justify-center gap-0.5 xl:gap-2 flex-1 min-w-0">
            {links.map((l) => (
              <a
                key={l.href}
                href={localizedHref(l.href)}
                className="relative text-foreground/80 hover:text-primary transition tracking-wider uppercase text-[9px] lg:text-[10px] xl:text-[11px] font-semibold whitespace-nowrap px-0.5 xl:px-1 py-2"
              >
                {l.label}
                {l.isNew && (
                  <span className="absolute -top-1.5 -right-2 bg-destructive text-destructive-foreground text-[8px] font-bold px-1 py-0.5 rounded-sm animate-pulse shadow-sm">
                    NEW
                  </span>
                )}
              </a>
            ))}
          </nav>

          <div className="hidden lg:flex items-center gap-1.5 xl:gap-3 shrink-0">
            {/* Premium Golden Flag Selector Dock */}
            <div className="flex items-center gap-1.5 xl:gap-3 border border-gold/25 bg-background/45 backdrop-blur-xl rounded-full p-1 xl:p-1.5 shadow-gold hover:border-gold/55 transition duration-300">
              {languages.map((l) => (
                <button
                  key={l.code}
                  onClick={() => changeLanguage(l.code)}
                  className={`group relative h-7 w-7 xl:h-9 xl:w-9 rounded-full flex items-center justify-center transition-all duration-500 cursor-pointer overflow-visible ${
                    lang === l.code
                      ? "bg-gold/20 scale-115 border border-gold/70 flag-pulse-active shadow-gold z-10"
                      : "border border-transparent bg-background/20 opacity-50 hover:opacity-100 hover:scale-110 hover:rotate-6 hover:-translate-y-0.5 hover:border-gold/45"
                  }`}
                >
                  <span className="relative z-10 select-none flex items-center justify-center">
                    <img
                      src={l.flagUrl}
                      alt={l.label}
                      className="w-4 h-4 xl:w-5 xl:h-5 rounded-full object-cover shadow-sm"
                    />
                  </span>
                  <span className="absolute inset-0 rounded-full bg-gradient-to-tr from-white/0 via-white/10 to-white/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                  <span className="absolute -top-8 left-1/2 -translate-x-1/2 bg-black/90 border border-gold/30 text-gold text-[9px] font-bold tracking-widest uppercase px-2 py-0.5 rounded-md opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none shadow-gold font-mono whitespace-nowrap z-50">
                    {l.code}
                  </span>
                </button>
              ))}
            </div>

            <a
              href={localizedHref("/packs")}
              className="inline-flex items-center gap-1.5 xl:gap-2 rounded-full bg-gold px-3 py-1.5 xl:px-5 xl:py-2.5 text-xs xl:text-sm font-medium text-primary-foreground shadow-gold hover:opacity-90 transition"
            >
              {t("buyPackBtn")}
            </a>
          </div>

          {/* Mobile Hamburg Trigger */}
          <div className="flex items-center lg:hidden gap-2">
            <div
              className="flex items-center gap-0.5 rounded-full border border-border bg-background/70 p-0.5 shadow-soft backdrop-blur-md"
              role="group"
              aria-label={
                lang === "fr"
                  ? "Changer de langue"
                  : lang === "es"
                    ? "Cambiar idioma"
                    : "Change language"
              }
            >
              {languages.map((language) => (
                <button
                  key={language.code}
                  type="button"
                  onClick={() => changeLanguage(language.code)}
                  aria-label={language.label}
                  aria-pressed={lang === language.code}
                  className={`flex h-7 w-7 cursor-pointer items-center justify-center rounded-full transition active:scale-95 ${
                    lang === language.code
                      ? "bg-black shadow-sm ring-1 ring-black"
                      : "opacity-55 hover:bg-card hover:opacity-100"
                  }`}
                >
                  <img
                    src={language.flagUrl}
                    alt=""
                    className="h-4 w-4 rounded-full object-cover shadow-sm"
                  />
                </button>
              ))}
            </div>
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 border border-border bg-background/70 backdrop-blur-md rounded-full shadow-soft hover:bg-card active:scale-95 transition cursor-pointer text-foreground"
              aria-label="Toggle mobile menu"
              aria-expanded={mobileMenuOpen}
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer (Slide Out Side Panel) */}
      <div
        className={`fixed inset-0 z-[100] transition-opacity duration-300 ${
          mobileMenuOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
      >
        {/* Backdrop overlay */}
        <div
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          onClick={() => setMobileMenuOpen(false)}
        />

        {/* Drawer Casing */}
        <div
          className={`absolute top-0 right-0 h-[100dvh] w-[min(82vw,300px)] bg-background/95 backdrop-blur-2xl border-l border-border/40 px-4 py-3 flex flex-col overflow-hidden shadow-gold transition-transform duration-300 ease-in-out ${
            mobileMenuOpen ? "translate-x-0" : "translate-x-full"
          }`}
        >
          <div className="flex min-h-0 flex-col gap-2">
            {/* Header in Drawer */}
            <div className="flex h-11 items-center justify-between border-b border-border/30 pb-2 shrink-0">
              <a href={localizedHref("/")} onClick={() => setMobileMenuOpen(false)}>
                <img
                  src={logo}
                  alt="Logo"
                  className="h-7 w-auto dark:brightness-100 brightness-0"
                />
              </a>
              <div className="flex items-center gap-1.5">
                <div
                  className="flex items-center gap-0.5 rounded-full border border-border/70 bg-card/60 p-0.5"
                  role="group"
                  aria-label={
                    lang === "fr"
                      ? "Changer de langue"
                      : lang === "es"
                        ? "Cambiar idioma"
                        : "Change language"
                  }
                >
                  {languages.map((language) => (
                    <button
                      key={language.code}
                      type="button"
                      onClick={() => changeLanguage(language.code)}
                      aria-label={language.label}
                      aria-pressed={lang === language.code}
                      className={`flex h-6 w-6 items-center justify-center rounded-full transition active:scale-95 ${
                        lang === language.code ? "bg-black" : "opacity-50 hover:opacity-100"
                      }`}
                    >
                      <img
                        src={language.flagUrl}
                        alt=""
                        className="h-3.5 w-3.5 rounded-full object-cover shadow-sm"
                      />
                    </button>
                  ))}
                </div>
                <button
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-1.5 border border-border bg-card/60 rounded-full hover:bg-card active:scale-95 transition text-foreground"
                  aria-label="Close mobile menu"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Navigation links */}
            <nav className="flex min-h-0 flex-col" aria-label="Mobile navigation">
              {links.map((l) => {
                const active = isActiveLink(l.href);
                return (
                  <a
                    key={l.href}
                    href={localizedHref(l.href)}
                    onClick={() => setMobileMenuOpen(false)}
                    aria-current={active ? "page" : undefined}
                    className={`relative flex min-h-0 items-center justify-between border-b border-border/10 py-[clamp(0.15rem,0.55vh,0.35rem)] pl-4 pr-2 font-display text-[13px] leading-5 tracking-[0.08em] uppercase transition ${
                      active
                        ? "bg-black/5 font-semibold text-black"
                        : "text-foreground/85 hover:bg-black/5 hover:text-black"
                    }`}
                  >
                    <span
                      aria-hidden="true"
                      className={`absolute inset-y-1 left-0 w-1 rounded-r-full bg-black transition-opacity ${
                        active ? "opacity-100" : "opacity-0"
                      }`}
                    />
                    <span>{l.label}</span>
                    {l.isNew && (
                      <span className="rounded-sm bg-destructive px-1.5 py-0.5 text-[9px] font-bold text-destructive-foreground shadow-sm">
                        NEW
                      </span>
                    )}
                  </a>
                );
              })}
            </nav>
          </div>

          {/* Compact Drawer Actions */}
          <div className="grid shrink-0 gap-2 border-t border-border/30 pt-2">
            <a
              href={lang && lang !== "en" ? `/partner?lang=${lang}` : "/partner"}
              onClick={() => setMobileMenuOpen(false)}
              className="inline-flex h-9 w-full items-center justify-center gap-2 rounded-full border border-amber-400/40 bg-amber-400/10 px-4 text-[11px] font-semibold text-amber-500 transition hover:bg-amber-400/20 active:scale-95"
            >
              <User className="h-3.5 w-3.5" />
              <span>
                {lang === "fr"
                  ? "Espace Partenaire"
                  : lang === "es"
                    ? "Área Colaboradores"
                    : "Partner Portal"}
              </span>
            </a>

            <a
              href={localizedHref("/packs")}
              onClick={() => setMobileMenuOpen(false)}
              className="inline-flex h-9 w-full items-center justify-center gap-2 rounded-full bg-gold px-4 text-xs font-semibold text-primary-foreground shadow-gold transition hover:opacity-90 active:scale-95"
            >
              {t("buyPackBtn")}
            </a>
          </div>
        </div>
      </div>
    </header>
  );
}
