import { useState, useMemo, useEffect } from "react";
import {
  X,
  Sparkles,
  User,
  Mail,
  Phone,
  Globe,
  CheckCircle2,
  Tag,
  Check,
  AlertCircle,
  Calendar,
  MapPin,
} from "lucide-react";
import { countries, getFlagUrl } from "@/lib/countries";
import { formatInternationalPhone } from "@/lib/phone";
import { useLanguage } from "@/hooks/useLanguage";
import { translateDynamicText } from "@/lib/translations";
import {
  addBooking,
  getCollaboratorByCode,
  getRememberedReferral,
  validateDiscountCode,
  calculateDiscountAmount,
  isDiscountApplicableToPack,
  calculateTransferCost,
  formatTransferOptionLabel,
  ticketUrl,
  EUR_TO_MAD,
  packDepartureDateLimits,
  constrainPackDepartureDate,
  type Booking,
  type DiscountCode,
  type TransferType,
  type TransferOption,
} from "@/lib/admin-store";
import { Bus, Plane, Ship } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { sendFormNotification, bookingAutoResponse } from "@/lib/form-notify";

const ALLOWED_COUNTRY_CODES = new Set([
  "MA", // Morocco
  // Europe
  "AD",
  "AL",
  "AT",
  "BA",
  "BE",
  "BG",
  "BY",
  "CH",
  "CY",
  "CZ",
  "DE",
  "DK",
  "EE",
  "ES",
  "FI",
  "FR",
  "GB",
  "GR",
  "HR",
  "HU",
  "IE",
  "IS",
  "IT",
  "LI",
  "LT",
  "LU",
  "LV",
  "MC",
  "MD",
  "ME",
  "MK",
  "MT",
  "NL",
  "NO",
  "PL",
  "PT",
  "RO",
  "RS",
  "RU",
  "SE",
  "SI",
  "SK",
  "SM",
  "UA",
  "VA",
]);

const filteredCountries = countries.filter((c) => ALLOWED_COUNTRY_CODES.has(c.code));

