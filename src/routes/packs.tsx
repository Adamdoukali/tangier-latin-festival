import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { Check, Tag, AlertCircle, X, Sparkles, Search, Ticket } from "lucide-react";
import { Nav } from "@/components/Nav";
import { useLanguage } from "@/hooks/useLanguage";
import { translateDynamicText, priceUnitLabel } from "@/lib/translations";
import {
  getActivePacks,
  validateDiscountCode,
  calculateDiscountAmount,
  isDiscountApplicableToPack,
  getBookingByTicketCode,
  type DiscountCode,
  type Booking,
} from "@/lib/admin-store";
import { PackBookingModal } from "@/components/PackBookingModal";

export const Route = createFileRoute("/packs")({
  component: PacksPage,
});

function PacksPage() {
  const { lang, t } = useLanguage();

  const translateDynamic = (text: string) =>
    translateDynamicText(text, lang as "en" | "fr" | "es");

  // Packs display in the exact order set by the admin
  // (arrows on the Admin → Packs page).
  const [packs, setPacks] = useState<any[]>([]);
  const [selectedPack, setSelectedPack] = useState<{
    id?: string;
    name: string;
    sub: string;
    price: string;
    currency?: string;
    numGuests?: number;
  } | null>(null);

  // Discount Code State
  const [discountInput, setDiscountInput] = useState("");
  const [appliedDiscount, setAppliedDiscount] = useState<DiscountCode | null>(null);
  const [discountMsg, setDiscountMsg] = useState<{ success: boolean; text: string } | null>(null);
  const [validatingCode, setValidatingCode] = useState(false);

  // Ticket Tracker State
  const [ticketSearch, setTicketSearch] = useState("");
  const [ticketResult, setTicketResult] = useState<Booking | null | undefined>(undefined);
  const [ticketSearching, setTicketSearching] = useState(false);

  const handleTrackTicket = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!ticketSearch.trim()) return;
    setTicketSearching(true);
    setTicketResult(undefined);
    const booking = await getBookingByTicketCode(ticketSearch.trim());
    setTicketResult(booking ?? null);
    setTicketSearching(false);
  };

  useEffect(() => {
    let cancelled = false;
    getActivePacks().then((p) => {
      if (!cancelled) setPacks(p);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // Check ?discount= parameter in URL or sessionStorage on mount
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const urlCode = params.get("discount");
    const storedCode = sessionStorage.getItem("tlf_discount_code");
    const codeToValidate = (urlCode || storedCode || "").trim().toUpperCase();

    if (codeToValidate) {
      setDiscountInput(codeToValidate);
      setValidatingCode(true);
      validateDiscountCode(codeToValidate, 0).then((res) => {
        if (res.valid && res.discount) {
          setAppliedDiscount(res.discount);
          sessionStorage.setItem("tlf_discount_code", res.discount.code);
          const isAll = !res.discount.applicablePackIds || res.discount.applicablePackIds.length === 0;
          setDiscountMsg({
            success: true,
            text: isAll
              ? (lang === "fr"
                  ? `Code promo "${res.discount.code}" appliqué sur tous les packs !`
                  : lang === "es"
                  ? `¡Código promocional "${res.discount.code}" aplicado en todos los packs!`
                  : `Discount code "${res.discount.code}" applied on all packs!`)
              : (lang === "fr"
                  ? `Code promo "${res.discount.code}" appliqué sur les packs sélectionnés !`
                  : lang === "es"
                  ? `¡Código promocional "${res.discount.code}" aplicado a los packs seleccionados!`
                  : `Discount code "${res.discount.code}" applied to selected packs!`),
          });
        }
        setValidatingCode(false);
      });
    }
  }, [lang]);

  const handleApplyDiscount = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!discountInput.trim()) return;
    setValidatingCode(true);
    setDiscountMsg(null);
    const result = await validateDiscountCode(discountInput, 0);
    if (result.valid && result.discount) {
      setAppliedDiscount(result.discount);
      if (typeof window !== "undefined") {
        sessionStorage.setItem("tlf_discount_code", result.discount.code);
      }
      const isAll = !result.discount.applicablePackIds || result.discount.applicablePackIds.length === 0;
      setDiscountMsg({
        success: true,
        text: isAll
          ? (lang === "fr"
              ? `Code promo "${result.discount.code}" appliqué sur tous les packs !`
              : lang === "es"
              ? `¡Código promocional "${result.discount.code}" aplicado en todos los packs!`
              : `Discount code "${result.discount.code}" applied on all packs!`)
          : (lang === "fr"
              ? `Code promo "${result.discount.code}" appliqué sur les packs sélectionnés !`
              : lang === "es"
              ? `¡Código promocional "${result.discount.code}" aplicado a los packs seleccionados!`
              : `Discount code "${result.discount.code}" applied to selected packs!`),
      });
    } else {
      setAppliedDiscount(null);
      if (typeof window !== "undefined") {
        sessionStorage.removeItem("tlf_discount_code");
      }
      setDiscountMsg({
        success: false,
        text:
          result.error ||
          (lang === "fr"
            ? "Code promo invalide"
            : lang === "es"
            ? "Código no válido"
            : "Invalid discount code"),
      });
    }
    setValidatingCode(false);
  };

  const handleClearDiscount = () => {
    setAppliedDiscount(null);
    setDiscountInput("");
    setDiscountMsg(null);
    if (typeof window !== "undefined") {
      sessionStorage.removeItem("tlf_discount_code");
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Nav />

      {/* HERO */}
      <section className="relative flex flex-col justify-center min-h-[65vh] pt-28 md:pt-36 pb-14 overflow-hidden border-b border-border/20 bg-background select-none">
        <div className="absolute inset-0 bg-[url('/packs_bg.png')] bg-cover bg-center bg-no-repeat" />
        <div className="absolute inset-0 bg-background/40" />
        <div className="absolute inset-0 hero-overlay bg-gradient-to-t from-background via-background/60 to-transparent" />
        <div className="relative mx-auto max-w-5xl px-6 text-center w-full">
          <p className="text-xs tracking-[0.4em] uppercase text-primary mb-4">
            TLF 2027
          </p>
          <h1 className="font-display text-4xl md:text-5xl lg:text-6xl xl:text-7xl leading-[0.95] text-white drop-shadow-lg">
            {t("packsHeroTitlePart1")} <span className="text-gold italic">{t("packsHeroTitlePart2")}</span>
          </h1>
          <p className="mt-6 text-slate-300 max-w-2xl mx-auto drop-shadow-md">
            {t("packsHeroDesc")}
          </p>
        </div>
      </section>

      <AnimatedPriceBanner />

      {/* TRACK YOUR TICKET */}
      <div className="max-w-4xl mx-auto px-6 pt-12 pb-4">
        <div className="relative rounded-3xl border border-primary/30 bg-gradient-to-br from-card/90 via-card/50 to-primary/10 p-6 md:p-8 backdrop-blur-xl shadow-2xl overflow-hidden">
          {/* Subtle background glow */}
          <div className="absolute -top-24 -right-24 w-60 h-60 bg-red-600/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-24 -left-24 w-60 h-60 bg-gold/10 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="text-left flex-1">
              <div className="flex items-center gap-2 mb-1">
                <Ticket className="h-4 w-4 text-gold" />
                <span className="text-xs font-bold tracking-[0.25em] uppercase text-gold">
                  {lang === "fr"
                    ? "SUIVI DE BILLET"
                    : lang === "es"
                    ? "SEGUIMIENTO DE BOLETO"
                    : "TICKET TRACKING"}
                </span>
              </div>
              <h3 className="font-display text-xl md:text-2xl font-bold text-foreground">
                {lang === "fr"
                  ? "Suivez votre réservation"
                  : lang === "es"
                  ? "Rastrea tu reserva"
                  : "Track your ticket"}
              </h3>
              <p className="text-xs md:text-sm text-muted-foreground mt-1">
                {lang === "fr"
                  ? "Entrez votre code de billet pour vérifier le statut de votre réservation."
                  : lang === "es"
                  ? "Introduce tu código de boleto para verificar el estado de tu reserva."
                  : "Enter your ticket code to check if your booking is confirmed."}
              </p>
            </div>

            <form
              onSubmit={handleTrackTicket}
              className="w-full md:w-auto flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0"
            >
              <div className="relative flex-1 sm:w-64">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60" />
                <input
                  type="text"
                  value={ticketSearch}
                  onChange={(e) => setTicketSearch(e.target.value.toUpperCase())}
                  placeholder={
                    lang === "fr" ? "ex: TLF-A1B2C3" : lang === "es" ? "ej: TLF-A1B2C3" : "e.g. TLF-A1B2C3"
                  }
                  className="w-full rounded-2xl border border-border/80 bg-background/80 pl-10 pr-8 py-3 text-sm font-mono uppercase text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition shadow-inner"
                />
                {ticketSearch && (
                  <button
                    type="button"
                    onClick={() => { setTicketSearch(""); setTicketResult(undefined); }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground text-xs"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
              <button
                type="submit"
                disabled={ticketSearching || !ticketSearch.trim()}
                className="rounded-2xl bg-gradient-to-r from-primary via-amber-500 to-amber-600 text-primary-foreground font-bold px-6 py-3 text-sm uppercase tracking-wider hover:opacity-95 transition shadow-lg shadow-primary/20 cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2 whitespace-nowrap"
              >
                {ticketSearching ? (
                  <>
                    <div className="h-4 w-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                    <span>...</span>
                  </>
                ) : (
                  <>
                    <Search className="h-4 w-4" />
                    <span>
                      {lang === "fr" ? "Rechercher" : lang === "es" ? "Buscar" : "Track"}
                    </span>
                  </>
                )}
              </button>
            </form>
          </div>

          {ticketResult !== undefined && (
            <div
              className={`mt-4 p-4 rounded-2xl text-sm font-semibold flex items-center gap-3 ${
                ticketResult === null
                  ? "bg-destructive/10 border border-destructive/30 text-destructive"
                  : ticketResult.status === "confirmed" || ticketResult.status === "checked-in"
                  ? "bg-emerald-500/10 border border-emerald-500/30 text-emerald-400"
                  : ticketResult.status === "declined"
                  ? "bg-destructive/10 border border-destructive/30 text-destructive"
                  : "bg-amber-500/10 border border-amber-500/30 text-amber-400"
              }`}
            >
              {ticketResult === null ? (
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>
                    {lang === "fr"
                      ? "Aucune réservation trouvée avec ce code."
                      : lang === "es"
                      ? "No se encontró ninguna reserva con este código."
                      : "No booking found with this ticket code."}
                  </span>
                </div>
              ) : (
                <div className="flex flex-col gap-1 w-full">
                  <div className="flex items-center gap-2">
                    <Check className="h-4 w-4 shrink-0" />
                    <span className="font-bold">{ticketResult.customerName}</span>
                    <span className="ml-auto text-xs uppercase px-2 py-0.5 rounded-full border font-bold" style={{
                      background: ticketResult.status === "confirmed" || ticketResult.status === "checked-in" ? "rgba(16,185,129,0.15)" : ticketResult.status === "declined" ? "rgba(239,68,68,0.15)" : "rgba(245,158,11,0.15)",
                      borderColor: ticketResult.status === "confirmed" || ticketResult.status === "checked-in" ? "rgba(16,185,129,0.4)" : ticketResult.status === "declined" ? "rgba(239,68,68,0.4)" : "rgba(245,158,11,0.4)",
                    }}>
                      {ticketResult.status === "confirmed" ? (lang === "fr" ? "✅ Confirmé" : lang === "es" ? "✅ Confirmado" : "✅ Confirmed")
                        : ticketResult.status === "checked-in" ? (lang === "fr" ? "✅ Enregistré" : lang === "es" ? "✅ Registrado" : "✅ Checked In")
                        : ticketResult.status === "declined" ? (lang === "fr" ? "❌ Refusé" : lang === "es" ? "❌ Rechazado" : "❌ Declined")
                        : (lang === "fr" ? "⏳ En attente" : lang === "es" ? "⏳ Pendiente" : "⏳ Pending")}
                    </span>
                  </div>
                  {(() => {
                    const effPeople =
                      ticketResult.numPeople && ticketResult.numPeople > 1
                        ? ticketResult.numPeople
                        : ticketResult.customerName.includes(" & ")
                        ? ticketResult.customerName.split(" & ").filter(Boolean).length
                        : /double|doble|couple|pareja/i.test(ticketResult.packName)
                        ? 2
                        : ticketResult.numPeople || 1;
                    return (
                      <div className="text-xs text-muted-foreground font-normal">
                        {translateDynamic(ticketResult.packName)} · {effPeople}{" "}
                        {effPeople > 1
                          ? lang === "fr"
                            ? "personnes"
                            : lang === "es"
                            ? "personas"
                            : "people"
                          : lang === "fr"
                          ? "personne"
                          : lang === "es"
                          ? "persona"
                          : "person"}
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* PACKS GRID */}
      <section className="py-16 bg-card/30">
        <div className="mx-auto max-w-7xl px-6">
          {Object.entries(
            packs.reduce((acc, pack) => {
              const cat = pack.category || "Other";
              if (!acc[cat]) acc[cat] = [];
              acc[cat].push(pack);
              return acc;
            }, {} as Record<string, any[]>) as Record<string, any[]>
          ).map(([category, catPacks]) => (
            <div key={category} className="mb-24 last:mb-0">
              <div className="text-left mb-16">
                <h2 className="font-display text-3xl md:text-5xl uppercase font-bold text-foreground">
                  {translateDynamic(category)}
                </h2>
                <div className="h-1 w-24 bg-gold mt-6 rounded-full" />
              </div>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
                {catPacks.map((p) => {
                  const isPopular = p.popular;
                  const basePriceNum = parseInt(p.price, 10) || 0;
                  const guestCount = p.numGuests ?? (/double|doble|couple|pareja/i.test(`${p.name} ${p.sub}`) ? 2 : 1);
                  const isApplicable = isDiscountApplicableToPack(appliedDiscount, p.id);
                  const discAmt = isApplicable && appliedDiscount
                    ? calculateDiscountAmount(appliedDiscount, basePriceNum, guestCount, basePriceNum, p.currency || "€", p.id)
                    : 0;
                  const finalPriceNum = Math.max(0, basePriceNum - discAmt);
                  const hasDiscount = isApplicable && discAmt > 0;

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

                      {/* RED DISCOUNT GRAPHIC BADGE */}
                      {hasDiscount && (
                        <div className="absolute top-4 right-4 z-20 bg-gradient-to-r from-red-600 via-red-500 to-rose-600 text-white font-black text-xs md:text-sm px-3.5 py-1.5 rounded-full shadow-lg shadow-red-900/40 tracking-wider flex items-center gap-1.5 border border-red-400/40 animate-pulse">
                          <Tag className="h-3.5 w-3.5" />
                          -{appliedDiscount?.discountType === "percent"
                            ? `${appliedDiscount.discountAmount}%`
                            : `€${discAmt}`}
                        </div>
                      )}

                      <div className="relative z-10 flex flex-col flex-1 text-left">
                        <h3 className="font-display text-3xl md:text-4xl font-bold text-foreground group-hover:text-primary transition-colors duration-300">
                          {translateDynamic(p.name)}
                        </h3>
                        <p className="text-[10px] md:text-xs tracking-[0.25em] uppercase text-muted-foreground mt-3 font-semibold">
                          {translateDynamic(p.sub)}
                        </p>

                        {/* PRICE SECTION WITH RED DISCOUNT GRAPHICS */}
                        {hasDiscount ? (
                          <div className="mt-8 md:mt-10 flex flex-col items-start gap-1">
                            <div className="flex items-center gap-2">
                              <span className="text-sm md:text-base font-bold text-muted-foreground/60 line-through">
                                {p.price} {p.currency || "€"}
                              </span>
                              <span className="bg-red-500/20 text-red-400 text-[10px] md:text-xs font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider border border-red-500/30">
                                Save {appliedDiscount?.discountType === "percent"
                                  ? `${appliedDiscount.discountAmount}%`
                                  : `€${discAmt}`}
                              </span>
                            </div>
                            <div className="flex items-end gap-2">
                              <span className="font-display text-5xl md:text-6xl font-black tracking-tighter text-gold leading-none">
                                {finalPriceNum}
                              </span>
                              <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-1 md:mb-2">
                                {p.currency || "€"}
                                {priceUnitLabel(p, lang as "en" | "fr" | "es")
                                  ? ` / ${priceUnitLabel(p, lang as "en" | "fr" | "es")}`
                                  : ""}
                              </span>
                            </div>
                          </div>
                        ) : (
                          <div className="mt-8 md:mt-10 flex items-end gap-2">
                            <span className="font-display text-5xl md:text-6xl font-black tracking-tighter text-foreground leading-none">
                              {p.price}
                            </span>
                            <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-1 md:mb-2">
                              {p.currency || "€"}
                              {priceUnitLabel(p, lang as "en" | "fr" | "es")
                                ? ` / ${priceUnitLabel(p, lang as "en" | "fr" | "es")}`
                                : ""}
                            </span>
                          </div>
                        )}

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
                              id: p.id,
                              name: translateDynamic(p.name),
                              sub: translateDynamic(p.sub),
                              price: p.price,
                              currency: p.currency,
                              numGuests: p.numGuests,
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
                            {hasDiscount ? ` (Save €${discAmt})` : ""}
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
        <PackBookingModal
          pack={selectedPack}
          onClose={() => setSelectedPack(null)}
          initialDiscountCode={appliedDiscount?.code || discountInput}
          initialDiscount={appliedDiscount}
        />
      )}
    </div>
  );
}

function AnimatedPriceBanner() {
  const { t, lang } = useLanguage();
  const datesByLang: Record<string, string[]> = {
    en: ["1 November", "1 December", "1 January"],
    fr: ["1er Novembre", "1er Décembre", "1er Janvier"],
    es: ["1 Noviembre", "1 Diciembre", "1 Enero"],
  };
  const dates = datesByLang[lang] || datesByLang.en;
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setIndex((prev) => (prev + 1) % dates.length);
    }, 2500);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="bg-background border-y border-border/40 py-6 w-full flex items-center justify-center shadow-lg relative z-20">
      <div className="flex flex-col sm:flex-row items-center gap-3 text-center sm:text-left text-sm md:text-base font-medium text-foreground uppercase tracking-widest">
        <span className="opacity-80">{t("packsPriceBanner")}</span>
        <div className="relative h-6 md:h-7 w-[140px] overflow-hidden notranslate" translate="no">
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

