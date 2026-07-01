import { createFileRoute } from "@tanstack/react-router";
import { Quote, Play, Pause, Volume2, VolumeX, ArrowRight, Star } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { z } from "zod";
import { Nav } from "@/components/Nav";
import { useLanguage } from "@/hooks/useLanguage";
import { translations, Language } from "@/lib/translations";

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

const floatUpStyle = `
@keyframes float-up {
  0% { transform: translateY(0) scale(1); opacity: 0; }
  20% { opacity: 1; transform: translateY(-20px) scale(1.2); }
  80% { opacity: 1; transform: translateY(-80px) scale(1); }
  100% { transform: translateY(-100px) scale(0.8); opacity: 0; }
}
.animate-float-up {
  animation: float-up 2.5s ease-out forwards;
}

@keyframes star-fade-fill {
  0% { fill: transparent; opacity: 0.3; transform: scale(0.8); }
  40% { fill: currentColor; opacity: 1; transform: scale(1.15); }
  80%, 100% { fill: transparent; opacity: 0.3; transform: scale(0.8); }
}
.animate-star-fill {
  animation: star-fade-fill 2s ease-in-out infinite;
}
`;

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
          ? "Tangier Latin Festival a été un succès retentissant !!! Vous, les Marocains, êtes si chaleureux, empathiques et transmettez tellement d'énergie positive que je suis encore tout impressionné !!! J'enseigne depuis de très nombreuses années dans le monde entier et les meilleures expériences que j'ai vécues étaient au Maroc !"
          : lang === "es"
            ? "¡¡¡Tangier Latin Festival fue una explosión!!! ¡¡¡Ustedes los marroquíes son tan cálidos, empáticos y devuelven tanta energía positiva que realmente todavía estoy emocionado!!! Enseño desde hace muchos años en todo el mundo y las mejores experiencias que he tenido han sido en Marruecos."
            : "Tangier Latin Festival was a blast!!! You Moroccans are so warm-hearted, empathic and give back so much positive energy that I am really still flashed!!! I am teaching for many, many years all over the world and the best experiences I have made were in Morocco!",
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
          ? "Mon Dieu !!! Nous n'arrêtons pas de regarder la vidéo et de nous souvenir des super grands moments que nous avons pu vivre là-bas. Ce furent des journées extrêmement enrichissantes tant au niveau culturel qu'en termes d'apprentissage professionnel."
          : lang === "es"
            ? "¡¡¡Madre mía!!! No paramos de ver el video y de recordar los súper momentazos que pudimos vivir allí. Fueron unos días súper enriquecedores tanto en cultura como en aprendizaje profesional."
            : "Oh my God!!! We can't stop watching the video and remembering the super moments we lived there. They were extremely enriching days, both in culture and in terms of professional learning.",
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
          ? "Le public marocain... Notre peuple... Toujours accueillant... Nous éprouvons un immense plaisir à les rencontrer dans les congrès, à partager avec eux lors des ateliers... Tangier Latin Festival... Nous reviendrons..."
          : lang === "es"
            ? "El público marroquí... Nuestra gente... Siempre acogedora... Nos da un gran placer encontrarlos en los congresos, compartir con ellos durante los talleres... Tangier Latin Festival... Volveremos..."
            : "Moroccan crowd... Our people...Always welcoming... We find big pleasure meeting them in congresses..sharing with them during workshops… That’s why we make sure we never miss that those events in Morocco… Tangier Latin Festival…We’ll be back….",
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
    <div className="min-h-screen bg-white font-sans">
      <style>{floatUpStyle}</style>
      <Nav />

      {/* ── Hero Banner ─────────────────────────────── */}
      <section className="relative flex flex-col justify-center h-[65vh] min-h-[460px] overflow-hidden border-b border-white/5">
        {/* Generated Image Background */}
        <div className="absolute inset-0 z-0">
          <img src="/testimonials_bg.png" alt="" className="h-full w-full object-cover" />
          <div className="absolute inset-0 bg-black/60" />
        </div>

        <div className="relative z-10 max-w-5xl mx-auto px-6 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-gold/20 bg-gold/5 backdrop-blur-sm mb-6">
            <Star className="h-3.5 w-3.5 text-gold animate-star-fill" style={{ animationDelay: "0ms" }} />
            <Star className="h-3.5 w-3.5 text-gold animate-star-fill" style={{ animationDelay: "200ms" }} />
            <Star className="h-3.5 w-3.5 text-gold animate-star-fill" style={{ animationDelay: "400ms" }} />
            <Star className="h-3.5 w-3.5 text-gold animate-star-fill" style={{ animationDelay: "600ms" }} />
            <Star className="h-3.5 w-3.5 text-gold animate-star-fill" style={{ animationDelay: "800ms" }} />
          </div>
          
          <h1 className="font-display text-5xl sm:text-6xl md:text-7xl xl:text-8xl uppercase text-white drop-shadow-md mb-8 leading-[1.1]">
            {lang === "fr" ? "Témoignages" : lang === "es" ? "Testimonios" : "Testimonials"}
          </h1>
          
          <p className="text-slate-200 text-base md:text-lg max-w-2xl mx-auto leading-relaxed">
            {lang === "fr"
              ? "Découvrez les retours exclusifs des participants sur leur incroyable expérience au Tangier International Latin Festival."
              : lang === "es"
                ? "Descubre los testimonios exclusivos de los participantes sobre su increíble experiencia en el Tangier International Latin Festival."
                : "Discover exclusive feedback from our participants about their amazing experience at the Tangier International Latin Festival."}
          </p>
        </div>
      </section>

      {/* ── Featured Video & Masonry Grid ─────────────────────────────── */}
      <section className="relative py-20 md:py-32">
        <div className="max-w-7xl mx-auto px-6">
          
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-16 items-start">
            
            {/* Left Column: Phone Video */}
            <div className="lg:col-span-4 lg:sticky lg:top-32">
               <div className="text-center lg:text-left mb-8">
                  <p className="text-xs tracking-[0.3em] uppercase text-gold font-bold mb-3">
                     {lang === "fr" ? "Avis Vidéo" : lang === "es" ? "Vídeo Testimonio" : "Featured Video"}
                  </p>
                  <h2 className="font-display text-3xl md:text-4xl uppercase text-slate-950">
                     {lang === "fr" ? "Vibe du Festival" : lang === "es" ? "Energía del Festival" : "Festival Energy"}
                  </h2>
               </div>
               <VideoTestimonialPhone lang={lang} />
            </div>

            {/* Right Column: Masonry Testimonials */}
            <div className="lg:col-span-8">
               <div className="text-center lg:text-left mb-8 lg:mb-12">
                  <p className="text-xs tracking-[0.3em] uppercase text-gold font-bold mb-3">
                     {lang === "fr" ? "Témoignages Écrits" : lang === "es" ? "Opiniones Escritas" : "Written Reviews"}
                  </p>
                  <h2 className="font-display text-3xl md:text-4xl uppercase text-slate-950">
                     {lang === "fr" ? "Partager c'est vivre" : lang === "es" ? "Compartir es vivir" : "Sharing is Living"}
                  </h2>
               </div>
               
               <div className="columns-1 md:columns-2 gap-6 space-y-6">
                  {testimonials.map((item) => (
                     <div
                        key={item.id}
                        className="break-inside-avoid relative bg-slate-50 backdrop-blur-md border border-slate-200 hover:border-gold/50 hover:shadow-[0_8px_30px_rgba(212,175,55,0.15)] hover:bg-slate-100 rounded-[2rem] p-8 transition-all duration-500 group flex flex-col mb-6"
                     >


                        <p className="text-slate-700 text-base leading-relaxed italic relative z-10 mb-8">
                           "{item.quote}"
                        </p>

                        <div className="flex items-center gap-4 mt-auto pt-6 border-t border-slate-200">
                           <div className="relative">
                              <div className="absolute inset-0 bg-gold rounded-full blur-md opacity-0 group-hover:opacity-40 transition-opacity duration-500" />
                              <img
                                 src={item.avatar}
                                 alt={item.name}
                                 className="relative w-12 h-12 rounded-full object-cover border-2 border-white shadow-md group-hover:scale-105 transition-transform duration-500"
                                 loading="lazy"
                              />
                           </div>
                           <div>
                              <h4 className="font-bold text-slate-950 tracking-wide group-hover:text-gold transition-colors">{item.name}</h4>
                              <p className="text-[10px] font-bold tracking-[0.2em] text-slate-500 uppercase">
                                 {item.country}
                              </p>
                           </div>
                        </div>
                     </div>
                  ))}
               </div>
            </div>

          </div>
        </div>
      </section>

      {/* ── CTA ─────────────────────────────── */}
      <section className="relative py-24 md:py-32 overflow-hidden bg-[#e09139]">
         <div className="mx-auto max-w-4xl px-6 text-center space-y-6 relative z-10">
            <p className="text-xs md:text-sm tracking-[0.4em] uppercase text-white font-bold drop-shadow-sm">
               {lang === "fr"
               ? "Premier arrivé, premier servi !"
               : lang === "es"
                  ? "¡Plazas limitadas!"
                  : "First come, first served!"}
            </p>
            <h2 className="font-display text-4xl md:text-5xl lg:text-6xl uppercase leading-[1.2] text-white font-bold drop-shadow-md">
               {lang === "fr"
               ? "Vous n'avez pas encore réservé votre place ?"
               : lang === "es"
                  ? "¿Aún no has reservado tu plaza?"
                  : "Haven't booked your spot yet?"}
            </h2>
            <p className="text-white/90 max-w-2xl mx-auto text-sm md:text-base font-medium leading-relaxed">
               {lang === "fr"
               ? "Prêt à rejoindre l'événement ? Réservez votre pack et découvrez nos offres exclusives sans plus attendre."
               : lang === "es"
                  ? "¿Listo para unirte al evento? Reserva tu pack y descubre nuestras ofertas exclusivas sin perder tiempo."
                  : "Ready to join the magic? Reserve your pack and discover our exclusive offers right now."}
            </p>
            <div className="pt-8">
               <a
               href="/#packs"
               className="inline-flex items-center gap-2 rounded-full bg-white px-10 py-4 md:py-5 text-xs md:text-sm font-bold tracking-[0.15em] text-slate-900 uppercase shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 transition-all duration-300 cursor-pointer"
               >
               <span>{t("buyPackBtn")}</span>
               <ArrowRight className="h-4 w-4 md:h-5 md:w-5" />
               </a>
            </div>
         </div>
      </section>
    </div>
  );
}

