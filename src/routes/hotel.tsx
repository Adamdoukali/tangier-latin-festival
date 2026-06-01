import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { useState, useEffect } from "react";
import {
  MapPin,
  Eye,
  Car,
  Coffee,
  Waves,
  Sparkles,
  Dumbbell,
  Wifi,
  BedDouble,
  UtensilsCrossed,
  Wind,
  CigaretteOff,
  Star,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { Nav } from "@/components/Nav";
import { useLanguage } from "@/hooks/useLanguage";
import { translations, Language } from "@/lib/translations";
import exteriorImg from "@/assets/hotel-exterior.jpg";

const hotelSearchSchema = z.object({
  lang: z.enum(["en", "fr", "es"]).optional(),
});

export const Route = createFileRoute("/hotel")({
  validateSearch: (search) => hotelSearchSchema.parse(search),
  head: (ctx) => {
    const search = (ctx.search || {}) as { lang?: string };
    const lang = (search?.lang || "en") as Language;
    const dict = translations[lang] || translations.en;
    return {
      meta: [
        { title: dict.seoHotelTitle },
        { name: "description", content: dict.seoHotelDesc },
        { property: "og:title", content: dict.seoHotelTitle },
        { property: "og:description", content: dict.seoHotelDesc },
        { property: "og:image", content: exteriorImg },
      ],
    };
  },
  component: HotelPage,
});

function ImageCarousel() {
  const images = [
    "https://www.tangierlatinfestival.com/wp-content/uploads/2024/05/88845166.jpg",
    "https://www.tangierlatinfestival.com/wp-content/uploads/2024/05/510893786.jpg",
    "https://www.tangierlatinfestival.com/wp-content/uploads/2024/05/510895394.jpg",
    "https://www.tangierlatinfestival.com/wp-content/uploads/2024/05/510893385.jpg",
    "https://www.tangierlatinfestival.com/wp-content/uploads/2024/05/510896529.jpg",
    "https://www.tangierlatinfestival.com/wp-content/uploads/2024/05/88756856.jpg",
    "https://www.tangierlatinfestival.com/wp-content/uploads/2024/05/88757193.jpg",
    "https://www.tangierlatinfestival.com/wp-content/uploads/2024/05/519897053.jpg",
    "https://www.tangierlatinfestival.com/wp-content/uploads/2024/05/88845160.jpg",
    "https://www.tangierlatinfestival.com/wp-content/uploads/2024/05/88845185.jpg",
  ];

  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setActiveIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1));
    }, 5000);
    return () => clearInterval(timer);
  }, [images.length]);

  return (
    <div className="relative w-full h-[500px] rounded-2xl overflow-hidden border border-gold/20 shadow-soft bg-black/40 group select-none">
      {/* Slides */}
      {images.map((img, idx) => (
        <div
          key={img}
          className={`absolute inset-0 transition-all duration-1000 ${
            idx === activeIndex ? "opacity-100 scale-100 z-10" : "opacity-0 scale-95 z-0"
          }`}
        >
          <img src={img} alt={`Hotel view ${idx + 1}`} className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20" />
        </div>
      ))}

      {/* Prev / Next controls */}
      <button
        onClick={() => setActiveIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1))}
        className="absolute left-4 top-1/2 -translate-y-1/2 z-20 p-2.5 rounded-full border border-white/20 bg-black/60 text-white hover:text-gold hover:border-gold opacity-0 group-hover:opacity-100 transition cursor-pointer"
      >
        <ChevronLeft className="h-5 w-5" />
      </button>
      <button
        onClick={() => setActiveIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1))}
        className="absolute right-4 top-1/2 -translate-y-1/2 z-20 p-2.5 rounded-full border border-white/20 bg-black/60 text-white hover:text-gold hover:border-gold opacity-0 group-hover:opacity-100 transition cursor-pointer"
      >
        <ChevronRight className="h-5 w-5" />
      </button>

      {/* Indicators */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 flex gap-2">
        {images.map((_, idx) => (
          <button
            key={idx}
            onClick={() => setActiveIndex(idx)}
            className={`h-2 rounded-full transition-all duration-300 cursor-pointer ${
              idx === activeIndex ? "w-6 bg-gold" : "w-2 bg-white/50"
            }`}
          />
        ))}
      </div>
    </div>
  );
}

