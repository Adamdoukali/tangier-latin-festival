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
  MessageCircle,
  Tag,
  Coins,
  Euro,
  Pencil,
  RotateCcw,
  Sparkles,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import {
  getBookings,
  addBooking,
  updateBooking,
  updateBookingStatus,
  deleteBooking,
  getPacks,
  getCollaborators,
  getDiscountCodes,
  EUR_TO_MAD,
  formatMoney,
  bookingAmountDueMad,
  packLabel,
  packGuestCount,
  packDepartureDateLimits,
  constrainPackDepartureDate,
  packPrice,
  bookingUnitPrice,
  ROOM_TYPES,
  ticketUrl,
  commissionLabel,
  isConfirmedBooking,
  packNightCount,
  type Booking,
  type BookingStatus,
  type Collaborator,
  type Pack,
  type DiscountCode,
  type CommissionCurrency,
} from "@/lib/admin-store";
import { sendFormNotification, ticketConfirmationEmail } from "@/lib/form-notify";
import { translateDynamicText, type Language } from "@/lib/translations";
import { getCurrentAdmin } from "@/lib/auth-store";
import { sendTicketConfirmationEmail } from "@/lib/ticket-confirmation";
import { formatInternationalPhone } from "@/lib/phone";
import { recordAdminAction } from "@/lib/admin-audit";

/** "en France", "au Maroc", "aux États-Unis"… for the WhatsApp follow-up.
 * Country names may be stored in English, French or Spanish. */
function countryInFrench(country?: string | null): string {
  const raw = (country || "").trim();
  if (!raw) return "";
  const key = raw.toLowerCase();
  const known: Record<string, string> = {
    morocco: "au Maroc", maroc: "au Maroc", marruecos: "au Maroc",
    france: "en France", francia: "en France",
    spain: "en Espagne", espagne: "en Espagne", "españa": "en Espagne",
    belgium: "en Belgique", belgique: "en Belgique", "bélgica": "en Belgique",
    portugal: "au Portugal",
    canada: "au Canada", "canadá": "au Canada",
    netherlands: "aux Pays-Bas", "pays-bas": "aux Pays-Bas", "países bajos": "aux Pays-Bas",
    "united states": "aux États-Unis", "états-unis": "aux États-Unis", "estados unidos": "aux États-Unis",
    "united kingdom": "au Royaume-Uni", "royaume-uni": "au Royaume-Uni", "reino unido": "au Royaume-Uni",
    germany: "en Allemagne", allemagne: "en Allemagne", alemania: "en Allemagne",
    italy: "en Italie", italie: "en Italie", italia: "en Italie",
    switzerland: "en Suisse", suisse: "en Suisse", suiza: "en Suisse",
    luxembourg: "au Luxembourg", luxemburgo: "au Luxembourg",
    algeria: "en Algérie", "algérie": "en Algérie", argelia: "en Algérie",
    tunisia: "en Tunisie", tunisie: "en Tunisie", "túnez": "en Tunisie",
    senegal: "au Sénégal", "sénégal": "au Sénégal",
    mexico: "au Mexique", mexique: "au Mexique", "méxico": "au Mexique",
    brazil: "au Brésil", "brésil": "au Brésil", brasil: "au Brésil",
  };
  return ` ${known[key] ?? `en ${raw}`}`;
}

export const Route = createFileRoute("/admin/bookings")({
  component: AdminBookings,
});

