import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect, useCallback } from "react";
import { Mic2, Building2, Ticket, AlertTriangle, X } from "lucide-react";
import {
  getBookings,
  getPacks,
  getCollaborators,
  guestBracelets,
  setGuestBracelet,
  braceletColumnReady,
  packLabel,
  type Booking,
  type Pack,
  type Collaborator,
  type BraceletCategory,
} from "@/lib/admin-store";

export const Route = createFileRoute("/admin/bracelets")({
  component: AdminBracelets,
});

const CATEGORIES: Array<{
  key: BraceletCategory;
  title: string;
  icon: typeof Mic2;
  accent: string;
  chip: string;
}> = [
  {
    key: "artist",
    title: "Bracelets of the Artists",
    icon: Mic2,
    accent: "text-fuchsia-600",
    chip: "bg-fuchsia-50 border-fuchsia-200 text-fuchsia-700",
  },
  {
    key: "hotel",
    title: "Bracelets of the Hotel",
    icon: Building2,
    accent: "text-blue-600",
    chip: "bg-blue-50 border-blue-200 text-blue-700",
  },
  {
    key: "fullpass",
    title: "Bracelets of the Full Pass",
    icon: Ticket,
    accent: "text-emerald-600",
    chip: "bg-emerald-50 border-emerald-200 text-emerald-700",
  },
];

interface GuestRow {
  booking: Booking;
  guestIndex: number;
  guestName: string;
  bracelet: BraceletCategory;
  pack: Pack | undefined;
  partner: Collaborator | undefined;
}

