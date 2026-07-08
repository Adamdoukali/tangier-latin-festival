import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect, useCallback } from "react";
import QRCode from "qrcode";
import {
  Ticket,
  QrCode,
  Download,
  Copy,
  CheckCircle2,
  Link2,
  LogOut,
  Lock,
  Plus,
  Users,
  TrendingUp,
  Sparkles,
  Mail,
  Phone,
  Euro,
} from "lucide-react";
import {
  partnerLogin,
  getPacks,
  getInvites,
  getBookings,
  generateBulkInvites,
  updateBookingStatus,
  collaboratorRevenue,
  collaboratorCommission,
  commissionLabel,
  formatMoney,
  packLabel,
  type Collaborator,
  type Invite,
  type Pack,
  type Booking,
  type BookingStatus,
} from "@/lib/admin-store";
import {
  savePartnerSession,
  clearPartnerSession,
  restorePartnerSession,
} from "@/lib/partner-auth";

export const Route = createFileRoute("/partner")({
  head: () => ({
    meta: [{ title: "Partner Portal — Tangier International Latin Festival" }],
  }),
  component: PartnerPortal,
});

function getRedeemUrl(code: string): string {
  const base = typeof window !== "undefined" ? window.location.origin : "";
  return `${base}/redeem?code=${code}`;
}

function getReferralUrl(code: string): string {
  const base = typeof window !== "undefined" ? window.location.origin : "";
  return `${base}/packs?ref=${code}`;
}

