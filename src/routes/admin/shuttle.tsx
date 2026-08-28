import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect, useMemo, useCallback } from "react";
import {
  Bus,
  Plane,
  Ship,
  Calendar,
  Search,
  Download,
  Phone,
  Mail,
  Users,
  Clock,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  Edit2,
  X,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  MapPin,
  TrendingUp,
  Plus,
  UserCheck,
  UserPlus,
  Sparkles,
} from "lucide-react";
import {
  getBookings,
  getPacks,
  getCollaborators,
  addBooking,
  updateBookingTransfer,
  calculateTransferCost,
  formatTransferOptionLabel,
  isTourismBooking,
  isTransferBooking,
  ticketUrl,
  EUR_TO_MAD,
  type Booking,
  type Pack,
  type Collaborator,
  type TransferType,
  type TransferOption,
} from "@/lib/admin-store";
import { buildTransferSpreadsheet } from "@/lib/admin-export-data";
import { downloadXlsx } from "@/lib/spreadsheet-export";

export const Route = createFileRoute("/admin/shuttle")({
  component: AdminShuttlePage,
});

type TabView = "arrivals" | "departures" | "all";

function FestivalTicketBadge({ booking }: { booking: Booking }) {
  const linkedCode = booking.notes?.match(/\[Linked Festival Ticket #([^\]]+)\]/i)?.[1];
  const noTicket = /festival ticket:\s*(none|not found|no)/i.test(booking.notes || "");
  const verifiedCode = linkedCode || (!isTransferBooking(booking) ? booking.ticketCode : "");

  if (verifiedCode) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[9px] font-bold text-emerald-800">
        <CheckCircle2 className="h-3 w-3" /> Festival ticket: {verifiedCode}
      </span>
    );
  }
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[9px] font-bold ${
        noTicket
          ? "border-slate-200 bg-slate-100 text-slate-600"
          : "border-amber-200 bg-amber-50 text-amber-800"
      }`}
    >
      <AlertCircle className="h-3 w-3" /> {noTicket ? "No festival ticket" : "Ticket not checked"}
    </span>
  );
}

function AdminShuttlePage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [packs, setPacks] = useState<Pack[]>([]);
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<TabView>("arrivals");
  const [typeFilter, setTypeFilter] = useState<"all" | "port" | "airport">("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "confirmed" | "pending" | "declined">(
    "all",
  );
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Add Transfer Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [addMode, setAddMode] = useState<"existing" | "manual">("existing");
  const [selectedExistingBookingId, setSelectedExistingBookingId] = useState("");
  const [clientSearch, setClientSearch] = useState("");
  const [addForm, setAddForm] = useState({
    customerName: "",
    email: "",
    phone: "",
    country: "Morocco",
    numPeople: 1,
    arrivalDate: "2027-01-08",
    departureDate: "2027-01-11",
    transferType: "port" as TransferType,
    transferOption: "round_trip" as TransferOption,
    transferLocation: "Port of Tangier (Tanger Ville)",
    transferDetails: "",
    transferCost: 10,
    status: "confirmed" as "confirmed" | "pending",
    notes: "",
  });
  const [savingAdd, setSavingAdd] = useState(false);
  const [addError, setAddError] = useState("");

  // Edit Modal State
  const [editingBooking, setEditingBooking] = useState<Booking | null>(null);
  const [editForm, setEditForm] = useState({
    needsTransfer: true,
    transferType: "port" as TransferType,
    transferOption: "round_trip" as TransferOption,
    transferLocation: "Port of Tangier (Tanger Ville)",
    transferDetails: "",
    transferCost: 10,
  });
  const [savingEdit, setSavingEdit] = useState(false);

  const reload = useCallback(async () => {
    setLoading(true);
    const [b, p, c] = await Promise.all([getBookings(), getPacks(), getCollaborators()]);
    setBookings(b);
    setPacks(p);
    setCollaborators(c);
    setLoading(false);
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  // Filter bookings that requested shuttle transfer or have transfer fields
  const shuttleBookings = useMemo(() => {
    return bookings.filter((b) => {
      // Considered shuttle booking if needsTransfer is true or transferType/Cost exists
      const hasTransfer =
        b.needsTransfer || !!b.transferType || (b.transferCost && b.transferCost > 0);
      if (!hasTransfer) return false;

      if (typeFilter !== "all" && b.transferType !== typeFilter) return false;
      if (statusFilter !== "all" && b.status !== statusFilter) return false;

      if (search.trim()) {
        const q = search.toLowerCase().trim();
        const matchName = (b.customerName || "").toLowerCase().includes(q);
        const matchEmail = (b.email || "").toLowerCase().includes(q);
        const matchPhone = (b.phone || "").toLowerCase().includes(q);
        const matchCode = (b.ticketCode || "").toLowerCase().includes(q);
        const matchDetails = (b.transferDetails || "").toLowerCase().includes(q);
        const matchLoc = (b.transferLocation || "").toLowerCase().includes(q);
        const matchPack = (b.packName || "").toLowerCase().includes(q);
        return (
          matchName ||
          matchEmail ||
          matchPhone ||
          matchCode ||
          matchDetails ||
          matchLoc ||
          matchPack
        );
      }
      return true;
    });
  }, [bookings, typeFilter, statusFilter, search]);

  // KPIs
  const stats = useMemo(() => {
    const totalBookings = shuttleBookings.length;
    const totalPassengers = shuttleBookings.reduce((sum, b) => sum + (b.numPeople || 1), 0);
    const portCount = shuttleBookings.filter((b) => b.transferType === "port").length;
    const airportCount = shuttleBookings.filter((b) => b.transferType === "airport").length;
    const totalRevenue = shuttleBookings.reduce((sum, b) => sum + (b.transferCost || 0), 0);

    const arrivalsCount = shuttleBookings.filter(
      (b) =>
        b.transferOption === "round_trip" ||
        b.transferOption === "one_way_arrival" ||
        !b.transferOption,
    ).length;

    const departuresCount = shuttleBookings.filter(
      (b) => b.transferOption === "round_trip" || b.transferOption === "one_way_departure",
    ).length;

    return {
      totalBookings,
      totalPassengers,
      portCount,
      airportCount,
      totalRevenue,
      arrivalsCount,
      departuresCount,
    };
  }, [shuttleBookings]);

  // Group by Arrival Date
  const arrivalGroups = useMemo(() => {
    const groups: Record<string, Booking[]> = {};
    shuttleBookings
      .filter(
        (b) =>
          b.transferOption === "round_trip" ||
          b.transferOption === "one_way_arrival" ||
          !b.transferOption,
      )
      .forEach((b) => {
        const dateKey = b.arrivalDate || "No Arrival Date";
        if (!groups[dateKey]) groups[dateKey] = [];
        groups[dateKey].push(b);
      });

    // Sort dates ascending
    return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b));
  }, [shuttleBookings]);

  // Group by Departure Date
  const departureGroups = useMemo(() => {
    const groups: Record<string, Booking[]> = {};
    shuttleBookings
      .filter((b) => b.transferOption === "round_trip" || b.transferOption === "one_way_departure")
      .forEach((b) => {
        const dateKey = b.departureDate || "No Departure Date";
        if (!groups[dateKey]) groups[dateKey] = [];
        groups[dateKey].push(b);
      });

    // Sort dates ascending
    return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b));
  }, [shuttleBookings]);

  // Transfer workbook in the supplied festival template, one row per passenger.
  const exportToXlsx = (dataToExport: Booking[], filename: string) => {
    if (!dataToExport.length) return;
    downloadXlsx(
      `${filename}.xlsx`,
      buildTransferSpreadsheet(dataToExport, packs, collaborators),
      "Transferts",
    );
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const transferFormUrl = () =>
    typeof window === "undefined" ? "/book-transfer" : `${window.location.origin}/book-transfer`;

  const openWhatsApp = (b: Booking, type: "arrival" | "departure") => {
    const rawDigits = (b.phone || "").replace(/\D/g, "");
    if (!rawDigits) return;
    const firstName = (b.customerName || "").split(/\s|&/)[0] || b.customerName;
    const date = type === "arrival" ? b.arrivalDate : b.departureDate;
    const location =
      b.transferLocation ||
      (b.transferType === "port" ? "Tanger Ville Port" : "Tangier Airport (TNG)");

    const text = `Hello ${firstName}! 🎉 This is the Tangier International Latin Festival Transfer Team.\n\nWe have your ${type === "arrival" ? "arrival shuttle pickup" : "departure shuttle dropoff"} scheduled for ${date} at ${location}.\n\nFlight/Boat info: ${b.transferDetails || "Not specified yet"}\nTicket Code: ${b.ticketCode}\n\nPlease let us know if your arrival time or flight/boat number changes. See you soon in Tangier!`;

    window.open(`https://wa.me/${rawDigits}?text=${encodeURIComponent(text)}`, "_blank");
  };

  const existingClients = useMemo(() => {
    const festivalBookings = bookings.filter(
      (booking) => !isTourismBooking(booking) && !isTransferBooking(booking),
    );
    if (!clientSearch.trim()) return festivalBookings.slice(0, 50);
    const q = clientSearch.toLowerCase().trim();
    return festivalBookings.filter(
      (b) =>
        (b.customerName || "").toLowerCase().includes(q) ||
        (b.email || "").toLowerCase().includes(q) ||
        (b.phone || "").toLowerCase().includes(q) ||
        (b.ticketCode || "").toLowerCase().includes(q) ||
        (b.packName || "").toLowerCase().includes(q),
    );
  }, [bookings, clientSearch]);

  const handleOpenAddModal = () => {
    setAddError("");
    setSelectedExistingBookingId("");
    setClientSearch("");
    setAddForm({
      customerName: "",
      email: "",
      phone: "",
      country: "Morocco",
      numPeople: 1,
      arrivalDate: "2027-01-08",
      departureDate: "2027-01-11",
      transferType: "port",
      transferOption: "round_trip",
      transferLocation: "Port of Tangier (Tanger Ville)",
      transferDetails: "",
      transferCost: 10,
      status: "confirmed",
      notes: "",
    });
    setIsAddModalOpen(true);
  };

  const handleSelectExistingBooking = (bId: string) => {
    setSelectedExistingBookingId(bId);
    const b = bookings.find((item) => item.id === bId);
    if (b) {
      const type = b.transferType || "port";
      const option = b.transferOption || "round_trip";
      const loc =
        b.transferLocation ||
        (type === "airport"
          ? "Tangier Ibn Battouta Airport (TNG)"
          : "Port of Tangier (Tanger Ville)");
      const cost =
        b.transferCost && b.transferCost > 0
          ? b.transferCost
          : calculateTransferCost(type, option, b.numPeople || 1, loc);

      setAddForm((prev) => ({
        ...prev,
        customerName: b.customerName,
        email: b.email || "",
        phone: b.phone || "",
        country: b.country || "Morocco",
        numPeople: b.numPeople || 1,
        arrivalDate: b.arrivalDate || "2027-01-08",
        departureDate: b.departureDate || "2027-01-11",
        transferType: type,
        transferOption: option,
        transferLocation: loc,
        transferDetails: b.transferDetails || "",
        transferCost: cost,
        status: b.status === "declined" ? "confirmed" : (b.status as any) || "confirmed",
        notes: b.notes || "",
      }));
    }
  };

  const handleSaveAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddError("");
    if (addMode === "existing") {
      if (!selectedExistingBookingId) {
        setAddError("Please select a client from the database.");
        return;
      }
      setSavingAdd(true);
      try {
        const festivalBooking = bookings.find(
          (booking) => booking.id === selectedExistingBookingId,
        );
        if (!festivalBooking) throw new Error("Festival ticket not found.");
        await addBooking({
          customerName: addForm.customerName.trim(),
          email: addForm.email.trim(),
          phone: addForm.phone.trim(),
          country: addForm.country.trim() || festivalBooking.country || "Morocco",
          numPeople: Math.max(1, addForm.numPeople || 1),
          danceLevel: "",
          packId: "",
          packName: "Navette / Shuttle Transfer",
          arrivalDate: addForm.arrivalDate || null,
          departureDate: addForm.departureDate || null,
          guestDetails: festivalBooking.guestDetails || null,
          needsTransfer: true,
          transferType: addForm.transferType,
          transferOption: addForm.transferOption,
          transferLocation: addForm.transferLocation,
          transferDetails: addForm.transferDetails,
          transferCost: addForm.transferCost,
          status: addForm.status,
          source: "manual",
          collaboratorId: null,
          notes: [
            `[Linked Festival Ticket #${festivalBooking.ticketCode}]`,
            `Festival ticket verified (${festivalBooking.status})`,
            addForm.notes,
          ]
            .filter(Boolean)
            .join(" | "),
        });
        setIsAddModalOpen(false);
        await reload();
      } catch (err: any) {
        setAddError(err?.message || "Failed to create the linked transfer request.");
      } finally {
        setSavingAdd(false);
      }
    } else {
      if (!addForm.customerName.trim()) {
        setAddError("Please enter the client's name.");
        return;
      }
      setSavingAdd(true);
      try {
        await addBooking({
          customerName: addForm.customerName.trim(),
          email: addForm.email.trim(),
          phone: addForm.phone.trim(),
          country: addForm.country.trim() || "Morocco",
          numPeople: Math.max(1, addForm.numPeople || 1),
          danceLevel: "",
          packId: "",
          packName: "Navette / Shuttle Transfer",
          arrivalDate: addForm.arrivalDate || null,
          departureDate: addForm.departureDate || null,
          needsTransfer: true,
          transferType: addForm.transferType,
          transferOption: addForm.transferOption,
          transferLocation: addForm.transferLocation,
          transferDetails: addForm.transferDetails,
          transferCost: addForm.transferCost,
          status: addForm.status,
          source: "manual",
          notes: addForm.notes,
        });
        setIsAddModalOpen(false);
        await reload();
      } catch (err: any) {
        setAddError(err?.message || "Failed to create transfer booking.");
      } finally {
        setSavingAdd(false);
      }
    }
  };

  const handleOpenEdit = (b: Booking) => {
    const defaultLoc =
      b.transferType === "airport"
        ? "Tangier Ibn Battouta Airport (TNG)"
        : "Port of Tangier (Tanger Ville)";
    setEditingBooking(b);
    setEditForm({
      needsTransfer: b.needsTransfer ?? true,
      transferType: b.transferType ?? "port",
      transferOption: b.transferOption ?? "round_trip",
      transferLocation: b.transferLocation ?? defaultLoc,
      transferDetails: b.transferDetails ?? "",
      transferCost:
        b.transferCost ??
        calculateTransferCost(
          b.transferType,
          b.transferOption,
          b.numPeople || 1,
          b.transferLocation,
        ),
    });
  };

  const handleSaveEdit = async () => {
    if (!editingBooking) return;
    setSavingEdit(true);
    try {
      await updateBookingTransfer(editingBooking.id, {
        needsTransfer: editForm.needsTransfer,
        transferType: editForm.needsTransfer ? editForm.transferType : null,
        transferOption: editForm.needsTransfer ? editForm.transferOption : null,
        transferLocation: editForm.needsTransfer ? editForm.transferLocation : null,
        transferDetails: editForm.needsTransfer ? editForm.transferDetails : null,
        transferCost: editForm.needsTransfer ? editForm.transferCost : 0,
      });
      setEditingBooking(null);
      await reload();
    } catch (err) {
      console.error(err);
    } finally {
      setSavingEdit(false);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-blue-600 text-white grid place-items-center shadow-xs">
              <Bus className="h-5 w-5" />
            </div>
            <div>
              <h1 className="font-display text-2xl font-bold text-gray-900">
                Transfer Shuttle Management
              </h1>
              <p className="text-xs text-gray-500">
                Manage, group, add, and export airport and port shuttle passenger lists.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => copyToClipboard(transferFormUrl(), "transfer-form")}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-blue-700 hover:bg-blue-800 text-white text-xs font-bold rounded-xl shadow-xs transition cursor-pointer"
          >
            {copiedId === "transfer-form" ? (
              <Check className="h-4 w-4" />
            ) : (
              <Copy className="h-4 w-4" />
            )}
            <span>
              {copiedId === "transfer-form" ? "Form Link Copied" : "Copy Transfer Form Link"}
            </span>
          </button>

          <a
            href="/book-transfer"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-2.5 border border-blue-300 bg-blue-50 hover:bg-blue-100 text-blue-800 text-xs font-bold rounded-xl transition"
          >
            <ExternalLink className="h-4 w-4" />
            Open Form
          </a>

          <button
            type="button"
            onClick={handleOpenAddModal}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs transition cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            <span>Add Transfer / Navette</span>
          </button>

          <button
            onClick={() =>
              exportToXlsx(
                shuttleBookings,
                `tableau-transferts-${new Date().toISOString().slice(0, 10)}`,
              )
            }
            disabled={!shuttleBookings.length}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-sm transition cursor-pointer disabled:opacity-50"
          >
            <Download className="h-4 w-4" />
            Export All XLSX ({shuttleBookings.length})
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3.5">
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-bold uppercase tracking-wider text-gray-500">
              Passengers
            </p>
            <Users className="h-4 w-4 text-blue-600" />
          </div>
          <p className="font-display text-2xl font-bold text-gray-900 mt-1">
            {stats.totalPassengers}
          </p>
          <p className="text-[10px] text-gray-500 mt-0.5">{stats.totalBookings} total bookings</p>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-700">
              Arrivals
            </p>
            <Calendar className="h-4 w-4 text-emerald-600" />
          </div>
          <p className="font-display text-2xl font-bold text-emerald-950 mt-1">
            {stats.arrivalsCount}
          </p>
          <p className="text-[10px] text-emerald-700 mt-0.5">
            {arrivalGroups.length} arrival dates
          </p>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-bold uppercase tracking-wider text-purple-700">
              Departures
            </p>
            <Calendar className="h-4 w-4 text-purple-600" />
          </div>
          <p className="font-display text-2xl font-bold text-purple-950 mt-1">
            {stats.departuresCount}
          </p>
          <p className="text-[10px] text-purple-700 mt-0.5">
            {departureGroups.length} departure dates
          </p>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-bold uppercase tracking-wider text-gray-500">
              Port vs Airport
            </p>
            <Ship className="h-4 w-4 text-amber-600" />
          </div>
          <p className="font-display text-lg font-bold text-gray-900 mt-1">
            {stats.portCount} <span className="text-xs font-normal text-gray-500">Port</span> ·{" "}
            {stats.airportCount} <span className="text-xs font-normal text-gray-500">Air</span>
          </p>
          <p className="text-[10px] text-gray-500 mt-0.5">Split by hub</p>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-2xs col-span-2 lg:col-span-1">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-bold uppercase tracking-wider text-amber-700">
              Shuttle Revenue
            </p>
            <TrendingUp className="h-4 w-4 text-amber-600" />
          </div>
          <p className="font-display text-2xl font-bold text-amber-700 mt-1">
            €{stats.totalRevenue}
          </p>
          <p className="text-[10px] text-gray-500 mt-0.5">
            Approx. {stats.totalRevenue * EUR_TO_MAD} MAD
          </p>
        </div>
      </div>

      {/* Controls & Search */}
      <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Navigation Tabs */}
        <div className="flex items-center bg-gray-100 p-1 rounded-xl w-fit">
          <button
            onClick={() => setTab("arrivals")}
            className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition cursor-pointer flex items-center gap-1.5 ${
              tab === "arrivals"
                ? "bg-white text-blue-700 shadow-xs"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            <Calendar className="h-3.5 w-3.5" />
            Arrival Groups ({stats.arrivalsCount})
          </button>
          <button
            onClick={() => setTab("departures")}
            className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition cursor-pointer flex items-center gap-1.5 ${
              tab === "departures"
                ? "bg-white text-purple-700 shadow-xs"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            <Calendar className="h-3.5 w-3.5" />
            Departure Groups ({stats.departuresCount})
          </button>
          <button
            onClick={() => setTab("all")}
            className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition cursor-pointer flex items-center gap-1.5 ${
              tab === "all"
                ? "bg-white text-gray-900 shadow-xs"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            <Users className="h-3.5 w-3.5" />
            All Passengers ({shuttleBookings.length})
          </button>
        </div>

        {/* Filters & Search */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Hub Type filter */}
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as any)}
            className="rounded-lg border border-gray-300 bg-white px-2.5 py-1.5 text-xs font-medium text-gray-700 focus:outline-none focus:border-blue-500 cursor-pointer"
          >
            <option value="all">All Hubs (Port & Airport)</option>
            <option value="port">🚢 Port only</option>
            <option value="airport">✈️ Airport only</option>
          </select>

          {/* Status filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="rounded-lg border border-gray-300 bg-white px-2.5 py-1.5 text-xs font-medium text-gray-700 focus:outline-none focus:border-blue-500 cursor-pointer"
          >
            <option value="all">All Statuses</option>
            <option value="confirmed">Confirmed</option>
            <option value="pending">Pending</option>
            <option value="declined">Declined</option>
          </select>

          {/* Search Box */}
          <div className="relative min-w-[220px]">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name, phone, code..."
              className="w-full rounded-lg border border-gray-300 bg-white pl-8 pr-3 py-1.5 text-xs text-gray-900 focus:outline-none focus:border-blue-500 placeholder:text-gray-400"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Content Areas */}
      {loading ? (
        <div className="p-12 text-center text-gray-500 text-sm">Loading shuttle bookings...</div>
      ) : shuttleBookings.length === 0 ? (
        <div className="rounded-2xl border border-gray-200 bg-white p-12 text-center">
          <Bus className="mx-auto h-10 w-10 text-gray-300 mb-3" />
          <h3 className="font-display text-lg font-bold text-gray-900">
            No Shuttle Bookings Found
          </h3>
          <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto">
            {search || typeFilter !== "all" || statusFilter !== "all"
              ? "Try adjusting your filters or search keywords."
              : "Standalone airport and port transfer requests will appear here, grouped by arrival and departure dates."}
          </p>
        </div>
      ) : tab === "arrivals" ? (
        /* ARRIVALS GROUP VIEW */
        <div className="space-y-6">
          {arrivalGroups.map(([date, groupBookings]) => {
            const passengersInGroup = groupBookings.reduce((sum, b) => sum + (b.numPeople || 1), 0);
            return (
              <div
                key={date}
                className="rounded-2xl border border-emerald-200/90 bg-white shadow-2xs overflow-hidden"
              >
                {/* Group Header Banner */}
                <div className="bg-gradient-to-r from-emerald-50 via-emerald-50/50 to-white px-5 py-3.5 border-b border-emerald-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-lg bg-emerald-600 text-white grid place-items-center shadow-2xs font-bold text-xs">
                      <Calendar className="h-4 w-4" />
                    </div>
                    <div>
                      <h3 className="font-display text-base font-bold text-gray-900">
                        Arrival Date: <span className="text-emerald-800">{date}</span>
                      </h3>
                      <p className="text-[11px] text-gray-500">
                        {groupBookings.length} bookings ·{" "}
                        <span className="font-bold text-emerald-800">
                          {passengersInGroup} passengers
                        </span>{" "}
                        to pick up
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() =>
                        exportToXlsx(
                          groupBookings,
                          `tableau-transferts-arrivees-${date.replace(/[^a-zA-Z0-9]/g, "-")}`,
                        )
                      }
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 border border-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg transition shadow-2xs cursor-pointer"
                    >
                      <Download className="h-3.5 w-3.5 text-white" />
                      Export Group XLSX
                    </button>
                  </div>
                </div>

                {/* Group Passenger Cards Table */}
                <div className="divide-y divide-gray-100">
                  {groupBookings.map((b) => (
                    <div
                      key={b.id}
                      className="p-4 hover:bg-gray-50/60 transition flex flex-col md:flex-row md:items-center justify-between gap-4"
                    >
                      {/* Client info */}
                      <div className="flex items-start gap-3 min-w-[260px]">
                        <div className="h-9 w-9 rounded-full bg-blue-100 text-blue-700 grid place-items-center font-bold text-xs shrink-0 mt-0.5">
                          {b.numPeople > 1 ? `${b.numPeople}P` : "1P"}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-sm text-gray-900">
                              {b.customerName}
                            </span>
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-gray-100 text-gray-700 font-semibold border border-gray-200">
                              {b.ticketCode}
                            </span>
                            <FestivalTicketBadge booking={b} />
                          </div>
                          <p className="text-xs text-gray-500 mt-0.5">{b.packName}</p>
                          <div className="flex flex-wrap items-center gap-3 text-xs text-gray-600 mt-1.5">
                            <span className="inline-flex items-center gap-1 font-medium">
                              <Phone className="h-3 w-3 text-gray-400" /> {b.phone}
                            </span>
                            <span className="inline-flex items-center gap-1 text-gray-500">
                              <Mail className="h-3 w-3 text-gray-400" /> {b.email}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Transfer Details Badge */}
                      <div className="flex flex-col sm:flex-row sm:items-center gap-4 bg-gray-50 p-3 rounded-xl border border-gray-200/80">
                        <div>
                          <div className="flex items-center gap-1.5">
                            {b.transferType === "port" ? (
                              <Ship className="h-4 w-4 text-blue-600" />
                            ) : (
                              <Plane className="h-4 w-4 text-blue-600" />
                            )}
                            <span className="text-xs font-bold text-gray-900">
                              {b.transferLocation ||
                                (b.transferType === "port"
                                  ? "Tanger Ville Port"
                                  : "Tangier Airport (TNG)")}
                            </span>
                            <span className="text-[10px] px-1.5 py-0.5 rounded-sm bg-blue-100 text-blue-800 font-semibold">
                              {formatTransferOptionLabel(b.transferOption, "en")}
                            </span>
                          </div>
                          <p className="text-xs text-gray-600 mt-1">
                            <span className="font-semibold text-gray-800">Flight/Ferry:</span>{" "}
                            {b.transferDetails || (
                              <span className="italic text-gray-400">Not provided yet</span>
                            )}
                          </p>
                        </div>

                        <div className="sm:border-l sm:border-gray-200 sm:pl-3 shrink-0">
                          <p className="text-[10px] uppercase font-bold text-gray-500">
                            Shuttle Fee
                          </p>
                          <p className="text-sm font-extrabold text-blue-700">
                            €{b.transferCost || 0}
                          </p>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={() => openWhatsApp(b, "arrival")}
                          className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-bold rounded-lg transition flex items-center gap-1.5 cursor-pointer border border-emerald-200"
                          title="Message on WhatsApp"
                        >
                          <Phone className="h-3 w-3" />
                          WhatsApp
                        </button>
                        <button
                          onClick={() => handleOpenEdit(b)}
                          className="p-1.5 text-gray-400 hover:text-gray-700 rounded-lg hover:bg-gray-100 transition cursor-pointer"
                          title="Edit Transfer Details"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      ) : tab === "departures" ? (
        /* DEPARTURES GROUP VIEW */
        <div className="space-y-6">
          {departureGroups.map(([date, groupBookings]) => {
            const passengersInGroup = groupBookings.reduce((sum, b) => sum + (b.numPeople || 1), 0);
            return (
              <div
                key={date}
                className="rounded-2xl border border-purple-200/90 bg-white shadow-2xs overflow-hidden"
              >
                {/* Group Header Banner */}
                <div className="bg-gradient-to-r from-purple-50 via-purple-50/50 to-white px-5 py-3.5 border-b border-purple-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-lg bg-purple-600 text-white grid place-items-center shadow-2xs font-bold text-xs">
                      <Calendar className="h-4 w-4" />
                    </div>
                    <div>
                      <h3 className="font-display text-base font-bold text-gray-900">
                        Departure Date: <span className="text-purple-800">{date}</span>
                      </h3>
                      <p className="text-[11px] text-gray-500">
                        {groupBookings.length} bookings ·{" "}
                        <span className="font-bold text-purple-800">
                          {passengersInGroup} passengers
                        </span>{" "}
                        for return dropoff
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() =>
                        exportToXlsx(
                          groupBookings,
                          `tableau-transferts-departs-${date.replace(/[^a-zA-Z0-9]/g, "-")}`,
                        )
                      }
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 border border-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg transition shadow-2xs cursor-pointer"
                    >
                      <Download className="h-3.5 w-3.5 text-white" />
                      Export Group XLSX
                    </button>
                  </div>
                </div>

                {/* Group Passenger Cards Table */}
                <div className="divide-y divide-gray-100">
                  {groupBookings.map((b) => (
                    <div
                      key={b.id}
                      className="p-4 hover:bg-gray-50/60 transition flex flex-col md:flex-row md:items-center justify-between gap-4"
                    >
                      {/* Client info */}
                      <div className="flex items-start gap-3 min-w-[260px]">
                        <div className="h-9 w-9 rounded-full bg-purple-100 text-purple-700 grid place-items-center font-bold text-xs shrink-0 mt-0.5">
                          {b.numPeople > 1 ? `${b.numPeople}P` : "1P"}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-sm text-gray-900">
                              {b.customerName}
                            </span>
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-gray-100 text-gray-700 font-semibold border border-gray-200">
                              {b.ticketCode}
                            </span>
                            <FestivalTicketBadge booking={b} />
                          </div>
                          <p className="text-xs text-gray-500 mt-0.5">{b.packName}</p>
                          <div className="flex flex-wrap items-center gap-3 text-xs text-gray-600 mt-1.5">
                            <span className="inline-flex items-center gap-1 font-medium">
                              <Phone className="h-3 w-3 text-gray-400" /> {b.phone}
                            </span>
                            <span className="inline-flex items-center gap-1 text-gray-500">
                              <Mail className="h-3 w-3 text-gray-400" /> {b.email}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Transfer Details Badge */}
                      <div className="flex flex-col sm:flex-row sm:items-center gap-4 bg-gray-50 p-3 rounded-xl border border-gray-200/80">
                        <div>
                          <div className="flex items-center gap-1.5">
                            {b.transferType === "port" ? (
                              <Ship className="h-4 w-4 text-purple-600" />
                            ) : (
                              <Plane className="h-4 w-4 text-purple-600" />
                            )}
                            <span className="text-xs font-bold text-gray-900">
                              {b.transferLocation ||
                                (b.transferType === "port"
                                  ? "Tanger Ville Port"
                                  : "Tangier Airport (TNG)")}
                            </span>
                            <span className="text-[10px] px-1.5 py-0.5 rounded-sm bg-purple-100 text-purple-800 font-semibold">
                              {formatTransferOptionLabel(b.transferOption, "en")}
                            </span>
                          </div>
                          <p className="text-xs text-gray-600 mt-1">
                            <span className="font-semibold text-gray-800">Flight/Ferry:</span>{" "}
                            {b.transferDetails || (
                              <span className="italic text-gray-400">Not provided yet</span>
                            )}
                          </p>
                        </div>

                        <div className="sm:border-l sm:border-gray-200 sm:pl-3 shrink-0">
                          <p className="text-[10px] uppercase font-bold text-gray-500">
                            Shuttle Fee
                          </p>
                          <p className="text-sm font-extrabold text-purple-700">
                            €{b.transferCost || 0}
                          </p>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={() => openWhatsApp(b, "departure")}
                          className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-bold rounded-lg transition flex items-center gap-1.5 cursor-pointer border border-emerald-200"
                          title="Message on WhatsApp"
                        >
                          <Phone className="h-3 w-3" />
                          WhatsApp
                        </button>
                        <button
                          onClick={() => handleOpenEdit(b)}
                          className="p-1.5 text-gray-400 hover:text-gray-700 rounded-lg hover:bg-gray-100 transition cursor-pointer"
                          title="Edit Transfer Details"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* ALL TRANSFERS TABLE VIEW */
        <div className="rounded-2xl border border-gray-200 bg-white shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-gray-700">
              <thead className="bg-gray-50 border-b border-gray-200 text-[11px] font-bold uppercase tracking-wider text-gray-500">
                <tr>
                  <th className="px-4 py-3.5">Code / Client</th>
                  <th className="px-4 py-3.5">Hub & Type</th>
                  <th className="px-4 py-3.5">Direction</th>
                  <th className="px-4 py-3.5">Arrival Date</th>
                  <th className="px-4 py-3.5">Departure Date</th>
                  <th className="px-4 py-3.5">Details (Flight/Boat)</th>
                  <th className="px-4 py-3.5">Cost</th>
                  <th className="px-4 py-3.5">Status</th>
                  <th className="px-4 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {shuttleBookings.map((b) => (
                  <tr key={b.id} className="hover:bg-gray-50/70 transition">
                    <td className="px-4 py-3.5">
                      <div className="font-bold text-gray-900">{b.customerName}</div>
                      <div className="font-mono text-[10px] text-gray-500">
                        {b.ticketCode} ({b.numPeople} pers.)
                      </div>
                      <div className="mt-1">
                        <FestivalTicketBadge booking={b} />
                      </div>
                      <div className="text-[10px] text-gray-400">{b.phone}</div>
                    </td>

                    <td className="px-4 py-3.5">
                      <div className="inline-flex items-center gap-1 font-semibold text-gray-900">
                        {b.transferType === "port" ? (
                          <Ship className="h-3.5 w-3.5 text-blue-600" />
                        ) : (
                          <Plane className="h-3.5 w-3.5 text-blue-600" />
                        )}
                        <span>{b.transferType ? b.transferType.toUpperCase() : "PORT"}</span>
                      </div>
                      <div className="text-[10px] text-gray-500 truncate max-w-[140px]">
                        {b.transferLocation || "Standard Hub"}
                      </div>
                    </td>

                    <td className="px-4 py-3.5">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                        {formatTransferOptionLabel(b.transferOption, "en")}
                      </span>
                    </td>

                    <td className="px-4 py-3.5 font-medium text-gray-900">
                      {b.arrivalDate || "—"}
                    </td>

                    <td className="px-4 py-3.5 font-medium text-gray-900">
                      {b.departureDate || "—"}
                    </td>

                    <td className="px-4 py-3.5">
                      <span className="text-gray-600">
                        {b.transferDetails || <span className="text-gray-400 italic">None</span>}
                      </span>
                    </td>

                    <td className="px-4 py-3.5 font-bold text-blue-700">€{b.transferCost || 0}</td>

                    <td className="px-4 py-3.5">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          b.status === "confirmed"
                            ? "bg-emerald-100 text-emerald-800"
                            : b.status === "declined"
                              ? "bg-red-100 text-red-800"
                              : "bg-amber-100 text-amber-800"
                        }`}
                      >
                        {b.status}
                      </span>
                    </td>

                    <td className="px-4 py-3.5 text-right space-x-1">
                      <button
                        onClick={() => openWhatsApp(b, "arrival")}
                        className="p-1 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-md transition cursor-pointer"
                        title="WhatsApp Chat"
                      >
                        <Phone className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => handleOpenEdit(b)}
                        className="p-1 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-md transition cursor-pointer"
                        title="Edit Transfer"
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Edit Transfer Modal */}
      {editingBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <div>
                <h3 className="font-display font-bold text-base text-gray-900">
                  Edit Transfer: {editingBooking.customerName}
                </h3>
                <p className="text-xs text-gray-500 font-mono">
                  {editingBooking.ticketCode} · {editingBooking.numPeople} Guests
                </p>
              </div>
              <button
                onClick={() => setEditingBooking(null)}
                className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <div className="flex items-center justify-between p-3 rounded-xl bg-gray-50 border border-gray-200">
                <span className="font-bold text-gray-900">Transfer Requested</span>
                <input
                  type="checkbox"
                  checked={editForm.needsTransfer}
                  onChange={(e) => setEditForm({ ...editForm, needsTransfer: e.target.checked })}
                  className="h-4 w-4 text-blue-600 rounded cursor-pointer"
                />
              </div>

              {editForm.needsTransfer && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="font-bold uppercase tracking-wider text-gray-600 block mb-1">
                        Type
                      </label>
                      <select
                        value={editForm.transferType}
                        onChange={(e) => {
                          const val = e.target.value as TransferType;
                          const nextType = val;
                          const nextLoc =
                            nextType === "airport"
                              ? "Tangier Ibn Battouta Airport (TNG)"
                              : "Port of Tangier (Tanger Ville)";
                          const nextCost = calculateTransferCost(
                            nextType,
                            editForm.transferOption,
                            editingBooking?.numPeople || 1,
                            nextLoc,
                          );
                          setEditForm({
                            ...editForm,
                            transferType: nextType,
                            transferLocation: nextLoc,
                            transferCost: nextCost,
                          });
                        }}
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-xs font-medium text-gray-900 focus:outline-none focus:border-blue-500 cursor-pointer"
                      >
                        <option value="port">🚢 Port</option>
                        <option value="airport">✈️ Airport</option>
                      </select>
                    </div>

                    <div>
                      <label className="font-bold uppercase tracking-wider text-gray-600 block mb-1">
                        Direction
                      </label>
                      <select
                        value={editForm.transferOption}
                        onChange={(e) => {
                          const nextOpt = e.target.value as TransferOption;
                          const nextCost = calculateTransferCost(
                            editForm.transferType,
                            nextOpt,
                            editingBooking?.numPeople || 1,
                            editForm.transferLocation,
                          );
                          setEditForm({
                            ...editForm,
                            transferOption: nextOpt,
                            transferCost: nextCost,
                          });
                        }}
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-xs font-medium text-gray-900 focus:outline-none focus:border-blue-500 cursor-pointer"
                      >
                        <option value="round_trip">Round Trip (Aller-Retour)</option>
                        <option value="one_way_arrival">One-Way (Arrival)</option>
                        <option value="one_way_departure">One-Way (Departure)</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="font-bold uppercase tracking-wider text-gray-600 block mb-1">
                      Location / Hub
                    </label>
                    <select
                      value={editForm.transferLocation}
                      onChange={(e) => {
                        const nextLoc = e.target.value;
                        const nextCost = calculateTransferCost(
                          editForm.transferType,
                          editForm.transferOption,
                          editingBooking?.numPeople || 1,
                          nextLoc,
                        );
                        setEditForm({
                          ...editForm,
                          transferLocation: nextLoc,
                          transferCost: nextCost,
                        });
                      }}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-xs text-gray-900 focus:outline-none focus:border-blue-500 font-medium"
                    >
                      {editForm.transferType === "port" ? (
                        <option value="Port of Tangier (Tanger Ville)">
                          Port of Tangier (Port de Tanger Ville)
                        </option>
                      ) : (
                        <>
                          <option value="Tangier Ibn Battouta Airport (TNG)">
                            Tangier Ibn Battouta Airport (TNG) — €10 / €20 A/R
                          </option>
                          <option value="Tetouan Sania Ramel Airport (TTU)">
                            Tetouan Sania Ramel Airport (TTU) — €15 / €30 A/R
                          </option>
                        </>
                      )}
                    </select>
                  </div>

                  <div>
                    <label className="font-bold uppercase tracking-wider text-gray-600 block mb-1">
                      Flight / Ferry Details & Notes
                    </label>
                    <input
                      type="text"
                      value={editForm.transferDetails}
                      onChange={(e) =>
                        setEditForm({ ...editForm, transferDetails: e.target.value })
                      }
                      placeholder="e.g. Flight AT123 at 14:30"
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-xs text-gray-900 focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="font-bold uppercase tracking-wider text-gray-600 block mb-1">
                      Total Cost Charged (€)
                    </label>
                    <input
                      type="number"
                      value={editForm.transferCost}
                      onChange={(e) =>
                        setEditForm({ ...editForm, transferCost: Number(e.target.value) || 0 })
                      }
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-xs text-gray-900 focus:outline-none focus:border-blue-500 font-bold text-blue-700"
                    />
                  </div>
                </>
              )}
            </div>

            <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setEditingBooking(null)}
                className="px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-200 rounded-lg transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveEdit}
                disabled={savingEdit}
                className="px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition shadow-xs cursor-pointer disabled:opacity-50"
              >
                {savingEdit ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Add Transfer / Shuttle Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-gray-200 overflow-hidden animate-in fade-in zoom-in-95 duration-200 my-8">
            {/* Modal Header */}
            <div className="px-6 py-4 bg-gradient-to-r from-slate-900 to-blue-950 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-xl bg-blue-500/20 border border-blue-400/30 grid place-items-center text-blue-300">
                  <Bus className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="font-display font-bold text-base text-white">
                    Add Transfer / Shuttle Pass
                  </h3>
                  <p className="text-[11px] text-blue-200">
                    Assign a transfer to a festival invite/client or create a new manual entry.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="p-1.5 text-gray-400 hover:text-white rounded-lg hover:bg-white/10 transition cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSaveAdd} className="p-6 space-y-4 text-xs">
              {/* Mode Selection Tabs */}
              <div className="flex items-center gap-1.5 p-1 bg-gray-100 rounded-xl">
                <button
                  type="button"
                  onClick={() => {
                    setAddMode("existing");
                    setAddError("");
                  }}
                  className={`flex-1 py-2 rounded-lg font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                    addMode === "existing"
                      ? "bg-white text-blue-700 shadow-xs"
                      : "text-gray-600 hover:text-gray-900"
                  }`}
                >
                  <UserCheck className="h-3.5 w-3.5" />
                  <span>Existing Invite / Client</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAddMode("manual");
                    setAddError("");
                  }}
                  className={`flex-1 py-2 rounded-lg font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                    addMode === "manual"
                      ? "bg-white text-blue-700 shadow-xs"
                      : "text-gray-600 hover:text-gray-900"
                  }`}
                >
                  <UserPlus className="h-3.5 w-3.5" />
                  <span>New Manual Client</span>
                </button>
              </div>

              {addError && (
                <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{addError}</span>
                </div>
              )}

              {/* Mode A: Select Existing Booking from Database */}
              {addMode === "existing" && (
                <div className="space-y-2 p-3.5 bg-blue-50/60 rounded-2xl border border-blue-200">
                  <label className="font-bold uppercase tracking-wider text-blue-950 block text-[11px]">
                    1. Select Client from Database ({bookings.length} clients available)
                  </label>

                  <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                    <input
                      type="text"
                      value={clientSearch}
                      onChange={(e) => setClientSearch(e.target.value)}
                      placeholder="Type name, ticket code (#TLF-...), email, or phone..."
                      className="w-full pl-8 pr-3 py-2 rounded-xl border border-gray-300 bg-white text-xs text-gray-900 focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <div className="max-h-40 overflow-y-auto space-y-1.5 pr-1">
                    {existingClients.map((b) => {
                      const isSelected = selectedExistingBookingId === b.id;
                      return (
                        <div
                          key={b.id}
                          onClick={() => handleSelectExistingBooking(b.id)}
                          className={`p-2.5 rounded-xl border transition cursor-pointer flex items-center justify-between gap-2 ${
                            isSelected
                              ? "bg-blue-600 text-white border-blue-600 shadow-xs font-bold"
                              : "bg-white text-gray-800 border-gray-200 hover:border-blue-300 hover:bg-blue-50/50"
                          }`}
                        >
                          <div className="min-w-0">
                            <p className="truncate font-bold flex items-center gap-1.5">
                              <span>{b.customerName}</span>
                              <span
                                className={`text-[10px] font-mono px-1.5 py-0.2 rounded ${
                                  isSelected
                                    ? "bg-white/20 text-white"
                                    : "bg-gray-100 text-gray-700"
                                }`}
                              >
                                #{b.ticketCode}
                              </span>
                            </p>
                            <p
                              className={`text-[11px] truncate ${
                                isSelected ? "text-blue-100" : "text-gray-500"
                              }`}
                            >
                              {b.packName || "Pass"} · {b.numPeople || 1} pax{" "}
                              {b.phone ? `· ${b.phone}` : ""}
                            </p>
                          </div>

                          <div className="shrink-0 text-right">
                            {b.needsTransfer ? (
                              <span
                                className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                                  isSelected
                                    ? "bg-amber-400 text-slate-950"
                                    : "bg-amber-100 text-amber-800"
                                }`}
                              >
                                Has Transfer
                              </span>
                            ) : (
                              <span
                                className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                                  isSelected
                                    ? "bg-emerald-400 text-slate-950"
                                    : "bg-emerald-100 text-emerald-800"
                                }`}
                              >
                                No Transfer Yet
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Mode B: Manual Client Details */}
              {addMode === "manual" && (
                <div className="space-y-3 p-3.5 bg-gray-50 rounded-2xl border border-gray-200">
                  <span className="font-bold uppercase tracking-wider text-gray-700 block text-[11px]">
                    1. Guest Details
                  </span>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="font-bold text-gray-700 block mb-1">
                        Full Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={addForm.customerName}
                        onChange={(e) => setAddForm({ ...addForm, customerName: e.target.value })}
                        placeholder="e.g. John Doe"
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-xs text-gray-900 focus:outline-none focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="font-bold text-gray-700 block mb-1">Passengers Count</label>
                      <input
                        type="number"
                        min="1"
                        value={addForm.numPeople}
                        onChange={(e) => {
                          const num = Math.max(1, Number(e.target.value) || 1);
                          const nextCost = calculateTransferCost(
                            addForm.transferType,
                            addForm.transferOption,
                            num,
                            addForm.transferLocation,
                          );
                          setAddForm({
                            ...addForm,
                            numPeople: num,
                            transferCost: nextCost,
                          });
                        }}
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-xs text-gray-900 focus:outline-none focus:border-blue-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="font-bold text-gray-700 block mb-1">Phone (WhatsApp)</label>
                      <input
                        type="tel"
                        value={addForm.phone}
                        onChange={(e) => setAddForm({ ...addForm, phone: e.target.value })}
                        placeholder="+33 6..."
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-xs text-gray-900 focus:outline-none focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="font-bold text-gray-700 block mb-1">Email</label>
                      <input
                        type="email"
                        value={addForm.email}
                        onChange={(e) => setAddForm({ ...addForm, email: e.target.value })}
                        placeholder="client@email.com"
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-xs text-gray-900 focus:outline-none focus:border-blue-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="font-bold text-gray-700 block mb-1">Arrival Date</label>
                      <input
                        type="date"
                        value={addForm.arrivalDate}
                        onChange={(e) => setAddForm({ ...addForm, arrivalDate: e.target.value })}
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-xs text-gray-900 focus:outline-none focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="font-bold text-gray-700 block mb-1">Departure Date</label>
                      <input
                        type="date"
                        value={addForm.departureDate}
                        onChange={(e) => setAddForm({ ...addForm, departureDate: e.target.value })}
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-xs text-gray-900 focus:outline-none focus:border-blue-500"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* 2. Transfer Details */}
              <div className="space-y-3 p-3.5 bg-slate-50 rounded-2xl border border-slate-200">
                <span className="font-bold uppercase tracking-wider text-slate-800 block text-[11px]">
                  2. Transfer Specifications & Pricing
                </span>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-bold text-gray-700 block mb-1">Transfer Type</label>
                    <select
                      value={addForm.transferType}
                      onChange={(e) => {
                        const nextType = e.target.value as TransferType;
                        const nextLoc =
                          nextType === "airport"
                            ? "Tangier Ibn Battouta Airport (TNG)"
                            : "Port of Tangier (Tanger Ville)";
                        const nextCost = calculateTransferCost(
                          nextType,
                          addForm.transferOption,
                          addForm.numPeople || 1,
                          nextLoc,
                        );
                        setAddForm({
                          ...addForm,
                          transferType: nextType,
                          transferLocation: nextLoc,
                          transferCost: nextCost,
                        });
                      }}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-xs font-medium text-gray-900 focus:outline-none focus:border-blue-500 cursor-pointer bg-white"
                    >
                      <option value="port">🚢 Port Shuttle</option>
                      <option value="airport">✈️ Airport Shuttle</option>
                    </select>
                  </div>

                  <div>
                    <label className="font-bold text-gray-700 block mb-1">Direction</label>
                    <select
                      value={addForm.transferOption}
                      onChange={(e) => {
                        const nextOpt = e.target.value as TransferOption;
                        const nextCost = calculateTransferCost(
                          addForm.transferType,
                          nextOpt,
                          addForm.numPeople || 1,
                          addForm.transferLocation,
                        );
                        setAddForm({
                          ...addForm,
                          transferOption: nextOpt,
                          transferCost: nextCost,
                        });
                      }}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-xs font-medium text-gray-900 focus:outline-none focus:border-blue-500 cursor-pointer bg-white"
                    >
                      <option value="round_trip">Round Trip (Aller-Retour)</option>
                      <option value="one_way_arrival">One-Way Arrival (Aller simple)</option>
                      <option value="one_way_departure">One-Way Departure (Retour simple)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="font-bold text-gray-700 block mb-1">
                    Pickup / Dropoff Location
                  </label>
                  <select
                    value={addForm.transferLocation}
                    onChange={(e) => {
                      const nextLoc = e.target.value;
                      const nextCost = calculateTransferCost(
                        addForm.transferType,
                        addForm.transferOption,
                        addForm.numPeople || 1,
                        nextLoc,
                      );
                      setAddForm({
                        ...addForm,
                        transferLocation: nextLoc,
                        transferCost: nextCost,
                      });
                    }}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-xs text-gray-900 focus:outline-none focus:border-blue-500 font-medium bg-white"
                  >
                    {addForm.transferType === "port" ? (
                      <option value="Port of Tangier (Tanger Ville)">
                        Port of Tangier (Port de Tanger Ville)
                      </option>
                    ) : (
                      <>
                        <option value="Tangier Ibn Battouta Airport (TNG)">
                          Tangier Ibn Battouta Airport (TNG) — €10 (1-way) / €20 (A/R)
                        </option>
                        <option value="Tetouan Sania Ramel Airport (TTU)">
                          Tetouan Sania Ramel Airport (TTU) — €15 (1-way) / €30 (A/R)
                        </option>
                      </>
                    )}
                  </select>
                </div>

                <div>
                  <label className="font-bold text-gray-700 block mb-1">
                    Flight / Ferry Details & Schedule
                  </label>
                  <input
                    type="text"
                    value={addForm.transferDetails}
                    onChange={(e) => setAddForm({ ...addForm, transferDetails: e.target.value })}
                    placeholder="e.g. Flight AT123 arriving at 14:30 / Ferry Balearia 11:00"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-xs text-gray-900 focus:outline-none focus:border-blue-500 bg-white"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-bold text-gray-700 block mb-1">
                      Total Transfer Fee (€)
                    </label>
                    <input
                      type="number"
                      value={addForm.transferCost}
                      onChange={(e) =>
                        setAddForm({
                          ...addForm,
                          transferCost: Number(e.target.value) || 0,
                        })
                      }
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-xs text-gray-900 focus:outline-none focus:border-blue-500 font-bold text-blue-700 bg-white"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-gray-700 block mb-1">Status</label>
                    <select
                      value={addForm.status}
                      onChange={(e) =>
                        setAddForm({
                          ...addForm,
                          status: e.target.value as "confirmed" | "pending",
                        })
                      }
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-xs font-bold text-gray-900 focus:outline-none focus:border-blue-500 bg-white"
                    >
                      <option value="confirmed">Confirmed</option>
                      <option value="pending">Pending</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="font-bold text-gray-700 block mb-1">Notes / Remarks</label>
                  <input
                    type="text"
                    value={addForm.notes}
                    onChange={(e) => setAddForm({ ...addForm, notes: e.target.value })}
                    placeholder="Special instructions or luggage notes..."
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-xs text-gray-900 focus:outline-none focus:border-blue-500 bg-white"
                  />
                </div>
              </div>

              {/* Modal Actions */}
              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2.5 text-xs font-semibold text-gray-700 hover:bg-gray-100 rounded-xl transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingAdd}
                  className="px-5 py-2.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition shadow-xs cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                >
                  <Check className="h-4 w-4" />
                  <span>{savingAdd ? "Saving..." : "Save Transfer"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
