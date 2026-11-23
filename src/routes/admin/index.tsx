import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import {
  Ticket,
  Package,
  Users,
  Clock,
  BedDouble,
  Bed,
  TrendingUp,
  Compass,
  ArrowRight,
} from "lucide-react";
import {
  getStats,
  getBookings,
  getPacks,
  getCollaborators,
  getCollaboratorStats,
  getClients,
  formatMoney,
  commissionLabel,
  packRoomCategory,
  guestOrigin,
  bookingPeopleCount,
  emptyMoney,
  isConfirmedBooking,
  isTourismBooking,
  formatMoneyPair,
  formatForPartner,
  partnerCurrency,
  moneyIn,
  type Booking,
  type Pack,
  type Collaborator,
  type CollaboratorStats,
  type ClientGuest,
} from "@/lib/admin-store";
import { translateDynamicText } from "@/lib/translations";

export const Route = createFileRoute("/admin/")({
  component: AdminDashboard,
});

function AdminDashboard() {
  const [stats, setStats] = useState({
    totalBookings: 0,
    pendingBookings: 0,
    confirmedBookings: 0,
    checkedIn: 0,
    totalRevenue: emptyMoney(),
    totalPacks: 0,
    activePacks: 0,
  });
  const [roomCounts, setRoomCounts] = useState({ double: 0, single: 0, fullpass: 0, excursion: 0 });
  const [recentBookings, setRecentBookings] = useState<Booking[]>([]);
  const [collabStats, setCollabStats] = useState<CollaboratorStats[]>([]);
  const [liveBookings, setLiveBookings] = useState<Booking[]>([]);
  const [allPacks, setAllPacks] = useState<Pack[]>([]);
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [allClients, setAllClients] = useState<ClientGuest[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [s, bookings, packs, cs, collabs] = await Promise.all([
        getStats(),
        getBookings(),
        getPacks(),
        getCollaboratorStats(),
        getCollaborators(),
      ]);
      if (cancelled) return;
      setStats(s);
      // Confirmed bookings split by pack type — unconfirmed/pending are counted as zero
      const catOf = (b: Booking) => {
        if (isTourismBooking(b)) return "excursion";
        const p = packs.find((x) => x.id === b.packId);
        return packRoomCategory(p || b.packName, b.numPeople);
      };
      const live = bookings.filter((b) => isConfirmedBooking(b));
      setLiveBookings(live);
      setAllPacks(packs);
      setCollaborators(collabs);

      const clientList = getClients(live, packs, collabs);
      setAllClients(clientList);

      setRoomCounts({
        double: live.filter((b) => catOf(b) === "double").length,
        single: live.filter((b) => catOf(b) === "single").length,
        fullpass: live.filter((b) => !isTourismBooking(b) && catOf(b) === "fullpass").length,
        excursion: live.filter((b) => isTourismBooking(b) || catOf(b) === "excursion").length,
      });
      setRecentBookings(
        bookings
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
          .slice(0, 5),
      );
      setCollabStats(cs.sort((a, b) => b.ticketsSold - a.ticketsSold));
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const cards = [
    {
      label: "Chambres doubles",
      value: roomCounts.double,
      icon: BedDouble,
    },
    {
      label: "Chambres individuelles",
      value: roomCounts.single,
      icon: Bed,
    },
    {
      label: "Pass complet",
      value: roomCounts.fullpass,
      icon: Ticket,
    },
    {
      label: "Excursions (Asilah / Chaouen)",
      value: roomCounts.excursion,
      icon: Compass,
    },
    {
      label: "Réservations en attente",
      value: stats.pendingBookings,
      icon: Clock,
    },
    {
      label: "Total participants",
      value: allClients.length,
      icon: Users,
    },
    {
      label: "Forfaits actifs",
      value: stats.activePacks,
      icon: Package,
    },
  ];

  const statusStyles: Record<string, string> = {
    pending: "bg-amber-50 text-amber-700 border-amber-200/80",
    confirmed: "bg-emerald-50 text-emerald-700 border-emerald-200/80",
    "checked-in": "bg-sky-50 text-sky-700 border-sky-200/80",
    declined: "bg-rose-50 text-rose-700 border-rose-200/80",
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-semibold tracking-tight text-slate-900">Tableau de bord</h2>
        <p className="mt-1 text-xs text-slate-500">
          Vue d’ensemble et indicateurs clés de la billetterie et des participants.
        </p>
      </div>

      {/* Stats Cards - unslop clean numbers with quiet chrome */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {cards.map((card) => (
          <div
            key={card.label}
            className="rounded-xl border border-slate-200/80 bg-white p-4.5 shadow-xs hover:border-slate-300 transition-colors"
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-slate-500">{card.label}</p>
                <p className="mt-1.5 text-2xl font-semibold text-slate-900 tabular-nums tracking-tight">
                  {card.value}
                </p>
              </div>
              <div className="h-8 w-8 rounded-lg bg-slate-100 border border-slate-200/60 grid place-items-center text-slate-600 shrink-0">
                <card.icon className="h-4 w-4" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* guests by origin — Morocco vs international, per pack type */}
      {(() => {
        const catOfClient = (c: ClientGuest) => {
          const b = liveBookings.find((x) => x.id === c.bookingId);
          if (b && isTourismBooking(b)) return "excursion";
          const p = allPacks.find((x) => x.id === c.packName || x.name === c.packName);
          return packRoomCategory(p || c.packName, 1);
        };
        const rowsData = [
          {
            key: "morocco",
            label: "Maroc",
            dot: "bg-emerald-500",
            cls: "text-slate-900 font-medium",
          },
          {
            key: "international",
            label: "International (étranger)",
            dot: "bg-sky-500",
            cls: "text-slate-900 font-medium",
          },
        ].map((o) => {
          const mine = allClients.filter((c) => c.origin === o.key);
          return {
            ...o,
            double: mine.filter((c) => catOfClient(c) === "double").length,
            single: mine.filter((c) => catOfClient(c) === "single").length,
            fullpass: mine.filter((c) => catOfClient(c) === "fullpass").length,
            excursion: mine.filter((c) => catOfClient(c) === "excursion").length,
            total: mine.length,
          };
        });
        const visible = rowsData;
        return (
          <div className="rounded-xl border border-slate-200/80 bg-white shadow-xs overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-200/80 bg-slate-50/70">
              <h3 className="text-xs font-semibold text-slate-900">
                Participants par origine
              </h3>
              <span className="text-xs text-slate-500">Personnes confirmées</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-left text-slate-500 border-b border-slate-200/80 bg-slate-50/50">
                    <th className="px-5 py-2.5 font-medium">Origine</th>
                    <th className="px-5 py-2.5 text-right font-medium">Chambres doubles</th>
                    <th className="px-5 py-2.5 text-right font-medium">Chambres individuelles</th>
                    <th className="px-5 py-2.5 text-right font-medium">Pass complet</th>
                    <th className="px-5 py-2.5 text-right font-medium">Excursions</th>
                    <th className="px-5 py-2.5 text-right font-medium">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {visible.map((r) => (
                    <tr key={r.key} className="hover:bg-slate-50/80 transition-colors">
                      <td className={`px-5 py-3 ${r.cls}`}>
                        <span
                          className={`inline-block h-2 w-2 rounded-full mr-2 align-middle ${r.dot}`}
                        />
                        {r.label}
                      </td>
                      <td className="px-5 py-3 text-right text-slate-700 tabular-nums">{r.double}</td>
                      <td className="px-5 py-3 text-right text-slate-700 tabular-nums">{r.single}</td>
                      <td className="px-5 py-3 text-right text-slate-700 tabular-nums">{r.fullpass}</td>
                      <td className="px-5 py-3 text-right text-teal-700 font-medium tabular-nums">{r.excursion}</td>
                      <td className="px-5 py-3 text-right font-semibold text-slate-900 tabular-nums">
                        {r.total}
                      </td>
                    </tr>
                  ))}
                  <tr className="border-t border-slate-200 bg-slate-50/80 font-medium text-slate-900">
                    <td className="px-5 py-2.5 text-xs text-slate-600">
                      Total
                    </td>
                    {(["double", "single", "fullpass", "excursion", "total"] as const).map((k) => (
                      <td key={k} className="px-5 py-2.5 text-right font-semibold text-slate-900 tabular-nums">
                        {rowsData.reduce((s, r) => s + r[k], 0)}
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        );
      })()}

      {/* Quick Actions */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        <Link
          to="/admin/packs"
          className="flex items-center gap-3 rounded-xl border border-slate-200/80 bg-white p-4 shadow-xs hover:border-slate-300 hover:bg-slate-50/50 transition-colors group"
        >
          <div className="bg-slate-100 border border-slate-200/60 rounded-lg p-2 text-slate-700">
            <Package className="h-4.5 w-4.5" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-slate-900 truncate">Gérer les forfaits</p>
            <p className="text-[11px] text-slate-500 truncate">Ajouter, modifier ou supprimer des forfaits</p>
          </div>
          <ArrowRight className="h-4 w-4 text-slate-400 group-hover:text-slate-700 group-hover:translate-x-0.5 transition-all" />
        </Link>
        <Link
          to="/admin/bookings"
          className="flex items-center gap-3 rounded-xl border border-slate-200/80 bg-white p-4 shadow-xs hover:border-slate-300 hover:bg-slate-50/50 transition-colors group"
        >
          <div className="bg-slate-100 border border-slate-200/60 rounded-lg p-2 text-slate-700">
            <Ticket className="h-4.5 w-4.5" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-slate-900 truncate">Gérer les réservations</p>
            <p className="text-[11px] text-slate-500 truncate">Afficher les billets et les statuts</p>
          </div>
          <ArrowRight className="h-4 w-4 text-slate-400 group-hover:text-slate-700 group-hover:translate-x-0.5 transition-all" />
        </Link>
        <Link
          to="/admin/invite"
          className="flex items-center gap-3 rounded-xl border border-slate-200/80 bg-white p-4 shadow-xs hover:border-slate-300 hover:bg-slate-50/50 transition-colors group"
        >
          <div className="bg-slate-100 border border-slate-200/60 rounded-lg p-2 text-slate-700">
            <TrendingUp className="h-4.5 w-4.5" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-slate-900 truncate">Générer des invitations</p>
            <p className="text-[11px] text-slate-500 truncate">Codes QR et invitations en masse</p>
          </div>
          <ArrowRight className="h-4 w-4 text-slate-400 group-hover:text-slate-700 group-hover:translate-x-0.5 transition-all" />
        </Link>
      </div>

      {/* Collaborator Leaderboard */}
      {collabStats.length > 0 && (
        <div className="rounded-xl border border-slate-200/80 bg-white shadow-xs overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-200/80 bg-slate-50/70">
            <h3 className="text-xs font-semibold text-slate-900">
              Ventes et commissions des collaborateurs
            </h3>
            <Link
              to="/admin/collaborators"
              className="text-xs font-medium text-slate-600 hover:text-slate-900 transition-colors"
            >
              Gérer →
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-slate-500 border-b border-slate-200/80 bg-slate-50/50">
                  <th className="px-5 py-2.5 font-medium">Collaborateur</th>
                  <th className="px-5 py-2.5 font-medium">Code</th>
                  <th className="px-5 py-2.5 text-right font-medium">Chambres ind.</th>
                  <th className="px-5 py-2.5 text-right font-medium">Chambres doubles</th>
                  <th className="px-5 py-2.5 text-right font-medium">Pass complet</th>
                  <th className="px-5 py-2.5 text-right font-medium">Billets vendus</th>
                  <th className="px-5 py-2.5 text-right font-medium">Ventes</th>
                  <th className="px-5 py-2.5 text-right font-medium">Commission</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {collabStats.map((cs) => (
                  <tr key={cs.collaborator.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-5 py-3 font-medium text-slate-900">{cs.collaborator.name}</td>
                    <td className="px-5 py-3">
                      <span className="font-mono text-xs bg-slate-100 border border-slate-200/60 px-1.5 py-0.5 rounded text-slate-700">
                        {cs.collaborator.code}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-right text-slate-700 tabular-nums">{cs.singleRooms}</td>
                    <td className="px-5 py-3 text-right text-slate-700 tabular-nums">{cs.doubleRooms}</td>
                    <td className="px-5 py-3 text-right text-slate-700 tabular-nums">{cs.fullPass}</td>
                    <td className="px-5 py-3 text-right font-medium text-slate-900 tabular-nums">{cs.ticketsSold}</td>
                    <td className="px-5 py-3 text-right whitespace-nowrap text-slate-900 tabular-nums font-medium">
                      {formatForPartner(cs.revenue, cs.collaborator)}
                    </td>
                    <td className="px-5 py-3 text-right whitespace-nowrap tabular-nums">
                      <span className="font-medium text-emerald-700">
                        {formatForPartner(cs.commission, cs.collaborator)}
                      </span>
                      <span className="ml-1 text-[11px] text-slate-400">
                        ({commissionLabel(cs.collaborator)})
                      </span>
                    </td>
                  </tr>
                ))}
                <tr className="border-t border-slate-200 bg-slate-50/80 font-medium text-slate-900">
                  <td
                    className="px-5 py-2.5 text-xs text-slate-600"
                    colSpan={2}
                  >
                    Total
                  </td>
                  <td className="px-5 py-2.5 text-right font-semibold text-slate-900 tabular-nums">
                    {collabStats.reduce((s, c) => s + c.singleRooms, 0)}
                  </td>
                  <td className="px-5 py-2.5 text-right font-semibold text-slate-900 tabular-nums">
                    {collabStats.reduce((s, c) => s + c.doubleRooms, 0)}
                  </td>
                  <td className="px-5 py-2.5 text-right font-semibold text-slate-900 tabular-nums">
                    {collabStats.reduce((s, c) => s + c.fullPass, 0)}
                  </td>
                  <td className="px-5 py-2.5 text-right font-semibold text-slate-900 tabular-nums">
                    {collabStats.reduce((s, c) => s + c.ticketsSold, 0)}
                  </td>
                  {/* Totals grouped by the partner's own currency */}
                  <td className="px-5 py-2.5 text-right font-semibold text-slate-900 whitespace-nowrap tabular-nums">
                    {formatMoneyPair({
                      eur: collabStats
                        .filter((c) => partnerCurrency(c.collaborator) === "EUR")
                        .reduce((s, c) => s + moneyIn(c.revenue, "EUR"), 0),
                      mad: collabStats
                        .filter((c) => partnerCurrency(c.collaborator) === "MAD")
                        .reduce((s, c) => s + moneyIn(c.revenue, "MAD"), 0),
                    })}
                  </td>
                  <td className="px-5 py-2.5 text-right font-semibold text-emerald-700 whitespace-nowrap tabular-nums">
                    {formatMoneyPair({
                      eur: collabStats
                        .filter((c) => partnerCurrency(c.collaborator) === "EUR")
                        .reduce((s, c) => s + moneyIn(c.commission, "EUR"), 0),
                      mad: collabStats
                        .filter((c) => partnerCurrency(c.collaborator) === "MAD")
                        .reduce((s, c) => s + moneyIn(c.commission, "MAD"), 0),
                    })}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Réservations récentes */}
      <div className="rounded-xl border border-slate-200/80 bg-white shadow-xs overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-200/80 bg-slate-50/70">
          <h3 className="text-xs font-semibold text-slate-900">
            Réservations récentes
          </h3>
          <Link
            to="/admin/bookings"
            className="text-xs font-medium text-slate-600 hover:text-slate-900 transition-colors"
          >
            Tout afficher →
          </Link>
        </div>
        {recentBookings.length === 0 ? (
          <div className="px-5 py-12 text-center text-xs text-slate-400">
            Aucune réservation. Créez-en une depuis la{" "}
            <Link to="/admin/bookings" className="text-slate-700 underline underline-offset-2 hover:text-slate-900">
              page Réservations
            </Link>
            .
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {recentBookings.map((b) => (
              <div
                key={b.id}
                className="flex items-center gap-4 px-5 py-3 hover:bg-slate-50/80 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-slate-900 truncate">{b.customerName}</p>
                  <p className="text-[11px] text-slate-500 truncate">
                    {translateDynamicText(b.packName, "fr")} · <span className="font-mono text-slate-600">{b.ticketCode}</span>
                  </p>
                </div>
                <span
                  className={`px-2 py-0.5 rounded-md text-[11px] font-medium border ${statusStyles[b.status]}`}
                >
                  {b.status}
                </span>
                <span className="text-xs text-slate-400 whitespace-nowrap tabular-nums">
                  {new Date(b.createdAt).toLocaleDateString("fr-FR")}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
