import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { z } from "zod";
import { Nav } from "@/components/Nav";
import { useLanguage } from "@/hooks/useLanguage";
import { translations, Language } from "@/lib/translations";
import {  Camera, ChevronLeft, ChevronRight, X, Eye , ArrowRight } from "lucide-react";
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

type Category = string;

interface GalleryPhoto {
  url: string;
  category: Category;
  label?: string;
}

export const GALLERY_PHOTOS: GalleryPhoto[] = [

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

  // black-party (16 photos)
  { url: "/gallery/black-party/482241576_974139544896953_1363265038457908845_n.jpg", category: "black-party", label: "Black party" },
  { url: "/gallery/black-party/482247734_974139694896938_824674460454534476_n.jpg", category: "black-party", label: "Black party" },
  { url: "/gallery/black-party/484621332_974138518230389_5838389938590321336_n.jpg", category: "black-party", label: "Black party" },
  { url: "/gallery/black-party/484652122_974139918230249_4144431781966730075_n.jpg", category: "black-party", label: "Black party" },
  { url: "/gallery/black-party/484678216_974138564897051_596179778175502867_n.jpg", category: "black-party", label: "Black party" },
  { url: "/gallery/black-party/485192802_974139868230254_646964208326267218_n.jpg", category: "black-party", label: "Black party" },
  { url: "/gallery/black-party/641130527_1241964604781111_3059750143824501204_n.jpg", category: "black-party", label: "Black party" },
  { url: "/gallery/black-party/641179966_1241960638114841_5487906735749687798_n.jpg", category: "black-party", label: "Black party" },
  { url: "/gallery/black-party/641332475_1241961981448040_2259109581872086683_n.jpg", category: "black-party", label: "Black party" },
  { url: "/gallery/black-party/641373119_1241961681448070_9140970345875187508_n.jpg", category: "black-party", label: "Black party" },
  { url: "/gallery/black-party/641603879_1241964528114452_7129046464782138635_n.jpg", category: "black-party", label: "Black party" },
  { url: "/gallery/black-party/641642437_1241960634781508_7326037486339140399_n.jpg", category: "black-party", label: "Black party" },
  { url: "/gallery/black-party/641647079_1241961468114758_4697222910101202809_n.jpg", category: "black-party", label: "Black party" },
  { url: "/gallery/black-party/641681085_1241960558114849_8736507399916920313_n.jpg", category: "black-party", label: "Black party" },
  { url: "/gallery/black-party/642350838_1241960701448168_6516119351979049662_n.jpg", category: "black-party", label: "Black party" },
  { url: "/gallery/black-party/643520796_1241961868114718_4389617442928473631_n.jpg", category: "black-party", label: "Black party" },
  // competition (9 photos)
  { url: "/gallery/competition/640391165_1241967454780826_7954660383228391589_n.jpg", category: "competition", label: "competition" },
  { url: "/gallery/competition/641143187_1241967638114141_3154458121773931448_n.jpg", category: "competition", label: "competition" },
  { url: "/gallery/competition/641198874_1241967854780786_6019103900656973299_n.jpg", category: "competition", label: "competition" },
  { url: "/gallery/competition/641236165_1241963434781228_662252990987459054_n.jpg", category: "competition", label: "competition" },
  { url: "/gallery/competition/641308414_1241967868114118_4491875716475556629_n.jpg", category: "competition", label: "competition" },
  { url: "/gallery/competition/641326426_1241964481447790_6564052407782059652_n.jpg", category: "competition", label: "competition" },
  { url: "/gallery/competition/641330274_1241963594781212_4567827867266343448_n.jpg", category: "competition", label: "competition" },
  { url: "/gallery/competition/641368101_1241967528114152_6151146995162483693_n.jpg", category: "competition", label: "competition" },
  { url: "/gallery/competition/641539520_1241967261447512_6880565136864487815_n.jpg", category: "competition", label: "competition" },
  // shows-samedi (9 photos)
  { url: "/gallery/shows-samedi/482245556_974140464896861_6201295921456837146_n.jpg", category: "saturday-shows", label: "shows samedi" },
  { url: "/gallery/shows-samedi/482250810_974143561563218_904850889461143835_n.jpg", category: "saturday-shows", label: "shows samedi" },
  { url: "/gallery/shows-samedi/484582044_974139638230277_6101682043560405349_n.jpg", category: "saturday-shows", label: "shows samedi" },
  { url: "/gallery/shows-samedi/484977540_974140474896860_3253671084275221035_n.jpg", category: "saturday-shows", label: "shows samedi" },
  { url: "/gallery/shows-samedi/485361009_974143651563209_4564133886494234672_n.jpg", category: "saturday-shows", label: "shows samedi" },
  { url: "/gallery/shows-samedi/640290403_1241960708114834_7148791227128415136_n.jpg", category: "saturday-shows", label: "shows samedi" },
  { url: "/gallery/shows-samedi/641230118_1241965531447685_7614769116868105544_n.jpg", category: "saturday-shows", label: "shows samedi" },
  { url: "/gallery/shows-samedi/641244217_1241967984780773_903808272494658247_n.jpg", category: "saturday-shows", label: "shows samedi" },
  { url: "/gallery/shows-samedi/641676673_1241968034780768_2651676942068330174_n.jpg", category: "saturday-shows", label: "shows samedi" },
  // shows-vendredi (16 photos)
  { url: "/gallery/shows-vendredi/481902017_2946367652206889_7803251200575266978_n.jpg", category: "friday-shows", label: "shows vendredi" },
  { url: "/gallery/shows-vendredi/481919101_2946366155540372_2552330177287678337_n.jpg", category: "friday-shows", label: "shows vendredi" },
  { url: "/gallery/shows-vendredi/482201679_2946368198873501_993881522741055458_n.jpg", category: "friday-shows", label: "shows vendredi" },
  { url: "/gallery/shows-vendredi/482243758_974143891563185_6598273605567733569_n.jpg", category: "friday-shows", label: "shows vendredi" },
  { url: "/gallery/shows-vendredi/482246181_974143794896528_4730294075525090850_n.jpg", category: "friday-shows", label: "shows vendredi" },
  { url: "/gallery/shows-vendredi/482246607_974143764896531_4298680092875612314_n.jpg", category: "friday-shows", label: "shows vendredi" },
  { url: "/gallery/shows-vendredi/482273115_970085988635642_8701866590938313152_n.jpg", category: "friday-shows", label: "shows vendredi" },
  { url: "/gallery/shows-vendredi/482277722_970087085302199_3738499960317910158_n.jpg", category: "friday-shows", label: "shows vendredi" },
  { url: "/gallery/shows-vendredi/482324033_2946366348873686_2962926771470512696_n.jpg", category: "friday-shows", label: "shows vendredi" },
  { url: "/gallery/shows-vendredi/482347818_970085881968986_6429817414370393873_n.jpg", category: "friday-shows", label: "shows vendredi" },
  { url: "/gallery/shows-vendredi/483637536_970085981968976_5919759351833649360_n.jpg", category: "friday-shows", label: "shows vendredi" },
  { url: "/gallery/shows-vendredi/483839652_970087031968871_6179957826901482241_n.jpg", category: "friday-shows", label: "shows vendredi" },
  { url: "/gallery/shows-vendredi/484806543_974142664896641_3652576900449196820_n.jpg", category: "friday-shows", label: "shows vendredi" },
  { url: "/gallery/shows-vendredi/484809366_974142691563305_3440230228246560828_n.jpg", category: "friday-shows", label: "shows vendredi" },
  { url: "/gallery/shows-vendredi/641417072_1241967218114183_3564104903330139309_n.jpg", category: "friday-shows", label: "shows vendredi" },
  { url: "/gallery/shows-vendredi/shows vendredi.jpg", category: "friday-shows", label: "shows vendredi" },
  // white-party (16 photos)
  { url: "/gallery/white-party/482244468_974140748230166_4372799665926051910_n.jpg", category: "white-party", label: "white party" },
  { url: "/gallery/white-party/484794565_974140448230196_6057030061441567152_n.jpg", category: "white-party", label: "white party" },
  { url: "/gallery/white-party/484810394_974143908229850_8742822966146422519_n.jpg", category: "white-party", label: "white party" },
  { url: "/gallery/white-party/484812176_974138568230384_3875348434903989915_n.jpg", category: "white-party", label: "white party" },
  { url: "/gallery/white-party/484876796_974139848230256_254426090774277201_n.jpg", category: "white-party", label: "white party" },
  { url: "/gallery/white-party/484906517_974140604896847_7889872899943100902_n.jpg", category: "white-party", label: "white party" },
  { url: "/gallery/white-party/641164273_1241961968114708_3452780470515282382_n.jpg", category: "white-party", label: "white party" },
  { url: "/gallery/white-party/641205314_1241968978114007_5210038652571349810_n.jpg", category: "white-party", label: "white party" },
  { url: "/gallery/white-party/641347494_1241969134780658_5427357105001957177_n.jpg", category: "white-party", label: "white party" },
  { url: "/gallery/white-party/641369012_1241961881448050_8190247546662602293_n.jpg", category: "white-party", label: "white party" },
  { url: "/gallery/white-party/641397123_1241962828114622_6558464604183306359_n.jpg", category: "white-party", label: "white party" },
  { url: "/gallery/white-party/641400023_1241969018114003_4175809438466758752_n.jpg", category: "white-party", label: "white party" },
  { url: "/gallery/white-party/641418956_1241965574781014_7061987985811021372_n.jpg", category: "white-party", label: "white party" },
  { url: "/gallery/white-party/641534815_1241968571447381_472066430845152877_n.jpg", category: "white-party", label: "white party" },
  { url: "/gallery/white-party/642762483_1241966194780952_224053409941459672_n.jpg", category: "white-party", label: "white party" },
  { url: "/gallery/white-party/643226088_1241960648114840_3991260053064399282_n.jpg", category: "white-party", label: "white party" },
  // workshops (8 photos)
  { url: "/gallery/workshops/484155548_974284004882507_4327610748608762561_n.jpg", category: "workshops", label: "workshops" },
  { url: "/gallery/workshops/484190941_974284241549150_4154434091300494758_n.jpg", category: "workshops", label: "workshops" },
  { url: "/gallery/workshops/484304981_974284034882504_2775831831349952270_n.jpg", category: "workshops", label: "workshops" },
  { url: "/gallery/workshops/484550485_974284008215840_5848244643945264849_n.jpg", category: "workshops", label: "workshops" },
  { url: "/gallery/workshops/484873494_974138338230407_4853441629612086562_n.jpg", category: "workshops", label: "workshops" },
  { url: "/gallery/workshops/484918372_974284314882476_5469472148023855609_n.jpg", category: "workshops", label: "workshops" },
  { url: "/gallery/workshops/640493026_1241967041447534_1847981653265578352_n.jpg", category: "workshops", label: "workshops" },
  { url: "/gallery/workshops/workshop 2.jpg", category: "workshops", label: "workshops" },
];

