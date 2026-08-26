import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect, useCallback } from "react";
import * as XLSX from "xlsx";
import {
  BedDouble,
  Bed,
  Users,
  Download,
  Building2,
  Search,
  UserCheck,
  AlertTriangle,
  X,
  KeyRound,
  Hotel,
} from "lucide-react";
import {
  getBookings,
  getPacks,
  getCollaborators,
  packRoomCategory,
  bookingPeopleCount,
  guestOrigin,
  perPersonRate,
  updateBookingStatus,
  updateBookingRoomNumber,
  updateBookingRoomType,
  roomNumberColumnReady,
  roomTypeColumnReady,
  ROOM_TYPES,
  type Booking,
  type Pack,
  type Collaborator,
} from "@/lib/admin-store";

export const Route = createFileRoute("/admin/hotel")({
  component: AdminHotel,
});

interface Room {
  booking: Booking;
  pack: Pack | undefined;
  category: "single" | "double" | "special";
  guests: string[];
  partner: Collaborator | undefined;
}

function AdminHotel() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [packs, setPacks] = useState<Pack[]>([]);
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [originFilter, setOriginFilter] = useState<"all" | "morocco" | "international">("all");
  const [includePending, setIncludePending] = useState(false);
  const [search, setSearch] = useState("");
  const [roomReady, setRoomReady] = useState(true);
  const [roomTypeReady, setRoomTypeReady] = useState(true);
  const [error, setError] = useState("");
  // Bumped after a failed save so uncontrolled room inputs re-mount and
  // show the real stored value instead of the unsaved typed text.
  const [resetKey, setResetKey] = useState(0);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    const [b, p, c, roomOk, roomTypeOk] = await Promise.all([
      getBookings(),
      getPacks(),
      getCollaborators(),
      roomNumberColumnReady(),
      roomTypeColumnReady(),
    ]);
    setBookings(b);
    setPacks(p);
    setCollaborators(c);
    setRoomReady(roomOk);
    setRoomTypeReady(roomTypeOk);
    setLoading(false);
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  // Check-in at the door: confirmed → checked-in (and back if mistaken)
  const toggleArrived = async (b: Booking) => {
    setError("");
    try {
      await updateBookingStatus(b.id, b.status === "checked-in" ? "confirmed" : "checked-in");
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
    await reload();
  };

  const saveRoomNumber = async (b: Booking, value: string) => {
    if ((b.roomNumber ?? "") === value.trim()) return;
    setError("");
    try {
      await updateBookingRoomNumber(b.id, value);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setResetKey((k) => k + 1);
    }
    await reload();
  };

  const saveRoomType = async (b: Booking, value: string) => {
    if ((b.roomType ?? "") === value.trim()) return;
    setError("");
    try {
      await updateBookingRoomType(b.id, value);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setResetKey((k) => k + 1);
    }
    await reload();
  };

  // Rooms only (single + double), confirmed/checked-in by default
  const rooms = bookings
    .filter((b) =>
      includePending
        ? b.status !== "declined"
        : b.status === "confirmed" || b.status === "checked-in"
    )
    .filter((b) => {
      if (!search.trim()) return true;
      const q = search.trim().toLowerCase();
      const partner = b.collaboratorId
        ? collaborators.find((c) => c.id === b.collaboratorId)
        : undefined;
      return (
        b.customerName.toLowerCase().includes(q) ||
        b.ticketCode.toLowerCase().includes(q) ||
        (b.roomNumber ?? "").toLowerCase().includes(q) ||
        (b.roomType ?? "").toLowerCase().includes(q) ||
        (partner?.name.toLowerCase().includes(q) ?? false)
      );
    })
    .map((b) => {
      const pack = packs.find((p) => p.id === b.packId);
      const category = packRoomCategory(pack || b.packName, b.numPeople);
      return {
        booking: b,
        pack,
        category,
        guests: b.customerName
          .split(/\s*&\s*/)
          .map((g) => g.trim())
          .filter(Boolean),
        partner: b.collaboratorId
          ? collaborators.find((c) => c.id === b.collaboratorId)
          : undefined,
      };
    })
    .filter((r): r is Room => r.category !== "fullpass")
    .sort(
      (a, b) =>
        new Date(a.booking.createdAt).getTime() - new Date(b.booking.createdAt).getTime()
    );

  const moroccanRooms = rooms.filter((r) => guestOrigin(r.booking) === "morocco");
  const internationalRooms = rooms.filter((r) => guestOrigin(r.booking) === "international");
  const moroccanGuests = moroccanRooms.reduce((s, r) => s + bookingPeopleCount(r.booking, packs), 0);
  const internationalGuests = internationalRooms.reduce((s, r) => s + bookingPeopleCount(r.booking, packs), 0);

  const displayedRooms = rooms.filter((r) => {
    if (originFilter === "morocco") return guestOrigin(r.booking) === "morocco";
    if (originFilter === "international") return guestOrigin(r.booking) === "international";
    return true;
  });

  // Group by partner (direct bookings last)
  const groups = new Map<string, { title: string; rooms: Room[] }>();
  for (const r of displayedRooms) {
    const key = r.partner?.id ?? "zzz-direct";
    const title = r.partner
      ? `${r.partner.name} (${r.partner.code})`
      : "Direct — festival website / manual";
    if (!groups.has(key)) groups.set(key, { title, rooms: [] });
    groups.get(key)!.rooms.push(r);
  }
  const sortedGroups = Array.from(groups.entries()).sort(([a], [b]) =>
    a === "zzz-direct" ? 1 : b === "zzz-direct" ? -1 : 0
  );

  const doubles = displayedRooms.filter((r) => r.category === "double");
  const singles = displayedRooms.filter((r) => r.category === "single");
  const totalGuests = displayedRooms.reduce((s, r) => s + bookingPeopleCount(r.booking, packs), 0);

  const fmtDate = (d?: string | null) => (d ? new Date(d).toLocaleDateString() : "—");
  const nightsOf = (r: Room) =>
    r.pack?.features.find((f) => /night|nuit|noche/i.test(f)) ?? r.pack?.sub ?? "";

  // Excel-friendly CSV (semicolon + BOM), one row per room
  // Rooming-list export in the festival's own sheet format:
  // one row per GUEST, rooms numbered per promoter
  // (Id chambre / Promoteur · Prénom · Nom · dates · nuits · type ·
  //  Montant · Commission · Paiement · Reste à payer · Commentaire).
  const downloadExcel = (targetOrigin: "all" | "morocco" | "international" = "all") => {
    const header = [
      "Id chambre / Promoteur",
      "N° chambre",
      "Prénom",
      "Nom",
      "Origine / Pays",
      "Date d'entrée",
      "Date de sortie",
      "Nombre de nuits",
      "Type de chambre",
      "Montant",
      "Commission",
      "Paiement",
      "Reste à payer",
      "Commentaire",
    ];

    const frDate = (d?: string | null) =>
      d ? new Date(d).toLocaleDateString("fr-FR") : "";
    const nightsOfRoom = (r: Room): number | "" => {
      if (r.booking.arrivalDate && r.booking.departureDate) {
        const n = Math.round(
          (new Date(r.booking.departureDate).getTime() -
            new Date(r.booking.arrivalDate).getTime()) /
            86400000
        );
        if (n > 0) return n;
      }
      const feat = r.pack?.features.find((f) => /(\d+)\s*(nights?|nuits?|noches?)/i.test(f));
      const m = feat?.match(/(\d+)/);
      return m ? parseInt(m[1], 10) : "";
    };
    // Per-guest amount: double rooms are priced per person, singles per room.
    const guestAmount = (r: Room): number | "" => {
      const price = parseInt(r.pack?.price ?? "", 10);
      return Number.isFinite(price) ? price : "";
    };
    const guestCommission = (r: Room): number | "" => {
      const p = r.partner;
      if (!p) return "";
      if ((p.commissionType ?? "percent") === "per_person") {
        const rate = perPersonRate(p, r.category);
        return rate || "";
      }
      if (!p.commission) return "";
      const amount = guestAmount(r);
      return amount === "" ? "" : Math.round(amount * (p.commission / 100) * 100) / 100;
    };

    // Rooms numbered within each promoter group, in the displayed order
    const csvRows: Array<Array<string | number>> = [];
    for (const [, g] of sortedGroups) {
      const promoter = g.rooms[0]?.partner?.name ?? "Direct";
      const ordered = [
        ...g.rooms.filter((r) => r.category === "double"),
        ...g.rooms.filter((r) => r.category === "single"),
      ];
      ordered.forEach((r, i) => {
        const orig = guestOrigin(r.booking);
        if (targetOrigin !== "all" && orig !== targetOrigin) return;

        const roomId = `Chambre ${i + 1} / ${promoter}`;
        const roomType = r.booking.roomType
          ? r.booking.roomType
          : r.pack
          ? `${r.pack.name}${r.pack.sub ? ` - ${r.pack.sub}` : ""}`
          : r.booking.packName;
        const originText =
          orig === "morocco" ? "Maroc 🇲🇦" : `${r.booking.country || "Étranger"} 🌐`;

        const guestCount = Math.max(r.booking.numPeople || 1, r.guests.length);
        for (let gi = 0; gi < guestCount; gi++) {
          const full = (r.guests[gi] ?? "").trim();
          const parts = full.split(/\s+/);
          const prenom = parts[0] ?? "";
          const nom = parts.slice(1).join(" ").toUpperCase();
          csvRows.push([
            roomId,
            r.booking.roomNumber ?? "",
            prenom,
            nom,
            originText,
            frDate(r.booking.arrivalDate),
            frDate(r.booking.departureDate),
            nightsOfRoom(r),
            roomType,
            guestAmount(r),
            guestCommission(r),
            "", // Paiement — filled in by the team
            "", // Reste à payer
            `${r.booking.ticketCode}${r.booking.notes ? ` — ${r.booking.notes}` : ""}`,
          ]);
        }
      });
    }

    // Real .xlsx so Excel opens it correctly in every language/locale.
    const ws = XLSX.utils.aoa_to_sheet([header, ...csvRows]);
    ws["!cols"] = [
      { wch: 26 }, // Id chambre / Promoteur
      { wch: 11 }, // N° chambre
      { wch: 14 }, // Prénom
      { wch: 16 }, // Nom
      { wch: 18 }, // Origine / Pays
      { wch: 13 }, // Date d'entrée
      { wch: 13 }, // Date de sortie
      { wch: 14 }, // Nombre de nuits
      { wch: 38 }, // Type de chambre
      { wch: 10 }, // Montant
      { wch: 11 }, // Commission
      { wch: 10 }, // Paiement
      { wch: 12 }, // Reste à payer
      { wch: 34 }, // Commentaire
    ];
    const wb = XLSX.utils.book_new();
    const sheetName =
      targetOrigin === "morocco"
        ? "Maroc"
        : targetOrigin === "international"
        ? "Étranger"
        : "Rooming list";
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
    const suffix =
      targetOrigin === "morocco"
        ? "maroc"
        : targetOrigin === "international"
        ? "etranger"
        : "all";
    XLSX.writeFile(wb, `hotel-rooming-list-${suffix}-${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const statusStyles: Record<string, string> = {
    pending: "bg-amber-100 text-amber-700 border-amber-200",
    confirmed: "bg-emerald-100 text-emerald-700 border-emerald-200",
    "checked-in": "bg-cyan-100 text-cyan-700 border-cyan-200",
  };

  const RoomTable = ({ list }: { list: Room[] }) => (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-200 text-xs tracking-widest uppercase text-gray-500">
            <th className="px-4 py-2.5 text-left font-medium">#</th>
            <th className="px-4 py-2.5 text-left font-medium">Room Nº</th>
            <th className="px-4 py-2.5 text-left font-medium">Room Type</th>
            <th className="px-4 py-2.5 text-left font-medium">Guest 1</th>
            <th className="px-4 py-2.5 text-left font-medium">Guest 2</th>
            <th className="px-4 py-2.5 text-left font-medium">Origin</th>
            <th className="px-4 py-2.5 text-left font-medium">Nights</th>
            <th className="px-4 py-2.5 text-left font-medium">Arrival → Departure</th>
            <th className="px-4 py-2.5 text-left font-medium">Check-in</th>
            <th className="px-4 py-2.5 text-left font-medium">Reservation</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100" key={resetKey}>
          {list.map((r, i) => {
            const arrived = r.booking.status === "checked-in";
            return (
              <tr
                key={r.booking.id}
                className={`transition ${arrived ? "bg-cyan-50/50 hover:bg-cyan-50" : "hover:bg-gray-50"}`}
              >
                <td className="px-4 py-2.5 text-gray-400">{i + 1}</td>
                <td className="px-4 py-2.5">
                  <div className="relative w-24">
                    <KeyRound className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-300 pointer-events-none" />
                    <input
                      type="text"
                      defaultValue={r.booking.roomNumber ?? ""}
                      placeholder="—"
                      onBlur={(e) => saveRoomNumber(r.booking, e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                      }}
                      className={`w-24 rounded-md border pl-7 pr-2 py-1.5 text-sm font-semibold focus:outline-none focus:border-amber-500 transition ${
                        r.booking.roomNumber
                          ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                          : "border-gray-300 bg-white text-gray-900"
                      }`}
                      title="Hotel room number — press Enter to save"
                    />
                  </div>
                </td>
                <td className="px-4 py-2.5">
                  <select
                    value={r.booking.roomType ?? ""}
                    onChange={(e) => saveRoomType(r.booking, e.target.value)}
                    className={`rounded-md border px-2 py-1.5 text-xs font-semibold focus:outline-none focus:border-amber-500 transition cursor-pointer ${
                      r.booking.roomType
                        ? "border-amber-200 bg-amber-50 text-amber-900 font-bold"
                        : "border-gray-300 bg-white text-gray-400 font-normal"
                    }`}
                    title="Select hotel room type"
                  >
                    <option value="" className="text-gray-400">
                      — Select room type —
                    </option>
                    {ROOM_TYPES.map((rt) => (
                      <option key={rt.id} value={rt.label} className="text-gray-900 font-normal">
                        {rt.label}{rt.capacity ? ` (${rt.capacity})` : ""}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="px-4 py-2.5 font-medium text-gray-900">{r.guests[0] ?? "—"}</td>
                <td className="px-4 py-2.5 text-gray-700">
                  {r.category === "double" ? (
                    r.guests.length > 2 ? (
                      <div>
                        <span>{r.guests[1]}</span>
                        <span className="ml-1.5 inline-block text-[11px] bg-amber-50 text-amber-800 border border-amber-200 px-1.5 py-0.5 rounded font-medium" title={r.guests.slice(2).join(" & ")}>
                          +{r.guests.length - 2} more ({r.guests.slice(2).join(", ")})
                        </span>
                      </div>
                    ) : (
                      r.guests[1] ?? (r.booking.numPeople > 1 ? "Guest 2" : "—")
                    )
                  ) : ""}
                </td>
                <td className="px-4 py-2.5 whitespace-nowrap">
                  {guestOrigin(r.booking) === "morocco" ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      <span>🇲🇦</span> Morocco
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                      <span>🌐</span> {r.booking.country ? r.booking.country : "Étranger"}
                    </span>
                  )}
                </td>
                <td className="px-4 py-2.5 text-gray-600">{nightsOf(r)}</td>
                <td className="px-4 py-2.5 text-gray-600 whitespace-nowrap">
                  {fmtDate(r.booking.arrivalDate)} → {fmtDate(r.booking.departureDate)}
                </td>
                <td className="px-4 py-2.5 whitespace-nowrap">
                  {r.booking.status === "pending" ? (
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] tracking-widest uppercase font-medium border ${statusStyles.pending}`}
                    >
                      pending
                    </span>
                  ) : (
                    <button
                      onClick={() => toggleArrived(r.booking)}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] tracking-wide uppercase font-semibold border transition cursor-pointer ${
                        arrived
                          ? "bg-cyan-100 text-cyan-700 border-cyan-300 hover:bg-cyan-200"
                          : "bg-white text-gray-600 border-gray-300 hover:border-cyan-400 hover:text-cyan-700"
                      }`}
                      title={
                        arrived
                          ? "Guest arrived — click to undo"
                          : "Mark the guests as arrived (check-in)"
                      }
                    >
                      <UserCheck className="h-3.5 w-3.5" />
                      {arrived ? "Arrived ✓" : "Check in"}
                    </button>
                  )}
                </td>
                <td className="px-4 py-2.5">
                  <code className="text-xs font-mono text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded">
                    {r.booking.ticketCode}
                  </code>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-2xl tracking-wide text-gray-900">
            Hotel Rooming List
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            Every booked room with its guests, grouped by partner — ready to hand to the
            Kenzi Solazur.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
          <button
            onClick={() => downloadExcel("morocco")}
            disabled={moroccanRooms.length === 0}
            className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 transition cursor-pointer disabled:opacity-40"
            title="Download Excel containing only Moroccan guests"
          >
            <Download className="h-3.5 w-3.5" /> 🇲🇦 Excel Maroc ({moroccanGuests} guests)
          </button>
          <button
            onClick={() => downloadExcel("international")}
            disabled={internationalRooms.length === 0}
            className="inline-flex items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700 hover:bg-blue-100 transition cursor-pointer disabled:opacity-40"
            title="Download Excel containing only Étranger / International guests"
          >
            <Download className="h-3.5 w-3.5" /> 🌐 Excel Étranger ({internationalGuests} guests)
          </button>
          <button
            onClick={() => downloadExcel("all")}
            disabled={rooms.length === 0}
            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition cursor-pointer disabled:opacity-40"
            title="Download Excel containing all rooms and guests"
          >
            <Download className="h-3.5 w-3.5" /> 📁 Excel All ({totalGuests} guests)
          </button>
        </div>
      </div>

      {/* Room-number column missing */}
      {!roomReady && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-5 flex gap-3">
          <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="text-sm text-amber-800">
            <p className="font-semibold text-amber-700">
              Room numbers need a database update
            </p>
            <p className="mt-1">
              Assigning room numbers can't be saved yet. Open the Supabase Dashboard → SQL
              Editor, run the script in{" "}
              <code className="font-mono bg-amber-100 px-1 rounded">
                supabase/room-number.sql
              </code>
              , then refresh this page.
            </p>
          </div>
        </div>
      )}

      {/* Room-type column missing */}
      {!roomTypeReady && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-5 flex gap-3">
          <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="text-sm text-amber-800">
            <p className="font-semibold text-amber-700">
              Room types need a database update
            </p>
            <p className="mt-1">
              Assigning room types can't be saved yet. Open the Supabase Dashboard → SQL
              Editor, run the script in{" "}
              <code className="font-mono bg-amber-100 px-1 rounded">
                supabase/room-type.sql
              </code>
              , then refresh this page.
            </p>
          </div>
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 flex items-start justify-between gap-3">
          <p className="text-sm text-red-700">{error}</p>
          <button
            onClick={() => setError("")}
            className="text-red-400 hover:text-red-600 transition cursor-pointer shrink-0"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm p-4">
          <div className="flex items-center justify-between">
            <p className="text-xs tracking-widest uppercase text-gray-500">Double Rooms</p>
            <BedDouble className="h-4 w-4 text-blue-500" />
          </div>
          <p className="mt-1 font-display text-2xl text-gray-900">{doubles.length}</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm p-4">
          <div className="flex items-center justify-between">
            <p className="text-xs tracking-widest uppercase text-gray-500">Single Rooms</p>
            <Bed className="h-4 w-4 text-violet-500" />
          </div>
          <p className="mt-1 font-display text-2xl text-gray-900">{singles.length}</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm p-4">
          <div className="flex items-center justify-between">
            <p className="text-xs tracking-widest uppercase text-gray-500">Guests</p>
            <Users className="h-4 w-4 text-emerald-500" />
          </div>
          <p className="mt-1 font-display text-2xl text-gray-900">{totalGuests}</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm p-4">
          <div className="flex items-center justify-between">
            <p className="text-xs tracking-widest uppercase text-gray-500">Arrived</p>
            <UserCheck className="h-4 w-4 text-cyan-600" />
          </div>
          <p className="mt-1 font-display text-2xl text-gray-900">
            {rooms.filter((r) => r.booking.status === "checked-in").length}
            <span className="text-sm text-gray-400 font-normal"> / {rooms.length}</span>
          </p>
        </div>
      </div>

      {/* Room Type Inventory Allocation Overview */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm p-4">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-700 flex items-center gap-2">
            <Hotel className="h-4 w-4 text-amber-600" /> Room Type Allocation & Inventory
          </h4>
          <span className="text-xs text-slate-500">
            {rooms.filter((r) => r.booking.roomType).length} of {rooms.length} rooms assigned
          </span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2 text-xs">
          {ROOM_TYPES.map((rt) => {
            const count = rooms.filter((r) => r.booking.roomType === rt.label).length;
            const isOver = rt.capacity !== undefined && count > rt.capacity;
            return (
              <div
                key={rt.id}
                className={`p-2.5 rounded-lg border flex flex-col justify-between transition ${
                  count > 0 ? "border-amber-200 bg-amber-50/40" : "border-gray-100 bg-gray-50/50"
                }`}
              >
                <span className="font-medium text-gray-800 truncate">{rt.label}</span>
                <div className="mt-1 flex items-baseline justify-between">
                  <span className={`font-bold text-sm ${isOver ? "text-red-600" : count > 0 ? "text-amber-700" : "text-gray-400"}`}>
                    {count}
                  </span>
                  {rt.capacity !== undefined ? (
                    <span className={`text-[11px] font-mono ${isOver ? "text-red-500 font-bold" : "text-gray-400"}`}>
                      / {rt.capacity} max
                    </span>
                  ) : (
                    <span className="text-[11px] text-gray-300 font-mono">—</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Search + filter */}
      <div className="flex flex-col gap-3">
        {/* Origin Filter Tabs */}
        <div className="flex flex-wrap items-center gap-2 border-b border-gray-200 pb-3">
          <span className="text-xs font-semibold uppercase tracking-wider text-gray-500 mr-2">Filter Origin:</span>
          <button
            onClick={() => setOriginFilter("all")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
              originFilter === "all"
                ? "bg-gray-900 text-white shadow-xs"
                : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"
            }`}
          >
            All Rooms ({rooms.length} rooms · {rooms.reduce((s, r) => s + bookingPeopleCount(r.booking, packs), 0)} guests)
          </button>
          <button
            onClick={() => setOriginFilter("morocco")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer inline-flex items-center gap-1.5 ${
              originFilter === "morocco"
                ? "bg-emerald-600 text-white shadow-xs"
                : "bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100"
            }`}
          >
            <span>🇲🇦</span> Morocco ({moroccanRooms.length} rooms · {moroccanGuests} guests)
          </button>
          <button
            onClick={() => setOriginFilter("international")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer inline-flex items-center gap-1.5 ${
              originFilter === "international"
                ? "bg-blue-600 text-white shadow-xs"
                : "bg-blue-50 text-blue-800 border border-blue-200 hover:bg-blue-100"
            }`}
          >
            <span>🌐</span> Étranger ({internationalRooms.length} rooms · {internationalGuests} guests)
          </button>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search a guest, reservation, partner or room number…"
              className="w-full rounded-lg border border-gray-300 bg-white pl-9 pr-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-amber-500 transition"
            />
          </div>
          <label className="inline-flex items-center gap-2 text-sm text-gray-600 cursor-pointer shrink-0">
            <input
              type="checkbox"
              checked={includePending}
              onChange={(e) => setIncludePending(e.target.checked)}
              className="accent-amber-500"
            />
            Include pending bookings (not confirmed yet)
          </label>
        </div>
      </div>

      {/* Groups */}
      {loading ? (
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm px-5 py-16 text-center text-sm text-gray-400">
          Loading…
        </div>
      ) : rooms.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm px-5 py-16 text-center text-sm text-gray-400">
          <Building2 className="h-8 w-8 mx-auto mb-3 text-gray-300" />
          No confirmed rooms yet.
        </div>
      ) : (
        sortedGroups.map(([key, g]) => {
          const gDoubles = g.rooms.filter((r) => r.category === "double");
          const gSingles = g.rooms.filter((r) => r.category === "single");
          return (
            <div
              key={key}
              className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden"
            >
              <div className="px-5 py-4 border-b border-gray-200 bg-[#13234d] flex items-center justify-between gap-3 flex-wrap">
                <h3 className="font-display text-sm tracking-wide text-white flex items-center gap-2">
                  <Users className="h-4 w-4 text-amber-300" />
                  {g.title}
                </h3>
                <p className="text-xs text-slate-300">
                  {gDoubles.length} double · {gSingles.length} single ·{" "}
                  {g.rooms.reduce((s, r) => s + bookingPeopleCount(r.booking, packs), 0)}{" "}
                  guests
                </p>
              </div>
              {gDoubles.length > 0 && (
                <div className="px-5 pt-4">
                  <p className="text-xs font-semibold tracking-widest uppercase text-blue-600 flex items-center gap-1.5">
                    <BedDouble className="h-3.5 w-3.5" /> Double Rooms ({gDoubles.length})
                  </p>
                  <RoomTable list={gDoubles} />
                </div>
              )}
              {gSingles.length > 0 && (
                <div className="px-5 pt-4 pb-4">
                  <p className="text-xs font-semibold tracking-widest uppercase text-violet-600 flex items-center gap-1.5">
                    <Bed className="h-3.5 w-3.5" /> Single Rooms ({gSingles.length})
                  </p>
                  <RoomTable list={gSingles} />
                </div>
              )}
              {gDoubles.length > 0 && gSingles.length === 0 && <div className="pb-4" />}
            </div>
          );
        })
      )}
    </div>
  );
}
