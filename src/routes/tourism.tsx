import { createFileRoute } from "@tanstack/react-router";
import { MapPin, Calendar, Check, ChevronLeft, ChevronRight, ArrowRight } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { z } from "zod";
import { Nav } from "@/components/Nav";
import chefchaouenImg from "@/assets/chefchaouen.jpg";
import asilahImg from "@/assets/asilah.jpg";
import tangierImg from "@/assets/tangier-tour.jpg";
import { useLanguage } from "@/hooks/useLanguage";
import { translations, Language } from "@/lib/translations";
import { countries, getFlagEmoji } from "@/lib/countries";

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
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [dest, setDest] = useState("");

  const tours = [
    {
      id: "chefchaouen",
      city: "Chefchaouen",
      date:
        lang === "fr"
          ? "Dimanche · 10 Janvier, 2027"
          : lang === "es"
            ? "Domingo · 10 de Enero, 2027"
            : "Sunday · January 10, 2027",
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
          ? "Samedi · 9 Janvier, 2027"
          : lang === "es"
            ? "Sábado · 9 de Enero, 2027"
            : "Saturday · January 9, 2027",
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
          ? "Samedi · 9 Janvier, 2027"
          : lang === "es"
            ? "Sábado · 9 de Enero, 2027"
            : "Saturday · January 9, 2027",
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
      <section className="relative flex flex-col justify-center h-[65vh] min-h-[460px] border-b border-border/40 overflow-hidden bg-transparent">
        <div className="absolute inset-0 -z-10">
          <img src={chefchaouenImg} alt="" className="h-full w-full object-cover opacity-100" />
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
        </div>
        <div className="mx-auto max-w-5xl px-6 text-center">
          <p className="text-xs tracking-[0.4em] uppercase text-primary mb-4">
            {t("tourismHeroSubtitle")}
          </p>
          <h1 className="font-display text-4xl sm:text-5xl md:text-7xl leading-[0.95] text-white drop-shadow-lg">
            {t("tourismHeroTitlePart1")}{" "}
            <span className="text-gold italic">{t("tourismHeroTitlePart2")}</span>{" "}
            {t("tourismHeroTitlePart3")}
          </h1>
          <p className="mt-6 text-slate-300 max-w-2xl mx-auto drop-shadow-md">{t("tourismHeroDesc")}</p>
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
                <div className="absolute top-5 left-5 rounded-full bg-slate-950/80 backdrop-blur border border-white/20 px-5 py-2 text-xs font-bold tracking-widest text-white inline-flex items-center gap-2 z-20">
                  <Calendar className="h-4 w-4" /> {tItem.date}
                </div>
              </div>

              <div>
                <p className="font-display text-base md:text-lg font-bold tracking-[0.3em] uppercase text-primary mb-3 inline-flex items-center gap-2">
                  <MapPin className="h-4 w-4" /> {t("tourismTourGroup")}
                </p>
                <h2 className="font-display text-4xl md:text-5xl">
                  <span className="text-gold italic pr-4 inline-block">{tItem.city}</span>
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
                  className="mt-8 inline-flex items-center gap-2 rounded-full bg-gold px-8 py-4 text-base font-bold font-display tracking-widest text-slate-950 uppercase shadow-[0_0_20px_rgba(212,175,55,0.4)] hover:scale-105 transition-all cursor-pointer"
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
            onSubmit={async (e) => {
              e.preventDefault();
              setIsSubmitting(true);
              const formData = new FormData(e.currentTarget);
              formData.append("access_key", "132f8460-381d-4f1b-861e-acb51f25e842");
              formData.append("subject", "New Tourism Booking");
              
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
            className="rounded-2xl border border-border/60 bg-card p-6 md:p-10 space-y-5"
          >
            <div>
              <label className="block text-xs tracking-[0.25em] uppercase text-muted-foreground mb-2">
                {t("tourismFormLabelDest")} <span className="text-primary">*</span>
              </label>
              <select
                name="Destination"
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
              <div>
                <label className="block text-xs tracking-[0.25em] uppercase text-muted-foreground mb-2">
                  {lang === "fr" ? "Téléphone" : lang === "es" ? "Teléfono" : "Phone"}
                </label>
                <div className="flex">
                  <select
                    name="phone_country"
                    defaultValue={`${getFlagEmoji("MA")} +212`}
                    className="rounded-l-lg border border-border border-r-0 bg-background px-3 py-3 text-sm focus:outline-none focus:border-primary transition max-w-[140px]"
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
                    name="phone"
                    type="tel"
                    className="w-full rounded-r-lg border border-border bg-background px-4 py-3 text-sm focus:outline-none focus:border-primary transition"
                  />
                </div>
              </div>
              <Field label={t("tourismFormLabelCountry")} name="country" />
              <div className="md:col-span-2">
                <label className="block text-xs tracking-[0.25em] uppercase text-muted-foreground mb-2">
                  {t("tourismFormLabelPeople")}
                </label>
                <input
                  type="number"
                  name="Number of People"
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
                name="Message"
                rows={4}
                placeholder={t("tourismFormMsgPlaceholder")}
                className="w-full rounded-lg border border-border bg-background px-4 py-3 text-sm focus:outline-none focus:border-primary transition"
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full rounded-full bg-gold px-6 py-3.5 text-sm font-medium text-primary-foreground hover:opacity-90 transition shadow-gold cursor-pointer disabled:opacity-70"
            >
              {isSubmitting ? "Sending..." : sent ? "✓ Sent" : t("tourismFormSendBtn")}
            </button>

            {sent && (
              <p className="text-center text-sm text-primary font-semibold">
                {t("tourismFormSuccess")}
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