function GalleryPage() {
  const { lang, t } = useLanguage();
  const [activeTab, setActiveTab] = useState<Category>("all");
  const [activeImageIndex, setActiveImageIndex] = useState<number | null>(null);

  // Filtered photos based on active category tab
  const filteredPhotos =
    activeTab === "all" ? GALLERY_PHOTOS : GALLERY_PHOTOS.filter((p) => p.category === activeTab);

  // Derive unique categories and format their labels nicely
  const categories = Array.from(new Set(GALLERY_PHOTOS.map((p) => p.category)));
  
  // Format labels nicely (e.g. "shows-samedi" -> "Shows Samedi", "white party" -> "White Party")
  const formatLabel = (label: string) => {
    return label
      .replace(/-/g, ' ')
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  // Tab definitions
  const tabs: { id: string; label: string; count: number }[] = [
    { id: "all", label: t("galleryTabAll") || "All", count: GALLERY_PHOTOS.length },
    ...categories.map((catId) => {
      const photos = GALLERY_PHOTOS.filter((p) => p.category === catId);
      const photoLabel = photos[0]?.label || catId;
      return {
        id: catId,
        label: formatLabel(photoLabel),
        count: photos.length,
      };
    }),
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
    <div className="min-h-screen bg-background text-foreground overflow-x-clip">
      <Nav />

      {/* HERO SECTION */}
      <section className="relative py-28 md:py-36 overflow-hidden border-b border-border/40 bg-slate-950">
        <div className="absolute inset-0 select-none">
          <img src={heroImg} alt="" className="h-full w-full object-cover opacity-25" />
          <div className="absolute inset-0 hero-overlay bg-gradient-to-t from-slate-950 via-slate-950/80 to-transparent" />
        </div>
        <div className="relative mx-auto max-w-5xl px-6 text-center">
          <p className="text-sm md:text-base font-sans font-semibold tracking-[0.25em] uppercase text-primary mb-4 flex items-center justify-center gap-2">
            <Camera className="h-4 w-4 md:h-5 md:w-5 text-gold" />
            {t("galleryHeroSubtitle")}
          </p>
          <h1 className="font-display text-4xl md:text-6xl lg:text-7xl xl:text-8xl leading-[0.95] text-white drop-shadow-lg mb-6">
            {t("galleryHeroTitlePart1")}{" "}
            <span className="text-gold italic">{t("galleryHeroTitlePart2")}</span>{" "}
            {t("galleryHeroTitlePart3")}
          </h1>
          <p className="mt-6 text-slate-300 max-w-2xl mx-auto leading-relaxed text-base md:text-lg drop-shadow-md">
            {t("galleryHeroDesc")}
          </p>
        </div>
      </section>

      {/* SEGMENTED TAB SWITCHER */}
      <section className="py-4 md:py-6 bg-background/80 border-b border-border/20 backdrop-blur-xl sticky top-16 md:top-20 z-40 shadow-sm">
        <div className="mx-auto max-w-7xl px-4 md:px-6">
          <div className="flex overflow-x-auto hide-scrollbar md:flex-wrap md:justify-center gap-2.5 pb-2 md:pb-0 snap-x">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id);
                  setActiveImageIndex(null);
                }}
                className={`flex-none snap-center px-6 py-3 rounded-full text-sm font-bold uppercase tracking-[0.15em] transition-all duration-300 cursor-pointer ${
                  activeTab === tab.id
                    ? "bg-gold text-primary-foreground shadow-gold scale-[1.02]"
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

