import { createFileRoute } from "@tanstack/react-router";
import { MapPin, Calendar, Check, ChevronLeft, ChevronRight } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { z } from "zod";
import { Nav } from "@/components/Nav";
import chefchaouenImg from "@/assets/chefchaouen.jpg";
import asilahImg from "@/assets/asilah.jpg";
import tangierImg from "@/assets/tangier-tour.jpg";
import { useLanguage } from "@/hooks/useLanguage";
import { translations, Language } from "@/lib/translations";

const tourismSearchSchema = z.object({
  lang: z.enum(["en", "fr", "es"]).optional(),
});

export const Route = createFileRoute("/tourism")({
  validateSearch: (search) => tourismSearchSchema.parse(search),
  head: (ctx) => {
    const search = (ctx.search || {}) as { lang?: string };
    const lang = (search?.lang || "en") as Language;
    const dict = translations[lang] || translations.en;
    return {
      meta: [
        { title: dict.seoTourismTitle },
        { name: "description", content: dict.seoTourismDesc },
        { property: "og:title", content: dict.seoTourismTitle },
        { property: "og:description", content: dict.seoTourismDesc },
      ],
    };
  },
  component: TourismPage,
});

function TourismPage() {
  const { lang, t } = useLanguage();
  const [sent, setSent] = useState(false);
  const [dest, setDest] = useState("");

  const tours = [
    {
      id: "chefchaouen",
      city: "Chefchaouen",
      date:
        lang === "fr"
          ? "Dimanche · 25 Janvier, 2026"
          : lang === "es"
            ? "Domingo · 25 de Enero, 2026"
            : "Sunday · January 25, 2026",
      images: [
        "https://www.tangierlatinfestival.com/wp-content/uploads/2024/07/WhatsApp-Image-2024-07-05-at-20.54.30.jpeg",
        "https://www.tangierlatinfestival.com/wp-content/uploads/2024/07/aaaaa-e1720209971548.jpeg",
        "https://www.tangierlatinfestival.com/wp-content/uploads/2024/07/WhatsApp-Image-2024-07-05-at-20.54.31-1-e1720210179854.jpeg",
        "https://www.tangierlatinfestival.com/wp-content/uploads/2024/07/WhatsApp-Image-2024-07-05-at-22.06.23.jpeg",
        "https://www.tangierlatinfestival.com/wp-content/uploads/2024/07/WhatsApp-Image-2024-07-05-at-20.54.30-1-e1720209714617.jpeg",
      ],
      desc:
        lang === "fr"
          ? "Chefchaouen est une destination touristique populaire pour les voyageurs en quête d'aventure. C'est le point de départ de nombreuses randonnées d'une journée et de treks de plusieurs jours à travers les montagnes du Rif."
          : lang === "es"
            ? "Chefchaouen es un destino popular para viajeros aventureros. Es el punto de partida de numerosas caminatas de un día y trekkings de varios días por las montañas del Rif."
            : "Chefchaouen is a popular tourist destination for adventure-seeking travelers. It is the starting point for numerous day hikes and multi-day treks through the Rif mountains.",
      places:
        lang === "fr"
          ? [
              "Cascades d'Akchour",
              "Parc National de Talassemtane",
              "La Grande Mosquée",
              "Boutiques de tapis",
              "L'ancienne médina de Chefchaouen",
            ]
          : lang === "es"
            ? [
                "Cascadas de Akchour",
                "Parque Nacional Talassemtane",
                "La Gran Mezquita",
                "Tiendas de alfombras",
                "La antigua medina de Chefchaouen",
              ]
            : [
                "AKCHOUR WATERFALLS",
                "TALASSEMTANE NATIONAL PARK",
                "THE GRAND MOSQUE",
                "CARPET STORES",
                "THE ANCIENT MEDINA OF CHEFCHAOUEN",
              ],
    },
    {
      id: "asilah",
      city: "Asilah",
      date:
        lang === "fr"
          ? "Samedi · 24 Janvier, 2026"
          : lang === "es"
            ? "Sábado · 24 de Enero, 2026"
            : "Saturday · January 24, 2026",
      images: [
        "https://www.tangierlatinfestival.com/wp-content/uploads/2025/07/AS1.jpg",
        "https://www.tangierlatinfestival.com/wp-content/uploads/2025/07/AS2.jpg",
        "https://www.tangierlatinfestival.com/wp-content/uploads/2025/07/AS4.jpg",
        "https://www.tangierlatinfestival.com/wp-content/uploads/2025/07/AS3.jpg",
        "https://www.tangierlatinfestival.com/wp-content/uploads/2024/07/WhatsApp-Image-2024-07-05-at-21.40.39-e1720218274371.jpeg",
      ],
      desc:
        lang === "fr"
          ? "Asilah est une charmante ville côtière du nord-ouest du Maroc, à environ 45 km au sud de Tanger sur l'océan Atlantique. Elle est connue pour son patrimoine historique, sa médina blanche, ses remparts portugais et son atmosphère artistique."
          : lang === "es"
            ? "Asilah es una encantadora ciudad costera en el noroeste de Marruecos, a unos 45 km al sur de Tánger sobre el océano Atlántico. Es conocida por su patrimonio histórico, medina blanca, murallas portuguesas y ambiente artístico."
            : "Asilah is a charming coastal town in northwestern Morocco, about 45 km south of Tangier, on the Atlantic Ocean. It is known for its historical heritage, its white medina, its Portuguese walls and its artistic atmosphere.",
      places:
        lang === "fr"
          ? [
              "Remparts et porte de Bab el-Kasbah",
              "Tour El Kamra (Borj Al Kamra)",
              "Palais Raissouni",
              "Plage d'Asilah",
            ]
          : lang === "es"
            ? [
                "Murallas y puerta de Bab el-Kasbah",
                "Torre El Kamra (Borj Al Kamra)",
                "Palacio Raissouni",
                "Playa de Asilah",
              ]
            : [
                "Walls and Gate of Bab el-Kasbah",
                "El Kamra Tower (Borj Al Kamra)",
                "Raissouni Palace",
                "Playa de Asilah",
              ],
    },
    {
      id: "tangier",
      city: "Tangier",
      date:
        lang === "fr"
          ? "Samedi · 24 Janvier, 2026"
          : lang === "es"
            ? "Sábado · 24 de Enero, 2026"
            : "Saturday · January 24, 2026",
      images: [
        "https://www.tangierlatinfestival.com/wp-content/uploads/2024/07/WhatsApp-Image-2024-07-05-at-21.40.40-e1720217925119.jpeg",
        "https://www.tangierlatinfestival.com/wp-content/uploads/2024/07/WhatsApp-Image-2024-07-05-at-21.40.39-2-e1720218051604.jpeg",
        "https://www.tangierlatinfestival.com/wp-content/uploads/2024/07/WhatsApp-Image-2024-07-05-at-21.40.39-1.jpeg",
        "https://www.tangierlatinfestival.com/wp-content/uploads/2024/07/WhatsApp-Image-2024-07-05-at-22.05.56-e1720218166318.jpeg",
        "https://www.tangierlatinfestival.com/wp-content/uploads/2024/07/WhatsApp-Image-2024-07-05-at-21.40.40-1.jpeg",
      ],
      desc:
        lang === "fr"
          ? "Située sur le détroit de Gibraltar, Tanger a toujours accueilli de nombreux voyageurs de tous horizons, qui y ont laissé un peu de leur culture. Tanger est une ville dynamique et une destination incontournable pour les artistes en quête d'inspiration."
          : lang === "es"
            ? "Situada en el estrecho de Gibraltar, Tánger siempre ha acogido a viajeros de todos los horizontes, que han dejado un poco de sus culturas. Es una ciudad dinámica y un destino de obligada visita para los artistas que buscan inspiración."
            : "Located on the Strait of Gibraltar, Tangier has always welcomed many travelers from all horizons, who have left a little of their cultures behind. Tangier is a dynamic city and a must-see destination for artists in search of inspiration.",
      places:
        lang === "fr"
          ? [
              "La Grande Mosquée",
              "La Kasbah",
              "Cap Spartel",
              "Les Grottes d'Hercule",
              "Les Jardins de la Mendoubia",
            ]
          : lang === "es"
            ? [
                "La Gran Mezquita",
                "La Kasbah",
                "Cabo Spartel",
                "Las Cuevas de Hércules",
                "Los Jardines de la Mendoubia",
              ]
            : [
                "THE GRAND MOSQUE",
                "THE KASBAH",
                "CAP SPARTEL",
                "THE CAVES OF HERCULE",
                "THE MENDOUBIA GARDENS",
              ],
    },
  ];

  return (
    <div className="min-h-screen">
      <Nav />

      {/* HERO */}
      <section className="relative py-24 md:py-32 border-b border-border/40 overflow-hidden">
        <div className="absolute inset-0 -z-10 opacity-30">
          <img src={tangierImg} alt="" className="h-full w-full object-cover" />
          <div className="absolute inset-0 hero-overlay" />
        </div>
        <div className="mx-auto max-w-5xl px-6 text-center">
          <p className="text-xs tracking-[0.4em] uppercase text-primary mb-4">
            {t("tourismHeroSubtitle")}
          </p>
          <h1 className="font-display text-5xl md:text-7xl leading-[0.95]">
            {t("tourismHeroTitlePart1")}{" "}
            <span className="text-gold italic">{t("tourismHeroTitlePart2")}</span>{" "}
            {t("tourismHeroTitlePart3")}
          </h1>
          <p className="mt-6 text-muted-foreground max-w-2xl mx-auto">{t("tourismHeroDesc")}</p>
        </div>
      </section>

      {/* TOURS */}
      <section className="py-20 md:py-28">
        <div className="mx-auto max-w-7xl px-6 space-y-20">
          {tours.map((tItem, i) => (
            <article
              key={tItem.id}
              id={tItem.id}
              className={`grid lg:grid-cols-2 gap-12 items-center ${
                i % 2 === 1 ? "lg:[&>*:first-child]:order-2" : ""
              }`}
            >
              <div className="relative">
                <PremiumCarousel images={tItem.images} alt={tItem.city} />
                <div className="absolute top-5 left-5 rounded-full bg-background/80 backdrop-blur border border-border/60 px-4 py-1.5 text-[10px] tracking-[0.3em] uppercase text-primary inline-flex items-center gap-2 z-20">
                  <Calendar className="h-3 w-3" /> {tItem.date}
                </div>
              </div>

              <div>
                <p className="text-xs tracking-[0.4em] uppercase text-primary mb-3 inline-flex items-center gap-2">
                  <MapPin className="h-3.5 w-3.5" /> {t("tourismTourGroup")}
                </p>
                <h2 className="font-display text-4xl md:text-5xl">
                  <span className="text-gold italic">{tItem.city}</span>
                </h2>
                <p className="mt-5 text-muted-foreground leading-relaxed">{tItem.desc}</p>

                <div className="mt-8">
                  <p className="text-xs tracking-[0.3em] uppercase text-muted-foreground mb-4">
                    {t("tourismPlacesVisited")}
                  </p>
                  <ul className="grid sm:grid-cols-2 gap-3">
                    {tItem.places.map((p) => (
                      <li key={p} className="flex items-start gap-3 text-sm">
                        <Check className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                        <span>{p}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <a
                  href="#reserve"
                  onClick={() => setDest(tItem.city)}
                  className="mt-8 inline-flex items-center gap-2 rounded-full bg-gold px-6 py-3 text-sm font-medium text-primary-foreground hover:opacity-90 transition shadow-gold cursor-pointer"
                >
                  {t("tourismReserveBtn")}
                </a>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* RESERVATION FORM */}
      <section id="reserve" className="py-24 bg-card/30 border-y border-border/40">
        <div className="mx-auto max-w-3xl px-6">
          <div className="text-center mb-10">
            <p className="text-xs tracking-[0.4em] uppercase text-primary mb-3">
              {t("tourismFormSubtitle")}
            </p>
            <h2 className="font-display text-4xl md:text-5xl">{t("tourismFormTitle")}</h2>
            <p className="mt-4 text-muted-foreground">{t("tourismFormDesc")}</p>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              setSent(true);
            }}
            className="rounded-2xl border border-border/60 bg-card p-6 md:p-10 space-y-5"
          >
            <div>
              <label className="block text-xs tracking-[0.25em] uppercase text-muted-foreground mb-2">
                {t("tourismFormLabelDest")} <span className="text-primary">*</span>
              </label>
              <select
                value={dest}
                onChange={(e) => setDest(e.target.value)}
                required
                className="w-full rounded-lg border border-border bg-background px-4 py-3 text-sm focus:outline-none focus:border-primary transition"
              >
                <option value="" disabled>
                  {t("tourismFormChooseDest")}
                </option>
                <option value="Chefchaouen">Chefchaouen — Sun, Jan 25</option>
                <option value="Asilah">Asilah — Sat, Jan 24</option>
                <option value="Tangier">Tangier — Sat, Jan 24</option>
              </select>
            </div>

            <div className="grid md:grid-cols-2 gap-5">
              <Field
                label={
                  lang === "fr" ? "Nom complet" : lang === "es" ? "Nombre completo" : "Full name"
                }
                name="name"
                required
              />
              <Field label="Email" name="email" type="email" required />
              <Field
                label={lang === "fr" ? "Téléphone" : lang === "es" ? "Teléfono" : "Phone"}
                name="phone"
                type="tel"
              />
              <Field label={t("tourismFormLabelCountry")} name="country" />
              <div className="md:col-span-2">
                <label className="block text-xs tracking-[0.25em] uppercase text-muted-foreground mb-2">
                  {t("tourismFormLabelPeople")}
                </label>
                <input
                  type="number"
                  min={1}
                  defaultValue={1}
                  className="w-full rounded-lg border border-border bg-background px-4 py-3 text-sm focus:outline-none focus:border-primary transition font-semibold"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs tracking-[0.25em] uppercase text-muted-foreground mb-2">
                {t("tourismFormLabelMsg")}
              </label>
              <textarea
                rows={4}
                placeholder={t("tourismFormMsgPlaceholder")}
                className="w-full rounded-lg border border-border bg-background px-4 py-3 text-sm focus:outline-none focus:border-primary transition"
              />
            </div>

            <button
              type="submit"
              className="w-full rounded-full bg-gold px-6 py-3.5 text-sm font-medium text-primary-foreground hover:opacity-90 transition shadow-gold cursor-pointer"
            >
              {sent ? "✓ Sent" : t("tourismFormSendBtn")}
            </button>

            {sent && (
              <p className="text-center text-sm text-primary font-semibold">
                {t("tourismFormSuccess")}
              </p>
            )}
          </form>
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

interface PremiumCarouselProps {
  images: string[];
  alt?: string;
}

export function PremiumCarousel({ images, alt = "Tour image" }: PremiumCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const startTimer = () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      timerRef.current = setInterval(() => {
        setCurrentIndex((prevIndex) => (prevIndex + 1) % images.length);
      }, 4500);
    };

    const stopTimer = () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };

    if (!isHovered) {
      startTimer();
    } else {
      stopTimer();
    }
    return () => stopTimer();
  }, [isHovered, images.length]);

  const handlePrev = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentIndex((prevIndex) => (prevIndex - 1 + images.length) % images.length);
  };

  const handleNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentIndex((prevIndex) => (prevIndex + 1) % images.length);
  };

  return (
    <div
      className="relative w-full h-[440px] rounded-2xl overflow-hidden shadow-soft group select-none bg-black/10 border border-border/20"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Slides */}
      {images.map((img, index) => (
        <div
          key={img}
          className={`absolute inset-0 transition-all duration-700 ease-in-out ${
            index === currentIndex
              ? "opacity-100 scale-100 z-10"
              : "opacity-0 scale-105 z-0 pointer-events-none"
          }`}
        >
          <img
            src={img}
            alt={`${alt} slide ${index + 1}`}
            className="w-full h-full object-cover"
            loading="lazy"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent z-10" />
        </div>
      ))}

      {/* Navigation Buttons (Fade in on hover) */}
      <button
        onClick={handlePrev}
        className="absolute left-4 top-1/2 -translate-y-1/2 z-20 flex items-center justify-center h-10 w-10 rounded-full bg-black/40 backdrop-blur-md border border-white/10 text-white opacity-0 group-hover:opacity-100 hover:bg-black/60 hover:scale-105 active:scale-95 transition duration-300 shadow-md cursor-pointer"
        aria-label="Previous image"
      >
        <ChevronLeft className="h-5 w-5" />
      </button>
      <button
        onClick={handleNext}
        className="absolute right-4 top-1/2 -translate-y-1/2 z-20 flex items-center justify-center h-10 w-10 rounded-full bg-black/40 backdrop-blur-md border border-white/10 text-white opacity-0 group-hover:opacity-100 hover:bg-black/60 hover:scale-105 active:scale-95 transition duration-300 shadow-md cursor-pointer"
        aria-label="Next image"
      >
        <ChevronRight className="h-5 w-5" />
      </button>

      {/* Slide Indicators */}
      <div className="absolute bottom-5 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1.5 bg-black/35 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10">
        {images.map((_, index) => (
          <button
            key={index}
            onClick={(e) => {
              e.stopPropagation();
              setCurrentIndex(index);
            }}
            className={`h-1.5 rounded-full transition-all duration-300 cursor-pointer ${
              index === currentIndex ? "bg-gold w-6" : "bg-white/40 w-1.5 hover:bg-white/80"
            }`}
            aria-label={`Go to slide ${index + 1}`}
          />
        ))}
      </div>
    </div>
  );
}
