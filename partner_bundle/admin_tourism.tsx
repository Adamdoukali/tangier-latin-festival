import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect, useMemo, useCallback } from "react";
import {
  Compass,
  MapPin,
  Calendar,
  Clock,
  Search,
  Download,
  Phone,
  Mail,
  Users,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  Edit2,
  Trash2,
  X,
  ExternalLink,
  Sparkles,
  Ticket,
  ChevronRight,
  TrendingUp,
} from "lucide-react";
import {
  getBookings,
  getPacks,
  getCollaborators,
  updateBookingStatus,
  updateBooking,
  deleteBooking,
  ticketUrl,
  isTourismBooking,
  type Booking,
  type BookingStatus,
  type Collaborator,
} from "@/lib/admin-store";
import { sendFormNotification, ticketConfirmationEmail } from "@/lib/form-notify";
import { translateDynamicText, type Language } from "@/lib/translations";

export const Route = createFileRoute("/admin/tourism")({
  component: AdminTourismPage,
});

interface TourDefinition {
  id: string;
  name: string;
  shortName: string;
  date: string;
  time: string;
  location: string;
  pickup: string;
  pricePerPerson: number;
  currency: string;
  color: string;
}

const TOURS: TourDefinition[] = [
  {
    id: "tour-tangier",
    name: "Tangier Discovery Tour",
    shortName: "Tangier",
    date: "Saturday · Jan 9, 2027",
    time: "15:00 – 19:30",
    location: "Tangier (Kasbah, Cap Spartel, Caves of Hercules)",
    pickup: "Hotel Kenzi Solazur Lobby",
    pricePerPerson: 15,
    currency: "€",
    color: "blue",
  },
  {
    id: "tour-asilah",
    name: "Asilah Coastal Tour",
    shortName: "Asilah",
    date: "Saturday · Jan 9, 2027",
    time: "12:00 – 17:30",
    location: "Asilah (White Medina, Ramparts, Oceanfront)",
    pickup: "Hotel Kenzi Solazur Lobby",
    pricePerPerson: 25,
    currency: "€",
    color: "cyan",
  },
  {
    id: "tour-chefchaouen",
    name: "Chefchaouen Blue Pearl Tour",
    shortName: "Chefchaouen",
    date: "Sunday · Jan 10, 2027",
    time: "11:00 – 19:00",
    location: "Chefchaouen & Rif Mountains",
    pickup: "Hotel Kenzi Solazur Lobby",
    pricePerPerson: 30,
    currency: "€",
    color: "indigo",
  },
];

function getTourId(b: Booking): string {
  if (b.packId?.startsWith("tour-")) return b.packId;
  const lower = (b.packName || "").toLowerCase();
  if (lower.includes("chefchaouen") || lower.includes("chawan") || lower.includes("chaouen")) {
    return "tour-chefchaouen";
  }
  if (lower.includes("asilah") || lower.includes("asella")) {
    return "tour-asilah";
  }
  return "tour-tangier";
}

function parseGuests(b: Booking): string[] {
  if (b.guestDetails) {
    try {
      const parsed = JSON.parse(b.guestDetails);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed
          .map((g) => `${g.firstName || ""} ${g.lastName || ""}`.trim())
          .filter(Boolean);
      }
    } catch {
      // fallback
    }
  }
  if (b.customerName) {
    return b.customerName.split(/\s*&\s*/).map((s) => s.trim()).filter(Boolean);
  }
  return [];
}

function AdminTourismPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Edit Modal
  const [editingBooking, setEditingBooking] = useState<Booking | null>(null);
  const [editForm, setEditForm] = useState({
    customerName: "",
    tourId: "tour-tangier",
    numPeople: 1,
    email: "",
    phone: "",
    country: "",
    roomNumber: "",
    notes: "",
    status: "pending" as BookingStatus,
  });
  const [savingEdit, setSavingEdit] = useState(false);

  // Delete Modal
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    const [b, c] = await Promise.all([getBookings(), getCollaborators()]);
    setBookings(b);
    setCollaborators(c);
    setLoading(false);
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  const copy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  // Filter only tourism bookings
  const tourismBookings = useMemo(() => {
    return bookings.filter(isTourismBooking);
  }, [bookings]);

  // Master non-tourism festival bookings for cross-linking display
  const festivalBookings = useMemo(() => {
    return bookings.filter((b) => !isTourismBooking(b));
  }, [bookings]);

  // KPIs
  const stats = useMemo(() => {
    const totalBookings = tourismBookings.length;
    const active = tourismBookings.filter((b) => b.status !== "declined");
    const totalGuests = active.reduce((sum, b) => sum + (b.numPeople || 1), 0);

    const tangierGuests = active
      .filter((b) => getTourId(b) === "tour-tangier")
      .reduce((sum, b) => sum + (b.numPeople || 1), 0);

    const asilahGuests = active
      .filter((b) => getTourId(b) === "tour-asilah")
      .reduce((sum, b) => sum + (b.numPeople || 1), 0);

    const chefchaouenGuests = active
      .filter((b) => getTourId(b) === "tour-chefchaouen")
      .reduce((sum, b) => sum + (b.numPeople || 1), 0);

    const totalRevenue = tangierGuests * 15 + asilahGuests * 25 + chefchaouenGuests * 30;
    const partnerCommissions = active
      .filter((b) => !!b.collaboratorId)
      .reduce((sum, b) => sum + (b.numPeople || 1) * 5, 0);

    return {
      totalBookings,
      totalGuests,
      tangierGuests,
      asilahGuests,
      chefchaouenGuests,
      totalRevenue,
      partnerCommissions,
    };
  }, [tourismBookings]);

  // Filtered rows for current tab & filters
  const filteredBookings = useMemo(() => {
    return tourismBookings.filter((b) => {
      const tourId = getTourId(b);
      if (activeTab !== "all" && tourId !== activeTab) return false;
      if (statusFilter !== "all" && b.status !== statusFilter) return false;

      if (search.trim()) {
        const q = search.toLowerCase();
        const guests = parseGuests(b).join(" ").toLowerCase();
        const collab = collaborators.find((c) => c.id === b.collaboratorId);
        const match =
          b.ticketCode?.toLowerCase().includes(q) ||
          b.customerName?.toLowerCase().includes(q) ||
          guests.includes(q) ||
          b.email?.toLowerCase().includes(q) ||
          b.phone?.toLowerCase().includes(q) ||
          b.roomNumber?.toLowerCase().includes(q) ||
          b.notes?.toLowerCase().includes(q) ||
          b.country?.toLowerCase().includes(q) ||
          collab?.name?.toLowerCase().includes(q) ||
          collab?.code?.toLowerCase().includes(q);
        if (!match) return false;
      }

      return true;
    });
  }, [tourismBookings, activeTab, statusFilter, search, collaborators]);

  // Handle status update
  const handleStatusChange = async (id: string, newStatus: BookingStatus) => {
    try {
      const updated = await updateBookingStatus(id, newStatus);
      await reload();

      if (newStatus === "confirmed" && updated?.email) {
        const bLang = ((updated.lang || "en") as Language);
        const tUrl = ticketUrl(updated.ticketCode) + (bLang !== "en" ? `&lang=${bLang}` : "");
        const mail = ticketConfirmationEmail({
          customerName: updated.customerName,
          packName: translateDynamicText(updated.packName, bLang),
          ticketCode: updated.ticketCode,
          numPeople: updated.numPeople || 1,
          ticketUrl: tUrl,
          lang: bLang,
          guests: parseGuests(updated),
          arrivalDate: updated.arrivalDate,
          departureDate: updated.departureDate,
        });

        sendFormNotification({
          subject: `Tourism Booking Confirmed: ${updated.customerName} (${updated.ticketCode})`,
          guestSubject: mail.subject,
          lang: bLang,
          ticket: { code: updated.ticketCode, url: tUrl },
          fields: {
            Name: updated.customerName,
            Email: updated.email,
            Excursion: updated.packName,
            Participants: updated.numPeople || 1,
            Ticket: tUrl,
            Code: updated.ticketCode,
          },
          autoresponse: mail.body,
        }).catch(() => {});
      }
    } catch (e) {
      alert(e instanceof Error ? e.message : String(e));
    }
  };

  // Open Edit Modal
  const openEdit = (b: Booking) => {
    setEditingBooking(b);
    setEditForm({
      customerName: b.customerName || "",
      tourId: getTourId(b),
      numPeople: b.numPeople || 1,
      email: b.email || "",
      phone: b.phone || "",
      country: b.country || "",
      roomNumber: b.roomNumber || "",
      notes: b.notes || "",
      status: b.status,
    });
  };

  // Save Edit
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBooking) return;
    setSavingEdit(true);

    try {
      const tourDef = TOURS.find((t) => t.id === editForm.tourId) || TOURS[0];
      await updateBooking(editingBooking.id, {
        customerName: editForm.customerName,
        packId: tourDef.id,
        packName: `Tourism: ${tourDef.name} (${tourDef.date})`,
        numPeople: editForm.numPeople,
        email: editForm.email,
        phone: editForm.phone,
        country: editForm.country,
        roomNumber: editForm.roomNumber || null,
        notes: editForm.notes,
        status: editForm.status,
      });

      setEditingBooking(null);
      await reload();
    } catch (err) {
      alert(err instanceof Error ? err.message : String(err));
    }
    setSavingEdit(false);
  };

  // Delete
  const handleDelete = async (id: string) => {
    try {
      await deleteBooking(id);
      setDeletingId(null);
      await reload();
    } catch (err) {
      alert(err instanceof Error ? err.message : String(err));
    }
  };

  // CSV Export for current view or specific tour
  const exportCSV = (tourId?: string) => {
    const list = tourId
      ? tourismBookings.filter((b) => getTourId(b) === tourId)
      : filteredBookings;

    const tourDef = tourId ? TOURS.find((t) => t.id === tourId) : null;
    const filename = tourDef
      ? `TLF-2027-Tourism-Manifest-${tourDef.shortName}.csv`
      : `TLF-2027-Tourism-All-Bookings.csv`;

    const headers = [
      "Ticket Code",
      "Customer / Lead Name",
      "Individual Guests",
      "Guest Count",
      "Excursion / Tour",
      "Tour Date",
      "Schedule",
      "Total Price (EUR)",
      "Email",
      "Phone / WhatsApp",
      "Country",
      "Hotel Room #",
      "Partner Referral",
      "Special Requests / Notes",
      "Status",
      "Created At",
    ];

    const rows = list.map((b) => {
      const bTour = TOURS.find((t) => t.id === getTourId(b)) || TOURS[0];
      const guests = parseGuests(b);
      const collab = collaborators.find((c) => c.id === b.collaboratorId);
      const cost = (b.numPeople || 1) * bTour.pricePerPerson;

      return [
        b.ticketCode,
        `"${(b.customerName || "").replace(/"/g, '""')}"`,
        `"${guests.join("; ").replace(/"/g, '""')}"`,
        b.numPeople || 1,
        `"${bTour.name}"`,
        `"${bTour.date}"`,
        `"${bTour.time}"`,
        cost,
        b.email || "",
        `"${b.phone || ""}"`,
        `"${b.country || ""}"`,
        `"${b.roomNumber || ""}"`,
        collab ? `"${collab.name} (${collab.code})"` : "Direct Website",
        `"${(b.notes || "").replace(/"/g, '""')}"`,
        b.status,
        b.createdAt,
      ];
    });

    const csvContent =
      "data:text/csv;charset=utf-8,\uFEFF" +
      [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // WhatsApp Tour Manifest Coordinator Dispatch
  const openWhatsAppCoordinator = (tour: TourDefinition) => {
    const list = tourismBookings.filter(
      (b) => getTourId(b) === tour.id && b.status !== "declined"
    );
    const totalCount = list.reduce((s, b) => s + (b.numPeople || 1), 0);

    let message = `*Tangier Latin Festival 2027 — Tour Manifest*\n`;
    message += `📍 *Tour:* ${tour.name}\n`;
    message += `📅 *Date & Time:* ${tour.date} (${tour.time})\n`;
    message += `🏨 *Pickup:* ${tour.pickup}\n`;
    message += `👥 *Total Confirmed Passengers:* ${totalCount} pax\n\n`;
    message += `*Passenger List:*\n`;

    list.forEach((b, idx) => {
      const guests = parseGuests(b);
      const guestStr = guests.length > 0 ? guests.join(", ") : b.customerName;
      message += `${idx + 1}. *${guestStr}* (${b.numPeople || 1} pax) — Room: ${b.roomNumber || "N/A"} — Tel: ${b.phone || "N/A"}\n`;
    });

    const waUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(waUrl, "_blank");
  };

  const statusBadges: Record<string, string> = {
    pending: "bg-amber-50 text-amber-700 border-amber-200",
    confirmed: "bg-emerald-50 text-emerald-700 border-emerald-200",
    "checked-in": "bg-cyan-50 text-cyan-700 border-cyan-200",
    declined: "bg-red-50 text-red-700 border-red-200",
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-gray-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="h-10 w-10 rounded-xl bg-blue-600 text-white grid place-items-center shadow-xs">
              <Compass className="h-5 w-5" />
            </div>
            <div>
              <h1 className="font-display text-2xl font-bold text-gray-900">
                Tourism & Excursions
              </h1>
              <p className="text-xs text-gray-500 mt-0.5">
                Manage guest bookings for Tangier, Asilah, and Chefchaouen tours, export guide manifests, and track revenues.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={() => exportCSV()}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold transition cursor-pointer"
          >
            <Download className="h-4 w-4" />
            <span>Export CSV</span>
          </button>

          <button
            onClick={() => copy("public-link", `${window.location.origin}/book-tourism`)}
            className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer border ${
              copiedId === "public-link"
                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                : "bg-white hover:bg-gray-50 text-gray-700 border-gray-300"
            }`}
          >
            {copiedId === "public-link" ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            <span>{copiedId === "public-link" ? "Copied Link" : "Copy /book-tourism"}</span>
          </button>

          <Link
            to="/book-tourism"
            target="_blank"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition shadow-xs cursor-pointer"
          >
            <ExternalLink className="h-4 w-4" />
            <span>Open Public Page</span>
          </Link>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between text-gray-500">
            <span className="text-[10px] font-bold uppercase tracking-wider">Total Bookings</span>
            <Ticket className="h-4 w-4 text-blue-600" />
          </div>
          <p className="mt-2 font-display text-2xl font-black text-slate-900">{stats.totalBookings}</p>
          <span className="text-[10px] text-gray-400 font-medium">Reservations</span>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between text-gray-500">
            <span className="text-[10px] font-bold uppercase tracking-wider">Total Guests</span>
            <Users className="h-4 w-4 text-emerald-600" />
          </div>
          <p className="mt-2 font-display text-2xl font-black text-emerald-600">{stats.totalGuests}</p>
          <span className="text-[10px] text-gray-400 font-medium">Passengers</span>
        </div>

        <div className="rounded-xl border border-blue-200 bg-blue-50/50 p-4 shadow-xs">
          <div className="flex items-center justify-between text-blue-800">
            <span className="text-[10px] font-bold uppercase tracking-wider">Tangier Tour</span>
            <MapPin className="h-4 w-4 text-blue-600" />
          </div>
          <p className="mt-2 font-display text-2xl font-black text-blue-800">{stats.tangierGuests}</p>
          <span className="text-[10px] text-blue-600 font-medium">Sat Jan 9 (Half-Day)</span>
        </div>

        <div className="rounded-xl border border-cyan-200 bg-cyan-50/50 p-4 shadow-xs">
          <div className="flex items-center justify-between text-cyan-800">
            <span className="text-[10px] font-bold uppercase tracking-wider">Asilah Tour</span>
            <MapPin className="h-4 w-4 text-cyan-600" />
          </div>
          <p className="mt-2 font-display text-2xl font-black text-cyan-800">{stats.asilahGuests}</p>
          <span className="text-[10px] text-cyan-600 font-medium">Sat Jan 9 (Day Trip)</span>
        </div>

        <div className="rounded-xl border border-indigo-200 bg-indigo-50/50 p-4 shadow-xs">
          <div className="flex items-center justify-between text-indigo-800">
            <span className="text-[10px] font-bold uppercase tracking-wider">Chefchaouen</span>
            <MapPin className="h-4 w-4 text-indigo-600" />
          </div>
          <p className="mt-2 font-display text-2xl font-black text-indigo-800">{stats.chefchaouenGuests}</p>
          <span className="text-[10px] text-indigo-600 font-medium">Sun Jan 10 · 30 €</span>
        </div>

        <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-4 shadow-xs">
          <div className="flex items-center justify-between text-emerald-800">
            <span className="text-[10px] font-bold uppercase tracking-wider">Partner Commissions</span>
            <Users className="h-4 w-4 text-emerald-600" />
          </div>
          <p className="mt-2 font-display text-2xl font-black text-emerald-800">{stats.partnerCommissions} €</p>
          <span className="text-[10px] text-emerald-600 font-medium">5 € / guest</span>
        </div>

        <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-4 shadow-xs">
          <div className="flex items-center justify-between text-amber-800">
            <span className="text-[10px] font-bold uppercase tracking-wider">Total Revenue</span>
            <TrendingUp className="h-4 w-4 text-amber-600" />
          </div>
          <p className="mt-2 font-display text-2xl font-black text-amber-800">{stats.totalRevenue} €</p>
          <span className="text-[10px] text-amber-600 font-medium">Tourism Sales</span>
        </div>
      </div>

      {/* Destination Tour Overview Cards with Manifest Actions */}
      <div className="grid md:grid-cols-3 gap-4">
        {TOURS.map((t) => {
          const count = tourismBookings
            .filter((b) => getTourId(b) === t.id && b.status !== "declined")
            .reduce((s, b) => s + (b.numPeople || 1), 0);

          return (
            <div
              key={t.id}
              className={`rounded-2xl border bg-white p-5 shadow-xs flex flex-col justify-between ${
                activeTab === t.id ? "border-blue-500 ring-2 ring-blue-500/20" : "border-gray-200"
              }`}
            >
              <div>
                <div className="flex items-center justify-between gap-2">
                  <span className="px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-900 font-bold text-[10px] uppercase tracking-wider">
                    {t.shortName}
                  </span>
                  <span className="font-display text-lg font-black text-slate-900">
                    {count} <span className="text-xs text-gray-500 font-normal">pax</span>
                  </span>
                </div>

                <h3 className="font-display text-base font-bold text-gray-900 mt-2">{t.name}</h3>

                <div className="mt-2 space-y-1 text-xs text-gray-600">
                  <p className="flex items-center gap-1.5 font-medium">
                    <Calendar className="h-3.5 w-3.5 text-blue-500 shrink-0" />
                    <span>{t.date}</span>
                  </p>
                  <p className="flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                    <span>{t.time}</span>
                  </p>
                  <p className="flex items-center gap-1.5 text-gray-500">
                    <MapPin className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                    <span className="truncate">{t.pickup}</span>
                  </p>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => exportCSV(t.id)}
                  className="flex-1 inline-flex items-center justify-center gap-1 px-3 py-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold transition cursor-pointer"
                  title="Export Manifest CSV for Tour Driver and Guide"
                >
                  <Download className="h-3.5 w-3.5" />
                  <span>Manifest CSV</span>
                </button>
                <button
                  type="button"
                  onClick={() => openWhatsAppCoordinator(t)}
                  className="inline-flex items-center justify-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition cursor-pointer"
                  title="Send passenger manifest to coordinator via WhatsApp"
                >
                  <Phone className="h-3.5 w-3.5" />
                  <span>WhatsApp</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Main Table Area */}
      <div className="rounded-2xl border border-gray-200 bg-white shadow-xs overflow-hidden">
        {/* Filter Bar & Tabs */}
        <div className="p-4 border-b border-gray-200 bg-gray-50/50 flex flex-col md:flex-row items-center justify-between gap-4">
          {/* Destination Tabs */}
          <div className="flex items-center gap-1 bg-gray-200/80 p-1 rounded-xl w-full md:w-auto overflow-x-auto">
            <button
              onClick={() => setActiveTab("all")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer shrink-0 ${
                activeTab === "all" ? "bg-white text-slate-900 shadow-xs" : "text-gray-600 hover:text-gray-900"
              }`}
            >
              All Tours ({tourismBookings.length})
            </button>
            {TOURS.map((t) => {
              const tabCount = tourismBookings.filter((b) => getTourId(b) === t.id).length;
              return (
                <button
                  key={t.id}
                  onClick={() => setActiveTab(t.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer shrink-0 ${
                    activeTab === t.id ? "bg-white text-blue-700 shadow-xs" : "text-gray-600 hover:text-gray-900"
                  }`}
                >
                  {t.shortName} ({tabCount})
                </button>
              );
            })}
          </div>

          {/* Search and Status Filters */}
          <div className="flex items-center gap-2.5 w-full md:w-auto">
            <div className="relative flex-1 md:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search name, phone, ticket, room…"
                className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-gray-300 bg-white focus:outline-none focus:border-blue-500"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-1.5 text-xs rounded-xl border border-gray-300 bg-white focus:outline-none focus:border-blue-500 font-medium text-gray-700 cursor-pointer"
            >
              <option value="all">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="confirmed">Confirmed</option>
              <option value="checked-in">Checked In</option>
              <option value="declined">Declined</option>
            </select>
          </div>
        </div>

        {/* Table Content */}
        {loading ? (
          <div className="py-20 text-center text-xs text-gray-400 font-medium">Loading tourism registrations…</div>
        ) : filteredBookings.length === 0 ? (
          <div className="py-16 text-center text-gray-400 space-y-2">
            <Compass className="h-8 w-8 mx-auto text-gray-300" />
            <p className="text-sm font-semibold text-gray-600">No tourism bookings found</p>
            <p className="text-xs text-gray-400">
              When clients book excursions via <code className="font-mono text-blue-600">/book-tourism</code>, they will appear here.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50/70 text-[11px] font-bold uppercase tracking-wider text-gray-500">
                  <th className="px-4 py-3">Ticket / Lead</th>
                  <th className="px-4 py-3">Excursion / Date</th>
                  <th className="px-4 py-3 text-center">Pax</th>
                  <th className="px-4 py-3">All Participants</th>
                  <th className="px-4 py-3">Contact & Room</th>
                  <th className="px-4 py-3">Source / Partner</th>
                  <th className="px-4 py-3 text-center">Total</th>
                  <th className="px-4 py-3 text-center">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 font-normal">
                {filteredBookings.map((b) => {
                  const tour = TOURS.find((t) => t.id === getTourId(b)) || TOURS[0];
                  const guests = parseGuests(b);
                  const collab = collaborators.find((c) => c.id === b.collaboratorId);
                  const cost = (b.numPeople || 1) * tour.pricePerPerson;

                  // Find linked festival booking
                  const linkedFest = festivalBookings.find((fb) => {
                    if (b.notes?.includes(fb.ticketCode)) return true;
                    const fbPhone = (fb.phone || "").replace(/\D/g, "");
                    const bPhone = (b.phone || "").replace(/\D/g, "");
                    if (fbPhone.length >= 6 && bPhone.length >= 6 && (fbPhone.endsWith(bPhone.slice(-8)) || bPhone.endsWith(fbPhone.slice(-8)))) return true;
                    if (fb.email && b.email && fb.email.toLowerCase() === b.email.toLowerCase()) return true;
                    return false;
                  });

                  return (
                    <tr key={b.id} className="hover:bg-blue-50/30 transition">
                      {/* Ticket Code & Lead */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <a
                            href={ticketUrl(b.ticketCode)}
                            target="_blank"
                            rel="noreferrer"
                            className="font-mono text-blue-700 font-bold hover:underline"
                          >
                            {b.ticketCode}
                          </a>
                        </div>
                        <p className="font-bold text-gray-900 mt-0.5">{b.customerName}</p>
                        <span className="text-[10px] text-gray-400">
                          {new Date(b.createdAt).toLocaleDateString()}
                        </span>
                        {linkedFest && (
                          <div className="mt-1">
                            <span
                              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-semibold"
                              title={`Linked to Festival Reservation: ${linkedFest.customerName} (${linkedFest.packName})`}
                            >
                              <CheckCircle2 className="h-3 w-3 text-emerald-600 shrink-0" />
                              <span>Pass #{linkedFest.ticketCode}</span>
                            </span>
                          </div>
                        )}
                      </td>

                      {/* Excursion & Date */}
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-blue-100 text-blue-900">
                          {tour.name}
                        </span>
                        <p className="text-[11px] text-gray-600 font-medium mt-1">{tour.date}</p>
                        <p className="text-[10px] text-gray-400">{tour.time}</p>
                      </td>

                      {/* Pax */}
                      <td className="px-4 py-3 text-center">
                        <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-slate-100 font-display font-bold text-slate-800 text-xs">
                          {b.numPeople || 1}
                        </span>
                      </td>

                      {/* All Participants */}
                      <td className="px-4 py-3 max-w-[200px]">
                        {guests.length > 0 ? (
                          <div className="space-y-0.5">
                            {guests.map((gName, idx) => (
                              <p key={idx} className="text-gray-800 font-medium truncate">
                                • {gName}
                              </p>
                            ))}
                          </div>
                        ) : (
                          <span className="text-gray-400 italic">No names provided</span>
                        )}
                        {b.notes && (
                          <p className="mt-1 text-[10px] text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200/60 line-clamp-2">
                            {b.notes}
                          </p>
                        )}
                      </td>

                      {/* Contact & Room */}
                      <td className="px-4 py-3">
                        <p className="text-gray-700 truncate">{b.email}</p>
                        <div className="flex items-center gap-1 mt-0.5 text-gray-600">
                          <Phone className="h-3 w-3 text-gray-400" />
                          <span>{b.phone}</span>
                        </div>
                        {b.roomNumber && (
                          <span className="inline-block mt-1 px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 text-[10px] font-semibold">
                            Room: {b.roomNumber}
                          </span>
                        )}
                      </td>

                      {/* Source / Partner */}
                      <td className="px-4 py-3">
                        {collab ? (
                          <div>
                            <span className="font-bold text-gray-800">{collab.name}</span>
                            <span className="block text-[10px] font-mono text-blue-600">
                              {collab.code}
                            </span>
                          </div>
                        ) : (
                          <span className="text-gray-400">Website Direct</span>
                        )}
                      </td>

                      {/* Price Total */}
                      <td className="px-4 py-3 text-center">
                        <span className="font-display font-extrabold text-blue-700 text-sm">
                          {cost} €
                        </span>
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3 text-center">
                        <select
                          value={b.status}
                          onChange={(e) => handleStatusChange(b.id, e.target.value as BookingStatus)}
                          className={`appearance-none rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider border cursor-pointer focus:outline-none ${
                            statusBadges[b.status] || statusBadges.pending
                          }`}
                        >
                          <option value="pending">Pending</option>
                          <option value="confirmed">Confirmed</option>
                          <option value="checked-in">Checked In</option>
                          <option value="declined">Declined</option>
                        </select>
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => openEdit(b)}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition cursor-pointer"
                            title="Edit tourism booking"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => setDeletingId(b.id)}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition cursor-pointer"
                            title="Delete booking"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Edit Booking Modal */}
      {editingBooking && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-blue-600">
                  Edit Registration
                </span>
                <h3 className="font-display text-lg font-bold text-gray-900">
                  {editingBooking.ticketCode}
                </h3>
              </div>
              <button
                onClick={() => setEditingBooking(null)}
                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-4 text-xs">
              <div>
                <label className="block text-gray-700 font-bold mb-1">Lead / Customer Name</label>
                <input
                  type="text"
                  required
                  value={editForm.customerName}
                  onChange={(e) => setEditForm({ ...editForm, customerName: e.target.value })}
                  className="w-full rounded-xl border border-gray-300 px-3.5 py-2 text-xs focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-700 font-bold mb-1">Excursion Choice</label>
                  <select
                    value={editForm.tourId}
                    onChange={(e) => setEditForm({ ...editForm, tourId: e.target.value })}
                    className="w-full rounded-xl border border-gray-300 px-3 py-2 text-xs focus:outline-none focus:border-blue-500 font-medium"
                  >
                    {TOURS.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-gray-700 font-bold mb-1">Guest Count</label>
                  <input
                    type="number"
                    min={1}
                    max={20}
                    required
                    value={editForm.numPeople}
                    onChange={(e) =>
                      setEditForm({ ...editForm, numPeople: parseInt(e.target.value, 10) || 1 })
                    }
                    className="w-full rounded-xl border border-gray-300 px-3 py-2 text-xs focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-700 font-bold mb-1">Email</label>
                  <input
                    type="email"
                    value={editForm.email}
                    onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                    className="w-full rounded-xl border border-gray-300 px-3 py-2 text-xs focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-gray-700 font-bold mb-1">Phone / WhatsApp</label>
                  <input
                    type="text"
                    value={editForm.phone}
                    onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                    className="w-full rounded-xl border border-gray-300 px-3 py-2 text-xs focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-700 font-bold mb-1">Hotel Room #</label>
                  <input
                    type="text"
                    value={editForm.roomNumber}
                    onChange={(e) => setEditForm({ ...editForm, roomNumber: e.target.value })}
                    placeholder="Room 314 (optional)"
                    className="w-full rounded-xl border border-gray-300 px-3 py-2 text-xs focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-gray-700 font-bold mb-1">Status</label>
                  <select
                    value={editForm.status}
                    onChange={(e) =>
                      setEditForm({ ...editForm, status: e.target.value as BookingStatus })
                    }
                    className="w-full rounded-xl border border-gray-300 px-3 py-2 text-xs focus:outline-none focus:border-blue-500 font-medium"
                  >
                    <option value="pending">Pending</option>
                    <option value="confirmed">Confirmed</option>
                    <option value="checked-in">Checked In</option>
                    <option value="declined">Declined</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-gray-700 font-bold mb-1">Notes / Requests</label>
                <textarea
                  rows={2}
                  value={editForm.notes}
                  onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                  className="w-full rounded-xl border border-gray-300 px-3.5 py-2 text-xs focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="pt-3 border-t border-gray-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingBooking(null)}
                  className="px-4 py-2 rounded-xl border border-gray-300 text-gray-700 font-bold hover:bg-gray-50 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingEdit}
                  className="px-5 py-2 rounded-xl bg-blue-600 text-white font-bold hover:bg-blue-700 transition cursor-pointer disabled:opacity-50"
                >
                  {savingEdit ? "Saving…" : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingId && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-xl space-y-4 text-center">
            <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 grid place-items-center mx-auto">
              <Trash2 className="h-6 w-6" />
            </div>
            <h3 className="font-display text-base font-bold text-gray-900">Delete Tourism Booking?</h3>
            <p className="text-xs text-gray-500">
              Are you sure you want to permanently delete this excursion registration?
            </p>
            <div className="flex items-center justify-center gap-2 pt-2">
              <button
                onClick={() => setDeletingId(null)}
                className="px-4 py-2 rounded-xl border border-gray-300 text-gray-700 text-xs font-bold hover:bg-gray-50 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deletingId)}
                className="px-4 py-2 rounded-xl bg-red-600 text-white text-xs font-bold hover:bg-red-700 transition cursor-pointer"
              >
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
