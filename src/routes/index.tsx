import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect, useRef, useCallback } from "react";
import { getActivePacks } from "@/lib/admin-store";
import { GALLERY_PHOTOS } from "@/routes/gallery";
import tlfLogo from "@/assets/tlf-logo.png";
import {
  MapPin,
  Calendar,
  Mail,
  Phone,
  Instagram,
  Facebook,
  Youtube,
  Check,
  Play,
  Quote,
  X,
  User,
  Globe,
  Users,
  ChevronDown,
  CheckCircle2,
  Sparkles,
  ArrowRight,
} from "lucide-react";
import heroImg from "@/assets/hero.jpg";
import about2Img from "@/assets/about2.jpg";
import about3Img from "@/assets/about3.jpg";
import tangierVideoThumb from "@/assets/tangier-video-thumb.png";
import a1 from "@/assets/artist1.jpg";
import a2 from "@/assets/artist2.jpg";
import a3 from "@/assets/artist3.jpg";
import a4 from "@/assets/artist4.jpg";
import g1 from "@/assets/gallery1.jpg";
import g2 from "@/assets/gallery2.jpg";
import g3 from "@/assets/gallery3.jpg";
import g4 from "@/assets/gallery4.jpg";
import partnerSalsero from "@/assets/partner-salsero.png";
import partnerSalsaGroup from "@/assets/partner-salsagroup.png";
import partnerSummerBachata from "@/assets/partner-summerbachata.png";
import partnerBachataSpain from "@/assets/partner-bachataspain.png";
import partnerBachataWorld from "@/assets/partner-bachataworld.png";
import partnerAllIn from "@/assets/partner-allin.png";
import { Countdown } from "@/components/Countdown";
import { Nav } from "@/components/Nav";
import { RollingNumber } from "@/components/RollingNumber";
import { PackBookingModal } from "@/components/PackBookingModal";
import { useLanguage } from "@/hooks/useLanguage";
import {
  translations,
  translatedStats,
  translatedPacks,
  translatedTestimonials,
  translatedHomeProgramme,
  Language,
} from "@/lib/translations";
import { countries } from "@/lib/countries";

export const Route = createFileRoute("/")({
  head: (ctx) => {
    const search = (ctx.search || {}) as { lang?: string };
    const lang = (search?.lang || "en") as Language;
    const dict = translations[lang] || translations.en;
    return {
      meta: [
        { title: dict.seoHomeTitle },
        { name: "description", content: dict.seoHomeDesc },
        { property: "og:title", content: dict.seoHomeTitle },
        { property: "og:description", content: dict.seoHomeDesc },
      ],
    };
  },
  component: Home,
});

const artists = [
  { name: "Talal", style: "Salsa", img: a1 },
  { name: "Vaneska Lopez", style: "Salsa", img: a2 },
  { name: "Junior", style: "Bachata", img: a3 },
  { name: "Andy & Saray", style: "Bachata", img: a4 },
];

