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
      const rate = partner.commissionRate || 0;
      if (partner.commissionType === "percentage") {
        festCommission = Math.round((festNet * rate) / 100);
      } else {
        festCommission = rate * festGuests;
      }
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
      festivalCommission,
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

  const [searchTerm, setSearchTerm] = useState("");
  const [filterTab, setFilterTab] = useState<"all" | "hotel" | "tours" | "shuttle">("all");

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

  const totalCombinedEarnings = unifiedReservations
    .filter((r) => r.status !== "declined")
    .reduce((sum, r) => sum + r.totalCommission, 0);

  const totalExcursionPassengers = unifiedReservations
    .filter((r) => r.status !== "declined")
    .reduce((sum, r) => sum + r.tours.reduce((ts, t) => ts + t.numPeople, 0), 0);

  const totalShuttlePassengers = unifiedReservations
    .filter((r) => r.status !== "declined" && r.shuttle)
    .reduce((sum, r) => sum + (r.shuttle?.numPeople || 0), 0);

  const filteredReservations = unifiedReservations.filter((res) => {
    if (filterTab === "hotel" && !res.festivalBooking) return false;
    if (filterTab === "tours" && res.tours.length === 0) return false;
    if (filterTab === "shuttle" && !res.shuttle) return false;

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

      <main className="mx-auto max-w-5xl px-4 sm:px-6 py-8 space-y-9">

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          <div className="rounded-2xl border border-gray-200 bg-white shadow-xs p-4">
            <div className="flex items-center justify-between text-gray-500">
              <p className="text-[10px] tracking-widest uppercase font-bold">
                {tr("Total Clients", "Total Clients", "Total Clientes")}
              </p>
              <Users className="h-4 w-4 text-blue-600" />
            </div>
            <p className="mt-1.5 font-display text-2xl font-black text-slate-900">
              {unifiedReservations.length}
            </p>
            <span className="text-[10px] text-gray-400 font-medium">
              {ticketsSold} {tr("passengers", "participants", "participantes")}
            </span>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white shadow-xs p-4">
            <div className="flex items-center justify-between text-gray-500">
              <p className="text-[10px] tracking-widest uppercase font-bold">
                {tr("Double Rooms", "Chambres Doubles", "Habitaciones Dobles")}
              </p>
              <Bed className="h-4 w-4 text-amber-600" />
            </div>
            <p className="mt-1.5 font-display text-2xl font-black text-amber-900">
              {
                unifiedReservations.filter(
                  (r) =>
                    r.status !== "declined" &&
                    (r.guest2 != null || /double|doble|couple/i.test(r.festivalLabel || ""))
                ).length
              }
            </p>
            <span className="text-[10px] text-amber-700 font-medium">
              {tr("1st & 2nd guests", "1er & 2ème invités", "1º y 2º huéspedes")}
            </span>
          </div>

          <div className="rounded-2xl border border-cyan-200 bg-cyan-50/70 shadow-xs p-4">
            <div className="flex items-center justify-between text-cyan-800">
              <p className="text-[10px] tracking-widest uppercase font-bold">
                {tr("Excursions", "Excursions", "Excursiones")}
              </p>
              <Compass className="h-4 w-4 text-cyan-600" />
            </div>
            <p className="mt-1.5 font-display text-2xl font-black text-cyan-950">
              {totalExcursionPassengers}
            </p>
            <span className="text-[10px] text-cyan-700 font-semibold">
              +5 € / {tr("passenger", "passager", "pasajero")}
            </span>
          </div>

          <div className="rounded-2xl border border-sky-200 bg-sky-50/70 shadow-xs p-4">
            <div className="flex items-center justify-between text-sky-800">
              <p className="text-[10px] tracking-widest uppercase font-bold">
                {tr("Shuttle Bus", "Navettes Bus", "Shuttle Bus")}
              </p>
              <Bus className="h-4 w-4 text-sky-600" />
            </div>
            <p className="mt-1.5 font-display text-2xl font-black text-sky-950">
              {totalShuttlePassengers}
            </p>
            <span className="text-[10px] text-sky-700 font-medium">
              {tr("Port & Airport", "Port & Aéroport", "Puerto y Aeropuerto")}
            </span>
          </div>

          <div className="rounded-2xl border border-emerald-300 bg-gradient-to-br from-emerald-600 to-teal-700 text-white shadow-md p-4 col-span-2 sm:col-span-1">
            <div className="flex items-center justify-between text-emerald-100">
              <p className="text-[10px] tracking-widest uppercase font-black">
                {tr("Total Earnings", "Vos Commissions", "Tus Ganancias")}
              </p>
              <Euro className="h-4 w-4 text-white" />
            </div>
            <p className="mt-1.5 font-display text-2xl font-black text-white">
              +{totalCombinedEarnings} €
            </p>
            <span className="text-[10px] text-emerald-100 font-medium">
              {tr("Fest + Tours + Rewards", "Festival + Visites", "Festival + Tours")}
            </span>
          </div>
        </div>

        {(partner.missionGoal ?? 0) > 0 &&
          (() => {
            const goal = partner.missionGoal!;
            const progress = Math.min(ticketsSold, goal);
            const achieved = ticketsSold >= goal;
            const reward = formatMoney(partner.missionReward ?? 0, partner.missionCurrency);
            return (
              <div
                className={`rounded-2xl border p-5 ${
                  achieved
                    ? "border-emerald-300 bg-emerald-50"
                    : "border-amber-200 bg-amber-50"
                }`}
              >
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <h3 className="font-display text-sm tracking-wide flex items-center gap-2">
                    <Trophy
                      className={`h-4 w-4 ${achieved ? "text-emerald-600" : "text-amber-600"}`}
                    />
                    {achieved
                      ? tr("Mission accomplished!", "Mission accomplie !", "¡Misión cumplida!")
                      : tr("Your Mission", "Votre mission", "Tu misión")}
                  </h3>
                  <span
                    className={`text-xs font-semibold ${
                      achieved ? "text-emerald-700" : "text-amber-700"
                    }`}
                  >
                    {progress}/{goal}
                  </span>
                </div>
                <p className="mt-1.5 text-sm text-gray-600">
                  {achieved
                    ? tr(
                        `You brought ${ticketsSold} people — you've won ${reward}! The festival team will contact you about your reward.`,
                        `Vous avez amené ${ticketsSold} personnes — vous avez gagné ${reward} ! L'équipe du festival vous contactera pour votre récompense.`,
                        `Has traído ${ticketsSold} personas — ¡has ganado ${reward}! El equipo del festival te contactará por tu recompensa.`
                      )
                    : tr(
                        `Bring ${goal} ${goal === 1 ? "person" : "people"} to the festival and win ${reward}. Your commission starts on the sales you make after completing the mission.`,
                        `Amenez ${goal} personne${goal === 1 ? "" : "s"} au festival et gagnez ${reward}. Votre commission démarre sur les ventes réalisées après avoir accompli la mission.`,
                        `Trae ${goal} persona${goal === 1 ? "" : "s"} al festival y gana ${reward}. Tu comisión empieza con las ventas que hagas después de completar la misión.`
                      )}
                </p>
                <div className="mt-3 h-2 rounded-full bg-gray-100 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      achieved ? "bg-emerald-500" : "bg-amber-500"
                    }`}
                    style={{ width: `${Math.min(100, (progress / goal) * 100)}%` }}
                  />
                </div>
              </div>
            );
          })()}

        <div className="rounded-2xl border-2 border-blue-400/80 bg-gradient-to-br from-[#0e275c] via-[#123880] to-[#1c4ea8] text-white shadow-xl shadow-blue-950/20 p-6 flex flex-col sm:flex-row gap-6 items-start relative overflow-hidden">
          <div className="absolute -top-12 -right-12 w-48 h-48 bg-blue-400/20 rounded-full blur-2xl pointer-events-none" />

          <div className="flex-1 space-y-3 relative z-10">
            <div>
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-400/20 text-blue-200 border border-blue-300/30 text-xs font-bold uppercase tracking-wider">
                  <Compass className="h-3.5 w-3.5 text-blue-300" />
                  {tr("Tourism & Excursions Link", "Lien Excursions Guidées", "Enlace de Turismo")}
                </span>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-400/20 text-emerald-300 border border-emerald-400/30 text-[10px] font-black uppercase tracking-wider">
                  {tr("Earn 5 € / Passenger", "Gagnez 5 € / Passager", "Gana 5 € / Pasajero")}
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

                <a
                  href={getTourismBookingUrl(partner.code, L)}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-blue-200 hover:text-white bg-blue-900/50 hover:bg-blue-800/80 border border-blue-400/30 transition cursor-pointer"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  <span>{tr("View Page", "Voir la page", "Ver página")}</span>
                </a>
              </div>
            </div>
          </div>
        </div>

        <div className="pt-2 space-y-4">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <h3 className="font-display text-lg font-bold text-gray-950 flex items-center gap-2">
                <Ticket className="h-5 w-5 text-amber-600" />
                <span>
                  {tr(
                    "All Client Reservations",
                    "Toutes les Réservations Clients",
                    "Todas las Reservas de Clientes"
                  )}
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-mono bg-amber-100 text-amber-900 font-bold border border-amber-200">
                  {unifiedReservations.length}
                </span>
              </h3>
              <p className="text-xs text-gray-500 mt-0.5">
                {tr(
                  "All your clients in one page — hotel room, double guest assignments, excursions & shuttle transfers linked under the same reservation.",
                  "Tous vos clients réunis sur une seule page — hôtel, chambre double (1er & 2ème invité), excursions et transferts reliés sous la même réservation.",
                  "Todos tus clientes en una sola página — hotel, habitación doble (1º y 2º huésped), excursiones y traslados vinculados bajo la misma reserva."
                )}
              </p>
            </div>

            <div className="flex items-center gap-1.5 bg-gray-200/80 p-1 rounded-xl text-xs font-bold">
              <button
                onClick={() => setFilterTab("all")}
                className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                  filterTab === "all"
                    ? "bg-white text-gray-950 shadow-xs"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                {tr("All", "Tous", "Todos")} ({unifiedReservations.length})
              </button>
              <button
                onClick={() => setFilterTab("hotel")}
                className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                  filterTab === "hotel"
                    ? "bg-white text-gray-950 shadow-xs"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                {tr("Hotel Passes", "Hôtels & Pass", "Hotel y Pases")}
              </button>
              <button
                onClick={() => setFilterTab("tours")}
                className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                  filterTab === "tours"
                    ? "bg-white text-gray-950 shadow-xs"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                {tr("Tours", "Excursions", "Tours")} ({totalExcursionPassengers})
              </button>
              <button
                onClick={() => setFilterTab("shuttle")}
                className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                  filterTab === "shuttle"
                    ? "bg-white text-gray-950 shadow-xs"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                {tr("Shuttle", "Navettes", "Shuttle")} ({totalShuttlePassengers})
              </button>
            </div>
          </div>

          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={tr(
                "Search by guest name, reservation code (#TLF-...), phone, email, or room number...",
                "Rechercher par nom d'invité, code réservation (#TLF-...), tél, email, ou N° de chambre...",
                "Buscar por nombre de huésped, código de reserva (#TLF-...), teléfono, email o habitación..."
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
                    className="rounded-2xl border border-gray-200/90 bg-white shadow-xs overflow-hidden transition-all duration-200 hover:border-gray-300"
                  >
                    <div className="p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                      <div className="flex-1 min-w-0 space-y-2.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="inline-flex items-center gap-1 font-mono text-xs font-black bg-slate-900 text-amber-400 px-2.5 py-1 rounded-lg shadow-2xs">
                            <QrCode className="h-3.5 w-3.5 text-amber-400" />
                            <span>#{res.ticketCode}</span>
                          </span>

                          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-amber-50 text-amber-950 border border-amber-200 text-xs font-bold">
                            <span className="text-[10px] uppercase tracking-wider text-amber-600 font-extrabold">
                              {tr("1st Guest:", "1er Invité :", "1er Huésped:")}
                            </span>
                            <span>{res.guest1}</span>
                          </div>

                          {res.guest2 ? (
                            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-indigo-50 text-indigo-950 border border-indigo-200 text-xs font-bold">
                              <span className="text-[10px] uppercase tracking-wider text-indigo-600 font-extrabold">
                                {tr("2nd Guest:", "2ème Invité :", "2º Huésped:")}
                              </span>
                              <span>{res.guest2}</span>
                            </div>
                          ) : isDouble ? (
                            <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-200 text-xs font-semibold">
                              <Bed className="h-3.5 w-3.5 text-indigo-500" />
                              <span>{tr("Double Room (2 Guests)", "Chambre Double (2 Invités)", "Habitación Doble (2 Huéspedes)")}</span>
                            </div>
                          ) : null}
                        </div>

                        <div className="flex items-center gap-2 flex-wrap text-xs">
                          <span className="inline-flex items-center px-2.5 py-1 rounded-lg font-black bg-slate-100 text-slate-950 border border-slate-300">
                            {tr("Total:", "Total :", "Total:")} {res.totalAmount} €
                          </span>

                          <span className="inline-flex items-center px-2.5 py-1 rounded-lg font-black bg-emerald-50 text-emerald-800 border border-emerald-200 shadow-2xs">
                            +{res.totalCommission} € {tr("Commission", "Commission", "Comisión")}
                          </span>

                          {res.festivalLabel ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg font-semibold bg-amber-50 text-amber-900 border border-amber-200">
                              <Bed className="h-3.5 w-3.5 text-amber-600" />
                              <span className="truncate max-w-[200px]">{res.festivalLabel}</span>
                              {res.roomNumber && <strong className="ml-1 text-amber-950">#{res.roomNumber}</strong>}
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] text-gray-400 bg-gray-50 border border-gray-200">
                              {tr("No Pass", "Sans pass", "Sin pase")}
                            </span>
                          )}

                          {res.tours.length > 0 ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg font-bold bg-blue-50 text-blue-900 border border-blue-200">
                              <Compass className="h-3.5 w-3.5 text-blue-600" />
                              <span>
                                {res.tours.map((t) => `${t.city} (${t.numPeople}p)`).join(", ")}
                              </span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] text-gray-400 bg-gray-50 border border-gray-200">
                              {tr("No Tours", "Sans excursion", "Sin tours")}
                            </span>
                          )}

                          {res.shuttle ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg font-bold bg-sky-50 text-sky-800 border border-sky-200">
                              <Bus className="h-3.5 w-3.5 text-sky-600" />
                              <span>
                                {res.shuttle.location} · {res.shuttle.cost} €
                              </span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] text-gray-400 bg-gray-50 border border-gray-200">
                              {tr("No Shuttle", "Sans navette", "Sin shuttle")}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
                        <button
                          type="button"
                          onClick={() => toggleExpand(res.id)}
                          className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                            isExpanded
                              ? "bg-[#13234d] text-white shadow-sm"
                              : "bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200"
                          }`}
                        >
                          <Info className="h-3.5 w-3.5" />
                          <span>{isExpanded ? tr("Hide details", "Masquer détails", "Ocultar") : tr("View details", "Voir détails", "Ver detalles")}</span>
                          {isExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                        </button>

                        {hasTicket && (
                          <a
                            href={ticketUrl(res.ticketCode)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-2 rounded-xl bg-amber-100 text-amber-800 hover:bg-amber-200 transition shadow-2xs"
                            title={tr(
                              `Open ticket #${res.ticketCode}`,
                              `Ouvrir le billet #${res.ticketCode}`,
                              `Abrir entrada #${res.ticketCode}`
                            )}
                          >
                            <QrCode className="h-4 w-4" />
                          </a>
                        )}

                        {res.status === "checked-in" ? (
                          <span
                            className={`px-3 py-1.5 rounded-full text-[10px] tracking-widest uppercase font-bold border ${statusStyles["checked-in"]}`}
                          >
                            {tr("Checked In", "Enregistré", "Registrado")}
                          </span>
                        ) : (
                          <select
                            value={res.status}
                            onChange={(e) =>
                              changeUnifiedStatus(res, e.target.value as BookingStatus)
                            }
                            className={`appearance-none rounded-full px-3 py-1.5 text-[10px] tracking-widest uppercase font-bold border cursor-pointer focus:outline-none ${statusStyles[res.status] ?? statusStyles.pending}`}
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

                    {isExpanded && (
                      <div className="border-t border-gray-200 bg-slate-50/90 p-4 sm:p-6 text-xs text-gray-700 space-y-4">
                        <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-3.5">
                          <div className="bg-white p-3.5 rounded-xl border border-gray-200 shadow-2xs space-y-1.5">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 block">
                              {tr("Hotel & Accommodation", "Hébergement & Chambre", "Alojamiento y Habitación")}
                            </span>
                            {res.festivalLabel ? (
                              <>
                                <p className="font-bold text-gray-900 text-sm flex items-center gap-1.5">
                                  <Bed className="h-4 w-4 text-amber-600 shrink-0" />
                                  <span>{res.festivalLabel}</span>
                                </p>
                                <p className="text-gray-600">
                                  {res.nights ? `${res.nights} ${tr("Nights Stay", "Nuits", "Noches")}` : tr("Pass Duration", "Pass", "Pase")}
                                  {res.arrivalDate && res.departureDate ? ` · ${new Date(res.arrivalDate).toLocaleDateString()} → ${new Date(res.departureDate).toLocaleDateString()}` : ""}
                                </p>
                                <p className="text-gray-500">
                                  {tr("Pass Price:", "Prix Pass :", "Precio Pase:")} <strong className="text-gray-900">{res.festivalNetPrice} €</strong>
                                  {res.festivalDiscount > 0 && <span className="ml-1 text-emerald-700 font-semibold">(-{res.festivalDiscount} €)</span>}
                                </p>
                                {res.roomNumber && (
                                  <p className="font-bold text-amber-900 inline-block bg-amber-50 px-2 py-0.5 rounded border border-amber-200 text-[11px]">
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

                          <div className="bg-white p-3.5 rounded-xl border border-blue-200 shadow-2xs space-y-1.5">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 block">
                              {tr("Cultural Excursions", "Excursions Culturelles", "Excursiones Culturales")}
                            </span>
                            {res.tours.length > 0 ? (
                              <div className="space-y-2">
                                {res.tours.map((t, tIdx) => (
                                  <div key={tIdx} className="bg-blue-50/60 p-2 rounded-lg border border-blue-200/80">
                                    <div className="flex items-center justify-between font-bold text-gray-900">
                                      <span>{t.tourName}</span>
                                      <span className="text-blue-900">{t.totalPrice} €</span>
                                    </div>
                                    <p className="text-[11px] text-gray-600 mt-0.5">
                                      {t.numPeople} {t.numPeople > 1 ? tr("passengers", "passagers", "pasajeros") : tr("passenger", "passager", "pasajero")} · {t.pricePerPerson} €/pers
                                      {" · "}<strong className="text-emerald-700">+{t.commission} € {tr("Commission", "Com.", "Com.")}</strong>
                                    </p>
                                  </div>
                                ))}
                                <p className="text-[11px] text-blue-900 font-semibold flex items-center gap-1">
                                  <MapPin className="h-3.5 w-3.5 text-blue-600" />
                                  <span>{tr("Pickup: Kenzi Solazur Lobby", "Départ : Hall Kenzi Solazur", "Salida: Lobby Kenzi Solazur")}</span>
                                </p>
                              </div>
                            ) : (
                              <p className="text-gray-400 italic mt-2">
                                {tr("No excursions booked", "Aucune excursion réservée", "Sin excursiones reservadas")}
                              </p>
                            )}
                          </div>

                          <div className="bg-white p-3.5 rounded-xl border border-sky-200 shadow-2xs space-y-1.5">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-sky-600 block">
                              {tr("Shuttle Transfer", "Transfert Navette", "Traslado Shuttle")}
                            </span>
                            {res.shuttle ? (
                              <>
                                <p className="font-bold text-sky-950 flex items-center gap-1.5">
                                  <Bus className="h-4 w-4 text-sky-600 shrink-0" />
                                  <span>{res.shuttle.location}</span>
                                </p>
                                <p className="text-sky-800 font-semibold">
                                  {formatTransferOptionLabel(res.shuttle.option, L)} · {res.shuttle.cost} €
                                </p>
                                {res.shuttle.details && (
                                  <p className="mt-1 text-[11px] text-sky-950 bg-sky-50 p-1.5 rounded border border-sky-200 font-mono">
                                    {res.shuttle.details}
                                  </p>
                                )}
                              </>
                            ) : (
                              <p className="text-gray-400 italic mt-2">
                                {tr("No transfer booked", "Aucun transfert sélectionné", "Sin traslado seleccionado")}
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-2xs space-y-2.5">
                          <div className="flex items-center justify-between gap-3 flex-wrap">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                              {tr("Full Guest List & Contacts", "Liste des participants & Coordonnées", "Lista de participantes y Contactos")}
                            </span>
                            <div className="flex items-center gap-4 text-xs text-gray-600 flex-wrap">
                              {res.email && (
                                <a href={`mailto:${res.email}`} className="flex items-center gap-1 hover:text-amber-700 transition">
                                  <Mail className="h-3.5 w-3.5 text-gray-400" />
                                  <span>{res.email}</span>
                                </a>
                              )}
                              {res.phone && (
                                <a href={`tel:${res.phone}`} className="flex items-center gap-1 hover:text-amber-700 transition">
                                  <Phone className="h-3.5 w-3.5 text-gray-400" />
                                  <span>{res.phone}</span>
                                </a>
                              )}
                              {res.country && (
                                <span className="inline-flex items-center gap-1 text-gray-500">
                                  <span>🌍 {res.country}</span>
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="flex flex-wrap gap-2 pt-1">
                            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-50 text-amber-950 font-bold text-xs border border-amber-200">
                              <span className="text-[10px] uppercase tracking-wider text-amber-700 font-black">
                                {tr("1st Guest (Lead):", "1er Invité (Principal) :", "1er Huésped (Principal):")}
                              </span>
                              <span>{res.guest1}</span>
                            </span>

                            {res.guest2 && (
                              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-50 text-indigo-950 font-bold text-xs border border-indigo-200">
                                <span className="text-[10px] uppercase tracking-wider text-indigo-700 font-black">
                                  {tr("2nd Guest (Room):", "2ème Invité (Chambre) :", "2º Huésped (Habitación):")}
                                </span>
                                <span>{res.guest2}</span>
                              </span>
                            )}

                            {res.allGuests.slice(2).map((gName, gIdx) => (
                              <span
                                key={gIdx}
                                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-gray-100 text-gray-800 font-semibold text-xs border border-gray-200"
                              >
                                <Users className="h-3 w-3 text-gray-500" />
                                <span>{gName}</span>
                              </span>
                            ))}
                          </div>

                          {/* Notes */}
                          {res.allNotes.length > 0 && (
                            <div className="pt-2 border-t border-gray-100">
                              <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block mb-0.5">
                                {tr("Notes & Remarks:", "Notes & Remarques :", "Notas y Observaciones:")}
                              </span>
                              <div className="space-y-1">
                                {res.allNotes.map((note, nIdx) => (
                                  <p key={nIdx} className="text-xs text-gray-600 italic bg-gray-50 p-2 rounded-lg border border-gray-100">
                                    {note}
                                  </p>
                                ))}
                              </div>
                            </div>
                          )}
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
