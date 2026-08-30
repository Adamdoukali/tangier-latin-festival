import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect, useCallback } from "react";
import {
  Mic2,
  Building2,
  Ticket,
  AlertTriangle,
  X,
  Search,
  ToggleLeft,
  ToggleRight,
} from "lucide-react";
import {
  getBookings,
  getPacks,
  getCollaborators,
  guestBracelets,
  setGuestBracelet,
  guestBraceletsGiven,
  setGuestBraceletGiven,
  braceletColumnReady,
  braceletGivenColumnReady,
  packLabel,
  type Booking,
  type Pack,
  type Collaborator,
  type BraceletCategory,
} from "@/lib/admin-store";
import { translateDynamicText } from "@/lib/translations";

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
    title: "Bracelets des artistes",
    icon: Mic2,
    accent: "text-fuchsia-600",
    chip: "bg-fuchsia-50 border-fuchsia-200 text-fuchsia-700",
  },
  {
    key: "hotel",
    title: "Bracelets de l’hôtel",
    icon: Building2,
    accent: "text-blue-600",
    chip: "bg-blue-50 border-blue-200 text-blue-700",
  },
  {
    key: "fullpass",
    title: "Bracelets des pass complets",
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
  given: boolean;
  pack: Pack | undefined;
  partner: Collaborator | undefined;
}