function VideoTestimonialPhone({ lang }: { lang: string }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [reactions, setReactions] = useState<{ id: number; emoji: string; left: number }[]>([]);
  let reactionId = useRef(0);

  useEffect(() => {
    if (!isPlaying) return;
    const emojis = ["❤️", "🔥", "✨", "👏", "💃", "🕺"];
    const interval = setInterval(() => {
      const emoji = emojis[Math.floor(Math.random() * emojis.length)];
      const left = Math.random() * 80 + 10;
      const newReaction = { id: reactionId.current++, emoji, left };
      setReactions(prev => [...prev, newReaction]);
      setTimeout(() => {
        setReactions(prev => prev.filter(r => r.id !== newReaction.id));
      }, 2500);
    }, 800);
    return () => clearInterval(interval);
  }, [isPlaying]);

  return (
    <div className="relative mx-auto w-full max-w-[240px] md:max-w-[320px] aspect-[9/19] rounded-[2rem] md:rounded-[3rem] border-[6px] md:border-[8px] border-slate-900 bg-slate-950 shadow-2xl overflow-hidden ring-4 ring-gold/20 group">
      {/* Dynamic Island / Notch */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[35%] h-6 bg-slate-900 rounded-b-2xl z-30 flex items-center justify-center">
         <div className="w-2 h-2 rounded-full bg-black/50 ml-6" />
      </div>
      
      <video
        ref={videoRef}
        src="/mot_sur_le_festival.mp4"
        className="absolute inset-0 w-full h-full object-cover rounded-[2.5rem]"
        loop
        playsInline
      />
      
      {/* Click-to-play overlay */}
      <div 
        className="absolute inset-0 z-20 cursor-pointer" 
        onClick={() => {
          if (videoRef.current) {
            if (isPlaying) videoRef.current.pause();
            else videoRef.current.play();
            setIsPlaying(!isPlaying);
          }
        }} 
      />
      
      {/* Reactions Overlay */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-20">
        {reactions.map(r => (
          <div
            key={r.id}
            className="absolute bottom-24 text-3xl animate-float-up opacity-0"
            style={{ left: `${r.left}%` }}
          >
            {r.emoji}
          </div>
        ))}
      </div>

      {/* gradient overlay */}
      <div className="absolute inset-x-0 bottom-0 h-[60%] bg-gradient-to-t from-black/90 via-black/40 to-transparent pointer-events-none z-10 transition-opacity duration-500" />

      {/* Controls Area */}
      <div className="absolute inset-x-0 bottom-0 p-6 z-30 flex items-end justify-between pointer-events-none">
        <div className="flex-1 pointer-events-auto pr-4">
          <div className="flex items-center gap-2 mb-2">
             <div className="w-8 h-8 rounded-full bg-gold flex items-center justify-center text-black font-bold text-xs">TLF</div>
             <p className="text-white font-bold text-sm drop-shadow-md">@tangierlatinfestival</p>
          </div>
          <p className="text-white/90 text-sm leading-snug drop-shadow-md">
            {lang === "fr" ? "Découvrez l'énergie incroyable de nos danseurs ! 🔥🕺" : lang === "es" ? "¡Descubre la increíble energía de nuestros bailarines! 🔥🕺" : "Discover the incredible energy of our dancers! 🔥🕺"}
          </p>
        </div>
        <div className="flex flex-col gap-4 pointer-events-auto">
          <div className="relative">
            {!isPlaying && (
              <span className="absolute inset-0 rounded-full animate-ping bg-gold/60" />
            )}
            <button
              onClick={() => {
                if (videoRef.current) {
                  if (isPlaying) videoRef.current.pause();
                  else videoRef.current.play();
                  setIsPlaying(!isPlaying);
                }
              }}
              className="relative flex items-center justify-center bg-white/20 backdrop-blur-xl rounded-full w-12 h-12 text-white hover:bg-gold hover:text-black hover:scale-110 transition-all duration-300 shadow-[0_4px_15px_rgba(0,0,0,0.2)]"
            >
              {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5 ml-1" />}
            </button>
          </div>
          <button
            onClick={() => {
              if (videoRef.current) {
                videoRef.current.muted = !isMuted;
                setIsMuted(!isMuted);
              }
            }}
            className="flex items-center justify-center bg-white/20 backdrop-blur-xl rounded-full w-12 h-12 text-white hover:bg-white/40 hover:scale-110 transition-all duration-300 shadow-[0_4px_15px_rgba(0,0,0,0.2)]"
          >
            {isMuted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Giant Play button when paused */}
      {!isPlaying && (
         <div className="absolute inset-0 z-20 flex items-center justify-center pointer-events-none bg-black/10 backdrop-blur-[1px] transition-all">
            <button
               onClick={() => {
                  if (videoRef.current) {
                     videoRef.current.play();
                     setIsPlaying(true);
                  }
               }}
               className="bg-gold/90 text-slate-950 w-24 h-24 rounded-full flex items-center justify-center shadow-[0_0_40px_rgba(212,175,55,0.6)] hover:scale-110 active:scale-95 transition-all duration-300 pointer-events-auto"
            >
               <Play className="h-10 w-10 ml-2" />
            </button>
         </div>
      )}
    </div>
  );
}
