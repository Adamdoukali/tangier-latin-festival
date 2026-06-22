import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import {
  Ticket,
  Package,
  DollarSign,
  Clock,
  CheckCircle2,
  UserCheck,
  TrendingUp,
  ArrowRight,
} from "lucide-react";
import { getStats, getBookings, type Booking } from "@/lib/admin-store";

export const Route = createFileRoute("/admin/")({
  component: AdminDashboard,
});

function AdminDashboard() {
  const [stats, setStats] = useState({
    totalBookings: 0,
    pendingBookings: 0,
    confirmedBookings: 0,
    checkedIn: 0,
    totalRevenue: 0,
    totalPacks: 0,
    activePacks: 0,
  });
  const [recentBookings, setRecentBookings] = useState<Booking[]>([]);

  useEffect(() => {
    setStats(getStats());
    setRecentBookings(
      getBookings()
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 5)
    );
  }, []);

  const cards = [
    {
      label: "Total Bookings",
      value: stats.totalBookings,
      icon: Ticket,
      color: "from-blue-500 to-blue-700",
      iconBg: "bg-blue-500/15",
      iconColor: "text-blue-400",
    },
    {
      label: "Revenue (MAD)",
      value: stats.totalRevenue.toLocaleString(),
      icon: DollarSign,
      color: "from-emerald-500 to-emerald-700",
      iconBg: "bg-emerald-500/15",
      iconColor: "text-emerald-400",
    },
    {
      label: "Pending",
      value: stats.pendingBookings,
      icon: Clock,
      color: "from-amber-500 to-amber-700",
      iconBg: "bg-amber-500/15",
      iconColor: "text-amber-400",
    },
    {
      label: "Confirmed",
      value: stats.confirmedBookings,
      icon: CheckCircle2,
      color: "from-violet-500 to-violet-700",
      iconBg: "bg-violet-500/15",
      iconColor: "text-violet-400",
    },
    {
      label: "Checked In",
      value: stats.checkedIn,
      icon: UserCheck,
      color: "from-cyan-500 to-cyan-700",
      iconBg: "bg-cyan-500/15",
      iconColor: "text-cyan-400",
    },
    {
      label: "Active Packs",
      value: stats.activePacks,
      icon: Package,
      color: "from-pink-500 to-pink-700",
      iconBg: "bg-pink-500/15",
      iconColor: "text-pink-400",
    },
  ];

  const statusStyles: Record<string, string> = {
    pending: "bg-amber-500/15 text-amber-400 border-amber-500/20",
    confirmed: "bg-emerald-500/15 text-emerald-400 border-emerald-500/20",
    "checked-in": "bg-cyan-500/15 text-cyan-400 border-cyan-500/20",
  };

  return (
    <div className="space-y-8">
      {/* Welcome */}
      <div>
        <h2 className="font-display text-2xl tracking-wide text-zinc-100">
          Welcome back
        </h2>
        <p className="mt-1 text-sm text-zinc-500">
          Here's an overview of your festival management.
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {cards.map((card) => (
          <div
            key={card.label}
            className="relative overflow-hidden rounded-xl border border-zinc-800/60 bg-zinc-900/50 p-5 hover:border-zinc-700/60 transition-all duration-300 group"
          >
            {/* Gradient accent */}
            <div
              className={`absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r ${card.color} opacity-60 group-hover:opacity-100 transition`}
            />
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs tracking-widest uppercase text-zinc-500">
                  {card.label}
                </p>
                <p className="mt-2 font-display text-3xl text-zinc-100">
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

      {/* Quick Actions */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Link
          to="/admin/packs"
          className="flex items-center gap-3 rounded-xl border border-zinc-800/60 bg-zinc-900/50 p-5 hover:border-amber-500/30 hover:bg-zinc-900/80 transition-all duration-300 group"
        >
          <div className="bg-amber-500/15 rounded-lg p-2.5">
            <Package className="h-5 w-5 text-amber-400" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-zinc-200">Manage Packs</p>
            <p className="text-xs text-zinc-500">Add, edit or remove packs</p>
          </div>
          <ArrowRight className="h-4 w-4 text-zinc-600 group-hover:text-amber-400 transition" />
        </Link>
        <Link
          to="/admin/bookings"
          className="flex items-center gap-3 rounded-xl border border-zinc-800/60 bg-zinc-900/50 p-5 hover:border-blue-500/30 hover:bg-zinc-900/80 transition-all duration-300 group"
        >
          <div className="bg-blue-500/15 rounded-lg p-2.5">
            <Ticket className="h-5 w-5 text-blue-400" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-zinc-200">Manage Bookings</p>
            <p className="text-xs text-zinc-500">View tickets & statuses</p>
          </div>
          <ArrowRight className="h-4 w-4 text-zinc-600 group-hover:text-blue-400 transition" />
        </Link>
        <Link
          to="/admin/invite"
          className="flex items-center gap-3 rounded-xl border border-zinc-800/60 bg-zinc-900/50 p-5 hover:border-violet-500/30 hover:bg-zinc-900/80 transition-all duration-300 group"
        >
          <div className="bg-violet-500/15 rounded-lg p-2.5">
            <TrendingUp className="h-5 w-5 text-violet-400" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-zinc-200">Generate Invites</p>
            <p className="text-xs text-zinc-500">QR codes & bulk invites</p>
          </div>
          <ArrowRight className="h-4 w-4 text-zinc-600 group-hover:text-violet-400 transition" />
        </Link>
      </div>

      {/* Recent Bookings */}
      <div className="rounded-xl border border-zinc-800/60 bg-zinc-900/50 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800/60">
          <h3 className="font-display text-sm tracking-wide text-zinc-200">
            Recent Bookings
          </h3>
          <Link
            to="/admin/bookings"
            className="text-xs text-amber-400 hover:text-amber-300 tracking-widest uppercase transition"
          >
            View all →
          </Link>
        </div>
        {recentBookings.length === 0 ? (
          <div className="px-5 py-12 text-center text-sm text-zinc-600">
            No bookings yet. Create one from the{" "}
            <Link to="/admin/bookings" className="text-amber-400 hover:underline">
              Bookings page
            </Link>
            .
          </div>
        ) : (
          <div className="divide-y divide-zinc-800/40">
            {recentBookings.map((b) => (
              <div
                key={b.id}
                className="flex items-center gap-4 px-5 py-3.5 hover:bg-zinc-800/30 transition"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-zinc-200 truncate">
                    {b.customerName}
                  </p>
                  <p className="text-xs text-zinc-500 truncate">
                    {b.packName} · {b.ticketCode}
                  </p>
                </div>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-[10px] tracking-widest uppercase font-medium border ${statusStyles[b.status]}`}
                >
                  {b.status}
                </span>
                <span className="text-xs text-zinc-600 whitespace-nowrap">
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