export function PackBookingModal({
  pack,
  onClose,
  initialDiscountCode,
  initialDiscount,
}: {
  pack: {
    id?: string;
    name: string;
    sub: string;
    price: string;
    currency?: string;
    numGuests?: number;
  };
  onClose: () => void;
  initialDiscountCode?: string;
  initialDiscount?: DiscountCode | null;
}) {
  const { t, lang } = useLanguage();
  const [submitted, setSubmitted] = useState(false);
  const [reservation, setReservation] = useState<Booking | null>(null);
  const [error, setError] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const numGuests =
    pack.numGuests ?? (/double|doble|couple/i.test(`${pack.name} ${pack.sub}`) ? 2 : 1);
  const singlePrice = parseInt(pack.price, 10) || 0;
  const totalBasePrice = singlePrice * numGuests;
  const currency = pack.currency || "€";
  const [arrivalDate, setArrivalDate] = useState("2027-01-07");
  const [departureDate, setDepartureDate] = useState(() =>
    constrainPackDepartureDate("2027-01-07", "2027-01-11", pack),
  );
  const departureLimits = packDepartureDateLimits(arrivalDate, pack);

  // Shuttle Transfer State
  const [needsTransfer, setNeedsTransfer] = useState(false);
  const [transferType, setTransferType] = useState<TransferType>("port");
  const [transferOption, setTransferOption] = useState<TransferOption>("round_trip");
  const [transferLocation, setTransferLocation] = useState<string>(
    "Port of Tangier (Tanger Ville)",
  );
  const [selectedTransferGuests, setSelectedTransferGuests] = useState<number[]>(() =>
    Array.from({ length: numGuests }, (_, i) => i),
  );
  const [departureAirport, setDepartureAirport] = useState("");
  const [transportCompany, setTransportCompany] = useState("");
  const [arrivalTime, setArrivalTime] = useState("");
  const [departureTime, setDepartureTime] = useState("");
  const [transferDetails, setTransferDetails] = useState("");

  const transferPassengersCount = numGuests > 1 ? selectedTransferGuests.length : 1;
  const transferCost = needsTransfer
    ? calculateTransferCost(transferType, transferOption, transferPassengersCount, transferLocation)
    : 0;

  const isInitialApplicable = isDiscountApplicableToPack(initialDiscount, pack.id);

  // Discount code state
  const [discountInput, setDiscountInput] = useState(
    isInitialApplicable ? initialDiscountCode || initialDiscount?.code || "" : "",
  );
  const [appliedDiscount, setAppliedDiscount] = useState<DiscountCode | null>(
    isInitialApplicable ? initialDiscount || null : null,
  );

  const [discountAmount, setDiscountAmount] = useState(
    isInitialApplicable && initialDiscount
      ? calculateDiscountAmount(
          initialDiscount,
          totalBasePrice,
          numGuests,
          singlePrice,
          currency,
          pack.id,
        )
      : 0,
  );
  const [discountMsg, setDiscountMsg] = useState<{ success: boolean; text: string } | null>(() => {
    if (!isInitialApplicable || !initialDiscount) return null;
    const isMad = /mad|dh/i.test(currency);
    const amt = calculateDiscountAmount(
      initialDiscount,
      totalBasePrice,
      numGuests,
      singlePrice,
      currency,
      pack.id,
    );
    const madAmt = initialDiscount.discountAmount * EUR_TO_MAD;
    const scopeText =
      initialDiscount.applyScope === "fixed_price"
        ? `Special rate: ${isMad ? `${(initialDiscount.overridePrice ?? 0) * EUR_TO_MAD} MAD` : `€${initialDiscount.overridePrice ?? 0}`}`
        : initialDiscount.applyScope === "per_person"
          ? `${isMad ? `-${madAmt} MAD (-€${initialDiscount.discountAmount})` : `-€${initialDiscount.discountAmount}`}/person`
          : initialDiscount.discountType === "percent"
            ? `-${initialDiscount.discountAmount}%`
            : `${isMad ? `-${madAmt} MAD (-€${initialDiscount.discountAmount})` : `-€${amt}`}`;
    return {
      success: true,
      text: `Discount code "${initialDiscount.code}" applied (${scopeText})!`,
    };
  });
  const [validatingCode, setValidatingCode] = useState(false);

  useEffect(() => {
    if (initialDiscount) {
      if (isDiscountApplicableToPack(initialDiscount, pack.id)) {
        const amt = calculateDiscountAmount(
          initialDiscount,
          totalBasePrice,
          numGuests,
          singlePrice,
          currency,
          pack.id,
        );
        setAppliedDiscount(initialDiscount);
        setDiscountAmount(amt);
        setDiscountInput(initialDiscount.code);
        const isMad = /mad|dh/i.test(currency);
        const madAmt = initialDiscount.discountAmount * EUR_TO_MAD;
        const scopeText =
          initialDiscount.applyScope === "fixed_price"
            ? `Special rate: ${isMad ? `${(initialDiscount.overridePrice ?? 0) * EUR_TO_MAD} MAD` : `€${initialDiscount.overridePrice ?? 0}`}`
            : initialDiscount.applyScope === "per_person"
              ? `${isMad ? `-${madAmt} MAD (-€${initialDiscount.discountAmount})` : `-€${initialDiscount.discountAmount}`}/person`
              : initialDiscount.discountType === "percent"
                ? `-${initialDiscount.discountAmount}%`
                : `${isMad ? `-${madAmt} MAD (-€${initialDiscount.discountAmount})` : `-€${amt}`}`;
        setDiscountMsg({
          success: true,
          text: `Discount code "${initialDiscount.code}" applied (${scopeText})!`,
        });
      } else {
        setAppliedDiscount(null);
        setDiscountAmount(0);
        setDiscountMsg(null);
        setDiscountInput("");
      }
    } else if (initialDiscountCode) {
      validateDiscountCode(
        initialDiscountCode,
        totalBasePrice,
        pack.id,
        numGuests,
        singlePrice,
        currency,
      ).then((res) => {
        if (res.valid && res.discount && res.discountAmount != null) {
          setAppliedDiscount(res.discount);
          setDiscountAmount(res.discountAmount);
          setDiscountInput(res.discount.code);
          const isMad = /mad|dh/i.test(currency);
          const madAmt = res.discount.discountAmount * EUR_TO_MAD;
          const scopeText =
            res.discount.applyScope === "fixed_price"
              ? `Special rate: ${isMad ? `${(res.discount.overridePrice ?? 0) * EUR_TO_MAD} MAD` : `€${res.discount.overridePrice ?? 0}`}`
              : res.discount.applyScope === "per_person"
                ? `${isMad ? `-${madAmt} MAD (-€${res.discount.discountAmount})` : `-€${res.discount.discountAmount}`}/person`
                : res.discount.discountType === "percent"
                  ? `-${res.discount.discountAmount}%`
                  : `${isMad ? `-${madAmt} MAD (-€${res.discount.discountAmount})` : `-€${res.discountAmount}`}`;
          setDiscountMsg({
            success: true,
            text: `Discount code "${res.discount.code}" applied (${scopeText})!`,
          });
        } else {
          setAppliedDiscount(null);
          setDiscountAmount(0);
          setDiscountMsg(null);
        }
      });
    }
  }, [
    initialDiscount,
    initialDiscountCode,
    totalBasePrice,
    pack.id,
    numGuests,
    singlePrice,
    currency,
  ]);

  const finalTotalPrice = Math.max(0, totalBasePrice - discountAmount) + transferCost;

  const handleApplyDiscount = async () => {
    if (!discountInput.trim()) return;
    setValidatingCode(true);
    setDiscountMsg(null);
    const result = await validateDiscountCode(
      discountInput,
      totalBasePrice,
      pack.id,
      numGuests,
      singlePrice,
      currency,
    );
    if (result.valid && result.discount && result.discountAmount != null) {
      setAppliedDiscount(result.discount);
      setDiscountAmount(result.discountAmount);
      const isMad = /mad|dh/i.test(currency);
      const madAmt = result.discount.discountAmount * EUR_TO_MAD;
      const scopeText =
        result.discount.applyScope === "fixed_price"
          ? `Special rate: ${isMad ? `${(result.discount.overridePrice ?? 0) * EUR_TO_MAD} MAD` : `€${result.discount.overridePrice ?? 0}`}`
          : result.discount.applyScope === "per_person"
            ? `${isMad ? `-${madAmt} MAD (-€${result.discount.discountAmount})` : `-€${result.discount.discountAmount}`}/person`
            : result.discount.discountType === "percent"
              ? `-${result.discount.discountAmount}%`
              : `${isMad ? `-${madAmt} MAD (-€${result.discount.discountAmount})` : `-€${result.discountAmount}`}`;
      setDiscountMsg({
        success: true,
        text: `Discount code "${result.discount.code}" applied (${scopeText})!`,
      });
    } else {
      setAppliedDiscount(null);
      setDiscountAmount(0);
      const errorMsg =
        result.error === "This discount code is not applicable to the selected pack"
          ? lang === "fr"
            ? "Ce code promo n'est pas applicable à ce pack"
            : lang === "es"
              ? "Este código no es aplicable a este paquete"
              : result.error
          : result.error ||
            (lang === "fr"
              ? "Code promo invalide"
              : lang === "es"
                ? "Código no válido"
                : "Invalid discount code");
      setDiscountMsg({
        success: false,
        text: errorMsg,
      });
    }
    setValidatingCode(false);
  };

  // Memoize large country lists to prevent lag when opening the modal
  const phoneOptions = useMemo(() => {
    return filteredCountries.map((c) => (
      <SelectItem key={c.code} value={c.dial_code} className="cursor-pointer">
        <div className="flex items-center gap-2">
          <img
            src={getFlagUrl(c.code)}
            alt={c.name}
            loading="lazy"
            className="w-4 h-3 object-cover rounded-[2px] shadow-sm"
          />
          <span>{c.dial_code}</span>
        </div>
      </SelectItem>
    ));
  }, []);

  const countryOptions = useMemo(() => {
    return filteredCountries.map((c) => (
      <SelectItem key={c.code} value={c.name} className="cursor-pointer">
        <div className="flex items-center gap-3">
          <img
            src={getFlagUrl(c.code)}
            alt={c.name}
            loading="lazy"
            className="w-5 h-3.5 object-cover rounded-[2px] shadow-sm"
          />
          <span>{c.name}</span>
        </div>
      </SelectItem>
    ));
  }, []);

  return (
    <div
      id="pack-booking-modal"
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 backdrop-blur-sm p-2.5 sm:p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="relative w-full max-w-lg max-h-[94vh] sm:max-h-[90vh] overflow-y-auto rounded-2xl sm:rounded-3xl border border-gray-200 bg-white shadow-2xl animate-in fade-in zoom-in-95 duration-300 text-gray-900"
        style={{ animationFillMode: "both" }}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-3.5 right-3.5 sm:top-4 sm:right-4 z-10 p-2 rounded-full bg-gray-100 border border-gray-200 hover:bg-gray-200 transition cursor-pointer text-gray-600 hover:text-gray-900"
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Header with golden accent */}
        <div className="relative overflow-hidden px-4 sm:px-8 pt-6 sm:pt-8 pb-4 sm:pb-6">
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
                  {singlePrice > 0
                    ? `${singlePrice} ${currency} / ${lang === "fr" ? "pers." : lang === "es" ? "pers." : "person"}`
                    : pack.price}
                </span>
              </div>
            </div>

            {/* Detailed Per-Person & Total Breakdown */}
            <div className="pt-3 border-t border-amber-200/80 space-y-1.5 text-xs text-gray-700 font-medium">
              <div className="flex justify-between items-center text-gray-600">
                <span>
                  {lang === "fr"
                    ? "Prix par personne :"
                    : lang === "es"
                      ? "Precio por persona:"
                      : "Price per person:"}
                </span>
                <span className="font-semibold text-gray-900">
                  {singlePrice} {currency}
                </span>
              </div>

              {numGuests > 1 && (
                <div className="space-y-1 py-1">
                  {Array.from({ length: numGuests }).map((_, idx) => (
                    <div
                      key={idx}
                      className="flex justify-between items-center text-gray-600 pl-2 border-l-2 border-amber-400"
                    >
                      <span>
                        {lang === "fr"
                          ? `Participant ${idx + 1}`
                          : lang === "es"
                            ? `Participante ${idx + 1}`
                            : `Participant ${idx + 1}`}
                      </span>
                      <span>
                        {singlePrice} {currency}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {discountAmount > 0 && (
                <div className="flex justify-between items-center text-emerald-700 font-semibold">
                  <span>
                    {lang === "fr"
                      ? "Réduction appliquée :"
                      : lang === "es"
                        ? "Descuento aplicado:"
                        : "Discount applied:"}
                  </span>
                  <span>
                    -
                    {appliedDiscount?.discountType === "percent"
                      ? `${appliedDiscount.discountAmount}%`
                      : `${discountAmount} ${currency}`}
                  </span>
                </div>
              )}

              {needsTransfer && transferCost > 0 && (
                <div className="flex justify-between items-center text-blue-700 font-semibold">
                  <span>
                    {lang === "fr"
                      ? `Navette (${transferType === "port" ? "Port" : "Aéroport"} · ${formatTransferOptionLabel(transferOption, lang)}) :`
                      : lang === "es"
                        ? `Traslado (${transferType === "port" ? "Puerto" : "Aeropuerto"} · ${formatTransferOptionLabel(transferOption, lang)}):`
                        : `Shuttle Transfer (${transferType === "port" ? "Port" : "Airport"} · ${formatTransferOptionLabel(transferOption, lang)}):`}
                  </span>
                  <span>
                    +{transferCost} {currency}
                  </span>
                </div>
              )}

              <div className="flex justify-between items-center pt-2 border-t border-amber-300 font-bold text-sm text-gray-900">
                <span>
                  {numGuests > 1
                    ? lang === "fr"
                      ? `Montant Total (${numGuests} personnes)`
                      : lang === "es"
                        ? `Monto Total (${numGuests} personas)`
                        : `Total Amount (${numGuests} guests)`
                    : lang === "fr"
                      ? "Montant Total"
                      : lang === "es"
                        ? "Monto Total"
                        : "Total Amount"}
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
          <div className="px-4 sm:px-8 pb-8 text-center">
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
            className="px-4 sm:px-8 pb-6 sm:pb-8 space-y-4"
            onSubmit={async (e) => {
              e.preventDefault();
              setIsSubmitting(true);
              setError(false);
              const formData = new FormData(e.currentTarget);
              const savedDepartureDate = constrainPackDepartureDate(
                arrivalDate,
                departureDate,
                pack,
              );

              // Attribute the booking to a collaborator if the visitor
              // arrived via a referral link (/packs?ref=CODE).
              const refCode = getRememberedReferral();
              const collaborator = refCode
                ? await getCollaboratorByCode(refCode).catch(() => undefined)
                : undefined;

              const numGuests =
                pack.numGuests ?? (/double|doble|couple/i.test(`${pack.name} ${pack.sub}`) ? 2 : 1);

              if (needsTransfer) {
                const missingTimes =
                  transferOption === "round_trip"
                    ? !arrivalTime.trim() || !departureTime.trim()
                    : transferOption === "one_way_arrival"
                      ? !arrivalTime.trim()
                      : !departureTime.trim();

                if (!departureAirport.trim() || !transportCompany.trim() || missingTimes) {
                  alert(
                    lang === "fr"
                      ? "Veuillez renseigner l'aéroport/port de départ, la compagnie et les horaires requis pour le transfert."
                      : lang === "es"
                        ? "Por favor complete el aeropuerto/puerto de salida, la compañía y los horarios requeridos para el traslado."
                        : "Please fill in departure airport/port, company, and required times for your transfer.",
                  );
                  setIsSubmitting(false);
                  return;
                }
              }

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
              const phone = formatInternationalPhone(
                String(formData.get("Phone") || ""),
                String(formData.get("Phone Country Code") || "+212"),
              );
              const customerEmail = String(formData.get("Email") ?? "");

              // Record the booking FIRST so the guest gets their reservation
              // number on screen and in the auto-reply email.
              let created: Booking | null = null;
              const isApplicable = isDiscountApplicableToPack(appliedDiscount, pack.id);
              const finalDiscount = isApplicable ? appliedDiscount : null;
              const finalDiscountAmt = isApplicable ? discountAmount : 0;

              const guestsStructured = guestNames.map((gn) => {
                const parts = gn.split(" ");
                return {
                  firstName: parts[0] || "",
                  lastName: parts.slice(1).join(" ") || "",
                };
              });

              const selectedGuestsLabel =
                numGuests > 1
                  ? selectedTransferGuests
                      .map((idx) => guestNames[idx] || `Participant ${idx + 1}`)
                      .join(", ")
                  : customerName || "Participant 1";

              try {
                created = await addBooking({
                  packId: pack.id ?? "",
                  packName: pack.sub ? `${pack.name} — ${pack.sub}` : pack.name,
                  customerName,
                  email: customerEmail,
                  phone,
                  country: String(formData.get("Country") ?? ""),
                  company: transportCompany.trim() || null,
                  arrivalDate: arrivalDate || null,
                  arrivalTime: arrivalTime.trim() || null,
                  departureDate: savedDepartureDate || null,
                  departureTime: departureTime.trim() || null,
                  numPeople: numGuests,
                  guestDetails: JSON.stringify(guestsStructured),
                  danceLevel: "",
                  notes: String(formData.get("Notes") ?? ""),
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
                  departureAirport: needsTransfer ? departureAirport.trim() || null : null,
                  transferDetails: needsTransfer
                    ? [
                        numGuests > 1 ? `Transfer Passengers: ${selectedGuestsLabel}` : "",
                        departureAirport
                          ? `Departure ${transferType === "airport" ? "Airport" : "Port"}: ${departureAirport}`
                          : "",
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
                console.warn("Could not record booking in database:", dbErr);
              }

              try {
                const transferSummary = needsTransfer
                  ? `${transferType === "port" ? "Port" : "Airport"} (${transferLocation}) - ${formatTransferOptionLabel(transferOption, lang)} - €${transferCost}${departureAirport ? ` - Origin: ${departureAirport}` : ""}${transportCompany ? ` - Company: ${transportCompany}` : ""}${arrivalTime ? ` - Arr Time: ${arrivalTime}` : ""}${departureTime ? ` - Dep Time: ${departureTime}` : ""}${transferDetails ? ` - Details: ${transferDetails}` : ""}`
                  : "No transfer";

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
                    phone,
                    country: String(formData.get("Country") ?? ""),
                    pack: pack.sub ? `${pack.name} — ${pack.sub}` : pack.name,
                    price: `${finalTotalPrice} ${currency}`,
                    guests: String(numGuests),
                    arrival: `${arrivalDate}${arrivalTime ? " " + arrivalTime : ""}`,
                    departure: `${savedDepartureDate}${departureTime ? " " + departureTime : ""}`,
                    shuttleTransfer: transferSummary,
                    ticketCode: created?.ticketCode ?? "",
                    Notes: String(formData.get("Notes") ?? ""),
                    ...(created ? { Reservation: created.ticketCode } : {}),
                    ...(collaborator ? { Referral: collaborator.code } : {}),
                  },
                  autoresponse: bookingAutoResponse(
                    lang,
                    created
                      ? { code: created.ticketCode, url: ticketUrl(created.ticketCode) }
                      : undefined,
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
            {(pack.numGuests ?? (/double|doble|couple/i.test(`${pack.name} ${pack.sub}`) ? 2 : 1)) >
            1 ? (
              <div className="space-y-4">
                {Array.from({
                  length:
                    pack.numGuests ??
                    (/double|doble|couple/i.test(`${pack.name} ${pack.sub}`) ? 2 : 1),
                }).map((_, i) => (
                  <div key={i} className="space-y-2">
                    <p className="text-xs font-bold tracking-wider uppercase text-amber-600 flex items-center gap-1.5">
                      <span>
                        {lang === "fr"
                          ? `Participant ${i + 1}`
                          : lang === "es"
                            ? `Participante ${i + 1}`
                            : `Participant ${i + 1}`}
                      </span>
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
                  {lang === "fr"
                    ? "Date d'arrivée *"
                    : lang === "es"
                      ? "Fecha de llegada *"
                      : "Arrival Date *"}
                </label>
                <input
                  type="date"
                  name="Arrival Date"
                  required
                  value={arrivalDate}
                  min="2027-01-01"
                  max="2027-01-30"
                  onChange={(event) => {
                    const arrival = event.target.value;
                    setArrivalDate(arrival);
                    setDepartureDate((current) =>
                      constrainPackDepartureDate(arrival, current, pack),
                    );
                  }}
                  className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition"
                />
              </div>
              <div>
                <label className="flex items-center gap-1.5 text-xs tracking-wider uppercase text-gray-700 mb-1.5 font-semibold">
                  <Calendar className="h-3.5 w-3.5 text-gray-400" />
                  {lang === "fr"
                    ? "Date de départ *"
                    : lang === "es"
                      ? "Fecha de salida *"
                      : "Departure Date *"}
                </label>
                <input
                  type="date"
                  name="Departure Date"
                  required
                  value={departureDate}
                  min={departureLimits?.min || arrivalDate || "2027-01-01"}
                  max={departureLimits?.max || "2027-01-30"}
                  onChange={(event) =>
                    setDepartureDate(
                      constrainPackDepartureDate(arrivalDate, event.target.value, pack),
                    )
                  }
                  className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition"
                />
              </div>
            </div>
            {/* Transfers now use the standalone /book-transfer form. */}
            <div className="hidden" aria-hidden="true">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-7 w-7 rounded-lg bg-blue-600 text-white grid place-items-center shadow-xs">
                    <Bus className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-blue-950">
                      {lang === "fr"
                        ? "Navette & Transfert"
                        : lang === "es"
                          ? "Traslado y Transporte"
                          : "Shuttle Transfer"}
                    </p>
                    <p className="text-[11px] text-blue-700 font-medium">
                      {lang === "fr"
                        ? "Transfert depuis/vers le port ou l'aéroport"
                        : lang === "es"
                          ? "Traslado desde/hacia el puerto o aeropuerto"
                          : "Transfer to/from port or airport to hotel"}
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
                    {lang === "fr" ? "Non" : lang === "es" ? "No" : "No"}
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
                    {lang === "fr" ? "Oui" : lang === "es" ? "Sí" : "Yes"}
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
                        <Ship
                          className={`h-4 w-4 ${transferType === "port" ? "text-blue-600" : "text-gray-500"}`}
                        />
                        <span className="text-xs font-bold text-gray-900">
                          {lang === "fr"
                            ? "Port de Tanger"
                            : lang === "es"
                              ? "Puerto de Tánger"
                              : "Tangier Port"}
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
                        <Plane
                          className={`h-4 w-4 ${transferType === "airport" ? "text-blue-600" : "text-gray-500"}`}
                        />
                        <span className="text-xs font-bold text-gray-900">
                          {lang === "fr" ? "Aéroport" : lang === "es" ? "Aeropuerto" : "Airport"}
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
                        {lang === "fr"
                          ? "Lieu précis"
                          : lang === "es"
                            ? "Ubicación"
                            : "Pickup/Dropoff Hub"}
                      </label>
                      <select
                        value={transferLocation}
                        onChange={(e) => setTransferLocation(e.target.value)}
                        className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-xs font-medium text-gray-900 focus:outline-none focus:border-blue-500 cursor-pointer"
                      >
                        {transferType === "port" ? (
                          <option value="Port of Tangier (Tanger Ville)">
                            {lang === "fr"
                              ? "Port de Tanger Ville"
                              : lang === "es"
                                ? "Puerto de Tánger Ciudad"
                                : "Port of Tangier (Tanger Ville)"}
                          </option>
                        ) : (
                          <>
                            <option value="Tangier Ibn Battouta Airport (TNG)">
                              {lang === "fr"
                                ? "Aéroport Tanger Ibn Battouta (TNG)"
                                : lang === "es"
                                  ? "Aeropuerto Tánger Ibn Battouta (TNG)"
                                  : "Tangier Ibn Battouta Airport (TNG)"}
                            </option>
                            <option value="Tetouan Sania Ramel Airport (TTU)">
                              {lang === "fr"
                                ? "Aéroport Tétouan Sania Ramel (TTU)"
                                : lang === "es"
                                  ? "Aeropuerto Tetuán Sania Ramel (TTU)"
                                  : "Tetouan Sania Ramel Airport (TTU)"}
                            </option>
                          </>
                        )}
                      </select>
                    </div>

                    <div>
                      <label className="text-[11px] font-bold uppercase tracking-wider text-gray-700 block mb-1">
                        {lang === "fr"
                          ? "Formule de trajet"
                          : lang === "es"
                            ? "Tipo de trayecto"
                            : "Transfer Direction"}
                      </label>
                      <select
                        value={transferOption}
                        onChange={(e) => setTransferOption(e.target.value as TransferOption)}
                        className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-xs font-medium text-gray-900 focus:outline-none focus:border-blue-500 cursor-pointer"
                      >
                        <option value="round_trip">
                          {lang === "fr"
                            ? "Aller-Retour (A/R)"
                            : lang === "es"
                              ? "Ida y Vuelta"
                              : "Round Trip (Arrival & Return)"}
                        </option>
                        <option value="one_way_arrival">
                          {lang === "fr"
                            ? "Aller simple (Arrivée)"
                            : lang === "es"
                              ? "Solo ida (Llegada)"
                              : "One-Way (Arrival only)"}
                        </option>
                        <option value="one_way_departure">
                          {lang === "fr"
                            ? "Retour simple (Départ)"
                            : lang === "es"
                              ? "Solo vuelta (Salida)"
                              : "One-Way (Return only)"}
                        </option>
                      </select>
                    </div>
                  </div>

                  {/* Participant Selection for Transfer (if multiple guests) */}
                  {numGuests > 1 && (
                    <div className="space-y-1.5 pt-1">
                      <label className="text-[11px] font-bold text-blue-950 block">
                        {lang === "fr"
                          ? "Sélectionnez les participants pour le transfert :"
                          : lang === "es"
                            ? "Seleccione los participantes para el traslado:"
                            : "Select participants included in transfer:"}
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        {Array.from({ length: numGuests }).map((_, gIdx) => {
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
                                {lang === "fr"
                                  ? `Participant ${gIdx + 1}`
                                  : lang === "es"
                                    ? `Participante ${gIdx + 1}`
                                    : `Participant ${gIdx + 1}`}
                              </span>
                              <div
                                className={`h-4 w-4 rounded-md border flex items-center justify-center ${
                                  isSelected
                                    ? "bg-white text-blue-600 border-white"
                                    : "border-gray-300"
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
                        ? lang === "fr"
                          ? "Aéroport de départ (Obligatoire) *"
                          : lang === "es"
                            ? "Aeropuerto de salida (Obligatorio) *"
                            : "Departure Airport (Required) *"
                        : lang === "fr"
                          ? "Port de départ (Obligatoire) *"
                          : lang === "es"
                            ? "Puerto de salida (Obligatorio) *"
                            : "Departure Port (Required) *"}
                    </label>
                    <input
                      type="text"
                      required={needsTransfer}
                      value={departureAirport}
                      onChange={(e) => setDepartureAirport(e.target.value)}
                      placeholder={
                        transferType === "airport"
                          ? lang === "fr"
                            ? "Ex: Paris Orly (ORY), CDG, Madrid, Bruxelles, London..."
                            : "Ex: Paris Orly, CDG, Madrid, Brussels, London..."
                          : lang === "fr"
                            ? "Ex: Tarifa, Algésiras, Barcelone..."
                            : "Ex: Tarifa, Algeciras, Barcelona..."
                      }
                      className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-xs text-gray-900 focus:outline-none focus:border-blue-500 placeholder:text-gray-400"
                    />
                  </div>

                  {/* Transport Company (Airline / Ferry) */}
                  <div>
                    <label className="text-[11px] font-bold text-gray-800 block mb-1">
                      {lang === "fr"
                        ? "Compagnie aérienne / Ferry (Obligatoire) *"
                        : lang === "es"
                          ? "Aerolínea / Compañía de ferry (Obligatorio) *"
                          : "Airline / Ferry Company (Required) *"}
                    </label>
                    <input
                      type="text"
                      required={needsTransfer}
                      value={transportCompany}
                      onChange={(e) => setTransportCompany(e.target.value)}
                      placeholder={
                        transferType === "airport"
                          ? lang === "fr"
                            ? "Ex: Ryanair, Royal Air Maroc, Air Arabia..."
                            : "Ex: Ryanair, Iberia, Royal Air Maroc..."
                          : lang === "fr"
                            ? "Ex: FRS Ferries, Balearia, AML..."
                            : "Ex: FRS Ferries, Balearia, AML..."
                      }
                      className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-xs text-gray-900 focus:outline-none focus:border-blue-500 placeholder:text-gray-400"
                    />
                  </div>

                  {/* Arrival & Departure Time Inputs (Both Mandatory) */}
                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <label className="text-[11px] font-bold text-gray-800 block mb-1">
                        {lang === "fr"
                          ? transferOption === "one_way_departure"
                            ? "Heure d'arrivée (Optionnel)"
                            : "Heure d'arrivée (Obligatoire) *"
                          : lang === "es"
                            ? transferOption === "one_way_departure"
                              ? "Hora de llegada (Opcional)"
                              : "Hora de llegada (Obligatorio) *"
                            : transferOption === "one_way_departure"
                              ? "Arrival Time (Optional)"
                              : "Arrival Time (Required) *"}
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
                        {lang === "fr"
                          ? transferOption === "one_way_arrival"
                            ? "Heure de départ (Optionnel)"
                            : "Heure de départ (Obligatoire) *"
                          : lang === "es"
                            ? transferOption === "one_way_arrival"
                              ? "Hora de salida (Opcional)"
                              : "Hora de salida (Obligatorio) *"
                            : transferOption === "one_way_arrival"
                              ? "Departure Time (Optional)"
                              : "Departure Time (Required) *"}
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

                  {/* Flight/Boat Number Details Input */}
                  <div>
                    <label className="text-[11px] font-semibold text-gray-700 block mb-1">
                      {lang === "fr"
                        ? "N° de vol / ferry (Optionnel)"
                        : lang === "es"
                          ? "N° de vuelo / ferry (Opcional)"
                          : "Flight / Ferry # (Optional)"}
                    </label>
                    <input
                      type="text"
                      value={transferDetails}
                      onChange={(e) => setTransferDetails(e.target.value)}
                      placeholder={
                        transferType === "airport"
                          ? lang === "fr"
                            ? "Ex: Vol AT123"
                            : "Ex: Flight AT123"
                          : lang === "fr"
                            ? "Ex: Ferry Tanger-Tarifa"
                            : "Ex: Ferry Tanger-Tarifa"
                      }
                      className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-xs text-gray-900 focus:outline-none focus:border-blue-500 placeholder:text-gray-400"
                    />
                  </div>

                  {/* Calculated Shuttle Subtotal */}
                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-blue-100/70 text-xs font-bold text-blue-900">
                    <span>
                      {lang === "fr"
                        ? "Total transfert navette :"
                        : lang === "es"
                          ? "Total traslado:"
                          : "Shuttle Transfer Total:"}
                      <span className="font-normal text-blue-800 ml-1">
                        ({transferPassengersCount}{" "}
                        {transferPassengersCount > 1
                          ? lang === "fr"
                            ? "participants"
                            : "guests"
                          : lang === "fr"
                            ? "participant"
                            : "guest"}
                        )
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
                    {lang === "fr"
                      ? "Vous ferez un show avec votre école de danse ? Saisissez le code confidentiel de votre école."
                      : lang === "es"
                        ? "¿Harás un show con tu escuela de baile? Introduce el código confidencial de tu escuela."
                        : "Will you make a show with your dance school? Enter your school’s confidential code."}
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
                  {validatingCode
                    ? "..."
                    : lang === "fr"
                      ? "Appliquer"
                      : lang === "es"
                        ? "Aplicar"
                        : "Apply"}
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
                : lang === "fr"
                  ? "CONFIRMER LA RÉSERVATION"
                  : lang === "es"
                    ? "CONFIRMAR RESERVA"
                    : "CONFIRM RESERVATION"}
            </button>

            {error && (
              <p className="text-center text-xs text-red-600 mt-2 font-medium">
                {t("packFormError")}
              </p>
            )}

            <p className="text-center text-[10px] text-gray-400 tracking-wide pt-2">
              contact@tangierlatinfestival.com · +212 6 64 01 02 79 / +212 6 64 63 06 32
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
