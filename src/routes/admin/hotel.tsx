import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect, useCallback } from "react";
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
  getClients,
  packRoomCategory,
  bookingPeopleCount,
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
  type ClientGuest,
} from "@/lib/admin-store";
import {
  formatSpreadsheetDate,
  formatSpreadsheetOrigin,
  HOTEL_EXPORT_HEADER,
} from "@/lib/admin-export-data";
import { downloadXlsx } from "@/lib/spreadsheet-export";

export const Route = createFileRoute("/admin/hotel")({
  component: AdminHotel,
});

interface Room {
  booking: Booking;
  pack: Pack | undefined;
  category: "single" | "double" | "special";
  guests: string[];
  clients: ClientGuest[];
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
        : b.status === "confirmed" || b.status === "checked-in",
    )
    .filter((b) => {
      if (!search.trim()) return true;
      const q = search.trim().toLowerCase();
      const partner = b.collaboratorId
        ? collaborators.find((c) => c.id === b.collaboratorId)
        : undefined;
      const clients = getClients([b], packs, collaborators);
      return (
        b.customerName.toLowerCase().includes(q) ||
        clients.some(
          (client) =>
            client.fullName.toLowerCase().includes(q) ||
            client.country.toLowerCase().includes(q) ||
            client.email.toLowerCase().includes(q),
        ) ||
        b.ticketCode.toLowerCase().includes(q) ||
        (b.roomNumber ?? "").toLowerCase().includes(q) ||
        (b.roomType ?? "").toLowerCase().includes(q) ||
        (partner?.name.toLowerCase().includes(q) ?? false)
      );
    })
    .map((b) => {
      const pack = packs.find((p) => p.id === b.packId);
      const category = packRoomCategory(pack || b.packName, b.numPeople);
      const clients = getClients([b], packs, collaborators);
      return {
        booking: b,
        pack,
        category,
        guests: clients.map((client) => client.fullName).filter(Boolean),
        clients,
        partner: b.collaboratorId
          ? collaborators.find((c) => c.id === b.collaboratorId)
          : undefined,
      };
    })
    .filter((r): r is Room => r.category !== "fullpass")
    .sort(
      (a, b) => new Date(a.booking.createdAt).getTime() - new Date(b.booking.createdAt).getTime(),
    );

  const roomOrigin = (room: Room): "morocco" | "international" =>
    room.clients.some((client) => client.origin === "international") ? "international" : "morocco";
  const roomCountries = (room: Room): string =>
    Array.from(
      new Set(
        room.clients
          .filter((client) => client.origin === "international")
          .map((client) => client.country || "Étranger"),
      ),
    ).join(" / ") || "Étranger";

  const moroccanRooms = rooms.filter((room) => roomOrigin(room) === "morocco");
  const internationalRooms = rooms.filter((room) => roomOrigin(room) === "international");
  const moroccanGuests = rooms
    .flatMap((room) => room.clients)
    .filter((client) => client.origin === "morocco").length;
  const internationalGuests = rooms
    .flatMap((room) => room.clients)
    .filter((client) => client.origin === "international").length;

  const displayedRooms = rooms.filter((r) => {
    if (originFilter === "morocco") return roomOrigin(r) === "morocco";
    if (originFilter === "international") return roomOrigin(r) === "international";
    return true;
  });

  // Group by partner (direct bookings last)
  const groups = new Map<string, { title: string; rooms: Room[] }>();
  for (const r of displayedRooms) {
    const key = r.partner?.id ?? "zzz-direct";
    const title = r.partner
      ? `${r.partner.name} (${r.partner.code})`
      : "Sans partenaire — site du festival / saisie manuelle";
    if (!groups.has(key)) groups.set(key, { title, rooms: [] });
    groups.get(key)!.rooms.push(r);
  }
  const sortedGroups = Array.from(groups.entries()).sort(([a], [b]) =>
    a === "zzz-direct" ? 1 : b === "zzz-direct" ? -1 : 0,
  );

  const doubles = displayedRooms.filter((r) => r.category === "double");
  const singles = displayedRooms.filter((r) => r.category === "single");
  const totalGuests = displayedRooms.reduce((s, r) => s + bookingPeopleCount(r.booking, packs), 0);

  const fmtDate = (d?: string | null) => (d ? new Date(d).toLocaleDateString("fr-FR") : "—");
  const nightsOf = (r: Room) =>
    r.pack?.features.find((f) => /night|nuit|noche/i.test(f)) ?? r.pack?.sub ?? "";

  // Real Excel workbook, one row per guest.
  // Rooming-list export in the festival's own sheet format:
  // one row per GUEST, rooms numbered per promoter
  // (Id chambre / Promoteur · Prénom · Nom · dates · nuits · type ·
  //  Montant · Commission · Paiement · Reste à payer · Commentaire).
  const downloadRoomingXlsx = (targetOrigin: "all" | "morocco" | "international" = "all") => {
    const nightsOfRoom = (r: Room): number | "" => {
      if (r.booking.arrivalDate && r.booking.departureDate) {
        const n = Math.round(
          (new Date(r.booking.departureDate).getTime() -
            new Date(r.booking.arrivalDate).getTime()) /
            86400000,
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
    const spreadsheetRows: Array<Array<string | number>> = [];
    for (const [, g] of sortedGroups) {
      const promoter = g.rooms[0]?.partner?.name ?? "Sans partenaire";
      const ordered = [
        ...g.rooms.filter((r) => r.category === "double"),
        ...g.rooms.filter((r) => r.category === "single"),
      ];
      ordered.forEach((r, i) => {
        const roomId = `Chambre ${i + 1} / ${promoter}`;
        const packType = r.pack
          ? `${r.pack.name}${r.pack.sub ? ` - ${r.pack.sub}` : ""}`
          : r.booking.packName;
        const clients = getClients([r.booking], packs, collaborators);
        for (const client of clients) {
          if (targetOrigin !== "all" && client.origin !== targetOrigin) continue;
          const amount = guestAmount(r);
          const commission = guestCommission(r);
          spreadsheetRows.push([
            roomId,
            r.booking.roomNumber ?? "",
            client.firstName,
            client.lastName.toUpperCase(),
            formatSpreadsheetOrigin(client.country, client.origin === "morocco"),
            formatSpreadsheetDate(r.booking.arrivalDate),
            formatSpreadsheetDate(r.booking.departureDate),
            nightsOfRoom(r),
            packType,
            r.booking.roomType ?? "",
            amount,
            commission,
            "", // Paiement — filled in by the team
            "", // Reste à payer
            amount === "" ? "" : amount - (commission === "" ? 0 : commission),
            `${r.booking.ticketCode}${r.booking.notes ? ` — ${r.booking.notes}` : ""}`,
          ]);
        }
      });
    }

    const suffix =
      targetOrigin === "morocco" ? "maroc" : targetOrigin === "international" ? "etranger" : "all";
    downloadXlsx(
      `database-hotel-${suffix}-${new Date().toISOString().slice(0, 10)}.xlsx`,
      [HOTEL_EXPORT_HEADER, ...spreadsheetRows],
      "Hôtel",
    );
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
            <th className="px-4 py-2.5 text-left font-medium">Nº de chambre</th>
            <th className="px-4 py-2.5 text-left font-medium">Type de chambre</th>
            <th className="px-4 py-2.5 text-left font-medium">Participant 1</th>
            <th className="px-4 py-2.5 text-left font-medium">Participant 2</th>
            <th className="px-4 py-2.5 text-left font-medium">Origine</th>
            <th className="px-4 py-2.5 text-left font-medium">Nuits</th>
            <th className="px-4 py-2.5 text-left font-medium">Arrivée → départ</th>
            <th className="px-4 py-2.5 text-left font-medium">Arrivée</th>
            <th className="px-4 py-2.5 text-left font-medium">Réservation</th>
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
                      title="Numéro de chambre d’hôtel — appuyez sur Entrée pour enregistrer"
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
                    title="Sélectionner le type de chambre"
                  >
                    <option value="" className="text-gray-400">
                      — Sélectionner un type de chambre —
                    </option>
                    {ROOM_TYPES.map((rt) => (
                      <option key={rt.id} value={rt.label} className="text-gray-900 font-normal">
                        {rt.label}
                        {rt.capacity ? ` (${rt.capacity})` : ""}
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
                        <span
                          className="ml-1.5 inline-block text-[11px] bg-amber-50 text-amber-800 border border-amber-200 px-1.5 py-0.5 rounded font-medium"
                          title={r.guests.slice(2).join(" & ")}
                        >
                          +{r.guests.length - 2} more ({r.guests.slice(2).join(", ")})
                        </span>
                      </div>
                    ) : (
                      (r.guests[1] ?? (r.booking.numPeople > 1 ? "Participant 2" : "—"))
                    )
                  ) : (
                    ""
                  )}
                </td>
                <td className="px-4 py-2.5 whitespace-nowrap">
                  {roomOrigin(r) === "morocco" ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      <span>🇲🇦</span> Maroc
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                      <span>🌐</span> {roomCountries(r)}
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
                          ? "Participant arrivé — cliquer pour annuler"
                          : "Marquer les guests comme arrivés"
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
            Répartition des chambres d’hôtel
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            Toutes les chambres réservées avec leurs participants, regroupées par partenaire, prêtes
            à être transmises au Kenzi Solazur.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
          <button
            onClick={() => downloadRoomingXlsx("morocco")}
            disabled={moroccanRooms.length === 0}
            className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-600 bg-emerald-600 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-700 transition cursor-pointer disabled:opacity-40"
            title="Télécharger le fichier Excel contenant uniquement les participants marocains"
          >
            <Download className="h-3.5 w-3.5" /> 🇲🇦 XLSX Maroc ({moroccanGuests} participants)
          </button>
          <button
            onClick={() => downloadRoomingXlsx("international")}
            disabled={internationalRooms.length === 0}
            className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-600 bg-emerald-600 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-700 transition cursor-pointer disabled:opacity-40"
            title="Télécharger le fichier Excel contenant uniquement les participants étrangers"
          >
            <Download className="h-3.5 w-3.5" /> 🌐 XLSX Étranger ({internationalGuests}{" "}
            participants)
          </button>
          <button
            onClick={() => downloadRoomingXlsx("all")}
            disabled={rooms.length === 0}
            className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-600 bg-emerald-600 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-700 transition cursor-pointer disabled:opacity-40"
            title="Télécharger le fichier Excel contenant toutes les chambres et tous les participants"
          >
            <Download className="h-3.5 w-3.5" /> 📁 XLSX Tous ({totalGuests} participants)
          </button>
        </div>
      </div>

      {/* Room-number column missing */}
      {!roomReady && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-5 flex gap-3">
          <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="text-sm text-amber-800">
            <p className="font-semibold text-amber-700">
              Les numéros de chambre nécessitent une mise à jour de la base
            </p>
            <p className="mt-1">
              L’attribution des numéros de chambre ne peut pas encore être enregistrée. Ouvrez le
              tableau de bord Supabase → Éditeur SQL et exécutez le script{" "}
              <code className="font-mono bg-amber-100 px-1 rounded">supabase/room-number.sql</code>,
              puis actualisez cette page.
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
              Les types de chambre nécessitent une mise à jour de la base
            </p>
            <p className="mt-1">
              L’attribution des types de chambre ne peut pas encore être enregistrée. Ouvrez le
              tableau de bord Supabase → Éditeur SQL et exécutez le script{" "}
              <code className="font-mono bg-amber-100 px-1 rounded">supabase/room-type.sql</code>,
              puis actualisez cette page.
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
            <p className="text-xs tracking-widest uppercase text-gray-500">Chambres doubles</p>
            <BedDouble className="h-4 w-4 text-blue-500" />
          </div>
          <p className="mt-1 font-display text-2xl text-gray-900">{doubles.length}</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm p-4">
          <div className="flex items-center justify-between">
            <p className="text-xs tracking-widest uppercase text-gray-500">
              Chambres individuelles
            </p>
            <Bed className="h-4 w-4 text-violet-500" />
          </div>
          <p className="mt-1 font-display text-2xl text-gray-900">{singles.length}</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm p-4">
          <div className="flex items-center justify-between">
            <p className="text-xs tracking-widest uppercase text-gray-500">Participants</p>
            <Users className="h-4 w-4 text-emerald-500" />
          </div>
          <p className="mt-1 font-display text-2xl text-gray-900">{totalGuests}</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm p-4">
          <div className="flex items-center justify-between">
            <p className="text-xs tracking-widest uppercase text-gray-500">Arrivé</p>
            <UserCheck className="h-4 w-4 text-cyan-600" />
          </div>
          <p className="mt-1 font-display text-2xl text-gray-900">
            {rooms.filter((r) => r.booking.status === "checked-in").length}
            <span className="text-sm text-gray-400 font-normal"> / {rooms.length}</span>
          </p>
        </div>
      </div>

      {/* Type de chambre Inventory Allocation Overview */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm p-4">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-700 flex items-center gap-2">
            <Hotel className="h-4 w-4 text-amber-600" /> Attribution et inventaire des types de
            chambres
          </h4>
          <span className="text-xs text-slate-500">
            {rooms.filter((r) => r.booking.roomType).length} sur {rooms.length} chambres attribuées
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
                  <span
                    className={`font-bold text-sm ${isOver ? "text-red-600" : count > 0 ? "text-amber-700" : "text-gray-400"}`}
                  >
                    {count}
                  </span>
                  {rt.capacity !== undefined ? (
                    <span
                      className={`text-[11px] font-mono ${isOver ? "text-red-500 font-bold" : "text-gray-400"}`}
                    >
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
          <span className="text-xs font-semibold uppercase tracking-wider text-gray-500 mr-2">
            Filtrer par origine :
          </span>
          <button
            onClick={() => setOriginFilter("all")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
              originFilter === "all"
                ? "bg-gray-900 text-white shadow-xs"
                : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"
            }`}
          >
            Toutes les chambres ({rooms.length} chambres ·{" "}
            {rooms.reduce((s, r) => s + bookingPeopleCount(r.booking, packs), 0)} participants)
          </button>
          <button
            onClick={() => setOriginFilter("morocco")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer inline-flex items-center gap-1.5 ${
              originFilter === "morocco"
                ? "bg-emerald-600 text-white shadow-xs"
                : "bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100"
            }`}
          >
            <span>🇲🇦</span> Maroc ({moroccanRooms.length} chambres · {moroccanGuests} participants)
          </button>
          <button
            onClick={() => setOriginFilter("international")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer inline-flex items-center gap-1.5 ${
              originFilter === "international"
                ? "bg-blue-600 text-white shadow-xs"
                : "bg-blue-50 text-blue-800 border border-blue-200 hover:bg-blue-100"
            }`}
          >
            <span>🌐</span> Étranger ({internationalRooms.length} chambres · {internationalGuests}{" "}
            participants)
          </button>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher un participant, une réservation, un partenaire ou une chambre…"
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
            Inclure les réservations en attente
          </label>
        </div>
      </div>

      {/* Groups */}
      {loading ? (
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm px-5 py-16 text-center text-sm text-gray-400">
          Chargement…
        </div>
      ) : rooms.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm px-5 py-16 text-center text-sm text-gray-400">
          <Building2 className="h-8 w-8 mx-auto mb-3 text-gray-300" />
          Aucune chambre confirmée pour le moment.
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
                  {gDoubles.length} doubles · {gSingles.length} individuelles ·{" "}
                  {g.rooms.reduce((s, r) => s + bookingPeopleCount(r.booking, packs), 0)}{" "}
                  participants
                </p>
              </div>
              {gDoubles.length > 0 && (
                <div className="px-5 pt-4">
                  <p className="text-xs font-semibold tracking-widest uppercase text-blue-600 flex items-center gap-1.5">
                    <BedDouble className="h-3.5 w-3.5" /> Chambres doubles ({gDoubles.length})
                  </p>
                  <RoomTable list={gDoubles} />
                </div>
              )}
              {gSingles.length > 0 && (
                <div className="px-5 pt-4 pb-4">
                  <p className="text-xs font-semibold tracking-widest uppercase text-violet-600 flex items-center gap-1.5">
                    <Bed className="h-3.5 w-3.5" /> Chambres individuelles ({gSingles.length})
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
