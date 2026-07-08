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
} from "lucide-react";
import { PhoneCountrySelect } from "@/components/PhoneCountrySelect";
import {
  getActivePacks,
  addBooking,
  getCollaboratorByCode,
  getRememberedReferral,
  type Pack,
} from "@/lib/admin-store";
import { useLanguage } from "@/hooks/useLanguage";
import { translateDynamicText, priceUnitLabel, type Language } from "@/lib/translations";

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
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    names: [""] as string[],
    email: "",
    phone: "",
    country: "",
    notes: "",
  });

  useEffect(() => {
    getActivePacks().then(setPacks);
  }, []);

  const isTwoPerson = (p: Pack) => /double|doble|couple|pareja/i.test(p.name);

  const choosePack = (p: Pack) => {
    setSelected(p);
    setForm((f) => ({ ...f, names: isTwoPerson(p) ? ["", ""] : [""] }));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const setName = (idx: number, value: string) =>
    setForm((f) => ({ ...f, names: f.names.map((n, i) => (i === idx ? value : n)) }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selected || form.names.some((n) => !n.trim()) || !form.email.trim()) return;
    setSubmitting(true);
    setError("");

    const refCode = getRememberedReferral();
    const collaborator = refCode
      ? await getCollaboratorByCode(refCode).catch(() => undefined)
      : undefined;
    const customerName = form.names.map((n) => n.trim()).join(" & ");

    try {
      // Notify the festival team by email
      const fd = new FormData();
      fd.append("access_key", "132f8460-381d-4f1b-861e-acb51f25e842");
      fd.append("subject", `New Booking Request: ${selected.name} (${selected.sub})`);
      fd.append("Pack", `${selected.name} - ${selected.sub} (${selected.price} ${selected.currency || "€"})`);
      fd.append("Name", customerName);
      fd.append("Email", form.email);
      fd.append("Phone", form.phone);
      fd.append("Country", form.country);
      fd.append("Notes", form.notes);
      if (collaborator) fd.append("Referral", collaborator.code);
      const res = await fetch("https://api.web3forms.com/submit", { method: "POST", body: fd });
      if (!res.ok) throw new Error(`Submit failed: ${res.status}`);

      // Record the pending booking in the system
      try {
        await addBooking({
          packId: selected.id,
          packName: selected.name,
          customerName,
          email: form.email,
          phone: form.phone,
          country: form.country,
          numPeople: form.names.length,
          danceLevel: "",
          notes: form.notes,
          status: "pending",
          source: collaborator ? "referral" : "website",
          collaboratorId: collaborator?.id ?? null,
        });
      } catch (dbErr) {
        console.warn("Could not record booking:", dbErr);
      }

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
          <div className="mx-auto w-16 h-16 rounded-full bg-amber-500/15 grid place-items-center mb-6">
            <Clock className="h-8 w-8 text-amber-400" />
          </div>
          <h1 className="font-display text-2xl text-zinc-100 tracking-wide">
            {tr("Request Received!", "Demande reçue !", "¡Solicitud recibida!")}
          </h1>
          <p className="mt-2 inline-block px-3 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs tracking-widest uppercase">
            {tr("Status: Pending", "Statut : En attente", "Estado: Pendiente")}
          </p>
          <p className="mt-5 text-sm text-zinc-400 leading-relaxed">
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
    const twoPerson = isTwoPerson(selected);
    const unit = priceUnitLabel(selected, L);
    return (
      <Shell>
        <button
          onClick={() => setSelected(null)}
          className="inline-flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-300 transition cursor-pointer mb-6"
        >
          <ChevronLeft className="h-4 w-4" />
          {tr("Choose another pack", "Choisir un autre pack", "Elegir otro pack")}
        </button>

        {/* Selected pack summary */}
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-5 mb-6 max-w-lg mx-auto">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="font-display text-lg text-zinc-100">
                {translateDynamicText(selected.name, L)}
              </h2>
              <p className="text-xs text-zinc-500">{translateDynamicText(selected.sub, L)}</p>
            </div>
            <p className="font-display text-2xl text-amber-400 whitespace-nowrap">
              {selected.price}
              <span className="text-xs text-zinc-500 ml-1">
                {selected.currency || "€"}
                {unit ? ` / ${unit}` : ""}
              </span>
            </p>
          </div>
        </div>

        <form
          onSubmit={handleSubmit}
          className="rounded-xl border border-zinc-800/60 bg-zinc-900/80 p-6 max-w-lg mx-auto"
        >
          <h3 className="font-display text-lg text-zinc-100 mb-1">
            {tr("Your details", "Vos informations", "Tus datos")}
          </h3>
          <p className="text-xs text-zinc-500 mb-6">
            {tr(
              "Send your booking request — we confirm within 24 hours.",
              "Envoyez votre demande de réservation — nous confirmons sous 24 heures.",
              "Envía tu solicitud de reserva — confirmamos en 24 horas."
            )}
          </p>

          <div className="space-y-4">
            {twoPerson && (
              <p className="text-xs text-amber-400/90 -mb-1">
                {tr(
                  "This pack is for 2 people — please enter both full names.",
                  "Ce pack est pour 2 personnes — veuillez saisir les deux noms complets.",
                  "Este pack es para 2 personas — introduce los dos nombres completos."
                )}
              </p>
            )}
            <div className={twoPerson ? "grid sm:grid-cols-2 gap-3" : ""}>
              {form.names.map((name, idx) => (
                <div key={idx}>
                  <label className="block text-xs tracking-widest uppercase text-zinc-500 mb-1.5">
                    {form.names.length === 1
                      ? tr("Full Name", "Nom complet", "Nombre completo")
                      : `${tr("Person", "Personne", "Persona")} ${idx + 1}`}{" "}
                    <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(idx, e.target.value)}
                    placeholder={idx === 0 ? "John Doe" : "Jane Doe"}
                    className="w-full rounded-lg border border-zinc-700/60 bg-zinc-800/50 px-3 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-amber-500/50 transition"
                  />
                </div>
              ))}
            </div>

            <div>
              <label className="block text-xs tracking-widest uppercase text-zinc-500 mb-1.5">
                Email <span className="text-red-400">*</span>
              </label>
              <input
                type="email"
                required
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="your@email.com"
                className="w-full rounded-lg border border-zinc-700/60 bg-zinc-800/50 px-3 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-amber-500/50 transition"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs tracking-widest uppercase text-zinc-500 mb-1.5">
                  {tr("Phone", "Téléphone", "Teléfono")}
                </label>
                <div className="flex">
                  <PhoneCountrySelect className="rounded-l-lg border border-zinc-700/60 border-r-0 bg-zinc-800/50 px-2 max-w-[110px] text-zinc-100 focus:outline-none focus:border-amber-500/50" />
                  <input
                    type="tel"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    placeholder={tr("Number", "Numéro", "Número")}
                    className="w-full rounded-r-lg border border-zinc-700/60 bg-zinc-800/50 px-3 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-amber-500/50 transition"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs tracking-widest uppercase text-zinc-500 mb-1.5">
                  {tr("Country", "Pays", "País")}
                </label>
                <input
                  type="text"
                  value={form.country}
                  onChange={(e) => setForm({ ...form, country: e.target.value })}
                  placeholder="Morocco"
                  className="w-full rounded-lg border border-zinc-700/60 bg-zinc-800/50 px-3 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-amber-500/50 transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs tracking-widest uppercase text-zinc-500 mb-1.5">
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
                className="w-full rounded-lg border border-zinc-700/60 bg-zinc-800/50 px-3 py-2.5 text-sm text-zinc-100 focus:outline-none focus:border-amber-500/50 transition resize-none"
              />
            </div>
          </div>

          {error && <p className="mt-4 text-sm text-red-400">{error}</p>}

          <button
            type="submit"
            disabled={submitting || form.names.some((n) => !n.trim()) || !form.email.trim()}
            className="mt-6 w-full inline-flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-amber-500 to-amber-600 px-6 py-3.5 text-sm font-bold text-zinc-950 hover:from-amber-400 hover:to-amber-500 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shadow-lg shadow-amber-500/20"
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
          <p className="mt-3 text-center text-[11px] text-zinc-600">
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
      <div className="text-center mb-10">
        <h1 className="font-display text-3xl md:text-4xl text-zinc-100 tracking-wide">
          {tr("Choose Your Pack", "Choisissez votre pack", "Elige tu pack")}
        </h1>
        <p className="mt-3 text-sm text-zinc-400 max-w-md mx-auto">
          {tr(
            "Pick the pack that suits you, send your request, and our team confirms within 24 hours.",
            "Choisissez le pack qui vous convient, envoyez votre demande, et notre équipe confirme sous 24 heures.",
            "Elige el pack que te convenga, envía tu solicitud y nuestro equipo confirma en 24 horas."
          )}
        </p>
      </div>

      {packs.length === 0 ? (
        <p className="text-center text-sm text-zinc-600 py-16">{tr("Loading…", "Chargement…", "Cargando…")}</p>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 max-w-5xl mx-auto">
          {packs.map((p) => {
            const unit = priceUnitLabel(p, L);
            return (
              <button
                key={p.id}
                onClick={() => choosePack(p)}
                className={`relative text-left rounded-2xl p-5 border transition-all duration-300 cursor-pointer hover:-translate-y-1 ${
                  p.popular
                    ? "border-amber-500/60 bg-gradient-to-b from-amber-500/10 to-transparent shadow-lg shadow-amber-500/10"
                    : "border-zinc-700/60 bg-zinc-900/60 hover:border-amber-500/40"
                }`}
              >
                {p.popular && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 inline-flex items-center gap-1 bg-amber-500 text-zinc-950 text-[9px] font-black tracking-widest uppercase px-3 py-1 rounded-full">
                    <Star className="h-2.5 w-2.5" />
                    {tr("Popular", "Populaire", "Popular")}
                  </span>
                )}
                <p className="font-display text-lg text-zinc-100">
                  {translateDynamicText(p.name, L)}
                </p>
                <p className="text-[10px] text-zinc-500 uppercase tracking-widest mt-0.5">
                  {translateDynamicText(p.sub, L)}
                </p>
                <p className="mt-3 font-display text-3xl text-amber-400">
                  {p.price}
                  <span className="text-xs text-zinc-500 ml-1">
                    {p.currency || "€"}
                    {unit ? ` / ${unit}` : ""}
                  </span>
                </p>
                <ul className="mt-3 space-y-1">
                  {p.features.slice(0, 4).map((f, fi) => (
                    <li key={fi} className="flex items-start gap-1.5 text-[11px] text-zinc-400">
                      <Check className="h-3 w-3 text-amber-500/70 mt-0.5 shrink-0" />
                      {translateDynamicText(f, L)}
                    </li>
                  ))}
                </ul>
                <span className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold text-amber-400">
                  <Ticket className="h-3.5 w-3.5" />
                  {tr("Choose this pack →", "Choisir ce pack →", "Elegir este pack →")}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-zinc-950 px-4 py-10">
      <div className="max-w-5xl mx-auto">
        {/* Branding header */}
        <div className="text-center mb-8">
          <p className="inline-flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/10 px-4 py-1.5 text-[10px] tracking-[0.25em] uppercase text-amber-400">
            Tangier International Latin Festival
          </p>
          <p className="mt-3 text-xs text-zinc-500 flex items-center justify-center gap-2">
            <Calendar className="h-3.5 w-3.5 text-amber-500/60" />
            January 07–11, 2027
            <span className="text-zinc-700">·</span>
            <MapPin className="h-3.5 w-3.5 text-amber-500/60" />
            Tangier, Morocco
          </p>
        </div>
        {children}
      </div>
    </div>
  );
}
