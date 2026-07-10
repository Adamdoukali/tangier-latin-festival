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
    <div
      className="min-h-screen bg-slate-100 flex flex-col"
      style={{ fontFamily: "'Poppins','Segoe UI',system-ui,sans-serif" }}
    >
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap');`}</style>

      {/* Banner — swap for a custom image anytime */}
      <div className="w-full bg-[#13234d] bg-gradient-to-r from-[#0d1a3d] via-[#13234d] to-[#1d3a7a] py-10 px-6 text-center shadow-md">
        <p className="text-amber-400 text-xs tracking-[0.4em] uppercase">
          Tangier International
        </p>
        <h1 className="mt-1 text-white text-3xl md:text-4xl font-bold tracking-wide">
          LATIN FESTIVAL
        </h1>
        <p className="mt-2 text-slate-300 text-sm">
          January 07–11, 2027 · Kenzi Solazur Hotel, Tangier —{" "}
          <span className="text-amber-300 font-semibold">Admin Portal</span>
        </p>
      </div>

      <div className="flex-1 flex items-start justify-center px-4 pt-14 pb-10">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-lg shadow-lg overflow-hidden border border-gray-200">
            {/* Card header */}
            <div className="bg-[#333a45] px-6 py-4 text-center">
              <h2 className="text-white text-lg font-semibold">Admin Login</h2>
            </div>

            <form onSubmit={handleLogin} className="p-8 space-y-5">
              <p className="text-center text-sm font-semibold text-gray-700">
                Please enter your admin credentials
              </p>
              {error && (
                <div className="p-3 rounded-md bg-red-50 border border-red-200 text-red-600 text-sm text-center">
                  {error}
                </div>
              )}
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                  <Mail className="h-5 w-5" />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-white border border-gray-300 rounded-md py-3 pl-11 pr-4 text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all"
                  placeholder="Email Address"
                />
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                  <Lock className="h-5 w-5" />
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-white border border-gray-300 rounded-md py-3 pl-11 pr-4 text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all"
                  placeholder="Password"
                />
              </div>

              <div className="pt-2 text-center">
                <button
                  type="submit"
                  className="inline-flex items-center justify-center gap-2 bg-[#c8102e] hover:bg-[#a60d26] text-white rounded-md px-10 py-3 font-semibold shadow transition-all group cursor-pointer"
                >
                  Admin Login
                  <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                </button>
              </div>
            </form>
          </div>
          <p className="mt-6 text-center text-xs text-gray-400">
            tangierlatinfestival.com · contact@tangierlatinfestival.com
          </p>
        </div>
      </div>
    </div>
  );
}
