import { createFileRoute, Outlet, Link, useLocation, useNavigate } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Package,
  Ticket,
  QrCode,
  ArrowLeft,
  Menu,
  X,
  LogOut,
} from "lucide-react";
import { useState, useEffect } from "react";
import { getAuthStatus, logoutAdmin } from "@/lib/auth-store";

export const Route = createFileRoute("/admin")({
  component: AdminLayout,
});

const navItems = [
  { to: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { to: "/admin/packs", label: "Packs", icon: Package, exact: false },
  { to: "/admin/bookings", label: "Bookings", icon: Ticket, exact: false },
  { to: "/admin/invite", label: "QR Invites", icon: QrCode, exact: false },
];

function AdminLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  const isLoginPage = location.pathname === "/admin/login";

  useEffect(() => {
    if (!getAuthStatus() && !isLoginPage) {
      navigate({ to: "/admin/login", replace: true });
    }
  }, [navigate, location.pathname, isLoginPage]);

  if (!getAuthStatus() && !isLoginPage) {
    return null; // Prevents flash of admin content before redirect
  }

  if (isLoginPage) {
    return <Outlet />;
  }

  const isActive = (to: string, exact: boolean) => {
    if (exact) return location.pathname === to;
    return location.pathname.startsWith(to);
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-zinc-900/95 backdrop-blur-xl border-r border-zinc-800/60 flex flex-col transition-transform duration-300 lg:relative lg:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Sidebar header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-zinc-800/60">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-amber-500 to-amber-700 grid place-items-center">
              <span className="font-display text-sm text-white font-bold">T</span>
            </div>
            <div className="leading-tight">
              <div className="font-display text-sm tracking-wide text-zinc-100">
                TLF Admin
              </div>
              <div className="text-[10px] tracking-widest text-zinc-500 uppercase">
                Back Office
              </div>
            </div>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden text-zinc-500 hover:text-zinc-300 transition cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          {navItems.map((item) => {
            const active = isActive(item.to, item.exact);
            return (
              <Link
                key={item.to}
                to={item.to}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                  active
                    ? "bg-amber-500/15 text-amber-400 border border-amber-500/20"
                    : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60 border border-transparent"
                }`}
              >
                <item.icon className={`h-4.5 w-4.5 ${active ? "text-amber-400" : ""}`} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Back to site */}
        <div className="px-3 py-4 border-t border-zinc-800/60 space-y-1">
          <Link
            to="/"
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/60 transition"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to website
          </Link>
          <button
            onClick={() => {
              logoutAdmin();
              navigate({ to: "/admin/login", replace: true });
            }}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-red-500/80 hover:text-red-400 hover:bg-red-500/10 transition cursor-pointer"
          >
            <LogOut className="h-4 w-4" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="sticky top-0 z-30 bg-zinc-950/80 backdrop-blur-xl border-b border-zinc-800/60 px-6 py-4 flex items-center gap-4">
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden text-zinc-400 hover:text-zinc-200 transition cursor-pointer"
          >
            <Menu className="h-5 w-5" />
          </button>
          <h1 className="font-display text-lg tracking-wide text-zinc-100">
            {navItems.find((n) =>
              isActive(n.to, n.exact)
            )?.label ?? "Admin"}
          </h1>
        </header>

        {/* Page content */}
        <main className="flex-1 p-6 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
