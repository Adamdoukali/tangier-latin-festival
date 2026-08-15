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
  FileText,
} from "lucide-react";
import {
  getInviteByCode,
  getPackById,
  redeemInvite,
  ticketUrl,
  type Invite,
  type Pack,
  type Booking,
} from "@/lib/admin-store";
import { generateTicketPdf } from "@/lib/pdf-generator";
import { sendFormNotification, bookingAutoResponse } from "@/lib/form-notify";

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
    guests: [{ firstName: "", lastName: "" }],
    email: "",
    phone: "",
    country: "Morocco",
    arrival: "",
    departure: "",
    notes: "",
  });

  // Double rooms and couple passes include exactly two people —
  // both client names are required.
  const isTwoPersonPack = (p: Pack) => /double|doble|couple|pareja/i.test(p.name);
  const twoPerson = pack ? isTwoPersonPack(pack) : false;

  // Look up invite on load
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!code) {
        setError("No invite code provided.");
        return;
      }
      const found = await getInviteByCode(code);
      if (cancelled) return;
      if (!found) {
        setError("This invite code is invalid or does not exist.");
        return;
      }
      if (found.used) {
        setError("This invite has already been redeemed.");
        return;
      }
      const foundPack = await getPackById(found.packId);
      if (cancelled) return;
      if (!foundPack) {
        setError("The pack for this invite is no longer available.");
        return;
      }
      setInvite(found);
      setPack(foundPack);
      // Two-person packs (double room / couple pass) need both names.
      if (isTwoPersonPack(foundPack)) {
        setForm((f) => ({
          ...f,
          guests: [
            { firstName: "", lastName: "" },
            { firstName: "", lastName: "" },
          ],
        }));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [code]);

  const setGuestField = (idx: number, field: "firstName" | "lastName", value: string) =>
    setForm((f) => ({
      ...f,
      guests: f.guests.map((g, i) => (i === idx ? { ...g, [field]: value } : g)),
    }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code || !invite) return;
    if (
      form.guests.some((g) => !g.firstName.trim() || !g.lastName.trim()) ||
      !form.email.trim() ||
      !form.phone.trim() ||
      !form.arrival.trim() ||
      !form.departure.trim()
    )
      return;

    setSubmitting(true);
    // Small delay for UX
    await new Promise((r) => setTimeout(r, 600));

    const customerName = form.guests
      .map((g) => `${g.firstName.trim()} ${g.lastName.trim()}`)
      .join(" & ");

    const result = await redeemInvite(code, {
      customerName,
      email: form.email,
      phone: form.phone,
      country: form.country,
      arrivalDate: form.arrival,
      departureDate: form.departure,
      numPeople: form.guests.length,
      danceLevel: "",
      notes: form.notes,
    });

    if (result.success) {
      setSuccess(true);
      setBooking(result.booking);
      // Notify the festival team + 24h auto-reply to the guest
      // (the redemption arrives as PENDING until the team confirms).
      sendFormNotification({
        subject: `Invite redeemed (pending): ${result.booking.packName} — ${result.booking.customerName}`,
        guestSubject: "Your reservation request — Tangier International Latin Festival",
        lang: "en",
        fields: {
          name: result.booking.customerName,
          email: form.email,
          Pack: result.booking.packName,
          "Invite code": code ?? "",
          "Ticket code": result.booking.ticketCode,
          Phone: form.phone,
          Country: form.country,
          Notes: form.notes,
        },
        autoresponse: bookingAutoResponse("en", {
          code: result.booking.ticketCode,
          url: ticketUrl(result.booking.ticketCode),
        }),
      }).catch(() => {});
      // QR of the guest's ticket page — shows "pending" now and becomes
      // their valid ticket automatically once the booking is confirmed.
      try {
        const url = await QRCode.toDataURL(ticketUrl(result.booking.ticketCode), {
          width: 300,
          margin: 2,
          color: { dark: "#18181b", light: "#fafafa" },
        });
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
              Request Received!
            </h1>
            <p className="mt-2 text-sm text-zinc-400">
              Your invite has been registered. The festival team confirms within
              24 hours — you'll automatically receive your ticket by email.
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
                  <span className="inline-flex items-center gap-1 mt-0.5 text-sm font-medium text-amber-400">
                    <Star className="h-3.5 w-3.5" /> Pending
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
                  <p className="text-[10px] tracking-widest uppercase text-zinc-600 text-center">
                    Save this QR — it becomes your valid ticket
                    <br />
                    automatically once confirmed
                  </p>
                  <div className="flex flex-col sm:flex-row gap-2.5 mt-2 w-full">
                    <button
                      type="button"
                      onClick={() => booking && generateTicketPdf(booking, qrDataUrl, "en")}
                      className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold bg-amber-500 hover:bg-amber-400 text-zinc-950 transition cursor-pointer shadow"
                    >
                      <Download className="h-3.5 w-3.5" /> Download PDF Ticket
                    </button>
                    <a
                      href="/Program-en.pdf"
                      download="Tangier-Latin-Festival-Programme-EN.pdf"
                      target="_blank"
                      rel="noreferrer"
                      className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium border border-amber-500/30 bg-zinc-900 text-amber-400 hover:bg-zinc-850 transition cursor-pointer"
                    >
                      <FileText className="h-3.5 w-3.5" /> Download Programme
                    </a>
                  </div>

                  <button
                    type="button"
                    onClick={downloadQr}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium bg-zinc-900 text-zinc-400 hover:text-zinc-200 transition cursor-pointer mt-1"
                  >
                    <Sparkles className="h-3 w-3 text-amber-500" /> Save Image (PNG)
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
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-12 text-gray-900">
      <div className="max-w-lg w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/10 px-4 py-1.5 text-xs tracking-[0.25em] uppercase text-amber-600 mb-4 font-semibold">
            <Ticket className="h-3.5 w-3.5" />
            You've Been Invited
          </div>
          <h1 className="font-display text-3xl md:text-4xl text-gray-900 tracking-wide font-bold">
            Tangier International
            <br />
            <span className="text-amber-600">Latin Festival</span>
          </h1>
          <p className="mt-3 text-sm text-gray-500 flex items-center justify-center gap-2 font-medium">
            <Calendar className="h-4 w-4 text-amber-500" />
            January 07–11, 2027
            <span className="text-gray-300">·</span>
            <MapPin className="h-4 w-4 text-amber-500" />
            Tangier, Morocco
          </p>
        </div>

        {/* Pack info card */}
        <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-5 mb-6 shadow-sm">
          <div className="flex items-start gap-4">
            <div className="h-11 w-11 rounded-xl bg-amber-500 grid place-items-center shrink-0 shadow-sm">
              <Package className="h-5 w-5 text-slate-950" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h2 className="font-display text-lg text-gray-900 font-bold">{pack.name}</h2>
                {pack.popular && (
                  <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full bg-amber-500 text-slate-950 text-[9px] tracking-widest uppercase font-bold">
                    <Star className="h-2.5 w-2.5 fill-current" /> Popular
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-500">{pack.sub}</p>
              <div className="mt-2">
                <span className="font-display text-2xl text-amber-600 font-bold">{pack.price}</span>
                <span className="text-xs text-gray-500 ml-1">{pack.currency || "€"}</span>
              </div>
              <ul className="mt-3 space-y-1">
                {pack.features.map((f, i) => (
                  <li
                    key={i}
                    className="flex items-start gap-2 text-xs text-gray-600"
                  >
                    <Check className="h-3.5 w-3.5 text-amber-500 mt-0.5 shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-amber-200 text-center">
            <code className="text-xs font-mono text-amber-700 bg-amber-100 px-2.5 py-1 rounded-md font-bold">
              Invite: {invite.code}
            </code>
          </div>
        </div>

        {/* Registration form */}
        <form
          onSubmit={handleSubmit}
          className="rounded-2xl border border-gray-200 bg-white p-6 sm:p-8 shadow-xl"
        >
          <h3 className="font-display text-xl text-gray-900 mb-1 font-bold">
            Complete Your Registration
          </h3>
          <p className="text-xs text-gray-500 mb-6">
            Fill in your details to confirm your spot at the festival.
          </p>

          <div className="space-y-4">
            {/* First Name & Last Name */}
            {form.guests.map((g, idx) => (
              <div key={idx} className="space-y-2">
                {form.guests.length > 1 && (
                  <p className="text-xs font-bold tracking-wider uppercase text-amber-600">
                    Guest {idx + 1}
                  </p>
                )}
                <div className="grid sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs tracking-widest uppercase text-gray-700 mb-1.5 font-medium">
                      First Name <span className="text-red-600">*</span>
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
                    <label className="block text-xs tracking-widest uppercase text-gray-700 mb-1.5 font-medium">
                      Last Name <span className="text-red-600">*</span>
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

            {/* Email */}
            <div>
              <label className="block text-xs tracking-widest uppercase text-gray-700 mb-1.5 font-medium">
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

            {/* Phone & Country */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs tracking-widest uppercase text-gray-700 mb-1.5 font-medium">
                  Phone <span className="text-red-600">*</span>
                </label>
                <div className="flex">
                  <PhoneCountrySelect className="rounded-l-lg border border-gray-300 border-r-0 bg-gray-50 px-2 max-w-[110px] text-gray-900 focus:outline-none focus:border-amber-500" />
                  <input
                    type="tel"
                    required
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    placeholder="Number"
                    className="w-full rounded-r-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-amber-500 transition"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs tracking-widest uppercase text-gray-700 mb-1.5 font-medium">
                  Country <span className="text-red-600">*</span>
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

            {/* Arrival & Departure (Mandatory) */}
            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs tracking-widest uppercase text-gray-700 mb-1.5 font-medium">
                  Arrival Date (Going) <span className="text-red-600">*</span>
                </label>
                <input
                  type="date"
                  required
                  value={form.arrival}
                  min="2027-01-01"
                  max="2027-01-31"
                  onChange={(e) => setForm({ ...form, arrival: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:border-amber-500 transition"
                />
              </div>
              <div>
                <label className="block text-xs tracking-widest uppercase text-gray-700 mb-1.5 font-medium">
                  Departure Date (Return) <span className="text-red-600">*</span>
                </label>
                <input
                  type="date"
                  required
                  value={form.departure}
                  min={form.arrival || "2027-01-01"}
                  max="2027-02-15"
                  onChange={(e) => setForm({ ...form, departure: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:border-amber-500 transition"
                />
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-xs tracking-widest uppercase text-gray-700 mb-1.5 font-medium">
                Special Requests (optional)
              </label>
              <textarea
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                placeholder="Any dietary requirements, accessibility needs..."
                rows={2}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-amber-500 transition resize-none"
              />
            </div>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={submitting}
            className="mt-6 w-full inline-flex items-center justify-center gap-2 rounded-xl bg-amber-500 px-6 py-4 text-sm font-bold text-slate-950 uppercase tracking-wider hover:bg-amber-400 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shadow-md"
          >
            {submitting ? (
              <>
                <div className="h-4 w-4 border-2 border-slate-950/30 border-t-slate-950 rounded-full animate-spin" />
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
            className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 transition"
          >
            <ArrowLeft className="h-4 w-4" />
            Visit the Festival Website
          </Link>
        </div>
      </div>
    </div>
  );
}
