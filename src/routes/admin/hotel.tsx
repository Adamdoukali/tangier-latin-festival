import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { BedDouble, Bed, Users, Download, Building2 } from "lucide-react";
import {
  getBookings,
  getPacks,
  getCollaborators,
  packRoomCategory,
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
  category: "single" | "double";
  guests: string[];
  partner: Collaborator | undefined;
}

function AdminHotel() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [packs, setPacks] = useState<Pack[]>([]);
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [includePending, setIncludePending] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [b, p, c] = await Promise.all([getBookings(), getPacks(), getCollaborators()]);
      setBookings(b);
      setPacks(p);
      setCollaborators(c);
      setLoading(false);
    })();
  }, []);

  // Rooms only (single + double), confirmed/checked-in by default
  const rooms = bookings
    .filter((b) =>
      includePending
        ? b.status !== "declined"
        : b.status === "confirmed" || b.status === "checked-in"
    )
    .map((b) => {
      const pack = packs.find((p) => p.id === b.packId);
      const category = packRoomCategory(pack?.name ?? b.packName);
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

  // Group by partner (direct bookings last)
  const groups = new Map<string, { title: string; rooms: Room[] }>();
  for (const r of rooms) {
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

  const doubles = rooms.filter((r) => r.category === "double");
  const singles = rooms.filter((r) => r.category === "single");
  const totalGuests = rooms.reduce((s, r) => s + (r.booking.numPeople || r.guests.length), 0);

  const fmtDate = (d?: string | null) => (d ? new Date(d).toLocaleDateString() : "—");
  const nightsOf = (r: Room) =>
    r.pack?.features.find((f) => /night|nuit|noche/i.test(f)) ?? r.pack?.sub ?? "";

  // Excel-friendly CSV (semicolon + BOM), one row per room
  // Rooming-list export in the festival's own sheet format:
  // one row per GUEST, rooms numbered per promoter
  // (Id chambre / Promoteur · Prénom · Nom · dates · nuits · type ·
  //  Montant · Commission · Paiement · Reste à payer · Commentaire).
  const downloadExcel = () => {
    const header = [
      "Id chambre / Promoteur",
      "Prénom",
      "Nom",
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
      if (!p || !p.commission) return "";
      if ((p.commissionType ?? "percent") === "per_person") return p.commission;
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
        const roomId = `Chambre ${i + 1} / ${promoter}`;
        const roomType = r.pack
          ? `${r.pack.name}${r.pack.sub ? ` - ${r.pack.sub}` : ""}`
          : r.booking.packName;
        const guestCount = Math.max(r.booking.numPeople || 1, r.guests.length);
        for (let gi = 0; gi < guestCount; gi++) {
          const full = (r.guests[gi] ?? "").trim();
          const parts = full.split(/\s+/);
          const prenom = parts[0] ?? "";
          const nom = parts.slice(1).join(" ").toUpperCase();
          csvRows.push([
            roomId,
            prenom,
            nom,
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

    const esc = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;
    const csv =
      "﻿" + [header, ...csvRows].map((r) => r.map(esc).join(";")).join("\r\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `hotel-rooming-list-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
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
            <th className="px-4 py-2.5 text-left font-medium">Guest 1</th>
            <th className="px-4 py-2.5 text-left font-medium">Guest 2</th>
            <th className="px-4 py-2.5 text-left font-medium">Nights</th>
            <th className="px-4 py-2.5 text-left font-medium">Arrival → Departure</th>
            <th className="px-4 py-2.5 text-left font-medium">Status</th>
            <th className="px-4 py-2.5 text-left font-medium">Reservation</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {list.map((r, i) => (
            <tr key={r.booking.id} className="hover:bg-gray-50 transition">
              <td className="px-4 py-2.5 text-gray-400">{i + 1}</td>
              <td className="px-4 py-2.5 font-medium text-gray-900">{r.guests[0] ?? "—"}</td>
              <td className="px-4 py-2.5 text-gray-700">
                {r.category === "double" ? (r.guests[1] ?? "—") : ""}
              </td>
              <td className="px-4 py-2.5 text-gray-600">{nightsOf(r)}</td>
              <td className="px-4 py-2.5 text-gray-600 whitespace-nowrap">
                {fmtDate(r.booking.arrivalDate)} → {fmtDate(r.booking.departureDate)}
              </td>
              <td className="px-4 py-2.5">
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] tracking-widest uppercase font-medium border ${statusStyles[r.booking.status] ?? ""}`}
                >
                  {r.booking.status}
                </span>
              </td>
              <td className="px-4 py-2.5">
                <code className="text-xs font-mono text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded">
                  {r.booking.ticketCode}
                </code>
              </td>
            </tr>
          ))}
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
        <button
          onClick={downloadExcel}
          disabled={rooms.length === 0}
          className="inline-flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm font-medium text-emerald-700 hover:bg-emerald-100 transition cursor-pointer self-start disabled:opacity-40"
        >
          <Download className="h-4 w-4" /> Download Excel (rooming list)
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
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
      </div>

      {/* Filter */}
      <label className="inline-flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
        <input
          type="checkbox"
          checked={includePending}
          onChange={(e) => setIncludePending(e.target.checked)}
          className="accent-amber-500"
        />
        Include pending bookings (not confirmed yet)
      </label>

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
                  {g.rooms.reduce((s, r) => s + (r.booking.numPeople || r.guests.length), 0)}{" "}
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
