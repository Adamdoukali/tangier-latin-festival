import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  ArrowLeft,
  Bus,
  CalendarDays,
  Check,
  CheckCircle2,
  Clock3,
  Plane,
  Plus,
  Search,
  Ship,
  TicketCheck,
  TicketX,
  Users,
  X,
} from "lucide-react";
import { PhoneCountrySelect } from "@/components/PhoneCountrySelect";
import {
  addBooking,
  calculateTransferCost,
  findFestivalBookingByIdentity,
  formatTransferOptionLabel,
  getCollaboratorByCode,
  getRememberedReferral,
  parseGuestDetails,
  type Booking,
  type Collaborator,
  type TransferOption,
  type TransferType,
} from "@/lib/admin-store";
import { sendFormNotification } from "@/lib/form-notify";
import { useLanguage } from "@/hooks/useLanguage";

export const Route = createFileRoute("/book-transfer")({
  head: () => ({
    meta: [
      { title: "Festival Transfer Request — Tangier Latin Festival 2027" },
      {
        name: "description",
        content: "Request an airport or port transfer for the Tangier Latin Festival.",
      },
    ],
  }),
  component: BookTransferPage,
});

type TicketState = "idle" | "checking" | "found" | "not-found";

type TransferPassenger = {
  id: string;
  going: boolean;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  country: string;
};

const emptyPassenger = (id = "manual-1"): TransferPassenger => ({
  id,
  going: true,
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  country: "",
});

const initialForm = {
  arrivalDate: "2027-01-07",
  departureDate: "2027-01-11",
  transferType: "airport" as TransferType,
  transferOption: "round_trip" as TransferOption,
  transferLocation: "Tangier Ibn Battouta Airport (TNG)",
  departureAirport: "",
  company: "",
  arrivalTime: "",
  departureTime: "",
  flightDetails: "",
  notes: "",
};

