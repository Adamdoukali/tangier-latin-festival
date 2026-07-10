import { createFileRoute, Outlet, Link, useLocation, useNavigate } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Package,
  Ticket,
  QrCode,
  Users,
  Building2,
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
  { to: "/admin/collaborators", label: "Collaborators", icon: Users, exact: false },
  { to: "/admin/hotel", label: "Hotel", icon: Building2, exact: false },
];

function AdminLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  // Auth lives in localStorage, so the server always renders "logged out".
  // Render nothing until mounted so the client's first paint matches the
  // server and React doesn't log a hydration mismatch on every admin load.
  const [mounted, setMounted] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  const isLoginPage = location.pathname === "/admin/login";

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted && !getAuthStatus() && !isLoginPage) {
      navigate({ to: "/admin/login", replace: true });
    }
  }, [mounted, navigate, location.pathname, isLoginPage]);

  if (!mounted) return null;

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
    // translate="no": browser auto-translate rewrites React's DOM and used to
    // crash the panel; the back office is internal, so opt out entirely.
    <div
      className="min-h-screen bg-slate-100 text-gray-900 flex notranslate"
      translate="no"
      style={{ fontFamily: "'Poppins','Segoe UI',system-ui,sans-serif" }}
    >
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap');`}</style>
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar — classic navy like the exhibitor portals */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-[#13234d] flex flex-col transition-transform duration-300 lg:relative lg:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Sidebar header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-amber-400 to-amber-600 grid place-items-center">
              <span className="font-display text-sm text-white font-bold">T</span>
            </div>
            <div className="leading-tight">
              <div className="font-display text-sm tracking-wide text-white">
                TLF Admin
              </div>
              <div className="text-[10px] tracking-widest text-slate-400 uppercase">
                Back Office
              </div>
            </div>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden text-slate-400 hover:text-white transition cursor-pointer"
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
                    ? "bg-white/10 text-amber-300 border border-amber-400/30"
                    : "text-slate-300 hover:text-white hover:bg-white/5 border border-transparent"
                }`}
              >
                <item.icon className={`h-4.5 w-4.5 ${active ? "text-amber-300" : ""}`} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Back to site */}
        <div className="px-3 py-4 border-t border-white/10 space-y-1">
          <Link
            to="/"
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-slate-400 hover:text-white hover:bg-white/5 transition"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to website
          </Link>
          <button
            onClick={() => {
              logoutAdmin();
              navigate({ to: "/admin/login", replace: true });
            }}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-red-300 hover:text-red-200 hover:bg-red-500/10 transition cursor-pointer"
          >
            <LogOut className="h-4 w-4" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-xl border-b border-gray-200 px-6 py-4 flex items-center gap-4">
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden text-gray-600 hover:text-gray-800 transition cursor-pointer"
          >
            <Menu className="h-5 w-5" />
          </button>
          <h1 className="font-display text-lg tracking-wide text-gray-900">
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
