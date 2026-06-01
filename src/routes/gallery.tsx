import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { z } from "zod";
import { Nav } from "@/components/Nav";
import { useLanguage } from "@/hooks/useLanguage";
import { translations, Language } from "@/lib/translations";
import { Camera, ChevronLeft, ChevronRight, X, Eye } from "lucide-react";
import heroImg from "@/assets/gallery1.jpg";

const gallerySearchSchema = z.object({
  lang: z.enum(["en", "fr", "es"]).optional(),
});

export const Route = createFileRoute("/gallery")({
  validateSearch: (search) => gallerySearchSchema.parse(search),
  head: (ctx) => {
    const search = (ctx.search || {}) as { lang?: string };
    const lang = (search?.lang || "en") as Language;
    const dict = translations[lang] || translations.en;
    return {
      meta: [
        { title: dict.seoGalleryTitle },
        { name: "description", content: dict.seoGalleryDesc },
        { property: "og:title", content: dict.seoGalleryTitle },
        { property: "og:description", content: dict.seoGalleryDesc },
      ],
    };
  },
  component: GalleryPage,
});

type Category =
  | "all"
  | "black-party"
  | "competition"
  | "friday-shows"
  | "saturday-shows"
  | "white-party"
  | "workshops";

interface GalleryPhoto {
  url: string;
  category: Category;
}

