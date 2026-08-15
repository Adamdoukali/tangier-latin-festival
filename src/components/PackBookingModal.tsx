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
  const numGuests = pack.numGuests ?? (/double|doble|couple/i.test(`${pack.name} ${pack.sub}`) ? 2 : 1);
  const singlePrice = parseInt(pack.price, 10) || 0;
  const totalBasePrice = singlePrice * numGuests;
  const currency = pack.currency || "€";

  const [discountAmount, setDiscountAmount] = useState(
    initialDiscount ? calculateDiscountAmount(initialDiscount, totalBasePrice) : 0
  );
  const [discountMsg, setDiscountMsg] = useState<{ success: boolean; text: string } | null>(
    initialDiscount
      ? {
          success: true,
          text: `Discount code "${initialDiscount.code}" applied (-${
            initialDiscount.discountType === "percent"
              ? `${initialDiscount.discountAmount}%`
              : `€${calculateDiscountAmount(initialDiscount, totalBasePrice)}`
          })!`,
        }
      : null
  );
  const [validatingCode, setValidatingCode] = useState(false);

  useEffect(() => {
    if (initialDiscount) {
      const amt = calculateDiscountAmount(initialDiscount, totalBasePrice);
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
      validateDiscountCode(initialDiscountCode, totalBasePrice, pack.id, numGuests, singlePrice).then((res) => {
        if (res.valid && res.discount && res.discountAmount != null) {
          setAppliedDiscount(res.discount);
          setDiscountAmount(res.discountAmount);
          setDiscountInput(res.discount.code);
          const scopeText =
            res.discount.applyScope === "fixed_price"
              ? `Special rate: €${res.discount.overridePrice ?? 0}`
              : res.discount.applyScope === "per_person"
              ? `-€${res.discount.discountAmount}/person`
              : res.discount.discountType === "percent"
              ? `${res.discount.discountAmount}%`
              : `€${res.discountAmount}`;
          setDiscountMsg({
            success: true,
            text: `Discount code "${res.discount.code}" applied (${scopeText})!`,
          });
        }
      });
    }
  }, [initialDiscount, initialDiscountCode, totalBasePrice, pack.id, numGuests, singlePrice]);

  const finalTotalPrice = Math.max(0, totalBasePrice - discountAmount);

  const handleApplyDiscount = async () => {
    if (!discountInput.trim()) return;
    setValidatingCode(true);
    setDiscountMsg(null);
    const result = await validateDiscountCode(discountInput, totalBasePrice, pack.id, numGuests, singlePrice);
    if (result.valid && result.discount && result.discountAmount != null) {
      setAppliedDiscount(result.discount);
      setDiscountAmount(result.discountAmount);
      const scopeText =
        result.discount.applyScope === "fixed_price"
          ? `Special rate: €${result.discount.overridePrice ?? 0}`
          : result.discount.applyScope === "per_person"
          ? `-€${result.discount.discountAmount}/person`
          : result.discount.discountType === "percent"
          ? `${result.discount.discountAmount}%`
          : `€${result.discountAmount}`;
      setDiscountMsg({
        success: true,
        text: `Discount code "${result.discount.code}" applied (${scopeText})!`,
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
        className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-3xl border border-gray-200 bg-white shadow-2xl animate-in fade-in zoom-in-95 duration-300 text-gray-900"
        style={{ animationFillMode: "both" }}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 p-2 rounded-full bg-gray-100 border border-gray-200 hover:bg-gray-200 transition cursor-pointer text-gray-600 hover:text-gray-900"
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Header with golden accent */}
        <div className="relative overflow-hidden px-8 pt-8 pb-6">
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-amber-500" />

          <div className="relative">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="h-4 w-4 text-amber-500" />
              <p className="text-xs tracking-[0.3em] uppercase text-amber-600 font-semibold">
                {t("packFormTitle")}
              </p>
            </div>
            <p className="text-sm text-gray-500">{t("packFormDesc")}</p>
          </div>

          {/* Selected pack badge & pricing breakdown */}
          <div className="mt-5 p-4 rounded-2xl border border-amber-200 bg-amber-50/70 space-y-3">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-amber-500 grid place-items-center shrink-0 shadow-sm">
                <span className="text-slate-950 font-display text-lg font-bold">
                  {pack.name.charAt(0)}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs tracking-[0.2em] uppercase text-gray-500 font-medium">
                  {t("packFormSelectedPack")}
                </p>
                <p className="font-display text-xl truncate text-gray-900 font-semibold">
                  {translateDynamicText(pack.name, lang)}
                </p>
                <p className="text-xs text-gray-500 truncate">
                  {translateDynamicText(pack.sub, lang)}
                </p>
              </div>
              <div className="text-right shrink-0">
                <span className="text-xs font-semibold text-amber-600 block">
                  {singlePrice > 0 ? `${singlePrice} ${currency} / ${lang === "fr" ? "pers." : lang === "es" ? "pers." : "person"}` : pack.price}
                </span>
              </div>
            </div>

            {/* Detailed Per-Person & Total Breakdown */}
            <div className="pt-3 border-t border-amber-200/80 space-y-1.5 text-xs text-gray-700 font-medium">
              <div className="flex justify-between items-center text-gray-600">
                <span>{lang === "fr" ? "Prix par personne :" : lang === "es" ? "Precio por persona:" : "Price per person:"}</span>
                <span className="font-semibold text-gray-900">{singlePrice} {currency}</span>
              </div>

              {numGuests > 1 && (
                <div className="space-y-1 py-1">
                  {Array.from({ length: numGuests }).map((_, idx) => (
                    <div key={idx} className="flex justify-between items-center text-gray-600 pl-2 border-l-2 border-amber-400">
                      <span>{lang === "fr" ? `Invité ${idx + 1}` : lang === "es" ? `Invitado ${idx + 1}` : `Guest ${idx + 1}`}</span>
                      <span>{singlePrice} {currency}</span>
                    </div>
                  ))}
                </div>
              )}

              {discountAmount > 0 && (
                <div className="flex justify-between items-center text-emerald-700 font-semibold">
                  <span>{lang === "fr" ? "Réduction appliquée :" : lang === "es" ? "Descuento aplicado:" : "Discount applied:"}</span>
                  <span>-{appliedDiscount?.discountType === "percent" ? `${appliedDiscount.discountAmount}%` : `${discountAmount} ${currency}`}</span>
                </div>
              )}

              <div className="flex justify-between items-center pt-2 border-t border-amber-300 font-bold text-sm text-gray-900">
                <span>
                  {numGuests > 1
                    ? (lang === "fr" ? `Montant Total (${numGuests} personnes)` : lang === "es" ? `Monto Total (${numGuests} personas)` : `Total Amount (${numGuests} guests)`)
                    : (lang === "fr" ? "Montant Total" : lang === "es" ? "Monto Total" : "Total Amount")}
                </span>
                <span className="font-extrabold text-lg text-amber-600">
                  {finalTotalPrice} {currency}
                </span>
              </div>
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
                    <p className="text-xs font-bold tracking-wider uppercase text-amber-600">
                      {lang === "fr" ? `Invité ${i + 1}` : lang === "es" ? `Invitado ${i + 1}` : `Guest ${i + 1}`}
                    </p>
                    <div className="grid sm:grid-cols-2 gap-4">
                      <div>
                        <label className="flex items-center gap-1.5 text-xs tracking-wider uppercase text-gray-700 mb-1.5 font-semibold">
                          <User className="h-3.5 w-3.5 text-gray-400" />
                          {lang === "fr" ? "Prénom *" : lang === "es" ? "Nombre *" : "First Name *"}
                        </label>
                        <input
                          type="text"
                          name={`Guest ${i + 1} First Name`}
                          required
                          className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition"
                          placeholder={i === 0 ? "John" : "Jane"}
                        />
                      </div>
                      <div>
                        <label className="flex items-center gap-1.5 text-xs tracking-wider uppercase text-gray-700 mb-1.5 font-semibold">
                          <User className="h-3.5 w-3.5 text-gray-400" />
                          {lang === "fr" ? "Nom *" : lang === "es" ? "Apellido *" : "Last Name *"}
                        </label>
                        <input
                          type="text"
                          name={`Guest ${i + 1} Last Name`}
                          required
                          className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition"
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
                  <label className="flex items-center gap-1.5 text-xs tracking-wider uppercase text-gray-700 mb-1.5 font-semibold">
                    <User className="h-3.5 w-3.5 text-gray-400" />
                    {lang === "fr" ? "Prénom *" : lang === "es" ? "Nombre *" : "First Name *"}
                  </label>
                  <input
                    type="text"
                    name="First Name"
                    required
                    className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition"
                    placeholder="John"
                  />
                </div>
                <div>
                  <label className="flex items-center gap-1.5 text-xs tracking-wider uppercase text-gray-700 mb-1.5 font-semibold">
                    <User className="h-3.5 w-3.5 text-gray-400" />
                    {lang === "fr" ? "Nom *" : lang === "es" ? "Apellido *" : "Last Name *"}
                  </label>
                  <input
                    type="text"
                    name="Last Name"
                    required
                    className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition"
                    placeholder="Doe"
                  />
                </div>
              </div>
            )}

            {/* Email & Phone */}
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="flex items-center gap-1.5 text-xs tracking-wider uppercase text-gray-700 mb-1.5 font-semibold">
                  <Mail className="h-3.5 w-3.5 text-gray-400" />
                  {t("packFormEmail")} *
                </label>
                <input
                  type="email"
                  name="Email"
                  required
                  className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition"
                  placeholder="john@example.com"
                />
              </div>
              <div>
                <label className="flex items-center gap-1.5 text-xs tracking-wider uppercase text-gray-700 mb-1.5 font-semibold">
                  <Phone className="h-3.5 w-3.5 text-gray-400" />
                  {t("packFormPhone")} *
                </label>
                <div className="flex items-center">
                  <select
                    name="Phone Country Code"
                    defaultValue="+212"
                    className="w-[110px] rounded-l-xl border border-gray-300 border-r-0 bg-gray-50 px-3 py-3 h-[46px] text-sm text-gray-900 focus:outline-none focus:border-amber-500 cursor-pointer font-medium"
                  >
                    <option value="+212">🇲🇦 +212</option>
                    <option value="+33">🇫🇷 +33</option>
                    <option value="+34">🇪🇸 +34</option>
                    <option value="+44">🇬🇧 +44</option>
                    <option value="+1">🇺🇸 +1</option>
                    <option value="+49">🇩🇪 +49</option>
                    <option value="+39">🇮🇹 +39</option>
                    <option value="+32">🇧🇪 +32</option>
                    <option value="+41">🇨🇭 +41</option>
                    <option value="+351">🇵🇹 +351</option>
                    <option value="+31">🇳🇱 +31</option>
                  </select>
                  <input
                    type="tel"
                    name="Phone"
                    required
                    className="w-full rounded-r-xl border border-gray-300 bg-white px-4 py-3 h-[46px] text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition"
                    placeholder="6 XX XX XX XX"
                  />
                </div>
              </div>
            </div>

            {/* Country */}
            <div>
              <label className="flex items-center gap-1.5 text-xs tracking-wider uppercase text-gray-700 mb-1.5 font-semibold">
                <Globe className="h-3.5 w-3.5 text-gray-400" />
                {t("packFormCountry")} *
              </label>
              <select
                name="Country"
                required
                defaultValue="Morocco"
                className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 h-[46px] text-sm text-gray-900 focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition cursor-pointer"
              >
                {filteredCountries.map((c) => (
                  <option key={c.code} value={c.name}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Travel Dates (Mandatory) */}
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="flex items-center gap-1.5 text-xs tracking-wider uppercase text-gray-700 mb-1.5 font-semibold">
                  <Calendar className="h-3.5 w-3.5 text-gray-400" />
                  {lang === "fr" ? "Date d'arrivée (Aller) *" : lang === "es" ? "Fecha de llegada (Ida) *" : "Arrival Date (Going) *"}
                </label>
                <input
                  type="date"
                  name="Arrival Date"
                  required
                  min="2027-01-01"
                  max="2027-01-31"
                  className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition"
                />
              </div>
              <div>
                <label className="flex items-center gap-1.5 text-xs tracking-wider uppercase text-gray-700 mb-1.5 font-semibold">
                  <Calendar className="h-3.5 w-3.5 text-gray-400" />
                  {lang === "fr" ? "Date de départ (Retour) *" : lang === "es" ? "Fecha de salida (Vuelta) *" : "Departure Date (Return) *"}
                </label>
                <input
                  type="date"
                  name="Departure Date"
                  required
                  min="2027-01-01"
                  max="2027-02-15"
                  className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition"
                />
              </div>
            </div>

            {/* Promo / School Code */}
            <div className="rounded-xl border border-gray-200 bg-gray-50/80 p-4 space-y-2.5">
              <div className="flex items-start gap-2.5">
                <Tag className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs font-semibold text-gray-900">
                    {lang === "fr"
                      ? "Vous faites un show avec votre école ?"
                      : lang === "es"
                      ? "¿Actúas en un show con tu escuela?"
                      : "Performing a show with your dance school?"}
                  </p>
                  <p className="text-[11px] text-gray-600 mt-0.5 leading-snug">
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
                  className="flex-1 rounded-xl border border-gray-300 bg-white px-3.5 py-2.5 font-mono text-sm uppercase text-gray-900 focus:outline-none focus:border-amber-500 transition placeholder:text-gray-400"
                />
                <button
                  type="button"
                  onClick={handleApplyDiscount}
                  disabled={validatingCode || !discountInput.trim()}
                  className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs tracking-wider uppercase transition cursor-pointer disabled:opacity-50"
                >
                  {validatingCode ? "..." : lang === "fr" ? "Appliquer" : lang === "es" ? "Aplicar" : "Apply"}
                </button>
              </div>
              {discountMsg && (
                <div
                  className={`p-2.5 rounded-lg text-xs font-medium flex items-center gap-1.5 ${
                    discountMsg.success
                      ? "bg-emerald-50 border border-emerald-200 text-emerald-700"
                      : "bg-red-50 border border-red-200 text-red-700"
                  }`}
                >
                  {discountMsg.success ? (
                    <Check className="h-3.5 w-3.5 shrink-0 text-emerald-600" />
                  ) : (
                    <AlertCircle className="h-3.5 w-3.5 shrink-0 text-red-600" />
                  )}
                  <span>{discountMsg.text}</span>
                </div>
              )}
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full rounded-xl bg-amber-500 py-4 font-bold text-slate-950 uppercase tracking-wider text-sm hover:bg-amber-400 transition cursor-pointer shadow-md disabled:opacity-50 mt-2"
            >
              {isSubmitting
                ? t("packFormSubmitting")
                : `${t("packFormSubmit")} (${finalTotalPrice} ${currency})`}

            </button>

            {error && (
              <p className="text-center text-xs text-red-600 mt-2 font-medium">
                {t("packFormError")}
              </p>
            )}

            <p className="text-center text-[10px] text-gray-400 tracking-wide pt-2">
              contact@tangierlatinfestival.com · +212 6 64 01 02 79
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
