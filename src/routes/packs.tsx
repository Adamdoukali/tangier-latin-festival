import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { Check } from "lucide-react";
import { Nav } from "@/components/Nav";
import { useLanguage } from "@/hooks/useLanguage";
import { getActivePacks } from "@/lib/admin-store";
import { PackBookingModal } from "@/components/PackBookingModal";

export const Route = createFileRoute("/packs")({
  component: PacksPage,
});

function PacksPage() {
  const { lang, t } = useLanguage();

  const translateDynamic = (text: string) => {
    const dict: Record<string, { en: string; fr: string; es: string }> = {
      "chambre double": { en: "Double Room", fr: "Chambre Double", es: "Habitación Doble" },
      "chambre single": { en: "Single Room", fr: "Chambre Simple", es: "Habitación Individual" },
      "full pass": { en: "Full Pass", fr: "Full Pass", es: "Full Pass" },
      "basic ticket": { en: "Basic Ticket", fr: "Billet Basique", es: "Entrada Básica" },
      "couple pass": { en: "Couple Pass", fr: "Pass Couple", es: "Pase Pareja" },
      "party pass": { en: "Party Pass", fr: "Pass Soirée", es: "Pase Fiesta" },
      "day pass": { en: "Day Pass", fr: "Pass Journée", es: "Pase de Día" },
      "solazur hotel tangier (2 nights)": { en: "SOLAZUR HOTEL TANGIER (2 NIGHTS)", fr: "HÔTEL SOLAZUR TANGER (2 NUITS)", es: "HOTEL SOLAZUR TÁNGER (2 NOCHES)" },
      "solazur hotel tangier (3 nights)": { en: "SOLAZUR HOTEL TANGIER (3 NIGHTS)", fr: "HÔTEL SOLAZUR TANGER (3 NUITS)", es: "HOTEL SOLAZUR TÁNGER (3 NOCHES)" },
      "solazur hotel tangier (4 nights)": { en: "SOLAZUR HOTEL TANGIER (4 NIGHTS)", fr: "HÔTEL SOLAZUR TANGER (4 NUITS)", es: "HOTEL SOLAZUR TÁNGER (4 NOCHES)" },
      "without accommodation": { en: "WITHOUT ACCOMMODATION", fr: "SANS HÉBERGEMENT", es: "SIN ALOJAMIENTO" },
      "2 nights": { en: "2 NIGHTS", fr: "2 NUITS", es: "2 NOCHES" },
      "3 nights": { en: "3 NIGHTS", fr: "3 NUITS", es: "3 NOCHES" },
      "4 nights": { en: "4 NIGHTS", fr: "4 NUITS", es: "4 NOCHES" },
      "breakfast": { en: "BREAKFAST", fr: "PETIT-DÉJEUNER", es: "DESAYUNO" },
      "dinner": { en: "DINNER", fr: "DÎNER", es: "CENA" },
      "all workshops": { en: "ALL WORKSHOPS", fr: "TOUS LES WORKSHOPS", es: "TODOS LOS TALLERES" },
      "shows": { en: "SHOWS", fr: "SHOWS", es: "SHOWS" },
      "social parties": { en: "SOCIAL PARTIES", fr: "SOIRÉES SOCIALES", es: "FIESTAS SOCIALES" },
      "pool parties": { en: "POOL PARTIES", fr: "POOL PARTIES", es: "POOL PARTIES" },
      "1 leader + 1 follower": { en: "1 LEADER + 1 FOLLOWER", fr: "1 LEADER + 1 FOLLOWER", es: "1 LEADER + 1 FOLLOWER" },
      "shows & parties": { en: "SHOWS & PARTIES", fr: "SHOWS & SOIRÉES", es: "SHOWS & FIESTAS" },
      "(no workshops)": { en: "(NO WORKSHOPS)", fr: "(SANS WORKSHOPS)", es: "(SIN TALLERES)" },
      "pool parties (1 day only)": { en: "POOL PARTIES (1 DAY ONLY)", fr: "POOL PARTIES (1 JOUR SEULEMENT)", es: "POOL PARTIES (SOLO 1 DÍA)" }
    };
    const key = text.trim().toLowerCase();
    return dict[key]?.[lang as "en" | "fr" | "es"] || text;
  };
  const [packs, setPacks] = useState<any[]>([]);
  const [selectedPack, setSelectedPack] = useState<{
    name: string;
    sub: string;
    price: string;
    currency?: string;
  } | null>(null);

  useEffect(() => {
    setPacks(getActivePacks());
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <Nav />

      {/* HERO */}
      <section className="relative pt-32 pb-20 overflow-hidden flex items-end min-h-[40vh] border-b border-border/20 bg-slate-950 select-none">
        <div className="absolute inset-0 hero-overlay bg-gradient-to-t from-slate-950 via-slate-950/80 to-transparent" />
        <div className="relative mx-auto max-w-5xl px-6 text-center w-full">
          <p className="text-xs tracking-[0.4em] uppercase text-primary mb-4">
            TLF 2027
          </p>
          <h1 className="font-display text-4xl md:text-5xl lg:text-6xl xl:text-7xl leading-[0.95] text-white drop-shadow-lg">
            Our <span className="text-gold italic">Packs</span>
          </h1>
          <p className="mt-6 text-slate-300 max-w-2xl mx-auto drop-shadow-md">
            Choose the perfect pack that suits your festival experience.
          </p>
        </div>
      </section>

      <AnimatedPriceBanner />

      {/* PACKS GRID */}
      <section className="py-24 bg-card/30">
        <div className="mx-auto max-w-7xl px-6">
          {Object.entries(
            packs.reduce((acc, pack) => {
              const cat = pack.category || "Other";
              if (!acc[cat]) acc[cat] = [];
              acc[cat].push(pack);
              return acc;
            }, {} as Record<string, any[]>)
          ).map(([category, catPacks]) => (
            <div key={translateDynamic(category)} className="mb-24 last:mb-0">
              <div className="text-left mb-16">
                <h2 className="font-display text-3xl md:text-5xl uppercase font-bold text-foreground">
                  {category}
                </h2>
                <div className="h-1 w-24 bg-gold mt-6 rounded-full" />
              </div>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
                {catPacks.map((p) => {
                  const isPopular = p.popular;
                  return (
                    <div
                      key={p.id || `${translateDynamic(p.name)}-${translateDynamic(p.sub)}`}
                      className={`group relative rounded-[2rem] p-8 md:p-10 flex flex-col transition-all duration-500 hover:-translate-y-2 ${
                        isPopular
                          ? "bg-gradient-to-b from-card/80 to-card/40 backdrop-blur-xl border-2 border-primary/50 shadow-2xl shadow-primary/20 z-10 md:-mt-4 md:mb-[-16px]"
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

                      <div className="relative z-10 flex flex-col flex-1 text-left">
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

                        <ul className="mt-8 md:mt-10 space-y-4 md:space-y-5 flex-1 text-left">
                          {p.features.map((f: string, i: number) => (
                            <li key={i} className="flex items-start gap-4">
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
                                {translateDynamic(f)}
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
                              currency: p.currency,
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
            </div>
          ))}
        </div>
      </section>

      {/* PACK BOOKING MODAL */}
      {selectedPack && (
        <PackBookingModal pack={selectedPack} onClose={() => setSelectedPack(null)} />
      )}
    </div>
  );
}

function AnimatedPriceBanner() {
  const dates = ["1 November", "1 December", "1 January"];
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setIndex((prev) => (prev + 1) % dates.length);
    }, 2500);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="bg-background border-y border-border/40 py-6 w-full flex items-center justify-center shadow-lg relative z-20">
      <div className="flex flex-col sm:flex-row items-center gap-3 text-center sm:text-left text-sm md:text-base font-medium text-foreground uppercase tracking-widest">
        <span className="opacity-80">Prices get increased every month, starting from:</span>
        <div className="relative h-6 md:h-7 w-[140px] overflow-hidden">
          {dates.map((date, i) => (
            <span
              key={date}
              className={`absolute inset-0 font-black text-primary transition-all duration-500 ease-in-out flex items-center justify-center sm:justify-start ${
                i === index
                  ? "opacity-100 translate-y-0 scale-100"
                  : "opacity-0 translate-y-6 scale-95"
              }`}
            >
              {date}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

