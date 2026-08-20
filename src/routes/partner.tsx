import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect, useCallback } from "react";
import QRCode from "qrcode";
import {
  Ticket,
  QrCode,
  Copy,
  CheckCircle2,
  LogOut,
  Lock,
  Users,
  Sparkles,
  Mail,
  Phone,
  Euro,
  Trophy,
  Compass,
  MapPin,
  ExternalLink,
  Bus,
  Plane,
  Ship,
  Calendar,
  Clock,
  ChevronDown,
  ChevronUp,
  Info,
  Bed,
  Moon,
  Eye,
  Search,
  Filter,
  Tag,
  TrendingUp,
  Building2,
} from "lucide-react";
import {
  partnerLogin,
  requestPasswordReset,
  resetPartnerPassword,
  getPacks,
  getBookings,
  getDiscountCodes,
  updateBookingStatus,
  collaboratorRevenue,
  collaboratorCommission,
  collaboratorTourismCommission,
  collaboratorFestivalCommission,
  collaboratorTourismRevenue,
  isTourismBooking,
  getTourismPrice,
  commissionLabel,
  formatMoney,
  formatForPartner,
  emptyMoney,
  type Money,
  packLabel,
  ticketUrl,
  partnerShareLink,
  partnerTourismShareLink,
  packRoomCategory,
  formatTransferOptionLabel,
  type Collaborator,
  type Pack,
  type Booking,
  type BookingStatus,
  type DiscountCode,
  type TransferType,
  type TransferOption,
  createPartnerAccount,
  normalizePhone,
} from "@/lib/admin-store";
import {
  savePartnerSession,
  clearPartnerSession,
  restorePartnerSession,
} from "@/lib/partner-auth";
import { sendFormNotification, ticketConfirmationEmail } from "@/lib/form-notify";
import { translateDynamicText, type Language } from "@/lib/translations";

export const Route = createFileRoute("/partner")({
  head: () => ({
    meta: [{ title: "Partner Portal — Tangier International Latin Festival" }],
  }),
  component: PartnerPortal,
});

// Short shareable link (tickets.tangierlatinfestival.com/CODE); the /book
// page applies the partner's language automatically.
function getBookingUrl(code: string, lang?: string): string {
  return partnerShareLink(code, lang);
}

function getTourismBookingUrl(code: string, lang?: string): string {
  return partnerTourismShareLink(code, lang);
}

function PartnerPortal() {
  const [checking, setChecking] = useState(true);
  const [partner, setPartner] = useState<Collaborator | null>(null);
  const [resetToken, setResetToken] = useState<string | null>(null);
  const [view, setView] = useState<"login" | "forgot" | "reset" | "signup">("login");
  const [lang, setLang] = useState<"en" | "fr" | "es">("en");

  useEffect(() => {
    if (typeof window !== "undefined") {
      const urlParams = new URLSearchParams(window.location.search);
      const token = urlParams.get("resetToken");
      const l = urlParams.get("lang")?.toLowerCase();
      if (l === "fr" || l === "es" || l === "en") {
        setLang(l);
      }
      if (token) {
        setResetToken(token);
        setView("reset");
      }
    }
    restorePartnerSession().then((c) => {
      setPartner(c);
      setChecking(false);
    });
  }, []);

  if (checking) {
    return (
      <div className="min-h-screen bg-slate-100 grid place-items-center">
        <p className="text-sm text-gray-400 tracking-widest uppercase">Loading…</p>
      </div>
    );
  }

  if (partner) {
    return <Portal partner={{ ...partner, language: partner.language ?? lang }} onSignOut={() => setPartner(null)} />;
  }

  if (view === "reset" && resetToken) {
    return (
      <SetPasswordScreen
        token={resetToken}
        lang={lang}
        setLang={setLang}
        onSuccess={() => {
          if (typeof window !== "undefined") {
            window.history.replaceState({}, document.title, window.location.pathname);
          }
          setView("login");
        }}
        onBackToLogin={() => setView("login")}
      />
    );
  }

  if (view === "forgot") {
    return <RequestResetScreen lang={lang} setLang={setLang} onBackToLogin={() => setView("login")} />;
  }

  if (view === "signup") {
    return <SignUpScreen lang={lang} setLang={setLang} onSuccess={() => setView("login")} onCancel={() => setView("login")} />;
  }

  return (
    <LoginScreen
      lang={lang}
      setLang={setLang}
      onLogin={(c) => setPartner(c)}
      onForgotPassword={() => setView("forgot")}
      onSignup={() => setView("signup")}
    />
  );
}

// ─── Login ────────────────────────────────────────────────────────────

