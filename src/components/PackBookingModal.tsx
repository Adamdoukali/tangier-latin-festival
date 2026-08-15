import { useState, useMemo, useEffect } from "react";
import { X, Sparkles, User, Mail, Phone, Globe, CheckCircle2, Tag, Check, AlertCircle, Calendar } from "lucide-react";
import { countries, getFlagUrl } from "@/lib/countries";
import { useLanguage } from "@/hooks/useLanguage";
import { translateDynamicText } from "@/lib/translations";
import {
  addBooking,
  getCollaboratorByCode,
  getRememberedReferral,
  validateDiscountCode,
  calculateDiscountAmount,
  ticketUrl,
  type Booking,
  type DiscountCode,
} from "@/lib/admin-store";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { sendFormNotification, bookingAutoResponse } from "@/lib/form-notify";

const ALLOWED_COUNTRY_CODES = new Set([
  "MA", // Morocco
  // Europe
  "AD", "AL", "AT", "BA", "BE", "BG", "BY", "CH", "CY", "CZ", "DE", "DK", 
  "EE", "ES", "FI", "FR", "GB", "GR", "HR", "HU", "IE", "IS", "IT", "LI", 
  "LT", "LU", "LV", "MC", "MD", "ME", "MK", "MT", "NL", "NO", "PL", "PT", 
  "RO", "RS", "RU", "SE", "SI", "SK", "SM", "UA", "VA"
]);

const filteredCountries = countries.filter(c => ALLOWED_COUNTRY_CODES.has(c.code));