function AdminBookings() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [packs, setPacks] = useState<Pack[]>([]);
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [discountCodes, setDiscountCodes] = useState<DiscountCode[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<BookingStatus | "all">("all");
  const [showForm, setShowForm] = useState(false);
  const [qrBooking, setQrBooking] = useState<Booking | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string>("");
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [statusError, setStatusError] = useState("");
  const [autoEmail, setAutoEmail] = useState<"sending" | "sent" | "failed" | null>(null);

  // Pricing & Promo Override State
  const [pricingModalBooking, setPricingModalBooking] = useState<Booking | null>(null);
  const [pricingForm, setPricingForm] = useState({
    unitPrice: "" as string | number,
    priceCurrency: "EUR" as CommissionCurrency,
    discountCode: "",
    discountAmount: 0 as string | number,
    discountCodeId: null as string | null,
    amountDueMad: "" as string | number,
    useCustomMad: false,
  });
  const [savingPricing, setSavingPricing] = useState(false);
  const [pricingError, setPricingError] = useState("");
  const [pricingSuccess, setPricingSuccess] = useState("");

  const reload = useCallback(async () => {
    const [b, p, c, d] = await Promise.all([
      getBookings(),
      getPacks(),
      getCollaborators(),
      getDiscountCodes(),
    ]);
    setBookings(b);
    setPacks(p);
    setCollaborators(c);
    setDiscountCodes(d);
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  const openPricingModal = (b: Booking) => {
    const pack = packs.find((p) => p.id === b.packId);
    const locked = bookingUnitPrice(b, pack);
    const cur = locked.currency === "MAD" ? "MAD" : "EUR";
    const unitPrice = locked.amount;

    setPricingModalBooking(b);
    setPricingError("");
    setPricingSuccess("");
    setPricingForm({
      unitPrice,
      priceCurrency: cur,
      discountCode: b.discountCode || "",
      discountAmount: b.discountAmount != null ? b.discountAmount : 0,
      discountCodeId: b.discountCodeId || null,
      amountDueMad: b.amountDueMad != null ? b.amountDueMad : "",
      useCustomMad: b.amountDueMad != null,
    });
  };

  const handleRemovePromo = () => {
    setPricingForm((prev) => ({
      ...prev,
      discountCode: "",
      discountAmount: 0,
      discountCodeId: null,
    }));
  };

  const handleResetToCatalogPrice = () => {
    if (!pricingModalBooking) return;
    const pack = packs.find((p) => p.id === pricingModalBooking.packId);
    const catPrice = packPrice(pack ?? undefined);
    setPricingForm((prev) => ({
      ...prev,
      unitPrice: catPrice.amount,
      priceCurrency: catPrice.currency === "MAD" ? "MAD" : "EUR",
    }));
  };

  const handleSelectDiscountCode = (codeId: string) => {
    if (!codeId) {
      handleRemovePromo();
      return;
    }
    const found = discountCodes.find((d) => d.id === codeId);
    if (!found) return;
    const count = pricingModalBooking?.numPeople || 1;
    const numUnitPrice = Number(pricingForm.unitPrice) || 0;
    let computedDiscount = 0;
    if (found.discountType === "percent") {
      computedDiscount = Math.round((numUnitPrice * count * (found.discountAmount / 100)) * 100) / 100;
    } else {
      if (found.applyScope === "per_person") {
        computedDiscount = found.discountAmount * count;
      } else {
        computedDiscount = found.discountAmount;
      }
    }
    setPricingForm((prev) => ({
      ...prev,
      discountCode: found.code,
      discountAmount: computedDiscount,
      discountCodeId: found.id,
    }));
  };

  const handleSavePricing = async () => {
    if (!pricingModalBooking) return;
    setSavingPricing(true);
    setPricingError("");
    try {
      const unitPriceNum = Number(pricingForm.unitPrice);
      if (isNaN(unitPriceNum) || unitPriceNum < 0) {
        throw new Error("Veuillez saisir un tarif unitaire valide supérieur ou égal à 0.");
      }
      const discountAmountNum = Math.max(0, Number(pricingForm.discountAmount) || 0);
      const amountDueMadVal =
        pricingForm.useCustomMad && pricingForm.amountDueMad !== ""
          ? Math.max(0, Number(pricingForm.amountDueMad))
          : null;

      const updates = {
        unitPrice: unitPriceNum,
        priceCurrency: pricingForm.priceCurrency,
        discountCode: pricingForm.discountCode.trim() || null,
        discountAmount: discountAmountNum,
        discountCodeId: pricingForm.discountCodeId || null,
        amountDueMad: amountDueMadVal,
      };

      const saved = await updateBooking(pricingModalBooking.id, updates);
      if (!saved) throw new Error("Échec de la mise à jour de la réservation.");

      await recordAdminAction({
        action: "price_override",
        section: "Bookings",
        entityId: pricingModalBooking.id,
        entityLabel: `${pricingModalBooking.customerName} (${pricingModalBooking.ticketCode})`,
        summary: `Tarif et promo modifiés pour ${pricingModalBooking.ticketCode}: tarif ${unitPriceNum} ${pricingForm.priceCurrency}/pers, promo ${pricingForm.discountCode || "aucune"} (-${discountAmountNum} ${pricingForm.priceCurrency})`,
        before: pricingModalBooking,
        after: saved,
        changes: updates,
      });

      setPricingSuccess("Tarification et code promo enregistrés avec succès !");
      await reload();
      setTimeout(() => {
        setPricingModalBooking(null);
        setPricingSuccess("");
      }, 900);
    } catch (err: any) {
      setPricingError(err.message || "Erreur lors de la sauvegarde.");
    } finally {
      setSavingPricing(false);
    }
  };

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
      departure: prev.departure || constrainPackDepartureDate(prev.arrival, prev.departure, p),
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
    const departureDate = form.departure;

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
        sendTicketConfirmationEmail(updated, collaborators)
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

  // Prefilled WhatsApp follow-up asking the guest to confirm their reservation,
  // signed by the team member currently logged in.
  const waFollowUpLink = (b: Booking): string | null => {
    const digits = formatInternationalPhone(b.phone).replace(/\D/g, "");
    if (!digits) return null;
    const guests = b.customerName
      .split(/\s*&\s*/)
      .map((g) => g.trim())
      .filter(Boolean);
    const firstName = (guests[0] || b.customerName).split(/\s+/)[0] || b.customerName;
    const pack = packs.find((p) => p.id === b.packId);
    const packName = translateDynamicText(b.packName, "fr");
    const nights = packNightCount(pack);
    const companions = guests.slice(1).map((g) => g.split(/\s+/)[0]);
    const forWhom =
      companions.length > 0
        ? ` pour vous-même et pour ${companions.join(", ")}`
        : b.numPeople > 1
          ? ` pour ${b.numPeople} personnes`
          : "";
    const stay = nights ? `, ${nights} nuitée${nights > 1 ? "s" : ""}` : "";
    const where = countryInFrench(b.country);
    const teamMember = getCurrentAdmin()?.name?.trim() || "L’équipe";
    const text =
      `Hello ${firstName},

` +
      `Nous vous remercions pour l’intérêt que vous portez au Tangier Latin Festival 💃✨
` +
      `Tout d’abord, nous tenons à nous excuser pour le retard de notre réponse.
` +
      `Nous aimerions savoir si vous confirmez la réservation de votre ${packName}${forWhom}${stay}. ` +
      `Je voudrais également savoir où est-ce que vous habitez${where} afin que nous puissions vous rediriger vers l’un de nos promoteurs et procéder au paiement pour finaliser votre réservation.

` +
      `Nous restons dans l’attente de votre retour et espérons avoir le plaisir de vous accueillir au festival. 💃✨

` +
      `Cordialement,
${teamMember}
Tangier Latin Festival`;
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
                        // Price locked at booking time (falls back to the pack's current price)
                        const locked = bookingUnitPrice(b, pack);
                        const unitPrice = pack || b.unitPrice != null ? locked.amount : 0;
                        const cur = locked.currency === "MAD" ? "MAD" : "€";
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
                            ? `${new Date(b.arrivalDate).toLocaleDateString("fr-FR")} → ${b.departureDate
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
                            <div className="flex items-center gap-1.5 flex-wrap mt-1">
                              {b.unitPrice != null && (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-violet-50 text-violet-700 border border-violet-200 text-[10px] font-semibold">
                                  Tarif fixé : {b.unitPrice} {b.priceCurrency || "€"}
                                </span>
                              )}
                              {b.discountCode || (b.discountAmount || 0) > 0 ? (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200 text-[10px] font-mono font-semibold">
                                  <Tag className="h-2.5 w-2.5" />
                                  {b.discountCode || "Promo"} : -{b.discountAmount || 0} {cur}
                                </span>
                              ) : null}
                              <button
                                type="button"
                                onClick={() => openPricingModal(b)}
                                className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-700 hover:text-amber-900 bg-amber-50 hover:bg-amber-100 px-1.5 py-0.5 rounded border border-amber-200 transition cursor-pointer"
                                title="Modifier le tarif du pack ou la promo"
                              >
                                <Pencil className="h-2.5 w-2.5" /> Modifier tarif / promo
                              </button>
                            </div>
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
                        {waFollowUpLink(b) && (
                          <a
                            href={waFollowUpLink(b)!}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 rounded-lg text-gray-500 hover:text-[#16a34a] hover:bg-green-50 transition"
                            title="Écrire sur WhatsApp (message de confirmation pré-rempli)"
                          >
                            <MessageCircle className="h-4 w-4" />
                          </a>
                        )}
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
                          onClick={() => openPricingModal(b)}
                          className="p-1.5 rounded-lg text-gray-500 hover:text-amber-600 hover:bg-amber-50 transition cursor-pointer"
                          title="Modifier le tarif du pack et le code promo"
                        >
                          <Tag className="h-4 w-4" />
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
                      let departure = form.departure;
                      if (!departure || departure <= arrival) {
                        const nights = selectedFormPack ? packNightCount(selectedFormPack) : 3;
                        const arrD = new Date(arrival);
                        arrD.setDate(arrD.getDate() + (nights || 3));
                        departure = arrD.toISOString().slice(0, 10);
                      }
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
                    min={form.arrival || "2027-01-01"}
                    max="2027-01-31"
                    onChange={(e) => {
                      setForm({ ...form, departure: e.target.value });
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

              {/* Calculated stay duration badge */}
              {form.arrival && form.departure && (
                <div className="rounded-lg border border-amber-200 bg-amber-50/70 p-2.5 text-xs text-amber-900 flex items-center justify-between">
                  <span className="font-medium text-amber-800">
                    Durée du séjour sélectionnée :
                  </span>
                  <span className="font-bold inline-flex items-center gap-1.5">
                    {Math.max(
                      0,
                      Math.round(
                        (new Date(form.departure).getTime() - new Date(form.arrival).getTime()) /
                          (1000 * 60 * 60 * 24),
                      ),
                    )}{" "}
                    nuits
                    {selectedFormPack && (
                      <span className="text-[11px] font-normal text-amber-700">
                        (Pack : {packNightCount(selectedFormPack)} nuits)
                      </span>
                    )}
                  </span>
                </div>
              )}

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
                className={`mb-4 rounded-lg border px-3 py-2 text-xs ${autoEmail === "sent"
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

      {/* Price & Promo Override Modal */}
      {pricingModalBooking && (() => {
        const targetPack = packs.find((p) => p.id === pricingModalBooking.packId);
        const catalogPrice = packPrice(targetPack ?? undefined);
        const count = pricingModalBooking.numPeople || 1;
        const cur = pricingForm.priceCurrency;
        const unitVal = Math.max(0, Number(pricingForm.unitPrice) || 0);
        const grossTotal = unitVal * count;
        const discountVal = Math.max(0, Number(pricingForm.discountAmount) || 0);
        const netPackTotal = Math.max(0, grossTotal - discountVal);
        const transferCost = pricingModalBooking.transferCost || 0;
        const finalNetTotal = netPackTotal + transferCost;
        const autoMad = cur === "MAD" ? finalNetTotal : Math.round(finalNetTotal * EUR_TO_MAD);
        const finalMad = pricingForm.useCustomMad && pricingForm.amountDueMad !== ""
          ? Math.max(0, Number(pricingForm.amountDueMad))
          : autoMad;
        const hasPromo = Boolean(pricingForm.discountCode || discountVal > 0);

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
            <div className="w-full max-w-xl rounded-2xl border border-gray-200 bg-white shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 my-8">
              {/* Header */}
              <div className="flex items-center justify-between border-b border-gray-100 bg-slate-900 px-6 py-4 text-white">
                <div>
                  <h3 className="font-display text-lg font-bold flex items-center gap-2">
                    <Tag className="h-5 w-5 text-amber-400" />
                    Modifier la tarification & le code promo
                  </h3>
                  <p className="text-xs text-slate-300 mt-0.5">
                    Réservation #{pricingModalBooking.ticketCode} · {pricingModalBooking.customerName}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setPricingModalBooking(null)}
                  className="rounded-lg p-1 text-slate-400 hover:bg-slate-800 hover:text-white transition cursor-pointer"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Body */}
              <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
                {pricingError && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 shrink-0 text-red-500" />
                    <span>{pricingError}</span>
                  </div>
                )}
                {pricingSuccess && (
                  <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-700 flex items-center gap-2 font-semibold">
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
                    <span>{pricingSuccess}</span>
                  </div>
                )}

                {/* Pack Info Card */}
                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
                  <div>
                    <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Forfait réservé</span>
                    <p className="text-sm font-bold text-slate-900">{targetPack?.name || pricingModalBooking.packName}</p>
                    <p className="text-xs text-slate-500">
                      {count} participant{count > 1 ? "s" : ""} · Tarif catalogue : {catalogPrice.amount} {catalogPrice.currency === "MAD" ? "MAD" : "€"} / personne
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleResetToCatalogPrice}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-100 transition cursor-pointer shadow-xs"
                    title="Rétablir le tarif catalogue officiel"
                  >
                    <RotateCcw className="h-3.5 w-3.5 text-slate-500" />
                    Rétablir prix catalogue
                  </button>
                </div>

                {/* 1. Unit Price Section */}
                <div className="space-y-2">
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-700">
                    Prix du forfait par personne
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="col-span-2 relative">
                      <input
                        type="number"
                        min="0"
                        step="any"
                        value={pricingForm.unitPrice}
                        onChange={(e) =>
                          setPricingForm((prev) => ({ ...prev, unitPrice: e.target.value }))
                        }
                        className="w-full rounded-xl border border-gray-300 bg-white px-3.5 py-2.5 text-sm font-bold text-gray-900 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                        placeholder="Ex: 180"
                      />
                      <span className="absolute right-3.5 top-2.5 text-sm font-semibold text-gray-400">
                        {cur === "MAD" ? "MAD / pers." : "€ / pers."}
                      </span>
                    </div>

                    <select
                      value={pricingForm.priceCurrency}
                      onChange={(e) =>
                        setPricingForm((prev) => ({
                          ...prev,
                          priceCurrency: e.target.value as CommissionCurrency,
                        }))
                      }
                      className="rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-sm font-semibold text-gray-800 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500 cursor-pointer"
                    >
                      <option value="EUR">Euros (€)</option>
                      <option value="MAD">Dirhams (MAD)</option>
                    </select>
                  </div>
                  <p className="text-xs text-gray-500">
                    Sous-total brut ({count} pers.) :{" "}
                    <span className="font-semibold text-gray-800">
                      {unitVal} {cur} × {count} = {grossTotal} {cur}
                    </span>
                  </p>
                </div>

                {/* 2. Promo / Discount Section */}
                <div className="space-y-3 pt-3 border-t border-gray-100">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold uppercase tracking-wider text-gray-700 flex items-center gap-1.5">
                      <Tag className="h-3.5 w-3.5 text-amber-600" />
                      Code Promo & Réduction
                    </label>

                    {hasPromo && (
                      <button
                        type="button"
                        onClick={handleRemovePromo}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 transition cursor-pointer shadow-xs"
                      >
                        <Trash2 className="h-3.5 w-3.5 text-red-600" />
                        Supprimer la promo
                      </button>
                    )}
                  </div>

                  {/* Active promo banner */}
                  {hasPromo ? (
                    <div className="p-3 bg-amber-50/80 border border-amber-200 rounded-xl flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-amber-900">
                            Code appliqué : <code className="bg-white px-1.5 py-0.5 rounded border border-amber-300 text-amber-800">{pricingForm.discountCode || "Réduction personnalisée"}</code>
                          </span>
                        </div>
                        <p className="text-xs text-amber-700 mt-0.5 font-medium">
                          Remise déduite du forfait : -{discountVal} {cur}
                        </p>
                      </div>
                      <span className="text-xs font-bold text-emerald-700 bg-white px-2 py-1 rounded-lg border border-amber-200 shadow-2xs">
                        -{discountVal} {cur}
                      </span>
                    </div>
                  ) : (
                    <div className="p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-500 flex items-center justify-between">
                      <span>Aucun code promo appliqué à cette réservation.</span>
                      <span className="text-[11px] font-semibold text-gray-400">Plein tarif</span>
                    </div>
                  )}

                  {/* Quick Select existing promo code or custom amount */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                    <div>
                      <label className="block text-[11px] font-semibold text-gray-600 mb-1">
                        Appliquer un code promo existant
                      </label>
                      <select
                        value={pricingForm.discountCodeId || ""}
                        onChange={(e) => handleSelectDiscountCode(e.target.value)}
                        className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-xs font-medium text-gray-700 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500 cursor-pointer"
                      >
                        <option value="">Sélectionner un code (ou aucun)...</option>
                        {discountCodes.map((d) => (
                          <option key={d.id} value={d.id}>
                            {d.code} ({d.discountType === "percent" ? `-${d.discountAmount}%` : `-${d.discountAmount}€`})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-gray-600 mb-1">
                        Montant de la réduction ({cur})
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="any"
                        value={pricingForm.discountAmount}
                        onChange={(e) =>
                          setPricingForm((prev) => ({
                            ...prev,
                            discountAmount: e.target.value,
                          }))
                        }
                        className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-xs font-bold text-gray-900 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                        placeholder="Ex: 50"
                      />
                    </div>
                  </div>
                </div>

                {/* Transfer Info (if booked) */}
                {transferCost > 0 && (
                  <div className="pt-3 border-t border-gray-100 flex items-center justify-between text-xs text-gray-600 bg-blue-50/50 p-2.5 rounded-xl border border-blue-100">
                    <span className="font-medium text-blue-900">Navette / Transfert aéroport ou port</span>
                    <span className="font-bold text-blue-800">+{transferCost} €</span>
                  </div>
                )}

                {/* 3. Moroccan Dirhams Override */}
                <div className="pt-3 border-t border-gray-100 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold uppercase tracking-wider text-gray-700 flex items-center gap-1.5">
                      <Coins className="h-3.5 w-3.5 text-emerald-600" />
                      Paiements Maroc (Montant dû en Dirhams)
                    </label>
                    <label className="flex items-center gap-1.5 text-xs text-gray-600 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={pricingForm.useCustomMad}
                        onChange={(e) =>
                          setPricingForm((prev) => ({
                            ...prev,
                            useCustomMad: e.target.checked,
                            amountDueMad: e.target.checked
                              ? prev.amountDueMad || String(autoMad)
                              : "",
                          }))
                        }
                        className="rounded border-gray-300 text-amber-600 focus:ring-amber-500"
                      />
                      <span>Montant MAD personnalisé</span>
                    </label>
                  </div>

                  {pricingForm.useCustomMad ? (
                    <div className="relative">
                      <input
                        type="number"
                        min="0"
                        value={pricingForm.amountDueMad}
                        onChange={(e) =>
                          setPricingForm((prev) => ({ ...prev, amountDueMad: e.target.value }))
                        }
                        className="w-full rounded-xl border border-emerald-300 bg-emerald-50/30 px-3.5 py-2 text-sm font-bold text-emerald-900 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                        placeholder={`Ex: ${autoMad}`}
                      />
                      <span className="absolute right-3.5 top-2 text-xs font-bold text-emerald-700">
                        MAD fixé manuellement
                      </span>
                    </div>
                  ) : (
                    <p className="text-xs text-gray-500">
                      Calcul automatique pour le Maroc :{" "}
                      <span className="font-bold text-emerald-700">{autoMad} MAD</span>{" "}
                      {cur === "EUR" ? "(converti à 1€ = 10 MAD)" : ""}
                    </p>
                  )}
                </div>

                {/* 4. Live Calculation & Total Box */}
                <div className="p-4 rounded-xl bg-slate-900 text-white space-y-2 shadow-inner">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    Récapitulatif financier de la réservation
                  </span>
                  <div className="space-y-1 text-xs text-slate-300">
                    <div className="flex justify-between">
                      <span>Sous-total forfait ({count} pers. à {unitVal} {cur}) :</span>
                      <span className="font-semibold text-white">{grossTotal} {cur}</span>
                    </div>
                    {discountVal > 0 ? (
                      <div className="flex justify-between text-amber-300">
                        <span>Réduction code promo ({pricingForm.discountCode || "Promo"}) :</span>
                        <span className="font-semibold">-{discountVal} {cur}</span>
                      </div>
                    ) : (
                      <div className="flex justify-between text-slate-400">
                        <span>Réduction code promo :</span>
                        <span>0 {cur} (Aucune promo)</span>
                      </div>
                    )}
                    {transferCost > 0 && (
                      <div className="flex justify-between text-blue-300">
                        <span>Navette / Transfert :</span>
                        <span className="font-semibold">+{transferCost} €</span>
                      </div>
                    )}
                  </div>

                  <div className="pt-2 border-t border-slate-700 flex items-center justify-between">
                    <div>
                      <span className="text-xs uppercase font-semibold text-slate-400">TOTAL NET CLIENT</span>
                      <p className="text-2xl font-black text-amber-400">
                        {finalNetTotal} {cur}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="text-[11px] text-slate-400 block uppercase">Équivalent Maroc</span>
                      <span className="text-lg font-bold text-emerald-400">{finalMad} MAD</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="border-t border-gray-100 bg-gray-50 px-6 py-3.5 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setPricingModalBooking(null)}
                  disabled={savingPricing}
                  className="rounded-xl border border-gray-300 px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-white hover:text-gray-900 transition cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="button"
                  onClick={handleSavePricing}
                  disabled={savingPricing}
                  className="inline-flex items-center gap-2 rounded-xl bg-amber-600 px-5 py-2 text-xs font-bold text-white shadow-sm hover:bg-amber-700 transition cursor-pointer disabled:opacity-50"
                >
                  {savingPricing ? (
                    <span>Enregistrement en cours…</span>
                  ) : (
                    <>
                      <Check className="h-4 w-4" /> Enregistrer les modifications
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        );
      })()}

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
