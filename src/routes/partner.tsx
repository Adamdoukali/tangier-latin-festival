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
  getDiscountCodes,
  updateBookingStatus,
  collaboratorRevenue,
  collaboratorCommission,
  commissionLabel,
  formatMoney,
  formatForPartner,
  emptyMoney,
  type Money,
  packLabel,
  ticketUrl,
  partnerShareLink,
  packRoomCategory,
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
import { translateDynamicText, type Language } from "@/lib/translations";

export const Route = createFileRoute("/partner")({
  head: () => ({
    meta: [{ title: "Partner Portal — Tangier International Latin Festival" }],
  }),
  component: PartnerPortal,
});

// Short shareable link (tickets.tangierlatinfestival.com/CODE); the /book
// page applies the partner's language automatically.
function getBookingUrl(code: string, _lang?: string): string {
  return partnerShareLink(code);
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
      <div className="min-h-screen bg-slate-100 grid place-items-center">
        <p className="text-sm text-gray-400 tracking-widest uppercase">Loading…</p>
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
    <div
      className="min-h-screen bg-slate-100 flex flex-col"
      style={{ fontFamily: "'Poppins','Segoe UI',system-ui,sans-serif" }}
    >
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap');`}</style>

      {/* Banner — swap for a custom image anytime */}
      <div className="w-full bg-[#13234d] bg-gradient-to-r from-[#0d1a3d] via-[#13234d] to-[#1d3a7a] py-10 px-6 text-center shadow-md">
        <p className="text-amber-400 text-xs tracking-[0.4em] uppercase">
          Tangier International
        </p>
        <h1 className="mt-1 text-white text-3xl md:text-4xl font-bold tracking-wide">
          LATIN FESTIVAL
        </h1>
        <p className="mt-2 text-slate-300 text-sm">
          January 07–11, 2027 · Kenzi Solazur Hotel, Tangier —{" "}
          <span className="text-amber-300 font-semibold">Partner Portal</span>
        </p>
      </div>

      <div className="flex-1 flex items-start justify-center px-4 pt-14 pb-10">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-lg shadow-lg overflow-hidden border border-gray-200">
            {/* Card header */}
            <div className="bg-[#333a45] px-6 py-4 text-center">
              <h2 className="text-white text-lg font-semibold">Partner Login</h2>
            </div>

            <form onSubmit={handleSubmit} className="p-8 space-y-5">
              <p className="text-center text-sm font-semibold text-gray-700">
                Please enter the USERNAME provided by the festival team
              </p>
              {error && (
                <div className="p-3 rounded-md bg-red-50 border border-red-200 text-red-600 text-sm text-center">
                  {error}
                </div>
              )}
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="username"
                required
                placeholder="User Name"
                className="w-full rounded-md border border-gray-300 bg-white px-4 py-3 text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all"
              />
              <input
                type="password"
                value={accessCode}
                onChange={(e) => setAccessCode(e.target.value)}
                autoComplete="current-password"
                required
                placeholder="Access Code"
                className="w-full rounded-md border border-gray-300 bg-white px-4 py-3 text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all"
              />
              <div className="pt-2 text-center">
                <button
                  type="submit"
                  disabled={busy}
                  className="inline-flex items-center justify-center gap-2 bg-[#c8102e] hover:bg-[#a60d26] text-white rounded-md px-10 py-3 font-semibold shadow transition-all cursor-pointer disabled:opacity-50"
                >
                  <Lock className="h-4 w-4" /> {busy ? "Signing in…" : "Partner Login"}
                </button>
              </div>
              <p className="text-[11px] text-gray-400 text-center">
                No account? Ask the festival team for your credentials.
              </p>
            </form>
          </div>
          <div className="mt-6 text-center">
            <Link to="/" className="text-xs text-gray-400 hover:text-gray-600 transition">
              ← Back to the festival website
            </Link>
          </div>
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
  const [sales, setSales] = useState<Money>(emptyMoney());
  const [earned, setEarned] = useState<Money>(emptyMoney());
  const [statusError, setStatusError] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [refQr, setRefQr] = useState("");

  const reload = useCallback(async () => {
    const [packs, allBookings, discounts] = await Promise.all([getPacks(), getBookings(), getDiscountCodes()]);
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
    setEarned(collaboratorCommission(partner, mine, packs, discounts));
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
    // the names and details they filled in) — in the guest's own language.
    if (status === "confirmed" && updated?.email) {
      const bLang = ((updated.lang || partner.language || "en") as "en" | "fr" | "es");
      const tUrl = ticketUrl(updated.ticketCode) + (bLang !== "en" ? `&lang=${bLang}` : "");
      const mail = ticketConfirmationEmail({
        customerName: updated.customerName,
        packName: translateDynamicText(updated.packName, bLang),
        ticketCode: updated.ticketCode,
        numPeople: updated.numPeople || 1,
        ticketUrl: tUrl,
        lang: bLang,
        guests: updated.customerName.split(/\s*&\s*/),
        arrivalDate: updated.arrivalDate,
        departureDate: updated.departureDate,
      });
      sendFormNotification({
        subject: `Ticket confirmed: ${updated.customerName} (${updated.ticketCode})`,
        guestSubject: mail.subject,
        lang: bLang,
        ticket: { code: updated.ticketCode, url: tUrl },
        fields: {
          name: updated.customerName,
          email: updated.email,
          Ticket: tUrl,
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
    pending: "bg-amber-100 text-amber-600 border-amber-200",
    confirmed: "bg-emerald-100 text-emerald-600 border-emerald-200",
    "checked-in": "bg-cyan-100 text-cyan-700 border-cyan-200",
    declined: "bg-red-100 text-red-600 border-red-200",
  };

  return (
    <div
      className="min-h-screen bg-slate-100 text-gray-900 notranslate"
      translate="no"
      style={{ fontFamily: "'Poppins','Segoe UI',system-ui,sans-serif" }}
    >
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap');`}</style>
      {/* Header — classic navy bar */}
      <header className="bg-[#13234d] shadow-md">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="h-10 w-10 rounded-xl bg-amber-500 grid place-items-center shrink-0">
              <Users className="h-5 w-5 text-[#13234d]" />
            </div>
            <div className="min-w-0">
              <p className="font-display text-sm tracking-wide truncate text-white">
                {partner.name}
              </p>
              <p className="text-[11px] text-slate-300 font-mono">{partner.code}</p>
            </div>
          </div>
          <button
            onClick={() => {
              clearPartnerSession();
              onSignOut();
            }}
            className="inline-flex items-center gap-2 text-xs text-slate-300 hover:text-red-300 transition cursor-pointer shrink-0"
          >
            <LogOut className="h-4 w-4" />
            {tr("Sign Out", "Déconnexion", "Cerrar sesión")}
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 sm:px-6 py-8 space-y-8">
        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {(() => {
            const live = myBookings.filter((b) => b.status !== "declined");
            const catOf = (b: Booking) => {
              const p = allPacks.find((x) => x.id === b.packId);
              return packRoomCategory(p?.name ?? b.packName);
            };
            return [
              {
                label: tr("Double Rooms", "Chambres doubles", "Habitaciones dobles"),
                value: live.filter((b) => catOf(b) === "double").length,
                icon: Ticket,
              },
              {
                label: tr("Single Rooms", "Chambres simples", "Habitaciones individuales"),
                value: live.filter((b) => catOf(b) === "single").length,
                icon: Ticket,
              },
              {
                label: tr("Full Pass", "Full Pass", "Full Pass"),
                value: live.filter((b) => catOf(b) === "fullpass").length,
                icon: CheckCircle2,
              },
              {
                label: tr("Sales", "Ventes", "Ventas"),
                value: formatForPartner(sales, partner),
                icon: Euro,
              },
              {
                label: `Commission (${commissionLabel(partner)})`,
                value: formatForPartner(earned, partner),
                icon: Euro,
              },
            ];
          })().map((s) => (
            <div
              key={s.label}
              className="rounded-xl border border-gray-200 bg-white shadow-sm p-4"
            >
              <div className="flex items-center justify-between">
                <p className="text-[10px] tracking-widest uppercase text-gray-500">{s.label}</p>
                <s.icon className="h-4 w-4 text-amber-600" />
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
                    ? "border-emerald-300 bg-emerald-50"
                    : "border-amber-200 bg-amber-50"
                }`}
              >
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <h3 className="font-display text-sm tracking-wide flex items-center gap-2">
                    <Trophy
                      className={`h-4 w-4 ${achieved ? "text-emerald-600" : "text-amber-600"}`}
                    />
                    {achieved
                      ? tr("Mission accomplished!", "Mission accomplie !", "¡Misión cumplida!")
                      : tr("Your Mission", "Votre mission", "Tu misión")}
                  </h3>
                  <span
                    className={`text-xs font-semibold ${
                      achieved ? "text-emerald-700" : "text-amber-700"
                    }`}
                  >
                    {progress}/{goal}
                  </span>
                </div>
                <p className="mt-1.5 text-sm text-gray-600">
                  {achieved
                    ? tr(
                        `You brought ${ticketsSold} people — you've won ${reward}! The festival team will contact you about your reward.`,
                        `Vous avez amené ${ticketsSold} personnes — vous avez gagné ${reward} ! L'équipe du festival vous contactera pour votre récompense.`,
                        `Has traído ${ticketsSold} personas — ¡has ganado ${reward}! El equipo del festival te contactará por tu recompensa.`
                      )
                    : tr(
                        `Bring ${goal} ${goal === 1 ? "person" : "people"} to the festival and win ${reward}. Your commission starts on the sales you make after completing the mission.`,
                        `Amenez ${goal} personne${goal === 1 ? "" : "s"} au festival et gagnez ${reward}. Votre commission démarre sur les ventes réalisées après avoir accompli la mission.`,
                        `Trae ${goal} persona${goal === 1 ? "" : "s"} al festival y gana ${reward}. Tu comisión empieza con las ventas que hagas después de completar la misión.`
                      )}
                </p>
                <div className="mt-3 h-2 rounded-full bg-gray-100 overflow-hidden">
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
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm p-5 flex flex-col sm:flex-row gap-5 items-start">
          <div className="flex-1 space-y-5">
            <div>
              <h3 className="font-display text-sm tracking-wide flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-amber-600" />
                {tr("Your Booking Link", "Votre lien de réservation", "Tu enlace de reserva")}
              </h3>
              <p className="mt-1.5 text-sm text-gray-500">
                {tr(
                  "Send this to your guests — they choose their pack and fill in their details. The request arrives as Pending, credited to you. Once it's confirmed (after payment), they automatically receive their ticket with their names and QR code.",
                  "Envoyez ce lien à vos invités — ils choisissent leur pack et remplissent leurs informations. La demande arrive En attente, à votre crédit. Une fois confirmée (après paiement), ils reçoivent automatiquement leur billet avec leurs noms et le QR code.",
                  "Envía este enlace a tus invitados — eligen su pack y rellenan sus datos. La solicitud llega como Pendiente, a tu crédito. Una vez confirmada (tras el pago), reciben automáticamente su entrada con sus nombres y el código QR."
                )}
              </p>
              <div className="mt-3 flex items-center gap-2 flex-wrap">
                <code className="text-xs font-mono text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-1.5 rounded-lg break-all">
                  {getBookingUrl(partner.code, L)}
                </code>
                <button
                  onClick={() => copy("book", getBookingUrl(partner.code, L))}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer ${
                    copiedId === "book"
                      ? "bg-emerald-100 text-emerald-600"
                      : "bg-gray-100 text-gray-600 hover:text-gray-800"
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
              <div className="rounded-lg border border-gray-200 bg-zinc-100 p-2 inline-block">
                <img src={refQr} alt="Booking link QR" className="w-28 h-28" />
              </div>
              <p className="mt-1.5 text-[10px] text-gray-400">
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
          <p className="text-sm text-gray-500 mb-4">
            {tr(
              "Everyone who booked through your link. Confirming a booking automatically creates and emails their ticket QR.",
              "Toutes les personnes qui ont réservé via votre lien. Confirmer une réservation crée et envoie automatiquement leur billet QR par email.",
              "Todas las personas que reservaron con tu enlace. Confirmar una reserva crea y envía automáticamente su entrada QR por correo."
            )}
          </p>
          {statusError && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 mb-3">
              <p className="text-sm text-red-700">{statusError}</p>
            </div>
          )}
          {myBookings.length === 0 ? (
            <div className="rounded-xl border border-gray-200 bg-white shadow-sm px-5 py-10 text-center text-sm text-gray-400">
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
                    className="rounded-xl border border-gray-200 bg-white shadow-sm p-4 flex flex-col sm:flex-row sm:items-center gap-3"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate">
                        {b.customerName}
                      </p>
                      <p className="text-xs text-gray-500 truncate">
                        {(() => {
                          const pack = allPacks.find((p) => p.id === b.packId);
                          const label = translateDynamicText(
                            pack ? packLabel(pack) : b.packName,
                            L as Language
                          );
                          return pack
                            ? `${label} · ${pack.price} ${pack.currency || "€"}`
                            : label;
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
                      {b.discountCode && (
                        <p className="mt-1">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200 text-[10px] font-mono font-semibold">
                            Promo: {b.discountCode} ({b.discountAmount ? `-€${b.discountAmount}` : "Discount"})
                          </span>
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {hasTicket && (
                        <a
                          href={ticketUrl(b.ticketCode)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2 rounded-lg bg-amber-100 text-amber-600 hover:bg-amber-100 transition"
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
                          className="p-2 rounded-lg bg-green-50 text-[#16a34a] hover:bg-green-100 transition"
                          title={`WhatsApp ${b.phone}`}
                        >
                          <Phone className="h-4 w-4" />
                        </a>
                      )}
                      {b.email && (
                        <a
                          href={`mailto:${b.email}`}
                          className="p-2 rounded-lg bg-gray-100 text-gray-600 hover:text-gray-800 transition"
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
