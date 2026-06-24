import { createFileRoute } from "@tanstack/react-router";
import { useState, useRef, useEffect } from "react";
import { Play, Pause, Volume2, VolumeX, ChevronLeft } from "lucide-react";
import { Nav } from "@/components/Nav";
import { useLanguage } from "@/hooks/useLanguage";
import { translations, Language } from "@/lib/translations";

export const Route = createFileRoute("/reels")({
  head: (ctx) => {
    const search = (ctx.search || {}) as { lang?: string };
    const lang = (search?.lang || "en") as Language;
    const dict = translations[lang] || translations.en;
    return {
      meta: [
        { title: "Reels — Tangier International Latin Festival 2027" },
      ],
    };
  },
  component: ReelsPage,
});

const REELS_DATA = [
  { id: "1", title: "Festival Shows", src: "/reels/TLF - Shows.mp4" },
  { id: "2", title: "After Shows", src: "/reels/TLF - After Shows.mp4" },
  { id: "3", title: "Salsa Room", src: "/reels/TLF - Salsa Room.mp4" },
  { id: "4", title: "Bachata Room", src: "/reels/TLF - Bachata Room.mp4" },
  { id: "5", title: "Kizomba Room", src: "/reels/TLF - Kizomba Room.mp4" },
  { id: "6", title: "White Party", src: "/reels/TLF - White Party.mp4" },
  { id: "7", title: "Black Party", src: "/reels/TLF - Black Party.mp4" },
  { id: "8", title: "Workshops", src: "/reels/TLF - Workshops.mp4" },
  { id: "9", title: "Excursion", src: "/reels/Excursion.mp4" },
  { id: "10", title: "Behind The Scenes", src: "/reels/TLF - Behind the scenes.mp4" },
];

function ReelsPage() {
  const { lang, t } = useLanguage();
  // Shared mute state across all reels
  const [isMuted, setIsMuted] = useState(false);

  return (
    <div className="bg-black min-h-screen text-white flex flex-col overflow-hidden">
      <div className="fixed top-0 left-0 right-0 z-50">
        <Nav />
      </div>

      {/* Main scrolling container */}
      <div 
        className="flex-1 overflow-y-scroll snap-y snap-mandatory h-screen pt-0 md:pt-20 pb-0"
        style={{ height: "100dvh" }}
      >
        {REELS_DATA.map((reel, index) => (
          <ReelItem 
            key={reel.id} 
            reel={reel} 
            isMuted={isMuted} 
            setIsMuted={setIsMuted} 
            isActiveDefault={index === 0} 
          />
        ))}
      </div>
    </div>
  );
}

function ReelItem({ 
  reel, 
  isMuted, 
  setIsMuted,
  isActiveDefault
}: { 
  reel: typeof REELS_DATA[0], 
  isMuted: boolean, 
  setIsMuted: (m: boolean) => void,
  isActiveDefault: boolean
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isPlaying, setIsPlaying] = useState(isActiveDefault);
  const [isVisible, setIsVisible] = useState(isActiveDefault);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsVisible(true);
            setIsPlaying(true);
            if (videoRef.current) {
              videoRef.current.currentTime = 0; // Restart video when scrolling to it
              videoRef.current.play().catch(e => console.log("Autoplay prevented:", e));
            }
          } else {
            setIsVisible(false);
            setIsPlaying(false);
            if (videoRef.current) {
              videoRef.current.pause();
            }
          }
        });
      },
      {
        threshold: 0.6, // Trigger when 60% of the video is visible
      }
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => {
      if (containerRef.current) {
        observer.unobserve(containerRef.current);
      }
    };
  }, []);

  const togglePlay = (e: React.MouseEvent) => {
    e.stopPropagation();
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

  const toggleMute = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsMuted(!isMuted);
  };

  return (
    <div 
      ref={containerRef}
      className="snap-start snap-always relative w-full flex justify-center items-center bg-black h-full"
    >
      <div className="relative w-full h-full max-w-lg mx-auto bg-slate-900 overflow-hidden group">
        <video
          ref={videoRef}
          src={reel.src}
          className="w-full h-full object-cover"
          loop
          playsInline
          muted={isMuted}
          onClick={togglePlay}
          preload={isVisible ? "auto" : "none"}
        />

        {/* Overlays */}
        <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/80 via-black/40 to-transparent pointer-events-none">
          <h2 className="text-2xl font-display font-bold text-white drop-shadow-md">
            {reel.title}
          </h2>
          <p className="text-sm text-white/80 mt-1">Tangier International Latin Festival</p>
        </div>

        {/* Side Controls */}
        <div className="absolute right-4 bottom-20 flex flex-col gap-6 items-center z-10">
          <button 
            onClick={toggleMute}
            className="w-12 h-12 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center border border-white/10 hover:bg-black/60 transition shadow-lg"
          >
            {isMuted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
          </button>
        </div>

        {/* Big Center Play Button (when paused) */}
        {!isPlaying && (
          <button
            onClick={togglePlay}
            className="absolute inset-0 flex items-center justify-center bg-black/20 backdrop-blur-[2px] hover:bg-black/30 transition z-10"
          >
            <div className="flex items-center justify-center bg-gold/90 text-primary-foreground h-20 w-20 rounded-full shadow-gold hover:scale-110 active:scale-95 transition-all duration-300">
              <Play className="h-9 w-9 fill-current ml-1" />
            </div>
          </button>
        )}
      </div>
    </div>
  );
}
