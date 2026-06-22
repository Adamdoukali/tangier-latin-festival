import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Search } from "lucide-react";
import { z } from "zod";
import a1 from "@/assets/artist1.jpg";
import a2 from "@/assets/artist2.jpg";
import a3 from "@/assets/artist3.jpg";
import a4 from "@/assets/artist4.jpg";
import { Nav } from "@/components/Nav";
import { useLanguage } from "@/hooks/useLanguage";
import { translations, Language } from "@/lib/translations";

const artistsSearchSchema = z.object({
  lang: z.enum(["en", "fr", "es"]).optional(),
});

export const Route = createFileRoute("/artists")({
  validateSearch: (search) => artistsSearchSchema.parse(search),
  head: (ctx) => {
    const search = (ctx.search || {}) as { lang?: string };
    const lang = (search?.lang || "en") as Language;
    const dict = translations[lang] || translations.en;
    return {
      meta: [
        { title: dict.seoArtistsTitle },
        { name: "description", content: dict.seoArtistsDesc },
      ],
    };
  },
  component: ArtistsPage,
});

const BASE = "https://www.tangierlatinfestival.com/wp-content/uploads/2024/04/";
const BASE25 = "https://www.tangierlatinfestival.com/wp-content/uploads/2025/";

const ALL_ARTISTS = [
  { name: "Talal", style: "Salsa", img: a1 },
  { name: "Vaneska Lopez", style: "Salsa", img: a2 },
  { name: "Junior", style: "Bachata", img: a3 },
  { name: "Andy & Saray", style: "Bachata", img: a4 },
  { name: "Sandrine", style: "Salsa", img: BASE + "image-228-2.png" },
  { name: "Alicia", style: "Salsa", img: BASE + "image-235.png" },
  { name: "Abdel Zouk", style: "Zouk", img: BASE + "image-232.png" },
  { name: "Adil & Elo", style: "Bachata", img: BASE + "image-233.png" },
  { name: "Edu & Silvana", style: "Bachata", img: BASE + "image-237.png" },
  { name: "Malick & Carla", style: "Kizomba", img: BASE + "image-234.png" },
  { name: "Mervil", style: "Zouk", img: BASE + "image-238-2.png" },
  { name: "Cyra's Team", style: "Salsa", img: BASE + "image-242.png" },
  { name: "Asier & Aleksandra", style: "Bachata", img: BASE + "image-239.png" },
  { name: "Jesus & Maria", style: "Bachata", img: BASE + "image-243.png" },
  { name: "Jose Pablo & Cyntia", style: "Salsa", img: BASE + "image-244.png" },
  { name: "Juanma & Tania", style: "Salsa", img: BASE + "image-245.png" },
  { name: "Cebo & Emmanuelle", style: "Kizomba", img: BASE25 + "07/Cebo-Emmanuelle.jpg" },
  { name: "Kal & Aurore", style: "Kizomba", img: BASE + "image-252.png" },
  { name: "JJ Pachanga", style: "Salsa", img: BASE + "image-247.png" },
  { name: "Manu & Elena", style: "Salsa", img: BASE + "image-255.png" },
  { name: "Keco & Monica", style: "Bachata", img: BASE + "image-248.png" },
  { name: "Robert & Angela", style: "Bachata", img: BASE + "image-253.png" },
  { name: "Mambo Family", style: "Salsa", img: BASE + "image-250.png" },
  { name: "Mario & Lidia", style: "Salsa", img: BASE + "image-254.png" },
  { name: "Oleg & Isa", style: "Bachata", img: BASE + "image-256.png" },
  { name: "Merembé", style: "Kizomba", img: BASE + "image-260.png" },
  { name: "Toni & Alicia", style: "Bachata", img: BASE + "image-259.png" },
  { name: "Alberto & Marta", style: "Bachata", img: BASE + "image-263.png" },
  { name: "Rafa & Sheila", style: "Salsa", img: BASE + "image-257.png" },
  {
    name: "Abdel & Houds",
    style: "Zouk",
    img: "https://www.tangierlatinfestival.com/wp-content/uploads/2024/08/ABDEL-HOUDS.png",
  },
  { name: "Pedro & Maria", style: "Salsa", img: BASE + "image-258.png" },
  { name: "Athéna", style: "Kizomba", img: BASE25 + "08/Athena.jpg" },
];