const GALLERY_PHOTOS: GalleryPhoto[] = [
  // 1. Black Party (16 photos)
  {
    url: "https://www.tangierlatinfestival.com/wp-content/uploads/2024/07/WhatsApp-Image-2024-07-06-at-00.46.06.jpeg",
    category: "black-party",
  },
  {
    url: "https://www.tangierlatinfestival.com/wp-content/uploads/2024/07/WhatsApp-Image-2024-06-25-at-23.07.11.jpeg",
    category: "black-party",
  },
  {
    url: "https://www.tangierlatinfestival.com/wp-content/uploads/2024/07/WhatsApp-Image-2024-06-25-at-23.07.12-1.jpeg",
    category: "black-party",
  },
  {
    url: "https://www.tangierlatinfestival.com/wp-content/uploads/2024/07/WhatsApp-Image-2024-06-25-at-23.07.12.jpeg",
    category: "black-party",
  },
  {
    url: "https://www.tangierlatinfestival.com/wp-content/uploads/2025/07/IMG_6787.jpg",
    category: "black-party",
  },
  {
    url: "https://www.tangierlatinfestival.com/wp-content/uploads/2024/07/WhatsApp-Image-2024-06-25-at-23.07.13-2.jpeg",
    category: "black-party",
  },
  {
    url: "https://www.tangierlatinfestival.com/wp-content/uploads/2024/07/WhatsApp-Image-2024-06-25-at-23.07.13.jpeg",
    category: "black-party",
  },
  {
    url: "https://www.tangierlatinfestival.com/wp-content/uploads/2025/07/IMG_6764.jpg",
    category: "black-party",
  },
  {
    url: "https://www.tangierlatinfestival.com/wp-content/uploads/2024/07/WhatsApp-Image-2024-06-25-at-23.07.15-1.jpeg",
    category: "black-party",
  },
  {
    url: "https://www.tangierlatinfestival.com/wp-content/uploads/2024/07/WhatsApp-Image-2024-06-25-at-23.07.15.jpeg",
    category: "black-party",
  },
  {
    url: "https://www.tangierlatinfestival.com/wp-content/uploads/2024/07/WhatsApp-Image-2024-06-25-at-23.07.16-1.jpeg",
    category: "black-party",
  },
  {
    url: "https://www.tangierlatinfestival.com/wp-content/uploads/2024/07/WhatsApp-Image-2024-06-25-at-23.07.16.jpeg",
    category: "black-party",
  },
  {
    url: "https://www.tangierlatinfestival.com/wp-content/uploads/2024/07/WhatsApp-Image-2024-06-25-at-23.07.17-1.jpeg",
    category: "black-party",
  },
  {
    url: "https://www.tangierlatinfestival.com/wp-content/uploads/2024/07/WhatsApp-Image-2024-06-25-at-23.07.17.jpeg",
    category: "black-party",
  },
  {
    url: "https://www.tangierlatinfestival.com/wp-content/uploads/2024/07/WhatsApp-Image-2024-06-25-at-23.07.18-1.jpeg",
    category: "black-party",
  },
  {
    url: "https://www.tangierlatinfestival.com/wp-content/uploads/2024/07/WhatsApp-Image-2024-06-25-at-23.07.18.jpeg",
    category: "black-party",
  },

  // 2. Competition (15 photos)
  {
    url: "https://www.tangierlatinfestival.com/wp-content/uploads/2024/07/WhatsApp-Image-2024-06-25-at-23.46.48.jpeg",
    category: "competition",
  },
  {
    url: "https://www.tangierlatinfestival.com/wp-content/uploads/2024/07/WhatsApp-Image-2024-06-25-at-23.46.49-1.jpeg",
    category: "competition",
  },
  {
    url: "https://www.tangierlatinfestival.com/wp-content/uploads/2024/07/WhatsApp-Image-2024-06-25-at-23.46.46.jpeg",
    category: "competition",
  },
  {
    url: "https://www.tangierlatinfestival.com/wp-content/uploads/2024/07/WhatsApp-Image-2024-06-25-at-23.46.51.jpeg",
    category: "competition",
  },
  {
    url: "https://www.tangierlatinfestival.com/wp-content/uploads/2024/07/WhatsApp-Image-2024-06-25-at-23.46.54.jpeg",
    category: "competition",
  },
  {
    url: "https://www.tangierlatinfestival.com/wp-content/uploads/2024/07/WhatsApp-Image-2024-06-25-at-23.46.49.jpeg",
    category: "competition",
  },
  {
    url: "https://www.tangierlatinfestival.com/wp-content/uploads/2025/07/1.jpg",
    category: "competition",
  },
  {
    url: "https://www.tangierlatinfestival.com/wp-content/uploads/2024/07/WhatsApp-Image-2024-06-25-at-23.46.50.jpeg",
    category: "competition",
  },
  {
    url: "https://www.tangierlatinfestival.com/wp-content/uploads/2024/07/WhatsApp-Image-2024-06-25-at-23.46.48-1.jpeg",
    category: "competition",
  },
  {
    url: "https://www.tangierlatinfestival.com/wp-content/uploads/2024/07/WhatsApp-Image-2024-06-25-at-23.46.47.jpeg",
    category: "competition",
  },
  {
    url: "https://www.tangierlatinfestival.com/wp-content/uploads/2025/07/4.jpg",
    category: "competition",
  },
  {
    url: "https://www.tangierlatinfestival.com/wp-content/uploads/2024/07/WhatsApp-Image-2024-06-25-at-23.46.51-1.jpeg",
    category: "competition",
  },
  {
    url: "https://www.tangierlatinfestival.com/wp-content/uploads/2025/07/5.jpg",
    category: "competition",
  },
  {
    url: "https://www.tangierlatinfestival.com/wp-content/uploads/2025/07/3.jpg",
    category: "competition",
  },
  {
    url: "https://www.tangierlatinfestival.com/wp-content/uploads/2025/07/2.jpg",
    category: "competition",
  },

  // 3. Friday Shows (16 photos)
  {
    url: "https://www.tangierlatinfestival.com/wp-content/uploads/2024/07/WhatsApp-Image-2024-06-25-at-23.11.59.jpeg",
    category: "friday-shows",
  },
  {
    url: "https://www.tangierlatinfestival.com/wp-content/uploads/2024/07/WhatsApp-Image-2024-06-25-at-23.12.00-1.jpeg",
    category: "friday-shows",
  },
  {
    url: "https://www.tangierlatinfestival.com/wp-content/uploads/2024/07/WhatsApp-Image-2024-06-25-at-23.12.01.jpeg",
    category: "friday-shows",
  },
  {
    url: "https://www.tangierlatinfestival.com/wp-content/uploads/2024/07/WhatsApp-Image-2024-06-25-at-23.12.02-1.jpeg",
    category: "friday-shows",
  },
  {
    url: "https://www.tangierlatinfestival.com/wp-content/uploads/2024/07/WhatsApp-Image-2024-06-25-at-23.12.02.jpeg",
    category: "friday-shows",
  },
  {
    url: "https://www.tangierlatinfestival.com/wp-content/uploads/2024/07/WhatsApp-Image-2024-06-25-at-23.12.03-1.jpeg",
    category: "friday-shows",
  },
  {
    url: "https://www.tangierlatinfestival.com/wp-content/uploads/2024/07/WhatsApp-Image-2024-06-25-at-23.12.03.jpeg",
    category: "friday-shows",
  },
  {
    url: "https://www.tangierlatinfestival.com/wp-content/uploads/2024/07/WhatsApp-Image-2024-06-25-at-23.12.04-1.jpeg",
    category: "friday-shows",
  },
  {
    url: "https://www.tangierlatinfestival.com/wp-content/uploads/2024/07/WhatsApp-Image-2024-06-25-at-23.12.04.jpeg",
    category: "friday-shows",
  },
  {
    url: "https://www.tangierlatinfestival.com/wp-content/uploads/2024/07/WhatsApp-Image-2024-06-25-at-23.12.05-1.jpeg",
    category: "friday-shows",
  },
  {
    url: "https://www.tangierlatinfestival.com/wp-content/uploads/2024/07/WhatsApp-Image-2024-06-25-at-23.12.07-1.jpeg",
    category: "friday-shows",
  },
  {
    url: "https://www.tangierlatinfestival.com/wp-content/uploads/2024/07/WhatsApp-Image-2024-06-25-at-23.12.07.jpeg",
    category: "friday-shows",
  },
  {
    url: "https://www.tangierlatinfestival.com/wp-content/uploads/2025/07/44.jpg",
    category: "friday-shows",
  },
  {
    url: "https://www.tangierlatinfestival.com/wp-content/uploads/2025/07/33.jpg",
    category: "friday-shows",
  },
  {
    url: "https://www.tangierlatinfestival.com/wp-content/uploads/2025/07/22.jpg",
    category: "friday-shows",
  },
  {
    url: "https://www.tangierlatinfestival.com/wp-content/uploads/2025/07/11.jpg",
    category: "friday-shows",
  },

  // 4. Saturday Shows (15 photos)
  {
    url: "https://www.tangierlatinfestival.com/wp-content/uploads/2024/07/WhatsApp-Image-2024-06-25-at-23.35.24-1.jpeg",
    category: "saturday-shows",
  },
  {
    url: "https://www.tangierlatinfestival.com/wp-content/uploads/2024/07/WhatsApp-Image-2024-06-25-at-23.35.25-1.jpeg",
    category: "saturday-shows",
  },
  {
    url: "https://www.tangierlatinfestival.com/wp-content/uploads/2024/07/WhatsApp-Image-2024-06-25-at-23.35.25.jpeg",
    category: "saturday-shows",
  },
  {
    url: "https://www.tangierlatinfestival.com/wp-content/uploads/2024/07/WhatsApp-Image-2024-06-25-at-23.35.26.jpeg",
    category: "saturday-shows",
  },
  {
    url: "https://www.tangierlatinfestival.com/wp-content/uploads/2024/07/WhatsApp-Image-2024-06-25-at-23.35.27-1.jpeg",
    category: "saturday-shows",
  },
  {
    url: "https://www.tangierlatinfestival.com/wp-content/uploads/2024/07/WhatsApp-Image-2024-06-25-at-23.35.27.jpeg",
    category: "saturday-shows",
  },
  {
    url: "https://www.tangierlatinfestival.com/wp-content/uploads/2025/07/S1.jpg",
    category: "saturday-shows",
  },
  {
    url: "https://www.tangierlatinfestival.com/wp-content/uploads/2024/07/WhatsApp-Image-2024-06-25-at-23.35.28-1.jpeg",
    category: "saturday-shows",
  },
  {
    url: "https://www.tangierlatinfestival.com/wp-content/uploads/2024/07/WhatsApp-Image-2024-06-25-at-23.35.24.jpeg",
    category: "saturday-shows",
  },
  {
    url: "https://www.tangierlatinfestival.com/wp-content/uploads/2024/07/WhatsApp-Image-2024-06-25-at-23.35.28.jpeg",
    category: "saturday-shows",
  },
  {
    url: "https://www.tangierlatinfestival.com/wp-content/uploads/2024/07/WhatsApp-Image-2024-06-25-at-23.35.29-1.jpeg",
    category: "saturday-shows",
  },
  {
    url: "https://www.tangierlatinfestival.com/wp-content/uploads/2024/07/WhatsApp-Image-2024-06-25-at-23.35.29.jpeg",
    category: "saturday-shows",
  },
  {
    url: "https://www.tangierlatinfestival.com/wp-content/uploads/2024/07/WhatsApp-Image-2024-06-25-at-23.35.30-1.jpeg",
    category: "saturday-shows",
  },
  {
    url: "https://www.tangierlatinfestival.com/wp-content/uploads/2024/07/WhatsApp-Image-2024-06-25-at-23.35.30.jpeg",
    category: "saturday-shows",
  },
  {
    url: "https://www.tangierlatinfestival.com/wp-content/uploads/2024/07/WhatsApp-Image-2024-06-25-at-23.35.31.jpeg",
    category: "saturday-shows",
  },

  // 5. White Party (16 photos)
  {
    url: "https://www.tangierlatinfestival.com/wp-content/uploads/2024/07/WhatsApp-Image-2024-06-25-at-23.30.23.jpeg",
    category: "white-party",
  },
  {
    url: "https://www.tangierlatinfestival.com/wp-content/uploads/2024/07/WhatsApp-Image-2024-06-25-at-23.30.25-1.jpeg",
    category: "white-party",
  },
  {
    url: "https://www.tangierlatinfestival.com/wp-content/uploads/2024/07/WhatsApp-Image-2024-06-25-at-23.30.25.jpeg",
    category: "white-party",
  },
  {
    url: "https://www.tangierlatinfestival.com/wp-content/uploads/2024/07/WhatsApp-Image-2024-06-25-at-23.30.26-1.jpeg",
    category: "white-party",
  },
  {
    url: "https://www.tangierlatinfestival.com/wp-content/uploads/2024/07/WhatsApp-Image-2024-06-25-at-23.30.27-1.jpeg",
    category: "white-party",
  },
  {
    url: "https://www.tangierlatinfestival.com/wp-content/uploads/2024/07/WhatsApp-Image-2024-06-25-at-23.30.27.jpeg",
    category: "white-party",
  },
  {
    url: "https://www.tangierlatinfestival.com/wp-content/uploads/2024/07/WhatsApp-Image-2024-06-25-at-23.30.29-1.jpeg",
    category: "white-party",
  },
  {
    url: "https://www.tangierlatinfestival.com/wp-content/uploads/2024/07/WhatsApp-Image-2024-06-25-at-23.30.30-1.jpeg",
    category: "white-party",
  },
  {
    url: "https://www.tangierlatinfestival.com/wp-content/uploads/2024/07/WhatsApp-Image-2024-06-25-at-23.30.30.jpeg",
    category: "white-party",
  },
  {
    url: "https://www.tangierlatinfestival.com/wp-content/uploads/2024/07/WhatsApp-Image-2024-06-25-at-23.30.31.jpeg",
    category: "white-party",
  },
  {
    url: "https://www.tangierlatinfestival.com/wp-content/uploads/2025/07/W6.jpg",
    category: "white-party",
  },
  {
    url: "https://www.tangierlatinfestival.com/wp-content/uploads/2025/07/W5.jpg",
    category: "white-party",
  },
  {
    url: "https://www.tangierlatinfestival.com/wp-content/uploads/2025/07/W4.jpg",
    category: "white-party",
  },
  {
    url: "https://www.tangierlatinfestival.com/wp-content/uploads/2025/07/W3.jpg",
    category: "white-party",
  },
  {
    url: "https://www.tangierlatinfestival.com/wp-content/uploads/2025/07/W1.jpg",
    category: "white-party",
  },
  {
    url: "https://www.tangierlatinfestival.com/wp-content/uploads/2025/07/W2.jpg",
    category: "white-party",
  },

  // 6. Workshops (20 photos)
  {
    url: "https://www.tangierlatinfestival.com/wp-content/uploads/2024/07/WhatsApp-Image-2024-06-25-at-23.53.50.jpeg",
    category: "workshops",
  },
  {
    url: "https://www.tangierlatinfestival.com/wp-content/uploads/2025/07/WK2.jpg",
    category: "workshops",
  },
  {
    url: "https://www.tangierlatinfestival.com/wp-content/uploads/2024/07/WhatsApp-Image-2024-06-25-at-23.53.53-1.jpeg",
    category: "workshops",
  },
  {
    url: "https://www.tangierlatinfestival.com/wp-content/uploads/2024/07/WhatsApp-Image-2024-07-06-at-00.59.50.jpeg",
    category: "workshops",
  },
  {
    url: "https://www.tangierlatinfestival.com/wp-content/uploads/2024/07/WhatsApp-Image-2024-06-25-at-23.53.54-1.jpeg",
    category: "workshops",
  },
  {
    url: "https://www.tangierlatinfestival.com/wp-content/uploads/2024/07/WhatsApp-Image-2024-06-25-at-23.53.57.jpeg",
    category: "workshops",
  },
  {
    url: "https://www.tangierlatinfestival.com/wp-content/uploads/2024/07/WhatsApp-Image-2024-06-25-at-23.53.52-1.jpeg",
    category: "workshops",
  },
  {
    url: "https://www.tangierlatinfestival.com/wp-content/uploads/2024/07/WhatsApp-Image-2024-06-25-at-23.53.52.jpeg",
    category: "workshops",
  },
  {
    url: "https://www.tangierlatinfestival.com/wp-content/uploads/2024/07/WhatsApp-Image-2024-06-25-at-23.53.54.jpeg",
    category: "workshops",
  },
  {
    url: "https://www.tangierlatinfestival.com/wp-content/uploads/2024/07/WhatsApp-Image-2024-06-25-at-23.53.49.jpeg",
    category: "workshops",
  },
  {
    url: "https://www.tangierlatinfestival.com/wp-content/uploads/2024/07/WhatsApp-Image-2024-06-25-at-23.53.51.jpeg",
    category: "workshops",
  },
  {
    url: "https://www.tangierlatinfestival.com/wp-content/uploads/2024/07/WhatsApp-Image-2024-06-25-at-23.53.50-1.jpeg",
    category: "workshops",
  },
  {
    url: "https://www.tangierlatinfestival.com/wp-content/uploads/2024/07/WhatsApp-Image-2024-06-25-at-23.53.56-1.jpeg",
    category: "workshops",
  },
  {
    url: "https://www.tangierlatinfestival.com/wp-content/uploads/2024/07/WhatsApp-Image-2024-06-25-at-23.53.51-1.jpeg",
    category: "workshops",
  },
  {
    url: "https://www.tangierlatinfestival.com/wp-content/uploads/2024/07/WhatsApp-Image-2024-07-06-at-00.59.48.jpeg",
    category: "workshops",
  },
  {
    url: "https://www.tangierlatinfestival.com/wp-content/uploads/2024/07/WhatsApp-Image-2024-06-25-at-23.53.53.jpeg",
    category: "workshops",
  },
  {
    url: "https://www.tangierlatinfestival.com/wp-content/uploads/2024/07/WhatsApp-Image-2024-06-25-at-23.53.55.jpeg",
    category: "workshops",
  },
  {
    url: "https://www.tangierlatinfestival.com/wp-content/uploads/2024/07/WhatsApp-Image-2024-06-25-at-23.53.49-1.jpeg",
    category: "workshops",
  },
  {
    url: "https://www.tangierlatinfestival.com/wp-content/uploads/2024/07/WhatsApp-Image-2024-06-25-at-23.53.56.jpeg",
    category: "workshops",
  },
  {
    url: "https://www.tangierlatinfestival.com/wp-content/uploads/2025/07/WK1.jpg",
    category: "workshops",
  },
];

