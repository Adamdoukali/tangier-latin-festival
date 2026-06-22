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
  const { t } = useLanguage();
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
          <h1 className="font-display text-5xl md:text-7xl leading-[0.95] text-white drop-shadow-lg">
            Our <span className="text-gold italic">Packs</span>
          </h1>
          <p className="mt-6 text-slate-300 max-w-2xl mx-auto drop-shadow-md">
            Choose the perfect pack that suits your festival experience.
          </p>
        </div>
      </section>

      {/* PACKS GRID */}
      <section className="py-24 bg-card/30">
        <div className="mx-auto max-w-7xl px-6">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {packs.map((p, i) => {
              // Alternate themes
              const themes = [
                {
                  border: "border-zinc-800 hover:border-zinc-650 transition-all duration-300",
                  bg: "bg-gradient-to-b from-zinc-900/20 via-card/60 to-card/90",
                  accent: "from-zinc-700 via-zinc-500 to-zinc-850",
                  price: "text-zinc-950 dark:text-zinc-100 font-bold",
                  check: "text-zinc-400",
                  badge: "",
                  btn: "border border-zinc-400 text-zinc-800 hover:bg-zinc-950 hover:text-white dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-white shadow-black-chrome",
                  glow: "shadow-[0_0_50px_-15px_rgba(255,255,255,0.05)] hover:shadow-black-chrome",
                  icon: "bg-black-chrome",
                  iconText: "text-white font-extrabold",
                },
                {
                  border: "border-slate-700/40 hover:border-slate-400 transition-all duration-300",
                  bg: "bg-gradient-to-b from-slate-800/10 via-card/60 to-card/90",
                  accent: "from-slate-400 via-slate-200 to-slate-500",
                  price: "text-slate-800 dark:text-silver font-bold",
                  check: "text-slate-350",
                  badge: "absolute -top-3.5 left-1/2 -translate-x-1/2 rounded-full bg-silver px-5 py-1.5 text-[10px] tracking-[0.25em] uppercase text-zinc-950 font-bold shadow-lg shadow-silver/40 border border-slate-300/30",
                  btn: "bg-silver text-zinc-950 font-extrabold hover:opacity-90 shadow-lg shadow-silver/30 transition-opacity",
                  glow: "shadow-[0_0_50px_-10px_rgba(203,213,225,0.15)] hover:shadow-silver",
                  icon: "bg-silver",
                  iconText: "text-zinc-950 font-extrabold",
                },
                {
                  border: "border-amber-900/60 hover:border-amber-400 transition-all duration-300",
                  bg: "bg-gradient-to-b from-amber-900/10 via-card/60 to-card/90",
                  accent: "from-amber-500 via-yellow-200 to-amber-600",
                  price: "text-amber-600 dark:text-gold font-bold",
                  check: "text-amber-550",
                  badge: "",
                  btn: "border border-amber-400 text-amber-650 hover:bg-amber-450 hover:text-white dark:border-amber-400/40 dark:text-amber-400 dark:hover:bg-amber-400/10 dark:hover:border-amber-400/70 shadow-gold",
                  glow: "shadow-[0_0_50px_-10px_rgba(245,158,11,0.12)] hover:shadow-gold",
                  icon: "bg-gold",
                  iconText: "text-zinc-950 font-extrabold",
                },
              ];
              const theme = themes[i % 3];

              return (
                <div
                  key={p.id}
                  className={`relative rounded-2xl border p-8 flex flex-col transition-all duration-300 ${theme.border} ${theme.bg} ${theme.glow} ${
                    p.popular ? "scale-[1.02] md:-mt-2 md:mb-[-8px] z-10" : ""
                  }`}
                >
                  <div className={`absolute top-0 left-6 right-6 h-1 rounded-b-full bg-gradient-to-r ${theme.accent}`} />
                  
                  {p.popular && <span className={theme.badge}>{t("popularBadge")}</span>}

                  <div className={`h-11 w-11 rounded-xl ${theme.icon} grid place-items-center mb-5`}>
                    <span className={`font-display text-lg ${theme.iconText}`}>
                      {p.name.charAt(0)}
                    </span>
                  </div>

                  <h3 className="font-display text-3xl">{p.name}</h3>
                  <p className="text-xs tracking-[0.25em] uppercase text-zinc-600 dark:text-zinc-400 font-medium mt-1">
                    {p.sub}
                  </p>
                  
                  <div className="mt-6 flex items-baseline gap-2">
                    <span className={`font-display text-5xl ${theme.price}`}>{p.price}</span>
                    <span className="text-xs tracking-[0.25em] uppercase text-zinc-550 dark:text-zinc-450 font-semibold">
                      {p.currency || "€"} / {t("perPackLabel")}
                    </span>
                  </div>

                  <div className={`mt-6 h-px bg-gradient-to-r ${theme.accent} opacity-20`} />

                  <ul className="mt-6 space-y-3 flex-1">
                    {p.features.map((f: string) => (
                      <li key={f} className="flex items-start gap-3 text-sm">
                        <Check className={`h-4 w-4 ${theme.check} mt-0.5 shrink-0`} />
                        <span className="text-foreground/90">{f}</span>
                      </li>
                    ))}
                  </ul>

                  <button
                    onClick={() =>
                      setSelectedPack({
                        name: p.name,
                        sub: p.sub,
                        price: p.price,
                        currency: p.currency
                      })
                    }
                    className={`mt-8 inline-flex items-center justify-center gap-2 rounded-full px-6 py-3 text-sm font-semibold transition-all duration-300 cursor-pointer ${theme.btn}`}
                  >
                    {p.popular ? t("getStartedBtn") : t("choosePackBtn")} →
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* PACK BOOKING MODAL */}
      {selectedPack && (
        <PackBookingModal pack={selectedPack} onClose={() => setSelectedPack(null)} />
      )}
    </div>
  );
}
