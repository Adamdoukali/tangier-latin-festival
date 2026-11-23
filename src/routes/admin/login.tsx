import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { Lock, Mail, ArrowRight } from "lucide-react";
import { loginAdmin, getAuthStatus, getCurrentAdmin } from "@/lib/auth-store";

export const Route = createFileRoute("/admin/login")({
  component: AdminLogin,
});

function AdminLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();

  // If already logged in, redirect away from login page
  useEffect(() => {
    if (getAuthStatus()) {
      const admin = getCurrentAdmin();
      if (admin?.role === "scanner") {
        navigate({ to: "/admin/scanner" });
      } else {
        navigate({ to: "/admin" });
      }
    }
  }, [navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const success = await loginAdmin(email, password);
      if (success) {
        const admin = getCurrentAdmin();
        if (admin?.role === "scanner") {
          navigate({ to: "/admin/scanner" });
        } else {
          navigate({ to: "/admin" });
        }
      } else {
        setError("E-mail ou mot de passe incorrect. Veuillez réessayer.");
      }
    } catch {
      setError("Connexion à l’administration impossible. Veuillez réessayer.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="min-h-screen bg-slate-50 flex flex-col justify-center items-center px-4 py-12 antialiased"
      lang="fr"
      style={{
        fontFamily:
          "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      }}
    >
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');`}</style>

      <div className="w-full max-w-sm">
        {/* Brand header */}
        <div className="text-center mb-8">
          <div className="h-10 w-10 mx-auto rounded-xl bg-slate-900 border border-slate-800 text-white font-semibold text-sm grid place-items-center shadow-xs">
            TLF
          </div>
          <h1 className="mt-3 text-lg font-semibold tracking-tight text-slate-900">
            Tangier Latin Festival
          </h1>
          <p className="mt-1 text-xs text-slate-500">
            Portail d'administration et de gestion
          </p>
        </div>

        {/* Login card */}
        <div className="bg-white rounded-xl shadow-xs border border-slate-200/80 p-6 sm:p-7">
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <h2 className="text-sm font-semibold text-slate-900">Connexion</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Saisissez vos identifiants administrateur
              </p>
            </div>

            {error && (
              <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs text-center font-medium">
                {error}
              </div>
            )}

            <div className="space-y-3 pt-1">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Adresse e-mail
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Mail className="h-4 w-4" />
                  </div>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-white border border-slate-200/80 rounded-lg py-2 pl-9 pr-3 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-slate-400 shadow-xs transition-colors"
                    placeholder="admin@tangierlatinfestival.com"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Mot de passe
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Lock className="h-4 w-4" />
                  </div>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-white border border-slate-200/80 rounded-lg py-2 pl-9 pr-3 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-slate-400 shadow-xs transition-colors"
                    placeholder="••••••••"
                  />
                </div>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={submitting}
                className="w-full inline-flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg py-2.5 px-4 text-xs font-medium shadow-xs transition-colors cursor-pointer disabled:opacity-60"
              >
                {submitting ? "Connexion…" : "Se connecter"}
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </form>
        </div>

        <p className="mt-6 text-center text-[11px] text-slate-400">
          Tangier Latin Festival · Accès restreint
        </p>
      </div>
    </div>
  );
}