function BookTransferPage() {
  const { lang, changeLanguage } = useLanguage();
  const tr = (en: string, fr: string, es: string) => (lang === "fr" ? fr : lang === "es" ? es : en);

  const [ticketState, setTicketState] = useState<TicketState>("idle");
  const [matchedTicket, setMatchedTicket] = useState<Booking | null>(null);
  const [form, setForm] = useState(initialForm);
  const [passengers, setPassengers] = useState<TransferPassenger[]>(() => [emptyPassenger()]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [created, setCreated] = useState<Booking | null>(null);
  const [partnerCode, setPartnerCode] = useState<string | null>(null);
  const [referralPartner, setReferralPartner] = useState<Collaborator | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const ref = params.get("ref") || getRememberedReferral();
    if (!ref) return;

    let active = true;
    setPartnerCode(ref.trim().toUpperCase());
    getCollaboratorByCode(ref)
      .then((partner) => {
        if (!active) return;
        setReferralPartner(partner ?? null);
        if (
          !params.get("lang") &&
          partner?.language &&
          (partner.language === "en" || partner.language === "fr" || partner.language === "es")
        ) {
          changeLanguage(partner.language);
        }
      })
      .catch(() => {
        if (active) setReferralPartner(null);
      });

    return () => {
      active = false;
    };
  }, [changeLanguage]);

  const selectedPassengers = passengers.filter((passenger) => passenger.going);
  const passengerCount = selectedPassengers.length;
  const transferCost = calculateTransferCost(
    form.transferType,
    form.transferOption,
    Math.max(1, passengerCount),
    form.transferLocation,
  );

  const setField = <K extends keyof typeof initialForm>(field: K, value: (typeof initialForm)[K]) =>
    setForm((current) => ({ ...current, [field]: value }));

  const setPassenger = <K extends keyof TransferPassenger>(
    id: string,
    field: K,
    value: TransferPassenger[K],
  ) => {
    if (
      id === passengers[0]?.id &&
      (field === "firstName" || field === "lastName" || field === "email")
    ) {
      setMatchedTicket(null);
      setTicketState("idle");
    }
    setPassengers((current) =>
      current.map((passenger) =>
        passenger.id === id ? { ...passenger, [field]: value } : passenger,
      ),
    );
  };

  const verifyTicket = async () => {
    const leadPassenger = passengers[0];
    if (
      !leadPassenger?.firstName.trim() ||
      !leadPassenger.lastName.trim() ||
      !leadPassenger.email.trim()
    ) {
      setTicketState("not-found");
      setMatchedTicket(null);
      setError(
        tr(
          "Enter the first passenger's first name, last name, and email before checking.",
          "Saisissez le prénom, le nom et l'e-mail du premier passager avant la vérification.",
          "Introduce el nombre, apellido y correo del primer pasajero antes de verificar.",
        ),
      );
      return;
    }
    setError("");
    setTicketState("checking");
    const match = await findFestivalBookingByIdentity({
      firstName: leadPassenger.firstName,
      lastName: leadPassenger.lastName,
      email: leadPassenger.email,
    }).catch(() => undefined);
    if (!match) {
      setTicketState("not-found");
      setMatchedTicket(null);
      return;
    }

    setMatchedTicket(match);
    setTicketState("found");
    const names = match.customerName
      .split(/\s*&\s*/)
      .map((name) => name.trim())
      .filter(Boolean);
    const details = parseGuestDetails(match.guestDetails);
    const count = Math.max(1, match.numPeople || 1, names.length, details.length);
    setPassengers(
      Array.from({ length: count }, (_, index) => {
        const detail = details[index] ?? {};
        const rawName = names[index] || names[0] || "";
        const parts = rawName.split(/\s+/);
        return {
          id: `ticket-${index + 1}`,
          going: true,
          firstName: detail.firstName ?? parts[0] ?? "",
          lastName: detail.lastName ?? parts.slice(1).join(" "),
          email: detail.email ?? (index === 0 ? match.email || "" : ""),
          phone: detail.phone ?? (index === 0 ? match.phone || "" : ""),
          country: match.country || "",
        };
      }),
    );
    setForm((current) => ({
      ...current,
      arrivalDate: match.arrivalDate || current.arrivalDate,
      departureDate: match.departureDate || current.departureDate,
    }));
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");

    if (
      passengerCount === 0 ||
      selectedPassengers.some(
        (passenger) =>
          !passenger.firstName.trim() ||
          !passenger.lastName.trim() ||
          !passenger.email.trim() ||
          !passenger.phone.trim() ||
          !passenger.country.trim(),
      )
    ) {
      setError(
        tr(
          "Select at least one passenger and complete every selected passenger's details.",
          "Sélectionnez au moins un passager et complétez les informations de chaque passager sélectionné.",
          "Selecciona al menos un pasajero y completa los datos de cada pasajero seleccionado.",
        ),
      );
      return;
    }

    const missingArrival =
      form.transferOption !== "one_way_departure" && (!form.arrivalDate || !form.arrivalTime);
    const missingDeparture =
      form.transferOption !== "one_way_arrival" && (!form.departureDate || !form.departureTime);
    if (missingArrival || missingDeparture) {
      setError(
        tr(
          "Please enter the required arrival and departure dates and times.",
          "Veuillez saisir les dates et heures d'arrivée et de départ requises.",
          "Introduce las fechas y horas de llegada y salida requeridas.",
        ),
      );
      return;
    }

    setSubmitting(true);
    try {
      const data = new FormData(event.currentTarget);
      const passengerRecords = selectedPassengers.map((passenger) => {
        const dialCode = String(data.get(`Phone Country Code ${passenger.id}`) || "");
        const rawPhone = passenger.phone.trim();
        return {
          ...passenger,
          firstName: passenger.firstName.trim(),
          lastName: passenger.lastName.trim(),
          email: passenger.email.trim(),
          phone: (rawPhone.startsWith("+") ? rawPhone : `${dialCode}${rawPhone}`).replace(
            /\s+/g,
            "",
          ),
          country: passenger.country.trim(),
        };
      });
      const primaryPassenger = passengerRecords[0];
      const customerName = passengerRecords
        .map((passenger) => `${passenger.firstName} ${passenger.lastName}`.trim())
        .join(" & ");
      const linkedTicket = matchedTicket?.ticketCode || "";
      const params = new URLSearchParams(window.location.search);
      const referralCode = params.get("ref") || partnerCode || getRememberedReferral();
      const explicitPartner = referralCode
        ? await getCollaboratorByCode(referralCode).catch(() => undefined)
        : undefined;
      const finalCollaboratorId = explicitPartner?.id ?? matchedTicket?.collaboratorId ?? null;
      const ticketNote = linkedTicket
        ? `[Linked Festival Ticket #${linkedTicket}] | Festival ticket verified (${matchedTicket?.status})`
        : "Festival ticket: none declared";
      const referralNote = explicitPartner?.code ? `Referral: ${explicitPartner.code}` : "";
      const transferDetails = [
        `Transfer Passengers: ${customerName}`,
        `Departure ${form.transferType === "airport" ? "Airport" : "Port"}: ${form.departureAirport.trim()}`,
        `Company: ${form.company.trim()}`,
        form.arrivalTime ? `Arrival Time: ${form.arrivalTime}` : "",
        form.departureTime ? `Departure Time: ${form.departureTime}` : "",
        form.flightDetails.trim() ? `Flight/Ferry: ${form.flightDetails.trim()}` : "",
      ]
        .filter(Boolean)
        .join(" | ");

      const booking = await addBooking(
        {
          packId: "",
          packName: "Navette / Shuttle Transfer",
          customerName,
          email: primaryPassenger.email,
          phone: primaryPassenger.phone,
          country: primaryPassenger.country || matchedTicket?.country || "Morocco",
          company: form.company.trim() || null,
          numPeople: passengerCount,
          danceLevel: "",
          notes: [referralNote, ticketNote, form.notes.trim()].filter(Boolean).join(" | "),
          arrivalDate: form.arrivalDate || null,
          arrivalTime: form.arrivalTime || null,
          departureDate: form.departureDate || null,
          departureTime: form.departureTime || null,
          guestDetails: JSON.stringify(
            passengerRecords.map(({ firstName, lastName, email, phone, country }) => ({
              firstName,
              lastName,
              email,
              phone,
              country,
            })),
          ),
          lang,
          status: "pending",
          source: finalCollaboratorId ? "referral" : "website",
          collaboratorId: finalCollaboratorId,
          needsTransfer: true,
          transferType: form.transferType,
          transferOption: form.transferOption,
          transferLocation: form.transferLocation,
          departureAirport: form.departureAirport.trim() || null,
          transferDetails,
          transferCost,
        },
        { allowLocalFallback: false },
      );

      await sendFormNotification({
        subject: `New standalone transfer request: ${customerName}`,
        lang,
        fields: {
          name: customerName,
          email: primaryPassenger.email,
          Phone: primaryPassenger.phone,
          "Festival ticket": linkedTicket
            ? `${linkedTicket} (${matchedTicket?.status})`
            : "No festival ticket",
          Passengers: `${passengerCount} — ${customerName}`,
          Route: formatTransferOptionLabel(form.transferOption, lang),
          Hub: form.transferLocation,
          Origin: form.departureAirport,
          Arrival: `${form.arrivalDate} ${form.arrivalTime}`.trim(),
          Departure: `${form.departureDate} ${form.departureTime}`.trim(),
          Company: form.company,
          "Flight / Ferry": form.flightDetails || "N/A",
          Price: `€${transferCost}`,
          Partner:
            explicitPartner?.name || (finalCollaboratorId ? "Inherited from ticket" : "Direct"),
          Reference: booking.ticketCode,
          Notes: form.notes || "N/A",
        },
        autoresponse: "",
      }).catch(() => false);

      setCreated(booking);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (submitError) {
      console.error(submitError);
      setError(
        tr(
          "We could not save your transfer request. Please try again.",
          "Nous n'avons pas pu enregistrer votre demande. Veuillez réessayer.",
          "No pudimos guardar tu solicitud. Inténtalo de nuevo.",
        ),
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (created) {
    return (
      <TransferShell lang={lang} changeLanguage={changeLanguage}>
        <div className="mx-auto max-w-xl px-4 py-16 text-center">
          <div className="mx-auto grid h-20 w-20 place-items-center rounded-full border-2 border-emerald-300 bg-emerald-100">
            <CheckCircle2 className="h-10 w-10 text-emerald-700" />
          </div>
          <h1 className="mt-6 font-display text-3xl font-black text-slate-950">
            {tr(
              "Transfer request received",
              "Demande de transfert reçue",
              "Solicitud de traslado recibida",
            )}
          </h1>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            {tr(
              "The festival team will verify the schedule and contact you with confirmation.",
              "L'équipe du festival vérifiera les horaires et vous contactera pour confirmation.",
              "El equipo del festival verificará los horarios y te contactará para confirmar.",
            )}
          </p>
          <div className="mt-7 rounded-2xl border border-blue-200 bg-white p-5 shadow-sm">
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
              {tr("Transfer reference", "Référence transfert", "Referencia del traslado")}
            </p>
            <code className="mt-2 block text-2xl font-black text-blue-800">
              {created.ticketCode}
            </code>
          </div>
          <button
            type="button"
            onClick={() => {
              setCreated(null);
              setMatchedTicket(null);
              setTicketState("idle");
              setForm(initialForm);
              setPassengers([emptyPassenger()]);
            }}
            className="mt-7 rounded-xl bg-blue-700 px-6 py-3 text-sm font-bold text-white transition hover:bg-blue-800 cursor-pointer"
          >
            {tr("Send another request", "Envoyer une autre demande", "Enviar otra solicitud")}
          </button>
        </div>
      </TransferShell>
    );
  }

  return (
    <TransferShell lang={lang} changeLanguage={changeLanguage}>
      <main className="mx-auto max-w-3xl px-4 py-8 sm:py-12">
        <div className="text-center">
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-blue-700 text-white shadow-lg shadow-blue-200">
            <Bus className="h-7 w-7" />
          </div>
          <h1 className="mt-5 font-display text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
            {tr("Festival transfer form", "Formulaire de transfert", "Formulario de traslado")}
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-slate-600">
            {tr(
              "Use this separate form for airport or port transfers. Transfer requests are managed only by the festival administration.",
              "Utilisez ce formulaire séparé pour les transferts aéroport ou port. Les demandes sont gérées uniquement par l'administration du festival.",
              "Usa este formulario separado para traslados de aeropuerto o puerto. Las solicitudes son gestionadas solo por la administración del festival.",
            )}
          </p>
        </div>

        {referralPartner && (
          <div className="mt-6 flex items-center justify-between gap-3 rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-xs text-blue-950">
            <span>
              {tr("Partner referral", "Partenaire de référence", "Socio de referencia")}:{" "}
              <strong>{referralPartner.name}</strong>
            </span>
            <code className="rounded-md bg-white px-2 py-1 font-mono font-bold text-blue-800">
              {referralPartner.code}
            </code>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-8 space-y-5">
          <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <h2 className="flex items-center gap-2 font-display text-lg font-bold text-slate-950">
              <Users className="h-5 w-5 text-blue-700" />
              {tr("Passenger details", "Informations des passagers", "Datos de los pasajeros")}
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              {tr(
                "Choose who needs the transfer, then complete the full details for every selected passenger.",
                "Choisissez les passagers qui prennent le transfert, puis complétez toutes leurs informations.",
                "Elige quién necesita el traslado y completa todos los datos de cada pasajero seleccionado.",
              )}
            </p>

            <div className="mt-4 space-y-4">
              {passengers.map((passenger, index) => (
                <div
                  key={passenger.id}
                  className={`rounded-2xl border p-4 transition ${
                    passenger.going
                      ? "border-blue-200 bg-blue-50/40"
                      : "border-slate-200 bg-slate-50 opacity-80"
                  }`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-black text-slate-950">
                        {tr("Passenger", "Passager", "Pasajero")} {index + 1}
                      </p>
                      {(passenger.firstName || passenger.lastName) && (
                        <p className="text-xs text-slate-500">
                          {`${passenger.firstName} ${passenger.lastName}`.trim()}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      {(matchedTicket || passengers.length > 1) && (
                        <div className="flex items-center rounded-xl border border-slate-200 bg-white p-1">
                          <button
                            type="button"
                            onClick={() => setPassenger(passenger.id, "going", true)}
                            className={`rounded-lg px-3 py-1.5 text-[11px] font-bold transition cursor-pointer ${
                              passenger.going
                                ? "bg-emerald-600 text-white"
                                : "text-slate-500 hover:bg-slate-100"
                            }`}
                          >
                            {tr("Going", "Participe", "Va")}
                          </button>
                          <button
                            type="button"
                            onClick={() => setPassenger(passenger.id, "going", false)}
                            className={`rounded-lg px-3 py-1.5 text-[11px] font-bold transition cursor-pointer ${
                              !passenger.going
                                ? "bg-slate-700 text-white"
                                : "text-slate-500 hover:bg-slate-100"
                            }`}
                          >
                            {tr("Not going", "Ne participe pas", "No va")}
                          </button>
                        </div>
                      )}
                      {!matchedTicket && passengers.length > 1 && (
                        <button
                          type="button"
                          onClick={() =>
                            setPassengers((current) =>
                              current.filter((item) => item.id !== passenger.id),
                            )
                          }
                          aria-label={tr("Remove passenger", "Supprimer le passager", "Eliminar pasajero")}
                          className="rounded-lg border border-red-200 bg-white p-2 text-red-600 transition hover:bg-red-50 cursor-pointer"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </div>

                  {passenger.going && (
                    <div className="mt-4 grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2">
                      <Field label={tr("First name", "Prénom", "Nombre")} required>
                        <input
                          required
                          value={passenger.firstName}
                          onChange={(e) => setPassenger(passenger.id, "firstName", e.target.value)}
                          className="form-input"
                        />
                      </Field>
                      <Field label={tr("Last name", "Nom", "Apellido")} required>
                        <input
                          required
                          value={passenger.lastName}
                          onChange={(e) => setPassenger(passenger.id, "lastName", e.target.value)}
                          className="form-input"
                        />
                      </Field>
                      <Field label={tr("Email", "E-mail", "Correo electrónico")} required>
                        <input
                          type="email"
                          required
                          value={passenger.email}
                          onChange={(e) => setPassenger(passenger.id, "email", e.target.value)}
                          className="form-input"
                        />
                      </Field>
                      <Field
                        label={tr(
                          "WhatsApp / Phone",
                          "WhatsApp / Téléphone",
                          "WhatsApp / Teléfono",
                        )}
                        required
                      >
                        <div className="flex w-full min-w-0">
                          <PhoneCountrySelect
                            name={`Phone Country Code ${passenger.id}`}
                            className="w-[96px] shrink-0 rounded-l-xl border border-slate-300 border-r-0 bg-white px-2 text-xs sm:w-[110px] sm:px-3"
                          />
                          <input
                            type="tel"
                            required
                            value={passenger.phone}
                            onChange={(e) => setPassenger(passenger.id, "phone", e.target.value)}
                            className="w-0 min-w-0 flex-1 rounded-r-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-blue-600"
                          />
                        </div>
                      </Field>
                      <Field label={tr("Country", "Pays", "País")} required>
                        <input
                          required
                          value={passenger.country}
                          onChange={(e) => setPassenger(passenger.id, "country", e.target.value)}
                          className="form-input"
                        />
                      </Field>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {!matchedTicket && (
              <button
                type="button"
                onClick={() =>
                  setPassengers((current) => [
                    ...current,
                    emptyPassenger(`manual-${Date.now()}`),
                  ])
                }
                className="mt-4 inline-flex items-center gap-2 rounded-xl border border-blue-300 bg-white px-4 py-2.5 text-xs font-bold text-blue-800 transition hover:bg-blue-50 cursor-pointer"
              >
                <Plus className="h-4 w-4" />
                {tr("Add another passenger", "Ajouter un autre passager", "Añadir otro pasajero")}
              </button>
            )}

            <div className="mt-4 rounded-2xl border border-blue-200 bg-white p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-2.5">
                  <TicketCheck className="mt-0.5 h-4 w-4 shrink-0 text-blue-700" />
                  <div>
                    <p className="text-xs font-bold text-slate-900">
                      {tr(
                        "Check festival reservation",
                        "Vérifier la réservation festival",
                        "Verificar la reserva del festival",
                      )}
                    </p>
                    <p className="mt-0.5 text-[11px] leading-5 text-slate-500">
                      {tr(
                        "Uses passenger 1's first name, last name, and email. All three must match the same ticket.",
                        "Utilise le prénom, le nom et l'e-mail du passager 1. Les trois doivent correspondre au même billet.",
                        "Usa el nombre, apellido y correo del pasajero 1. Los tres deben coincidir con la misma entrada.",
                      )}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={verifyTicket}
                  disabled={ticketState === "checking" || ticketState === "found"}
                  className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-xl bg-blue-700 px-4 py-2.5 text-xs font-bold text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer"
                >
                  {ticketState === "found" ? (
                    <CheckCircle2 className="h-3.5 w-3.5" />
                  ) : (
                    <Search className="h-3.5 w-3.5" />
                  )}
                  {ticketState === "checking"
                    ? tr("Checking...", "Vérification...", "Verificando...")
                    : ticketState === "found"
                      ? tr("Verified", "Vérifié", "Verificado")
                      : tr("Check ticket", "Vérifier le billet", "Verificar entrada")}
                </button>
              </div>

              {ticketState === "found" && matchedTicket && (
                <div className="mt-3 flex items-start gap-2 rounded-xl border border-emerald-300 bg-emerald-50 px-3 py-2.5 text-xs text-emerald-900">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700" />
                  <span>
                    <strong>{tr("Ticket found", "Billet trouvé", "Entrada encontrada")}</strong>
                    {` — ${matchedTicket.customerName} (${matchedTicket.status})`}
                  </span>
                </div>
              )}
              {ticketState === "not-found" && (
                <div className="mt-3 flex items-start gap-2 rounded-xl border border-amber-300 bg-amber-50 px-3 py-2.5 text-xs text-amber-900">
                  <TicketX className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>
                    {tr(
                      "No ticket matches this first name, last name, and email. You can still continue without linking a ticket.",
                      "Aucun billet ne correspond à ce prénom, ce nom et cet e-mail. Vous pouvez continuer sans lier de billet.",
                      "Ninguna entrada coincide con este nombre, apellido y correo. Puedes continuar sin vincular una entrada.",
                    )}
                  </span>
                </div>
              )}
            </div>
          </section>

          <section className="rounded-3xl border border-blue-200 bg-blue-50/60 p-5 shadow-sm sm:p-6">
            <h2 className="flex items-center gap-2 font-display text-lg font-bold text-slate-950">
              <CalendarDays className="h-5 w-5 text-blue-700" />
              {tr(
                "Transfer and travel dates",
                "Transfert et dates de voyage",
                "Traslado y fechas de viaje",
              )}
            </h2>

            <div className="mt-4 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() =>
                  setForm((current) => ({
                    ...current,
                    transferType: "port",
                    transferLocation: "Port of Tangier (Tanger Ville)",
                  }))
                }
                className={`flex items-center justify-center gap-2 rounded-xl border px-3 py-3 text-xs font-bold transition cursor-pointer ${form.transferType === "port" ? "border-blue-700 bg-blue-700 text-white" : "border-blue-200 bg-white text-slate-700"}`}
              >
                <Ship className="h-4 w-4" /> {tr("Port", "Port", "Puerto")}
              </button>
              <button
                type="button"
                onClick={() =>
                  setForm((current) => ({
                    ...current,
                    transferType: "airport",
                    transferLocation: "Tangier Ibn Battouta Airport (TNG)",
                  }))
                }
                className={`flex items-center justify-center gap-2 rounded-xl border px-3 py-3 text-xs font-bold transition cursor-pointer ${form.transferType === "airport" ? "border-blue-700 bg-blue-700 text-white" : "border-blue-200 bg-white text-slate-700"}`}
              >
                <Plane className="h-4 w-4" /> {tr("Airport", "Aéroport", "Aeropuerto")}
              </button>
            </div>

            <div className="mt-4 grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2">
              <Field
                label={tr(
                  "Tangier arrival/departure hub",
                  "Lieu d'arrivée et de départ",
                  "Lugar de llegada/salida en Tánger",
                )}
                required
              >
                <select
                  value={form.transferLocation}
                  onChange={(e) => setField("transferLocation", e.target.value)}
                  className="form-input cursor-pointer"
                >
                  {form.transferType === "port" ? (
                    <option value="Port of Tangier (Tanger Ville)">
                      {tr("Tangier City Port", "Port de Tanger Ville", "Puerto de Tánger Ciudad")}
                    </option>
                  ) : (
                    <>
                      <option value="Tangier Ibn Battouta Airport (TNG)">
                        {tr(
                          "Tangier Airport (TNG)",
                          "Aéroport de Tanger (TNG)",
                          "Aeropuerto de Tánger (TNG)",
                        )}
                      </option>
                      <option value="Tetouan Sania Ramel Airport (TTU)">
                        {tr(
                          "Tetouan Airport (TTU)",
                          "Aéroport de Tétouan (TTU)",
                          "Aeropuerto de Tetuán (TTU)",
                        )}
                      </option>
                    </>
                  )}
                </select>
              </Field>
              <Field
                label={tr("Transfer direction", "Formule de trajet", "Tipo de trayecto")}
                required
              >
                <select
                  value={form.transferOption}
                  onChange={(e) => setField("transferOption", e.target.value as TransferOption)}
                  className="form-input cursor-pointer"
                >
                  <option value="round_trip">
                    {tr("Round trip", "Aller-retour", "Ida y vuelta")}
                  </option>
                  <option value="one_way_arrival">
                    {tr("Arrival only", "Arrivée seulement", "Solo llegada")}
                  </option>
                  <option value="one_way_departure">
                    {tr("Departure only", "Départ seulement", "Solo salida")}
                  </option>
                </select>
              </Field>
              <Field
                label={
                  form.transferType === "airport"
                    ? tr("Departure airport", "Aéroport de départ", "Aeropuerto de salida")
                    : tr("Departure port", "Port de départ", "Puerto de salida")
                }
                required
              >
                <input
                  required
                  value={form.departureAirport}
                  onChange={(e) => setField("departureAirport", e.target.value)}
                  placeholder={
                    form.transferType === "airport"
                      ? "Madrid Barajas, Paris CDG..."
                      : "Tarifa, Algeciras..."
                  }
                  className="form-input"
                />
              </Field>
              <Field
                label={tr(
                  "Airline / Ferry company",
                  "Compagnie aérienne / Ferry",
                  "Aerolínea / Ferry",
                )}
                required
              >
                <input
                  required
                  value={form.company}
                  onChange={(e) => setField("company", e.target.value)}
                  placeholder="Ryanair, Air Arabia, Balearia..."
                  className="form-input"
                />
              </Field>
              <Field
                label={tr("Arrival date", "Date d'arrivée", "Fecha de llegada")}
                required={form.transferOption !== "one_way_departure"}
              >
                <input
                  type="date"
                  required={form.transferOption !== "one_way_departure"}
                  value={form.arrivalDate}
                  onChange={(e) => setField("arrivalDate", e.target.value)}
                  className="form-input"
                />
              </Field>
              <Field
                label={tr("Arrival time", "Heure d'arrivée", "Hora de llegada")}
                required={form.transferOption !== "one_way_departure"}
              >
                <input
                  type="time"
                  required={form.transferOption !== "one_way_departure"}
                  value={form.arrivalTime}
                  onChange={(e) => setField("arrivalTime", e.target.value)}
                  className="form-input"
                />
              </Field>
              <Field
                label={tr("Departure date", "Date de départ", "Fecha de salida")}
                required={form.transferOption !== "one_way_arrival"}
              >
                <input
                  type="date"
                  required={form.transferOption !== "one_way_arrival"}
                  value={form.departureDate}
                  onChange={(e) => setField("departureDate", e.target.value)}
                  className="form-input"
                />
              </Field>
              <Field
                label={tr("Departure time", "Heure de départ", "Hora de salida")}
                required={form.transferOption !== "one_way_arrival"}
              >
                <input
                  type="time"
                  required={form.transferOption !== "one_way_arrival"}
                  value={form.departureTime}
                  onChange={(e) => setField("departureTime", e.target.value)}
                  className="form-input"
                />
              </Field>
              <Field
                label={tr("Flight / Ferry number", "N° de vol / ferry", "N° de vuelo / ferry")}
              >
                <input
                  value={form.flightDetails}
                  onChange={(e) => setField("flightDetails", e.target.value)}
                  placeholder="AT123"
                  className="form-input"
                />
              </Field>
              <Field label={tr("Notes", "Remarques", "Notas")}>
                <input
                  value={form.notes}
                  onChange={(e) => setField("notes", e.target.value)}
                  className="form-input"
                />
              </Field>
            </div>

            <div className="mt-5 flex items-center justify-between rounded-2xl border border-blue-200 bg-white px-4 py-3">
              <div>
                <p className="text-xs font-bold text-slate-900">
                  {tr(
                    "Estimated transfer total",
                    "Total transfert estimé",
                    "Total estimado del traslado",
                  )}
                </p>
                <p className="text-[11px] text-slate-500">
                  {passengerCount} × {formatTransferOptionLabel(form.transferOption, lang)}
                </p>
              </div>
              <span className="text-xl font-black text-blue-800">€{transferCost}</span>
            </div>
          </section>

          {error && (
            <div className="rounded-2xl border border-red-300 bg-red-50 px-4 py-3 text-sm font-medium text-red-800">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-blue-700 px-5 py-4 text-sm font-black text-white shadow-lg shadow-blue-200 transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer"
          >
            {submitting ? (
              <Clock3 className="h-4 w-4 animate-spin" />
            ) : (
              <Check className="h-4 w-4" />
            )}
            {submitting
              ? tr("Sending...", "Envoi...", "Enviando...")
              : tr(
                  "Send transfer request",
                  "Envoyer la demande de transfert",
                  "Enviar solicitud de traslado",
                )}
          </button>
        </form>
      </main>
    </TransferShell>
  );
}

function Field({
  label,
  required = false,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="block min-w-0 max-w-full">
      <span className="mb-1.5 block text-xs font-bold text-slate-700">
        {label} {required && <span className="text-red-600">*</span>}
      </span>
      {children}
    </label>
  );
}

function TransferShell({
  lang,
  changeLanguage,
  children,
}: {
  lang: "en" | "fr" | "es";
  changeLanguage: (language: "en" | "fr" | "es") => void;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">
      <style>{`.form-input{box-sizing:border-box;width:100%;min-width:0;max-width:100%;border-radius:.75rem;border:1px solid rgb(203 213 225);background:white;padding:.625rem .75rem;font-size:.875rem;color:rgb(15 23 42);outline:none}.form-input:focus{border-color:rgb(37 99 235)}`}</style>
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-4">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-xs font-bold text-slate-700 transition hover:text-blue-700"
          >
            <ArrowLeft className="h-4 w-4" /> Tangier Latin Festival
          </Link>
          <div className="flex rounded-lg border border-slate-200 bg-slate-50 p-0.5">
            {(["en", "fr", "es"] as const).map((language) => (
              <button
                key={language}
                type="button"
                onClick={() => changeLanguage(language)}
                className={`rounded-md px-2.5 py-1 text-[11px] font-bold uppercase cursor-pointer ${lang === language ? "bg-blue-700 text-white" : "text-slate-600"}`}
              >
                {language}
              </button>
            ))}
          </div>
        </div>
      </header>
      {children}
    </div>
  );
}
