import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect, useCallback } from "react";
import QRCode from "qrcode";
import {
  Ticket,
  QrCode,
  Copy,
  CheckCircle2,
  LogOut,
  Lock,
  Users,
  Sparkles,
  Mail,
  Phone,
  Euro,
  Trophy,
} from "lucide-react";
import {
  partnerLogin,
  getPacks,
  getBookings,
  updateBookingStatus,
  collaboratorRevenue,
  collaboratorCommission,
  commissionLabel,
  formatMoney,
  packLabel,
  ticketUrl,
  type Collaborator,
  type Pack,
  type Booking,
  type BookingStatus,
} from "@/lib/admin-store";
import {
  savePartnerSession,
  clearPartnerSession,
  restorePartnerSession,
} from "@/lib/partner-auth";
import { sendFormNotification, ticketConfirmationEmail } from "@/lib/form-notify";

export const Route = createFileRoute("/partner")({
  head: () => ({
    meta: [{ title: "Partner Portal — Tangier International Latin Festival" }],
  }),
  component: PartnerPortal,
});

// The partner's links open the website in their language for their guests.
const langParam = (lang?: string) => (lang && lang !== "en" ? `&lang=${lang}` : "");

function getBookingUrl(code: string, lang?: string): string {
  const base = typeof window !== "undefined" ? window.location.origin : "";
  return `${base}/book?ref=${code}${langParam(lang)}`;
}

function PartnerPortal() {
  const [checking, setChecking] = useState(true);
  const [partner, setPartner] = useState<Collaborator | null>(null);

  useEffect(() => {
    restorePartnerSession().then((c) => {
      setPartner(c);
      setChecking(false);
    });
  }, []);

  if (checking) {
    return (
      <div className="min-h-screen bg-zinc-950 grid place-items-center">
        <p className="text-sm text-zinc-600 tracking-widest uppercase">Loading…</p>
      </div>
    );
  }

  return partner ? (
    <Portal partner={partner} onSignOut={() => setPartner(null)} />
  ) : (
    <LoginScreen onLogin={setPartner} />
  );
}

// ─── Login ────────────────────────────────────────────────────────────

function LoginScreen({ onLogin }: { onLogin: (c: Collaborator) => void }) {
  const [username, setUsername] = useState("");
  const [accessCode, setAccessCode] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    const result = await partnerLogin(username, accessCode);
    if (result.success) {
      savePartnerSession(username.trim().toLowerCase(), accessCode.trim());
      onLogin(result.collaborator);
    } else {
      setError(result.error);
    }
    setBusy(false);
  };

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="mx-auto w-14 h-14 rounded-2xl bg-amber-500 grid place-items-center mb-4">
            <Users className="h-7 w-7 text-zinc-950" />
          </div>
          <h1 className="font-display text-2xl text-zinc-100 tracking-wide">Partner Portal</h1>
          <p className="mt-2 text-sm text-zinc-500">
            Tangier International Latin Festival — track your bookings and commission.
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="rounded-2xl border border-zinc-800/60 bg-zinc-900/50 p-6 space-y-4"
        >
          <div>
            <label className="block text-xs tracking-widest uppercase text-zinc-500 mb-1.5">
              Username
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              required
              className="w-full rounded-lg border border-zinc-700/60 bg-zinc-800/50 px-3 py-2.5 text-sm text-zinc-100 focus:outline-none focus:border-amber-500/50 transition"
            />
          </div>
          <div>
            <label className="block text-xs tracking-widest uppercase text-zinc-500 mb-1.5">
              Access Code
            </label>
            <input
              type="password"
              value={accessCode}
              onChange={(e) => setAccessCode(e.target.value)}
              autoComplete="current-password"
              required
              className="w-full rounded-lg border border-zinc-700/60 bg-zinc-800/50 px-3 py-2.5 text-sm text-zinc-100 focus:outline-none focus:border-amber-500/50 transition"
            />
          </div>
          {error && <p className="text-sm text-red-400">{error}</p>}
          <button
            type="submit"
            disabled={busy}
            className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-amber-500 px-4 py-3 text-sm font-semibold text-zinc-950 hover:bg-amber-400 transition cursor-pointer disabled:opacity-50"
          >
            <Lock className="h-4 w-4" /> {busy ? "Signing in…" : "Sign In"}
          </button>
          <p className="text-[11px] text-zinc-600 text-center">
            No account? Ask the festival team for your credentials.
          </p>
        </form>

        <div className="mt-6 text-center">
          <Link to="/" className="text-xs text-zinc-600 hover:text-zinc-400 transition">
            ← Back to the festival website
          </Link>
        </div>
      </div>
    </div>
  );
}

