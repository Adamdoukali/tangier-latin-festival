import { Instagram, Facebook, Youtube, Mail, Phone, Calendar, Menu, X } from "lucide-react";
import { useState } from "react";
import logo from "@/assets/tlf-logo.png";
import { useLanguage, Language } from "@/hooks/useLanguage";

export function TopBar() {
  const { t } = useLanguage();

  return (
    <div className="hidden md:block relative z-[60] border-b border-border/40 bg-background/60 backdrop-blur">
      <div className="mx-auto max-w-7xl px-6 py-2 flex items-center justify-between text-xs text-muted-foreground">
        <div className="flex items-center gap-3">
          <a
            href="https://www.instagram.com/tangierlatinfestival.official"
            aria-label="Instagram"
            className="hover:text-primary transition"
          >
            <Instagram className="h-4 w-4" />
          </a>
          <a
            href="https://www.facebook.com/TangierInternationalLatinfestival/"
            aria-label="Facebook"
            className="hover:text-primary transition"
          >
            <Facebook className="h-4 w-4" />
          </a>
          <a
            href="https://www.youtube.com/@tangierlatinfestival1622"
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
              <a href="tel:+212664010279" className="hover:text-primary transition">+212 6 64 01 02 79</a>
              <span className="text-border">/</span>
              <a href="tel:+212664630632" className="hover:text-primary transition">+212 6 64 63 06 32</a>
            </div>
          </div>
          <span className="flex items-center gap-2 text-primary">
            <Calendar className="h-3.5 w-3.5" />
            <span className="uppercase">
              {t("overviewDates")} {t("overviewYear")}
            </span>
          </span>
        </div>
      </div>
    </div>
  );
}

export function Nav() {
  const { lang, changeLanguage, t } = useLanguage();
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

  const languages: { code: Language; label: string; flag: string }[] = [
    { code: "en", label: "English", flag: "🇺🇸" },
    { code: "fr", label: "Français", flag: "🇫🇷" },
    { code: "es", label: "Español", flag: "🇪🇸" },
  ];

  return (
    <header className="fixed top-0 left-0 right-0 w-full z-50">
      <TopBar />
      <div className="relative z-[55] border-b border-border/40 bg-background/70 backdrop-blur-xl shadow-[0_4px_12px_-4px_rgba(0,0,0,0.08)]">
        <div className="mx-auto max-w-7xl px-4 xl:px-6 h-20 flex items-center justify-between gap-4">
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
                  className={`group relative h-7 w-7 xl:h-9 xl:w-9 rounded-full flex items-center justify-center text-sm xl:text-lg transition-all duration-500 cursor-pointer overflow-visible ${
                    lang === l.code
                      ? "bg-gold/20 scale-115 border border-gold/70 flag-pulse-active shadow-gold z-10"
                      : "border border-transparent bg-background/20 opacity-50 hover:opacity-100 hover:scale-110 hover:rotate-6 hover:-translate-y-0.5 hover:border-gold/45"
                  }`}
                >
                  <span className="relative z-10 select-none">{l.flag}</span>
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
          <div className="flex items-center lg:hidden gap-3">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 border border-border bg-background/55 backdrop-blur-md rounded-full shadow-soft hover:bg-card active:scale-95 transition cursor-pointer text-foreground"
              aria-label="Toggle mobile menu"
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
          className={`absolute top-0 right-0 h-full w-[280px] sm:w-[320px] bg-background/95 backdrop-blur-2xl border-l border-border/40 p-6 flex flex-col justify-between shadow-gold transition-transform duration-300 ease-in-out ${
            mobileMenuOpen ? "translate-x-0" : "translate-x-full"
          }`}
        >
          <div className="space-y-6">
            {/* Header in Drawer */}
            <div className="flex items-center justify-between pb-6 border-b border-border/30">
              <a href={localizedHref("/")} onClick={() => setMobileMenuOpen(false)}>
                <img
                  src={logo}
                  alt="Logo"
                  className="h-8 w-auto dark:brightness-100 brightness-0"
                />
              </a>
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="p-1.5 border border-border bg-card/60 rounded-full hover:bg-card active:scale-95 transition text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Navigation links */}
            <nav className="flex flex-col gap-4 overflow-y-auto max-h-[55vh] pr-2">
              {links.map((l) => (
                <a
                  key={l.href}
                  href={localizedHref(l.href)}
                  onClick={() => setMobileMenuOpen(false)}
                  className="text-foreground/90 hover:text-primary transition font-display text-base tracking-wider uppercase border-b border-border/10 pb-2 flex items-center justify-between"
                >
                  <span>{l.label}</span>
                  {l.isNew && (
                    <span className="bg-destructive text-destructive-foreground text-[10px] font-bold px-1.5 py-0.5 rounded-sm animate-pulse shadow-sm">
                      NEW
                    </span>
                  )}
                </a>
              ))}
            </nav>
          </div>

          {/* Footer in Drawer (Flags and CTA Button) */}
          <div className="space-y-6 pt-6 border-t border-border/30">
            {/* Translation Flag select */}
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase text-muted-foreground tracking-widest font-semibold">
                {lang === "fr" ? "Langue" : lang === "es" ? "Idioma" : "Language"}
              </span>
              <div className="flex items-center gap-2 border border-gold/25 bg-background/45 backdrop-blur-xl rounded-full p-1 shadow-soft">
                {languages.map((l) => (
                  <button
                    key={l.code}
                    onClick={() => {
                      changeLanguage(l.code);
                      setMobileMenuOpen(false);
                    }}
                    className={`h-8 w-8 rounded-full flex items-center justify-center text-sm transition-all duration-300 ${
                      lang === l.code
                        ? "bg-gold/20 border border-gold/70 shadow-sm"
                        : "opacity-40 hover:opacity-100 hover:scale-105"
                    }`}
                  >
                    {l.flag}
                  </button>
                ))}
              </div>
            </div>

            <a
              href={localizedHref("/packs")}
              onClick={() => setMobileMenuOpen(false)}
              className="w-full text-center inline-flex items-center justify-center gap-2 rounded-full bg-gold px-5 py-3 text-sm font-semibold text-primary-foreground shadow-gold hover:opacity-90 active:scale-95 transition duration-300"
            >
              {t("buyPackBtn")}
            </a>
          </div>
        </div>
      </div>
    </header>
  );
}