function AdminBracelets() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [packs, setPacks] = useState<Pack[]>([]);
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [ready, setReady] = useState(true);
  const [givenReady, setGivenReady] = useState(true);
  const [includePending, setIncludePending] = useState(false);
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    const [b, p, c, ok, givenOk] = await Promise.all([
      getBookings(),
      getPacks(),
      getCollaborators(),
      braceletColumnReady(),
      braceletGivenColumnReady(),
    ]);
    setBookings(b);
    setPacks(p);
    setCollaborators(c);
    setReady(ok);
    setGivenReady(givenOk);
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
        : b.status === "confirmed" || b.status === "checked-in",
    )
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
    .flatMap((b) => {
      const brs = guestBracelets(b, packs);
      const given = guestBraceletsGiven(b);
      const names = b.customerName
        .split(/\s*&\s*/)
        .map((s) => s.trim())
        .filter(Boolean);
      return brs.map((bracelet, i) => ({
        booking: b,
        guestIndex: i,
        guestName: names[i] ?? `Participant ${i + 1}`,
        bracelet,
        given: given[i] ?? false,
        pack: packs.find((p) => p.id === b.packId),
        partner: b.collaboratorId
          ? collaborators.find((c) => c.id === b.collaboratorId)
          : undefined,
      }));
    })
    .filter((r) => {
      if (!search.trim()) return true;
      const q = search.trim().toLowerCase();
      return (
        r.guestName.toLowerCase().includes(q) ||
        r.booking.customerName.toLowerCase().includes(q) ||
        r.booking.ticketCode.toLowerCase().includes(q) ||
        (r.partner?.name.toLowerCase().includes(q) ?? false)
      );
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

  const toggleGiven = async (row: GuestRow) => {
    setError("");
    try {
      await setGuestBraceletGiven(row.booking, row.guestIndex, !row.given);
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
          Un bracelet par participant. Les participants d’une même réservation apparaissent
          séparément (Participant 1, Participant 2), afin que chacun puisse recevoir le bracelet
          approprié grâce au sélecteur de sa ligne.
        </p>
      </div>

      {/* bracelet_given column missing */}
      {ready && !givenReady && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-5 flex gap-3">
          <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="text-sm text-amber-800">
            <p className="font-semibold text-amber-700">
              La remise des bracelets nécessite une mise à jour de la base de données
            </p>
            <p className="mt-1">
              La remise des bracelets ne peut pas encore être enregistrée. Ouvrez le tableau de bord
              Supabase → Éditeur SQL et exécutez le script{" "}
              <code className="font-mono bg-amber-100 px-1 rounded">
                supabase/bracelet-given.sql
              </code>
              , puis actualisez cette page.
            </p>
          </div>
        </div>
      )}

      {/* Column missing */}
      {!ready && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-5 flex gap-3">
          <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="text-sm text-amber-800">
            <p className="font-semibold text-amber-700">
              Les bracelets nécessitent une mise à jour de la base de données
            </p>
            <p className="mt-1">
              Les changements de catégorie ne peuvent pas encore être enregistrés. Ouvrez le tableau
              de bord Supabase → Éditeur SQL et exécutez le script{" "}
              <code className="font-mono bg-amber-100 px-1 rounded">supabase/bracelets.sql</code>,
              puis actualisez cette page. Les catégories automatiques ci-dessous fonctionnent déjà.
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
          const given = mine.filter((r) => r.given).length;
          return (
            <div key={cat.key} className="rounded-xl border border-gray-200 bg-white shadow-sm p-4">
              <div className="flex items-center justify-between">
                <p className="text-xs tracking-widest uppercase text-gray-500">
                  {cat.key === "artist"
                    ? "Artistes"
                    : cat.key === "hotel"
                      ? "Hôtel"
                      : "Pass complet"}
                </p>
                <cat.icon className={`h-4 w-4 ${cat.accent}`} />
              </div>
              <p className="mt-1 font-display text-2xl text-gray-900">{mine.length}</p>
              <p className="text-[11px] text-gray-400">
                bracelets · <span className="text-emerald-600 font-medium">{given} remis</span>
              </p>
            </div>
          );
        })}
      </div>

      {/* Search + filter */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher un participant par nom, réservation ou partenaire…"
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

      {/* Category sections */}
      {loading ? (
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm px-5 py-16 text-center text-sm text-gray-400">
          Chargement…
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
                <p className="text-xs text-slate-300">
                  {mine.length} bracelets ·{" "}
                  <span className="text-emerald-300">
                    {mine.filter((r) => r.given).length} remis
                  </span>
                </p>
              </div>
              {mine.length === 0 ? (
                <p className="px-5 py-8 text-center text-sm text-gray-400">
                  Personne dans cette catégorie pour le moment.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-200 text-xs tracking-widest uppercase text-gray-500">
                        <th className="px-4 py-2.5 text-left font-medium">Participant</th>
                        <th className="px-4 py-2.5 text-left font-medium">Forfait</th>
                        <th className="px-4 py-2.5 text-left font-medium">Partenaire</th>
                        <th className="px-4 py-2.5 text-left font-medium">Reservation</th>
                        <th className="px-4 py-2.5 text-left font-medium">Catégorie</th>
                        <th className="px-4 py-2.5 text-center font-medium">Remis</th>
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
                                Participant {r.guestIndex + 1}/{r.booking.numPeople}
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-2.5 text-gray-600 max-w-[240px] truncate">
                            {translateDynamicText(
                              r.pack ? packLabel(r.pack) : r.booking.packName,
                              "fr",
                            )}
                          </td>
                          <td className="px-4 py-2.5 text-gray-600">
                            {r.partner ? r.partner.name : "Sans partenaire"}
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
                              <option value="hotel">Hôtel</option>
                              <option value="fullpass">Pass complet</option>
                            </select>
                            {!r.booking.bracelet && (
                              <span className="ml-1.5 text-[10px] text-gray-400">auto</span>
                            )}
                          </td>
                          <td className="px-4 py-2.5 text-center">
                            <button
                              onClick={() => toggleGiven(r)}
                              className="cursor-pointer align-middle inline-flex items-center gap-1.5"
                              title={
                                r.given
                                  ? "Bracelet remis — cliquer pour annuler"
                                  : "Marquer le bracelet comme remis"
                              }
                            >
                              {r.given ? (
                                <>
                                  <ToggleRight className="h-6 w-6 text-emerald-500" />
                                  <span className="text-[10px] font-semibold uppercase tracking-widest text-emerald-600">
                                    Oui
                                  </span>
                                </>
                              ) : (
                                <>
                                  <ToggleLeft className="h-6 w-6 text-gray-300" />
                                  <span className="text-[10px] font-semibold uppercase tracking-widest text-gray-400">
                                    Non
                                  </span>
                                </>
                              )}
                            </button>
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