function Home() {
  const [videoOpen, setVideoOpen] = useState(false);
  const [secondVideoOpen, setSecondVideoOpen] = useState(false);
  const [selectedPack, setSelectedPack] = useState<{
    name: string;
    sub: string;
    price: string;
  } | null>(null);
  const { lang, t } = useLanguage();

  const langSuffix = lang && lang !== "en" ? `?lang=${lang}` : "";
  const localizedHref = (href: string) => {
    if (href.includes("#")) {
      const [path, hash] = href.split("#");
      return `${path}${langSuffix}#${hash}`;
    }
    return `${href}${langSuffix}`;
  };

  const stats = translatedStats[lang] || translatedStats.en;

  // Use admin-managed packs from localStorage if available, otherwise fall back to hardcoded
  const [packs, setDynamicPacks] = useState(
    translatedPacks[lang] || translatedPacks.en
  );
  useEffect(() => {
    const fetchPacks = async () => {
      const adminPacks = await getActivePacks();
      if (adminPacks.length > 0) {
        setDynamicPacks(
          adminPacks.map((p) => ({
            id: p.id,
            name: p.name,
            sub: p.sub,
            price: p.price,
            features: p.features,
            popular: p.popular,
          }))
        );
      }
    };
    fetchPacks();
  }, []);
  const testimonials = translatedTestimonials[lang] || translatedTestimonials.en;
  const programme = translatedHomeProgramme[lang] || translatedHomeProgramme.en;

  return (
    <div className="min-h-screen pt-20">
      <Nav />

      {/* HERO */}
      <section id="home" className="relative overflow-hidden min-h-screen flex items-center bg-slate-950">
        {/* YouTube video background */}
        <div className="absolute inset-0 overflow-hidden">
          <iframe
            src="https://www.youtube.com/embed/QN8LsEhzxy0?autoplay=1&mute=1&loop=1&playlist=QN8LsEhzxy0&controls=0&showinfo=0&rel=0&modestbranding=1&playsinline=1&iv_load_policy=3"
            title="Hero background video"
            allow="autoplay; encrypted-media"
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[100vw] h-[56.25vw] min-w-[177.77vh] min-h-[100vh] pointer-events-none scale-[1.25]"
          />
          {/* Dark overlay so text stays readable */}
          <div className="absolute inset-0 hero-overlay" />
        </div>

        {/* Hero content */}
        <div className="relative w-full mx-auto max-w-7xl px-6 pt-12 md:pt-32 pb-32 md:pb-40 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/30 bg-white/10 px-4 py-1.5 text-xs tracking-[0.25em] uppercase text-white">
            <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" />
            {t("heroEdition")}
          </div>

          <h1 className="mt-8 font-display text-4xl md:text-6xl lg:text-7xl leading-[0.95] max-w-5xl mx-auto text-white">
            {t("heroTitlePart1")}
            <br />
            {t("heroTitlePart2")}
            <br />
            <span className="text-gold italic pr-4">{t("heroTitleSub")}</span>
          </h1>

          <div className="mt-10 flex flex-wrap justify-center gap-x-12 gap-y-4 text-lg md:text-xl lg:text-2xl font-bold tracking-[0.15em] md:tracking-[0.2em] uppercase text-white">
            <span className="flex items-center gap-3 drop-shadow-md">
              <Calendar className="h-5 w-5 md:h-6 md:w-6 text-primary" /> {t("overviewDates")} {t("overviewYear")}
            </span>
            <span className="flex items-center gap-3 drop-shadow-md">
              <MapPin className="h-5 w-5 md:h-6 md:w-6 text-primary" /> {t("overviewLocation")}
            </span>
          </div>

          <p className="mt-8 text-white font-bold tracking-[0.25em] md:tracking-[0.4em] text-sm md:text-base uppercase drop-shadow-md">
            Salsa · Bachata · Kizomba · Competition
          </p>

          {/* Big play button */}
          <div className="mt-12 flex flex-col items-center gap-3">
            <button
              id="hero-play-btn"
              onClick={() => setVideoOpen(true)}
              aria-label="Watch the festival recap"
              className="group relative flex items-center justify-center h-20 w-20 rounded-full bg-white/15 backdrop-blur-sm border-2 border-white/60 hover:bg-white/25 hover:border-white transition-all duration-300 hover:scale-110 shadow-gold cursor-pointer"
            >
              {/* Pulsing ring */}
              <span className="absolute inset-0 rounded-full border-2 border-white/40 animate-ping" />
              <Play className="h-8 w-8 text-white fill-white translate-x-0.5" />
            </button>
            <span className="text-white/70 text-xs tracking-[0.25em] uppercase">
              {t("watchRecap")}
            </span>
          </div>

          <div className="mt-10 flex flex-wrap justify-center gap-4">
            <a
              href={localizedHref("/#packs")}
              className="inline-flex items-center gap-2 rounded-full bg-gold px-7 py-3.5 text-sm font-medium text-primary-foreground shadow-gold hover:opacity-90 transition"
            >
              {t("ctaGetPackBtn")}
            </a>
          </div>

          <div className="mt-16">
            <Countdown />
          </div>
        </div>

        <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-b from-transparent to-background pointer-events-none" />
      </section>

      {/* VIDEO MODAL */}
      {videoOpen && (
        <div
          id="video-modal"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-0 md:p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) setVideoOpen(false);
          }}
        >
          <div className="relative w-full max-w-5xl">
            {/* Close button */}
            <button
              onClick={() => setVideoOpen(false)}
              aria-label="Close video"
              className="absolute -top-10 md:-top-12 right-2 md:right-0 z-10 text-white hover:text-white/80 text-xs md:text-sm tracking-widest uppercase transition cursor-pointer"
            >
              {t("closeBtn")}
            </button>
            <div className="relative rounded-none md:rounded-2xl overflow-hidden shadow-gold border-y md:border border-white/10">
              <div className="aspect-video">
                <iframe
                  src="https://www.youtube.com/embed/QN8LsEhzxy0?autoplay=1&rel=0&modestbranding=1"
                  title={t("recapsTitle")}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                  className="h-full w-full"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* OVERVIEW */}
      <section id="festival" className="py-28">
        <div className="mx-auto max-w-7xl px-6 grid lg:grid-cols-2 gap-16 items-center">
          <div className="grid grid-cols-2 gap-4">
            <img
              src={about2Img}
              alt="Festival dancers"
              width={1024}
              height={683}
              loading="lazy"
              className="rounded-2xl object-cover h-72 w-full shadow-soft"
            />
            <img
              src={about3Img}
              alt="Festival atmosphere"
              width={800}
              height={600}
              loading="lazy"
              className="rounded-2xl object-cover h-72 w-full mt-12 shadow-soft"
            />
            <img
              src={g1}
              alt="Festival hall"
              width={1024}
              height={768}
              loading="lazy"
              className="rounded-2xl object-cover h-72 w-full -mt-8 shadow-soft"
            />
            <img
              src={g2}
              alt="Stage"
              width={1024}
              height={768}
              loading="lazy"
              className="rounded-2xl object-cover h-72 w-full shadow-soft"
            />
          </div>

          <div>
            <p className="text-sm md:text-base font-sans font-semibold tracking-[0.25em] uppercase text-primary mb-4">
              {t("overviewSubtitle")}
            </p>
            <h2 className="font-display text-4xl md:text-5xl leading-tight">
              Welcome to the{" "}
              <span className="text-gold italic py-1 leading-normal block md:inline-block">
                {t("heroTitlePart1")} {t("heroTitlePart2")}
              </span>
            </h2>
            <p className="mt-6 text-muted-foreground leading-relaxed">{t("overviewDesc1")}</p>
            <p className="mt-4 text-muted-foreground leading-relaxed">{t("overviewDesc2")}</p>

            <div className="mt-10 grid grid-cols-2 gap-6">
              <div className="border-l-2 border-primary pl-5">
                <p className="text-xs tracking-[0.3em] uppercase text-muted-foreground">
                  {t("overviewWhere")}
                </p>
                <p className="mt-2 font-display text-xl">{t("overviewHotel")}</p>
                <p className="text-sm text-muted-foreground">{t("overviewLocation")}</p>
              </div>
              <div className="border-l-2 border-primary pl-5">
                <p className="text-xs tracking-[0.3em] uppercase text-muted-foreground">
                  {t("overviewWhen")}
                </p>
                <p className="mt-2 font-display text-xl">{t("overviewDates")}</p>
                <p className="text-sm text-muted-foreground">{t("overviewYear")}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* TANGIER VIDEO */}
      <section className="py-20 bg-card/30">
        <div className="mx-auto max-w-5xl px-6">
          <div className="text-center mb-10">
            <h2 className="font-display text-2xl md:text-3xl lg:text-4xl text-foreground/90 max-w-3xl mx-auto leading-relaxed">
              Tanger, carrefour des cultures et scène incontournable des danses latines.
            </h2>
            <p className="mt-4 text-xs tracking-[0.25em] uppercase text-primary font-semibold">
              (voir vidéo ci-dessous)
            </p>
          </div>
          <div 
            className="relative rounded-2xl overflow-hidden shadow-gold aspect-video bg-black/50 border border-border/40 group cursor-pointer"
            onClick={() => setSecondVideoOpen(true)}
          >
            {!secondVideoOpen ? (
              <>
                <img
                  src="https://img.youtube.com/vi/kea-jNdyh6Y/hqdefault.jpg"
                  alt="Tangier Latin Festival Video"
                  className="w-full h-full object-cover group-hover:scale-105 transition duration-700"
                />
                <div className="absolute inset-0 bg-black/40 group-hover:bg-black/50 transition" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="relative flex items-center justify-center h-20 w-20 rounded-full bg-white/20 backdrop-blur border-2 border-white group-hover:scale-110 transition shadow-gold">
                    <span className="absolute inset-0 rounded-full border-2 border-white/40 animate-ping" />
                    <Play className="h-8 w-8 text-white fill-white translate-x-0.5" />
                  </div>
                </div>
              </>
            ) : (
              <iframe
                src="https://www.youtube.com/embed/kea-jNdyh6Y?autoplay=1&rel=0"
                className="absolute inset-0 w-full h-full border-0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                title="Tanger, carrefour des cultures et scène incontournable des danses latines"
              />
            )}
          </div>
        </div>
      </section>

      {/* STATS */}
      <section className="stats-section py-24 border-y border-border/40 bg-card/30">
        <div className="mx-auto max-w-7xl px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 lg:gap-8">
            {stats.map((s, i) => (
              <div
                key={s.l}
                className="stats-card"
                style={{ animationDelay: `${i * 80}ms` }}
              >
                <div className="stats-card-accent" />
                <div className="stats-value">
                  <RollingNumber value={s.v} duration={2200 + i * 150} />
                </div>
                <div className="stats-label">{s.l}</div>
              </div>
            ))}
          </div>
        </div>
      </section>


      {/* ARTISTS */}
      <section id="artists" className="py-28">
        <div className="mx-auto max-w-7xl px-6">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 mb-14">
            <div>
              <p className="text-sm md:text-base font-sans font-semibold tracking-[0.25em] uppercase text-primary mb-4">
                {t("lineupSubtitle")}
              </p>
              <h2 className="font-display text-5xl md:text-6xl">
                Discover our <span className="text-gold italic py-1 leading-normal inline-block">artists</span>
              </h2>
              <p className="mt-4 text-muted-foreground max-w-xl">{t("lineupDesc")}</p>
            </div>
            <Link
              to={localizedHref("/artists")}
              className="text-sm tracking-[0.2em] uppercase text-primary hover:opacity-80 transition self-start md:self-auto"
            >
              {t("seeAllArtistsBtn")}
            </Link>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
            {artists.map((a) => (
              <article
                key={a.name}
                className="group relative overflow-hidden rounded-2xl bg-card border border-border/50"
              >
                <div className="aspect-[3/4] overflow-hidden">
                  <img
                    src={a.img}
                    alt={a.name}
                    width={768}
                    height={1024}
                    loading="lazy"
                    className="h-full w-full object-cover transition duration-700 group-hover:scale-105"
                  />
                </div>
                <div className="absolute inset-0 bg-gradient-to-t from-background via-background/30 to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-6">
                  <p className="text-[10px] tracking-[0.3em] uppercase text-primary">{a.style}</p>
                  <h3 className="mt-1 font-display text-2xl">{a.name}</h3>
                </div>
              </article>
            ))}
          </div>
          <div className="mt-10 text-center">
            <Link
              to={localizedHref("/artists")}
              className="inline-flex items-center gap-2 px-8 py-3 rounded-full bg-foreground text-background text-sm font-bold tracking-widest uppercase hover:opacity-80 transition cursor-pointer"
            >
              {t("viewAllArtistsBtn")}
            </Link>
          </div>
        </div>
      </section>

      

      {/* PROGRAMME */}
      <section id="programme" className="py-28">
        <div className="mx-auto max-w-7xl px-6">
          <div className="text-center mb-16">
            <p className="text-sm md:text-base font-sans font-semibold tracking-[0.25em] uppercase text-primary mb-4">
              {t("programmeSubtitle")}
            </p>
            <h2 className="font-display text-5xl md:text-6xl">{t("programmeTitle")}</h2>
            <p className="mt-4 text-muted-foreground max-w-2xl mx-auto">{t("programmeDesc")}</p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {programme.map((d) => (
              <div
                key={d.day}
                className="rounded-2xl border border-border/60 bg-card/60 p-8 hover:border-primary/50 transition flex flex-col"
              >
                <div className="flex items-baseline justify-between border-b border-border/60 pb-5">
                  <span className="font-display text-3xl text-gold">{d.day}</span>
                  <span className="text-[10px] tracking-[0.25em] uppercase text-muted-foreground">
                    {d.date}
                  </span>
                </div>
                <ul className="mt-6 space-y-6 flex-1">
                  {d.items.map((i) => (
                    <li key={i.t}>
                      <p className="font-display text-xl">{i.t}</p>
                      <p className="mt-1 text-xs text-primary tracking-[0.2em] uppercase">
                        {i.time}
                      </p>
                      <p className="text-sm text-muted-foreground">{i.place}</p>
                    </li>
                  ))}
                </ul>
                <div className="mt-8 pt-6 border-t border-border/60">
                  <Link
                    to={localizedHref("/program")}
                    className="text-destructive hover:opacity-80 text-[11px] font-bold tracking-[0.2em] uppercase inline-flex items-center gap-2 transition"
                  >
                    {t("viewFullScheduleBtn")}
                  </Link>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-12 text-center">
            <Link
              to={localizedHref("/program")}
              className="inline-flex items-center gap-2 rounded-full bg-gold px-8 py-3.5 text-sm font-medium text-primary-foreground shadow-gold hover:opacity-90 transition cursor-pointer"
            >
              {t("viewFullScheduleBtn")}
            </Link>
          </div>
        </div>
      </section>

      {/* PACKS */}
      <section id="packs" className="py-28 bg-card/30 border-y border-border/40">
        <div className="mx-auto max-w-7xl px-6">
          <div className="text-center mb-16">
            <p className="text-sm md:text-base font-sans font-semibold tracking-[0.25em] uppercase text-primary mb-4">
              {t("packsSubtitle")}
            </p>
            <h2 className="font-display text-5xl md:text-6xl">{t("packsTitle")}</h2>
            <p className="mt-4 text-muted-foreground max-w-xl mx-auto">{t("packsDesc")}</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {packs.slice(0, 3).map((p) => {
              const isPopular = p.popular;
              return (
                <div
                  key={p.id || `${p.name}-${p.sub}`}
                  className={`group relative rounded-[2rem] p-8 md:p-10 flex flex-col transition-all duration-500 hover:-translate-y-2 ${
                    isPopular
                      ? "bg-gradient-to-b from-card/80 to-card/40 backdrop-blur-xl border-2 border-primary/50 shadow-2xl shadow-primary/20 md:-mt-4 md:mb-[-16px]"
                      : "bg-card/30 backdrop-blur-md border border-border/60 hover:border-primary/40 shadow-xl hover:shadow-2xl hover:shadow-primary/10"
                  }`}
                >
                  {/* Glassmorphism reflection highlight */}
                  <div className="absolute inset-0 rounded-[2rem] bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />

                  {isPopular && (
                    <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-gradient-to-r from-primary to-amber-500 text-primary-foreground text-[10px] md:text-xs font-black tracking-widest uppercase px-5 py-2 rounded-full shadow-lg shadow-primary/40">
                      {t("popularBadge")}
                    </div>
                  )}

                  <div className="relative z-10 flex flex-col flex-1">
                    <h3 className="font-display text-3xl md:text-4xl font-bold text-foreground group-hover:text-primary transition-colors duration-300">
                      {p.name}
                    </h3>
                    <p className="text-[10px] md:text-xs tracking-[0.25em] uppercase text-muted-foreground mt-3 font-semibold">
                      {p.sub}
                    </p>

                    <div className="mt-8 md:mt-10 flex items-end gap-2">
                      <span className="font-display text-5xl md:text-6xl font-black tracking-tighter text-foreground leading-none">
                        {p.price}
                      </span>
                      <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-1 md:mb-2">
                        {p.currency || "€"} / {t("perPackLabel")}
                      </span>
                    </div>

                    <div className="my-8 md:my-10 h-px w-full bg-gradient-to-r from-border/80 via-border/30 to-transparent" />

                    <ul className="space-y-4 md:space-y-5 flex-1">
                      {p.features.map((f) => (
                        <li key={f} className="flex items-start gap-4">
                          <div
                            className={`mt-0.5 shrink-0 rounded-full p-1.5 transition-colors duration-300 ${
                              isPopular
                                ? "bg-primary/20 text-primary"
                                : "bg-muted text-muted-foreground group-hover:bg-primary/15 group-hover:text-primary"
                            }`}
                          >
                            <Check className="h-3.5 w-3.5 md:h-4 md:w-4 stroke-[3]" />
                          </div>
                          <span className="text-sm md:text-base font-medium text-foreground/90 leading-snug">
                            {f}
                          </span>
                        </li>
                      ))}
                    </ul>

                    <button
                      onClick={() =>
                        setSelectedPack({
                          name: p.name,
                          sub: p.sub,
                          price: p.price,
                        })
                      }
                      className={`mt-10 md:mt-12 w-full rounded-2xl py-4 md:py-5 text-sm md:text-base font-bold tracking-widest uppercase transition-all duration-300 cursor-pointer overflow-hidden relative ${
                        isPopular
                          ? "bg-primary text-primary-foreground shadow-[0_0_30px_-5px_rgba(212,175,55,0.4)] hover:shadow-[0_0_40px_-5px_rgba(212,175,55,0.6)] hover:scale-[1.03]"
                          : "bg-card border border-border/80 text-foreground hover:bg-primary hover:border-primary hover:text-primary-foreground hover:shadow-lg hover:shadow-primary/30 hover:scale-[1.03]"
                      }`}
                    >
                      <span className="relative z-10">
                        {isPopular ? t("getStartedBtn") : t("choosePackBtn")}
                      </span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-16 text-center">
            <a
              href="/packs"
              className="inline-flex items-center gap-2 rounded-full border border-gold px-8 py-4 text-sm font-semibold text-gold hover:bg-gold hover:text-primary-foreground shadow-[0_0_20px_-5px_rgba(212,175,55,0.3)] hover:shadow-gold transition-all duration-300 cursor-pointer"
            >
              {t("seeAllPacksBtn") || "See all packs"}
            </a>
          </div>
        </div>
      </section>

      {/* PACK BOOKING MODAL */}
      {selectedPack && (
        <PackBookingModal pack={selectedPack} onClose={() => setSelectedPack(null)} />
      )}

      {/* DANCE PARTNERS */}
      <section className="py-20 border-y border-border/40">
        <div className="mx-auto max-w-6xl px-6">
          <div className="text-center mb-12">
            <p className="text-sm md:text-base font-sans font-semibold tracking-[0.25em] uppercase text-primary mb-4">
              {t("partnersSubtitle")}
            </p>
            <h2 className="font-display text-5xl md:text-6xl">{t("partnersTitle")}</h2>
            <p className="mt-4 text-muted-foreground max-w-xl mx-auto">{t("partnersDesc")}</p>
          </div>
          <div className="relative flex overflow-hidden w-full max-w-full group [mask-image:_linear-gradient(to_right,transparent_0,_black_64px,_black_calc(100%-64px),transparent_100%)] md:[mask-image:_linear-gradient(to_right,transparent_0,_black_128px,_black_calc(100%-128px),transparent_100%)]">
            {[0, 1].map((i) => (
              <div
                key={i}
                className="flex animate-marquee shrink-0 items-center justify-around gap-12 md:gap-24 px-6 md:px-12 min-w-full hover:[animation-play-state:paused]"
                aria-hidden={i === 1}
              >
                <a
                  href="https://www.salsero.es/index"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:opacity-70 transition shrink-0"
                >
                  <img
                    src={partnerSalsero}
                    alt="Salsero"
                    className="h-12 md:h-16 object-contain grayscale hover:grayscale-0 transition duration-300"
                  />
                </a>
                <a href="#" className="hover:opacity-70 transition shrink-0">
                  <img
                    src={partnerSalsaGroup}
                    alt="Salsa Group"
                    className="h-12 md:h-16 object-contain grayscale hover:grayscale-0 transition duration-300"
                  />
                </a>
                <a
                  href="https://www.facebook.com/BachataSummer/?locale=fr_CA"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:opacity-70 transition shrink-0"
                >
                  <img
                    src={partnerSummerBachata}
                    alt="Summer Bachata"
                    className="h-12 md:h-16 object-contain grayscale hover:grayscale-0 transition duration-300"
                  />
                </a>
                <a
                  href="https://www.instagram.com/bachataspain_official/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:opacity-70 transition shrink-0"
                >
                  <img
                    src={partnerBachataSpain}
                    alt="Bachata Spain"
                    className="h-12 md:h-16 object-contain grayscale hover:grayscale-0 transition duration-300"
                  />
                </a>
                <a
                  href="https://www.instagram.com/bachata_alltheworld/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:opacity-70 transition shrink-0"
                >
                  <img
                    src={partnerBachataWorld}
                    alt="Bachata All The World"
                    className="h-12 md:h-16 object-contain grayscale hover:grayscale-0 transition duration-300"
                  />
                </a>
                <a
                  href="https://kizomba-festival.fr/fr/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:opacity-70 transition shrink-0"
                >
                  <img
                    src={partnerAllIn}
                    alt="All In Kizomba"
                    className="h-12 md:h-16 object-contain grayscale hover:grayscale-0 transition duration-300"
                  />
                </a>
              </div>
            ))}
          </div>
          <div className="mt-12 text-center">
            <Link
              to={localizedHref("/partners")}
              className="inline-flex items-center gap-2 rounded-full border border-border/80 hover:border-gold hover:text-gold px-8 py-3.5 text-sm font-medium transition cursor-pointer"
            >
              {t("viewAllPartnersBtn")}
            </Link>
          </div>
        </div>
      </section>

      {/* GALLERY */}
      <section id="gallery" className="py-28">
        <div className="mx-auto max-w-7xl px-6">
          <div className="text-center mb-14">
            <p className="text-sm md:text-base font-sans font-semibold tracking-[0.25em] uppercase text-primary mb-4">{t("navGallery")}</p>
            <h2 className="font-display text-5xl md:text-6xl">
              {t("galleryTitlePart1") || "Memories in"} <span className="text-gold italic">{t("galleryTitlePart2") || "images"}</span>
            </h2>
          </div>
          <GalleryMosaic />
          <div className="mt-12 text-center">
            <Link
              to={localizedHref("/gallery")}
              className="inline-flex items-center gap-2 rounded-full border border-border/80 hover:border-gold hover:text-gold px-8 py-3.5 text-sm font-medium transition cursor-pointer"
            >
              {t("viewFullGalleryBtn") || "View Full Gallery →"}
            </Link>
          </div>
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section className="py-28 bg-card/30 border-y border-border/40">
        <div className="mx-auto max-w-7xl px-6">
          <div className="text-center mb-14">
            <p className="text-sm md:text-base font-sans font-semibold tracking-[0.25em] uppercase text-primary mb-4">
              {t("testimonialsSubtitle")}
            </p>
            <h2 className="font-display text-5xl md:text-6xl max-w-3xl mx-auto">
              {t("testimonialsTitle")}
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {testimonials.map((tItem) => (
              <figure
                key={tItem.name}
                className="rounded-2xl border border-border/60 bg-card p-8 flex flex-col"
              >
                <Quote className="h-8 w-8 text-primary opacity-60" />
                <blockquote className="mt-4 text-foreground/90 leading-relaxed flex-1">
                  "{tItem.quote}"
                </blockquote>
                <figcaption className="mt-6 pt-6 border-t border-border/60">
                  <div className="font-display text-lg">{tItem.name}</div>
                  <div className="text-xs tracking-[0.25em] uppercase text-muted-foreground mt-1">
                    {tItem.where}
                  </div>
                </figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>

      {/* CONTACT */}
      <section id="contact" className="py-28">
        <div className="mx-auto max-w-7xl px-6 grid lg:grid-cols-2 gap-16 items-center">
          <div>
            <p className="text-sm md:text-base font-sans font-semibold tracking-[0.25em] uppercase text-primary mb-4">
              {t("overviewWhere")}
            </p>
            <h2 className="font-display text-5xl md:text-6xl">
              {t("joinEventPart1") || "Join our"} <span className="text-gold italic">{t("joinEventPart2") || "event"}</span>
            </h2>
            <p className="mt-4 text-muted-foreground max-w-lg">
              {t("joinEventDesc") || "Discover our central location in Tangier, ideally situated to welcome you. Take advantage of the accessibility and proximity of the city's cultural and tourist sites."}
            </p>

            <div className="mt-10 space-y-6">
              <div className="flex gap-4">
                <div className="h-10 w-10 rounded-full border border-primary/40 grid place-items-center text-primary shrink-0">
                  <MapPin className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-xs tracking-[0.3em] uppercase text-muted-foreground">
                    {t("addressLabel") || "Address"}
                  </p>
                  <p className="mt-1">168 Mohammed VI Avenue, Tangier 90000</p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="h-10 w-10 rounded-full border border-primary/40 grid place-items-center text-primary shrink-0">
                  <Mail className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-xs tracking-[0.3em] uppercase text-muted-foreground">
                    {t("emailLabel") || "Email"}
                  </p>
                  <a
                    href="mailto:contact@tangierlatinfestival.com"
                    className="mt-1 block hover:text-primary transition"
                  >
                    contact@tangierlatinfestival.com
                  </a>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="h-10 w-10 rounded-full border border-primary/40 grid place-items-center text-primary shrink-0">
                  <Phone className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-xs tracking-[0.3em] uppercase text-muted-foreground">
                    {t("phonesLabel") || "Phones"}
                  </p>
                  <a href="tel:+212664630632" className="mt-1 block hover:text-primary transition">
                    +212 6 64 63 06 32
                  </a>
                  <a href="tel:+212664010279" className="block hover:text-primary transition">
                    +212 6 64 01 02 79
                  </a>
                </div>
              </div>
            </div>
          </div>

          <ContactForm />
        </div>

        {/* MAP */}
        <div className="mx-auto max-w-7xl px-6 mt-20">
          <div className="rounded-2xl overflow-hidden border border-border/60 shadow-soft h-[400px] bg-card">
            <iframe 
              src="https://maps.google.com/maps?q=Kenzi%20Solazur%20Tangier&t=&z=15&ie=UTF8&iwloc=&output=embed" 
              width="100%" 
              height="100%" 
              style={{ border: 0 }} 
              allowFullScreen 
              loading="lazy" 
              referrerPolicy="no-referrer-when-downgrade"
            ></iframe>
          </div>
        </div>
      </section>

      {/* FOOTER */}
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

      <footer className="border-t border-border/40 bg-card/40 pt-16 pb-8">
        <div className="mx-auto max-w-7xl px-6">
          <div className="flex flex-col items-center text-center gap-6">
            <a href={localizedHref("#home")} className="flex items-center gap-3">
              <img
                src={tlfLogo}
                alt="Tangier Latin Festival Icon"
                className="h-16 w-auto object-contain invert"
              />
            </a>
            <p className="max-w-2xl text-sm text-muted-foreground italic">
              {t("footerDesc") || "An internationally renowned cultural event on the lands of Tangier."}
            </p>
            <div className="flex items-center gap-4">
              <a
                href="https://www.instagram.com/tangierlatinfestival.official"
                aria-label="Instagram"
                className="h-10 w-10 rounded-full border border-border grid place-items-center hover:border-primary hover:text-primary transition"
              >
                <Instagram className="h-4 w-4" />
              </a>
              <a
                href="https://www.facebook.com/TangierInternationalLatinfestival/"
                aria-label="Facebook"
                className="h-10 w-10 rounded-full border border-border grid place-items-center hover:border-primary hover:text-primary transition"
              >
                <Facebook className="h-4 w-4" />
              </a>
              <a
                href="https://www.youtube.com/@tangierlatinfestival1622"
                aria-label="YouTube"
                className="h-10 w-10 rounded-full border border-border grid place-items-center hover:border-primary hover:text-primary transition"
              >
                <Youtube className="h-4 w-4" />
              </a>
            </div>
          </div>
          <div className="mt-12 pt-6 border-t border-border/40 text-center text-xs text-muted-foreground flex flex-col sm:flex-row items-center justify-center gap-2">
            <span>© {new Date().getFullYear()} Tangier International Latin Festival. {t("footerCopyright") || "All rights reserved."}</span>
            <span className="hidden sm:inline">•</span>
            <span>Made with love by <a href="https://clarodigi.com/" target="_blank" rel="noopener noreferrer" className="text-primary hover:text-primary/80 transition underline decoration-primary/50">Claro</a></span>
          </div>
        </div>
      </footer>
    </div>
  );
}

function ContactForm() {
  const { t, lang } = useLanguage();
  const [sent, setSent] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    const formData = new FormData(e.currentTarget);
    formData.append("access_key", "132f8460-381d-4f1b-861e-acb51f25e842");
    formData.append("subject", "New Contact Form Submission");

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
  };

  return (
    <div className="rounded-2xl border border-border/60 bg-card/60 p-8">
      <h3 className="font-display text-2xl">{t("contactTitle")}</h3>
      <p className="mt-2 text-sm text-muted-foreground">{t("contactDesc")}</p>
      <form
        className="mt-6 space-y-4"
        onSubmit={handleSubmit}
      >
        <div>
          <label className="block text-xs tracking-[0.2em] uppercase text-muted-foreground mb-1.5">
            {t("contactFormName")}
          </label>
          <input
            type="text"
            name="name"
            required
            className="w-full rounded-lg border border-border bg-background px-4 py-3 text-sm focus:outline-none focus:border-primary transition"
          />
        </div>
        <div>
          <label className="block text-xs tracking-[0.2em] uppercase text-muted-foreground mb-1.5">
            {t("contactFormEmail")}
          </label>
          <input
            type="email"
            name="email"
            required
            className="w-full rounded-lg border border-border bg-background px-4 py-3 text-sm focus:outline-none focus:border-primary transition"
          />
        </div>
        <div>
          <label className="block text-xs tracking-[0.2em] uppercase text-muted-foreground mb-1.5">
            {lang === "fr" ? "Téléphone" : lang === "es" ? "Teléfono" : "Phone"}
          </label>
          <div className="flex">
            <select
              name="phone_country"
              defaultValue="+212"
              className="rounded-l-lg border border-border border-r-0 bg-background px-3 py-3 text-sm focus:outline-none focus:border-primary transition max-w-[120px]"
            >
              {countries.map(c => (
                <option key={c.code} value={c.dial_code}>
                  {c.dial_code.replace('+', '')} ({c.code})
                </option>
              ))}
            </select>
            <input
              type="tel"
              name="phone"
              className="w-full rounded-r-lg border border-border bg-background px-4 py-3 text-sm focus:outline-none focus:border-primary transition"
            />
          </div>
        </div>
        <div>
          <label className="block text-xs tracking-[0.2em] uppercase text-muted-foreground mb-1.5">
            {t("contactFormMsg")}
          </label>
          <textarea
            name="message"
            required
            rows={4}
            className="w-full rounded-lg border border-border bg-background px-4 py-3 text-sm focus:outline-none focus:border-primary transition"
          />
        </div>
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full rounded-full bg-gold px-6 py-3.5 text-sm font-medium text-primary-foreground hover:opacity-90 transition shadow-gold cursor-pointer disabled:opacity-50"
        >
          {sent ? "✓ Sent" : isSubmitting ? "Sending..." : t("contactFormSendBtn")}
        </button>
        {sent && (
          <p className="text-xs text-primary mt-2 text-center font-semibold">
            {t("contactFormSuccess")}
          </p>
        )}
      </form>
    </div>
  );
}


const GRID_SLOTS = 24; // 4 columns × 6 rows

function shuffleArray<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function GalleryMosaic() {
  const allPhotos = GALLERY_PHOTOS.map((p) => p.url);

  // Pick initial random set
  const [grid, setGrid] = useState<string[]>(() => {
    const shuffled = shuffleArray(allPhotos);
    return shuffled.slice(0, GRID_SLOTS);
  });

  // Track which cell is currently fading (for crossfade animation)
  const [fadingCell, setFadingCell] = useState<number | null>(null);
  const [fadingNewSrc, setFadingNewSrc] = useState<string | null>(null);

  const gridRef = useRef(grid);
  gridRef.current = grid;

  const swapRandomCell = useCallback(() => {
    const currentUrls = new Set(gridRef.current);
    const available = allPhotos.filter((url) => !currentUrls.has(url));
    if (available.length === 0) return;

    const cellIndex = Math.floor(Math.random() * GRID_SLOTS);
    const newPhoto = available[Math.floor(Math.random() * available.length)];

    // Start crossfade: show new photo fading in
    setFadingCell(cellIndex);
    setFadingNewSrc(newPhoto);

    // After the fade animation, commit the swap
    setTimeout(() => {
      setGrid((prev) => {
        const next = [...prev];
        next[cellIndex] = newPhoto;
        return next;
      });
      setFadingCell(null);
      setFadingNewSrc(null);
    }, 800); // matches CSS transition duration
  }, [allPhotos]);

  useEffect(() => {
    const interval = setInterval(swapRandomCell, 3000);
    return () => clearInterval(interval);
  }, [swapRandomCell]);

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-1.5">
      {grid.map((src, i) => (
        <div
          key={i}
          className="group relative aspect-square overflow-hidden rounded-lg bg-card/30 cursor-pointer"
        >
          {/* Current photo */}
          <img
            src={src}
            alt="Tangier Latin Festival"
            loading="lazy"
            className={`absolute inset-0 h-full w-full object-cover transition-all duration-700 group-hover:scale-110 ${
              fadingCell === i ? "opacity-0" : "opacity-100"
            }`}
          />
          {/* New photo fading in (only on the active swapping cell) */}
          {fadingCell === i && fadingNewSrc && (
            <img
              src={fadingNewSrc}
              alt="Tangier Latin Festival"
              loading="lazy"
              className="absolute inset-0 h-full w-full object-cover animate-[fadeIn_0.8s_ease-in-out_forwards]"
            />
          )}
          {/* Hover overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          <div className="absolute inset-0 border-2 border-transparent group-hover:border-gold/50 rounded-lg transition-colors duration-300" />
        </div>
      ))}
    </div>
  );
}