export function PackBookingModal({
  pack,
  onClose,
  initialDiscountCode,
  initialDiscount,
}: {
  pack: { id?: string; name: string; sub: string; price: string; currency?: string };
  onClose: () => void;
  initialDiscountCode?: string;
  initialDiscount?: DiscountCode | null;
}) {
  const { t, lang } = useLanguage();
  const [submitted, setSubmitted] = useState(false);
  const [reservation, setReservation] = useState<Booking | null>(null);
  const [error, setError] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Discount code state
  const [discountInput, setDiscountInput] = useState(
    initialDiscountCode || initialDiscount?.code || ""
  );
  const [appliedDiscount, setAppliedDiscount] = useState<DiscountCode | null>(
    initialDiscount || null
  );
  const basePrice = parseInt(pack.price, 10) || 0;
  const [discountAmount, setDiscountAmount] = useState(
    initialDiscount ? calculateDiscountAmount(initialDiscount, basePrice) : 0
  );
  const [discountMsg, setDiscountMsg] = useState<{ success: boolean; text: string } | null>(
    initialDiscount
      ? {
          success: true,
          text: `Discount code "${initialDiscount.code}" applied (-${
            initialDiscount.discountType === "percent"
              ? `${initialDiscount.discountAmount}%`
              : `€${calculateDiscountAmount(initialDiscount, basePrice)}`
          })!`,
        }
      : null
  );
  const [validatingCode, setValidatingCode] = useState(false);

  useEffect(() => {
    if (initialDiscount) {
      const amt = calculateDiscountAmount(initialDiscount, basePrice);
      setAppliedDiscount(initialDiscount);
      setDiscountAmount(amt);
      setDiscountInput(initialDiscount.code);
      setDiscountMsg({
        success: true,
        text: `Discount code "${initialDiscount.code}" applied (-${
          initialDiscount.discountType === "percent"
            ? `${initialDiscount.discountAmount}%`
            : `€${amt}`
        })!`,
      });
    } else if (initialDiscountCode) {
      validateDiscountCode(initialDiscountCode, basePrice).then((res) => {
        if (res.valid && res.discount && res.discountAmount != null) {
          setAppliedDiscount(res.discount);
          setDiscountAmount(res.discountAmount);
          setDiscountInput(res.discount.code);
          setDiscountMsg({
            success: true,
            text: `Discount code "${res.discount.code}" applied (-${
              res.discount.discountType === "percent"
                ? `${res.discount.discountAmount}%`
                : `€${res.discountAmount}`
            })!`,
          });
        }
      });
    }
  }, [initialDiscount, initialDiscountCode, basePrice]);

  const finalPrice = Math.max(0, basePrice - discountAmount);

  const handleApplyDiscount = async () => {
    if (!discountInput.trim()) return;
    setValidatingCode(true);
    setDiscountMsg(null);
    const result = await validateDiscountCode(discountInput, basePrice);
    if (result.valid && result.discount && result.discountAmount != null) {
      setAppliedDiscount(result.discount);
      setDiscountAmount(result.discountAmount);
      setDiscountMsg({
        success: true,
        text: `Discount code "${result.discount.code}" applied (-${result.discount.discountType === "percent" ? `${result.discount.discountAmount}%` : `€${result.discountAmount}`})!`,
      });
    } else {
      setAppliedDiscount(null);
      setDiscountAmount(0);
      setDiscountMsg({
        success: false,
        text: result.error || "Invalid discount code",
      });
    }
    setValidatingCode(false);
  };

  // Memoize large country lists to prevent lag when opening the modal
  const phoneOptions = useMemo(() => {
    return filteredCountries.map((c) => (
      <SelectItem key={c.code} value={c.dial_code} className="cursor-pointer">
        <div className="flex items-center gap-2">
          <img src={getFlagUrl(c.code)} alt={c.name} loading="lazy" className="w-4 h-3 object-cover rounded-[2px] shadow-sm" />
          <span>{c.dial_code}</span>
        </div>
      </SelectItem>
    ));
  }, []);

  const countryOptions = useMemo(() => {
    return filteredCountries.map((c) => (
      <SelectItem key={c.code} value={c.name} className="cursor-pointer">
        <div className="flex items-center gap-3">
          <img src={getFlagUrl(c.code)} alt={c.name} loading="lazy" className="w-5 h-3.5 object-cover rounded-[2px] shadow-sm" />
          <span>{c.name}</span>
        </div>
      </SelectItem>
    ));
  }, []);

  return (
    <div
      id="pack-booking-modal"
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-3xl border border-border/60 bg-background/95 backdrop-blur-2xl shadow-gold animate-in fade-in zoom-in-95 duration-300"
        style={{ animationFillMode: "both" }}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 p-2 rounded-full bg-card/80 border border-border/40 hover:bg-card hover:border-primary/40 transition cursor-pointer text-muted-foreground hover:text-foreground"
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Header with golden accent */}
        <div className="relative overflow-hidden px-8 pt-8 pb-6">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gold" />
          <div className="absolute top-0 left-0 right-0 h-24 bg-gradient-to-b from-primary/5 to-transparent pointer-events-none" />

          <div className="relative">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="h-4 w-4 text-primary" />
              <p className="text-xs tracking-[0.3em] uppercase text-primary font-semibold">
                {t("packFormTitle")}
              </p>
            </div>
            <p className="text-sm text-muted-foreground">{t("packFormDesc")}</p>
          </div>

          {/* Selected pack badge */}
          <div className="mt-5 flex items-center gap-4 p-4 rounded-2xl border border-primary/20 bg-primary/5">
            <div className="h-12 w-12 rounded-xl bg-gold grid place-items-center shrink-0">
              <span className="text-primary-foreground font-display text-lg font-bold">
                {pack.name.charAt(0)}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs tracking-[0.2em] uppercase text-muted-foreground">
                {t("packFormSelectedPack")}
              </p>
              <p className="font-display text-xl truncate">
                {translateDynamicText(pack.name, lang)}
              </p>
              <p className="text-xs text-muted-foreground">
                {translateDynamicText(pack.sub, lang)}
              </p>
            </div>
            <div className="text-right shrink-0">
              {discountAmount > 0 ? (
                <div className="flex flex-col items-end">
                  <span className="bg-gradient-to-r from-red-600 to-rose-600 text-white font-extrabold text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wider shadow-sm mb-0.5">
                    -{appliedDiscount?.discountType === "percent" ? `${appliedDiscount.discountAmount}%` : `€${discountAmount}`}
                  </span>
                  <span className="text-xs text-muted-foreground line-through block">
                    {pack.price} {pack.currency || "€"}
                  </span>
                  <span className="font-display text-2xl text-gold font-bold">
                    {finalPrice} <span className="text-xs font-normal text-muted-foreground">{pack.currency || "€"}</span>
                  </span>
                  <span className="text-[10px] text-emerald-400 font-semibold uppercase tracking-wider">
                    Save {appliedDiscount?.discountType === "percent" ? `${appliedDiscount.discountAmount}%` : `€${discountAmount}`}
                  </span>
                </div>
              ) : (
                <div>
                  <span className="font-display text-2xl text-gold">{pack.price}</span>
                  <span className="text-xs text-muted-foreground block">{pack.currency || "€"}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Form or Success */}
        {submitted ? (
          <div className="px-8 pb-10 text-center">
            <div className="mx-auto h-20 w-20 rounded-full bg-primary/10 border-2 border-primary/30 grid place-items-center mb-6">
              <CheckCircle2 className="h-10 w-10 text-primary" />
            </div>
            <h3 className="font-display text-2xl mb-3">{t("packFormTitle")}</h3>
            {reservation && (
              <div className="mx-auto max-w-sm mb-5 rounded-2xl border border-primary/25 bg-primary/5 p-4">
                <p className="text-[10px] tracking-widest uppercase text-muted-foreground">
                  {lang === "fr"
                    ? "Votre numéro de réservation"
                    : lang === "es"
                      ? "Tu número de reserva"
                      : "Your Reservation Number"}
                </p>
                <code className="mt-1 inline-block font-mono text-2xl font-bold text-gold">
                  {reservation.ticketCode}
                </code>
                <p className="mt-2 text-xs text-muted-foreground">
                  {lang === "fr"
                    ? "Suivez votre réservation à tout moment :"
                    : lang === "es"
                      ? "Sigue tu reserva en cualquier momento:"
                      : "Follow your booking at any time:"}
                </p>
                <a
                  href={ticketUrl(reservation.ticketCode)}
                  className="mt-0.5 inline-block text-xs text-gold hover:opacity-80 underline break-all"
                >
                  {ticketUrl(reservation.ticketCode)}
                </a>
              </div>
            )}
            <p className="text-muted-foreground text-sm leading-relaxed max-w-sm mx-auto">
              {t("packFormSuccess")}
            </p>
            <button
              onClick={onClose}
              className="mt-8 inline-flex items-center gap-2 rounded-full bg-gold px-8 py-3 text-sm font-medium text-primary-foreground hover:opacity-90 transition cursor-pointer shadow-gold"
            >
              {t("packFormClose")}
            </button>
          </div>
        ) : (
          <form
            className="px-8 pb-8 space-y-4"
            onSubmit={async (e) => {
              e.preventDefault();
              setIsSubmitting(true);
              setError(false);
              const formData = new FormData(e.currentTarget);

              // Attribute the booking to a collaborator if the visitor
              // arrived via a referral link (/packs?ref=CODE).
              const refCode = getRememberedReferral();
              const collaborator = refCode
                ? await getCollaboratorByCode(refCode).catch(() => undefined)
                : undefined;

              const numGuests = pack.numGuests ?? (/double|doble|couple/i.test(`${pack.name} ${pack.sub}`) ? 2 : 1);
              const guestNames: string[] = [];
              if (numGuests > 1) {
                for (let i = 1; i <= numGuests; i++) {
                  const fn = String(formData.get(`Guest ${i} First Name`) || "").trim();
                  const ln = String(formData.get(`Guest ${i} Last Name`) || "").trim();
                  if (fn || ln) guestNames.push(`${fn} ${ln}`.trim());
                }
              } else {
                const fn = String(formData.get("First Name") || "").trim();
                const ln = String(formData.get("Last Name") || "").trim();
                if (fn || ln) guestNames.push(`${fn} ${ln}`.trim());
              }
              const customerName = guestNames.join(" & ");
              const phone = `${formData.get("Phone Country Code") ?? ""} ${formData.get("Phone") ?? ""}`.trim();
              const customerEmail = String(formData.get("Email") ?? "");


              // Record the booking FIRST so the guest gets their reservation
              // number on screen and in the auto-reply email.
              let created: Booking | null = null;
              try {
                created = await addBooking({
                  packId: pack.id ?? "",
                  packName: pack.sub ? `${pack.name} — ${pack.sub}` : pack.name,
                  customerName,
                  email: customerEmail,
                  phone,
                  country: String(formData.get("Country") ?? ""),
                  arrivalDate: String(formData.get("Arrival Date") ?? "") || null,
                  departureDate: String(formData.get("Departure Date") ?? "") || null,
                  numPeople: numGuests,
                  danceLevel: "",
                  notes: String(formData.get("Notes") ?? ""),
                  lang,
                  status: "pending",
                  source: collaborator ? "referral" : "website",
                  collaboratorId: collaborator?.id ?? null,
                  discountCode: appliedDiscount?.code ?? null,
                  discountAmount: discountAmount,
                  discountCodeId: appliedDiscount?.id ?? null,
                });
              } catch (dbErr) {
                console.warn("Could not record booking in database:", dbErr);
              }

              try {
                const sent = await sendFormNotification({
                  subject: `New Pack Booking: ${pack.name}`,
                  guestSubject:
                    lang === "fr"
                      ? "Votre demande de réservation — Tangier International Latin Festival"
                      : lang === "es"
                        ? "Tu solicitud de reserva — Tangier International Latin Festival"
                        : "Your reservation request — Tangier International Latin Festival",
                  lang,
                  fields: {
                    name: customerName,
                    email: customerEmail,
                    Pack: `${pack.name} - ${pack.sub} (${pack.price})`,
                    Phone: phone,
                    Country: String(formData.get("Country") ?? ""),
                    ...(formData.get("Arrival Date") ? { "Arrival Date (Going)": String(formData.get("Arrival Date")) } : {}),
                    ...(formData.get("Departure Date") ? { "Departure Date (Return)": String(formData.get("Departure Date")) } : {}),
                    Notes: String(formData.get("Notes") ?? ""),
                    ...(created ? { Reservation: created.ticketCode } : {}),
                    ...(collaborator ? { Referral: collaborator.code } : {}),
                  },
                  autoresponse: bookingAutoResponse(
                    lang,
                    created
                      ? { code: created.ticketCode, url: ticketUrl(created.ticketCode) }
                      : undefined
                  ),
                });
                // Booking already recorded — an email hiccup shouldn't make
                // the guest resubmit and create a duplicate.
                if (!sent && !created) throw new Error("Submit failed");

                setReservation(created);
                setSubmitted(true);
              } catch (err) {
                console.error(err);
                setError(true);
              } finally {
                setIsSubmitting(false);
              }
            }}
          >
            <input type="hidden" name="Pack" value={`${pack.name} - ${pack.sub} (${pack.price})`} />
            {/* Guest First & Last Name Inputs */}
            {(pack.numGuests ?? (/double|doble|couple/i.test(`${pack.name} ${pack.sub}`) ? 2 : 1)) > 1 ? (
              <div className="space-y-4">
                {Array.from({ length: pack.numGuests ?? (/double|doble|couple/i.test(`${pack.name} ${pack.sub}`) ? 2 : 1) }).map((_, i) => (
                  <div key={i} className="space-y-2">
                    <p className="text-xs font-semibold tracking-wider uppercase text-gold">
                      {lang === "fr" ? `Invité ${i + 1}` : lang === "es" ? `Invitado ${i + 1}` : `Guest ${i + 1}`}
                    </p>
                    <div className="grid sm:grid-cols-2 gap-4">
                      <div>
                        <label className="flex items-center gap-1.5 text-xs tracking-[0.15em] uppercase text-muted-foreground mb-1.5 font-medium">
                          <User className="h-3 w-3" />
                          {lang === "fr" ? "Prénom *" : lang === "es" ? "Nombre *" : "First Name *"}
                        </label>
                        <input
                          type="text"
                          name={`Guest ${i + 1} First Name`}
                          required
                          className="w-full rounded-xl border border-border bg-card/40 px-4 py-3 text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition placeholder:text-muted-foreground/50"
                          placeholder={i === 0 ? "John" : "Jane"}
                        />
                      </div>
                      <div>
                        <label className="flex items-center gap-1.5 text-xs tracking-[0.15em] uppercase text-muted-foreground mb-1.5 font-medium">
                          <User className="h-3 w-3" />
                          {lang === "fr" ? "Nom *" : lang === "es" ? "Apellido *" : "Last Name *"}
                        </label>
                        <input
                          type="text"
                          name={`Guest ${i + 1} Last Name`}
                          required
                          className="w-full rounded-xl border border-border bg-card/40 px-4 py-3 text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition placeholder:text-muted-foreground/50"
                          placeholder="Doe"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="flex items-center gap-1.5 text-xs tracking-[0.15em] uppercase text-muted-foreground mb-1.5 font-medium">
                    <User className="h-3 w-3" />
                    {lang === "fr" ? "Prénom *" : lang === "es" ? "Nombre *" : "First Name *"}
                  </label>
                  <input
                    type="text"
                    name="First Name"
                    required
                    className="w-full rounded-xl border border-border bg-card/40 px-4 py-3 text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition placeholder:text-muted-foreground/50"
                    placeholder="John"
                  />
                </div>
                <div>
                  <label className="flex items-center gap-1.5 text-xs tracking-[0.15em] uppercase text-muted-foreground mb-1.5 font-medium">
                    <User className="h-3 w-3" />
                    {lang === "fr" ? "Nom *" : lang === "es" ? "Apellido *" : "Last Name *"}
                  </label>
                  <input
                    type="text"
                    name="Last Name"
                    required
                    className="w-full rounded-xl border border-border bg-card/40 px-4 py-3 text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition placeholder:text-muted-foreground/50"
                    placeholder="Doe"
                  />
                </div>
              </div>
            )}

            {/* Email & Phone */}
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="flex items-center gap-1.5 text-xs tracking-[0.15em] uppercase text-muted-foreground mb-1.5 font-medium">
                  <Mail className="h-3 w-3" />
                  {t("packFormEmail")} *
                </label>
                <input
                  type="email"
                  name="Email"
                  required
                  className="w-full rounded-xl border border-border bg-card/40 px-4 py-3 text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition placeholder:text-muted-foreground/50"
                  placeholder="john@example.com"
                />
              </div>
              <div>
                <label className="flex items-center gap-1.5 text-xs tracking-[0.15em] uppercase text-muted-foreground mb-1.5 font-medium">
                  <Phone className="h-3 w-3" />
                  {t("packFormPhone")} *
                </label>
                <div className="flex items-center">
                  <Select name="Phone Country Code" defaultValue="+212">
                    <SelectTrigger className="w-[110px] rounded-l-xl rounded-r-none border border-border border-r-0 bg-card/40 px-3 py-3 h-[46px] focus:ring-1 focus:ring-primary/20 shadow-none focus:outline-none">
                      <SelectValue placeholder="+212" />
                    </SelectTrigger>
                    <SelectContent className="max-h-[300px]">
                      <SelectGroup>
                        {phoneOptions}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                  <input
                    type="tel"
                    name="Phone"
                    required
                    className="w-full rounded-r-xl border border-border bg-card/40 px-4 py-3 h-[46px] text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition placeholder:text-muted-foreground/50"
                    placeholder="6 XX XX XX XX"
                  />
                </div>
              </div>
            </div>

            {/* Country */}
            <div>
              <label className="flex items-center gap-1.5 text-xs tracking-[0.15em] uppercase text-muted-foreground mb-1.5 font-medium">
                <Globe className="h-3 w-3" />
                {t("packFormCountry")}
              </label>
              <Select name="Country" defaultValue="Morocco">
                <SelectTrigger className="w-full rounded-xl border border-border bg-card/40 px-4 py-3 h-[46px] focus:ring-1 focus:ring-primary/20 shadow-none focus:outline-none">
                  <SelectValue placeholder={t("packFormCountry")} />
                </SelectTrigger>
                <SelectContent className="max-h-[300px]">
                  <SelectGroup>
                    {countryOptions}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>

            {/* Travel Dates (Optional) */}
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="flex items-center gap-1.5 text-xs tracking-[0.15em] uppercase text-muted-foreground mb-1.5 font-medium">
                  <Calendar className="h-3 w-3" />
                  {lang === "fr" ? "Date d'arrivée (Aller)" : lang === "es" ? "Fecha de llegada (Ida)" : "Arrival Date (Going)"}
                  <span className="text-[10px] text-muted-foreground/60 normal-case">
                    ({lang === "fr" ? "optionnel" : lang === "es" ? "opcional" : "optional"})
                  </span>
                </label>
                <input
                  type="date"
                  name="Arrival Date"
                  min="2027-01-01"
                  max="2027-01-31"
                  className="w-full rounded-xl border border-border bg-card/40 px-4 py-2.5 text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition text-foreground"
                />
              </div>
              <div>
                <label className="flex items-center gap-1.5 text-xs tracking-[0.15em] uppercase text-muted-foreground mb-1.5 font-medium">
                  <Calendar className="h-3 w-3" />
                  {lang === "fr" ? "Date de départ (Retour)" : lang === "es" ? "Fecha de salida (Vuelta)" : "Departure Date (Return)"}
                  <span className="text-[10px] text-muted-foreground/60 normal-case">
                    ({lang === "fr" ? "optionnel" : lang === "es" ? "opcional" : "optional"})
                  </span>
                </label>
                <input
                  type="date"
                  name="Departure Date"
                  min="2027-01-01"
                  max="2027-02-15"
                  className="w-full rounded-xl border border-border bg-card/40 px-4 py-2.5 text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition text-foreground"
                />
              </div>
            </div>

            {/* Promo / School Code */}
            <div className="rounded-xl border border-border/80 bg-card/40 p-4 space-y-2.5">
              <div className="flex items-start gap-2.5">
                <Tag className="h-4 w-4 text-gold mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs font-semibold text-foreground">
                    {lang === "fr"
                      ? "Vous faites un show avec votre école ?"
                      : lang === "es"
                      ? "¿Actúas en un show con tu escuela?"
                      : "Performing a show with your dance school?"}
                  </p>
                  <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug">
                    {lang === "fr"
                      ? "Saisissez le code confidentiel de votre école pour bénéficier du tarif réduit."
                      : lang === "es"
                      ? "Ingresa el código confidencial de tu escuela para obtener la tarifa reducida."
                      : "Enter your school's confidential code to benefit from the discounted rate."}
                  </p>
                </div>
              </div>
              <div className="flex gap-2 pt-1">
                <input
                  type="text"
                  value={discountInput}
                  onChange={(e) => setDiscountInput(e.target.value.toUpperCase())}
                  placeholder={
                    lang === "fr"
                      ? "Code confidentiel"
                      : lang === "es"
                      ? "Código confidencial"
                      : "Confidential code"
                  }
                  className="flex-1 rounded-xl border border-border bg-card/60 px-3.5 py-2.5 font-mono text-sm uppercase focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition placeholder:text-muted-foreground/50"
                />
                <button
                  type="button"
                  onClick={handleApplyDiscount}
                  disabled={validatingCode || !discountInput.trim()}
                  className="px-4 py-2.5 rounded-xl bg-gold/90 hover:bg-gold text-primary-foreground font-semibold text-xs tracking-wider uppercase transition cursor-pointer disabled:opacity-50"
                >
                  {validatingCode ? "..." : lang === "fr" ? "Appliquer" : lang === "es" ? "Aplicar" : "Apply"}
                </button>
              </div>
              {discountMsg && (
                <div
                  className={`p-2.5 rounded-lg text-xs font-medium flex items-center gap-1.5 ${
                    discountMsg.success
                      ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-400"
                      : "bg-destructive/10 border border-destructive/20 text-destructive"
                  }`}
                >
                  {discountMsg.success ? (
                    <Check className="h-3.5 w-3.5 shrink-0 text-emerald-400" />
                  ) : (
                    <AlertCircle className="h-3.5 w-3.5 shrink-0 text-destructive" />
                  )}
                  <span>{discountMsg.text}</span>
                </div>
              )}
            </div>


            {/* Submit */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full rounded-xl bg-gold px-4 py-4 text-sm font-bold tracking-widest text-primary-foreground uppercase hover:opacity-90 transition shadow-gold cursor-pointer disabled:opacity-70 flex items-center justify-center"
            >
              {isSubmitting ? "Sending..." : t("packFormSubmitBtn")}
            </button>

            {error && (
              <p className="text-xs text-destructive text-center font-semibold">
                Something went wrong. Please try again or contact us at
                contact@tangierlatinfestival.com
              </p>
            )}

            <p className="text-center text-[10px] text-muted-foreground/60 tracking-wide">
              contact@tangierlatinfestival.com · +212 6 64 01 02 79
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
