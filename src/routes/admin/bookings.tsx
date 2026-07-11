import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect, useCallback } from "react";
import QRCode from "qrcode";
import {
  Plus,
  Search,
  X,
  Check,
  QrCode,
  Trash2,
  ChevronDown,
  Download,
  Copy,
  Link2,
  Mail,
  Phone,
} from "lucide-react";
import {
  getBookings,
  addBooking,
  updateBookingStatus,
  deleteBooking,
  getPacks,
  getCollaborators,
  packLabel,
  ticketUrl,
  type Booking,
  type BookingStatus,
  type Collaborator,
  type Pack,
} from "@/lib/admin-store";
import { sendFormNotification, ticketConfirmationEmail } from "@/lib/form-notify";
import { translateDynamicText, type Language } from "@/lib/translations";

export const Route = createFileRoute("/admin/bookings")({
  component: AdminBookings,
});

function AdminBookings() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [packs, setPacks] = useState<Pack[]>([]);
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<BookingStatus | "all">("all");
  const [showForm, setShowForm] = useState(false);
  const [qrBooking, setQrBooking] = useState<Booking | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string>("");
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [statusError, setStatusError] = useState("");
  const [autoEmail, setAutoEmail] = useState<"sending" | "sent" | "failed" | null>(null);

  const reload = useCallback(async () => {
    const [b, p, c] = await Promise.all([getBookings(), getPacks(), getCollaborators()]);
    setBookings(b);
    setPacks(p);
    setCollaborators(c);
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  // Form state
  const [form, setForm] = useState({
    packId: "",
    customerName: "",
    email: "",
    phone: "",
    country: "",
    numPeople: 1,
    danceLevel: "Beginner",
    arrival: "",
    departure: "",
    notes: "",
    status: "pending" as BookingStatus,
  });

  const resetForm = () => {
    setForm({
      packId: packs[0]?.id ?? "",
      customerName: "",
      email: "",
      phone: "",
      country: "",
      numPeople: 1,
      danceLevel: "Beginner",
      arrival: "",
      departure: "",
      notes: "",
      status: "pending",
    });
  };

  const handleCreate = async () => {
    if (!form.customerName.trim() || !form.packId) return;
    const pack = packs.find((p) => p.id === form.packId);
    await addBooking({
      ...form,
      packName: packLabel(pack),
      arrivalDate: form.arrival || null,
      departureDate: form.departure || null,
      source: "manual",
    });
    setShowForm(false);
    await reload();
  };

  const handleStatusChange = async (id: string, status: BookingStatus) => {
    setStatusError("");
    let updated: Booking | null = null;
    try {
      updated = await updateBookingStatus(id, status);
    } catch (e) {
      setStatusError(e instanceof Error ? e.message : String(e));
    }
    await reload();

    // Confirming a booking = the guest gets their ticket. Automatically:
    // 1) email them the ticket link (QR page) and 2) open the QR modal
    // with one-click WhatsApp / email buttons as a backup channel.
    if (status === "confirmed" && updated) {
      showQr(updated);
      if (updated.email) {
        setAutoEmail("sending");
        // Guest's own language: what they booked in, else their partner's
        const partner = updated.collaboratorId
          ? collaborators.find((c) => c.id === updated.collaboratorId)
          : undefined;
        const bLang = ((updated.lang || partner?.language || "en") as Language) ?? "en";
        const tUrl =
          ticketUrl(updated.ticketCode) + (bLang !== "en" ? `&lang=${bLang}` : "");
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
          },
          autoresponse: mail.body,
        })
          .then((ok) => setAutoEmail(ok ? "sent" : "failed"))
          .catch(() => setAutoEmail("failed"));
      } else {
        setAutoEmail(null);
      }
    }
  };

  // Prefilled WhatsApp message with the guest's ticket link, in their language
  const waTicketLink = (b: Booking): string | null => {
    const digits = (b.phone || "").replace(/\D/g, "");
    if (!digits) return null;
    const firstName = b.customerName.split(/\s|&/)[0] || b.customerName;
    const partner = b.collaboratorId
      ? collaborators.find((c) => c.id === b.collaboratorId)
      : undefined;
    const bLang = (b.lang || partner?.language || "en") as Language;
    const tUrl = ticketUrl(b.ticketCode) + (bLang !== "en" ? `&lang=${bLang}` : "");
    const pack = translateDynamicText(b.packName, bLang);
    const text =
      bLang === "fr"
        ? `Bonjour ${firstName} ! 🎉 Votre réservation pour le Tangier International Latin Festival est CONFIRMÉE.\n\n🎫 Votre billet (présentez le QR à l'entrée) :\n${tUrl}\n\nCode : ${b.ticketCode} · ${pack}\nRendez-vous du 07 au 11 janvier 2027 au Kenzi Solazur, Tanger !`
        : bLang === "es"
          ? `¡Hola ${firstName}! 🎉 Tu reserva para el Tangier International Latin Festival está CONFIRMADA.\n\n🎫 Tu entrada (muestra el QR en la entrada):\n${tUrl}\n\nCódigo: ${b.ticketCode} · ${pack}\n¡Nos vemos del 07 al 11 de enero de 2027 en el Kenzi Solazur, Tánger!`
          : `Hello ${firstName}! 🎉 Your booking for the Tangier International Latin Festival is CONFIRMED.\n\n🎫 Your ticket (show the QR at check-in):\n${tUrl}\n\nCode: ${b.ticketCode} · ${pack}\nSee you January 07–11, 2027 at the Kenzi Solazur, Tangier!`;
    return `https://wa.me/${digits}?text=${encodeURIComponent(text)}`;
  };

  const handleDelete = async (id: string) => {
    await deleteBooking(id);
    setDeleteConfirm(null);
    await reload();
  };

  const showQr = async (booking: Booking) => {
    setQrBooking(booking);
    try {
      // The QR encodes the public ticket page, so scanning it with any
      // phone camera opens /ticket and shows valid / pending / already used.
      const url = await QRCode.toDataURL(ticketUrl(booking.ticketCode), {
        width: 300,
        margin: 2,
        color: { dark: "#18181b", light: "#fafafa" },
      });
      setQrDataUrl(url);
    } catch {
      setQrDataUrl("");
    }
  };

  const downloadQr = () => {
    if (!qrDataUrl || !qrBooking) return;
    const a = document.createElement("a");
    a.href = qrDataUrl;
    a.download = `ticket-${qrBooking.ticketCode}.png`;
    a.click();
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
  };

  // Opens the admin's email app with a ready-to-send message to the customer,
  // worded according to the booking status.
  const emailCustomer = (b: Booking) => {
    const firstName = b.customerName.split(/\s|&/)[0] || b.customerName;
    let subject: string;
    let body: string;
    if (b.status === "pending") {
      subject = `Your Tangier Latin Festival booking request (${b.ticketCode})`;
      body =
        `Hello ${firstName},\n\n` +
        `Thank you for your booking request for the "${b.packName}" pack at the Tangier International Latin Festival (January 07-11, 2027).\n\n` +
        `We are reviewing it and will respond within 24 hours to confirm your booking and send you the payment details.\n\n` +
        `Your reference: ${b.ticketCode}\n\n` +
        `Warm regards,\nTangier International Latin Festival team\ncontact@tangierlatinfestival.com · +212 6 64 01 02 79`;
    } else if (b.status === "declined") {
      subject = `About your Tangier Latin Festival booking request (${b.ticketCode})`;
      body =
        `Hello ${firstName},\n\n` +
        `Thank you for your interest in the Tangier International Latin Festival. Unfortunately we were not able to confirm your booking request for the "${b.packName}" pack.\n\n` +
        `If you believe this is a mistake or would like to book a different pack, just reply to this email or contact us on WhatsApp and we'll be happy to help.\n\n` +
        `Warm regards,\nTangier International Latin Festival team\ncontact@tangierlatinfestival.com · +212 6 64 01 02 79`;
    } else {
      subject = `Your Tangier Latin Festival booking is confirmed! (${b.ticketCode})`;
      body =
        `Hello ${firstName},\n\n` +
        `Great news — your booking for the "${b.packName}" pack at the Tangier International Latin Festival (January 07-11, 2027, Kenzi Solazur Hotel) is confirmed!\n\n` +
        `Your ticket (with QR code): ${ticketUrl(b.ticketCode)}\n` +
        `Ticket code: ${b.ticketCode}\n` +
        `Guests: ${b.customerName} (${b.numPeople} ${b.numPeople > 1 ? "people" : "person"})\n\n` +
        `Open the link and show the QR code at check-in.\n\n` +
        `See you on the dance floor!\nTangier International Latin Festival team\ncontact@tangierlatinfestival.com · +212 6 64 01 02 79`;
    }
    window.location.href = `mailto:${encodeURIComponent(b.email)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };

  const filtered = bookings
    .filter((b) => statusFilter === "all" || b.status === statusFilter)
    .filter(
      (b) =>
        !search ||
        b.customerName.toLowerCase().includes(search.toLowerCase()) ||
        b.ticketCode.toLowerCase().includes(search.toLowerCase()) ||
        b.email.toLowerCase().includes(search.toLowerCase())
    )
    .sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

  const statusStyles: Record<string, string> = {
    pending: "bg-amber-100 text-amber-600 border-amber-200",
    confirmed: "bg-emerald-100 text-emerald-600 border-emerald-200",
    "checked-in": "bg-cyan-100 text-cyan-700 border-cyan-200",
    declined: "bg-red-100 text-red-600 border-red-200",
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-2xl tracking-wide text-gray-900">
            Booking Management
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            Manage tickets, change statuses, and generate QR codes.
          </p>
        </div>
        <button
          onClick={() => {
            resetForm();
            setShowForm(true);
          }}
          className="inline-flex items-center gap-2 rounded-lg bg-amber-500 px-4 py-2.5 text-sm font-semibold text-zinc-950 hover:bg-amber-400 transition cursor-pointer self-start"
        >
          <Plus className="h-4 w-4" /> Add Booking
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, email, or ticket code..."
            className="w-full rounded-lg border border-gray-300 bg-white pl-9 pr-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-amber-500 transition"
          />
        </div>
        <div className="relative">
          <select
            value={statusFilter}
            onChange={(e) =>
              setStatusFilter(e.target.value as BookingStatus | "all")
            }
            className="appearance-none rounded-lg border border-gray-300 bg-white px-4 pr-8 py-2.5 text-sm text-gray-900 focus:outline-none focus:border-amber-500 transition cursor-pointer"
          >
            <option value="all">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="confirmed">Confirmed</option>
            <option value="checked-in">Checked In</option>
            <option value="declined">Declined</option>
          </select>
          <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500 pointer-events-none" />
        </div>
      </div>

      {/* Status change error (e.g. database constraint) */}
      {statusError && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 flex items-start justify-between gap-3">
          <p className="text-sm text-red-700">{statusError}</p>
          <button
            onClick={() => setStatusError("")}
            className="text-red-600/70 hover:text-red-700 transition cursor-pointer shrink-0"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Table */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        {filtered.length === 0 ? (
          <div className="px-5 py-16 text-center text-sm text-gray-400">
            {bookings.length === 0
              ? 'No bookings yet. Click "Add Booking" to create one.'
              : "No bookings match your filters."}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-xs tracking-widest uppercase text-gray-500">
                  <th className="px-5 py-3 text-left font-medium">Customer</th>
                  <th className="px-5 py-3 text-left font-medium">Ticket</th>
                  <th className="px-5 py-3 text-left font-medium">Pack</th>
                  <th className="px-5 py-3 text-left font-medium">Source</th>
                  <th className="px-5 py-3 text-left font-medium">Status</th>
                  <th className="px-5 py-3 text-left font-medium">Date</th>
                  <th className="px-5 py-3 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map((b) => (
                  <tr
                    key={b.id}
                    className="hover:bg-gray-50 transition"
                  >
                    <td className="px-5 py-3">
                      <p className="font-medium text-gray-800">{b.customerName}</p>
                      <p className="text-xs text-gray-500">{b.email}</p>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-1.5">
                        <code className="text-xs font-mono text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded">
                          {b.ticketCode}
                        </code>
                        <button
                          onClick={() => copyCode(b.ticketCode)}
                          className="text-gray-400 hover:text-gray-600 transition cursor-pointer"
                          title="Copy code"
                        >
                          <Copy className="h-3 w-3" />
                        </button>
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      {(() => {
                        const pack = packs.find((p) => p.id === b.packId);
                        const name = pack?.name ?? b.packName;
                        const detail = [
                          pack?.sub,
                          pack ? `${pack.price} ${pack.currency || "€"}` : null,
                          b.numPeople > 1 ? `${b.numPeople} people` : null,
                          b.arrivalDate
                            ? `${new Date(b.arrivalDate).toLocaleDateString()} → ${
                                b.departureDate
                                  ? new Date(b.departureDate).toLocaleDateString()
                                  : "?"
                              }`
                            : null,
                        ]
                          .filter(Boolean)
                          .join(" · ");
                        return (
                          <>
                            <p className="text-gray-700">{name}</p>
                            {detail && (
                              <p className="text-[11px] text-gray-500 mt-0.5 max-w-[220px] truncate" title={detail}>
                                {detail}
                              </p>
                            )}
                          </>
                        );
                      })()}
                    </td>
                    <td className="px-5 py-3">
                      {(() => {
                        const partner = b.collaboratorId
                          ? collaborators.find((c) => c.id === b.collaboratorId)
                          : undefined;
                        if (b.inviteCode) {
                          return (
                            <div>
                              <span className="inline-flex items-center gap-1 text-xs text-violet-600">
                                <Link2 className="h-3 w-3" />
                                <code className="font-mono bg-violet-50 px-1 py-0.5 rounded text-[10px]">
                                  {b.inviteCode}
                                </code>
                              </span>
                              {partner && (
                                <p className="text-[11px] text-gray-500 mt-0.5">{partner.name}</p>
                              )}
                            </div>
                          );
                        }
                        if (b.source === "referral") {
                          return (
                            <span className="text-xs text-emerald-600">
                              Referral{partner ? ` / ${partner.name}` : ""}
                            </span>
                          );
                        }
                        if (b.source === "website") {
                          return <span className="text-xs text-blue-600">Website</span>;
                        }
                        return <span className="text-xs text-gray-400">Manual</span>;
                      })()}
                    </td>
                    <td className="px-5 py-3">
                      <select
                        value={b.status}
                        onChange={(e) =>
                          handleStatusChange(b.id, e.target.value as BookingStatus)
                        }
                        className={`appearance-none rounded-full px-2.5 py-0.5 text-[10px] tracking-widest uppercase font-medium border cursor-pointer focus:outline-none ${statusStyles[b.status]}`}
                      >
                        <option value="pending">Pending</option>
                        <option value="confirmed">Confirmed</option>
                        <option value="checked-in">Checked In</option>
                        <option value="declined">Declined</option>
                      </select>
                    </td>
                    <td className="px-5 py-3 text-gray-500 whitespace-nowrap">
                      {new Date(b.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-5 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => emailCustomer(b)}
                          className="p-1.5 rounded-lg text-gray-500 hover:text-emerald-600 hover:bg-emerald-50 transition cursor-pointer"
                          title={
                            b.status === "pending"
                              ? "Email customer: we respond within 24h"
                              : "Email customer: confirmation details"
                          }
                        >
                          <Mail className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => showQr(b)}
                          className="p-1.5 rounded-lg text-gray-500 hover:text-violet-600 hover:bg-violet-50 transition cursor-pointer"
                          title="View QR Code"
                        >
                          <QrCode className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => setDeleteConfirm(b.id)}
                          className="p-1.5 rounded-lg text-gray-500 hover:text-red-600 hover:bg-red-50 transition cursor-pointer"
                          title="Delete"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Booking Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-xl border border-gray-200 bg-white p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-display text-lg text-gray-900">New Booking</h3>
              <button
                onClick={() => setShowForm(false)}
                className="text-gray-500 hover:text-gray-700 transition cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Pack Select */}
              <div>
                <label className="block text-xs tracking-widest uppercase text-gray-500 mb-1.5">
                  Pack
                </label>
                <select
                  value={form.packId}
                  onChange={(e) => setForm({ ...form, packId: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:border-amber-500 transition cursor-pointer"
                >
                  <option value="">Select a pack</option>
                  {/* Inactive packs stay hidden on the website but can be booked
                      here — create one on the Packs page (e.g. 5+ nights) for
                      special reservations. */}
                  {packs.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.sub}) — {p.price} {p.currency || "€"}
                      {p.active ? "" : "  · special (hidden from website)"}
                    </option>
                  ))}
                </select>
                <p className="mt-1.5 text-[11px] text-gray-500">
                  Need a special reservation (e.g. more than 4 nights)? Create the pack on
                  the Packs page with <span className="text-gray-600">Active off</span> — it
                  stays hidden from the website but you can book it here.
                </p>
              </div>

              {/* Name */}
              <div>
                <label className="block text-xs tracking-widest uppercase text-gray-500 mb-1.5">
                  Customer Name
                </label>
                <input
                  type="text"
                  value={form.customerName}
                  onChange={(e) =>
                    setForm({ ...form, customerName: e.target.value })
                  }
                  placeholder="Full name"
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-amber-500 transition"
                />
              </div>

              {/* Email & Phone */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs tracking-widest uppercase text-gray-500 mb-1.5">
                    Email
                  </label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    placeholder="email@example.com"
                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-amber-500 transition"
                  />
                </div>
                <div>
                  <label className="block text-xs tracking-widest uppercase text-gray-500 mb-1.5">
                    Phone
                  </label>
                  <input
                    type="tel"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    placeholder="+212..."
                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-amber-500 transition"
                  />
                </div>
              </div>

              {/* Country & People */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs tracking-widest uppercase text-gray-500 mb-1.5">
                    Country
                  </label>
                  <input
                    type="text"
                    value={form.country}
                    onChange={(e) =>
                      setForm({ ...form, country: e.target.value })
                    }
                    placeholder="Morocco"
                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-amber-500 transition"
                  />
                </div>
                <div>
                  <label className="block text-xs tracking-widest uppercase text-gray-500 mb-1.5">
                    Number of People
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={form.numPeople}
                    onChange={(e) =>
                      setForm({ ...form, numPeople: parseInt(e.target.value) || 1 })
                    }
                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:border-amber-500 transition"
                  />
                </div>
              </div>

              {/* Arrival & Departure */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs tracking-widest uppercase text-gray-500 mb-1.5">
                    Arrival Date
                  </label>
                  <input
                    type="date"
                    value={form.arrival}
                    onChange={(e) => setForm({ ...form, arrival: e.target.value })}
                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:border-amber-500 transition [color-scheme:dark]"
                  />
                </div>
                <div>
                  <label className="block text-xs tracking-widest uppercase text-gray-500 mb-1.5">
                    Departure Date
                  </label>
                  <input
                    type="date"
                    value={form.departure}
                    min={form.arrival || undefined}
                    onChange={(e) => setForm({ ...form, departure: e.target.value })}
                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:border-amber-500 transition [color-scheme:dark]"
                  />
                </div>
              </div>

              {/* Dance Level */}
              <div>
                <label className="block text-xs tracking-widest uppercase text-gray-500 mb-1.5">
                  Dance Level
                </label>
                <select
                  value={form.danceLevel}
                  onChange={(e) =>
                    setForm({ ...form, danceLevel: e.target.value })
                  }
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:border-amber-500 transition cursor-pointer"
                >
                  <option value="Beginner">Beginner</option>
                  <option value="Intermediate">Intermediate</option>
                  <option value="Advanced">Advanced</option>
                  <option value="Professional">Professional</option>
                </select>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs tracking-widest uppercase text-gray-500 mb-1.5">
                  Notes (optional)
                </label>
                <textarea
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  placeholder="Special requests..."
                  rows={2}
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-amber-500 transition resize-none"
                />
              </div>

              {/* Status */}
              <div>
                <label className="block text-xs tracking-widest uppercase text-gray-500 mb-1.5">
                  Initial Status
                </label>
                <select
                  value={form.status}
                  onChange={(e) =>
                    setForm({ ...form, status: e.target.value as BookingStatus })
                  }
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:border-amber-500 transition cursor-pointer"
                >
                  <option value="pending">Pending</option>
                  <option value="confirmed">Confirmed</option>
                  <option value="checked-in">Checked In</option>
                  <option value="declined">Declined</option>
                </select>
              </div>
            </div>

            {/* Save */}
            <div className="mt-6 flex items-center gap-3 justify-end">
              <button
                onClick={() => setShowForm(false)}
                className="px-4 py-2 rounded-lg text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleCreate}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold bg-amber-500 text-zinc-950 hover:bg-amber-400 transition cursor-pointer"
              >
                <Check className="h-4 w-4" /> Create Booking
              </button>
            </div>
          </div>
        </div>
      )}

      {/* QR Code Modal */}
      {qrBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm rounded-xl border border-gray-200 bg-white p-6 text-center">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display text-lg text-gray-900">Ticket QR Code</h3>
              <button
                onClick={() => {
                  setQrBooking(null);
                  setAutoEmail(null);
                }}
                className="text-gray-500 hover:text-gray-700 transition cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Automatic confirmation email status */}
            {autoEmail && (
              <div
                className={`mb-4 rounded-lg border px-3 py-2 text-xs ${
                  autoEmail === "sent"
                    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                    : autoEmail === "failed"
                      ? "border-red-200 bg-red-50 text-red-700"
                      : "border-gray-300 bg-gray-50 text-gray-600"
                }`}
              >
                {autoEmail === "sent"
                  ? "✓ Confirmation email with the ticket sent automatically."
                  : autoEmail === "failed"
                    ? "Automatic email failed — send the ticket with the buttons below."
                    : "Sending confirmation email to the guest…"}
              </div>
            )}

            {qrDataUrl && (
              <div className="flex flex-col items-center gap-4">
                <div className="rounded-xl border border-gray-200 bg-zinc-100 p-4 inline-block">
                  <img src={qrDataUrl} alt="QR Code" className="w-48 h-48" />
                </div>
                <div>
                  <p className="font-display text-sm text-gray-800">
                    {qrBooking.customerName}
                  </p>
                  <code className="text-xs font-mono text-amber-700 bg-amber-50 px-2 py-0.5 rounded mt-1 inline-block">
                    {qrBooking.ticketCode}
                  </code>
                  <p className="text-xs text-gray-500 mt-1">{qrBooking.packName}</p>
                  {/* Where this booking came from */}
                  {(() => {
                    const partner = qrBooking.collaboratorId
                      ? collaborators.find((c) => c.id === qrBooking.collaboratorId)
                      : undefined;
                    const origin = partner
                      ? `Partner: ${partner.name}${qrBooking.inviteCode ? ` · invite ${qrBooking.inviteCode}` : ""}`
                      : qrBooking.inviteCode
                        ? `Invite ${qrBooking.inviteCode}`
                        : qrBooking.source === "website"
                          ? "Website booking"
                          : "Manual booking";
                    return (
                      <p className="mt-2 inline-block text-[10px] font-semibold uppercase tracking-widest text-violet-600 border border-violet-200 bg-violet-50 rounded px-2 py-1">
                        {origin}
                      </p>
                    );
                  })()}
                </div>

                {/* Send the ticket to the guest */}
                <div className="flex items-center justify-center gap-2 flex-wrap">
                  {waTicketLink(qrBooking) && (
                    <a
                      href={waTicketLink(qrBooking)!}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium bg-green-50 text-[#16a34a] hover:bg-green-100 transition"
                    >
                      <Phone className="h-3.5 w-3.5" /> WhatsApp Ticket
                    </a>
                  )}
                  {qrBooking.email && (
                    <button
                      onClick={() => emailCustomer(qrBooking)}
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium bg-emerald-100 text-emerald-600 hover:bg-emerald-100 transition cursor-pointer"
                    >
                      <Mail className="h-3.5 w-3.5" /> Email Ticket
                    </button>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={downloadQr}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium bg-amber-100 text-amber-600 hover:bg-amber-100 transition cursor-pointer"
                  >
                    <Download className="h-3.5 w-3.5" /> Download
                  </button>
                  <button
                    onClick={() => copyCode(ticketUrl(qrBooking.ticketCode))}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium bg-gray-100 text-gray-600 hover:text-gray-800 transition cursor-pointer"
                  >
                    <Link2 className="h-3.5 w-3.5" /> Copy Link
                  </button>
                  <button
                    onClick={() => copyCode(qrBooking.ticketCode)}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium bg-gray-100 text-gray-600 hover:text-gray-800 transition cursor-pointer"
                  >
                    <Copy className="h-3.5 w-3.5" /> Copy Code
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm rounded-xl border border-gray-200 bg-white p-6">
            <h3 className="font-display text-lg text-gray-900">
              Delete Booking?
            </h3>
            <p className="mt-2 text-sm text-gray-500">
              This will permanently remove this booking and its ticket.
            </p>
            <div className="mt-6 flex items-center gap-3 justify-end">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="px-4 py-2 rounded-lg text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deleteConfirm)}
                className="px-4 py-2 rounded-lg text-sm font-medium bg-red-200 text-red-600 hover:bg-red-200 transition cursor-pointer"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