const styleColors: Record<string, string> = {
  Salsa: "from-rose-600 to-red-500",
  Bachata: "from-purple-600 to-violet-500",
  Kizomba: "from-amber-600 to-orange-500",
  Zouk: "from-teal-600 to-emerald-500",
};

function ArtistCard({ name, style, img }: { name: string; style: string; img: string }) {
  return (
    <div className="group relative overflow-hidden rounded-2xl shadow-lg aspect-[3/4] cursor-pointer">
      <img
        src={img}
        alt={name}
        className="w-full h-full object-cover object-top transition-transform duration-500 group-hover:scale-110"
        onError={(e) => {
          (e.target as HTMLImageElement).src =
            "https://www.tangierlatinfestival.com/wp-content/uploads/2024/04/TLF-logo.png";
        }}
      />
      {/* dark gradient overlay always visible at bottom */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent" />
      {/* hover overlay */}
      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      {/* info */}
      <div className="absolute bottom-0 left-0 right-0 p-4 translate-y-1 group-hover:translate-y-0 transition-transform duration-300">
        <span
          className={`inline-block text-[10px] font-bold tracking-widest uppercase px-2 py-0.5 rounded-full text-white bg-gradient-to-r ${styleColors[style] ?? "from-gray-600 to-gray-500"} mb-2`}
        >
          {style}
        </span>
        <h3 className="text-white font-bold text-lg leading-tight drop-shadow">{name}</h3>
      </div>
    </div>
  );
}

function ArtistsPage() {
  const { lang, t } = useLanguage();
  const [filter, setFilter] = useState("All");
  const [search, setSearch] = useState("");

  const langSuffix = lang && lang !== "en" ? `?lang=${lang}` : "";
  const localizedHref = (href: string) => `${href}${langSuffix}`;

  const STYLES = [t("artistsStyleAll"), "Salsa", "Bachata", "Kizomba", "Zouk"];

  const visible = ALL_ARTISTS.filter((a) => {
    const matchStyle = filter === "All" || filter === t("artistsStyleAll") || a.style === filter;
    const matchSearch = a.name.toLowerCase().includes(search.toLowerCase());
    return matchStyle && matchSearch;
  });

  return (
    <div className="min-h-screen bg-white">
      {/* ── Navbar ─────────────────────────────────── */}
      <Nav />

      {/* ── Hero Banner ─────────────────────────────── */}
      <section className="relative pt-24 pb-20 overflow-hidden bg-slate-950 border-b border-border/20 min-h-[50vh] flex items-center justify-center">
        {/* Dynamic Background Glows */}
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-0 left-1/4 w-[40%] h-[60%] bg-gold/15 rounded-full blur-[120px] mix-blend-screen animate-pulse" style={{ animationDuration: '8s' }} />
          <div className="absolute bottom-0 right-1/4 w-[40%] h-[60%] bg-primary/10 rounded-full blur-[120px] mix-blend-screen animate-pulse" style={{ animationDuration: '10s' }} />
          {/* Subtle grid pattern overlay */}
          <div className="absolute inset-0 bg-[linear-gradient(rgba(212,175,55,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(212,175,55,0.03)_1px,transparent_1px)] bg-[size:64px_64px] [mask-image:radial-gradient(ellipse_60%_60%_at_50%_50%,black,transparent)]" />
        </div>

        <div className="relative z-10 max-w-4xl mx-auto px-6 text-center">
          <div className="inline-flex items-center gap-3 px-4 py-1.5 rounded-full border border-gold/20 bg-gold/5 backdrop-blur-sm mb-6">
            <span className="h-2 w-2 rounded-full bg-gold animate-pulse" />
            <p className="text-xs font-bold tracking-[0.4em] uppercase text-gold">
              {t("artistsHeroSubtitle")}
            </p>
          </div>
          
          <h1 className="font-display text-5xl md:text-7xl lg:text-8xl font-bold leading-tight mb-6 text-white drop-shadow-2xl">
            {t("artistsHeroTitle")}
          </h1>
          
          <p className="text-slate-300 text-base md:text-lg max-w-2xl mx-auto leading-relaxed drop-shadow-md">
            {t("artistsHeroDesc")}
          </p>
          
          <div className="mt-8 text-sm font-bold tracking-widest uppercase text-gold/80 bg-gold/5 inline-flex px-6 py-2 rounded-full border border-gold/10 backdrop-blur-md shadow-lg">
            {ALL_ARTISTS.length}+ {t("artistsCountLabel")}
          </div>
        </div>
      </section>

      {/* ── Filters ─────────────────────────────────── */}
      <section className="sticky top-20 md:top-[120px] z-30 bg-white border-b border-gray-100 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4 flex flex-wrap items-center gap-4">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px] max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder={t("artistsSearchPlaceholder")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-full border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-rose-300"
            />
          </div>
          {/* Style pills */}
          <div className="flex flex-wrap gap-2">
            {STYLES.map((s) => (
              <button
                key={s}
                onClick={() => setFilter(s)}
                className={`px-4 py-1.5 rounded-full text-xs font-bold tracking-widest uppercase transition border cursor-pointer ${
                  filter === s
                    ? "bg-gray-900 text-white border-gray-900"
                    : "border-gray-200 text-gray-500 hover:border-gray-400 hover:text-gray-800"
                }`}
              >
                {s}
              </button>
            ))}
          </div>
          <span className="ml-auto text-xs text-gray-400 font-medium hidden sm:block">
            {visible.length} {visible.length !== 1 ? "artists" : "artist"}
          </span>
        </div>
      </section>

      {/* ── Grid ────────────────────────────────────── */}
      <main className="max-w-7xl mx-auto px-6 py-14">
        {visible.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            <p className="text-2xl font-light">{t("artistsNotFound")}</p>
            <button
              onClick={() => {
                setFilter(t("artistsStyleAll"));
                setSearch("");
              }}
              className="mt-4 text-sm text-rose-500 underline cursor-pointer"
            >
              {t("artistsClearFilters")}
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {visible.map((a) => (
              <ArtistCard key={a.name} {...a} />
            ))}
          </div>
        )}
      </main>

      {/* ── CTA ─────────────────────────────────────── */}
      <section className="bg-gradient-to-br from-gray-950 to-gray-900 text-white py-20 text-center px-6">
        <p className="text-xs font-bold tracking-[0.35em] uppercase text-rose-400 mb-3">
          {t("artistsCtaSubtitle")}
        </p>
        <h2 className="font-['Playfair_Display'] text-4xl md:text-5xl font-bold mb-6">
          {t("artistsCtaTitle")}
        </h2>
        <p className="text-gray-300 mb-8 max-w-xl mx-auto">{t("artistsCtaDesc")}</p>
        <a
          href={localizedHref("/#packs")}
          className="inline-flex items-center gap-2 px-8 py-4 bg-rose-600 hover:bg-rose-700 text-white font-bold tracking-widest uppercase text-sm rounded-full transition shadow-lg"
        >
          {t("artistsCtaBtn")}
        </a>
        <div className="mt-8">
          <Link
            to={localizedHref("/")}
            className="text-sm text-gray-400 hover:text-white transition underline"
          >
            ← {t("backHomeBtn")}
          </Link>
        </div>
      </section>
    </div>
  );
}
