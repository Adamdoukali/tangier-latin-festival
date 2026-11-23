import { createFileRoute, Outlet, Link, useLocation, useNavigate } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Package,
  Ticket,
  QrCode,
  Users,
  Building2,
  Watch,
  Tag,
  Wallet,
  Bus,
  Compass,
  ScrollText,
  ScanLine,
  ArrowLeft,
  Menu,
  X,
  LogOut,
} from "lucide-react";
import { useState, useEffect } from "react";
import {
  clearStaleLocalAdminData,
  getAuthStatus,
  getCurrentAdmin,
  logoutAdmin,
} from "@/lib/auth-store";

export const Route = createFileRoute("/admin")({
  component: AdminLayout,
});

const navItems = [
  { to: "/admin", label: "Tableau de bord", icon: LayoutDashboard, exact: true },
  { to: "/admin/clients", label: "Clients", icon: Users, exact: false },
  { to: "/admin/shuttle", label: "Navettes de transfert", icon: Bus, exact: false },
  { to: "/admin/tourism", label: "Tourisme", icon: Compass, exact: false },
  { to: "/admin/packs", label: "Forfaits", icon: Package, exact: false },
  { to: "/admin/bookings", label: "Réservations", icon: Ticket, exact: false },
  { to: "/admin/payments", label: "Paiements Maroc", icon: Wallet, exact: false },
  { to: "/admin/discounts", label: "Réductions", icon: Tag, exact: false },
  { to: "/admin/invite", label: "Invitations QR", icon: QrCode, exact: false },
  { to: "/admin/collaborators", label: "Collaborateurs", icon: Users, exact: false },
  { to: "/admin/hotel", label: "Hôtel", icon: Building2, exact: false },
  { to: "/admin/bracelets", label: "Bracelets", icon: Watch, exact: false },
  { to: "/admin/logs", label: "Journal d’activité", icon: ScrollText, exact: false },
];

const scannerNavItems = [
  { to: "/admin/scanner", label: "Check-in Entrées", icon: ScanLine, exact: false },
  { to: "/admin/bracelet-scanner", label: "Scanner des Bracelets", icon: Watch, exact: false },
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
  const currentAdmin = mounted ? getCurrentAdmin() : null;

  useEffect(() => {
    clearStaleLocalAdminData();
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
      className="min-h-screen bg-slate-50 text-slate-900 flex notranslate antialiased"
      lang="fr"
      translate="no"
      style={{
        fontFamily:
          "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      }}
    >
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');`}</style>
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-950/60 backdrop-blur-xs lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar — unslop quiet dark graphite chrome */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-[#0a0e17] border-r border-slate-800/80 flex flex-col transition-transform duration-200 lg:sticky lg:top-0 lg:h-screen lg:self-start shrink-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
      >
        {/* Sidebar header */}
        <div className="flex items-center justify-between px-5 h-14 border-b border-slate-800/80 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-slate-800 border border-slate-700/80 grid place-items-center text-white font-semibold text-xs shadow-xs">
              {currentAdmin?.name.trim().charAt(0).toUpperCase() || "T"}
            </div>
            <div className="min-w-0 leading-tight">
              <div className="max-w-36 truncate text-xs font-semibold text-slate-100">
                {currentAdmin?.name || "TLF Admin"}
              </div>
              <div className="text-[11px] text-slate-400 font-normal">
                Administration
              </div>
            </div>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden text-slate-400 hover:text-white transition-colors cursor-pointer p-1 rounded-md"
            aria-label="Fermer le menu"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          <div className="px-2 pt-1 pb-1 text-[11px] font-medium text-slate-400">
            Gestion du festival
          </div>
          {(!currentAdmin
            ? []
            : currentAdmin.role === "scanner"
              ? []
              : navItems
          ).map((item) => {
            const active = isActive(item.to, item.exact);
            return (
              <Link
                key={item.to}
                to={item.to}
                onClick={() => setSidebarOpen(false)}
                className={`h-9 flex items-center gap-2.5 px-2.5 rounded-lg text-xs font-medium transition-colors duration-150 ${
                  active
                    ? "bg-slate-800 text-white border border-slate-700/80 shadow-xs"
                    : "text-slate-400 hover:text-slate-100 hover:bg-slate-800/50 border border-transparent"
                }`}
              >
                <item.icon className={`h-4 w-4 shrink-0 ${active ? "text-slate-100" : "text-slate-400"}`} />
                <span className="truncate">{item.label}</span>
              </Link>
            );
          })}

          <div className="px-2 pt-5 pb-1 text-[11px] font-medium text-slate-400">
            Contrôle d’accès
          </div>
          {scannerNavItems.map((item) => {
            const active = isActive(item.to, item.exact);
            return (
              <Link
                key={item.to}
                to={item.to}
                onClick={() => setSidebarOpen(false)}
                className={`h-9 flex items-center gap-2.5 px-2.5 rounded-lg text-xs font-medium transition-colors duration-150 ${
                  active
                    ? "bg-slate-800 text-white border border-slate-700/80 shadow-xs"
                    : "text-slate-400 hover:text-slate-100 hover:bg-slate-800/50 border border-transparent"
                }`}
              >
                <item.icon className={`h-4 w-4 shrink-0 ${active ? "text-slate-100" : "text-slate-400"}`} />
                <span className="truncate">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Back to site */}
        <div className="px-3 py-3 border-t border-slate-800/80 space-y-1 shrink-0">
          <Link
            to="/"
            className="h-8.5 flex items-center gap-2.5 px-2.5 rounded-lg text-xs font-medium text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 transition-colors"
          >
            <ArrowLeft className="h-4 w-4 shrink-0" />
            Retour au site
          </Link>
          <button
            onClick={() => {
              logoutAdmin();
              navigate({ to: "/admin/login", replace: true });
            }}
            className="w-full h-8.5 flex items-center gap-2.5 px-2.5 rounded-lg text-xs font-medium text-rose-400/90 hover:text-rose-300 hover:bg-rose-950/30 transition-colors cursor-pointer"
          >
            <LogOut className="h-4 w-4 shrink-0" />
            Déconnexion
          </button>
        </div>
      </aside>

      {/* Main content area */}
      <div className="flex-1 flex flex-col min-w-0 bg-slate-50">
        {/* Top bar */}
        <header className="sticky top-0 z-30 h-14 bg-white/85 backdrop-blur-md border-b border-slate-200/80 px-6 flex items-center gap-4 shrink-0">
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden text-slate-600 hover:text-slate-900 transition-colors cursor-pointer p-1 -ml-1 rounded-md"
            aria-label="Ouvrir le menu"
          >
            <Menu className="h-5 w-5" />
          </button>
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400 hidden sm:inline">Administration /</span>
            <h1 className="text-sm font-semibold text-slate-900 tracking-tight">
              {[...navItems, ...scannerNavItems].find((n) => isActive(n.to, n.exact))?.label ?? "Administration"}
            </h1>
          </div>
          {currentAdmin && (
            <div className="ml-auto min-w-0 flex items-center gap-2.5">
              <div className="text-right">
                <p className="truncate text-xs font-medium text-slate-800">{currentAdmin.name}</p>
                <p className="hidden truncate text-[11px] text-slate-400 sm:block">
                  {currentAdmin.email}
                </p>
              </div>
              <div className="h-7 w-7 rounded-full bg-slate-100 border border-slate-200 grid place-items-center text-xs font-medium text-slate-700">
                {currentAdmin.name.trim().charAt(0).toUpperCase()}
              </div>
            </div>
          )}
        </header>

        {/* Page content */}
        <main className="flex-1 p-5 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