function GalleryPage() {
  const { lang, t } = useLanguage();
  const [activeTab, setActiveTab] = useState<Category>("all");
  const [activeImageIndex, setActiveImageIndex] = useState<number | null>(null);

  // Filtered photos based on active category tab
  const filteredPhotos =
    activeTab === "all" ? GALLERY_PHOTOS : GALLERY_PHOTOS.filter((p) => p.category === activeTab);

  // Tab definitions
  const tabs: { id: Category; label: string; count: number }[] = [
    { id: "all", label: t("galleryTabAll"), count: GALLERY_PHOTOS.length },
    {
      id: "black-party",
      label: t("galleryTabBlackParty"),
      count: GALLERY_PHOTOS.filter((p) => p.category === "black-party").length,
    },
    {
      id: "competition",
      label: t("galleryTabCompetition"),
      count: GALLERY_PHOTOS.filter((p) => p.category === "competition").length,
    },
    {
      id: "friday-shows",
      label: t("galleryTabFridayShows"),
      count: GALLERY_PHOTOS.filter((p) => p.category === "friday-shows").length,
    },
    {
      id: "saturday-shows",
      label: t("galleryTabSaturdayShows"),
      count: GALLERY_PHOTOS.filter((p) => p.category === "saturday-shows").length,
    },
    {
      id: "white-party",
      label: t("galleryTabWhiteParty"),
      count: GALLERY_PHOTOS.filter((p) => p.category === "white-party").length,
    },
    {
      id: "workshops",
      label: t("galleryTabWorkshops"),
      count: GALLERY_PHOTOS.filter((p) => p.category === "workshops").length,
    },
  ];

  // Lightbox navigation functions
  const handlePrev = () => {
    if (activeImageIndex === null) return;
    setActiveImageIndex((prevIndex) =>
      prevIndex === 0 ? filteredPhotos.length - 1 : prevIndex! - 1,
    );
  };

  const handleNext = () => {
    if (activeImageIndex === null) return;
    setActiveImageIndex((prevIndex) =>
      prevIndex === filteredPhotos.length - 1 ? 0 : prevIndex! + 1,
    );
  };

  const handleClose = () => {
    setActiveImageIndex(null);
  };

  // Keyboard navigation inside lightbox
  useEffect(() => {
    if (activeImageIndex === null) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") {
        handlePrev();
      } else if (e.key === "ArrowRight") {
        handleNext();
      } else if (e.key === "Escape") {
        handleClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeImageIndex, filteredPhotos]);

  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden">
      <Nav />

      {/* HERO SECTION */}
      <section className="relative py-28 md:py-36 overflow-hidden border-b border-border/40">
        <div className="absolute inset-0 select-none">
          <img src={heroImg} alt="" className="h-full w-full object-cover opacity-25" />
          <div className="absolute inset-0 hero-overlay bg-gradient-to-t from-background via-background/80 to-transparent" />
        </div>
        <div className="relative mx-auto max-w-5xl px-6 text-center">
          <p className="text-xs tracking-[0.4em] uppercase text-primary mb-4 flex items-center justify-center gap-2">
            <Camera className="h-3.5 w-3.5 text-gold" />
            {t("galleryHeroSubtitle")}
          </p>
          <h1 className="font-display text-5xl md:text-7xl leading-[0.95] text-glow mb-6">
            {t("galleryHeroTitlePart1")}{" "}
            <span className="text-gold italic">{t("galleryHeroTitlePart2")}</span>{" "}
            {t("galleryHeroTitlePart3")}
          </h1>
          <p className="mt-6 text-muted-foreground max-w-2xl mx-auto leading-relaxed text-sm md:text-base">
            {t("galleryHeroDesc")}
          </p>
        </div>
      </section>

      {/* SEGMENTED TAB SWITCHER */}
      <section className="py-8 bg-card/10 border-b border-border/20 backdrop-blur-sm sticky top-20 z-30">
        <div className="mx-auto max-w-7xl px-6">
          <div className="flex flex-wrap justify-center gap-2.5">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id);
                  setActiveImageIndex(null);
                }}
                className={`px-5 py-2.5 rounded-full text-xs font-semibold uppercase tracking-[0.15em] transition-all duration-300 cursor-pointer ${
                  activeTab === tab.id
                    ? "bg-gold text-primary-foreground shadow-gold font-bold scale-[1.02]"
                    : "border border-border/40 bg-card/60 text-muted-foreground hover:text-foreground hover:border-gold/50"
                }`}
              >
                {tab.label} <span className="ml-1 opacity-70">({tab.count})</span>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* GALLERY PHOTO RESPONSIVE GRID */}
      <section className="py-20">
        <div className="mx-auto max-w-7xl px-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {filteredPhotos.map((photo, index) => (
              <div
                key={`${photo.url}-${index}`}
                onClick={() => setActiveImageIndex(index)}
                className="group relative aspect-[3/2] overflow-hidden rounded-2xl border border-border/40 bg-card/30 backdrop-blur-sm cursor-pointer shadow-soft hover:border-gold/40 transition duration-500"
              >
                {/* Lazy-loaded High-resolution image asset */}
                <img
                  src={photo.url}
                  alt={`Tangier Latin Festival - ${photo.category}`}
                  loading="lazy"
                  className="w-full h-full object-cover transition-all duration-700 group-hover:scale-105"
                />

                {/* Golden Overlay Gradient */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-500 flex items-center justify-center">
                  <div className="transform translate-y-4 group-hover:translate-y-0 transition-transform duration-500 bg-gold/90 text-primary-foreground p-3 rounded-full shadow-gold border border-gold/40">
                    <Eye className="h-5 w-5" />
                  </div>
                </div>

                {/* Bottom glassmorphic description card */}
                <div className="absolute bottom-3 left-3 right-3 bg-black/75 border border-border/20 p-2.5 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-between pointer-events-none select-none">
                  <span className="text-[10px] uppercase tracking-[0.2em] text-gold font-bold">
                    {tabs.find((t) => t.id === photo.category)?.label}
                  </span>
                  <span className="text-[9px] text-muted-foreground">#{index + 1}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* LIGHTBOX SLIDESHOW MODAL OVERLAY */}
      {activeImageIndex !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-md transition-all duration-300">
          {/* Close trigger button */}
          <button
            onClick={handleClose}
            className="absolute top-6 right-6 z-50 p-3.5 rounded-full border border-border/40 bg-card/60 backdrop-blur text-foreground hover:text-gold hover:border-gold transition cursor-pointer"
            aria-label={t("galleryLightboxClose")}
          >
            <X className="h-5 w-5" />
          </button>

          {/* Previous Slider Action */}
          <button
            onClick={handlePrev}
            className="absolute left-4 md:left-8 z-50 p-4 rounded-full border border-border/40 bg-card/50 backdrop-blur text-foreground hover:text-gold hover:border-gold transition cursor-pointer active:scale-95 select-none"
            aria-label={t("galleryLightboxPrev")}
          >
            <ChevronLeft className="h-6 w-6" />
          </button>

          {/* Active slideshow image container */}
          <div className="relative max-w-4xl max-h-[80vh] px-6 flex flex-col items-center justify-center select-none group">
            <div className="rounded-2xl overflow-hidden border border-gold/30 shadow-gold bg-black max-w-full">
              <img
                src={filteredPhotos[activeImageIndex].url}
                alt={`Tangier Latin Festival - Fullscreen Photo`}
                className="max-h-[70vh] object-contain max-w-full block"
              />
            </div>

            {/* Tactile status indicators */}
            <div className="mt-6 flex items-center justify-between w-full px-2 text-xs font-semibold text-muted-foreground tracking-widest uppercase">
              <span className="text-gold">
                {tabs.find((t) => t.id === filteredPhotos[activeImageIndex].category)?.label}
              </span>
              <span>
                {activeImageIndex + 1} / {filteredPhotos.length}
              </span>
            </div>
          </div>

          {/* Next Slider Action */}
          <button
            onClick={handleNext}
            className="absolute right-4 md:right-8 z-50 p-4 rounded-full border border-border/40 bg-card/50 backdrop-blur text-foreground hover:text-gold hover:border-gold transition cursor-pointer active:scale-95 select-none"
            aria-label={t("galleryLightboxNext")}
          >
            <ChevronRight className="h-6 w-6" />
          </button>
        </div>
      )}
    </div>
  );
}
