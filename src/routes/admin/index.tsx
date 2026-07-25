import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import {
  Ticket,
  Package,
  DollarSign,
  Clock,
  BedDouble,
  Bed,
  TrendingUp,
  ArrowRight,
} from "lucide-react";
import {
  getStats,
  getBookings,
  getPacks,
  getCollaboratorStats,
  formatMoney,
  commissionLabel,
  packRoomCategory,
  guestOrigin,
  emptyMoney,
  addMoney,
  formatMoneyPair,
  type Booking,
  type Pack,
  type CollaboratorStats,
} from "@/lib/admin-store";

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
  const [roomCounts, setRoomCounts] = useState({ double: 0, single: 0, fullpass: 0 });
  const [recentBookings, setRecentBookings] = useState<Booking[]>([]);
  const [collabStats, setCollabStats] = useState<CollaboratorStats[]>([]);
  const [liveBookings, setLiveBookings] = useState<Booking[]>([]);
  const [allPacks, setAllPacks] = useState<Pack[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [s, bookings, packs, cs] = await Promise.all([
        getStats(),
        getBookings(),
        getPacks(),
        getCollaboratorStats(),
      ]);
      if (cancelled) return;
      setStats(s);
      // Non-declined bookings split by pack type
      const catOf = (b: Booking) => {
        const p = packs.find((x) => x.id === b.packId);
        return packRoomCategory(p?.name ?? b.packName);
      };
      const live = bookings.filter((b) => b.status !== "declined");
      setLiveBookings(live);
      setAllPacks(packs);
      setRoomCounts({
        double: live.filter((b) => catOf(b) === "double").length,
        single: live.filter((b) => catOf(b) === "single").length,
        fullpass: live.filter((b) => catOf(b) === "fullpass").length,
      });
      setRecentBookings(
        bookings
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
          .slice(0, 5)
      );
      setCollabStats(cs.sort((a, b) => b.ticketsSold - a.ticketsSold));
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const cards = [
    {
      label: "Double Rooms",
      value: roomCounts.double,
      icon: BedDouble,
      color: "from-blue-500 to-blue-700",
      iconBg: "bg-blue-100",
      iconColor: "text-blue-600",
    },
    {
      label: "Single Rooms",
      value: roomCounts.single,
      icon: Bed,
      color: "from-violet-500 to-violet-700",
      iconBg: "bg-violet-100",
      iconColor: "text-violet-600",
    },
    {
      label: "Full Pass",
      value: roomCounts.fullpass,
      icon: Ticket,
      color: "from-cyan-500 to-cyan-700",
      iconBg: "bg-cyan-100",
      iconColor: "text-cyan-700",
    },
    {
      label: "Pending",
      value: stats.pendingBookings,
      icon: Clock,
      color: "from-amber-500 to-amber-700",
      iconBg: "bg-amber-100",
      iconColor: "text-amber-600",
    },
    {
      label: "Revenue",
      value: formatMoneyPair(stats.totalRevenue),
      icon: DollarSign,
      color: "from-emerald-500 to-emerald-700",
      iconBg: "bg-emerald-100",
      iconColor: "text-emerald-600",
    },
    {
      label: "Active Packs",
      value: stats.activePacks,
      icon: Package,
      color: "from-pink-500 to-pink-700",
      iconBg: "bg-pink-100",
      iconColor: "text-pink-500",
    },
  ];

  const statusStyles: Record<string, string> = {
    pending: "bg-amber-100 text-amber-600 border-amber-200",
    confirmed: "bg-emerald-100 text-emerald-600 border-emerald-200",
    "checked-in": "bg-cyan-100 text-cyan-700 border-cyan-200",
    declined: "bg-red-100 text-red-600 border-red-200",
  };

  return (
    <div className="space-y-8">
      {/* Welcome */}
      <div>
        <h2 className="font-display text-2xl tracking-wide text-gray-900">
          Welcome back
        </h2>
        <p className="mt-1 text-sm text-gray-500">
          Here's an overview of your festival management.
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {cards.map((card) => (
          <div
            key={card.label}
            className="relative overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm p-5 hover:border-gray-300 transition-all duration-300 group"
          >
            {/* Gradient accent */}
            <div
              className={`absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r ${card.color} opacity-60 group-hover:opacity-100 transition`}
            />
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs tracking-widest uppercase text-gray-500">
                  {card.label}
                </p>
                <p className="mt-2 font-display text-3xl text-gray-900">
                  {card.value}
                </p>
              </div>
              <div className={`${card.iconBg} rounded-lg p-2.5`}>
                <card.icon className={`h-5 w-5 ${card.iconColor}`} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Guests by origin — Morocco vs international, per pack type */}
      {(() => {
        const catOf = (b: Booking) => {
          const p = allPacks.find((x) => x.id === b.packId);
          return packRoomCategory(p?.name ?? b.packName);
        };
        const people = (list: Booking[]) =>
          list.reduce((s, b) => s + (b.numPeople || 1), 0);
        const rowsData = [
          {
            key: "morocco",
            label: "Morocco",
            dot: "bg-emerald-500",
            cls: "text-emerald-700",
          },
          {
            key: "international",
            label: "International (étranger)",
            dot: "bg-blue-500",
            cls: "text-blue-700",
          },
          {
            key: "unknown",
            label: "Not specified",
            dot: "bg-gray-300",
            cls: "text-gray-400",
          },
        ].map((o) => {
          const mine = liveBookings.filter((b) => guestOrigin(b) === o.key);
          return {
            ...o,
            double: people(mine.filter((b) => catOf(b) === "double")),
            single: people(mine.filter((b) => catOf(b) === "single")),
            fullpass: people(mine.filter((b) => catOf(b) === "fullpass")),
            total: people(mine),
          };
        });
        const visible = rowsData.filter((r) => r.key !== "unknown" || r.total > 0);
        return (
          <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
              <h3 className="font-display text-sm tracking-wide text-gray-800">
                Guests by Origin
              </h3>
              <span className="text-xs text-gray-400">
                people · declined excluded
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-[10px] tracking-widest uppercase text-gray-500 border-b border-gray-200">
                    <th className="px-5 py-3">Origin</th>
                    <th className="px-5 py-3 text-right">Double Rooms</th>
                    <th className="px-5 py-3 text-right">Single Rooms</th>
                    <th className="px-5 py-3 text-right">Full Pass</th>
                    <th className="px-5 py-3 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {visible.map((r) => (
                    <tr key={r.key} className="hover:bg-gray-50 transition">
                      <td className={`px-5 py-3 font-medium ${r.cls}`}>
                        <span
                          className={`inline-block h-2 w-2 rounded-full mr-2 align-middle ${r.dot}`}
                        />
                        {r.label}
                      </td>
                      <td className="px-5 py-3 text-right text-gray-800">{r.double}</td>
                      <td className="px-5 py-3 text-right text-gray-800">{r.single}</td>
                      <td className="px-5 py-3 text-right text-gray-800">{r.fullpass}</td>
                      <td className="px-5 py-3 text-right font-semibold text-gray-900">
                        {r.total}
                      </td>
                    </tr>
                  ))}
                  <tr className="border-t border-gray-200 bg-gray-50/60">
                    <td className="px-5 py-3 text-xs tracking-widest uppercase text-gray-500">
                      Total
                    </td>
                    {(["double", "single", "fullpass", "total"] as const).map((k) => (
                      <td key={k} className="px-5 py-3 text-right font-medium text-gray-900">
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
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Link
          to="/admin/packs"
          className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white shadow-sm p-5 hover:border-amber-200 hover:bg-white shadow-sm transition-all duration-300 group"
        >
          <div className="bg-amber-100 rounded-lg p-2.5">
            <Package className="h-5 w-5 text-amber-600" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-gray-800">Manage Packs</p>
            <p className="text-xs text-gray-500">Add, edit or remove packs</p>
          </div>
          <ArrowRight className="h-4 w-4 text-gray-400 group-hover:text-amber-600 transition" />
        </Link>
        <Link
          to="/admin/bookings"
          className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white shadow-sm p-5 hover:border-blue-200 hover:bg-white shadow-sm transition-all duration-300 group"
        >
          <div className="bg-blue-100 rounded-lg p-2.5">
            <Ticket className="h-5 w-5 text-blue-600" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-gray-800">Manage Bookings</p>
            <p className="text-xs text-gray-500">View tickets & statuses</p>
          </div>
          <ArrowRight className="h-4 w-4 text-gray-400 group-hover:text-blue-600 transition" />
        </Link>
        <Link
          to="/admin/invite"
          className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white shadow-sm p-5 hover:border-violet-200 hover:bg-white shadow-sm transition-all duration-300 group"
        >
          <div className="bg-violet-100 rounded-lg p-2.5">
            <TrendingUp className="h-5 w-5 text-violet-600" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-gray-800">Generate Invites</p>
            <p className="text-xs text-gray-500">QR codes & bulk invites</p>
          </div>
          <ArrowRight className="h-4 w-4 text-gray-400 group-hover:text-violet-600 transition" />
        </Link>
      </div>

      {/* Collaborator Leaderboard */}
      {collabStats.length > 0 && (
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
            <h3 className="font-display text-sm tracking-wide text-gray-800">
              Collaborator Sales & Commissions
            </h3>
            <Link
              to="/admin/collaborators"
              className="text-xs text-amber-600 hover:text-amber-700 tracking-widest uppercase transition"
            >
              Manage →
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[10px] tracking-widest uppercase text-gray-500 border-b border-gray-200">
                  <th className="px-5 py-3">Collaborator</th>
                  <th className="px-5 py-3">Code</th>
                  <th className="px-5 py-3 text-right">Single Rooms</th>
                  <th className="px-5 py-3 text-right">Double Rooms</th>
                  <th className="px-5 py-3 text-right">Full Pass</th>
                  <th className="px-5 py-3 text-right">Tickets Sold</th>
                  <th className="px-5 py-3 text-right">Sales</th>
                  <th className="px-5 py-3 text-right">Commission</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {collabStats.map((cs) => (
                  <tr key={cs.collaborator.id} className="hover:bg-gray-50 transition">
                    <td className="px-5 py-3 text-gray-800">{cs.collaborator.name}</td>
                    <td className="px-5 py-3">
                      <span className="font-mono text-xs text-amber-600">
                        {cs.collaborator.code}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-right text-gray-700">{cs.singleRooms}</td>
                    <td className="px-5 py-3 text-right text-gray-700">{cs.doubleRooms}</td>
                    <td className="px-5 py-3 text-right text-gray-700">{cs.fullPass}</td>
                    <td className="px-5 py-3 text-right text-gray-800">{cs.ticketsSold}</td>
                    <td className="px-5 py-3 text-right whitespace-nowrap text-emerald-600">
                      {formatMoneyPair(cs.revenue)}
                    </td>
                    <td className="px-5 py-3 text-right whitespace-nowrap">
                      <span className="text-amber-600">{formatMoneyPair(cs.commission)}</span>
                      <span className="ml-1.5 text-[10px] text-gray-500">
                        ({commissionLabel(cs.collaborator)})
                      </span>
                    </td>
                  </tr>
                ))}
                <tr className="border-t border-gray-300 bg-white shadow-sm">
                  <td className="px-5 py-3 text-xs tracking-widest uppercase text-gray-500" colSpan={2}>
                    Total
                  </td>
                  <td className="px-5 py-3 text-right font-medium text-gray-900">
                    {collabStats.reduce((s, c) => s + c.singleRooms, 0)}
                  </td>
                  <td className="px-5 py-3 text-right font-medium text-gray-900">
                    {collabStats.reduce((s, c) => s + c.doubleRooms, 0)}
                  </td>
                  <td className="px-5 py-3 text-right font-medium text-gray-900">
                    {collabStats.reduce((s, c) => s + c.fullPass, 0)}
                  </td>
                  <td className="px-5 py-3 text-right font-medium text-gray-900">
                    {collabStats.reduce((s, c) => s + c.ticketsSold, 0)}
                  </td>
                  <td className="px-5 py-3 text-right font-medium text-emerald-600 whitespace-nowrap">
                    {formatMoneyPair(collabStats.reduce((s, c) => addMoney(s, c.revenue), emptyMoney()))}
                  </td>
                  <td className="px-5 py-3 text-right font-medium text-amber-600 whitespace-nowrap">
                    {formatMoneyPair(
                      collabStats.reduce((s, c) => addMoney(s, c.commission), emptyMoney())
                    )}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Recent Bookings */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
          <h3 className="font-display text-sm tracking-wide text-gray-800">
            Recent Bookings
          </h3>
          <Link
            to="/admin/bookings"
            className="text-xs text-amber-600 hover:text-amber-700 tracking-widest uppercase transition"
          >
            View all →
          </Link>
        </div>
        {recentBookings.length === 0 ? (
          <div className="px-5 py-12 text-center text-sm text-gray-400">
            No bookings yet. Create one from the{" "}
            <Link to="/admin/bookings" className="text-amber-600 hover:underline">
              Bookings page
            </Link>
            .
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {recentBookings.map((b) => (
              <div
                key={b.id}
                className="flex items-center gap-4 px-5 py-3.5 hover:bg-gray-50 transition"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">
                    {b.customerName}
                  </p>
                  <p className="text-xs text-gray-500 truncate">
                    {b.packName} · {b.ticketCode}
                  </p>
                </div>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-[10px] tracking-widest uppercase font-medium border ${statusStyles[b.status]}`}
                >
                  {b.status}
                </span>
                <span className="text-xs text-gray-400 whitespace-nowrap">
                  {new Date(b.createdAt).toLocaleDateString()}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
