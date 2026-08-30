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
  packGuestCount,
  packDepartureDateLimits,
  constrainPackDepartureDate,
  packPrice,
  ROOM_TYPES,
  ticketUrl,
  commissionLabel,
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
    collaboratorId: "",
    firstName: "",
    lastName: "",
    company: "",
    additionalGuests: "",
    email: "",
    phone: "",
    country: "",
    numPeople: 1,
    danceLevel: "Beginner",
    arrival: "2027-01-08",
    arrivalTime: "",
    departure: "2027-01-11",
    departureTime: "",
    roomNumber: "",
    roomType: "",
    notes: "",
    status: "pending" as BookingStatus,
  });
  const selectedFormPack = packs.find((pack) => pack.id === form.packId);
  const formDepartureLimits = selectedFormPack
    ? packDepartureDateLimits(form.arrival, selectedFormPack)
    : null;

  const resetForm = () => {
    const initialPack = packs[0];
    const initialGuests = initialPack ? packGuestCount(initialPack) : 1;
    setForm({
      packId: initialPack?.id ?? "",
      collaboratorId: "",
      firstName: "",
      lastName: "",
      company: "",
      additionalGuests: "",
      email: "",
      phone: "",
      country: "",
      numPeople: initialGuests > 0 ? initialGuests : 1,
      danceLevel: "Beginner",
      arrival: "2027-01-08",
      arrivalTime: "",
      departure: constrainPackDepartureDate("2027-01-08", "2027-01-11", initialPack),
      departureTime: "",
      roomNumber: "",
      roomType: "",
      notes: "",
      status: "pending",
    });
  };

  const onPackSelect = (packId: string) => {
    const p = packs.find((x) => x.id === packId);
    const guests = p ? packGuestCount(p) : 1;
    setForm((prev) => ({
      ...prev,
      packId,
      numPeople: guests > 0 ? guests : prev.numPeople,
      departure: constrainPackDepartureDate(prev.arrival, prev.departure, p),
    }));
  };

  const handleCreate = async () => {
    if (
      !form.firstName.trim() ||
      !form.lastName.trim() ||
      !form.email.trim() ||
      !form.phone.trim() ||
      !form.arrival.trim() ||
      !form.departure.trim() ||
      !form.packId
    )
      return;
    const pack = packs.find((p) => p.id === form.packId);
    const departureDate = pack
      ? constrainPackDepartureDate(form.arrival, form.departure, pack)
      : form.departure;

    const leadName = `${form.firstName.trim()} ${form.lastName.trim()}`;
    const extraNames = form.additionalGuests
      .split(/\s*&\s*|\s*,\s*|\n+/)
      .map((s) => s.trim())
      .filter(Boolean);
    const customerName = extraNames.length > 0 ? [leadName, ...extraNames].join(" & ") : leadName;

    try {
      await addBooking({
        ...form,
        customerName,
        company: form.company.trim() || null,
        packName: packLabel(pack),
        arrivalDate: form.arrival || null,
        arrivalTime: form.arrivalTime.trim() || null,
        departureDate: departureDate || null,
        departureTime: form.departureTime.trim() || null,
        roomNumber: form.roomNumber.trim() || null,
        roomType: form.roomType.trim() || null,
        collaboratorId: form.collaboratorId.trim() || null,
        source: form.collaboratorId.trim() ? "referral" : "manual",
      });
      setShowForm(false);
      await reload();
    } catch (error) {
      alert(error instanceof Error ? error.message : "Impossible de créer la réservation.");
    }
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
          : `Hello ${firstName}! 🎉 Your booking for the Tangier International Latin Festival is CONFIRMED.\n\n🎫 Your ticket (show the QR at check-in):\n${tUrl}\n\nCode: ${b.ticketCode} · ${pack}\nSee you Du 7 au 11 janvier 2027 at the Kenzi Solazur, Tangier!`;
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
      subject = `Votre demande de réservation au Tangier Latin Festival (${b.ticketCode})`;
      body =
        `Bonjour ${firstName},\n\n` +
        `Merci pour votre demande de réservation du forfait « ${translateDynamicText(b.packName, "fr")} » au Tangier International Latin Festival, du 7 au 11 janvier 2027.\n\n` +
        `Nous l’examinons et vous répondrons sous 24 heures pour confirmer votre réservation et vous envoyer les modalités de paiement.\n\n` +
        `Votre référence : ${b.ticketCode}\n\n` +
        `Cordialement,\nL’équipe du Tangier International Latin Festival\ncontact@tangierlatinfestival.com · +212 6 64 01 02 79 / +212 6 64 63 06 32`;
    } else if (b.status === "declined") {
      subject = `À propos de votre demande de réservation (${b.ticketCode})`;
      body =
        `Bonjour ${firstName},\n\n` +
        `Merci pour votre intérêt pour le Tangier International Latin Festival. Nous n’avons malheureusement pas pu confirmer votre demande pour le forfait « ${translateDynamicText(b.packName, "fr")} ».\n\n` +
        `Si vous pensez qu’il s’agit d’une erreur ou souhaitez choisir un autre forfait, répondez à cet e-mail ou contactez-nous sur WhatsApp.\n\n` +
        `Cordialement,\nL’équipe du Tangier International Latin Festival\ncontact@tangierlatinfestival.com · +212 6 64 01 02 79 / +212 6 64 63 06 32`;
    } else {
      subject = `Votre réservation au Tangier Latin Festival est confirmée ! (${b.ticketCode})`;
      body =
        `Bonjour ${firstName},\n\n` +
        `Bonne nouvelle : votre réservation du forfait « ${translateDynamicText(b.packName, "fr")} » au Tangier International Latin Festival, du 7 au 11 janvier 2027 à l’hôtel Kenzi Solazur, est confirmée !\n\n` +
        `Votre billet avec code QR : ${ticketUrl(b.ticketCode)}\n` +
        `Code du billet : ${b.ticketCode}\n` +
        `Participants : ${b.customerName} (${b.numPeople} ${b.numPeople > 1 ? "personnes" : "personne"})\n\n` +
        `Ouvrez le lien et présentez le code QR à l’accueil.\n\n` +
        `À bientôt sur la piste de danse !\nL’équipe du Tangier International Latin Festival\ncontact@tangierlatinfestival.com · +212 6 64 01 02 79 / +212 6 64 63 06 32`;
    }
    window.location.href = `mailto:${encodeURIComponent(b.email)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };

  const filtered = bookings
    .filter((b) => statusFilter === "all" || b.status === statusFilter)
    .filter((b) => {
      if (!search.trim()) return true;
      const q = search.trim().toLowerCase();
      // Also match the source: partner/referral name & code, invite code,
      // or the source itself ("website", "manual", "referral").
      const partner = b.collaboratorId
        ? collaborators.find((c) => c.id === b.collaboratorId)
        : undefined;
      return (
        b.customerName.toLowerCase().includes(q) ||
        b.ticketCode.toLowerCase().includes(q) ||
        b.email.toLowerCase().includes(q) ||
        b.phone.toLowerCase().includes(q) ||
        b.packName.toLowerCase().includes(q) ||
        (b.inviteCode ?? "").toLowerCase().includes(q) ||
        (b.source ?? "").toLowerCase().includes(q) ||
        (partner?.name.toLowerCase().includes(q) ?? false) ||
        (partner?.code.toLowerCase().includes(q) ?? false)
      );
    })
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

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
            Gestion des réservations
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            Gérez les billets, modifiez les statuts et générez les codes QR.
          </p>
        </div>
        <button
          onClick={() => {
            resetForm();
            setShowForm(true);
          }}
          className="inline-flex items-center gap-2 rounded-lg bg-amber-500 px-4 py-2.5 text-sm font-semibold text-zinc-950 hover:bg-amber-400 transition cursor-pointer self-start"
        >
          <Plus className="h-4 w-4" /> Ajouter une réservation
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
            placeholder="Rechercher par nom, e-mail, billet, forfait ou partenaire…"
            className="w-full rounded-lg border border-gray-300 bg-white pl-9 pr-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-amber-500 transition"
          />
        </div>
        <div className="relative">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as BookingStatus | "all")}
            className="appearance-none rounded-lg border border-gray-300 bg-white px-4 pr-8 py-2.5 text-sm text-gray-900 focus:outline-none focus:border-amber-500 transition cursor-pointer"
          >
            <option value="all">Tous les statuts</option>
            <option value="pending">En attente</option>
            <option value="confirmed">Confirmé</option>
            <option value="checked-in">Arrivé</option>
            <option value="declined">Refusé</option>
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
              ? "Aucune réservation. Cliquez sur « Ajouter une réservation » pour en créer une."
              : "Aucune réservation ne correspond aux filtres."}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-xs tracking-widest uppercase text-gray-500">
                  <th className="px-5 py-3 text-left font-medium">Client</th>
                  <th className="px-5 py-3 text-left font-medium">Ticket</th>
                  <th className="px-5 py-3 text-left font-medium">Forfait</th>
                  <th className="px-5 py-3 text-left font-medium">Source</th>
                  <th className="px-5 py-3 text-left font-medium">Statut</th>
                  <th className="px-5 py-3 text-left font-medium">Date</th>
                  <th className="px-5 py-3 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map((b) => (
                  <tr key={b.id} className="hover:bg-gray-50 transition">
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
                          title="Copier le code"
                        >
                          <Copy className="h-3 w-3" />
                        </button>
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      {(() => {
                        const pack = packs.find((p) => p.id === b.packId);
                        const name = pack?.name ?? b.packName;
                        const unitPrice = pack ? parseInt(pack.price, 10) || 0 : 0;
                        const cur = pack?.currency || "€";
                        const count = b.numPeople || 1;
                        const gross = unitPrice * count;
                        const priceInfo = pack
                          ? count > 1
                            ? `${count} personnes (${unitPrice} ${cur}/p → ${gross} ${cur})`
                            : `${unitPrice} ${cur}`
                          : null;
                        const detail = [
                          pack?.sub,
                          priceInfo,
                          b.arrivalDate
                            ? `${new Date(b.arrivalDate).toLocaleDateString("fr-FR")} → ${
                                b.departureDate
                                  ? new Date(b.departureDate).toLocaleDateString("fr-FR")
                                  : "?"
                              }`
                            : null,
                        ]
                          .filter(Boolean)
                          .join(" · ");
                        return (
                          <>
                            <p className="text-gray-700 font-medium">{name}</p>
                            {detail && (
                              <p
                                className="text-[11px] text-gray-500 mt-0.5 max-w-[240px] truncate"
                                title={detail}
                              >
                                {detail}
                              </p>
                            )}
                            {b.discountCode && (
                              <span className="inline-flex items-center gap-1 mt-1 px-1.5 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200 text-[10px] font-mono font-semibold">
                                Code: {b.discountCode} (
                                {b.discountAmount ? `-€${b.discountAmount}` : "Réduction"})
                              </span>
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
                          return <span className="text-xs text-blue-600">Site web</span>;
                        }
                        return <span className="text-xs text-gray-400">Manual</span>;
                      })()}
                    </td>
                    <td className="px-5 py-3">
                      <select
                        value={b.status}
                        onChange={(e) => handleStatusChange(b.id, e.target.value as BookingStatus)}
                        className={`appearance-none rounded-full px-2.5 py-0.5 text-[10px] tracking-widest uppercase font-medium border cursor-pointer focus:outline-none ${statusStyles[b.status]}`}
                      >
                        <option value="pending">En attente</option>
                        <option value="confirmed">Confirmé</option>
                        <option value="checked-in">Arrivé</option>
                        <option value="declined">Refusé</option>
                      </select>
                    </td>
                    <td className="px-5 py-3 text-gray-500 whitespace-nowrap">
                      {new Date(b.createdAt).toLocaleDateString("fr-FR")}
                    </td>
                    <td className="px-5 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => emailCustomer(b)}
                          className="p-1.5 rounded-lg text-gray-500 hover:text-emerald-600 hover:bg-emerald-50 transition cursor-pointer"
                          title={
                            b.status === "pending"
                              ? "Envoyer l’e-mail de réponse sous 24 h"
                              : "Envoyer l’e-mail de confirmation"
                          }
                        >
                          <Mail className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => showQr(b)}
                          className="p-1.5 rounded-lg text-gray-500 hover:text-violet-600 hover:bg-violet-50 transition cursor-pointer"
                          title="Afficher le code QR"
                        >
                          <QrCode className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => setDeleteConfirm(b.id)}
                          className="p-1.5 rounded-lg text-gray-500 hover:text-red-600 hover:bg-red-50 transition cursor-pointer"
                          title="Supprimer"
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

      {/* Ajouter une réservation Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-xl border border-gray-200 bg-white p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-display text-lg text-gray-900">Nouvelle réservation</h3>
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
                <label className="block text-xs tracking-widest uppercase text-gray-500 mb-1.5 font-medium">
                  Forfait / pass <span className="text-red-500">*</span>
                </label>
                <select
                  value={form.packId}
                  onChange={(e) => onPackSelect(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:border-amber-500 transition cursor-pointer font-medium"
                >
                  <option value="">Sélectionner un forfait</option>
                  {packs.map((p) => (
                    <option key={p.id} value={p.id}>
                      {translateDynamicText(p.name, "fr")} ({translateDynamicText(p.sub, "fr")}) —{" "}
                      {p.price} {p.currency || "€"}
                      {p.active ? "" : "  · PRIVÉ"}
                    </option>
                  ))}
                </select>
                {(() => {
                  const selPack = packs.find((p) => p.id === form.packId);
                  if (!selPack) return null;
                  const unit = parseInt(selPack.price, 10) || 0;
                  const total = unit * (form.numPeople || 1);
                  return (
                    <div className="mt-2 p-2.5 rounded-lg bg-amber-50/80 border border-amber-200 flex items-center justify-between text-xs text-amber-900">
                      <div>
                        <span className="font-semibold">
                          {translateDynamicText(selPack.name, "fr")}
                        </span>{" "}
                        · {translateDynamicText(selPack.category || "Pass", "fr")}
                      </div>
                      <div className="font-bold text-sm text-amber-950">
                        {unit} {selPack.currency || "€"} / personne
                        {form.numPeople > 1 && (
                          <span className="ml-1.5 text-xs text-amber-800 font-normal">
                            (Total : {total} {selPack.currency || "€"})
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* Attribuer à un partenaire / collaborateur */}
              <div>
                <label className="block text-xs tracking-widest uppercase text-gray-500 mb-1.5 font-medium">
                  Attribuer à un partenaire / collaborateur
                </label>
                <select
                  value={form.collaboratorId}
                  onChange={(e) => setForm({ ...form, collaboratorId: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:border-amber-500 transition cursor-pointer"
                >
                  <option value="">Direct / festival officiel (sans partenaire)</option>
                  {collaborators.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.code}) — {commissionLabel(c)}
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-[11px] text-gray-500">
                  L’attribution à un partenaire comptabilise la vente et la commission dans son
                  espace partenaire.
                </p>
              </div>

              {/* Lead Guest First Name & Last Name */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs tracking-widest uppercase text-gray-500 mb-1.5 font-medium">
                    Prénom du participant principal <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={form.firstName}
                    onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                    placeholder="Prénom"
                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-amber-500 transition"
                  />
                </div>
                <div>
                  <label className="block text-xs tracking-widest uppercase text-gray-500 mb-1.5 font-medium">
                    Nom du participant principal <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={form.lastName}
                    onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                    placeholder="Nom"
                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-amber-500 transition"
                  />
                </div>
              </div>

              {/* Company Name */}
              <div>
                <label className="block text-xs tracking-widest uppercase text-gray-500 mb-1.5 font-medium">
                  Société / organisation
                </label>
                <input
                  type="text"
                  value={form.company}
                  onChange={(e) => setForm({ ...form, company: e.target.value })}
                  placeholder="p. ex. Académie de danse latine"
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-amber-500 transition"
                />
              </div>

              {/* Additional guests if numPeople >= 2 */}
              {form.numPeople >= 2 && (
                <div>
                  <label className="block text-xs tracking-widest uppercase text-gray-500 mb-1.5 font-medium">
                    Participants supplémentaires (2, 3…)
                  </label>
                  <input
                    type="text"
                    value={form.additionalGuests}
                    onChange={(e) => setForm({ ...form, additionalGuests: e.target.value })}
                    placeholder="p. ex. Maria Gonzalez, Carlos Gomez"
                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-amber-500 transition"
                  />
                  <p className="mt-1 text-[11px] text-gray-500">
                    Séparez les noms complets par une virgule ou « &amp; » afin d’attribuer à chacun
                    sa chambre d’hôtel et son bracelet.
                  </p>
                </div>
              )}

              {/* Email & Phone */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs tracking-widest uppercase text-gray-500 mb-1.5 font-medium">
                    E-mail <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    required
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    placeholder="email@example.com"
                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-amber-500 transition"
                  />
                </div>
                <div>
                  <label className="block text-xs tracking-widest uppercase text-gray-500 mb-1.5 font-medium">
                    Téléphone <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="tel"
                    required
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    placeholder="+212 6 XX XX XX XX"
                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-amber-500 transition"
                  />
                </div>
              </div>

              {/* Country & People */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs tracking-widest uppercase text-gray-500 mb-1.5">
                    Pays
                  </label>
                  <input
                    type="text"
                    value={form.country}
                    onChange={(e) => setForm({ ...form, country: e.target.value })}
                    placeholder="Maroc"
                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-amber-500 transition"
                  />
                </div>
                <div>
                  <label className="block text-xs tracking-widest uppercase text-gray-500 mb-1.5 font-medium">
                    Nombre de participants <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={form.numPeople}
                    onChange={(e) => setForm({ ...form, numPeople: parseInt(e.target.value) || 1 })}
                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:border-amber-500 transition font-bold"
                  />
                </div>
              </div>

              {/* Hotel Numéro de chambre & Type de chambre */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs tracking-widest uppercase text-gray-500 mb-1.5">
                    Nº de chambre d’hôtel (facultatif)
                  </label>
                  <input
                    type="text"
                    value={form.roomNumber}
                    onChange={(e) => setForm({ ...form, roomNumber: e.target.value })}
                    placeholder="e.g. 214"
                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-amber-500 transition"
                  />
                </div>
                <div>
                  <label className="block text-xs tracking-widest uppercase text-gray-500 mb-1.5">
                    Type de chambre d’hôtel (facultatif)
                  </label>
                  <select
                    value={form.roomType}
                    onChange={(e) => setForm({ ...form, roomType: e.target.value })}
                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:border-amber-500 transition cursor-pointer"
                  >
                    <option value="">— Sélectionner un type de chambre —</option>
                    {ROOM_TYPES.map((rt) => (
                      <option key={rt.id} value={rt.label}>
                        {rt.label} {rt.capacity ? `(${rt.capacity})` : ""}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Date d’arrivée & Time */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs tracking-widest uppercase text-gray-500 mb-1.5 font-medium">
                    Date d’arrivée <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={form.arrival}
                    min="2027-01-01"
                    max="2027-01-30"
                    onChange={(e) => {
                      const arrival = e.target.value;
                      const departure = selectedFormPack
                        ? constrainPackDepartureDate(arrival, form.departure, selectedFormPack)
                        : form.departure;
                      setForm({ ...form, arrival, departure });
                    }}
                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:border-amber-500 transition"
                  />
                </div>
                <div>
                  <label className="block text-xs tracking-widest uppercase text-gray-500 mb-1.5 font-medium">
                    Heure d’arrivée
                  </label>
                  <input
                    type="time"
                    value={form.arrivalTime}
                    onChange={(e) => setForm({ ...form, arrivalTime: e.target.value })}
                    placeholder="e.g. 14:00"
                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:border-amber-500 transition"
                  />
                </div>
              </div>

              {/* Date de départ & Time */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs tracking-widest uppercase text-gray-500 mb-1.5 font-medium">
                    Date de départ <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={form.departure}
                    min={formDepartureLimits?.min || form.arrival || "2027-01-01"}
                    max={formDepartureLimits?.max || "2027-01-30"}
                    onChange={(e) => {
                      const departure = selectedFormPack
                        ? constrainPackDepartureDate(form.arrival, e.target.value, selectedFormPack)
                        : e.target.value;
                      setForm({ ...form, departure });
                    }}
                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:border-amber-500 transition"
                  />
                </div>
                <div>
                  <label className="block text-xs tracking-widest uppercase text-gray-500 mb-1.5 font-medium">
                    Heure de départ
                  </label>
                  <input
                    type="time"
                    value={form.departureTime}
                    onChange={(e) => setForm({ ...form, departureTime: e.target.value })}
                    placeholder="e.g. 18:00"
                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:border-amber-500 transition"
                  />
                </div>
              </div>

              {/* Dance Level & Statut initial */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs tracking-widest uppercase text-gray-500 mb-1.5">
                    Dance Level
                  </label>
                  <select
                    value={form.danceLevel}
                    onChange={(e) => setForm({ ...form, danceLevel: e.target.value })}
                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:border-amber-500 transition cursor-pointer"
                  >
                    <option value="Beginner">Beginner</option>
                    <option value="Intermediate">Intermediate</option>
                    <option value="Avancé">Avancé</option>
                    <option value="Professional">Professional</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs tracking-widest uppercase text-gray-500 mb-1.5 font-medium">
                    Statut initial
                  </label>
                  <select
                    value={form.status}
                    onChange={(e) => setForm({ ...form, status: e.target.value as BookingStatus })}
                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:border-amber-500 transition cursor-pointer font-semibold"
                  >
                    <option value="pending">En attente</option>
                    <option value="confirmed">Confirmé</option>
                    <option value="checked-in">Arrivé</option>
                    <option value="declined">Refusé</option>
                  </select>
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs tracking-widest uppercase text-gray-500 mb-1.5">
                  Notes et demandes particulières
                </label>
                <input
                  type="text"
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  placeholder="Besoins particuliers, préférences de chambre, etc."
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-amber-500 transition"
                />
              </div>
            </div>

            {/* Save */}
            <div className="mt-6 flex items-center gap-3 justify-end">
              <button
                onClick={() => setShowForm(false)}
                className="px-4 py-2 rounded-lg text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition cursor-pointer"
              >
                Annuler
              </button>
              <button
                onClick={handleCreate}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold bg-amber-500 text-zinc-950 hover:bg-amber-400 transition cursor-pointer"
              >
                <Check className="h-4 w-4" /> Créer la réservation
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
              <h3 className="font-display text-lg text-gray-900">Code QR du billet</h3>
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
                  ? "✓ E-mail de confirmation avec le billet envoyé automatiquement."
                  : autoEmail === "failed"
                    ? "L’e-mail automatique a échoué : envoyez le billet à l’aide des boutons ci-dessous."
                    : "Envoi de l’e-mail de confirmation au participant…"}
              </div>
            )}

            {qrDataUrl && (
              <div className="flex flex-col items-center gap-4">
                <div className="rounded-xl border border-gray-200 bg-zinc-100 p-4 inline-block">
                  <img src={qrDataUrl} alt="QR Code" className="w-48 h-48" />
                </div>
                <div>
                  <p className="font-display text-sm text-gray-800">{qrBooking.customerName}</p>
                  <code className="text-xs font-mono text-amber-700 bg-amber-50 px-2 py-0.5 rounded mt-1 inline-block">
                    {qrBooking.ticketCode}
                  </code>
                  <p className="text-xs text-gray-500 mt-1">
                    {translateDynamicText(qrBooking.packName, "fr")}
                  </p>
                  {/* Where this booking came from */}
                  {(() => {
                    const partner = qrBooking.collaboratorId
                      ? collaborators.find((c) => c.id === qrBooking.collaboratorId)
                      : undefined;
                    const origin = partner
                      ? `Partenaire : ${partner.name}${qrBooking.inviteCode ? ` · invitation ${qrBooking.inviteCode}` : ""}`
                      : qrBooking.inviteCode
                        ? `Invite ${qrBooking.inviteCode}`
                        : qrBooking.source === "website"
                          ? "Réservation sur le site"
                          : "Réservation manuelle";
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
                      <Phone className="h-3.5 w-3.5" /> Billet par WhatsApp
                    </a>
                  )}
                  {qrBooking.email && (
                    <button
                      onClick={() => emailCustomer(qrBooking)}
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium bg-emerald-100 text-emerald-600 hover:bg-emerald-100 transition cursor-pointer"
                    >
                      <Mail className="h-3.5 w-3.5" /> Billet par e-mail
                    </button>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={downloadQr}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium bg-amber-100 text-amber-600 hover:bg-amber-100 transition cursor-pointer"
                  >
                    <Download className="h-3.5 w-3.5" /> Télécharger
                  </button>
                  <button
                    onClick={() => copyCode(ticketUrl(qrBooking.ticketCode))}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium bg-gray-100 text-gray-600 hover:text-gray-800 transition cursor-pointer"
                  >
                    <Link2 className="h-3.5 w-3.5" /> Copier le lien
                  </button>
                  <button
                    onClick={() => copyCode(qrBooking.ticketCode)}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium bg-gray-100 text-gray-600 hover:text-gray-800 transition cursor-pointer"
                  >
                    <Copy className="h-3.5 w-3.5" /> Copier le code
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
            <h3 className="font-display text-lg text-gray-900">Supprimer la réservation ?</h3>
            <p className="mt-2 text-sm text-gray-500">
              Cette réservation et son billet seront supprimés définitivement.
            </p>
            <div className="mt-6 flex items-center gap-3 justify-end">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="px-4 py-2 rounded-lg text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition cursor-pointer"
              >
                Annuler
              </button>
              <button
                onClick={() => handleDelete(deleteConfirm)}
                className="px-4 py-2 rounded-lg text-sm font-medium bg-red-200 text-red-600 hover:bg-red-200 transition cursor-pointer"
              >
                Supprimer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
