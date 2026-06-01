import { createFileRoute } from "@tanstack/react-router";
import { Quote, Play, Pause, Volume2, VolumeX, ArrowRight } from "lucide-react";
import { useState, useRef } from "react";
import { z } from "zod";
import { Nav } from "@/components/Nav";
import { useLanguage } from "@/hooks/useLanguage";
import { translations, Language } from "@/lib/translations";
import tangierImg from "@/assets/tangier-tour.jpg";

const testimonialsSearchSchema = z.object({
  lang: z.enum(["en", "fr", "es"]).optional(),
});

export const Route = createFileRoute("/testimonials")({
  validateSearch: (search) => testimonialsSearchSchema.parse(search),
  head: (ctx) => {
    const search = (ctx.search || {}) as { lang?: string };
    const lang = (search?.lang || "en") as Language;
    const dict = translations[lang] || translations.en;
    return {
      meta: [
        { title: dict.seoTestimonialsTitle || "Testimonials" },
        { name: "description", content: dict.seoTestimonialsDesc || "" },
        { property: "og:title", content: dict.seoTestimonialsTitle || "Testimonials" },
        { property: "og:description", content: dict.seoTestimonialsDesc || "" },
      ],
    };
  },
  component: TestimonialsPage,
});

function TestimonialsPage() {
  const { lang, t } = useLanguage();

  const testimonials = [
    {
      id: 1,
      name: "ORLANDO",
      country: lang === "fr" ? "ALLEMAGNE" : lang === "es" ? "ALEMANIA" : "GERMANY",
      avatar: "https://www.tangierlatinfestival.com/wp-content/uploads/2024/07/ORLANDO.jpeg",
      quote:
        lang === "fr"
          ? "Tangier Latin Festival a été un succès retentissant !!! Vous, les Marocains, êtes si chaleureux, empathiques et transmettez tellement d'énergie positive que je suis encore tout impressionné !!! J'enseigne depuis de très nombreuses années dans le monde entier et les meilleures expériences que j'ai vécues étaient au Maroc ! Que ce soit à Marrakech ou maintenant à Tanger."
          : lang === "es"
            ? "¡¡¡Tangier Latin Festival fue una explosión!!! ¡¡¡Ustedes los marroquíes son tan cálidos, empáticos y devuelven tanta energía positiva que realmente todavía estoy emocionado!!! Enseño desde hace muchos, muchos años en todo el mundo y las mejores experiencias que he tenido han sido en Marruecos. Ya sea en Marrakech o ahora en Tánger."
            : "Tangier Latin Festival was a blast!!! You Moroccans are so warm-hearted, empathic and give back so much positive energy that I am really still flashed!!! I am teaching for many, many years all over the world and the best experiences I have made were in Morocco! Either in Marrakech or now in Tanger.",
    },
    {
      id: 2,
      name: "RAQUEL",
      country: lang === "fr" ? "PORTUGAL" : lang === "es" ? "PORTUGAL" : "PORTUGAL",
      avatar:
        "https://www.tangierlatinfestival.com/wp-content/uploads/2024/07/TLF-RAQUEL-e1720206100981.jpeg",
      quote:
        lang === "fr"
          ? "Partager c'est vivre. Merci pour cette danse incroyable, à Juan pour ce magnifique souvenir et à Tanger pour une année de plus."
          : lang === "es"
            ? "Compartir es vivir. Gracias por el tremendo baile, a Juan por el bonito recuerdo y a Tánger por un año más."
            : "Sharing is living. Thanks for the tremendous dance, Juan for the beautiful memory and Tangier for another year.",
    },
    {
      id: 3,
      name: "IVAN Y CORAL",
      country: lang === "fr" ? "ESPAGNE" : lang === "es" ? "ESPAÑA" : "SPAIN",
      avatar:
        "https://www.tangierlatinfestival.com/wp-content/uploads/elementor/thumbs/IVAN-Y-CORAL-r9ti0q9p3aewov45pv6sr9fhkkyx1akfnuz3dq4b08.jpeg",
      quote:
        lang === "fr"
          ? "Mon Dieu !!! Nous n'arrêtons pas de regarder la vidéo et de nous souvenir des super grands moments que nous avons pu vivre là-bas. Ce furent des journées extrêmement enrichissantes tant au niveau culturel qu'en termes d'apprentissage professionnel. Nous avons tellement hâte que la prochaine édition arrive !"
          : lang === "es"
            ? "¡¡¡Madre mía!!! No paramos de ver el video y de recordar los súper momentazos que pudimos vivir allí. Fueron unos días súper enriquecedores tanto en cultura como en aprendizaje profesional. ¡Qué ganas tenemos de que llegue la siguiente edición!"
            : "Oh my God!!! We can't stop watching the video and remembering the super moments we lived there. They were extremely enriching days, both in culture and in terms of professional learning. We are looking forward to the next edition so much!",
    },
    {
      id: 4,
      name: "TALAL & EDYTA",
      country:
        lang === "fr"
          ? "BELGIQUE & POLOGNE"
          : lang === "es"
            ? "BÉLGICA & POLONIA"
            : "BELGIUM & POLAND",
      avatar:
        "https://www.tangierlatinfestival.com/wp-content/uploads/elementor/thumbs/TALAL-EDYTA--r9thxr43g6c7xbft3kvbv0gxunn2nsr194lqo6j6pk.jpeg",
      quote:
        lang === "fr"
          ? "Le public marocain... Notre peuple... Toujours accueillant... Nous éprouvons un immense plaisir à les rencontrer dans les congrès, à partager avec eux lors des ateliers, à nous amuser avec eux lors des soirées... C'est pourquoi nous veillons à ne jamais manquer ces événements au Maroc... Tangier Latin Festival... Nous reviendrons..."
          : lang === "es"
            ? "El público marroquí... Nuestra gente... Siempre acogedora... Nos da un gran placer encontrarlos en los congresos, compartir con ellos durante los talleres, disfrutar con ellos durante las fiestas... Por eso nos aseguramos de no perdernos nunca esos eventos en Marruecos... Tangier Latin Festival... Volveremos..."
            : "Moroccan crowd... Our people...Always welcoming... We find big pleasure meeting them in congresses..sharing with them during workshops…enjoying with them during parties… That’s why we make sure we never miss that those events in Morocco… Tangier Latin Festival…We’ll be back….",
    },
    {
      id: 5,
      name: "LAURA",
      country: lang === "fr" ? "COLOMBIE" : lang === "es" ? "COLOMBIA" : "COLOMBIA",
      avatar:
        "https://www.tangierlatinfestival.com/wp-content/uploads/2024/07/LAURA-e1720206234140.jpeg",
      quote:
        lang === "fr"
          ? "Un petit aperçu de ce qu'était la soirée sociale du samedi au Tangier Latin Festival. Un plaisir d'être là une année de plus pour cet événement, merci pour votre confiance."
          : lang === "es"
            ? "Un poquito de lo que fue el social del sábado en @tangierlatinfestival.official Un placer estar un año mas en este evento, gracias por confiar en nosotros."
            : "A little glimpse of what the Saturday social was like at Tangier Latin Festival. A pleasure to be here another year for this event, thank you for trusting us.",
    },
    {
      id: 6,
      name: "DANI K",
      country: lang === "fr" ? "ROYAUME-UNI" : lang === "es" ? "REINO UNIDO" : "UNITED KINGDOM",
      avatar:
        "https://www.tangierlatinfestival.com/wp-content/uploads/2024/07/DANI-K--e1720206941803.jpeg",
      quote:
        lang === "fr"
          ? "Reconnaissant pour tout l'amour, et béni pour cette opportunité. Merci au Tangier International Latin Festival de nous avoir accueillis et pour toute cette affection. Inspiré et motivé en compagnie de danseurs fantastiques."
          : lang === "es"
            ? "Agradecido por el cariño, y bendecido por la oportunidad. Gracias a Tangier International Latin Festival por recibirnos y por el amor. Inspirado y motivado en compañía de bailarines fantásticos."
            : "Feeling grateful for the love, and blessed for the opportunity. Thank you Tangier International Latin Festival for having us and for the love. Inspired and motivated in the company of fantastic dancers.",
    },
    {
      id: 7,
      name: "EL CRUZ & NADEGE",
      country: lang === "fr" ? "LUXEMBOURG" : lang === "es" ? "LUXEMBURGO" : "LUXEMBOURG",
      avatar:
        "https://www.tangierlatinfestival.com/wp-content/uploads/2024/07/EL-CRUZ-NADEGE-e1720206422700.jpeg",
      quote:
        lang === "fr"
          ? "C'était notre première fois au Maroc ! Nous espérions un peu plus de soleil dans le ciel ce week-end, mais il était dans vos cœurs !"
          : lang === "es"
            ? "¡Fue nuestra primera vez en Marruecos! ¡Esperábamos un poco más de sol en el cielo este fin de semana, pero estaba en sus corazones!"
            : "It was our first time in Morocco! We hoped for a bit more sun in the sky this weekend, but it was in your hearts!",
    },
    {
      id: 8,
      name: "AMI EMIRATO",
      country: lang === "fr" ? "ROYAUME-UNI" : lang === "es" ? "REINO UNIDO" : "UNITED KINGDOM",
      avatar: "https://www.tangierlatinfestival.com/wp-content/uploads/2024/07/Ami-Emirato.jpeg",
      quote:
        lang === "fr"
          ? "90 minutes de musicalité Bachata en feu ! Merci au Tangier Latin Dance Festival pour la confiance !"
          : lang === "es"
            ? "¡90 minutos de musicalidad en Bachata encendidos! ¡Gracias a Tangier Latin Dance Festival por la confianza!"
            : "90 mins on Bachata Musicality on fire! Thank you Tangier latin Dance Festival for the trust!",
    },
    {
      id: 9,
      name: "FOLIVI",
      country: lang === "fr" ? "LUXEMBOURG" : lang === "es" ? "LUXEMBURGO" : "LUXEMBOURG",
      avatar:
        "https://www.tangierlatinfestival.com/wp-content/uploads/2024/07/FOLIVI-e1720206683125.jpeg",
      quote:
        lang === "fr"
          ? "C'était génial de mixer et danser avec vous pendant ce week-end de folie !"
          : lang === "es"
            ? "¡Fue genial mezclar y bailar con vosotros durante este fin de semana de locura!"
            : "It was awesome mixing and dancing with you guys during this crazy weekend!",
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
            {lang === "fr"
              ? "AVIS DES ARTISTES"
              : lang === "es"
                ? "TESTIMONIOS DE ARTISTAS"
                : "WHAT THEY SAY"}
          </p>
          <h1 className="font-display text-5xl md:text-7xl leading-[0.95] uppercase">
            {lang === "fr" ? "Témoignages" : lang === "es" ? "Testimonios" : "Testimonials"}
          </h1>
          <p className="mt-6 text-muted-foreground max-w-2xl mx-auto text-sm md:text-base leading-relaxed">
            {lang === "fr"
              ? "Découvrez les retours exclusifs de nos artistes internationaux et professeurs sur leur incroyable expérience au Tangier International Latin Festival."
              : lang === "es"
                ? "Descubre los testimonios exclusivos de nuestros artistas internacionales y profesores sobre su increíble experiencia en el Tangier International Latin Festival."
                : "Discover exclusive feedback from our international artists, DJs, and instructors about their amazing experience at the Tangier International Latin Festival."}
          </p>
        </div>
      </section>

      {/* TESTIMONIAL VIDEO PLAYER */}
      <section className="py-16 md:py-24 bg-card/10">
        <div className="mx-auto max-w-7xl px-6">
          <div className="text-center mb-12">
            <p className="text-xs tracking-[0.35em] uppercase text-primary mb-3">
              {lang === "fr" ? "Avis Vidéo" : lang === "es" ? "Vídeo Testimonio" : "Featured Video"}
            </p>
            <h2 className="font-display text-3xl md:text-5xl uppercase">
              {lang === "fr"
                ? "Vibe du Festival"
                : lang === "es"
                  ? "Energía del Festival"
                  : "Festival Energy"}
            </h2>
          </div>
          <VideoTestimonial />
        </div>
      </section>

      {/* TESTIMONIALS GRID */}
      <section className="py-20 md:py-28">
        <div className="mx-auto max-w-7xl px-6">
          <div className="text-center mb-16">
            <p className="text-xs tracking-[0.35em] uppercase text-primary mb-3">
              {lang === "fr"
                ? "Témoignages Écrits"
                : lang === "es"
                  ? "Opiniones Escritas"
                  : "Written Reviews"}
            </p>
            <h2 className="font-display text-3xl md:text-5xl uppercase">
              {lang === "fr"
                ? "Partager c'est vivre"
                : lang === "es"
                  ? "Compartir es vivir"
                  : "Sharing is Living"}
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 items-start">
            {testimonials.map((item) => (
              <div
                key={item.id}
                className="relative bg-card/45 backdrop-blur-xl border border-border/40 hover:border-gold/30 hover:shadow-gold rounded-3xl p-8 transition-all duration-500 group flex flex-col justify-between h-full min-h-[300px]"
              >
                {/* Quote Icon */}
                <div className="absolute top-6 right-8 text-gold/10 group-hover:text-gold/20 transition-colors duration-300">
                  <Quote className="h-10 w-10 rotate-180 fill-current" />
                </div>

                <div className="space-y-6">
                  {/* Testimonial Quote */}
                  <p className="text-foreground/90 text-sm leading-relaxed italic">
                    "{item.quote}"
                  </p>
                </div>

                {/* Profile Casing */}
                <div className="flex items-center gap-4 mt-8 pt-6 border-t border-border/30">
                  <img
                    src={item.avatar}
                    alt={item.name}
                    className="w-12 h-12 rounded-full object-cover border border-gold/30 shadow-soft"
                    loading="lazy"
                  />
                  <div>
                    <h4 className="font-display text-base tracking-wider text-gold">{item.name}</h4>
                    <p className="text-[10px] tracking-[0.2em] text-muted-foreground uppercase">
                      {item.country}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* BOOKING CTA */}
      <section className="relative py-24 md:py-32 border-t border-border/40 bg-gradient-to-b from-card/10 to-gold/5 overflow-hidden">
        <div className="mx-auto max-w-4xl px-6 text-center space-y-6 relative z-10">
          <p className="text-xs tracking-[0.4em] uppercase text-primary font-semibold">
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
          <p className="text-muted-foreground max-w-lg mx-auto text-sm md:text-base">
            {lang === "fr"
              ? "Prêt à rejoindre l'événement ? Réservez votre pack et découvrez nos offres exclusives sans plus attendre."
              : lang === "es"
                ? "¿Listo para unirte al evento? Reserva tu pack y descubre nuestras ofertas exclusivas sin perder tiempo."
                : "Ready to join the magic? Reserve your pack and discover our exclusive offers right now."}
          </p>
          <div className="pt-6">
            <a
              href="/#packs"
              className="inline-flex items-center gap-2 rounded-full bg-gold px-8 py-4 text-sm font-semibold text-primary-foreground shadow-gold hover:opacity-90 hover:scale-105 active:scale-95 transition-all duration-300 cursor-pointer"
            >
              <span>{t("buyPackBtn")}</span>
              <ArrowRight className="h-4 w-4" />
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}

function VideoTestimonial() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
        setIsPlaying(false);
      } else {
        videoRef.current.play();
        setIsPlaying(true);
      }
    }
  };

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  return (
    <div className="relative rounded-3xl overflow-hidden bg-black shadow-gold group border border-border/40 max-w-4xl mx-auto mb-8">
      <video
        ref={videoRef}
        src="https://www.tangierlatinfestival.com/wp-content/uploads/2025/08/TESTIMONIALS-2.mov"
        className="w-full h-[300px] md:h-[480px] object-cover"
        loop
        playsInline
        onClick={togglePlay}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
      />
      {/* Control Overlays */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none flex flex-col justify-end p-6 z-20">
        <div className="flex items-center justify-between w-full pointer-events-auto">
          <button
            onClick={togglePlay}
            className="flex items-center justify-center bg-gold text-primary-foreground h-11 w-11 rounded-full hover:scale-105 active:scale-95 transition cursor-pointer shadow-gold"
          >
            {isPlaying ? (
              <Pause className="h-5 w-5" />
            ) : (
              <Play className="h-5 w-5 fill-current ml-0.5" />
            )}
          </button>
          <button
            onClick={toggleMute}
            className="flex items-center justify-center bg-black/40 backdrop-blur-md border border-white/10 text-white h-11 w-11 rounded-full hover:scale-105 active:scale-95 transition cursor-pointer"
          >
            {isMuted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Big Center Play Button (when not playing) */}
      {!isPlaying && (
        <button
          onClick={togglePlay}
          className="absolute inset-0 flex items-center justify-center bg-black/20 backdrop-blur-[1px] hover:bg-black/30 transition cursor-pointer z-10"
        >
          <div className="flex items-center justify-center bg-gold/90 text-primary-foreground h-20 w-20 rounded-full shadow-gold hover:scale-110 active:scale-95 transition-all duration-300">
            <Play className="h-9 w-9 fill-current ml-1" />
          </div>
        </button>
      )}
    </div>
  );
}
