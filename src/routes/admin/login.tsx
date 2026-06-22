import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { Lock, Mail, ArrowRight } from "lucide-react";
import { loginAdmin, getAuthStatus } from "@/lib/auth-store";

export const Route = createFileRoute("/admin/login")({
  component: AdminLogin,
});

function AdminLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  // If already logged in, redirect away from login page
  useEffect(() => {
    if (getAuthStatus()) {
      navigate({ to: "/admin" });
    }
  }, [navigate]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const success = loginAdmin(email, password);
    if (success) {
      navigate({ to: "/admin" });
    } else {
      setError("Invalid email or password. Please try again.");
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Background styling */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-amber-900/20 via-zinc-950 to-zinc-950 pointer-events-none" />

      <div className="w-full max-w-md relative z-10">
        <div className="text-center mb-10">
          <div className="h-16 w-16 mx-auto rounded-2xl bg-gradient-to-br from-amber-500 to-amber-700 grid place-items-center shadow-[0_0_40px_-10px_rgba(245,158,11,0.5)] mb-6">
            <Lock className="h-8 w-8 text-white" />
          </div>
          <h1 className="font-display text-3xl text-zinc-100 tracking-wide">
            Admin Access
          </h1>
          <p className="text-zinc-500 mt-2 text-sm">
            Enter your credentials to manage the festival.
          </p>
        </div>

        <div className="bg-zinc-900/80 backdrop-blur-xl border border-zinc-800/60 p-8 rounded-3xl shadow-2xl">
          <form onSubmit={handleLogin} className="space-y-5">
            {error && (
              <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm text-center">
                {error}
              </div>
            )}
            <div>
              <label className="block text-xs font-semibold tracking-wider text-zinc-400 uppercase mb-2">
                Email Address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-500">
                  <Mail className="h-5 w-5" />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-zinc-950/50 border border-zinc-800 rounded-xl py-3 pl-11 pr-4 text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/50 transition-all"
                  placeholder="admin@tangierlatinfestival.com"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold tracking-wider text-zinc-400 uppercase mb-2">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-500">
                  <Lock className="h-5 w-5" />
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-zinc-950/50 border border-zinc-800 rounded-xl py-3 pl-11 pr-4 text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/50 transition-all"
                  placeholder="••••••••••••"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full bg-amber-600 hover:bg-amber-500 text-white rounded-xl py-3.5 font-medium shadow-lg shadow-amber-900/20 transition-all flex items-center justify-center gap-2 group mt-2"
            >
              Sign In
              <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
