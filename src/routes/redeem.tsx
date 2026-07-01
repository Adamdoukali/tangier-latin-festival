import { createFileRoute, Link, useSearch } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { PhoneCountrySelect } from "@/components/PhoneCountrySelect";
import { z } from "zod";
import QRCode from "qrcode";
import {
  Ticket,
  Check,
  MapPin,
  Calendar,
  Package,
  AlertCircle,
  CheckCircle2,
  ArrowLeft,
  Download,
  Sparkles,
  Star,
} from "lucide-react";
import {
  getInviteByCode,
  getPackById,
  redeemInvite,
  type Invite,
  type Pack,
  type Booking,
} from "@/lib/admin-store";

const redeemSearchSchema = z.object({
  code: z.string().optional(),
});

export const Route = createFileRoute("/redeem")({
  validateSearch: (search) => redeemSearchSchema.parse(search),
  component: RedeemPage,
});

function RedeemPage() {
  const { code } = useSearch({ from: "/redeem" });
  const [invite, setInvite] = useState<Invite | null>(null);
  const [pack, setPack] = useState<Pack | null>(null);
  const [error, setError] = useState<string>("");
  const [success, setSuccess] = useState(false);
  const [booking, setBooking] = useState<Booking | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    customerName: "",
    email: "",
    phone: "",
    country: "",
    numPeople: 1,
    danceLevel: "Beginner",
    notes: "",
  });

  // Look up invite on load
  useEffect(() => {
    if (!code) {
      setError("No invite code provided.");
      return;
    }
    const found = getInviteByCode(code);
    if (!found) {
      setError("This invite code is invalid or does not exist.");
      return;
    }
    if (found.used) {
      setError("This invite has already been redeemed.");
      return;
    }
    const foundPack = getPackById(found.packId);
    if (!foundPack) {
      setError("The pack for this invite is no longer available.");
      return;
    }
    setInvite(found);
    setPack(foundPack);
  }, [code]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code || !invite) return;
    if (!form.customerName.trim() || !form.email.trim()) return;

    setSubmitting(true);
    // Small delay for UX
    await new Promise((r) => setTimeout(r, 600));

    const result = redeemInvite(code, form);
    if (result.success) {
      setSuccess(true);
      setBooking(result.booking);
      // Generate QR for the ticket
      try {
        const url = await QRCode.toDataURL(
          `TLF-TICKET:${result.booking.ticketCode}|${result.booking.customerName}|${result.booking.packName}`,
          {
            width: 300,
            margin: 2,
            color: { dark: "#18181b", light: "#fafafa" },
          }
        );
        setQrDataUrl(url);
      } catch {
        // fail silently
      }
    } else {
      setError(result.error);
    }
    setSubmitting(false);
  };

  const downloadQr = () => {
    if (!qrDataUrl || !booking) return;
    const a = document.createElement("a");
    a.href = qrDataUrl;
    a.download = `ticket-${booking.ticketCode}.png`;
    a.click();
  };

  // ── Error State ──
  if (error) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center px-4">
        <div className="max-w-md w-full text-center">
          <div className="mx-auto w-16 h-16 rounded-full bg-red-500/15 grid place-items-center mb-6">
            <AlertCircle className="h-8 w-8 text-red-400" />
          </div>
          <h1 className="font-display text-2xl text-zinc-100 tracking-wide">
            Invite Error
          </h1>
          <p className="mt-3 text-sm text-zinc-400">{error}</p>
          <Link
            to="/"
            className="mt-8 inline-flex items-center gap-2 rounded-full bg-zinc-800 px-6 py-3 text-sm text-zinc-300 hover:bg-zinc-700 transition"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Festival
          </Link>
        </div>
      </div>
    );
  }

  // ── Success State ──
  if (success && booking) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center px-4 py-12">
        <div className="max-w-md w-full">
          {/* Success header */}
          <div className="text-center mb-8">
            <div className="mx-auto w-16 h-16 rounded-full bg-emerald-500/15 grid place-items-center mb-5 animate-bounce">
              <CheckCircle2 className="h-8 w-8 text-emerald-400" />
            </div>
            <h1 className="font-display text-2xl text-zinc-100 tracking-wide">
              You're In!
            </h1>
            <p className="mt-2 text-sm text-zinc-400">
              Your invite has been redeemed. Here's your festival ticket.
            </p>
          </div>

          {/* Ticket card */}
          <div className="relative rounded-2xl border border-zinc-800/60 bg-zinc-900/80 overflow-hidden">
            {/* Gold accent top */}
            <div className="h-1.5 bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-600" />

            <div className="p-6">
              {/* Event info */}
              <div className="flex items-center gap-2 mb-1">
                <Sparkles className="h-4 w-4 text-amber-400" />
                <span className="text-[10px] tracking-[0.3em] uppercase text-amber-400 font-medium">
                  Tangier International Latin Festival
                </span>
              </div>
              <p className="text-xs text-zinc-500 flex items-center gap-1.5 mt-1">
                <Calendar className="h-3 w-3" /> January 07–11, 2027
                <span className="text-zinc-700 mx-1">·</span>
                <MapPin className="h-3 w-3" /> Tangier, Morocco
              </p>

              {/* Divider */}
              <div className="my-5 border-t border-dashed border-zinc-700/60 relative">
                <div className="absolute -left-9 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-zinc-950" />
                <div className="absolute -right-9 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-zinc-950" />
              </div>

              {/* Ticket details */}
              <div className="grid grid-cols-2 gap-4 mb-5">
                <div>
                  <p className="text-[10px] tracking-widest uppercase text-zinc-500">
                    Guest
                  </p>
                  <p className="mt-0.5 text-sm font-medium text-zinc-200">
                    {booking.customerName}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] tracking-widest uppercase text-zinc-500">
                    Pack
                  </p>
                  <p className="mt-0.5 text-sm font-medium text-amber-400">
                    {booking.packName}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] tracking-widest uppercase text-zinc-500">
                    Ticket Code
                  </p>
                  <code className="mt-0.5 text-sm font-mono font-medium text-zinc-200">
                    {booking.ticketCode}
                  </code>
                </div>
                <div>
                  <p className="text-[10px] tracking-widest uppercase text-zinc-500">
                    Status
                  </p>
                  <span className="inline-flex items-center gap-1 mt-0.5 text-sm font-medium text-emerald-400">
                    <CheckCircle2 className="h-3.5 w-3.5" /> Confirmed
                  </span>
                </div>
              </div>

              {/* QR Code */}
              {qrDataUrl && (
                <div className="flex flex-col items-center gap-3 pt-4 border-t border-zinc-800/60">
                  <div className="rounded-xl border border-zinc-700/30 bg-zinc-100 p-3 inline-block">
                    <img
                      src={qrDataUrl}
                      alt="Ticket QR Code"
                      className="w-40 h-40"
                    />
                  </div>
                  <p className="text-[10px] tracking-widest uppercase text-zinc-600">
                    Present this QR at the entrance
                  </p>
                  <button
                    onClick={downloadQr}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-medium bg-amber-500/15 text-amber-400 hover:bg-amber-500/25 transition cursor-pointer"
                  >
                    <Download className="h-3.5 w-3.5" /> Download QR
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Back link */}
          <div className="mt-6 text-center">
            <Link
              to="/"
              className="inline-flex items-center gap-2 text-sm text-zinc-500 hover:text-zinc-300 transition"
            >
              <ArrowLeft className="h-4 w-4" />
              Visit the Festival Website
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // ── Loading ──
  if (!invite || !pack) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="text-zinc-500 text-sm">Loading invite...</div>
      </div>
    );
  }

  // ── Registration Form ──
  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center px-4 py-12">
      <div className="max-w-lg w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/10 px-4 py-1.5 text-xs tracking-[0.25em] uppercase text-amber-400 mb-4">
            <Ticket className="h-3.5 w-3.5" />
            You've Been Invited
          </div>
          <h1 className="font-display text-3xl md:text-4xl text-zinc-100 tracking-wide">
            Tangier International
            <br />
            <span className="text-amber-400">Latin Festival</span>
          </h1>
          <p className="mt-3 text-sm text-zinc-400 flex items-center justify-center gap-2">
            <Calendar className="h-4 w-4 text-amber-500/60" />
            January 07–11, 2027
            <span className="text-zinc-700">·</span>
            <MapPin className="h-4 w-4 text-amber-500/60" />
            Tangier, Morocco
          </p>
        </div>

        {/* Pack info card */}
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-5 mb-6">
          <div className="flex items-start gap-4">
            <div className="h-11 w-11 rounded-lg bg-gradient-to-br from-amber-500 to-amber-700 grid place-items-center shrink-0">
              <Package className="h-5 w-5 text-white" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h2 className="font-display text-lg text-zinc-100">{pack.name}</h2>
                {pack.popular && (
                  <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-amber-500/15 text-amber-400 text-[9px] tracking-widest uppercase font-medium">
                    <Star className="h-2.5 w-2.5" /> Popular
                  </span>
                )}
              </div>
              <p className="text-xs text-zinc-500">{pack.sub}</p>
              <div className="mt-2">
                <span className="font-display text-2xl text-amber-400">{pack.price}</span>
                <span className="text-xs text-zinc-500 ml-1">MAD</span>
              </div>
              <ul className="mt-3 space-y-1">
                {pack.features.map((f, i) => (
                  <li
                    key={i}
                    className="flex items-start gap-2 text-xs text-zinc-400"
                  >
                    <Check className="h-3 w-3 text-amber-500/60 mt-0.5 shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-amber-500/10 text-center">
            <code className="text-xs font-mono text-amber-400/60 bg-amber-500/10 px-2 py-0.5 rounded">
              Invite: {invite.code}
            </code>
          </div>
        </div>

        {/* Registration form */}
        <form
          onSubmit={handleSubmit}
          className="rounded-xl border border-zinc-800/60 bg-zinc-900/80 p-6"
        >
          <h3 className="font-display text-lg text-zinc-100 mb-1">
            Complete Your Registration
          </h3>
          <p className="text-xs text-zinc-500 mb-6">
            Fill in your details to confirm your spot at the festival.
          </p>

          <div className="space-y-4">
            {/* Name */}
            <div>
              <label className="block text-xs tracking-widest uppercase text-zinc-500 mb-1.5">
                Full Name <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                required
                value={form.customerName}
                onChange={(e) =>
                  setForm({ ...form, customerName: e.target.value })
                }
                placeholder="Your full name"
                className="w-full rounded-lg border border-zinc-700/60 bg-zinc-800/50 px-3 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-amber-500/50 transition"
              />
            </div>

            {/* Email */}
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

            {/* Phone & Country */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs tracking-widest uppercase text-zinc-500 mb-1.5">
                  Phone
                </label>
                <div className="flex">
                  <PhoneCountrySelect className="rounded-l-lg border border-zinc-700/60 border-r-0 bg-zinc-800/50 px-2 max-w-[110px] text-zinc-100 focus:outline-none focus:border-amber-500/50" />
                  <input
                    type="tel"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    placeholder="Number"
                    className="w-full rounded-r-lg border border-zinc-700/60 bg-zinc-800/50 px-3 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-amber-500/50 transition"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs tracking-widest uppercase text-zinc-500 mb-1.5">
                  Country
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

            {/* People & Level */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs tracking-widest uppercase text-zinc-500 mb-1.5">
                  Number of People
                </label>
                <input
                  type="number"
                  min={1}
                  value={form.numPeople}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      numPeople: parseInt(e.target.value) || 1,
                    })
                  }
                  className="w-full rounded-lg border border-zinc-700/60 bg-zinc-800/50 px-3 py-2.5 text-sm text-zinc-100 focus:outline-none focus:border-amber-500/50 transition"
                />
              </div>
              <div>
                <label className="block text-xs tracking-widest uppercase text-zinc-500 mb-1.5">
                  Dance Level
                </label>
                <select
                  value={form.danceLevel}
                  onChange={(e) =>
                    setForm({ ...form, danceLevel: e.target.value })
                  }
                  className="w-full rounded-lg border border-zinc-700/60 bg-zinc-800/50 px-3 py-2.5 text-sm text-zinc-100 focus:outline-none focus:border-amber-500/50 transition cursor-pointer"
                >
                  <option value="Beginner">Beginner</option>
                  <option value="Intermediate">Intermediate</option>
                  <option value="Advanced">Advanced</option>
                  <option value="Professional">Professional</option>
                </select>
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-xs tracking-widest uppercase text-zinc-500 mb-1.5">
                Special Requests (optional)
              </label>
              <textarea
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                placeholder="Any dietary requirements, accessibility needs..."
                rows={2}
                className="w-full rounded-lg border border-zinc-700/60 bg-zinc-800/50 px-3 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-amber-500/50 transition resize-none"
              />
            </div>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={submitting || !form.customerName.trim() || !form.email.trim()}
            className="mt-6 w-full inline-flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-amber-500 to-amber-600 px-6 py-3.5 text-sm font-bold text-zinc-950 hover:from-amber-400 hover:to-amber-500 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shadow-lg shadow-amber-500/20"
          >
            {submitting ? (
              <>
                <div className="h-4 w-4 border-2 border-zinc-950/30 border-t-zinc-950 rounded-full animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <CheckCircle2 className="h-4 w-4" />
                Confirm My Registration
              </>
            )}
          </button>
        </form>

        {/* Back link */}
        <div className="mt-6 text-center">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-sm text-zinc-500 hover:text-zinc-300 transition"
          >
            <ArrowLeft className="h-4 w-4" />
            Visit the Festival Website
          </Link>
        </div>
      </div>
    </div>
  );
}