function HotelPage() {
  const { lang, t } = useLanguage();

  const langSuffix = lang && lang !== "en" ? `?lang=${lang}` : "";
  const localizedHref = (href: string) => `${href}${langSuffix}`;

  const facilities = [
    {
      icon: Waves,
      label:
        lang === "fr"
          ? "Piscine extérieure"
          : lang === "es"
            ? "Piscina al aire libre"
            : "Outdoor swimming pool",
    },
    {
      icon: Sparkles,
      label:
        lang === "fr"
          ? "Spa et centre de bien-être"
          : lang === "es"
            ? "Spa y centro de bienestar"
            : "Spa & wellness center",
    },
    {
      icon: Dumbbell,
      label:
        lang === "fr" ? "Centre de remise en forme" : lang === "es" ? "Gimnasio" : "Fitness center",
    },
    {
      icon: CigaretteOff,
      label:
        lang === "fr"
          ? "Chambres non-fumeurs"
          : lang === "es"
            ? "Habitaciones para no fumadores"
            : "Non-smoking rooms",
    },
    {
      icon: Wifi,
      label:
        lang === "fr"
          ? "Connexion Wi-Fi gratuite"
          : lang === "es"
            ? "Conexión Wi-Fi gratuita"
            : "Free Wi-Fi",
    },
    {
      icon: Car,
      label:
        lang === "fr"
          ? "Parking gratuit"
          : lang === "es"
            ? "Estacionamiento gratuito"
            : "Free parking",
    },
    {
      icon: UtensilsCrossed,
      label: lang === "fr" ? "Restaurant" : lang === "es" ? "Restaurante" : "Restaurant",
    },
    {
      icon: Wind,
      label:
        lang === "fr" ? "Climatisation" : lang === "es" ? "Aire acondicionado" : "Air conditioning",
    },
  ];

  const highlights = [
    {
      icon: MapPin,
      title: lang === "fr" ? "Emplacement" : lang === "es" ? "Ubicación" : "Location",
      text:
        lang === "fr"
          ? "Situé dans le quartier le plus populaire de Tanger, cet hôtel bénéficie d'une excellente note de 8,7 pour son emplacement."
          : lang === "es"
            ? "Situado en el distrito más popular de Tánger, este hotel goza de una excelente calificación de 8.7 por su ubicación."
            : "Located in the most popular district of Tangier, this hotel has an excellent location rating of 8.7.",
    },
    {
      icon: Eye,
      title: lang === "fr" ? "Vue" : lang === "es" ? "Vista" : "View",
      text: lang === "fr" ? "Sur mer" : lang === "es" ? "Vista al mar" : "Sea view",
    },
    {
      icon: Car,
      title: lang === "fr" ? "Parking" : lang === "es" ? "Estacionamiento" : "Parking",
      text:
        lang === "fr"
          ? "Privé et gratuit à l'hôtel"
          : lang === "es"
            ? "Privado y gratuito en el hotel"
            : "Private and free at the hotel",
    },
    {
      icon: UtensilsCrossed,
      title:
        lang === "fr"
          ? "Petit-déjeuner & Dinner"
          : lang === "es"
            ? "Desayuno y Cena"
            : "Breakfast & Dinner",
      text:
        lang === "fr"
          ? "Buffet continental"
          : lang === "es"
            ? "Buffet continental"
            : "Continental buffet",
    },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Nav />

      {/* HERO */}
      <section className="relative h-[65vh] min-h-[460px] flex items-end border-b border-border/40 overflow-hidden select-none">
        <div className="absolute inset-0 -z-10">
          <img
            src={exteriorImg}
            alt="Hotel Solazur Tangier"
            className="h-full w-full object-cover opacity-35"
          />
          <div className="absolute inset-0 hero-overlay" />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent" />
        </div>
        <div className="relative mx-auto max-w-7xl px-6 pb-16 w-full">
          <p className="text-xs tracking-[0.4em] uppercase text-primary mb-4 flex items-center gap-2">
            <Star className="h-3.5 w-3.5 fill-gold text-gold" />
            {t("hotelHeroSubtitle")}
          </p>
          <h1 className="font-display text-5xl md:text-7xl lg:text-8xl leading-[0.95] max-w-4xl text-white">
            {lang === "fr" ? "HÔTEL" : lang === "es" ? "HOTEL" : "HOTEL"}{" "}
            <span className="text-gold italic">Solazur</span>
          </h1>
          <div className="mt-6 flex items-center gap-2 text-muted-foreground">
            <MapPin className="h-4 w-4 text-primary animate-bounce" />
            <span className="text-sm">{t("hotelHeroLocation")}</span>
            <span className="mx-3 text-border">|</span>
            <div className="flex gap-0.5">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star key={i} className="h-3.5 w-3.5 fill-primary text-primary" />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CONTENT GRID */}
      <section className="py-20 md:py-28">
        <div className="mx-auto max-w-7xl px-6 grid lg:grid-cols-2 gap-16 items-start">
          {/* Left Column: Image Carousel and Collage */}
          <div className="space-y-8">
            <ImageCarousel />

            {/* Collage of 3 Portrait Images */}
            <div className="grid grid-cols-3 gap-4">
              {[
                "https://www.tangierlatinfestival.com/wp-content/uploads/2024/05/519884878.jpg",
                "https://www.tangierlatinfestival.com/wp-content/uploads/2024/05/image-341-2-compressed.jpg",
                "https://www.tangierlatinfestival.com/wp-content/uploads/2024/05/519897116.jpg",
              ].map((src, idx) => (
                <div
                  key={idx}
                  className="group relative aspect-[2/3] overflow-hidden rounded-2xl border border-border/40 shadow-soft bg-black/40"
                >
                  <img
                    src={src}
                    alt={`Hotel landscape ${idx + 1}`}
                    loading="lazy"
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                </div>
              ))}
            </div>
          </div>

          {/* Right Column: Hotel solazur detailed description, equipments list, google maps, highlights */}
          <div className="space-y-12">
            <div>
              <p className="text-xs tracking-[0.4em] uppercase text-primary mb-3">
                {t("hotelStaySubtitle")}
              </p>
              <h2 className="font-display text-4xl md:text-5xl leading-tight text-glow">
                HÔTEL <span className="text-gold italic">Solazur</span>
              </h2>
              <div className="mt-6 space-y-5 text-muted-foreground leading-relaxed text-sm md:text-base border-l-2 border-gold/30 pl-4">
                <p>{t("hotelStayDesc1")}</p>
                <p>{t("hotelStayDesc2")}</p>
                <p>{t("hotelStayDesc3")}</p>
                <p>{t("hotelStayDesc4")}</p>
              </div>
            </div>

            {/* Equipments (Facilities) List Grid */}
            <div className="rounded-2xl border border-border/60 bg-card/40 backdrop-blur p-8 shadow-soft">
              <h3 className="font-display text-lg tracking-wider text-primary uppercase mb-6 flex items-center gap-2 font-bold">
                <Star className="h-4.5 w-4.5 text-gold" />
                {t("hotelFacilitiesTitle")}
              </h3>
              <div className="grid sm:grid-cols-2 gap-4">
                {facilities.map((f) => (
                  <div
                    key={f.label}
                    className="flex items-center gap-3 p-3 rounded-xl border border-border/40 bg-background/30 hover:border-gold/30 transition duration-300 group"
                  >
                    <div className="h-9 w-9 rounded-lg bg-primary/10 grid place-items-center text-gold group-hover:bg-gold group-hover:text-primary-foreground transition duration-300">
                      <f.icon className="h-4.5 w-4.5" />
                    </div>
                    <span className="text-xs md:text-sm font-semibold tracking-wide text-muted-foreground group-hover:text-foreground transition">
                      {f.label}
                    </span>
                  </div>
                ))}
              </div>

              {/* Reserve packs button */}
              <div className="mt-8">
                <a
                  href={localizedHref("/#packs")}
                  className="w-full inline-flex justify-center items-center rounded-full bg-gold px-6 py-3.5 text-sm font-bold text-primary-foreground hover:opacity-90 transition shadow-gold uppercase tracking-[0.2em] select-none"
                >
                  {lang === "fr"
                    ? "RÉSERVEZ MAINTENANT"
                    : lang === "es"
                      ? "RESERVA AHORA"
                      : "RESERVE NOW"}
                </a>
              </div>
            </div>

            {/* Embedded Google Map */}
            <div className="rounded-2xl border border-border/60 bg-card/40 p-5 shadow-soft">
              <h3 className="font-display text-base tracking-wider text-gold uppercase mb-4 flex items-center gap-2 font-bold">
                <MapPin className="h-4.5 w-4.5" />
                {lang === "fr"
                  ? "Un emplacement idéal !"
                  : lang === "es"
                    ? "¡Una ubicación ideal!"
                    : "An ideal location!"}
              </h3>
              <div className="rounded-xl overflow-hidden border border-border/40 h-[280px] w-full">
                <iframe
                  loading="lazy"
                  className="w-full h-full border-0"
                  src="https://maps.google.com/maps?q=%20Kenzi%20Solazur%20&t=m&z=14&output=embed&iwloc=near"
                  title="Kenzi Solazur"
                  aria-label="Kenzi Solazur"
                />
              </div>
            </div>

            {/* Highlights Lists */}
            <div className="rounded-2xl border border-border/60 bg-card/40 p-8 shadow-soft space-y-6">
              <h3 className="font-display text-lg tracking-wider text-primary uppercase flex items-center gap-2 font-bold">
                <Star className="h-4.5 w-4.5 text-gold animate-pulse" />
                {t("hotelHighlightsTitle")}
              </h3>
              <div className="grid sm:grid-cols-2 gap-4">
                {highlights.map((h) => (
                  <div
                    key={h.title}
                    className="p-4 rounded-xl border border-border/40 bg-background/30 hover:border-gold/30 transition duration-300"
                  >
                    <div className="flex items-center gap-2">
                      <h.icon className="h-4.5 w-4.5 text-gold" />
                      <h4 className="font-display text-sm font-bold tracking-wide text-foreground uppercase">
                        {h.title}
                      </h4>
                    </div>
                    <p className="mt-2 text-xs text-muted-foreground leading-relaxed">{h.text}</p>
                  </div>
                ))}
              </div>

              {/* Quotes Block */}
              <div className="p-4 rounded-xl border border-gold/20 bg-gold/5 text-xs text-gold leading-relaxed italic">
                {t("hotelHighlightsDesc")}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* NEED HELP CTA */}
      <section className="relative py-24 overflow-hidden border-t border-border/40 bg-card/20 select-none">
        <div className="absolute inset-0 bg-gold opacity-95" />
        <div className="relative mx-auto max-w-3xl px-6 text-center text-primary-foreground">
          <h2 className="font-display text-4xl md:text-5xl leading-tight">{t("hotelCtaTitle")}</h2>
          <p className="mt-4 opacity-90 text-sm md:text-base">{t("hotelCtaDesc")}</p>
          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <a
              href="mailto:contact@tangierlatinfestival.com"
              className="inline-flex items-center gap-2 rounded-full bg-background px-8 py-3.5 text-sm font-bold text-foreground hover:opacity-90 transition shadow-soft cursor-pointer uppercase tracking-[0.1em]"
            >
              {t("hotelCtaContactBtn")}
            </a>
            <a
              href={localizedHref("/#packs")}
              className="inline-flex items-center gap-2 rounded-full border border-primary-foreground/30 px-8 py-3.5 text-sm font-bold text-primary-foreground hover:bg-primary-foreground/10 transition cursor-pointer uppercase tracking-[0.1em]"
            >
              {t("hotelCtaSeePacksBtn")}
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}
