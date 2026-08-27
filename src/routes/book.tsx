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
  Bus,
  Plane,
  Ship,
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
  isDiscountApplicableToPack,
  calculateTransferCost,
  formatTransferOptionLabel,
  packGuestCount,
  packLabel,
  ticketUrl,
  type Pack,
  type Booking,
  type DiscountCode,
  type TransferType,
  type TransferOption,
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

const EUR_TO_MAD = 11;

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

  // Shuttle Transfer State
  const [needsTransfer, setNeedsTransfer] = useState(false);
  const [transferType, setTransferType] = useState<TransferType>("port");
  const [transferOption, setTransferOption] = useState<TransferOption>("round_trip");
  const [transferLocation, setTransferLocation] = useState<string>("Port of Tangier (Tanger Ville)");
  const [selectedTransferGuests, setSelectedTransferGuests] = useState<number[]>([0, 1]);
  const [departureAirport, setDepartureAirport] = useState("");
  const [transportCompany, setTransportCompany] = useState("");
  const [arrivalTime, setArrivalTime] = useState("");
  const [departureTime, setDepartureTime] = useState("");
  const [transferDetails, setTransferDetails] = useState("");

  // Discount code state
  const [discountInput, setDiscountInput] = useState("");
  const [appliedDiscount, setAppliedDiscount] = useState<DiscountCode | null>(null);
  const [discountAmount, setDiscountAmount] = useState(0);
  const [discountMsg, setDiscountMsg] = useState<{ success: boolean; text: string } | null>(null);
  const [validatingCode, setValidatingCode] = useState(false);

  const [form, setForm] = useState({
    guests: [{ firstName: "", lastName: "" }],
    email: "",
    phone: "",
    country: "",
    arrival: "2027-01-07",
    departure: "2027-01-11",
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
              const count = packGuestCount(p);
              setForm((f) => ({
                ...f,
                guests: Array.from({ length: count }, () => ({ firstName: "", lastName: "" })),
              }));
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
        if (c?.language) {
          localStorage.setItem("tlf_lang", c.language);
          params.set("lang", c.language);
          window.location.replace(`${window.location.pathname}?${params.toString()}`);
        }
      })
      .catch(() => {});
  }, []);

  // Recalculate discount whenever selected pack changes
  useEffect(() => {
    if (selected && appliedDiscount) {
      if (!isDiscountApplicableToPack(appliedDiscount, selected.id)) {
        setDiscountAmount(0);
      } else {
        const count = getGuestCount(selected);
        const singleP = parseInt(selected.price, 10) || 0;
        const totalP = singleP * count;
        const cur = selected.currency || "€";
        const amt = calculateDiscountAmount(appliedDiscount, totalP, count, singleP, cur, selected.id);
        setDiscountAmount(amt);
      }
    }
  }, [selected, appliedDiscount]);

  // Automatically check ?discount= URL param or sessionStorage if present
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const discParam = params.get("discount") || sessionStorage.getItem("tlf_discount_code");
    if (discParam) {
      const code = discParam.trim().toUpperCase();
      setDiscountInput(code);
      validateDiscountCode(code, 0).then((res) => {
        if (res.valid && res.discount) {
          setAppliedDiscount(res.discount);
          sessionStorage.setItem("tlf_discount_code", res.discount.code);
          setDiscountMsg({
            success: true,
            text: tr(
              `Discount code "${res.discount.code}" active! Select your pack below.`,
              `Code promo "${res.discount.code}" actif ! Choisissez votre pack ci-dessous.`,
              `¡Código "${res.discount.code}" activo! Elige tu paquete a continuación.`
            ),
          });
        }
      });
    }
  }, []);

  const handleApplyDiscount = async () => {
    if (!discountInput.trim()) return;
    setValidatingCode(true);
    setDiscountMsg(null);
    const count = selected ? getGuestCount(selected) : 1;
    const singleP = selected ? (parseInt(selected.price, 10) || 0) : 0;
    const totalP = singleP * count;
    const cur = selected?.currency || "€";
    const result = await validateDiscountCode(discountInput, totalP, selected?.id, count, singleP, cur);
    if (result.valid && result.discount) {
      setAppliedDiscount(result.discount);
      const isMad = /mad|dh/i.test(cur);
      const madAmt = result.discount.discountAmount * EUR_TO_MAD;
      const scopeText =
        result.discount.applyScope === "fixed_price"
          ? `Special rate: ${isMad ? `${(result.discount.overridePrice ?? 0) * EUR_TO_MAD} MAD` : `€${result.discount.overridePrice ?? 0}`}`
          : result.discount.applyScope === "per_person"
          ? `${isMad ? `-${madAmt} MAD (-€${result.discount.discountAmount})` : `-€${result.discount.discountAmount}`}/person`
          : result.discount.discountType === "percent"
          ? `-${result.discount.discountAmount}%`
          : `${isMad ? `-${madAmt} MAD (-€${result.discount.discountAmount})` : `-€${result.discountAmount}`}`;

      if (selected && result.discountAmount != null) {
        setDiscountAmount(result.discountAmount);
      }

      setDiscountMsg({
        success: true,
        text: selected
          ? tr(
              `Discount code "${result.discount.code}" applied (${scopeText})!`,
              `Code promo "${result.discount.code}" appliqué (${scopeText}) !`,
              `¡Código "${result.discount.code}" aplicado (${scopeText})!`
            )
          : tr(
              `Discount code "${result.discount.code}" active! Select your pack below.`,
              `Code promo "${result.discount.code}" actif ! Choisissez votre pack ci-dessous.`,
              `¡Código "${result.discount.code}" activo! Elige tu paquete a continuación.`
            ),
      });

      if (typeof window !== "undefined") {
        sessionStorage.setItem("tlf_discount_code", result.discount.code);
      }
    } else {
      setAppliedDiscount(null);
      setDiscountAmount(0);
      if (typeof window !== "undefined") {
        sessionStorage.removeItem("tlf_discount_code");
      }
      setDiscountMsg({
        success: false,
        text: result.error || tr("Invalid discount code", "Code promo invalide", "Código no válido"),
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

  const getGuestCount = (p: Pack) => packGuestCount(p);

  const choosePack = (p: Pack) => {
    setSelected(p);
    const count = packGuestCount(p);
    setSelectedTransferGuests(Array.from({ length: count }, (_, i) => i));
    setForm((f) => ({
      ...f,
      guests: Array.from({ length: count }, () => ({ firstName: "", lastName: "" })),
    }));
    if (appliedDiscount) {
      if (!isDiscountApplicableToPack(appliedDiscount, p.id)) {
        setDiscountAmount(0);
      } else {
        const singleP = parseInt(p.price, 10) || 0;
        const totalP = singleP * count;
        const cur = p.currency || "€";
        setDiscountAmount(calculateDiscountAmount(appliedDiscount, totalP, count, singleP, cur, p.id));
      }
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
      !form.phone.trim() ||
      !form.arrival.trim() ||
      !form.departure.trim()
    )
      return;

    if (needsTransfer) {
      const missingTimes =
        transferOption === "round_trip"
          ? !arrivalTime.trim() || !departureTime.trim()
          : transferOption === "one_way_arrival"
          ? !arrivalTime.trim()
          : !departureTime.trim();

      if (!departureAirport.trim() || !transportCompany.trim() || missingTimes) {
        setError(
          tr(
            "Please fill in departure airport/port, company, and required times for your transfer.",
            "Veuillez renseigner l'aéroport/port de départ, la compagnie et les horaires requis pour le transfert.",
            "Por favor complete el aeropuerto/puerto de salida, la compañía y los horarios requeridos para el traslado."
          )
        );
        return;
      }
    }

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
    const isApplicable = isDiscountApplicableToPack(appliedDiscount, selected.id);
    const finalDiscount = isApplicable ? appliedDiscount : null;
    const finalDiscountAmt = isApplicable ? discountAmount : 0;
    const transferPassengersCount = (selected && getGuestCount(selected) > 1) ? selectedTransferGuests.length : 1;
    const transferCost = needsTransfer
      ? calculateTransferCost(transferType, transferOption, transferPassengersCount, transferLocation)
      : 0;

    const selectedGuestsLabel =
      form.guests.length > 1
        ? selectedTransferGuests
            .map((idx) => (form.guests[idx]?.firstName ? `${form.guests[idx].firstName} ${form.guests[idx].lastName}` : `Participant ${idx + 1}`))
            .join(", ")
        : customerName || "Participant 1";

    try {
      created = await addBooking({
        packId: selected.id,
        packName: packLabel(selected),
        customerName,
        email: form.email,
        phone: form.phone,
        country: form.country,
        company: transportCompany.trim() || null,
        numPeople: form.guests.length > 0 ? form.guests.length : (getGuestCount(selected) || 1),
        danceLevel: "",
        notes: form.notes,
        arrivalDate: form.arrival || null,
        arrivalTime: arrivalTime.trim() || null,
        departureDate: form.departure || null,
        departureTime: departureTime.trim() || null,
        lang,
        status: "pending",
        source: collaborator ? "referral" : "website",
        collaboratorId: collaborator?.id ?? null,
        discountCode: finalDiscount?.code ?? null,
        discountAmount: finalDiscountAmt,
        discountCodeId: finalDiscount?.id ?? null,
        needsTransfer,
        transferType: needsTransfer ? transferType : null,
        transferOption: needsTransfer ? transferOption : null,
        transferLocation: needsTransfer ? transferLocation : null,
        departureAirport: needsTransfer ? (departureAirport.trim() || null) : null,
        transferDetails: needsTransfer
          ? [
              form.guests.length > 1 ? `Transfer Passengers: ${selectedGuestsLabel}` : "",
              departureAirport ? `Departure ${transferType === "airport" ? "Airport" : "Port"}: ${departureAirport}` : "",
              transportCompany ? `Company: ${transportCompany}` : "",
              arrivalTime ? `Arrival Time: ${arrivalTime}` : "",
              departureTime ? `Departure Time: ${departureTime}` : "",
              transferDetails ? `Flight/Ferry: ${transferDetails}` : "",
            ]
              .filter(Boolean)
              .join(" | ") || null
          : null,
        transferCost: needsTransfer ? transferCost : 0,
      });

    } catch (dbErr) {
      console.warn("Could not record booking:", dbErr);
    }

    try {
      const transferSummary = needsTransfer
        ? `${transferType === "port" ? "Port" : "Airport"} (${transferLocation}) - ${formatTransferOptionLabel(transferOption, lang)} - €${transferCost}${departureAirport ? ` - Origin: ${departureAirport}` : ""}${transportCompany ? ` - Company: ${transportCompany}` : ""}${arrivalTime ? ` - Arr Time: ${arrivalTime}` : ""}${departureTime ? ` - Dep Time: ${departureTime}` : ""}${transferDetails ? ` - Details: ${transferDetails}` : ""}`
        : "No transfer";

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
          Arrival: `${form.arrival}${arrivalTime ? " " + arrivalTime : ""}`,
          Departure: `${form.departure}${departureTime ? " " + departureTime : ""}`,
          shuttleTransfer: transferSummary,
          ticketCode: created?.ticketCode ?? "",
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
          <p className="mt-5 text-sm text-gray-600 leading-relaxed font-medium">
            {tr(
              "Please check your email box to track your booking. Our team will respond within 48 hours to confirm your booking.",
              "Veuillez consulter votre boîte e-mail pour suivre votre réservation. Notre équipe vous répondra sous 48 heures pour confirmer votre réservation.",
              "Por favor revise su bandeja de entrada de correo electrónico para realizar el seguimiento de su reserva. Nuestro equipo le responderá en un plazo de 48 horas para confirmar su reserva."
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
    const singlePrice = parseInt(selected.price, 10) || 0;
    const totalBasePrice = singlePrice * guestCount;
    const currency = selected.currency || "€";
    const transferPassengersCount = guestCount > 1 ? selectedTransferGuests.length : 1;
    const transferCost = needsTransfer
      ? calculateTransferCost(transferType, transferOption, transferPassengersCount, transferLocation)
      : 0;
    const finalTotalPrice = Math.max(0, totalBasePrice - discountAmount) + transferCost;

    return (
      <Shell>
        <button
          onClick={() => setSelected(null)}
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition cursor-pointer mb-6"
        >
          <ChevronLeft className="h-4 w-4" />
          {tr("Choose another pack", "Choisir un autre pack", "Elegir otro pack")}
        </button>

        {/* Selected pack summary & pricing breakdown */}
        <div className="rounded-2xl border border-amber-200 bg-amber-50/80 p-5 mb-6 max-w-lg mx-auto shadow-sm space-y-3">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="font-display text-lg text-gray-900 font-bold">
                {translateDynamicText(selected.name, L)}
              </h2>
              <p className="text-xs text-gray-500">{translateDynamicText(selected.sub, L)}</p>
            </div>
            <div className="text-right">
              <span className="text-xs font-semibold text-amber-600 block">
                {singlePrice > 0 ? `${singlePrice} ${currency} / ${L === "fr" ? "pers." : L === "es" ? "pers." : "person"}` : selected.price}
              </span>
            </div>
          </div>

          {/* Detailed Per-Person & Total Breakdown */}
          <div className="pt-3 border-t border-amber-200/80 space-y-1.5 text-xs text-gray-700 font-medium">
            <div className="flex justify-between items-center text-gray-600">
              <span>{L === "fr" ? "Prix par personne :" : L === "es" ? "Precio por persona:" : "Price per person:"}</span>
              <span className="font-semibold text-gray-900">{singlePrice} {currency}</span>
            </div>

            {guestCount > 1 && (
              <div className="space-y-1 py-1">
                {Array.from({ length: guestCount }).map((_, idx) => (
                  <div key={idx} className="flex justify-between items-center text-gray-600 pl-2 border-l-2 border-amber-400">
                    <span>{L === "fr" ? `Participant ${idx + 1}` : L === "es" ? `Participante ${idx + 1}` : `Participant ${idx + 1}`}</span>
                    <span>{singlePrice} {currency}</span>
                  </div>
                ))}
              </div>
            )}

            {discountAmount > 0 && (
              <div className="flex justify-between items-center text-emerald-700 font-semibold">
                <span>{L === "fr" ? "Réduction appliquée :" : L === "es" ? "Descuento aplicado:" : "Discount applied:"}</span>
                <span>-{appliedDiscount?.discountType === "percent" ? `${appliedDiscount.discountAmount}%` : `${discountAmount} ${currency}`}</span>
              </div>
            )}

            {needsTransfer && transferCost > 0 && (
              <div className="flex justify-between items-center text-blue-700 font-semibold">
                <span>
                  {tr(
                    `Shuttle Transfer (${transferType === "port" ? "Port" : "Airport"} · ${formatTransferOptionLabel(transferOption, L)}):`,
                    `Navette (${transferType === "port" ? "Port" : "Aéroport"} · ${formatTransferOptionLabel(transferOption, L)}) :`,
                    `Traslado (${transferType === "port" ? "Puerto" : "Aeropuerto"} · ${formatTransferOptionLabel(transferOption, L)}):`
                  )}
                </span>
                <span>+{transferCost} {currency}</span>
              </div>
            )}

            <div className="flex justify-between items-center pt-2 border-t border-amber-300 font-bold text-sm text-gray-900">
              <span>
                {guestCount > 1
                  ? (L === "fr" ? `Montant Total (${guestCount} personnes)` : L === "es" ? `Monto Total (${guestCount} personas)` : `Total Amount (${guestCount} guests)`)
                  : (L === "fr" ? "Montant Total" : L === "es" ? "Monto Total" : "Total Amount")}
              </span>
              <span className="font-extrabold text-lg text-amber-600">
                {finalTotalPrice} {currency}
              </span>
            </div>
          </div>
        </div>


        <form
          onSubmit={handleSubmit}
          className="rounded-2xl border border-gray-200 bg-white shadow-sm p-4 sm:p-6 max-w-lg mx-auto"
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
                    {tr("Participant", "Participant", "Participante")} {idx + 1}
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
                  {tr("Arrival Date", "Date d'arrivée", "Fecha de llegada")}{" "}
                  <span className="text-red-600">*</span>
                </label>
                <input
                  type="date"
                  required
                  value={form.arrival}
                  min="2027-01-01"
                  max="2027-01-30"
                  onFocus={() => {
                    if (!form.arrival) setForm((f) => ({ ...f, arrival: "2027-01-01" }));
                  }}
                  onChange={(e) => setForm({ ...form, arrival: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:border-amber-500 transition"
                />
              </div>
              <div>
                <label className="block text-xs tracking-widest uppercase text-gray-500 mb-1.5 font-medium">
                  {tr("Departure Date", "Date de départ", "Fecha de salida")}{" "}
                  <span className="text-red-600">*</span>
                </label>
                <input
                  type="date"
                  required
                  value={form.departure}
                  min={form.arrival || "2027-01-01"}
                  max="2027-01-30"
                  onFocus={() => {
                    if (!form.departure) setForm((f) => ({ ...f, departure: form.arrival || "2027-01-11" }));
                  }}
                  onChange={(e) => setForm({ ...form, departure: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:border-amber-500 transition"
                />
              </div>
            </div>

            {/* Shuttle Transfer Section */}
            <div className="rounded-2xl border border-blue-200 bg-gradient-to-br from-blue-50/80 to-indigo-50/40 p-4 space-y-3.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-7 w-7 rounded-lg bg-blue-600 text-white grid place-items-center shadow-xs">
                    <Bus className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-blue-950">
                      {tr("Shuttle Transfer", "Navette & Transfert", "Traslado y Transporte")}
                    </p>
                    <p className="text-[11px] text-blue-700 font-medium">
                      {tr(
                        "Transfer to/from port or airport to hotel",
                        "Transfert depuis/vers le port ou l'aéroport",
                        "Traslado desde/hacia el puerto o aeropuerto"
                      )}
                    </p>
                  </div>
                </div>

                {/* Yes / No Toggle buttons */}
                <div className="flex items-center bg-white border border-blue-200 p-0.5 rounded-xl shadow-2xs">
                  <button
                    type="button"
                    onClick={() => setNeedsTransfer(false)}
                    className={`px-3 py-1 text-xs font-bold rounded-lg transition cursor-pointer ${
                      !needsTransfer
                        ? "bg-gray-100 text-gray-800"
                        : "text-gray-500 hover:text-gray-900"
                    }`}
                  >
                    {tr("No", "Non", "No")}
                  </button>
                  <button
                    type="button"
                    onClick={() => setNeedsTransfer(true)}
                    className={`px-3 py-1 text-xs font-bold rounded-lg transition cursor-pointer ${
                      needsTransfer
                        ? "bg-blue-600 text-white shadow-xs"
                        : "text-blue-700 hover:text-blue-950"
                    }`}
                  >
                    {tr("Yes", "Oui", "Sí")}
                  </button>
                </div>
              </div>

              {needsTransfer && (
                <div className="space-y-3 pt-2 border-t border-blue-200/60 animate-in fade-in slide-in-from-top-2 duration-200">
                  {/* Step 1: Transfer Type (Port vs Airport) */}
                  <div className="grid grid-cols-2 gap-2.5">
                    {/* Port Option */}
                    <button
                      type="button"
                      onClick={() => {
                        setTransferType("port");
                        setTransferLocation("Port of Tangier (Tanger Ville)");
                      }}
                      className={`p-3 rounded-xl border text-left transition cursor-pointer flex items-center justify-between ${
                        transferType === "port"
                          ? "border-blue-500 bg-white shadow-xs ring-2 ring-blue-500/20"
                          : "border-blue-200/80 bg-white/70 hover:bg-white text-gray-700"
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <Ship className={`h-4 w-4 ${transferType === "port" ? "text-blue-600" : "text-gray-500"}`} />
                        <span className="text-xs font-bold text-gray-900">
                          {tr("Tangier Port", "Port de Tanger", "Puerto de Tánger")}
                        </span>
                      </div>
                      {transferType === "port" && (
                        <Check className="h-4 w-4 text-blue-600 shrink-0" />
                      )}
                    </button>

                    {/* Airport Option */}
                    <button
                      type="button"
                      onClick={() => {
                        setTransferType("airport");
                        setTransferLocation("Tangier Ibn Battouta Airport (TNG)");
                      }}
                      className={`p-3 rounded-xl border text-left transition cursor-pointer flex items-center justify-between ${
                        transferType === "airport"
                          ? "border-blue-500 bg-white shadow-xs ring-2 ring-blue-500/20"
                          : "border-blue-200/80 bg-white/70 hover:bg-white text-gray-700"
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <Plane className={`h-4 w-4 ${transferType === "airport" ? "text-blue-600" : "text-gray-500"}`} />
                        <span className="text-xs font-bold text-gray-900">
                          {tr("Airport", "Aéroport", "Aeropuerto")}
                        </span>
                      </div>
                      {transferType === "airport" && (
                        <Check className="h-4 w-4 text-blue-600 shrink-0" />
                      )}
                    </button>
                  </div>

                  {/* Step 2: Specific Location & Direction */}
                  <div className="grid sm:grid-cols-2 gap-2.5">
                    <div>
                      <label className="text-[11px] font-bold uppercase tracking-wider text-gray-700 block mb-1">
                        {tr("Pickup/Dropoff Hub", "Lieu précis", "Ubicación")}
                      </label>
                      <select
                        value={transferLocation}
                        onChange={(e) => setTransferLocation(e.target.value)}
                        className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-xs font-medium text-gray-900 focus:outline-none focus:border-blue-500 cursor-pointer"
                      >
                        {transferType === "port" ? (
                          <option value="Port of Tangier (Tanger Ville)">
                            {tr("Port of Tangier (Tanger Ville)", "Port de Tanger Ville", "Puerto de Tánger Ciudad")}
                          </option>
                        ) : (
                          <>
                            <option value="Tangier Ibn Battouta Airport (TNG)">
                              {tr("Tangier Ibn Battouta Airport (TNG)", "Aéroport Tanger Ibn Battouta (TNG)", "Aeropuerto Tánger Ibn Battouta (TNG)")}
                            </option>
                            <option value="Tetouan Sania Ramel Airport (TTU)">
                              {tr("Tetouan Sania Ramel Airport (TTU)", "Aéroport Tétouan Sania Ramel (TTU)", "Aeropuerto Tetuán Sania Ramel (TTU)")}
                            </option>
                          </>
                        )}
                      </select>
                    </div>

                    <div>
                      <label className="text-[11px] font-bold uppercase tracking-wider text-gray-700 block mb-1">
                        {tr("Transfer Direction", "Formule de trajet", "Tipo de trayecto")}
                      </label>
                      <select
                        value={transferOption}
                        onChange={(e) => setTransferOption(e.target.value as TransferOption)}
                        className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-xs font-medium text-gray-900 focus:outline-none focus:border-blue-500 cursor-pointer"
                      >
                        <option value="round_trip">
                          {tr("Round Trip (Arrival & Return)", "Aller-Retour (A/R)", "Ida y Vuelta")}
                        </option>
                        <option value="one_way_arrival">
                          {tr("One-Way (Arrival only)", "Aller simple (Arrivée)", "Solo ida (Llegada)")}
                        </option>
                        <option value="one_way_departure">
                          {tr("One-Way (Return only)", "Retour simple (Départ)", "Solo vuelta (Salida)")}
                        </option>
                      </select>
                    </div>
                  </div>

                  {/* Participant Selection for Transfer (if multiple guests) */}
                  {guestCount > 1 && (
                    <div className="space-y-1.5 pt-1">
                      <label className="text-[11px] font-bold text-blue-950 block">
                        {tr(
                          "Select participants included in transfer:",
                          "Sélectionnez les participants pour le transfert :",
                          "Seleccione los participantes para el traslado:"
                        )}
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        {Array.from({ length: guestCount }).map((_, gIdx) => {
                          const isSelected = selectedTransferGuests.includes(gIdx);
                          return (
                            <button
                              key={gIdx}
                              type="button"
                              onClick={() => {
                                setSelectedTransferGuests((prev) => {
                                  if (prev.includes(gIdx)) {
                                    if (prev.length === 1) return prev;
                                    return prev.filter((i) => i !== gIdx);
                                  } else {
                                    return [...prev, gIdx].sort();
                                  }
                                });
                              }}
                              className={`px-3 py-2 rounded-xl text-xs font-bold border flex items-center justify-between transition cursor-pointer ${
                                isSelected
                                  ? "bg-blue-600 text-white border-blue-600 shadow-xs"
                                  : "bg-white text-gray-700 border-gray-300 hover:border-blue-300"
                              }`}
                            >
                              <span>
                                {tr("Participant", "Participant", "Participante")} {gIdx + 1}
                              </span>
                              <div
                                className={`h-4 w-4 rounded-md border flex items-center justify-center ${
                                  isSelected ? "bg-white text-blue-600 border-white" : "border-gray-300"
                                }`}
                              >
                                {isSelected && <Check className="h-3 w-3" />}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Departure Airport / Port (Mandatory) */}
                  <div>
                    <label className="text-[11px] font-bold text-gray-800 block mb-1">
                      {transferType === "airport"
                        ? tr(
                            "Departure Airport (Required) *",
                            "Aéroport de départ (Obligatoire) *",
                            "Aeropuerto de salida (Obligatorio) *"
                          )
                        : tr(
                            "Departure Port (Required) *",
                            "Port de départ (Obligatoire) *",
                            "Puerto de salida (Obligatorio) *"
                          )}
                    </label>
                    <input
                      type="text"
                      required={needsTransfer}
                      value={departureAirport}
                      onChange={(e) => setDepartureAirport(e.target.value)}
                      placeholder={
                        transferType === "airport"
                          ? tr("Ex: Paris CDG / Orly, Madrid, Brussels, London...", "Ex: Paris Orly (ORY), CDG, Madrid, Bruxelles, London...", "Ej: Madrid Barajas, Barcelona, Paris...")
                          : tr("Ex: Tarifa, Algeciras, Barcelona...", "Ex: Tarifa, Algésiras, Barcelone...", "Ej: Tarifa, Algeciras, Barcelona...")
                      }
                      className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-xs text-gray-900 focus:outline-none focus:border-blue-500 placeholder:text-gray-400"
                    />
                  </div>

                  {/* Transport Company (Airline / Ferry) */}
                  <div>
                    <label className="text-[11px] font-bold text-gray-800 block mb-1">
                      {tr(
                        "Airline / Ferry Company (Required) *",
                        "Compagnie aérienne / Ferry (Obligatoire) *",
                        "Aerolínea / Compañía de ferry (Obligatorio) *"
                      )}
                    </label>
                    <input
                      type="text"
                      required={needsTransfer}
                      value={transportCompany}
                      onChange={(e) => setTransportCompany(e.target.value)}
                      placeholder={
                        transferType === "airport"
                          ? tr("Ex: Ryanair, Royal Air Maroc, Air Arabia...", "Ex: Ryanair, Royal Air Maroc, Air Arabia...", "Ej: Ryanair, Iberia, Royal Air Maroc...")
                          : tr("Ex: FRS Ferries, Balearia, AML...", "Ex: FRS Ferries, Balearia, AML...", "Ej: FRS Ferries, Balearia, AML...")
                      }
                      className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-xs text-gray-900 focus:outline-none focus:border-blue-500 placeholder:text-gray-400"
                    />
                  </div>

                  {/* Arrival & Departure Time Inputs (Both Mandatory) */}
                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <label className="text-[11px] font-bold text-gray-800 block mb-1">
                        {transferOption === "one_way_departure"
                          ? tr("Arrival Time (Optional)", "Heure d'arrivée (Optionnel)", "Hora de llegada (Opcional)")
                          : tr("Arrival Time (Required) *", "Heure d'arrivée (Obligatoire) *", "Hora de llegada (Obligatorio) *")}
                      </label>
                      <input
                        type="time"
                        required={needsTransfer && transferOption !== "one_way_departure"}
                        value={arrivalTime}
                        onChange={(e) => setArrivalTime(e.target.value)}
                        className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-xs text-gray-900 focus:outline-none focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-gray-800 block mb-1">
                        {transferOption === "one_way_arrival"
                          ? tr("Departure Time (Optional)", "Heure de départ (Optionnel)", "Hora de salida (Opcional)")
                          : tr("Departure Time (Required) *", "Heure de départ (Obligatoire) *", "Hora de salida (Obligatorio) *")}
                      </label>
                      <input
                        type="time"
                        required={needsTransfer && transferOption !== "one_way_arrival"}
                        value={departureTime}
                        onChange={(e) => setDepartureTime(e.target.value)}
                        className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-xs text-gray-900 focus:outline-none focus:border-blue-500"
                      />
                    </div>
                  </div>

                  {/* Flight/Boat Details Input */}
                  <div>
                    <label className="text-[11px] font-semibold text-gray-700 block mb-1">
                      {tr(
                        "Flight / Ferry # (Optional)",
                        "N° de vol / ferry (Optionnel)",
                        "N° de vuelo / ferry (Opcional)"
                      )}
                    </label>
                    <input
                      type="text"
                      value={transferDetails}
                      onChange={(e) => setTransferDetails(e.target.value)}
                      placeholder={
                        transferType === "airport"
                          ? tr("Ex: Flight AT123", "Ex: Vol AT123", "Ej: Vuelo AT123")
                          : tr("Ex: Ferry Tanger-Tarifa", "Ex: Ferry Tanger-Tarifa", "Ej: Ferry Tanger-Tarifa")
                      }
                      className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-xs text-gray-900 focus:outline-none focus:border-blue-500 placeholder:text-gray-400"
                    />
                  </div>

                  {/* Calculated Shuttle Subtotal */}
                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-blue-100/70 text-xs font-bold text-blue-900">
                    <span>
                      {tr("Shuttle Transfer Total:", "Total transfert navette :", "Total traslado:")}
                      <span className="font-normal text-blue-800 ml-1">
                        ({transferPassengersCount} {transferPassengersCount > 1 ? tr("guests", "participants", "participantes") : tr("guest", "participant", "participante")})
                      </span>
                    </span>
                    <span className="text-sm font-extrabold text-blue-700">
                      +{transferCost} {currency}
                    </span>
                  </div>
                </div>
              )}
            </div>

{/* Promo / School Code */}
            <div className="rounded-xl border border-gray-200 bg-gray-50/80 p-4 space-y-2.5">
              <div className="flex items-center gap-2">
                <Tag className="h-4 w-4 text-amber-500 shrink-0" />
                <div>
                  <p className="text-xs font-semibold text-gray-900 leading-snug">
                    {tr(
                      "Will you make a show with your dance school? Enter your school's confidential code.",
                      "Vous ferez un show avec votre école de danse ? Saisissez le code confidentiel de votre école.",
                      "¿Harás un show con tu escuela de baile? Introduce el código confidencial de tu escuela."
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



          </div>


          {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

          <button
            type="submit"
            disabled={
              submitting ||
              form.guests.some((g) => !g.firstName.trim() || !g.lastName.trim()) ||
              !form.email.trim() ||
              !form.phone.trim() ||
              !form.arrival.trim() ||
              !form.departure.trim() ||
              (needsTransfer && (!departureAirport.trim() || !transportCompany.trim() || !departureTime.trim()))
            }

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
                {tr("Confirm Reservation", "Confirmer la réservation", "Confirmar reserva")}
              </>
            )}
          </button>
          <p className="mt-3 text-center text-[11px] text-gray-500 font-medium">
            {tr(
              "Please check your email box to track your booking. Our team will respond within 48 hours to confirm your booking.",
              "Veuillez consulter votre boîte e-mail pour suivre votre réservation. Notre équipe vous répondra sous 48 heures pour confirmer votre réservation.",
              "Por favor revise su bandeja de entrada de correo electrónico para realizar el seguimiento de su reserva. Nuestro equipo le responderá en un plazo de 48 horas para confirmar su reserva."
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
      <div className="max-w-md mx-auto mb-8 rounded-xl border border-amber-200 bg-white p-4 shadow-sm space-y-2">
        <div className="flex items-center gap-2">
          <Tag className="h-4 w-4 text-amber-500 shrink-0" />
          <p className="text-xs font-semibold text-gray-900 leading-snug">
            {tr(
              "Will you make a show with your dance school? Enter your school's confidential code.",
              "Vous ferez un show avec votre école de danse ? Saisissez le code confidentiel de votre école.",
              "¿Harás un show con tu escuela de baile? Introduce el código confidencial de tu escuela."
            )}
          </p>
        </div>
        <div className="flex gap-2 pt-1">
          <input
            type="text"
            value={discountInput}
            onChange={(e) => setDiscountInput(e.target.value.toUpperCase())}
            placeholder={tr("Confidential code", "Code confidentiel", "Código confidencial")}
            className="flex-1 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-mono uppercase text-gray-900 focus:outline-none focus:border-amber-500 transition placeholder:text-gray-400"
          />
          <button
            type="button"
            onClick={handleApplyDiscount}
            disabled={validatingCode || !discountInput.trim()}
            className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-lg transition cursor-pointer disabled:opacity-50 uppercase tracking-wider"
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
                onClick={clearDiscount}
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
            const isApplicable = isDiscountApplicableToPack(appliedDiscount, p.id);
            const discAmt = isApplicable && appliedDiscount
              ? calculateDiscountAmount(appliedDiscount, baseP, packGuestCount(p), baseP, p.currency || "€", p.id)
              : 0;
            const finalP = Math.max(0, baseP - discAmt);
            const hasDiscount = isApplicable && discAmt > 0;

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
