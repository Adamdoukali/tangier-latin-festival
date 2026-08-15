import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import {
  Check,
  ChevronLeft,
  CheckCircle2,
  Clock,
  Star,
  Ticket,
  Calendar,
  MapPin,
  Tag,
  AlertCircle,
} from "lucide-react";
import { PhoneCountrySelect } from "@/components/PhoneCountrySelect";
import {
  getActivePacks,
  getPackById,
  addBooking,
  getCollaboratorByCode,
  getRememberedReferral,
  validateDiscountCode,
  calculateDiscountAmount,
  packLabel,
  ticketUrl,
  type Pack,
  type Booking,
  type DiscountCode,
} from "@/lib/admin-store";
import { useLanguage } from "@/hooks/useLanguage";
import { translateDynamicText, priceUnitLabel, type Language } from "@/lib/translations";
import { sendFormNotification, bookingAutoResponse } from "@/lib/form-notify";

export const Route = createFileRoute("/book")({
  head: () => ({
    meta: [
      { title: "Book Your Pack — Tangier International Latin Festival 2027" },
      {
        name: "description",
        content:
          "Choose your festival pack and request your booking. Our team confirms within 24 hours.",
      },
    ],
  }),
  component: BookPage,
});

function BookPage() {
  const { lang } = useLanguage();
  const L = lang as Language;
  const tr = (en: string, fr: string, es: string) =>
    lang === "fr" ? fr : lang === "es" ? es : en;

  const [packs, setPacks] = useState<Pack[]>([]);
  const [selected, setSelected] = useState<Pack | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [reservation, setReservation] = useState<Booking | null>(null);
  const [error, setError] = useState("");

  // Discount code state
  const [discountInput, setDiscountInput] = useState("");
  const [appliedDiscount, setAppliedDiscount] = useState<DiscountCode | null>(null);
  const [discountAmount, setDiscountAmount] = useState(0);
  const [discountMsg, setDiscountMsg] = useState<{ success: boolean; text: string } | null>(null);
  const [validatingCode, setValidatingCode] = useState(false);

  const [form, setForm] = useState({
    names: [""] as string[],
    email: "",
    phone: "",
    country: "",
    arrival: "",
    departure: "",
    notes: "",
  });

  useEffect(() => {
    getActivePacks().then((loaded) => {
      setPacks(loaded);
      if (typeof window !== "undefined") {
        const params = new URLSearchParams(window.location.search);
        const packId = params.get("packId");
        if (packId) {
          getPackById(packId).then((p) => {
            if (p) {
              setSelected(p);
              const count = p.numGuests ?? (/double|doble|couple|pareja/i.test(`${p.name} ${p.sub}`) ? 2 : 1);
              setForm((f) => ({ ...f, names: Array.from({ length: count }, () => "") }));
            }
          });
        }
      }
    });
  }, []);

  // Short partner links (tickets.tangierlatinfestival.com/CODE) carry no
  // ?lang — open the page in the partner's configured language instead.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("lang")) return;
    const ref = params.get("ref") || getRememberedReferral();
    if (!ref) return;
    getCollaboratorByCode(ref)
      .then((c) => {
        if (c?.language && c.language !== "en") {
          params.set("lang", c.language);
          window.location.replace(`${window.location.pathname}?${params}`);
        }
      })
      .catch(() => {});
  }, []);

  // Automatically check ?discount= URL param or sessionStorage if present
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const discParam = params.get("discount") || sessionStorage.getItem("tlf_discount_code");
    if (discParam) {
      const code = discParam.trim().toUpperCase();
      setDiscountInput(code);
      const baseP = selected ? parseInt(selected.price, 10) || 0 : 0;
      validateDiscountCode(code, baseP).then((res) => {
        if (res.valid && res.discount) {
          setAppliedDiscount(res.discount);
          sessionStorage.setItem("tlf_discount_code", res.discount.code);
          const amt = calculateDiscountAmount(res.discount, baseP);
          setDiscountAmount(amt);
          setDiscountMsg({
            success: true,
            text: `Discount code "${res.discount.code}" applied (-${res.discount.discountType === "percent" ? `${res.discount.discountAmount}%` : `€${res.discount.discountAmount}`})!`,
          });
        }
      });
    }
  }, [selected]);

  const handleApplyDiscount = async () => {
    if (!discountInput.trim()) return;
    setValidatingCode(true);
    setDiscountMsg(null);
    const baseP = selected ? parseInt(selected.price, 10) || 0 : 0;
    const result = await validateDiscountCode(discountInput, baseP);
    if (result.valid && result.discount) {
      setAppliedDiscount(result.discount);
      if (typeof window !== "undefined") {
        sessionStorage.setItem("tlf_discount_code", result.discount.code);
      }
      const amt = calculateDiscountAmount(result.discount, baseP);
      setDiscountAmount(amt);
      setDiscountMsg({
        success: true,
        text: `Discount code "${result.discount.code}" applied (-${result.discount.discountType === "percent" ? `${result.discount.discountAmount}%` : `€${result.discount.discountAmount}`})!`,
      });
    } else {
      setAppliedDiscount(null);
      setDiscountAmount(0);
      if (typeof window !== "undefined") {
        sessionStorage.removeItem("tlf_discount_code");
      }
      setDiscountMsg({
        success: false,
        text: result.error || "Invalid discount code",
      });
    }
    setValidatingCode(false);
  };

  const clearDiscount = () => {
    setAppliedDiscount(null);
    setDiscountInput("");
    setDiscountAmount(0);
    setDiscountMsg(null);
    if (typeof window !== "undefined") {
      sessionStorage.removeItem("tlf_discount_code");
    }
  };

  const getGuestCount = (p: Pack) => {
    if (typeof p.numGuests === "number" && p.numGuests > 1) return p.numGuests;
    if (/double|doble|couple|pareja/i.test(`${p.name} ${p.sub}`)) return 2;
    return p.numGuests ?? 1;
  };

  const choosePack = (p: Pack) => {
    setSelected(p);
    const count = getGuestCount(p);
    setForm((f) => ({
      ...f,
      guests: Array.from({ length: count }, () => ({ firstName: "", lastName: "" })),
    }));
    if (appliedDiscount) {
      const baseP = parseInt(p.price, 10) || 0;
      setDiscountAmount(calculateDiscountAmount(appliedDiscount, baseP));
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const setGuestField = (idx: number, field: "firstName" | "lastName", value: string) =>
    setForm((f) => ({
      ...f,
      guests: f.guests.map((g, i) => (i === idx ? { ...g, [field]: value } : g)),
    }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (
      !selected ||
      form.guests.some((g) => !g.firstName.trim() || !g.lastName.trim()) ||
      !form.email.trim() ||
      !form.phone.trim()
    )
      return;
    setSubmitting(true);
    setError("");

    const refCode = getRememberedReferral();
    const collaborator = refCode
      ? await getCollaboratorByCode(refCode).catch(() => undefined)
      : undefined;
    const customerName = form.guests
      .map((g) => `${g.firstName.trim()} ${g.lastName.trim()}`)
      .join(" & ");

    // Record the pending booking FIRST so the guest gets a reservation
    // number on the success screen and in the auto-reply email.
    let created: Booking | null = null;
    try {
      created = await addBooking({
        packId: selected.id,
        packName: packLabel(selected),
        customerName,
        email: form.email,
        phone: form.phone,
        country: form.country,
        numPeople: form.names.length,
        danceLevel: "",
        notes: form.notes,
        arrivalDate: form.arrival || null,
        departureDate: form.departure || null,
        lang,
        status: "pending",
        source: collaborator ? "referral" : "website",
        collaboratorId: collaborator?.id ?? null,
        discountCode: appliedDiscount?.code ?? null,
        discountAmount: discountAmount,
        discountCodeId: appliedDiscount?.id ?? null,
      });
    } catch (dbErr) {
      console.warn("Could not record booking:", dbErr);
    }

    try {
      // Notify the festival team + automatic reply to the customer
      const sent = await sendFormNotification({
        subject: `New Booking Request: ${selected.name} (${selected.sub})`,
        guestSubject: tr(
          "Your reservation request — Tangier International Latin Festival",
          "Votre demande de réservation — Tangier International Latin Festival",
          "Tu solicitud de reserva — Tangier International Latin Festival"
        ),
        lang,
        fields: {
          name: customerName,
          email: form.email,
          Pack: `${selected.name} - ${selected.sub} (${selected.price} ${selected.currency || "€"})`,
          Phone: form.phone,
          Country: form.country,
          Arrival: form.arrival,
          Departure: form.departure,
          Notes: form.notes,
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
      // The booking is safely recorded — an email hiccup shouldn't make the
      // guest resubmit (that would create a duplicate reservation).
      if (!sent && !created) throw new Error("Submit failed");

      setReservation(created);
      setDone(true);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      console.error(err);
      setError(
        tr(
          "Something went wrong. Please try again or contact us at contact@tangierlatinfestival.com",
          "Une erreur est survenue. Veuillez réessayer ou nous écrire à contact@tangierlatinfestival.com",
          "Ocurrió un error. Inténtalo de nuevo o escríbenos a contact@tangierlatinfestival.com"
        )
      );
    }
    setSubmitting(false);
  };

  // ── Success ──
  if (done) {
    return (
      <Shell>
        <div className="max-w-md mx-auto text-center py-16">
          <div className="mx-auto w-16 h-16 rounded-full bg-amber-100 grid place-items-center mb-6">
            <Clock className="h-8 w-8 text-amber-600" />
          </div>
          <h1 className="font-display text-2xl text-gray-900 tracking-wide">
            {tr("Request Received!", "Demande reçue !", "¡Solicitud recibida!")}
          </h1>
          <p className="mt-2 inline-block px-3 py-1 rounded-full bg-amber-100 border border-amber-200 text-amber-700 text-xs tracking-widest uppercase">
            {tr("Status: Pending", "Statut : En attente", "Estado: Pendiente")}
          </p>
          {reservation && (
            <div className="mt-5 rounded-2xl border border-amber-100 bg-white shadow-sm p-5 text-center">
              <p className="text-[10px] tracking-widest uppercase text-gray-500">
                {tr(
                  "Your Reservation Number",
                  "Votre numéro de réservation",
                  "Tu número de reserva"
                )}
              </p>
              <code className="mt-1.5 inline-block font-mono text-2xl font-bold text-amber-600">
                {reservation.ticketCode}
              </code>
              <p className="mt-3 text-xs text-gray-500">
                {tr(
                  "Keep this number — you can follow your booking at any time:",
                  "Gardez ce numéro — suivez votre réservation à tout moment :",
                  "Guarda este número — sigue tu reserva en cualquier momento:"
                )}
              </p>
              <a
                href={ticketUrl(reservation.ticketCode)}
                className="mt-1 inline-block text-xs text-amber-600 hover:text-amber-700 underline break-all"
              >
                {ticketUrl(reservation.ticketCode)}
              </a>
            </div>
          )}
          <p className="mt-5 text-sm text-gray-600 leading-relaxed">
            {tr(
              "Our team will respond within 24 hours to confirm your booking and send you the payment details by email.",
              "Notre équipe vous répondra sous 24 heures pour confirmer votre réservation et vous envoyer les détails de paiement par email.",
              "Nuestro equipo te responderá en un plazo de 24 horas para confirmar tu reserva y enviarte los detalles de pago por correo."
            )}
          </p>
          <Link
            to="/"
            className="mt-8 inline-flex items-center gap-2 rounded-full bg-amber-500 px-6 py-3 text-sm font-semibold text-zinc-950 hover:bg-amber-400 transition"
          >
            {tr("Visit the Festival Website", "Visiter le site du festival", "Visitar el sitio del festival")}
          </Link>
        </div>
      </Shell>
    );
  }

  // ── Step 2: registration form ──
  if (selected) {
    const guestCount = getGuestCount(selected);
    const unit = priceUnitLabel(selected, L);
    return (
      <Shell>
        <button
          onClick={() => setSelected(null)}
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition cursor-pointer mb-6"
        >
          <ChevronLeft className="h-4 w-4" />
          {tr("Choose another pack", "Choisir un autre pack", "Elegir otro pack")}
        </button>

        {/* Selected pack summary */}
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-5 mb-6 max-w-lg mx-auto">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="font-display text-lg text-gray-900">
                {translateDynamicText(selected.name, L)}
              </h2>
              <p className="text-xs text-gray-500">{translateDynamicText(selected.sub, L)}</p>
            </div>
            <div className="text-right">
              {discountAmount > 0 ? (
                <div>
                  <span className="text-xs text-gray-400 line-through block">
                    {selected.price} {selected.currency || "€"}
                  </span>
                  <span className="font-display text-2xl text-amber-600 font-bold">
                    {Math.max(0, (parseInt(selected.price, 10) || 0) - discountAmount)}
                    <span className="text-xs text-gray-600 ml-1">
                      {selected.currency || "€"}
                      {unit ? ` / ${unit}` : ""}
                    </span>
                  </span>
                  <span className="text-[10px] text-emerald-600 font-bold block uppercase tracking-wider">
                    Discount Applied (-{appliedDiscount?.discountType === "percent" ? `${appliedDiscount.discountAmount}%` : `€${discountAmount}`})
                  </span>
                </div>
              ) : (
                <p className="font-display text-2xl text-amber-600 whitespace-nowrap">
                  {selected.price}
                  <span className="text-xs text-gray-500 ml-1">
                    {selected.currency || "€"}
                    {unit ? ` / ${unit}` : ""}
                  </span>
                </p>
              )}
            </div>
          </div>
        </div>

        <form
          onSubmit={handleSubmit}
          className="rounded-xl border border-gray-200 bg-white shadow-sm p-6 max-w-lg mx-auto"
        >
          <h3 className="font-display text-lg text-gray-900 mb-1">
            {tr("Your details", "Vos informations", "Tus datos")}
          </h3>
          <p className="text-xs text-gray-500 mb-6">
            {tr(
              "Send your booking request — we confirm within 24 hours.",
              "Envoyez votre demande de réservation — nous confirmons sous 24 heures.",
              "Envía tu solicitud de reserva — confirmamos en 24 horas."
            )}
          </p>

          <div className="space-y-4">
            {form.guests.map((g, idx) => (
              <div key={idx} className="space-y-2">
                {form.guests.length > 1 && (
                  <p className="text-xs font-semibold tracking-wider uppercase text-amber-600">
                    {tr("Guest", "Invité", "Invitado")} {idx + 1}
                  </p>
                )}
                <div className="grid sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs tracking-widest uppercase text-gray-500 mb-1.5 font-medium">
                      {tr("First Name", "Prénom", "Nombre")} <span className="text-red-600">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={g.firstName}
                      onChange={(e) => setGuestField(idx, "firstName", e.target.value)}
                      placeholder={idx === 0 ? "John" : "Jane"}
                      className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-amber-500 transition"
                    />
                  </div>
                  <div>
                    <label className="block text-xs tracking-widest uppercase text-gray-500 mb-1.5 font-medium">
                      {tr("Last Name", "Nom", "Apellido")} <span className="text-red-600">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={g.lastName}
                      onChange={(e) => setGuestField(idx, "lastName", e.target.value)}
                      placeholder="Doe"
                      className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-amber-500 transition"
                    />
                  </div>
                </div>
              </div>
            ))}

            <div>
              <label className="block text-xs tracking-widest uppercase text-gray-500 mb-1.5 font-medium">
                Email <span className="text-red-600">*</span>
              </label>
              <input
                type="email"
                required
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="your@email.com"
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-amber-500 transition"
              />
            </div>

            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs tracking-widest uppercase text-gray-500 mb-1.5 font-medium">
                  {tr("Phone", "Téléphone", "Teléfono")} <span className="text-red-600">*</span>
                </label>
                <div className="flex">
                  <PhoneCountrySelect className="rounded-l-lg border border-gray-300 border-r-0 bg-white px-2 max-w-[110px] text-gray-900 focus:outline-none focus:border-amber-500 text-xs sm:text-sm" />
                  <input
                    type="tel"
                    required
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    placeholder={tr("Number", "Numéro", "Número")}
                    className="w-full rounded-r-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-amber-500 transition"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs tracking-widest uppercase text-gray-500 mb-1.5 font-medium">
                  {tr("Country", "Pays", "País")} <span className="text-red-600">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={form.country}
                  onChange={(e) => setForm({ ...form, country: e.target.value })}
                  placeholder="Morocco"
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-amber-500 transition"
                />
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs tracking-widest uppercase text-gray-500 mb-1.5 font-medium">
                  {tr("Arrival Date", "Date d'arrivée", "Fecha de llegada")}
                  <span className="text-gray-400 text-[10px] ml-1 normal-case">
                    ({tr("optional", "optionnel", "opcional")})
                  </span>
                </label>
                <input
                  type="date"
                  value={form.arrival}
                  min="2027-01-01"
                  max="2027-01-31"
                  onChange={(e) => setForm({ ...form, arrival: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:border-amber-500 transition"
                />
              </div>
              <div>
                <label className="block text-xs tracking-widest uppercase text-gray-500 mb-1.5 font-medium">
                  {tr("Departure Date", "Date de départ", "Fecha de salida")}
                  <span className="text-gray-400 text-[10px] ml-1 normal-case">
                    ({tr("optional", "optionnel", "opcional")})
                  </span>
                </label>
                <input
                  type="date"
                  value={form.departure}
                  min={form.arrival || "2027-01-01"}
                  max="2027-02-15"
                  onChange={(e) => setForm({ ...form, departure: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:border-amber-500 transition"
                />
              </div>
            </div>

            {/* Promo / School Code */}
            <div className="rounded-xl border border-gray-200 bg-gray-50/80 p-4 space-y-2.5">
              <div className="flex items-start gap-2.5">
                <Tag className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs font-semibold text-gray-900">
                    {tr(
                      "Performing a show with your dance school?",
                      "Vous faites un show avec votre école ?",
                      "¿Actúas en un show con tu escuela?"
                    )}
                  </p>
                  <p className="text-[11px] text-gray-600 mt-0.5 leading-snug">
                    {tr(
                      "Enter your school's confidential code to benefit from the discounted rate.",
                      "Saisissez le code confidentiel de votre école pour bénéficier du tarif réduit.",
                      "Ingresa el código confidencial de tu escuela para obtener la tarifa reducida."
                    )}
                  </p>
                </div>
              </div>
              <div className="flex gap-2 pt-1">
                <input
                  type="text"
                  value={discountInput}
                  onChange={(e) => setDiscountInput(e.target.value.toUpperCase())}
                  placeholder={tr("Confidential code", "Code confidentiel", "Código confidencial")}
                  className="flex-1 rounded-lg border border-gray-300 bg-white px-3.5 py-2.5 text-sm font-mono uppercase text-gray-900 focus:outline-none focus:border-amber-500 transition placeholder:text-gray-400"
                />
                <button
                  type="button"
                  onClick={handleApplyDiscount}
                  disabled={validatingCode || !discountInput.trim()}
                  className="px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold text-xs rounded-lg transition cursor-pointer disabled:opacity-50"
                >
                  {validatingCode ? "..." : tr("Apply", "Appliquer", "Aplicar")}
                </button>
              </div>
              {discountMsg && (
                <div
                  className={`p-2.5 rounded-lg text-xs font-medium flex items-center gap-1.5 ${
                    discountMsg.success
                      ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                      : "bg-red-50 text-red-700 border border-red-200"
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

                  <span>{discountMsg.text}</span>
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs tracking-widest uppercase text-gray-500 mb-1.5">
                {tr(
                  "Special Requests (optional)",
                  "Demandes spéciales (optionnel)",
                  "Solicitudes especiales (opcional)"
                )}
              </label>
              <textarea
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                rows={2}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:border-amber-500 transition resize-none"
              />
            </div>
          </div>

          {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

          <button
            type="submit"
            disabled={submitting || form.names.some((n) => !n.trim()) || !form.email.trim()}
            className="mt-6 w-full inline-flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-amber-500 to-amber-600 px-6 py-3.5 text-sm font-bold text-zinc-950 hover:from-amber-400 hover:to-amber-500 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shadow-lg shadow-amber-200"
          >
            {submitting ? (
              <>
                <div className="h-4 w-4 border-2 border-zinc-950/30 border-t-zinc-950 rounded-full animate-spin" />
                {tr("Sending…", "Envoi…", "Enviando…")}
              </>
            ) : (
              <>
                <CheckCircle2 className="h-4 w-4" />
                {tr("Send Booking Request", "Envoyer la demande", "Enviar solicitud")}
              </>
            )}
          </button>
          <p className="mt-3 text-center text-[11px] text-gray-400">
            {tr(
              "No payment now — we respond within 24 hours with confirmation and payment details.",
              "Aucun paiement maintenant — réponse sous 24 heures avec confirmation et détails de paiement.",
              "Sin pago ahora — respondemos en 24 horas con la confirmación y los detalles de pago."
            )}
          </p>
        </form>
      </Shell>
    );
  }

  // ── Step 1: choose a pack ──
  return (
    <Shell>
      <div className="text-center mb-8">
        <h1 className="font-display text-3xl md:text-4xl text-gray-900 tracking-wide">
          {tr("Choose Your Pack", "Choisissez votre pack", "Elige tu pack")}
        </h1>
        <p className="mt-3 text-sm text-gray-600 max-w-md mx-auto">
          {tr(
            "Choose the pack that best suits your needs. Once your booking is completed, you will automatically receive a confirmation email with the status 'Pending'.",
            "Choisissez le pack le plus adapté à vos besoins. Une fois votre réservation effectuée, vous recevrez automatiquement un e-mail de confirmation avec le statut « En attente ».",
            "Elige el paquete que mejor se adapte a tus necesidades. Una vez realizada tu reserva, recibirás automáticamente un correo electrónico de confirmación con el estado «Pendiente»."
          )}
        </p>
      </div>

      {/* PROMO / DISCOUNT CODE BAR ON STEP 1 */}
      <div className="max-w-md mx-auto mb-8 rounded-xl border border-amber-200 bg-white p-4 shadow-sm">
        <div className="flex items-center gap-2 mb-2">
          <Tag className="h-4 w-4 text-amber-500" />
          <span className="text-xs font-bold tracking-widest uppercase text-gray-700">
            {tr("Have a Discount Code?", "Code Promo / Réduction ?", "¿Tienes un código de descuento?")}
          </span>
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            value={discountInput}
            onChange={(e) => setDiscountInput(e.target.value.toUpperCase())}
            placeholder="e.g. VIP50"
            className="flex-1 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-mono uppercase text-gray-900 focus:outline-none focus:border-amber-500 transition"
          />
          <button
            type="button"
            onClick={handleApplyDiscount}
            disabled={validatingCode || !discountInput.trim()}
            className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold text-xs rounded-lg transition cursor-pointer disabled:opacity-50"
          >
            {validatingCode ? "..." : tr("Apply", "Appliquer", "Aplicar")}
          </button>
        </div>
        {discountMsg && (
          <div
            className={`mt-2 p-2.5 rounded-lg text-xs font-medium flex items-center justify-between gap-2 ${
              discountMsg.success
                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                : "bg-red-50 text-red-700 border border-red-200"
            }`}
          >
            <div className="flex items-center gap-1.5">
              {discountMsg.success ? (
                <Check className="h-3.5 w-3.5 shrink-0 text-emerald-600" />
              ) : (
                <AlertCircle className="h-3.5 w-3.5 shrink-0 text-red-600" />
              )}
              <span>{discountMsg.text}</span>
            </div>
            {discountMsg.success && (
              <button
                type="button"
                onClick={handleClearDiscount}
                className="text-[11px] text-gray-500 hover:text-gray-700 underline shrink-0 cursor-pointer"
              >
                {tr("Remove", "Effacer", "Quitar")}
              </button>
            )}
          </div>
        )}
      </div>

      {packs.length === 0 ? (
        <p className="text-center text-sm text-gray-400 py-16">{tr("Loading…", "Chargement…", "Cargando…")}</p>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 max-w-5xl mx-auto">
          {packs.map((p) => {
            const unit = priceUnitLabel(p, L);
            const baseP = parseInt(p.price, 10) || 0;
            const discAmt = appliedDiscount
              ? calculateDiscountAmount(appliedDiscount, baseP)
              : 0;
            const finalP = Math.max(0, baseP - discAmt);
            const hasDiscount = discAmt > 0;

            return (
              <button
                key={p.id}
                onClick={() => choosePack(p)}
                className={`relative text-left rounded-2xl p-5 border transition-all duration-300 cursor-pointer hover:-translate-y-1 ${
                  p.popular
                    ? "border-amber-500/60 bg-gradient-to-b from-amber-50 to-transparent shadow-lg shadow-amber-50"
                    : "border-gray-300 bg-white/60 hover:border-amber-300"
                }`}
              >
                {p.popular && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 inline-flex items-center gap-1 bg-amber-500 text-zinc-950 text-[9px] font-black tracking-widest uppercase px-3 py-1 rounded-full">
                    <Star className="h-2.5 w-2.5" />
                    {tr("Popular", "Populaire", "Popular")}
                  </span>
                )}

                {/* RED DISCOUNT GRAPHIC BADGE */}
                {hasDiscount && (
                  <span className="absolute top-3 right-3 inline-flex items-center gap-1 bg-gradient-to-r from-red-600 to-rose-600 text-white text-[10px] font-black tracking-wider uppercase px-2.5 py-1 rounded-full shadow-md animate-pulse">
                    <Tag className="h-3 w-3" />
                    -{appliedDiscount?.discountType === "percent"
                      ? `${appliedDiscount.discountAmount}%`
                      : `€${discAmt}`}
                  </span>
                )}

                <p className="font-display text-lg text-gray-900">
                  {translateDynamicText(p.name, L)}
                </p>
                <p className="text-[10px] text-gray-500 uppercase tracking-widest mt-0.5">
                  {translateDynamicText(p.sub, L)}
                </p>

                {/* PRICE DISPLAY WITH RED DISCOUNT GRAPHICS */}
                {hasDiscount ? (
                  <div className="mt-3">
                    <div className="flex items-center gap-1.5 text-xs text-gray-400">
                      <span className="line-through">
                        {p.price} {p.currency || "€"}
                      </span>
                      <span className="text-[10px] font-bold text-red-700 bg-red-100 px-1.5 py-0.5 rounded uppercase">
                        {tr("Save", "Économisez", "Ahorra")} €{discAmt}
                      </span>
                    </div>
                    <p className="font-display text-3xl text-amber-600 font-bold">
                      {finalP}
                      <span className="text-xs text-gray-500 ml-1">
                        {p.currency || "€"}
                        {unit ? ` / ${unit}` : ""}
                      </span>
                    </p>
                  </div>
                ) : (
                  <p className="mt-3 font-display text-3xl text-amber-600">
                    {p.price}
                    <span className="text-xs text-gray-500 ml-1">
                      {p.currency || "€"}
                      {unit ? ` / ${unit}` : ""}
                    </span>
                  </p>
                )}

                <ul className="mt-3 space-y-1">
                  {p.features.slice(0, 4).map((f, fi) => (
                    <li key={fi} className="flex items-start gap-1.5 text-[11px] text-gray-600">
                      <Check className="h-3 w-3 text-amber-500/70 mt-0.5 shrink-0" />
                      {translateDynamicText(f, L)}
                    </li>
                  ))}
                </ul>
                <span className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold text-amber-600">
                  <Ticket className="h-3.5 w-3.5" />
                  {tr("Choose this pack →", "Choisir ce pack →", "Elegir este pack →")}
                  {hasDiscount ? ` (${tr("Save", "Économisez", "Ahorra")} €${discAmt})` : ""}
                </span>
              </button>
            );
          })}
        </div>
      )}

      <TrackReservation tr={tr} />
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="min-h-screen bg-slate-100"
      style={{ fontFamily: "'Poppins','Segoe UI',system-ui,sans-serif" }}
    >
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap');`}</style>
      {/* Banner — swap for a custom image anytime */}
      <div className="w-full bg-[#13234d] bg-gradient-to-r from-[#0d1a3d] via-[#13234d] to-[#1d3a7a] py-8 px-6 text-center shadow-md">
        <p className="text-amber-400 text-xs tracking-[0.4em] uppercase">
          Tangier International
        </p>
        <h1 className="mt-1 text-white text-3xl font-bold tracking-wide">LATIN FESTIVAL</h1>
        <p className="mt-2 text-slate-300 text-sm flex items-center justify-center gap-2">
          <Calendar className="h-3.5 w-3.5 text-amber-400/80" />
          January 07–11, 2027
          <span className="text-slate-500">·</span>
          <MapPin className="h-3.5 w-3.5 text-amber-400/80" />
          Kenzi Solazur Hotel, Tangier
        </p>
      </div>
      <div className="max-w-5xl mx-auto px-4 py-10">{children}</div>
    </div>
  );
}

/** Small "track your reservation" box shown under the pack list. */
function TrackReservation({ tr }: { tr: (en: string, fr: string, es: string) => string }) {
  const [code, setCode] = useState("");
  return (
    <div className="mt-12 max-w-md mx-auto rounded-xl border border-gray-200 bg-white shadow-sm p-5 text-center">
      <p className="text-sm font-semibold text-gray-800">
        {tr(
          "Already booked? Track your reservation",
          "Déjà réservé ? Suivez votre réservation",
          "¿Ya reservaste? Sigue tu reserva"
        )}
      </p>
      <p className="mt-1 text-xs text-gray-500">
        {tr(
          "Enter the reservation number from your confirmation email (TLF-…).",
          "Entrez le numéro de réservation de votre email de confirmation (TLF-…).",
          "Introduce el número de reserva de tu correo de confirmación (TLF-…)."
        )}
      </p>
      <form
        className="mt-3 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          const c = code.trim().toUpperCase();
          if (c) window.location.href = `/ticket?code=${encodeURIComponent(c)}`;
        }}
      >
        <input
          type="text"
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          placeholder="TLF-XXXXXXXX"
          className="flex-1 rounded-md border border-gray-300 bg-white px-3 py-2.5 text-sm font-mono text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition"
        />
        <button
          type="submit"
          className="rounded-md bg-[#13234d] hover:bg-[#1d3a7a] text-white px-5 py-2.5 text-sm font-semibold transition cursor-pointer"
        >
          {tr("Track", "Suivre", "Seguir")}
        </button>
      </form>
    </div>
  );
}