// ─── Portal ───────────────────────────────────────────────────────────

function Portal({ partner, onSignOut }: { partner: Collaborator; onSignOut: () => void }) {
  const L = partner.language ?? "en";
  const tr = (en: string, fr: string, es: string) =>
    L === "fr" ? fr : L === "es" ? es : en;

  const [allPacks, setAllPacks] = useState<Pack[]>([]);
  const [myBookings, setMyBookings] = useState<Booking[]>([]);
  const [ticketsSold, setTicketsSold] = useState(0);
  const [sales, setSales] = useState(0);
  const [earned, setEarned] = useState<{ amount: number; currency: "EUR" | "MAD" }>({
    amount: 0,
    currency: "EUR",
  });
  const [statusError, setStatusError] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [refQr, setRefQr] = useState("");

  const reload = useCallback(async () => {
    const [packs, allBookings] = await Promise.all([getPacks(), getBookings()]);
    setAllPacks(packs);
    const mine = allBookings
      .filter((b) => b.collaboratorId === partner.id)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    setMyBookings(mine);
    setTicketsSold(
      mine
        .filter((b) => b.status !== "declined")
        .reduce((s, b) => s + (b.numPeople || 1), 0)
    );
    setSales(collaboratorRevenue(partner.id, mine, packs));
    setEarned(collaboratorCommission(partner, mine, packs));
  }, [partner]);

  const changeBookingStatus = async (id: string, status: BookingStatus) => {
    setStatusError("");
    let updated: Booking | null = null;
    try {
      updated = await updateBookingStatus(id, status);
    } catch (e) {
      setStatusError(e instanceof Error ? e.message : String(e));
    }
    await reload();

    // Confirming automatically sends the guest their ticket (QR page with
    // the names and details they filled in) — same as from the admin.
    if (status === "confirmed" && updated?.email) {
      const mail = ticketConfirmationEmail({
        customerName: updated.customerName,
        packName: updated.packName,
        ticketCode: updated.ticketCode,
        numPeople: updated.numPeople || 1,
        ticketUrl: ticketUrl(updated.ticketCode),
      });
      sendFormNotification({
        subject: mail.subject,
        fields: {
          name: updated.customerName,
          email: updated.email,
          Ticket: ticketUrl(updated.ticketCode),
          Code: updated.ticketCode,
          Pack: updated.packName,
          "Confirmed by partner": partner.name,
        },
        autoresponse: mail.body,
      }).catch(() => {});
    }
  };

  useEffect(() => {
    reload();
  }, [reload]);

  // Booking-link QR (guests scan it, choose their pack, request a booking)
  useEffect(() => {
    QRCode.toDataURL(getBookingUrl(partner.code, L), {
      width: 240,
      margin: 1,
      color: { dark: "#18181b", light: "#fafafa" },
    })
      .then(setRefQr)
      .catch(() => setRefQr(""));
  }, [partner.code, L]);

  const copy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  const statusStyles: Record<string, string> = {
    pending: "bg-amber-500/15 text-amber-400 border-amber-500/30",
    confirmed: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
    "checked-in": "bg-cyan-500/15 text-cyan-400 border-cyan-500/30",
    declined: "bg-red-500/15 text-red-400 border-red-500/30",
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 notranslate" translate="no">
      {/* Header */}
      <header className="border-b border-zinc-800/60 bg-zinc-900/50">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="h-10 w-10 rounded-xl bg-amber-500 grid place-items-center shrink-0">
              <Users className="h-5 w-5 text-zinc-950" />
            </div>
            <div className="min-w-0">
              <p className="font-display text-sm tracking-wide truncate">{partner.name}</p>
              <p className="text-[11px] text-zinc-500 font-mono">{partner.code}</p>
            </div>
          </div>
          <button
            onClick={() => {
              clearPartnerSession();
              onSignOut();
            }}
            className="inline-flex items-center gap-2 text-xs text-zinc-500 hover:text-red-400 transition cursor-pointer shrink-0"
          >
            <LogOut className="h-4 w-4" />
            {tr("Sign Out", "Déconnexion", "Cerrar sesión")}
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 sm:px-6 py-8 space-y-8">
        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            {
              label: tr("Bookings", "Réservations", "Reservas"),
              value: myBookings.filter((b) => b.status !== "declined").length,
              icon: Ticket,
            },
            {
              label: tr("Tickets Sold", "Billets vendus", "Entradas vendidas"),
              value: ticketsSold,
              icon: CheckCircle2,
            },
            {
              label: tr("Sales", "Ventes", "Ventas"),
              value: `€${sales.toLocaleString()}`,
              icon: Euro,
            },
            {
              label: `Commission (${commissionLabel(partner)})`,
              value: formatMoney(earned.amount, earned.currency),
              icon: Euro,
            },
          ].map((s) => (
            <div
              key={s.label}
              className="rounded-xl border border-zinc-800/60 bg-zinc-900/50 p-4"
            >
              <div className="flex items-center justify-between">
                <p className="text-[10px] tracking-widest uppercase text-zinc-500">{s.label}</p>
                <s.icon className="h-4 w-4 text-amber-400/70" />
              </div>
              <p className="mt-1.5 font-display text-2xl">{s.value}</p>
            </div>
          ))}
        </div>

        {/* Mission — bonus goal set by the festival team */}
        {(partner.missionGoal ?? 0) > 0 &&
          (() => {
            const goal = partner.missionGoal!;
            const progress = Math.min(ticketsSold, goal);
            const achieved = ticketsSold >= goal;
            const reward = formatMoney(partner.missionReward ?? 0, partner.missionCurrency);
            return (
              <div
                className={`rounded-xl border p-5 ${
                  achieved
                    ? "border-emerald-500/40 bg-emerald-500/10"
                    : "border-amber-500/30 bg-amber-500/5"
                }`}
              >
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <h3 className="font-display text-sm tracking-wide flex items-center gap-2">
                    <Trophy
                      className={`h-4 w-4 ${achieved ? "text-emerald-400" : "text-amber-400"}`}
                    />
                    {achieved
                      ? tr("Mission accomplished!", "Mission accomplie !", "¡Misión cumplida!")
                      : tr("Your Mission", "Votre mission", "Tu misión")}
                  </h3>
                  <span
                    className={`text-xs font-semibold ${
                      achieved ? "text-emerald-300" : "text-amber-300"
                    }`}
                  >
                    {progress}/{goal}
                  </span>
                </div>
                <p className="mt-1.5 text-sm text-zinc-400">
                  {achieved
                    ? tr(
                        `You brought ${ticketsSold} people — you've won ${reward}! The festival team will contact you about your reward.`,
                        `Vous avez amené ${ticketsSold} personnes — vous avez gagné ${reward} ! L'équipe du festival vous contactera pour votre récompense.`,
                        `Has traído ${ticketsSold} personas — ¡has ganado ${reward}! El equipo del festival te contactará por tu recompensa.`
                      )
                    : tr(
                        `Bring ${goal} ${goal === 1 ? "person" : "people"} to the festival and win ${reward}.`,
                        `Amenez ${goal} personne${goal === 1 ? "" : "s"} au festival et gagnez ${reward}.`,
                        `Trae ${goal} persona${goal === 1 ? "" : "s"} al festival y gana ${reward}.`
                      )}
                </p>
                <div className="mt-3 h-2 rounded-full bg-zinc-800 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      achieved ? "bg-emerald-500" : "bg-amber-500"
                    }`}
                    style={{ width: `${Math.min(100, (progress / goal) * 100)}%` }}
                  />
                </div>
              </div>
            );
          })()}

        {/* Selling links */}
        <div className="rounded-xl border border-zinc-800/60 bg-zinc-900/50 p-5 flex flex-col sm:flex-row gap-5 items-start">
          <div className="flex-1 space-y-5">
            <div>
              <h3 className="font-display text-sm tracking-wide flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-amber-400" />
                {tr("Your Booking Link", "Votre lien de réservation", "Tu enlace de reserva")}
              </h3>
              <p className="mt-1.5 text-sm text-zinc-500">
                {tr(
                  "Send this to your guests — they choose their pack and fill in their details. The request arrives as Pending, credited to you. Once it's confirmed (after payment), they automatically receive their ticket with their names and QR code.",
                  "Envoyez ce lien à vos invités — ils choisissent leur pack et remplissent leurs informations. La demande arrive En attente, à votre crédit. Une fois confirmée (après paiement), ils reçoivent automatiquement leur billet avec leurs noms et le QR code.",
                  "Envía este enlace a tus invitados — eligen su pack y rellenan sus datos. La solicitud llega como Pendiente, a tu crédito. Una vez confirmada (tras el pago), reciben automáticamente su entrada con sus nombres y el código QR."
                )}
              </p>
              <div className="mt-3 flex items-center gap-2 flex-wrap">
                <code className="text-xs font-mono text-amber-300 bg-amber-500/10 border border-amber-500/20 px-2.5 py-1.5 rounded-lg break-all">
                  {getBookingUrl(partner.code, L)}
                </code>
                <button
                  onClick={() => copy("book", getBookingUrl(partner.code, L))}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer ${
                    copiedId === "book"
                      ? "bg-emerald-500/15 text-emerald-400"
                      : "bg-zinc-800/60 text-zinc-400 hover:text-zinc-200"
                  }`}
                >
                  {copiedId === "book" ? (
                    <CheckCircle2 className="h-3.5 w-3.5" />
                  ) : (
                    <Copy className="h-3.5 w-3.5" />
                  )}
                  {copiedId === "book"
                    ? tr("Copied", "Copié", "Copiado")
                    : tr("Copy", "Copier", "Copiar")}
                </button>
              </div>
            </div>
          </div>
          {refQr && (
            <div className="shrink-0 text-center">
              <div className="rounded-lg border border-zinc-700/30 bg-zinc-100 p-2 inline-block">
                <img src={refQr} alt="Booking link QR" className="w-28 h-28" />
              </div>
              <p className="mt-1.5 text-[10px] text-zinc-600">
                {tr("Booking link QR", "QR du lien de réservation", "QR del enlace de reserva")}
              </p>
            </div>
          )}
        </div>

        {/* My bookings — guests who booked through this partner's link */}
        <div>
          <h3 className="font-display text-sm tracking-wide mb-1">
            {tr("My Bookings", "Mes réservations", "Mis reservas")} ({myBookings.length})
          </h3>
          <p className="text-sm text-zinc-500 mb-4">
            {tr(
              "Everyone who booked through your link. Confirming a booking automatically creates and emails their ticket QR.",
              "Toutes les personnes qui ont réservé via votre lien. Confirmer une réservation crée et envoie automatiquement leur billet QR par email.",
              "Todas las personas que reservaron con tu enlace. Confirmar una reserva crea y envía automáticamente su entrada QR por correo."
            )}
          </p>
          {statusError && (
            <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 mb-3">
              <p className="text-sm text-red-300">{statusError}</p>
            </div>
          )}
          {myBookings.length === 0 ? (
            <div className="rounded-xl border border-zinc-800/60 bg-zinc-900/50 px-5 py-10 text-center text-sm text-zinc-600">
              {tr(
                "No bookings yet — share your booking link to get started.",
                "Pas encore de réservations — partagez votre lien pour commencer.",
                "Aún no hay reservas — comparte tu enlace para empezar."
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {myBookings.map((b) => {
                const waDigits = (b.phone || "").replace(/\D/g, "");
                const hasTicket = b.status === "confirmed" || b.status === "checked-in";
                return (
                  <div
                    key={b.id}
                    className="rounded-xl border border-zinc-800/60 bg-zinc-900/50 p-4 flex flex-col sm:flex-row sm:items-center gap-3"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-zinc-200 truncate">
                        {b.customerName}
                      </p>
                      <p className="text-xs text-zinc-500 truncate">
                        {(() => {
                          const pack = allPacks.find((p) => p.id === b.packId);
                          return pack
                            ? `${packLabel(pack)} · ${pack.price} ${pack.currency || "€"}`
                            : b.packName;
                        })()}
                        {b.numPeople > 1
                          ? ` · ${b.numPeople} ${tr("people", "personnes", "personas")}`
                          : ""}
                        {b.arrivalDate
                          ? ` · ${new Date(b.arrivalDate).toLocaleDateString()} → ${
                              b.departureDate
                                ? new Date(b.departureDate).toLocaleDateString()
                                : "?"
                            }`
                          : ""}{" "}
                        · {new Date(b.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {hasTicket && (
                        <a
                          href={ticketUrl(b.ticketCode)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2 rounded-lg bg-amber-500/15 text-amber-400 hover:bg-amber-500/25 transition"
                          title={tr(
                            `Open ticket ${b.ticketCode}`,
                            `Ouvrir le billet ${b.ticketCode}`,
                            `Abrir entrada ${b.ticketCode}`
                          )}
                        >
                          <QrCode className="h-4 w-4" />
                        </a>
                      )}
                      {waDigits && (
                        <a
                          href={`https://wa.me/${waDigits}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2 rounded-lg bg-[#25D366]/15 text-[#4ade80] hover:bg-[#25D366]/25 transition"
                          title={`WhatsApp ${b.phone}`}
                        >
                          <Phone className="h-4 w-4" />
                        </a>
                      )}
                      {b.email && (
                        <a
                          href={`mailto:${b.email}`}
                          className="p-2 rounded-lg bg-zinc-800/60 text-zinc-400 hover:text-zinc-200 transition"
                          title={`Email ${b.email}`}
                        >
                          <Mail className="h-4 w-4" />
                        </a>
                      )}
                      {b.status === "checked-in" ? (
                        <span
                          className={`px-3 py-1.5 rounded-full text-[10px] tracking-widest uppercase font-medium border ${statusStyles["checked-in"]}`}
                        >
                          {tr("Checked In", "Enregistré", "Registrado")}
                        </span>
                      ) : (
                        <select
                          value={b.status}
                          onChange={(e) =>
                            changeBookingStatus(b.id, e.target.value as BookingStatus)
                          }
                          className={`appearance-none rounded-full px-3 py-1.5 text-[10px] tracking-widest uppercase font-medium border cursor-pointer focus:outline-none ${statusStyles[b.status] ?? statusStyles.pending}`}
                        >
                          <option value="pending">
                            {tr("Pending", "En attente", "Pendiente")}
                          </option>
                          <option value="confirmed">
                            {tr("Confirmed", "Confirmé", "Confirmada")}
                          </option>
                          <option value="declined">
                            {tr("Declined", "Refusé", "Rechazada")}
                          </option>
                        </select>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