function getBookingUrl(code: string): string {
  const base = typeof window !== "undefined" ? window.location.origin : "";
  return `${base}/book?ref=${code}`;
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
            Tangier International Latin Festival — generate and track your invites.
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
  const [packs, setPacks] = useState<Pack[]>([]);
  const [allPacks, setAllPacks] = useState<Pack[]>([]);
  const [myInvites, setMyInvites] = useState<Invite[]>([]);
  const [myBookings, setMyBookings] = useState<Booking[]>([]);
  const [ticketsSold, setTicketsSold] = useState(0);
  const [sales, setSales] = useState(0);
  const [earned, setEarned] = useState<{ amount: number; currency: "EUR" | "MAD" }>({
    amount: 0,
    currency: "EUR",
  });
  const [statusError, setStatusError] = useState("");
  const [selectedPackId, setSelectedPackId] = useState("");
  const [count, setCount] = useState(1);
  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState("");
  const [qrUrls, setQrUrls] = useState<Record<string, string>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [refQr, setRefQr] = useState("");

  const reload = useCallback(async () => {
    const [allPacks, allInvites, allBookings] = await Promise.all([
      getPacks(),
      getInvites(),
      getBookings(),
    ]);
    const active = allPacks.filter((p) => p.active);
    setPacks(active);
    setAllPacks(allPacks);
    setSelectedPackId((prev) => prev || active[0]?.id || "");
    setMyInvites(
      allInvites
        .filter((i) => i.collaboratorId === partner.id)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    );
    const mine = allBookings
      .filter((b) => b.collaboratorId === partner.id)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    setMyBookings(mine);
    setTicketsSold(
      mine
        .filter((b) => b.status !== "declined")
        .reduce((s, b) => s + (b.numPeople || 1), 0)
    );
    setSales(collaboratorRevenue(partner.id, mine, allPacks));
    setEarned(collaboratorCommission(partner, mine, allPacks));
  }, [partner]);

  const changeBookingStatus = async (id: string, status: BookingStatus) => {
    setStatusError("");
    try {
      await updateBookingStatus(id, status);
    } catch (e) {
      setStatusError(e instanceof Error ? e.message : String(e));
    }
    await reload();
  };

  useEffect(() => {
    reload();
  }, [reload]);

  // Booking-link QR (guests scan it, choose their pack, request a booking)
  useEffect(() => {
    QRCode.toDataURL(getBookingUrl(partner.code), {
      width: 240,
      margin: 1,
      color: { dark: "#18181b", light: "#fafafa" },
    })
      .then(setRefQr)
      .catch(() => setRefQr(""));
  }, [partner.code]);

  // Invite QRs
  useEffect(() => {
    (async () => {
      const urls: Record<string, string> = {};
      for (const inv of myInvites.slice(0, 60)) {
        if (qrUrls[inv.id]) continue;
        try {
          urls[inv.id] = await QRCode.toDataURL(getRedeemUrl(inv.code), {
            width: 200,
            margin: 1,
            color: { dark: "#18181b", light: "#fafafa" },
          });
        } catch {
          urls[inv.id] = "";
        }
      }
      if (Object.keys(urls).length) setQrUrls((prev) => ({ ...prev, ...urls }));
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [myInvites]);

  const quota = partner.inviteQuota ?? null;
  const used = myInvites.length;
  const remaining = quota === null ? null : Math.max(0, quota - used);

  const handleGenerate = async () => {
    if (!selectedPackId || generating) return;
    setGenError("");
    const n = Math.max(1, Math.min(20, count));
    if (remaining !== null && n > remaining) {
      setGenError(
        remaining === 0
          ? "You've reached your invite limit. Contact the festival team to raise it."
          : `Only ${remaining} invite${remaining === 1 ? "" : "s"} left on your account.`
      );
      return;
    }
    setGenerating(true);
    const pack = packs.find((p) => p.id === selectedPackId);
    await generateBulkInvites(selectedPackId, packLabel(pack), n, partner.name, partner.id);
    await reload();
    setGenerating(false);
  };

  const copy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  const downloadQr = async (code: string) => {
    try {
      const url = await QRCode.toDataURL(getRedeemUrl(code), {
        width: 400,
        margin: 2,
        color: { dark: "#18181b", light: "#fafafa" },
      });
      const a = document.createElement("a");
      a.href = url;
      a.download = `invite-${code}.png`;
      a.click();
    } catch {
      /* ignore */
    }
  };

  const redeemed = myInvites.filter((i) => i.used).length;

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
            <LogOut className="h-4 w-4" /> Sign Out
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 sm:px-6 py-8 space-y-8">
        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {[
            { label: "Invites Created", value: used, icon: QrCode },
            { label: "Invites Redeemed", value: redeemed, icon: CheckCircle2 },
            { label: "Tickets Sold", value: ticketsSold, icon: Ticket },
            {
              label: "Invites Left",
              value: remaining === null ? "∞" : remaining,
              icon: TrendingUp,
            },
            { label: "Sales", value: `€${sales.toLocaleString()}`, icon: Euro },
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

        {/* Selling links */}
        <div className="rounded-xl border border-zinc-800/60 bg-zinc-900/50 p-5 flex flex-col sm:flex-row gap-5 items-start">
          <div className="flex-1 space-y-5">
            <div>
              <h3 className="font-display text-sm tracking-wide flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-amber-400" /> Your Booking Link
              </h3>
              <p className="mt-1.5 text-sm text-zinc-500">
                Send this to your guests — they choose the pack they want and send a booking
                request. It arrives as <span className="text-amber-400">Pending</span>, credited
                to you, and the festival team confirms within 24 hours.
              </p>
              <div className="mt-3 flex items-center gap-2 flex-wrap">
                <code className="text-xs font-mono text-amber-300 bg-amber-500/10 border border-amber-500/20 px-2.5 py-1.5 rounded-lg break-all">
                  {getBookingUrl(partner.code)}
                </code>
                <button
                  onClick={() => copy("book", getBookingUrl(partner.code))}
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
                  {copiedId === "book" ? "Copied" : "Copy"}
                </button>
              </div>
            </div>
            <div className="pt-4 border-t border-zinc-800/60">
              <p className="text-xs text-zinc-500">
                Prefer the full website? This link opens the packs page, also credited to you:
              </p>
              <div className="mt-2 flex items-center gap-2 flex-wrap">
                <code className="text-[11px] font-mono text-zinc-400 bg-zinc-800/60 border border-zinc-700/40 px-2 py-1 rounded-lg break-all">
                  {getReferralUrl(partner.code)}
                </code>
                <button
                  onClick={() => copy("ref", getReferralUrl(partner.code))}
                  className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] transition cursor-pointer ${
                    copiedId === "ref"
                      ? "text-emerald-400"
                      : "text-zinc-500 hover:text-zinc-300"
                  }`}
                >
                  {copiedId === "ref" ? (
                    <CheckCircle2 className="h-3 w-3" />
                  ) : (
                    <Copy className="h-3 w-3" />
                  )}
                  {copiedId === "ref" ? "Copied" : "Copy"}
                </button>
              </div>
            </div>
          </div>
          {refQr && (
            <div className="shrink-0 text-center">
              <div className="rounded-lg border border-zinc-700/30 bg-zinc-100 p-2 inline-block">
                <img src={refQr} alt="Booking link QR" className="w-28 h-28" />
              </div>
              <p className="mt-1.5 text-[10px] text-zinc-600">Booking link QR</p>
            </div>
          )}
        </div>

        {/* My bookings — guests who booked through this partner's link */}
        <div>
          <h3 className="font-display text-sm tracking-wide mb-1">
            My Bookings ({myBookings.length})
          </h3>
          <p className="text-sm text-zinc-500 mb-4">
            Everyone who booked through your link. Update their status and contact them directly.
          </p>
          {statusError && (
            <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 mb-3">
              <p className="text-sm text-red-300">{statusError}</p>
            </div>
          )}
          {myBookings.length === 0 ? (
            <div className="rounded-xl border border-zinc-800/60 bg-zinc-900/50 px-5 py-10 text-center text-sm text-zinc-600">
              No bookings yet — share your booking link to get started.
            </div>
          ) : (
            <div className="space-y-3">
              {myBookings.map((b) => {
                const waDigits = (b.phone || "").replace(/\D/g, "");
                const statusStyles: Record<string, string> = {
                  pending: "bg-amber-500/15 text-amber-400 border-amber-500/30",
                  confirmed: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
                  "checked-in": "bg-cyan-500/15 text-cyan-400 border-cyan-500/30",
                  declined: "bg-red-500/15 text-red-400 border-red-500/30",
                };
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
                        {b.numPeople > 1 ? ` · ${b.numPeople} people` : ""} ·{" "}
                        {new Date(b.createdAt).toLocaleDateString()}
                        {b.source === "invite" ? " · via invite" : ""}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
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
                          Checked In
                        </span>
                      ) : (
                        <select
                          value={b.status}
                          onChange={(e) =>
                            changeBookingStatus(b.id, e.target.value as BookingStatus)
                          }
                          className={`appearance-none rounded-full px-3 py-1.5 text-[10px] tracking-widest uppercase font-medium border cursor-pointer focus:outline-none ${statusStyles[b.status] ?? statusStyles.pending}`}
                        >
                          <option value="pending">Pending</option>
                          <option value="confirmed">Confirmed</option>
                          <option value="declined">Declined</option>
                        </select>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Generate invites */}
        <div className="rounded-xl border border-zinc-800/60 bg-zinc-900/50 p-5">
          <h3 className="font-display text-sm tracking-wide mb-1">Generate Invite Tickets</h3>
          <p className="text-sm text-zinc-500 mb-4">
            Each invite is a QR code. When your guest scans it and fills in their details, they
            get a confirmed festival ticket — credited to you.
            {quota !== null && (
              <span className="text-amber-400/90">
                {" "}
                Your limit: {used}/{quota} used.
              </span>
            )}
          </p>
          {/* Pack picker — one small card per pack so the details
              (nights, price, category) are always visible */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 mb-4">
            {packs.map((p) => {
              const nights = p.features.find((f) => /night|nuit|noche/i.test(f));
              const active = selectedPackId === p.id;
              return (
                <button
                  key={p.id}
                  onClick={() => setSelectedPackId(p.id)}
                  className={`relative text-left rounded-xl border p-3 transition cursor-pointer ${
                    active
                      ? "border-amber-500 bg-amber-500/10 ring-1 ring-amber-500/50"
                      : "border-zinc-700/60 bg-zinc-800/40 hover:border-zinc-600"
                  }`}
                >
                  {active && (
                    <CheckCircle2 className="absolute top-2 right-2 h-4 w-4 text-amber-400" />
                  )}
                  <p className="text-xs font-semibold text-zinc-100 leading-tight pr-5">
                    {p.name}
                  </p>
                  <p className="mt-0.5 text-[10px] text-zinc-500 uppercase tracking-wide truncate">
                    {nights ?? p.sub}
                    {p.category ? ` · ${p.category}` : ""}
                  </p>
                  <p className="mt-1.5 font-display text-base text-amber-400">
                    {p.price}
                    <span className="text-[10px] text-zinc-500 ml-0.5">
                      {p.currency || "€"}
                    </span>
                  </p>
                </button>
              );
            })}
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              type="number"
              min={1}
              max={20}
              value={count}
              onChange={(e) => setCount(Math.min(20, Math.max(1, parseInt(e.target.value) || 1)))}
              className="w-24 rounded-lg border border-zinc-700/60 bg-zinc-800/50 px-3 py-2.5 text-sm text-zinc-100 focus:outline-none focus:border-amber-500/50 transition"
              title="How many invites"
            />
            <button
              onClick={handleGenerate}
              disabled={generating || !selectedPackId || (remaining !== null && remaining === 0)}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-amber-500 px-5 py-2.5 text-sm font-semibold text-zinc-950 hover:bg-amber-400 transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Plus className="h-4 w-4" />
              {generating ? "Generating…" : `Generate ${count > 1 ? count : ""}`}
            </button>
          </div>
          {genError && <p className="mt-3 text-sm text-red-400">{genError}</p>}
        </div>

        {/* My invites */}
        <div>
          <h3 className="font-display text-sm tracking-wide mb-4">
            My Invites ({myInvites.length})
          </h3>
          {myInvites.length === 0 ? (
            <div className="rounded-xl border border-zinc-800/60 bg-zinc-900/50 px-5 py-14 text-center text-sm text-zinc-600">
              No invites yet — generate your first one above.
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {myInvites.map((inv) => (
                <div
                  key={inv.id}
                  className={`rounded-xl border bg-zinc-900/50 p-3 text-center transition ${
                    inv.used ? "border-zinc-800/30 opacity-70" : "border-zinc-800/60"
                  }`}
                >
                  <div className="flex justify-center mb-2">
                    {qrUrls[inv.id] ? (
                      <div className="rounded-lg border border-zinc-700/30 bg-zinc-100 p-1.5">
                        <img src={qrUrls[inv.id]} alt={`QR ${inv.code}`} className="w-20 h-20" />
                      </div>
                    ) : (
                      <div className="w-[92px] h-[92px] rounded-lg bg-zinc-800/50 grid place-items-center">
                        <QrCode className="h-6 w-6 text-zinc-700" />
                      </div>
                    )}
                  </div>
                  <code className="text-[11px] font-mono text-amber-400/80">{inv.code}</code>
                  <p className="text-[10px] text-zinc-500 mt-0.5 truncate">{inv.packName}</p>
                  {inv.used ? (
                    <p className="mt-1 text-[10px] text-emerald-400 inline-flex items-center gap-1">
                      <CheckCircle2 className="h-3 w-3" />
                      {inv.redeemedBy ? `Used by ${inv.redeemedBy}` : "Redeemed"}
                    </p>
                  ) : (
                    <div className="mt-1.5 flex items-center justify-center gap-1">
                      <button
                        onClick={() => copy(inv.id, getRedeemUrl(inv.code))}
                        className={`p-1.5 rounded-lg transition cursor-pointer ${
                          copiedId === inv.id
                            ? "text-emerald-400 bg-emerald-500/10"
                            : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/60"
                        }`}
                        title="Copy invite link"
                      >
                        {copiedId === inv.id ? (
                          <CheckCircle2 className="h-3.5 w-3.5" />
                        ) : (
                          <Link2 className="h-3.5 w-3.5" />
                        )}
                      </button>
                      <button
                        onClick={() => downloadQr(inv.code)}
                        className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/60 transition cursor-pointer"
                        title="Download QR"
                      >
                        <Download className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