function AdminBracelets() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [packs, setPacks] = useState<Pack[]>([]);
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [ready, setReady] = useState(true);
  const [includePending, setIncludePending] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    const [b, p, c, ok] = await Promise.all([
      getBookings(),
      getPacks(),
      getCollaborators(),
      braceletColumnReady(),
    ]);
    setBookings(b);
    setPacks(p);
    setCollaborators(c);
    setReady(ok);
    setLoading(false);
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  // One row per GUEST — a double room's two guests can wear different
  // bracelets (e.g. an artist sharing a room with a regular guest).
  const rows: GuestRow[] = bookings
    .filter((b) =>
      includePending
        ? b.status !== "declined"
        : b.status === "confirmed" || b.status === "checked-in"
    )
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
    .flatMap((b) => {
      const brs = guestBracelets(b, packs);
      const names = b.customerName
        .split(/\s*&\s*/)
        .map((s) => s.trim())
        .filter(Boolean);
      return brs.map((bracelet, i) => ({
        booking: b,
        guestIndex: i,
        guestName: names[i] ?? `Guest ${i + 1}`,
        bracelet,
        pack: packs.find((p) => p.id === b.packId),
        partner: b.collaboratorId
          ? collaborators.find((c) => c.id === b.collaboratorId)
          : undefined,
      }));
    });

  const changeBracelet = async (row: GuestRow, value: BraceletCategory) => {
    setError("");
    try {
      await setGuestBracelet(row.booking, row.guestIndex, value, packs);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
    await reload();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="font-display text-2xl tracking-wide text-gray-900">Bracelets</h2>
        <p className="mt-1 text-sm text-gray-500">
          One bracelet per guest. Guests of the same reservation appear separately (Guest 1,
          Guest 2), so an artist sharing a double room can wear the Artist bracelet while
          their roommate keeps the Hotel one — change anyone with the selector on their row.
        </p>
      </div>

      {/* Column missing */}
      {!ready && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-5 flex gap-3">
          <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="text-sm text-amber-800">
            <p className="font-semibold text-amber-700">Bracelets need a database update</p>
            <p className="mt-1">
              Category changes can't be saved yet. Open the Supabase Dashboard → SQL Editor,
              run the script in{" "}
              <code className="font-mono bg-amber-100 px-1 rounded">
                supabase/bracelets.sql
              </code>
              , then refresh this page. The automatic categories below already work.
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
      <div className="grid grid-cols-3 gap-4">
        {CATEGORIES.map((cat) => {
          const mine = rows.filter((r) => r.bracelet === cat.key);
          return (
            <div key={cat.key} className="rounded-xl border border-gray-200 bg-white shadow-sm p-4">
              <div className="flex items-center justify-between">
                <p className="text-xs tracking-widest uppercase text-gray-500">
                  {cat.key === "artist"
                    ? "Artists"
                    : cat.key === "hotel"
                      ? "Hotel"
                      : "Full Pass"}
                </p>
                <cat.icon className={`h-4 w-4 ${cat.accent}`} />
              </div>
              <p className="mt-1 font-display text-2xl text-gray-900">{mine.length}</p>
              <p className="text-[11px] text-gray-400">bracelets</p>
            </div>
          );
        })}
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

      {/* Category sections */}
      {loading ? (
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm px-5 py-16 text-center text-sm text-gray-400">
          Loading…
        </div>
      ) : (
        CATEGORIES.map((cat) => {
          const mine = rows.filter((r) => r.bracelet === cat.key);
          return (
            <div
              key={cat.key}
              className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden"
            >
              <div className="px-5 py-4 border-b border-gray-200 bg-[#13234d] flex items-center justify-between gap-3 flex-wrap">
                <h3 className="font-display text-sm tracking-wide text-white flex items-center gap-2">
                  <cat.icon className="h-4 w-4 text-amber-300" />
                  {cat.title}
                </h3>
                <p className="text-xs text-slate-300">{mine.length} bracelets</p>
              </div>
              {mine.length === 0 ? (
                <p className="px-5 py-8 text-center text-sm text-gray-400">
                  Nobody in this category yet.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-200 text-xs tracking-widest uppercase text-gray-500">
                        <th className="px-4 py-2.5 text-left font-medium">Guest</th>
                        <th className="px-4 py-2.5 text-left font-medium">Pack</th>
                        <th className="px-4 py-2.5 text-left font-medium">Partner</th>
                        <th className="px-4 py-2.5 text-left font-medium">Reservation</th>
                        <th className="px-4 py-2.5 text-left font-medium">Category</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {mine.map((r) => (
                        <tr
                          key={`${r.booking.id}-${r.guestIndex}`}
                          className="hover:bg-gray-50 transition"
                        >
                          <td className="px-4 py-2.5">
                            <span className="font-medium text-gray-900">{r.guestName}</span>
                            {(r.booking.numPeople || 1) > 1 && (
                              <span className="ml-2 text-[10px] font-semibold uppercase tracking-widest text-gray-400 border border-gray-200 bg-gray-50 rounded px-1.5 py-0.5">
                                Guest {r.guestIndex + 1}/{r.booking.numPeople}
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-2.5 text-gray-600 max-w-[240px] truncate">
                            {r.pack ? packLabel(r.pack) : r.booking.packName}
                          </td>
                          <td className="px-4 py-2.5 text-gray-600">
                            {r.partner ? r.partner.name : "Direct"}
                          </td>
                          <td className="px-4 py-2.5">
                            <code className="text-xs font-mono text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded">
                              {r.booking.ticketCode}
                            </code>
                          </td>
                          <td className="px-4 py-2.5">
                            <select
                              value={r.bracelet}
                              onChange={(e) =>
                                changeBracelet(r, e.target.value as BraceletCategory)
                              }
                              className={`appearance-none rounded-full px-2.5 py-1 text-[10px] tracking-widest uppercase font-medium border cursor-pointer focus:outline-none ${cat.chip}`}
                            >
                              <option value="artist">Artist</option>
                              <option value="hotel">Hotel</option>
                              <option value="fullpass">Full Pass</option>
                            </select>
                            {!r.booking.bracelet && (
                              <span className="ml-1.5 text-[10px] text-gray-400">auto</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          );
        })
      )}
    </div>
  );
}