function AuthLangSwitcher({
  lang,
  setLang,
}: {
  lang: "en" | "fr" | "es";
  setLang: (l: "en" | "fr" | "es") => void;
}) {
  const flags = [
    { code: "en", label: "EN", flag: "https://flagcdn.com/us.svg" },
    { code: "fr", label: "FR", flag: "https://flagcdn.com/fr.svg" },
    { code: "es", label: "ES", flag: "https://flagcdn.com/es.svg" },
  ] as const;

  return (
    <div className="flex items-center justify-center gap-2 mt-3">
      {flags.map((f) => (
        <button
          key={f.code}
          type="button"
          onClick={() => setLang(f.code)}
          className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold transition cursor-pointer border ${
            lang === f.code
              ? "bg-amber-400/20 text-amber-300 border-amber-400/50 shadow-sm"
              : "bg-white/10 text-slate-300 border-transparent hover:bg-white/20"
          }`}
        >
          <img src={f.flag} alt={f.label} className="w-3.5 h-3.5 rounded-full object-cover" />
          <span>{f.label}</span>
        </button>
      ))}
    </div>
  );
}

// ─── Login ────────────────────────────────────────────────────────────

function LoginScreen({
  lang,
  setLang,
  onLogin,
  onForgotPassword,
  onSignup,
}: {
  lang: "en" | "fr" | "es";
  setLang: (l: "en" | "fr" | "es") => void;
  onLogin: (c: Collaborator) => void;
  onForgotPassword: () => void;
  onSignup: () => void;
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const tr = (en: string, fr: string, es: string) =>
    lang === "fr" ? fr : lang === "es" ? es : en;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    const result = await partnerLogin(email, password);
    if (result.success) {
      savePartnerSession(email.trim().toLowerCase(), password.trim());
      onLogin(result.collaborator);
    } else {
      setError(result.error);
    }
    setBusy(false);
  };

  return (
    <div
      className="min-h-screen bg-slate-100 flex flex-col"
      style={{ fontFamily: "'Poppins','Segoe UI',system-ui,sans-serif" }}
    >
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap');`}</style>

      {/* Banner */}
      <div className="w-full bg-[#13234d] bg-gradient-to-r from-[#0d1a3d] via-[#13234d] to-[#1d3a7a] py-8 px-6 text-center shadow-md">
        <p className="text-amber-400 text-xs tracking-[0.4em] uppercase">
          Tangier International
        </p>
        <h1 className="mt-1 text-white text-3xl md:text-4xl font-bold tracking-wide">
          LATIN FESTIVAL
        </h1>
        <p className="mt-2 text-slate-300 text-sm">
          January 07–11, 2027 · Kenzi Solazur Hotel, Tangier —{" "}
          <span className="text-amber-300 font-semibold">
            {tr("Partner Portal", "Espace Partenaire", "Área Colaboradores")}
          </span>
        </p>

        {/* Language Switcher */}
        <AuthLangSwitcher lang={lang} setLang={setLang} />
      </div>

      <div className="flex-1 flex items-start justify-center px-4 pt-10 pb-10">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-lg shadow-lg overflow-hidden border border-gray-200">
            {/* Card header */}
            <div className="bg-[#333a45] px-6 py-4 text-center">
              <h2 className="text-white text-lg font-semibold">
                {tr("Partner Login", "Connexion Partenaire", "Inicio de Sesión Colaborador")}
              </h2>
            </div>

            <form onSubmit={handleSubmit} className="p-8 space-y-5">
              <p className="text-center text-sm font-semibold text-gray-700">
                {tr(
                  "Please enter your registered email and password",
                  "Veuillez entrer votre e-mail enregistré et votre mot de passe",
                  "Por favor, introduce tu correo electrónico registrado y contraseña"
                )}
              </p>
              {error && (
                <div className="p-3.5 rounded-md bg-red-50 border border-red-200 text-red-700 text-sm text-center font-medium leading-relaxed">
                  {error}
                </div>
              )}
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                required
                placeholder={tr("Partner Email", "E-mail Partenaire", "Correo del Colaborador")}
                className="w-full rounded-md border border-gray-300 bg-white px-4 py-3 text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all"
              />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
                placeholder={tr("Password", "Mot de passe", "Contraseña")}
                className="w-full rounded-md border border-gray-300 bg-white px-4 py-3 text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all"
              />
              <div className="flex items-center justify-end">
                <button
                  type="button"
                  onClick={onForgotPassword}
                  className="text-xs font-semibold text-blue-600 hover:text-blue-800 transition cursor-pointer"
                >
                  {tr("Forgot Password?", "Mot de passe oublié ?", "¿Olvidaste la contraseña?")}
                </button>
              </div>
              <div className="pt-2 text-center">
                <button
                  type="submit"
                  disabled={busy}
                  className="inline-flex items-center justify-center gap-2 bg-[#c8102e] hover:bg-[#a60d26] text-white rounded-md px-10 py-3 font-semibold shadow transition-all cursor-pointer disabled:opacity-50 w-full"
                >
                  <Lock className="h-4 w-4" />{" "}
                  {busy
                    ? tr("Signing in…", "Connexion…", "Iniciando sesión…")
                    : tr("Partner Login", "Se connecter", "Iniciar Sesión")}
                </button>
              </div>
            </form>
          </div>
          <div className="mt-6 text-center">
            <Link to={lang && lang !== "en" ? `/?lang=${lang}` : "/"} className="text-xs text-gray-400 hover:text-gray-600 transition">
              ← {tr("Back to the festival website", "Retour au site du festival", "Volver al sitio web del festival")}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Request Password Reset ───────────────────────────────────────────

function RequestResetScreen({
  lang,
  setLang,
  onBackToLogin,
}: {
  lang: "en" | "fr" | "es";
  setLang: (l: "en" | "fr" | "es") => void;
  onBackToLogin: () => void;
}) {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const tr = (en: string, fr: string, es: string) =>
    lang === "fr" ? fr : lang === "es" ? es : en;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    const res = await requestPasswordReset(email, lang);
    setBusy(false);
    if (res.success) {
      setSent(true);
    } else {
      setError(
        res.error ||
          tr(
            "Failed to send password setup email.",
            "Échec de l'envoi de l'e-mail de réinitialisation.",
            "Error al enviar el correo de restablecimiento."
          )
      );
    }
  };

  return (
    <div
      className="min-h-screen bg-slate-100 flex flex-col"
      style={{ fontFamily: "'Poppins','Segoe UI',system-ui,sans-serif" }}
    >
      <div className="w-full bg-[#13234d] py-8 px-6 text-center shadow-md">
        <h1 className="text-white text-3xl font-bold tracking-wide">
          {tr("Set / Reset Password", "Créer / Réinitialiser le mot de passe", "Establecer / Restablecer Contraseña")}
        </h1>
        <AuthLangSwitcher lang={lang} setLang={setLang} />
      </div>

      <div className="flex-1 flex items-start justify-center px-4 pt-10 pb-10">
        <div className="w-full max-w-md bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden">
          <div className="bg-[#333a45] px-6 py-4 text-center">
            <h2 className="text-white text-lg font-semibold">
              {tr("Password Setup", "Configuration du mot de passe", "Configuración de contraseña")}
            </h2>
          </div>

          <div className="p-8">
            {sent ? (
              <div className="text-center space-y-4">
                <CheckCircle2 className="h-12 w-12 text-emerald-500 mx-auto" />
                <h3 className="text-lg font-semibold text-gray-800">
                  {tr("Email Sent!", "E-mail envoyé !", "¡Correo enviado!")}
                </h3>
                <p className="text-sm text-gray-600">
                  {tr(
                    `If an account exists for ${email}, we have emailed you a link to create or reset your password.`,
                    `Si un compte existe pour ${email}, nous vous avons envoyé par e-mail un lien pour créer ou réinitialiser votre mot de passe.`,
                    `Si existe una cuenta para ${email}, te hemos enviado un enlace para crear o restablecer tu contraseña.`
                  )}
                </p>
                <button
                  onClick={onBackToLogin}
                  className="mt-4 bg-[#13234d] text-white px-6 py-2.5 rounded-md text-sm font-semibold hover:bg-slate-800 transition cursor-pointer"
                >
                  {tr("Return to Login", "Retour à la connexion", "Volver al inicio de sesión")}
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5">
                <p className="text-sm text-gray-600 text-center">
                  {tr(
                    "Enter your registered partner email to receive a password creation or reset link.",
                    "Entrez votre adresse e-mail partenaire enregistrée pour recevoir un lien de création ou de réinitialisation de mot de passe.",
                    "Introduce tu correo electrónico registrado de colaborador para recibir un enlace de creación o restablecimiento de contraseña."
                  )}
                </p>
                {error && (
                  <div className="p-3 rounded-md bg-red-50 border border-red-200 text-red-600 text-sm text-center">
                    {error}
                  </div>
                )}
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder={tr("Partner Email", "E-mail Partenaire", "Correo del Colaborador")}
                  className="w-full rounded-md border border-gray-300 bg-white px-4 py-3 text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all"
                />
                <button
                  type="submit"
                  disabled={busy}
                  className="w-full bg-[#c8102e] hover:bg-[#a60d26] text-white rounded-md py-3 font-semibold shadow transition-all cursor-pointer disabled:opacity-50"
                >
                  {busy
                    ? tr("Sending link…", "Envoi en cours…", "Enviando enlace…")
                    : tr("Send Password Setup Email", "Envoyer le lien de réinitialisation", "Enviar correo de restablecimiento")}
                </button>
                <div className="text-center pt-2">
                  <button
                    type="button"
                    onClick={onBackToLogin}
                    className="text-xs text-gray-500 hover:text-gray-700 transition cursor-pointer"
                  >
                    ← {tr("Back to Login", "Retour à la connexion", "Volver al inicio de sesión")}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Set New Password ──────────────────────────────────────────────────

function SetPasswordScreen({
  token,
  lang,
  setLang,
  onSuccess,
  onBackToLogin,
}: {
  token: string;
  lang: "en" | "fr" | "es";
  setLang: (l: "en" | "fr" | "es") => void;
  onSuccess: () => void;
  onBackToLogin: () => void;
}) {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [busy, setBusy] = useState(false);

  const tr = (en: string, fr: string, es: string) =>
    lang === "fr" ? fr : lang === "es" ? es : en;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setError(tr("Passwords do not match.", "Les mots de passe ne correspondent pas.", "Las contraseñas no coinciden."));
      return;
    }
    setBusy(true);
    setError("");
    const res = await resetPartnerPassword(token, newPassword);
    setBusy(false);
    if (res.success) {
      setSuccess(true);
      setTimeout(() => {
        onSuccess();
      }, 2000);
    } else {
      setError(
        res.error ||
          tr(
            "Failed to reset password.",
            "Échec de la réinitialisation du mot de passe.",
            "Error al restablecer la contraseña."
          )
      );
    }
  };

  return (
    <div
      className="min-h-screen bg-slate-100 flex flex-col"
      style={{ fontFamily: "'Poppins','Segoe UI',system-ui,sans-serif" }}
    >
      <div className="w-full bg-[#13234d] py-8 px-6 text-center shadow-md">
        <h1 className="text-white text-3xl font-bold tracking-wide">
          {tr("Create Password", "Créer un mot de passe", "Crear Contraseña")}
        </h1>
        <AuthLangSwitcher lang={lang} setLang={setLang} />
      </div>

      <div className="flex-1 flex items-start justify-center px-4 pt-10 pb-10">
        <div className="w-full max-w-md bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden">
          <div className="bg-[#333a45] px-6 py-4 text-center">
            <h2 className="text-white text-lg font-semibold">
              {tr("Set Your Password", "Définissez votre mot de passe", "Establece tu contraseña")}
            </h2>
          </div>

          <div className="p-8">
            {success ? (
              <div className="text-center space-y-4">
                <CheckCircle2 className="h-12 w-12 text-emerald-500 mx-auto" />
                <h3 className="text-lg font-semibold text-gray-800">
                  {tr("Password Updated!", "Mot de passe mis à jour !", "¡Contraseña actualizada!")}
                </h3>
                <p className="text-sm text-gray-600">
                  {tr(
                    "Your password has been saved. Redirecting to login…",
                    "Votre mot de passe a été enregistré. Redirection vers la connexion…",
                    "Tu contraseña ha sido guardada. Redirigiendo al inicio de sesión…"
                  )}
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5">
                <p className="text-sm text-gray-600 text-center">
                  {tr(
                    "Please choose a password for your Partner Portal account (min 6 characters).",
                    "Veuillez choisir un mot de passe pour votre compte Partenaire (min 6 caractères).",
                    "Por favor, elige una contraseña para tu cuenta de Colaborador (mínimo 6 caracteres)."
                  )}
                </p>
                {error && (
                  <div className="p-3 rounded-md bg-red-50 border border-red-200 text-red-600 text-sm text-center">
                    {error}
                  </div>
                )}
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  minLength={6}
                  placeholder={tr("New Password", "Nouveau mot de passe", "Nueva contraseña")}
                  className="w-full rounded-md border border-gray-300 bg-white px-4 py-3 text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all"
                />
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  minLength={6}
                  placeholder={tr("Confirm New Password", "Confirmer le mot de passe", "Confirmar nueva contraseña")}
                  className="w-full rounded-md border border-gray-300 bg-white px-4 py-3 text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all"
                />
                <button
                  type="submit"
                  disabled={busy}
                  className="w-full bg-[#c8102e] hover:bg-[#a60d26] text-white rounded-md py-3 font-semibold shadow transition-all cursor-pointer disabled:opacity-50"
                >
                  {busy
                    ? tr("Saving password…", "Enregistrement…", "Guardando contraseña…")
                    : tr("Set Password", "Enregistrer le mot de passe", "Establecer contraseña")}
                </button>
                <div className="text-center pt-2">
                  <button
                    type="button"
                    onClick={onBackToLogin}
                    className="text-xs text-gray-500 hover:text-gray-700 transition cursor-pointer"
                  >
                    ← {tr("Back to Login", "Retour à la connexion", "Volver al inicio de sesión")}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function SignUpScreen({
  lang,
  setLang,
  onSuccess,
  onCancel,
}: {
  lang: "en" | "fr" | "es";
  setLang: (l: "en" | "fr" | "es") => void;
  onSuccess: () => void;
  onCancel: () => void;
}) {
  const [email, setEmail] = useState("");
  const [brandName, setBrandName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [busy, setBusy] = useState(false);

  const tr = (en: string, fr: string, es: string) =>
    lang === "fr" ? fr : lang === "es" ? es : en;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    const result = await createPartnerAccount({ email, name: brandName, password });
    setBusy(false);
    if (result.success) {
      setInfo(
        tr(
          "Account created successfully. Please wait for admin activation.",
          "Compte créé avec succès. En attente d'activation par l'administrateur.",
          "Cuenta creada con éxito. En espera de activación por el administrador."
        )
      );
      setTimeout(() => {
        onSuccess();
      }, 2500);
    } else {
      setError(
        result.error ||
          tr(
            "Failed to create account.",
            "Échec de la création du compte.",
            "Error al crear la cuenta."
          )
      );
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col" style={{ fontFamily: "'Poppins','Segoe UI',system-ui,sans-serif" }}>
      <div className="w-full bg-[#13234d] bg-gradient-to-r from-[#0d1a3d] via-[#13234d] to-[#1d3a7a] py-8 px-6 text-center shadow-md">
        <p className="text-amber-400 text-xs tracking-[0.4em] uppercase">Tangier International</p>
        <h1 className="mt-1 text-white text-3xl md:text-4xl font-bold tracking-wide">
          {tr("Partner Sign-Up", "Inscription Partenaire", "Registro de Colaborador")}
        </h1>
        <p className="mt-2 text-slate-300 text-sm">
          {tr("Create your partner account – activation pending.", "Créez votre compte partenaire – en attente d'activation.", "Crea tu cuenta de colaborador – pendiente de activación.")}
        </p>
        <AuthLangSwitcher lang={lang} setLang={setLang} />
      </div>
      <div className="flex-1 flex items-start justify-center px-4 pt-10 pb-10">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-lg shadow-lg overflow-hidden border border-gray-200">
            <div className="bg-[#333a45] px-6 py-4 text-center">
              <h2 className="text-white text-lg font-semibold">
                {tr("Create Partner Account", "Créer un compte partenaire", "Crear cuenta de colaborador")}
              </h2>
            </div>
            <form onSubmit={handleSubmit} className="p-8 space-y-5">
              {error && (
                <div className="p-3.5 rounded-md bg-red-50 border border-red-200 text-red-700 text-sm text-center font-medium">
                  {error}
                </div>
              )}
              {info && (
                <div className="p-3.5 rounded-md bg-green-50 border border-green-200 text-green-700 text-sm text-center font-medium">
                  {info}
                </div>
              )}
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                placeholder={tr("Partner Email", "E-mail Partenaire", "Correo del Colaborador")}
                className="w-full rounded-md border border-gray-300 bg-white px-4 py-3 text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all"
              />
              <input
                type="text"
                value={brandName}
                onChange={e => setBrandName(e.target.value)}
                required
                placeholder={tr("Full Brand Name", "Nom de la marque / Nom complet", "Nombre de marca / Nombre completo")}
                className="w-full rounded-md border border-gray-300 bg-white px-4 py-3 text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all"
              />
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                minLength={6}
                placeholder={tr("Password (min 6 chars)", "Mot de passe (min 6 caract.)", "Contraseña (mínimo 6 caract.)")}
                className="w-full rounded-md border border-gray-300 bg-white px-4 py-3 text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all"
              />

              <div>
                <button type="submit" disabled={busy} className="inline-flex items-center justify-center gap-2 bg-[#c8102e] hover:bg-[#a60d26] text-white rounded-md px-10 py-3 font-semibold shadow transition-all cursor-pointer disabled:opacity-50 w-full">
                  {busy ? tr("Creating…", "Création…", "Creando…") : tr("Create Account", "Créer un compte", "Crear Cuenta")}
                </button>
              </div>
            </form>
          </div>
          <div className="mt-6 text-center">
            <button onClick={onCancel} className="text-xs text-gray-400 hover:text-gray-600 transition cursor-pointer">
              ← {tr("Back to Login", "Retour à la connexion", "Volver al inicio de sesión")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────

function extractGuests(b: Booking): { guest1: string; guest2: string | null; allGuests: string[] } {
  let names: string[] = [];
  if (b.guestDetails) {
    try {
      const parsed = JSON.parse(b.guestDetails);
      if (Array.isArray(parsed)) {
        names = parsed
          .map((g: any) => `${g.firstName || ""} ${g.lastName || ""}`.trim())
          .filter(Boolean);
      }
    } catch {}
  }
  if (names.length === 0 && b.customerName) {
    names = b.customerName
      .split(/\s*&\s*|\s*,\s*|\s*\+\s*/)
      .map((s) => s.trim())
      .filter(Boolean);
  }
  const guest1 = names[0] || b.customerName || "Guest";
  const guest2 = names[1] || null;
  return { guest1, guest2, allGuests: names.length > 0 ? names : [guest1] };
}

function getNights(b: Booking, pack?: Pack): number | null {
  if (pack?.sub) {
    const match = pack.sub.match(/(\d+)\s*NIGHT/i);
    if (match) return parseInt(match[1], 10);
  }
  if (pack?.name) {
    const match = pack.name.match(/(\d+)\s*NIGHT/i);
    if (match) return parseInt(match[1], 10);
  }
  if (b.arrivalDate && b.departureDate) {
    const diff = Math.round(
      (new Date(b.departureDate).getTime() - new Date(b.arrivalDate).getTime()) / (1000 * 60 * 60 * 24)
    );
    if (diff > 0 && diff < 30) return diff;
  }
  return null;
}

interface UnifiedClientBooking {
  id: string;
  ticketCode: string;
  guest1: string;
  guest2: string | null;
  allGuests: string[];
  customerName: string;
  email: string;
  phone: string;
  country: string;
  roomNumber?: string | null;
  status: BookingStatus;
  createdAt: string;

  festivalBooking?: Booking | null;
  festivalPack?: Pack | null;
  festivalLabel?: string;
  festivalGrossPrice: number;
  festivalDiscount: number;
  festivalNetPrice: number;
  nights: number | null;
  arrivalDate?: string | null;
  departureDate?: string | null;
  festivalCommission: number;

  tours: {
    booking: Booking;
    tourName: string;
    city: string;
    date: string;
    numPeople: number;
    pricePerPerson: number;
    totalPrice: number;
    commission: number;
    notes?: string;
  }[];
  totalTourismPrice: number;
  totalTourismCommission: number;

  shuttle: {
    needsTransfer: boolean;
    type: TransferType | null;
    option: TransferOption | null;
    location: string | null;
    details: string | null;
    cost: number;
    numPeople: number;
  } | null;

  totalAmount: number;
  totalCommission: number;
  allNotes: string[];
}

function buildUnifiedReservations(
  bookings: Booking[],
  packs: Pack[],
  partner: Collaborator,
  discounts: DiscountCode[],
  L: Language
): UnifiedClientBooking[] {
  const groups: Booking[][] = [];
  const visited = new Set<string>();

  for (const b of bookings) {
    if (visited.has(b.id)) continue;

    const group: Booking[] = [b];
    visited.add(b.id);

    const bCode = (b.ticketCode || "").toUpperCase().trim();
    const bPhone = normalizePhone(b.phone);
    const bEmail = (b.email || "").toLowerCase().trim();
    const bName = (b.customerName || "").toLowerCase().trim();

    for (const other of bookings) {
      if (visited.has(other.id)) continue;
      const otherCode = (other.ticketCode || "").toUpperCase().trim();
      const otherPhone = normalizePhone(other.phone);
      const otherEmail = (other.email || "").toLowerCase().trim();
      const otherNotes = (other.notes || "").toUpperCase();
      const otherName = (other.customerName || "").toLowerCase().trim();

      const matchesTicket = bCode && otherCode && bCode === otherCode;
      const matchesNoteTicket =
        (bCode && otherNotes.includes(bCode)) ||
        (otherCode && (b.notes || "").toUpperCase().includes(otherCode));
      const matchesPhone =
        bPhone.length >= 6 &&
        otherPhone.length >= 6 &&
        (bPhone.endsWith(otherPhone.slice(-8)) || otherPhone.endsWith(bPhone.slice(-8)));
      const matchesEmail = bEmail.length > 3 && otherEmail.length > 3 && bEmail === otherEmail;
      const matchesName =
        bName.length > 3 &&
        otherName.length > 3 &&
        (bName === otherName || bName.includes(otherName) || otherName.includes(bName));

      if (matchesTicket || matchesNoteTicket || matchesPhone || matchesEmail || matchesName) {
        group.push(other);
        visited.add(other.id);
      }
    }
    groups.push(group);
  }

  return groups.map((grp) => {
    const festBooking = grp.find((b) => !isTourismBooking(b));
    const primary = festBooking || grp[0];

    const { guest1, guest2, allGuests } = extractGuests(primary);
    const pack = festBooking ? packs.find((p) => p.id === festBooking.packId) : null;
    const label = festBooking
      ? translateDynamicText(pack ? packLabel(pack) : festBooking.packName, L)
      : "";

    const festUnitPrice = pack ? parseInt(pack.price, 10) || 0 : 0;
    const festGuests = festBooking ? festBooking.numPeople || 1 : 0;
    const festGross = festUnitPrice * festGuests;
    const festDiscount = festBooking ? festBooking.discountAmount || 0 : 0;
    const festNet = Math.max(0, festGross - festDiscount);

    let festCommission = 0;
    if (festBooking && festBooking.status !== "declined") {
      const commMoney = collaboratorFestivalCommission(partner, [festBooking], packs, discounts);
      festCommission = (partner.currency === "MAD" ? commMoney.mad : commMoney.eur) || 0;
    }

    const tourBookings = grp.filter((b) => isTourismBooking(b));
    const tours = tourBookings.map((tb) => {
      const numPeople = tb.numPeople || 1;
      const unitPrice = getTourismPrice(tb.packId || tb.packName);
      const gross = unitPrice * numPeople;
      const comm = tb.status !== "declined" ? numPeople * 5 : 0;
      return {
        booking: tb,
        tourName: tb.packName,
        city: tb.packName.replace(/tourism:\s*/i, "").split("(")[0].trim(),
        date: tb.arrivalDate || "2027-01-09",
        numPeople,
        pricePerPerson: unitPrice,
        totalPrice: gross,
        commission: comm,
        notes: tb.notes,
      };
    });

    const totalTourismPrice = tours.reduce((sum, t) => sum + t.totalPrice, 0);
    const totalTourismCommission = tours.reduce((sum, t) => sum + t.commission, 0);

    const shuttleSource = grp.find(
      (b) => b.needsTransfer || b.transferType || (b.transferCost && b.transferCost > 0)
    );
    const shuttle = shuttleSource
      ? {
          needsTransfer: true,
          type: shuttleSource.transferType || null,
          option: shuttleSource.transferOption || null,
          location:
            shuttleSource.transferLocation ||
            (shuttleSource.transferType === "port" ? "Port of Tangier" : "Tangier Airport"),
          details: shuttleSource.transferDetails || null,
          cost: shuttleSource.transferCost || 0,
          numPeople: shuttleSource.numPeople || 1,
        }
      : null;

    const shuttleCost = shuttle?.cost || 0;
    const totalAmount = festNet + totalTourismPrice + shuttleCost;
    const totalCommission = festCommission + totalTourismCommission;

    const allNotes = grp
      .map((b) => b.notes)
      .filter((n): n is string => !!n && n.trim().length > 0);

    const roomNumber = grp.find((b) => b.roomNumber)?.roomNumber || null;

    return {
      id: primary.id,
      ticketCode: primary.ticketCode,
      customerName: primary.customerName,
      guest1,
      guest2,
      allGuests,
      email: primary.email,
      phone: primary.phone,
      country: primary.country || "Morocco",
      roomNumber,
      status: primary.status,
      createdAt: primary.createdAt,
      festivalBooking: festBooking || null,
      festivalPack: pack,
      festivalLabel: label,
      festivalGrossPrice: festGross,
      festivalDiscount: festDiscount,
      festivalNetPrice: festNet,
      nights: festBooking ? getNights(festBooking, pack || undefined) : null,
      arrivalDate: festBooking?.arrivalDate || null,
      departureDate: festBooking?.departureDate || null,
      festivalCommission: festCommission,
      tours,
      totalTourismPrice,
      totalTourismCommission,
      shuttle,
      totalAmount,
      totalCommission,
      allNotes,
    };
  });
}

function Portal({ partner, onSignOut }: { partner: Collaborator; onSignOut: () => void }) {
  const L = partner.language ?? "en";
  const tr = (en: string, fr: string, es: string) =>
    L === "fr" ? fr : L === "es" ? es : en;

  const [expandedBookings, setExpandedBookings] = useState<Record<string, boolean>>({});
  const toggleExpand = (id: string) =>
    setExpandedBookings((prev) => ({ ...prev, [id]: !prev[id] }));

  const [allPacks, setAllPacks] = useState<Pack[]>([]);
  const [allDiscounts, setAllDiscounts] = useState<DiscountCode[]>([]);
  const [myBookings, setMyBookings] = useState<Booking[]>([]);
  const [allFestivalBookings, setAllFestivalBookings] = useState<Booking[]>([]);
  const [ticketsSold, setTicketsSold] = useState(0);
  const [statusError, setStatusError] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [refQr, setRefQr] = useState("");
  const [tourismQr, setTourismQr] = useState("");
  const [showMobileStats, setShowMobileStats] = useState(false);

  const [searchTerm, setSearchTerm] = useState("");
  const [filterTab, setFilterTab] = useState<"all" | "hotel" | "tours">("all");

  const reload = useCallback(async () => {
    const [packs, allBookings, discounts] = await Promise.all([
      getPacks(),
      getBookings(),
      getDiscountCodes(),
    ]);
    setAllPacks(packs);
    setAllDiscounts(discounts);
    const festBookings = allBookings.filter((b) => !isTourismBooking(b));
    setAllFestivalBookings(festBookings);

    const mine = allBookings
      .filter((b) => {
        if (b.collaboratorId === partner.id) return true;
        if (isTourismBooking(b) && !b.collaboratorId) {
          const matchedFestival = festBookings.find((fb) => {
            if (fb.collaboratorId !== partner.id) return false;
            const fbPhone = normalizePhone(fb.phone);
            const bPhone = normalizePhone(b.phone);
            if (
              fbPhone.length >= 6 &&
              bPhone.length >= 6 &&
              (fbPhone.endsWith(bPhone.slice(-8)) || bPhone.endsWith(fbPhone.slice(-8)))
            )
              return true;
            if (fb.email && b.email && fb.email.toLowerCase() === b.email.toLowerCase())
              return true;
            const fbName = fb.customerName.toLowerCase().trim();
            const bName = b.customerName.toLowerCase().trim();
            if (
              fbName &&
              bName &&
              (fbName === bName || fbName.includes(bName) || bName.includes(fbName))
            )
              return true;
            return false;
          });
          if (matchedFestival) return true;
        }
        return false;
      })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    setMyBookings(mine);

    const festivalOnly = mine.filter((b) => !isTourismBooking(b));
    setTicketsSold(
      festivalOnly
        .filter((b) => b.status !== "declined")
        .reduce((s, b) => s + (b.numPeople || 1), 0)
    );
  }, [partner]);

  const changeUnifiedStatus = async (res: UnifiedClientBooking, status: BookingStatus) => {
    setStatusError("");
    const allIds = [
      ...(res.festivalBooking ? [res.festivalBooking.id] : []),
      ...res.tours.map((t) => t.booking.id),
      ...(res.id ? [res.id] : []),
    ];
    const uniqueIds = Array.from(new Set(allIds));
    try {
      await Promise.all(uniqueIds.map((id) => updateBookingStatus(id, status)));
    } catch (e) {
      setStatusError(e instanceof Error ? e.message : String(e));
    }
    await reload();

    if (status === "confirmed" && res.email) {
      const bLang = (res.festivalBooking?.lang || partner.language || "en") as "en" | "fr" | "es";
      const tUrl = ticketUrl(res.ticketCode) + (bLang !== "en" ? `&lang=${bLang}` : "");
      const mail = ticketConfirmationEmail({
        customerName: res.customerName,
        packName: res.festivalLabel || "Tangier Latin Festival Pass",
        ticketCode: res.ticketCode,
        numPeople: res.festivalBooking?.numPeople || 1,
        ticketUrl: tUrl,
        lang: bLang,
        guests: res.allGuests,
        arrivalDate: res.arrivalDate || undefined,
        departureDate: res.departureDate || undefined,
      });
      sendFormNotification({
        subject: `Ticket confirmed: ${res.customerName} (${res.ticketCode})`,
        guestSubject: mail.subject,
        lang: bLang,
        ticket: { code: res.ticketCode, url: tUrl },
        fields: {
          name: res.customerName,
          email: res.email,
          Ticket: tUrl,
          Code: res.ticketCode,
          Pack: res.festivalLabel || "Festival Reservation",
          "Confirmed by partner": partner.name,
        },
        autoresponse: mail.body,
      }).catch(() => {});
    }
  };

  useEffect(() => {
    reload();
  }, [reload]);

  useEffect(() => {
    QRCode.toDataURL(getBookingUrl(partner.code, L), {
      width: 240,
      margin: 1,
      color: { dark: "#18181b", light: "#fafafa" },
    })
      .then(setRefQr)
      .catch(() => setRefQr(""));

    QRCode.toDataURL(getTourismBookingUrl(partner.code, L), {
      width: 240,
      margin: 1,
      color: { dark: "#1e3a8a", light: "#eff6ff" },
    })
      .then(setTourismQr)
      .catch(() => setTourismQr(""));
  }, [partner.code, L]);

  const copy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  const statusStyles: Record<string, string> = {
    pending: "bg-amber-100 text-amber-700 border-amber-300",
    confirmed: "bg-emerald-100 text-emerald-700 border-emerald-300",
    "checked-in": "bg-cyan-100 text-cyan-800 border-cyan-300",
    declined: "bg-red-100 text-red-700 border-red-300",
  };

  const unifiedReservations = buildUnifiedReservations(myBookings, allPacks, partner, allDiscounts, L as Language);

  // Festival metrics
  const liveFestival = myBookings.filter((b) => !isTourismBooking(b) && b.status !== "declined");
  const doubleRoomCount = liveFestival.filter((b) => packRoomCategory(allPacks.find((x) => x.id === b.packId) || b.packName, b.numPeople) === "double").length;
  const singleRoomCount = liveFestival.filter((b) => packRoomCategory(allPacks.find((x) => x.id === b.packId) || b.packName, b.numPeople) === "single").length;
  const fullPassCount = liveFestival.filter((b) => packRoomCategory(allPacks.find((x) => x.id === b.packId) || b.packName, b.numPeople) === "fullpass").length;
  const festSales = collaboratorRevenue(partner.id, myBookings, allPacks);
  const festEarned = collaboratorFestivalCommission(partner, myBookings, allPacks, allDiscounts);

  // Tourism metrics
  const liveTourism = myBookings.filter((b) => isTourismBooking(b) && b.status !== "declined");
  const asilahTourCount = liveTourism
    .filter((b) => b.packId?.includes("asilah") || b.packName?.toLowerCase().includes("asilah") || b.packName?.toLowerCase().includes("asella"))
    .reduce((s, b) => s + (b.numPeople || 1), 0);
  const tangierTourCount = liveTourism
    .filter((b) => b.packId?.includes("tangier") || b.packName?.toLowerCase().includes("tangier"))
    .reduce((s, b) => s + (b.numPeople || 1), 0);
  const chefchaouenTourCount = liveTourism
    .filter((b) => b.packId?.includes("chefchaouen") || b.packName?.toLowerCase().includes("chefchaouen") || b.packName?.toLowerCase().includes("chawan") || b.packName?.toLowerCase().includes("chaouen"))
    .reduce((s, b) => s + (b.numPeople || 1), 0);
  const totalTourCommission = liveTourism.reduce((s, b) => s + (b.numPeople || 1) * 5, 0);
  const totalTourRevenue = liveTourism.reduce((s, b) => s + getTourismPrice(b.packId || b.packName) * (b.numPeople || 1), 0);

  // Shuttle metrics
  const liveShuttle = myBookings.filter((b) => (b.needsTransfer || !!b.transferType || (b.transferCost && b.transferCost > 0)) && b.status !== "declined");
  const portShuttleCount = liveShuttle.filter((b) => b.transferType === "port").reduce((s, b) => s + (b.numPeople || 1), 0);
  const airportShuttleCount = liveShuttle.filter((b) => b.transferType === "airport" || !b.transferType).reduce((s, b) => s + (b.numPeople || 1), 0);
  const totalShuttlePassengers = liveShuttle.reduce((s, b) => s + (b.numPeople || 1), 0);
  const totalShuttleRevenue = liveShuttle.reduce((s, b) => s + (b.transferCost || 0), 0);

  // Combined totals
  const totalFestivalSales = (partner.currency === "MAD" ? festSales.mad : festSales.eur) || 0;
  const totalGrossSales = totalFestivalSales + totalTourRevenue;

  const totalFestivalCommission = (partner.currency === "MAD" ? festEarned.mad : festEarned.eur) || 0;
  const totalCombinedEarnings = totalFestivalCommission + totalTourCommission;

  const totalDueToFestival = Math.max(0, totalGrossSales - totalCombinedEarnings);
  const festDue = Math.max(0, totalFestivalSales - totalFestivalCommission);
  const tourDue = Math.max(0, totalTourRevenue - totalTourCommission);

  const totalParticipantsCount = unifiedReservations
    .filter((r) => r.status !== "declined")
    .reduce((sum, r) => sum + Math.max(1, r.allGuests.length, r.festivalBooking?.numPeople || 1), 0);
  const totalDisplayParticipants = Math.max(ticketsSold, totalParticipantsCount);

  const totalExcursionPassengers = unifiedReservations
    .filter((r) => r.status !== "declined")
    .reduce((sum, r) => sum + r.tours.reduce((ts, t) => ts + t.numPeople, 0), 0);

  const filteredReservations = unifiedReservations.filter((res) => {
    if (filterTab === "hotel" && !res.festivalBooking) return false;
    if (filterTab === "tours" && res.tours.length === 0) return false;

    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase().trim();
    return (
      res.customerName.toLowerCase().includes(term) ||
      res.guest1.toLowerCase().includes(term) ||
      (res.guest2 && res.guest2.toLowerCase().includes(term)) ||
      res.ticketCode.toLowerCase().includes(term) ||
      res.email.toLowerCase().includes(term) ||
      res.phone.includes(term) ||
      (res.roomNumber && res.roomNumber.includes(term))
    );
  });

  return (
    <div
      className="min-h-screen bg-slate-100 text-gray-900 notranslate"
      translate="no"
      style={{ fontFamily: "'Poppins','Segoe UI',system-ui,sans-serif" }}
    >
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap');`}</style>

      <header className="bg-[#13234d] shadow-md sticky top-0 z-30">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="h-10 w-10 rounded-xl bg-amber-500 grid place-items-center shrink-0 shadow-sm">
              <Users className="h-5 w-5 text-[#13234d]" />
            </div>
            <div className="min-w-0">
              <p className="font-display text-sm tracking-wide truncate text-white font-bold">
                {partner.name}
              </p>
              <p className="text-[11px] text-slate-300 font-mono">{partner.code}</p>
            </div>
          </div>
          <button
            onClick={() => {
              clearPartnerSession();
              onSignOut();
            }}
            className="inline-flex items-center gap-2 text-xs text-slate-300 hover:text-red-300 transition cursor-pointer shrink-0 px-3 py-1.5 rounded-lg hover:bg-white/10"
          >
            <LogOut className="h-4 w-4" />
            {tr("Sign Out", "Déconnexion", "Cerrar sesión")}
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 sm:px-6 py-8 space-y-8">

        {/* ═══════════════════════════════════════════════════════════════ */}
        {/* TOP SUMMARY BAR (Total Participants, Total Sales, Total Commission & Total Due) */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* 1. Total Participants */}
          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-[11px] uppercase tracking-wider font-extrabold text-gray-500">
                {tr("Total Participants", "Total Participants", "Total Participantes")}
              </p>
              <p className="mt-1 font-display text-3xl font-black text-slate-900">
                {totalDisplayParticipants}
              </p>
            </div>
            <div className="h-12 w-12 rounded-2xl bg-blue-50 border border-blue-200 grid place-items-center">
              <Users className="h-6 w-6 text-blue-600" />
            </div>
          </div>

          {/* 2. Total Sales / Total Ventes */}
          <div className="rounded-2xl border border-blue-200 bg-gradient-to-br from-blue-900 to-indigo-950 text-white p-5 shadow-md flex items-center justify-between">
            <div>
              <p className="text-[11px] uppercase tracking-wider font-black text-blue-200">
                {tr("Total Sales", "Total Ventes", "Total Ventas")}
              </p>
              <p className="mt-1 font-display text-3xl font-black text-white">
                {totalGrossSales} €
              </p>
              <p className="text-xs text-blue-200/80 font-medium mt-0.5">
                {formatForPartner(festSales, partner)} ({tr("Festival", "Festival", "Festival")}) + {totalTourRevenue} € ({tr("Tours", "Excursions", "Tours")})
              </p>
            </div>
            <div className="h-12 w-12 rounded-2xl bg-white/15 grid place-items-center">
              <TrendingUp className="h-6 w-6 text-blue-300" />
            </div>
          </div>

          {/* 3. Total Commissions */}
          <div className="rounded-2xl border border-emerald-300 bg-gradient-to-br from-emerald-600 to-teal-700 text-white p-5 shadow-md flex items-center justify-between">
            <div>
              <p className="text-[11px] uppercase tracking-wider font-black text-emerald-100">
                {tr("Your Total Earnings", "Total de vos commissions", "Tus Ganancias Totales")}
              </p>
              <p className="mt-1 font-display text-3xl font-black text-white">
                {totalCombinedEarnings} €
              </p>
              <p className="text-xs text-emerald-100 font-medium mt-0.5">
                {formatForPartner(festEarned, partner)} ({tr("Festival", "Festival", "Festival")}) + {totalTourCommission} € ({tr("Tours", "Excursions", "Tours")})
              </p>
            </div>
            <div className="h-12 w-12 rounded-2xl bg-white/20 grid place-items-center">
              <Euro className="h-6 w-6 text-white" />
            </div>
          </div>

          {/* 4. Total à verser au Festival (Red) */}
          <div className="rounded-2xl border border-rose-300 bg-gradient-to-br from-red-600 via-rose-600 to-red-700 text-white p-5 shadow-md flex items-center justify-between">
            <div>
              <p className="text-[11px] uppercase tracking-wider font-black text-rose-100">
                {tr("Total Due to Festival", "Total à verser au Festival", "Total a pagar al Festival")}
              </p>
              <p className="mt-1 font-display text-3xl font-black text-white">
                {totalDueToFestival} €
              </p>
              <p className="text-xs text-rose-100 font-medium mt-0.5">
                {festDue} € ({tr("Festival", "Festival", "Festival")}) + {tourDue} € ({tr("Tours", "Excursions", "Tours")})
              </p>
            </div>
            <div className="h-12 w-12 rounded-2xl bg-white/20 grid place-items-center">
              <Building2 className="h-6 w-6 text-white" />
            </div>
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════════════ */}
        {/* SELLING REFERRAL LINKS                                          */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        <div className="space-y-4">
          {/* Main Packs Booking Link (Yellowish/Amber Accent) */}
          <div className="rounded-3xl border-2 border-amber-300 bg-white shadow-xs p-6 flex flex-col sm:flex-row gap-6 items-start">
            <div className="flex-1 space-y-3">
              <div>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100 text-amber-900 text-xs font-bold uppercase tracking-wider mb-2">
                  <Ticket className="h-3.5 w-3.5 text-amber-600" />
                  {tr("Festival Packs Link", "Lien Packs Festival", "Enlace Packs Festival")}
                </span>
                <h3 className="font-display text-base font-bold text-gray-900 flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-amber-600" />
                  {tr("Your Main Pack Booking Link", "Votre lien de réservation des packs", "Tu enlace de reserva de packs")}
                </h3>
                <p className="mt-1 text-xs text-gray-500 leading-relaxed">
                  {tr(
                    "Send this link to your community for Hotel & Full Pass bookings. They choose their pack and receive their reservation confirmation.",
                    "Envoyez ce lien à votre communauté pour les réservations Hôtel & Full Pass.",
                    "Envía este enlace a tu comunidad para reservas de Hotel y Full Pass."
                  )}
                </p>
                <div className="mt-3 flex items-center gap-2 flex-wrap">
                  <code className="text-xs font-mono text-amber-800 bg-amber-50 border border-amber-200 px-3 py-2 rounded-xl break-all">
                    {getBookingUrl(partner.code, L)}
                  </code>
                  <button
                    onClick={() => copy("book", getBookingUrl(partner.code, L))}
                    className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                      copiedId === "book"
                        ? "bg-emerald-600 text-white shadow-xs"
                        : "bg-amber-100 text-amber-900 hover:bg-amber-500 hover:text-slate-950"
                    }`}
                  >
                    {copiedId === "book" ? (
                      <CheckCircle2 className="h-3.5 w-3.5" />
                    ) : (
                      <Copy className="h-3.5 w-3.5" />
                    )}
                    {copiedId === "book"
                      ? tr("Copied", "Copié", "Copiado")
                      : tr("Copy Link", "Copier le lien", "Copiar enlace")}
                  </button>
                </div>
              </div>
            </div>
            {refQr && (
              <div className="shrink-0 text-center mx-auto sm:mx-0">
                <div className="rounded-xl border border-amber-200 bg-white p-2.5 shadow-xs inline-block">
                  <img src={refQr} alt="Booking link QR" className="w-24 h-24" />
                </div>
                <p className="mt-1 text-[10px] text-gray-400 font-medium">
                  {tr("Packs QR Code", "QR Code Packs", "QR de Packs")}
                </p>
              </div>
            )}
          </div>

          {/* Tourism & Excursions Link (Blue Accent) */}
          <div className="rounded-3xl border-2 border-blue-400/80 bg-gradient-to-br from-[#0e275c] via-[#123880] to-[#1c4ea8] text-white shadow-xl shadow-blue-950/20 p-6 flex flex-col sm:flex-row gap-6 items-start relative overflow-hidden">
            <div className="absolute -top-12 -right-12 w-48 h-48 bg-blue-400/20 rounded-full blur-2xl pointer-events-none" />

            <div className="flex-1 space-y-3 relative z-10">
              <div>
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-400/20 text-blue-200 border border-blue-300/30 text-xs font-bold uppercase tracking-wider">
                    <Compass className="h-3.5 w-3.5 text-blue-300" />
                    {tr("Tourism & Excursions Link", "Lien Excursions Guidées", "Enlace de Turismo")}
                  </span>
                </div>

                <h3 className="font-display text-base font-bold text-white flex items-center gap-2">
                  <Compass className="h-4 w-4 text-cyan-300" />
                  {tr(
                    "Your Cultural Excursions Referral Link",
                    "Votre lien pour les excursions culturelles",
                    "Tu enlace para excursiones culturales"
                  )}
                </h3>
                <p className="mt-1 text-xs text-blue-100/80 leading-relaxed">
                  {tr(
                    "Share with your clients so they can book their guided day trips to Asilah, Tangier & Chefchaouen. All excursion reservations are automatically linked with their festival pass.",
                    "Partagez avec vos clients pour qu'ils réservent leurs visites guidées à Asilah, Tanger et Chefchaouen.",
                    "Comparte con tus clientes para que reserven sus tours guiados a Asilah, Tánger y Chefchaouen."
                  )}
                </p>

                <div className="mt-3 flex items-center gap-2 flex-wrap">
                  <code className="text-xs font-mono text-cyan-200 bg-blue-950/70 border border-blue-400/40 px-3 py-2 rounded-xl break-all">
                    {getTourismBookingUrl(partner.code, L)}
                  </code>

                  <button
                    onClick={() => copy("tourism", getTourismBookingUrl(partner.code, L))}
                    className={`inline-flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition cursor-pointer shadow-lg ${
                      copiedId === "tourism"
                        ? "bg-emerald-500 text-white shadow-emerald-500/30"
                        : "bg-gradient-to-r from-blue-400 to-cyan-400 hover:from-blue-300 hover:to-cyan-300 text-slate-950 shadow-blue-400/30 scale-100 hover:scale-105"
                    }`}
                  >
                    {copiedId === "tourism" ? (
                      <>
                        <CheckCircle2 className="h-4 w-4" />
                        <span>{tr("Copied!", "Copié !", "¡Copiado!")}</span>
                      </>
                    ) : (
                      <>
                        <Copy className="h-4 w-4" />
                        <span>{tr("Copy Link", "Copier le lien", "Copiar enlace")}</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>

            {tourismQr && (
              <div className="shrink-0 text-center mx-auto sm:mx-0 relative z-10">
                <div className="rounded-xl border border-blue-400/40 bg-blue-950/80 p-2.5 shadow-md inline-block">
                  <img src={tourismQr} alt="Tourism link QR" className="w-24 h-24 rounded-lg" />
                </div>
                <p className="mt-1 text-[10px] text-blue-200 font-semibold uppercase tracking-wider">
                  {tr("Tourism QR", "QR Excursions", "QR Turismo")}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════════════ */}
        {/* 2. SALES & PERFORMANCE STATS (Expandable on Mobile, Direct on Desktop) */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        <div className="space-y-4">
          {/* Mobile Expandable Toggle Button */}
          <div className="block sm:hidden">
            <button
              type="button"
              onClick={() => setShowMobileStats((prev) => !prev)}
              className={`w-full py-3.5 px-4 rounded-2xl border-2 font-black text-xs flex items-center justify-between transition cursor-pointer shadow-md ${
                showMobileStats
                  ? "bg-slate-900 text-white border-slate-800"
                  : "bg-gradient-to-r from-red-600 via-rose-600 to-red-600 text-white border-red-400 shadow-red-500/30"
              }`}
            >
              <div className="flex items-center gap-2">
                <Info className="h-4 w-4 text-white" />
                <span>
                  {showMobileStats
                    ? tr("Hide Details of your Sales", "Masquer le détail de vos ventes", "Ocultar detalle de tus ventas")
                    : tr("View Details of your Sales", "Voir le détail de vos ventes", "Ver detalle de tus ventas")}
                </span>
              </div>
              <div className="flex items-center gap-2">
                {showMobileStats ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </div>
            </button>
          </div>

          {/* 2 COLOR-CODED RECTANGLES (Rooms & Passes + Tours) */}
          <div className={`${showMobileStats ? "block space-y-4" : "hidden sm:block sm:space-y-5"}`}>
            {/* 1. YELLOWISH RECTANGLE — FESTIVAL ROOMS & PASSES */}
            <div className="rounded-3xl border-2 border-amber-300 bg-gradient-to-br from-amber-50/90 via-yellow-50/70 to-amber-100/50 p-5 sm:p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between gap-3 flex-wrap border-b border-amber-200/80 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="h-9 w-9 rounded-xl bg-amber-500 text-white grid place-items-center shadow-xs">
                    <Bed className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-display text-base font-black text-amber-950">
                      {tr("Festival Rooms & Passes", "Chambres & Pass Festival", "Habitaciones y Pases de Festival")}
                    </h3>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-wrap text-xs">
                  <span className="px-3.5 py-1.5 rounded-xl bg-amber-200/90 text-amber-950 font-black border border-amber-300 shadow-2xs">
                    {ticketsSold} {tr("Participants", "Participants", "Participantes")}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
                {/* Chambre Double (Shambadoob) */}
                <div className="bg-white/95 rounded-2xl border-2 border-amber-200 p-4 shadow-2xs">
                  <div className="flex items-center justify-between text-amber-700">
                    <span className="text-[10px] font-black uppercase tracking-wider">
                      {tr("Double Room", "Chambre Double", "Hab. Doble")}
                    </span>
                    <Bed className="h-4 w-4 text-amber-600" />
                  </div>
                  <p className="mt-2 font-display text-2xl font-black text-amber-950">
                    {doubleRoomCount}
                  </p>
                </div>

                {/* Chambre Single */}
                <div className="bg-white/95 rounded-2xl border-2 border-amber-200 p-4 shadow-2xs">
                  <div className="flex items-center justify-between text-amber-700">
                    <span className="text-[10px] font-black uppercase tracking-wider">
                      {tr("Single Room", "Chambre Single", "Hab. Individual")}
                    </span>
                    <Users className="h-4 w-4 text-amber-600" />
                  </div>
                  <p className="mt-2 font-display text-2xl font-black text-amber-950">
                    {singleRoomCount}
                  </p>
                </div>

                {/* Full Pass (Footpath) */}
                <div className="bg-white/95 rounded-2xl border-2 border-amber-200 p-4 shadow-2xs">
                  <div className="flex items-center justify-between text-amber-700">
                    <span className="text-[10px] font-black uppercase tracking-wider">
                      {tr("Full Pass", "Full Pass Seul", "Full Pass")}
                    </span>
                    <Ticket className="h-4 w-4 text-amber-600" />
                  </div>
                  <p className="mt-2 font-display text-2xl font-black text-amber-950">
                    {fullPassCount}
                  </p>
                </div>

                {/* Festival Sales */}
                <div className="bg-gradient-to-br from-amber-500 to-amber-600 text-white rounded-2xl p-4 shadow-sm">
                  <div className="flex items-center justify-between text-amber-100">
                    <span className="text-[10px] font-black uppercase tracking-wider">
                      {tr("Festival Sales", "Ventes Festival", "Ventas Festival")}
                    </span>
                    <Euro className="h-4 w-4 text-white" />
                  </div>
                  <p className="mt-2 font-display text-2xl font-black text-white">
                    {formatForPartner(festSales, partner)}
                  </p>
                </div>
              </div>
            </div>

            {/* 2. BLUE RECTANGLE — CULTURAL TOURS & EXCURSIONS */}
            <div className="rounded-3xl border-2 border-blue-300 bg-gradient-to-br from-blue-50/90 via-sky-50/70 to-indigo-50/50 p-5 sm:p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between gap-3 flex-wrap border-b border-blue-200/80 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="h-9 w-9 rounded-xl bg-blue-600 text-white grid place-items-center shadow-xs">
                    <Compass className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-display text-base font-black text-blue-950">
                      {tr("Cultural Tours & Excursions", "Excursions Culturelles (Tours)", "Excursiones Culturales (Tours)")}
                    </h3>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-wrap text-xs">
                  <span className="px-3.5 py-1.5 rounded-xl bg-blue-200/90 text-blue-950 font-black border border-blue-300 shadow-2xs">
                    {totalExcursionPassengers} {tr("Participants", "Participants", "Participantes")}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
                {/* Asilah Tour */}
                <div className="bg-white/95 rounded-2xl border-2 border-blue-200 p-4 shadow-2xs">
                  <div className="flex items-center justify-between text-blue-700">
                    <span className="text-[10px] font-black uppercase tracking-wider">
                      Asilah Tour
                    </span>
                    <MapPin className="h-4 w-4 text-cyan-600" />
                  </div>
                  <p className="mt-2 font-display text-2xl font-black text-blue-950">
                    {asilahTourCount}
                  </p>
                </div>

                {/* Tangier Tour */}
                <div className="bg-white/95 rounded-2xl border-2 border-blue-200 p-4 shadow-2xs">
                  <div className="flex items-center justify-between text-blue-700">
                    <span className="text-[10px] font-black uppercase tracking-wider">
                      Tangier Tour
                    </span>
                    <MapPin className="h-4 w-4 text-blue-600" />
                  </div>
                  <p className="mt-2 font-display text-2xl font-black text-blue-950">
                    {tangierTourCount}
                  </p>
                </div>

                {/* Chefchaouen Tour */}
                <div className="bg-white/95 rounded-2xl border-2 border-blue-200 p-4 shadow-2xs">
                  <div className="flex items-center justify-between text-blue-700">
                    <span className="text-[10px] font-black uppercase tracking-wider">
                      Chefchaouen
                    </span>
                    <MapPin className="h-4 w-4 text-indigo-600" />
                  </div>
                  <p className="mt-2 font-display text-2xl font-black text-blue-950">
                    {chefchaouenTourCount}
                  </p>
                </div>

                {/* Tours Total Revenue */}
                <div className="bg-gradient-to-br from-blue-600 to-indigo-700 text-white rounded-2xl p-4 shadow-sm">
                  <div className="flex items-center justify-between text-blue-100">
                    <span className="text-[10px] font-black uppercase tracking-wider">
                      {tr("Tours Revenue", "Total Excursions", "Total Tours")}
                    </span>
                    <Euro className="h-4 w-4 text-white" />
                  </div>
                  <p className="mt-2 font-display text-2xl font-black text-white">
                    {totalTourRevenue} €
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════════════ */}
        {/* UNIFIED SINGLE-PAGE CLIENT RESERVATIONS LIST                     */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        <div className="pt-2 space-y-4">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <h3 className="font-display text-lg font-black text-gray-950 flex items-center gap-2">
                <Ticket className="h-5 w-5 text-amber-600" />
                <span>
                  {tr(
                    "All Client Reservations",
                    "Toutes les Réservations Clients",
                    "Todas las Reservas de Clientes"
                  )}
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-mono bg-amber-100 text-amber-900 font-bold border border-amber-300">
                  {unifiedReservations.length}
                </span>
              </h3>
            </div>
          </div>

          {/* Search Input Bar */}
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={tr(
                "Search by participant name, reservation code (#TLF-...), phone, email, or room number...",
                "Rechercher par nom de participant, code réservation (#TLF-...), tél, email, ou N° de chambre...",
                "Buscar por nombre de participante, código de reserva (#TLF-...), teléfono, email o habitación..."
              )}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-300 bg-white text-xs text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 shadow-2xs"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 hover:text-gray-600 font-bold"
              >
                ✕
              </button>
            )}
          </div>

          {statusError && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3">
              <p className="text-sm text-red-700">{statusError}</p>
            </div>
          )}

          {filteredReservations.length === 0 ? (
            <div className="rounded-2xl border border-gray-200 bg-white shadow-xs px-5 py-12 text-center text-xs text-gray-400">
              {tr(
                "No client reservations found matching your criteria.",
                "Aucune réservation client trouvée avec ces critères.",
                "No se encontraron reservas de clientes que coincidan con estos criterios."
              )}
            </div>
          ) : (
            <div className="space-y-3.5">
              {filteredReservations.map((res) => {
                const isExpanded = !!expandedBookings[res.id];
                const hasTicket = res.status === "confirmed" || res.status === "checked-in";
                const isDouble =
                  res.guest2 != null ||
                  /double|doble|couple/i.test(res.festivalLabel || "") ||
                  (res.festivalBooking?.numPeople || 1) >= 2;

                return (
                  <div
                    key={res.id}
                    className="rounded-3xl border-2 border-gray-200 bg-white shadow-xs overflow-hidden transition-all duration-200 hover:border-gray-300"
                  >
                    {/* Master Header Card Summary Row: ONLY Big Guest Name(s) + Total Amount + Actions */}
                    <div className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="flex items-center gap-3 sm:gap-4 flex-wrap min-w-0">
                        {/* Big Guest Name(s) */}
                        <div className="min-w-0">
                          <h4 className="font-display text-base sm:text-lg lg:text-xl font-black text-slate-900 tracking-tight flex items-center gap-2 flex-wrap">
                            <Users className="h-5 w-5 text-amber-600 shrink-0" />
                            <span className="capitalize">{res.guest1}</span>
                            {res.guest2 && (
                              <>
                                <span className="text-amber-600 font-bold text-base">&amp;</span>
                                <span className="capitalize text-slate-900">{res.guest2}</span>
                              </>
                            )}
                            {res.allGuests.length > 2 && (
                              <span className="text-xs font-bold text-gray-500 bg-gray-100 px-2 py-0.5 rounded-md">
                                +{res.allGuests.length - 2} {tr("more", "autres", "más")}
                              </span>
                            )}
                          </h4>
                        </div>

                        {/* Combined Total Amount */}
                        <span className="inline-flex items-center px-3 py-1.5 rounded-xl font-black text-sm sm:text-base bg-slate-900 text-amber-400 shadow-2xs shrink-0">
                          {tr("Total:", "Total :", "Total:")} {res.totalAmount} €
                        </span>
                      </div>

                      {/* Actions: View Details Toggle + Master Status */}
                      <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
                        <button
                          type="button"
                          onClick={() => toggleExpand(res.id)}
                          className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                            isExpanded
                              ? "bg-[#13234d] text-white shadow-sm"
                              : "bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200"
                          }`}
                        >
                          <Info className="h-4 w-4" />
                          <span>
                            {isExpanded
                              ? tr("Hide details", "Masquer détails", "Ocultar")
                              : tr("View details", "Voir détails", "Ver detalles")}
                          </span>
                          {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                        </button>

                        {res.status === "checked-in" ? (
                          <span
                            className={`px-3.5 py-2 rounded-full text-[10px] tracking-widest uppercase font-black border ${statusStyles["checked-in"]}`}
                          >
                            {tr("Checked In", "Enregistré", "Registrado")}
                          </span>
                        ) : (
                          <select
                            value={res.status}
                            onChange={(e) =>
                              changeUnifiedStatus(res, e.target.value as BookingStatus)
                            }
                            className={`appearance-none rounded-full px-3.5 py-2 text-[10px] tracking-widest uppercase font-black border cursor-pointer focus:outline-none ${statusStyles[res.status] ?? statusStyles.pending}`}
                          >
                            <option value="pending">
                              {tr("Pending", "En attente", "Pendiente")}
                            </option>
                            <option value="confirmed">
                              {tr("Confirmed", "Confirmé", "Confirmada")}
                            </option>
                            <option value="declined">
                              {tr("Declined", "Refusé", "Rechazada")}
                            </option>
                          </select>
                        )}
                      </div>
                    </div>

                    {/* Expandable Master Details */}
                    {isExpanded && (
                      <div className="border-t border-gray-200 bg-slate-50/90 p-4 sm:p-6 text-xs text-gray-700 space-y-4">
                        {/* Expanded Top Meta: Ticket Code + QR link */}
                        <div className="flex items-center justify-between gap-3 flex-wrap bg-white p-3 rounded-2xl border border-gray-200 shadow-2xs">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="inline-flex items-center gap-1 font-mono text-xs font-black bg-slate-900 text-amber-400 px-3 py-1.5 rounded-xl shadow-2xs">
                              <QrCode className="h-3.5 w-3.5 text-amber-400" />
                              <span>#{res.ticketCode}</span>
                            </span>
                          </div>

                          {hasTicket && (
                            <a
                              href={ticketUrl(res.ticketCode)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-100 text-amber-900 hover:bg-amber-200 font-bold transition shadow-2xs text-xs"
                            >
                              <QrCode className="h-4 w-4 text-amber-700" />
                              <span>{tr("Open Ticket", "Ouvrir Billet", "Abrir Entrada")}</span>
                            </a>
                          )}
                        </div>
                        <div className="grid sm:grid-cols-2 gap-3.5">
                          {/* 1. Yellowish Box — Hotel & Room Accommodation */}
                          <div className="bg-amber-50/90 p-4 rounded-2xl border-2 border-amber-300 shadow-2xs space-y-1.5">
                            <span className="text-[10px] font-black uppercase tracking-wider text-amber-900 block">
                              {tr("Hotel & Accommodation", "Hébergement & Chambre", "Alojamiento y Habitación")}
                            </span>
                            {res.festivalLabel ? (
                              <>
                                <p className="font-bold text-amber-950 text-sm flex items-center gap-1.5">
                                  <Bed className="h-4 w-4 text-amber-600 shrink-0" />
                                  <span>{res.festivalLabel}</span>
                                </p>
                                {packRoomCategory(res.festivalPack?.name || res.festivalLabel, 1) !== "fullpass" &&
                                  !res.festivalLabel?.toLowerCase().includes("sans") &&
                                  res.nights && (
                                    <p className="text-amber-900 font-medium">
                                      {`${res.nights} ${tr("Nights Stay", "Nuits", "Noches")}`}
                                      {res.arrivalDate && res.departureDate ? ` · ${new Date(res.arrivalDate).toLocaleDateString()} → ${new Date(res.departureDate).toLocaleDateString()}` : ""}
                                    </p>
                                  )}
                                <p className="text-amber-800">
                                  {tr("Pass Price:", "Prix Pass :", "Precio Pase:")} <strong className="text-amber-950 font-black">{res.festivalNetPrice} €</strong>
                                  {res.festivalDiscount > 0 && <span className="ml-1 text-emerald-700 font-bold">(-{res.festivalDiscount} €)</span>}
                                </p>
                                {res.roomNumber && (
                                  <p className="font-bold text-amber-950 inline-block bg-amber-100 px-2 py-0.5 rounded border border-amber-300 text-[11px]">
                                    {tr("Assigned Room:", "Chambre assignée :", "Habitación asignada:")} #{res.roomNumber}
                                  </p>
                                )}
                              </>
                            ) : (
                              <p className="text-gray-400 italic mt-2">
                                {tr("No hotel pack booked", "Aucun pack hôtel sélectionné", "Sin pack de hotel seleccionado")}
                              </p>
                            )}
                          </div>

                          {/* 2. Blue Box — Cultural Excursions Breakdown */}
                          <div className="bg-blue-50/90 p-4 rounded-2xl border-2 border-blue-300 shadow-2xs space-y-1.5">
                            <span className="text-[10px] font-black uppercase tracking-wider text-blue-900 block">
                              {tr("Cultural Excursions", "Excursions Culturelles", "Excursiones Culturales")}
                            </span>
                            {res.tours.length > 0 ? (
                              <div className="space-y-2">
                                {res.tours.map((t, tIdx) => (
                                  <div key={tIdx} className="bg-white/90 p-2.5 rounded-xl border border-blue-200 flex items-center justify-between gap-3 font-bold text-blue-950">
                                    <span>{t.tourName}</span>
                                    <span className="text-blue-900 font-extrabold shrink-0">
                                      {tr("Total:", "Total :", "Total:")} {t.totalPrice} €
                                    </span>
                                  </div>
                                ))}
                                <p className="text-[11px] text-blue-900 font-semibold flex items-center gap-1">
                                  <MapPin className="h-3.5 w-3.5 text-blue-600" />
                                  <span>{tr("Pickup: Kenzi Solazur Lobby", "Départ : Hall Kenzi Solazur", "Salida: Lobby Kenzi Solazur")}</span>
                                </p>
                              </div>
                            ) : (
                              <p className="text-gray-400 italic mt-2">
                                {tr("No excursions booked", "Aucune excursion réservée", "Sin excursions reservadas")}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </main>
    </div>
  );
}
