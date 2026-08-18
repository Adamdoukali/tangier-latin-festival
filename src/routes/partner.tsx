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
  type Collaborator,
  type Pack,
  type Booking,
  type BookingStatus,
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
              <div className="flex items-center justify-end">
                <button type="button" onClick={onCancel} className="text-xs font-semibold text-blue-600 hover:text-blue-800 transition cursor-pointer">
                  {tr("Cancel", "Annuler", "Cancelar")}
                </button>
              </div>
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

// ─── Portal ───────────────────────────────────────────────────────────

function Portal({ partner, onSignOut }: { partner: Collaborator; onSignOut: () => void }) {
  const L = partner.language ?? "en";
  const tr = (en: string, fr: string, es: string) =>
    L === "fr" ? fr : L === "es" ? es : en;

  const [activeSection, setActiveSection] = useState<"festival" | "tourism" | "shuttle">("festival");
  const [expandedBookings, setExpandedBookings] = useState<Record<string, boolean>>({});
  const toggleExpand = (id: string) => setExpandedBookings((prev) => ({ ...prev, [id]: !prev[id] }));
  const [allPacks, setAllPacks] = useState<Pack[]>([]);
  const [myBookings, setMyBookings] = useState<Booking[]>([]);
  const [allFestivalBookings, setAllFestivalBookings] = useState<Booking[]>([]);
  const [ticketsSold, setTicketsSold] = useState(0);
  const [sales, setSales] = useState<Money>(emptyMoney());
  const [earned, setEarned] = useState<Money>(emptyMoney());
  const [statusError, setStatusError] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [refQr, setRefQr] = useState("");
  const [tourismQr, setTourismQr] = useState("");

  const reload = useCallback(async () => {
    const [packs, allBookings, discounts] = await Promise.all([getPacks(), getBookings(), getDiscountCodes()]);
    setAllPacks(packs);
    const festBookings = allBookings.filter((b) => !isTourismBooking(b));
    setAllFestivalBookings(festBookings);

    const mine = allBookings
      .filter((b) => {
        if (b.collaboratorId === partner.id) return true;
        // Auto-match unassigned tourism bookings from this partner's festival clients
        if (isTourismBooking(b) && !b.collaboratorId) {
          const matchedFestival = festBookings.find((fb) => {
            if (fb.collaboratorId !== partner.id) return false;
            const fbPhone = normalizePhone(fb.phone);
            const bPhone = normalizePhone(b.phone);
            if (fbPhone.length >= 6 && bPhone.length >= 6 && (fbPhone.endsWith(bPhone.slice(-8)) || bPhone.endsWith(fbPhone.slice(-8)))) return true;
            if (fb.email && b.email && fb.email.toLowerCase() === b.email.toLowerCase()) return true;
            const fbName = fb.customerName.toLowerCase().trim();
            const bName = b.customerName.toLowerCase().trim();
            if (fbName && bName && (fbName === bName || fbName.includes(bName) || bName.includes(fbName))) return true;
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
    setSales(collaboratorRevenue(partner.id, mine, packs));
    setEarned(collaboratorCommission(partner, mine, packs, discounts));
  }, [partner]);

  const changeBookingStatus = async (id: string, status: BookingStatus) => {
    setStatusError("");
    let updated: Booking | null = null;
    try {
      updated = await updateBookingStatus(id, status);
    } catch (e) {
      setStatusError(e instanceof Error ? e.message : String(e));
    }
    await reload();

    // Confirming automatically sends the guest their ticket (QR page with
    // the names and details they filled in) — in the guest's own language.
    if (status === "confirmed" && updated?.email) {
      const bLang = ((updated.lang || partner.language || "en") as "en" | "fr" | "es");
      const tUrl = ticketUrl(updated.ticketCode) + (bLang !== "en" ? `&lang=${bLang}` : "");
      const mail = ticketConfirmationEmail({
        customerName: updated.customerName,
        packName: translateDynamicText(updated.packName, bLang),
        ticketCode: updated.ticketCode,
        numPeople: updated.numPeople || 1,
        ticketUrl: tUrl,
        lang: bLang,
        guests: updated.customerName.split(/\s*&\s*/),
        arrivalDate: updated.arrivalDate,
        departureDate: updated.departureDate,
      });
      sendFormNotification({
        subject: `Ticket confirmed: ${updated.customerName} (${updated.ticketCode})`,
        guestSubject: mail.subject,
        lang: bLang,
        ticket: { code: updated.ticketCode, url: tUrl },
        fields: {
          name: updated.customerName,
          email: updated.email,
          Ticket: tUrl,
          Code: updated.ticketCode,
          Pack: updated.packName,
          "Confirmed by partner": partner.name,
        },
        autoresponse: mail.body,
      }).catch(() => {});
    }
  };

  useEffect(() => {
    reload();
  }, [reload]);

  // Booking-link QR (guests scan it, choose their pack, request a booking)
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
    pending: "bg-amber-100 text-amber-600 border-amber-200",
    confirmed: "bg-emerald-100 text-emerald-600 border-emerald-200",
    "checked-in": "bg-cyan-100 text-cyan-700 border-cyan-200",
    declined: "bg-red-100 text-red-600 border-red-200",
  };

  const festivalBookings = myBookings.filter((b) => !isTourismBooking(b));
  const tourismBookings = myBookings.filter((b) => isTourismBooking(b));

  const activeTourism = tourismBookings.filter((b) => b.status !== "declined");
  const tourismGuests = activeTourism.reduce((sum, b) => sum + (b.numPeople || 1), 0);
  const tourismSales = activeTourism.reduce((sum, b) => sum + getTourismPrice(b.packId || b.packName) * (b.numPeople || 1), 0);
  const tourismCommissions = activeTourism.reduce((sum, b) => sum + (b.numPeople || 1) * 5, 0);

  // Tourism Destination Breakdown
  const tangierTourGuests = activeTourism
    .filter((b) => (b.packId?.includes("tangier") || b.packName?.toLowerCase().includes("tangier")))
    .reduce((sum, b) => sum + (b.numPeople || 1), 0);

  const asilahTourGuests = activeTourism
    .filter((b) => (b.packId?.includes("asilah") || b.packName?.toLowerCase().includes("asilah") || b.packName?.toLowerCase().includes("asella")))
    .reduce((sum, b) => sum + (b.numPeople || 1), 0);

  const chefchaouenTourGuests = activeTourism
    .filter((b) => (b.packId?.includes("chefchaouen") || b.packName?.toLowerCase().includes("chefchaouen") || b.packName?.toLowerCase().includes("chawan") || b.packName?.toLowerCase().includes("chaouen")))
    .reduce((sum, b) => sum + (b.numPeople || 1), 0);

  // Shuttle Transfer Calculations
  const shuttleBookings = myBookings.filter(
    (b) => b.needsTransfer || !!b.transferType || (b.transferCost && b.transferCost > 0)
  );
  const activeShuttle = shuttleBookings.filter((b) => b.status !== "declined");
  const shuttlePassengers = activeShuttle.reduce((sum, b) => sum + (b.numPeople || 1), 0);
  const shuttleRevenue = activeShuttle.reduce((sum, b) => sum + (b.transferCost || 0), 0);
  const portShuttleGuests = activeShuttle
    .filter((b) => b.transferType === "port")
    .reduce((sum, b) => sum + (b.numPeople || 1), 0);
  const airportShuttleGuests = activeShuttle
    .filter((b) => b.transferType === "airport")
    .reduce((sum, b) => sum + (b.numPeople || 1), 0);

  return (
    <div
      className="min-h-screen bg-slate-100 text-gray-900 notranslate"
      translate="no"
      style={{ fontFamily: "'Poppins','Segoe UI',system-ui,sans-serif" }}
    >
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap');`}</style>

      {/* Header — classic navy bar */}
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

        {/* ═══════════════════════════════════════════════════════════════ */}
        {/* 1. ALL-IN-ONE PERFORMANCE KPI CARDS                             */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        <div className="space-y-4">
          {/* Main Festival Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {(() => {
              const live = festivalBookings.filter((b) => b.status !== "declined");
              const catOf = (b: Booking) => {
                const p = allPacks.find((x) => x.id === b.packId);
                return packRoomCategory(p || b.packName, b.numPeople);
              };
              return [
                {
                  label: tr("Double Rooms", "Chambres doubles", "Habitaciones dobles"),
                  value: live.filter((b) => catOf(b) === "double").length,
                  icon: Ticket,
                  color: "text-amber-600",
                },
                {
                  label: tr("Single Rooms", "Chambres single", "Habitaciones individuales"),
                  value: live.filter((b) => catOf(b) === "single").length,
                  icon: Ticket,
                  color: "text-amber-600",
                },
                {
                  label: tr("Full Pass", "Full Pass", "Full Pass"),
                  value: live.filter((b) => catOf(b) === "fullpass").length,
                  icon: CheckCircle2,
                  color: "text-emerald-600",
                },
                {
                  label: tr("Festival Sales", "Ventes Festival", "Ventas Festival"),
                  value: formatForPartner(sales, partner),
                  icon: Euro,
                  color: "text-blue-600",
                },
                {
                  label: `Commission (${commissionLabel(partner)})`,
                  value: formatForPartner(earned, partner),
                  icon: Euro,
                  color: "text-amber-600",
                },
              ];
            })().map((s) => (
              <div
                key={s.label}
                className="rounded-xl border border-gray-200 bg-white shadow-xs p-4"
              >
                <div className="flex items-center justify-between">
                  <p className="text-[10px] tracking-widest uppercase text-gray-500 font-bold">{s.label}</p>
                  <s.icon className={`h-4 w-4 ${s.color}`} />
                </div>
                <p className="mt-1.5 font-display text-2xl font-black text-slate-900">{s.value}</p>
              </div>
            ))}
          </div>

          {/* Excursions & Shuttle KPI Breakdown Banner */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <div className="rounded-xl border border-cyan-200 bg-cyan-50/60 p-3.5 shadow-xs">
              <div className="flex items-center justify-between text-cyan-800">
                <p className="text-[10px] font-bold uppercase tracking-wider">Asilah Tour</p>
                <MapPin className="h-3.5 w-3.5 text-cyan-600" />
              </div>
              <p className="mt-1 font-display text-xl font-black text-cyan-900">{asilahTourGuests}</p>
              <span className="text-[10px] text-cyan-700 font-medium">25 € / {tr("pers.", "pers.", "pers.")}</span>
            </div>

            <div className="rounded-xl border border-blue-200 bg-blue-50/60 p-3.5 shadow-xs">
              <div className="flex items-center justify-between text-blue-800">
                <p className="text-[10px] font-bold uppercase tracking-wider">Tangier Tour</p>
                <MapPin className="h-3.5 w-3.5 text-blue-600" />
              </div>
              <p className="mt-1 font-display text-xl font-black text-blue-900">{tangierTourGuests}</p>
              <span className="text-[10px] text-blue-700 font-medium">15 € / {tr("pers.", "pers.", "pers.")}</span>
            </div>

            <div className="rounded-xl border border-indigo-200 bg-indigo-50/60 p-3.5 shadow-xs">
              <div className="flex items-center justify-between text-indigo-800">
                <p className="text-[10px] font-bold uppercase tracking-wider">Chefchaouen</p>
                <MapPin className="h-3.5 w-3.5 text-indigo-600" />
              </div>
              <p className="mt-1 font-display text-xl font-black text-indigo-900">{chefchaouenTourGuests}</p>
              <span className="text-[10px] text-indigo-700 font-medium">30 € / {tr("pers.", "pers.", "pers.")}</span>
            </div>

            <div className="rounded-xl border border-emerald-300 bg-emerald-50/70 p-3.5 shadow-xs">
              <div className="flex items-center justify-between text-emerald-900">
                <p className="text-[10px] font-bold uppercase tracking-wider">{tr("Excursion Comm.", "Com. Tourisme", "Com. Turismo")}</p>
                <Euro className="h-3.5 w-3.5 text-emerald-600" />
              </div>
              <p className="mt-1 font-display text-xl font-black text-emerald-800">+{tourismCommissions} €</p>
              <span className="text-[10px] text-emerald-600 font-semibold">5 € / {tr("guest", "passager", "pasajero")}</span>
            </div>

            <div className="rounded-xl border border-sky-200 bg-sky-50/60 p-3.5 shadow-xs">
              <div className="flex items-center justify-between text-sky-900">
                <p className="text-[10px] font-bold uppercase tracking-wider">{tr("Shuttle Bus", "Navette Bus", "Bus Shuttle")}</p>
                <Bus className="h-3.5 w-3.5 text-sky-600" />
              </div>
              <p className="mt-1 font-display text-xl font-black text-sky-900">{shuttlePassengers}</p>
              <span className="text-[10px] text-sky-700 font-medium">{portShuttleGuests} Port · {airportShuttleGuests} Air</span>
            </div>

            <div className="rounded-xl border border-sky-300 bg-gradient-to-br from-sky-500 to-blue-600 text-white p-3.5 shadow-xs">
              <div className="flex items-center justify-between text-sky-100">
                <p className="text-[10px] font-black uppercase tracking-wider">{tr("Transfer Money", "Total Transfert", "Total Traslado")}</p>
                <Euro className="h-3.5 w-3.5 text-white" />
              </div>
              <p className="mt-1 font-display text-xl font-black text-white">{shuttleRevenue} €</p>
              <span className="text-[10px] text-sky-100 font-bold">{shuttleBookings.length} {tr("bookings", "réservations", "reservas")}</span>
            </div>
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════════════ */}
        {/* 2. BONUS MISSION                                                */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        {(partner.missionGoal ?? 0) > 0 &&
          (() => {
            const goal = partner.missionGoal!;
            const progress = Math.min(ticketsSold, goal);
            const achieved = ticketsSold >= goal;
            const reward = formatMoney(partner.missionReward ?? 0, partner.missionCurrency);
            return (
              <div
                className={`rounded-xl border p-5 ${
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

        {/* ═══════════════════════════════════════════════════════════════ */}
        {/* 3. SELLING REFERRAL LINKS                                       */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        <div className="space-y-4">
          {/* Main Packs Booking Link */}
          <div className="rounded-2xl border border-gray-200 bg-white shadow-sm p-6 flex flex-col sm:flex-row gap-6 items-start">
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
                        : "bg-gray-100 text-gray-700 hover:bg-amber-500 hover:text-slate-950"
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
                  <a
                    href={getBookingUrl(partner.code, L)}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 px-3 py-2 rounded-xl text-xs text-gray-500 hover:text-gray-900 border border-gray-200 hover:bg-gray-50 transition"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    <span>{tr("Preview", "Aperçu", "Vista previa")}</span>
                  </a>
                </div>
              </div>
            </div>
            {refQr && (
              <div className="shrink-0 text-center mx-auto sm:mx-0">
                <div className="rounded-xl border border-gray-200 bg-white p-2.5 shadow-xs inline-block">
                  <img src={refQr} alt="Booking link QR" className="w-24 h-24" />
                </div>
                <p className="mt-1 text-[10px] text-gray-400 font-medium">
                  {tr("Packs QR Code", "QR Code Packs", "QR de Packs")}
                </p>
              </div>
            )}
          </div>

          {/* Tourism & Excursions Link (Special "Blue and Blue" Design) */}
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

                <h3 className="font-display text-lg font-extrabold text-white flex items-center gap-2">
                  <MapPin className="h-5 w-5 text-blue-300" />
                  {tr("Your Dedicated Tourism Link (/book-tourism)", "Votre lien de réservation Excursions (/book-tourism)", "Tu enlace de reserva de Turismo (/book-tourism)")}
                </h3>
                <p className="mt-1 text-xs text-blue-100 leading-relaxed max-w-xl">
                  {tr(
                    "Share this link with your clients for guided tours to Tangier (15 €), Asilah (25 €), and Chefchaouen (30 €). You automatically receive 5 € commission for every booked passenger.",
                    "Partagez ce lien avec vos clients pour les visites de Tanger (15 €), Asilah (25 €) et Chefchaouen (30 €). Vous touchez 5 € de commission par passager.",
                    "Comparte este enlace con tus clientes para tours a Tánger (15 €), Asilah (25 €) y Chefchaouen (30 €). Recibes 5 € de comisión por cada pasajero."
                  )}
                </p>

                <div className="mt-3 flex items-center gap-2.5 flex-wrap">
                  <div className="flex-1 min-w-[240px] rounded-xl bg-blue-950/70 border border-blue-400/40 px-3.5 py-2.5 text-xs font-mono text-blue-200 select-all break-all shadow-inner">
                    {getTourismBookingUrl(partner.code, L)}
                  </div>

                  <button
                    onClick={() => copy("tourism", getTourismBookingUrl(partner.code, L))}
                    className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition cursor-pointer shadow-lg ${
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
                    className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-bold text-blue-200 hover:text-white bg-blue-900/50 hover:bg-blue-800/80 border border-blue-400/30 transition cursor-pointer"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    <span>{tr("View Page", "Voir la page", "Ver página")}</span>
                  </a>
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
        {/* 4. FESTIVAL RESERVATIONS LIST                                   */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        <div className="pt-2">
          <div className="flex items-center justify-between gap-4 mb-3 flex-wrap">
            <div>
              <h3 className="font-display text-base font-bold text-gray-900 flex items-center gap-2">
                <Ticket className="h-4 w-4 text-amber-600" />
                <span>{tr("Festival Reservations", "Réservations Festival", "Reservas de Festival")}</span>
                <span className="px-2 py-0.5 rounded-full text-xs font-mono bg-gray-200 text-gray-800 font-bold">
                  {festivalBookings.length}
                </span>
              </h3>
              <p className="text-xs text-gray-500 mt-0.5">
                {tr(
                  "Here you will find hotel and pass reservations made through your link.",
                  "Vous trouverez ici les réservations d'hôtels et pass réalisées via votre lien.",
                  "Aquí encontrarás las reservas de hotel y pases realizadas a través de tu enlace."
                )}
              </p>
            </div>
          </div>

          {statusError && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 mb-3">
              <p className="text-sm text-red-700">{statusError}</p>
            </div>
          )}

          {festivalBookings.length === 0 ? (
            <div className="rounded-xl border border-gray-200 bg-white shadow-xs px-5 py-8 text-center text-xs text-gray-400">
              {tr(
                "No festival bookings yet — share your booking link to get started.",
                "Pas encore de réservations — partagez votre lien pour commencer.",
                "Aún no hay reservas — comparte tu enlace para empezar."
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {festivalBookings.map((b) => {
                const hasTicket = b.status === "confirmed" || b.status === "checked-in";
                const pack = allPacks.find((p) => p.id === b.packId);
                const label = translateDynamicText(
                  pack ? packLabel(pack) : b.packName,
                  L as Language
                );
                const unitPrice = pack ? parseInt(pack.price, 10) || 0 : 0;
                const currency = pack?.currency || "€";
                const numPeople = b.numPeople || 1;
                const grossTotal = unitPrice * numPeople;
                const discount = b.discountAmount || 0;
                const netTotal = Math.max(0, grossTotal - discount);

                const { guest1, guest2, allGuests } = extractGuests(b);
                const nights = getNights(b, pack);
                const isExpanded = !!expandedBookings[b.id];
                const hasTransfer = b.needsTransfer || !!b.transferType || (b.transferCost && b.transferCost > 0);
                const transferOptLabel =
                  b.transferOption === "one_way_arrival"
                    ? tr("Arrival", "Arrivée", "Llegada")
                    : b.transferOption === "one_way_departure"
                    ? tr("Departure", "Départ", "Salida")
                    : tr("Round Trip", "A/R", "I/V");

                return (
                  <div
                    key={b.id}
                    className="rounded-2xl border border-gray-200 bg-white shadow-xs overflow-hidden transition-all duration-200 hover:border-gray-300"
                  >
                    {/* Compact Summary Header Row */}
                    <div className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        {/* 1. First Guest & 2. Second Guest */}
                        <div className="flex items-center gap-2 flex-wrap text-sm">
                          <span className="font-bold text-gray-950 flex items-center gap-1.5">
                            <Users className="h-4 w-4 text-gray-500 shrink-0" />
                            <span>{guest1}</span>
                          </span>
                          {guest2 ? (
                            <span className="text-gray-600 font-medium">
                              · {tr("Guest 2:", "2ème participant :", "2º participante:")}{" "}
                              <strong className="text-gray-900 font-bold">{guest2}</strong>
                            </span>
                          ) : numPeople > 1 ? (
                            <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-xs font-semibold">
                              +{numPeople - 1} {tr("guest", "personne", "persona")}
                            </span>
                          ) : null}
                        </div>

                        {/* 3. Total Price & 4. Transfer */}
                        <div className="mt-2 flex items-center gap-2 flex-wrap text-xs">
                          {/* Total Price */}
                          <span className="inline-flex items-center px-2.5 py-1 rounded-lg font-black bg-amber-50 text-amber-900 border border-amber-200">
                            {tr("Total:", "Total :", "Total:")} {netTotal} {currency}
                          </span>

                          {/* Transfer */}
                          {hasTransfer ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg font-bold bg-sky-50 text-sky-800 border border-sky-200">
                              <Bus className="h-3.5 w-3.5 text-sky-600" />
                              <span>
                                {tr("Transfer:", "Transfert :", "Traslado:")} {b.transferCost || 0} € ({b.transferLocation || (b.transferType === "port" ? "Port" : "Airport")})
                              </span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-gray-400 bg-gray-50 border border-gray-200/60 font-medium">
                              {tr("No Transfer", "Sans transfert", "Sin traslado")}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Right side actions: View Details + Ticket + Status */}
                      <div className="flex items-center gap-2 shrink-0 flex-wrap">
                        <button
                          type="button"
                          onClick={() => toggleExpand(b.id)}
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                            isExpanded
                              ? "bg-blue-600 text-white shadow-sm"
                              : "bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200"
                          }`}
                        >
                          <Info className="h-3.5 w-3.5" />
                          <span>{isExpanded ? tr("Hide details", "Masquer détails", "Ocultar detalles") : tr("View details", "Voir détails", "Ver detalles")}</span>
                          {isExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                        </button>

                        {hasTicket && (
                          <a
                            href={ticketUrl(b.ticketCode)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 rounded-xl bg-amber-100 text-amber-700 hover:bg-amber-200 transition shadow-2xs"
                            title={tr(
                              `Open ticket ${b.ticketCode}`,
                              `Ouvrir le billet ${b.ticketCode}`,
                              `Abrir entrada ${b.ticketCode}`
                            )}
                          >
                            <QrCode className="h-4 w-4" />
                          </a>
                        )}

                        {b.status === "checked-in" ? (
                          <span
                            className={`px-3 py-1.5 rounded-full text-[10px] tracking-widest uppercase font-bold border ${statusStyles["checked-in"]}`}
                          >
                            {tr("Checked In", "Enregistré", "Registrado")}
                          </span>
                        ) : (
                          <select
                            value={b.status}
                            onChange={(e) =>
                              changeBookingStatus(b.id, e.target.value as BookingStatus)
                            }
                            className={`appearance-none rounded-full px-3 py-1.5 text-[10px] tracking-widest uppercase font-bold border cursor-pointer focus:outline-none ${statusStyles[b.status] ?? statusStyles.pending}`}
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

                    {/* Expandable Details Container */}
                    {isExpanded && (
                      <div className="border-t border-gray-100 bg-slate-50/80 p-4 sm:p-5 text-xs text-gray-700 space-y-3.5">
                        <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-3">
                          {/* Room / Pack Info */}
                          <div className="bg-white p-3 rounded-xl border border-gray-200/80 shadow-2xs">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block mb-1">
                              {tr("Pack & Room Type", "Pack & Type de Chambre", "Pack y Tipo de Habitación")}
                            </span>
                            <p className="font-bold text-gray-900 text-sm flex items-center gap-1.5">
                              <Bed className="h-4 w-4 text-amber-600 shrink-0" />
                              <span>{label}</span>
                            </p>
                            <p className="text-gray-500 mt-1">
                              {numPeople} {numPeople > 1 ? tr("guests", "personnes", "personas") : tr("guest", "personne", "persona")} · {unitPrice} {currency}/pers
                            </p>
                            {b.roomNumber && (
                              <p className="mt-1.5 font-bold text-amber-900 inline-block bg-amber-50 px-2 py-0.5 rounded border border-amber-200 text-[11px]">
                                {tr("Room #:", "Chambre N° :", "Habitación N°:")} {b.roomNumber}
                              </p>
                            )}
                          </div>

                          {/* Stay Duration / Nights */}
                          <div className="bg-white p-3 rounded-xl border border-gray-200/80 shadow-2xs">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block mb-1">
                              {tr("Duration & Dates", "Durée & Dates", "Duración y Fechas")}
                            </span>
                            <p className="font-bold text-gray-900 text-sm flex items-center gap-1.5">
                              <Moon className="h-4 w-4 text-indigo-600 shrink-0" />
                              <span>{nights ? `${nights} ${tr("Nights Stay", "Nuits sur place", "Noches de estancia")}` : tr("Pass Duration", "Durée Pass", "Duración Pase")}</span>
                            </p>
                            <p className="text-gray-500 mt-1">
                              {b.arrivalDate && b.departureDate
                                ? `${new Date(b.arrivalDate).toLocaleDateString()} → ${new Date(b.departureDate).toLocaleDateString()}`
                                : tr("Festival: Jan 07–11, 2027", "Festival : 07–11 Janv 2027", "Festival: 07–11 Enero 2027")}
                            </p>
                            <p className="text-[11px] text-gray-400 mt-1">
                              {tr("Booked on:", "Réservé le :", "Reservado el:")} {new Date(b.createdAt).toLocaleDateString()}
                            </p>
                          </div>

                          {/* Transfer Full Details */}
                          <div className="bg-white p-3 rounded-xl border border-gray-200/80 shadow-2xs">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block mb-1">
                              {tr("Shuttle Transfer Details", "Détails Navette", "Detalles Traslado")}
                            </span>
                            {hasTransfer ? (
                              <>
                                <p className="font-bold text-sky-950 flex items-center gap-1.5">
                                  <Bus className="h-4 w-4 text-sky-600 shrink-0" />
                                  <span>{b.transferLocation || (b.transferType === "port" ? "Port of Tangier" : "Tangier Airport")}</span>
                                </p>
                                <p className="text-sky-800 font-semibold mt-1">
                                  {transferOptLabel} · {b.transferCost || 0} €
                                </p>
                                {b.transferDetails && (
                                  <p className="mt-1 text-[11px] text-sky-900 bg-sky-50 p-1.5 rounded border border-sky-200 font-mono">
                                    {b.transferDetails}
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

                        {/* All Participants & Contacts */}
                        <div className="bg-white p-3 rounded-xl border border-gray-200/80 shadow-2xs space-y-2">
                          <div className="flex items-center justify-between gap-2 flex-wrap">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                              {tr("Full Guest List & Contacts", "Liste des participants & Contacts", "Lista de participantes y Contactos")}
                            </span>
                            <div className="flex items-center gap-3 text-xs text-gray-500">
                              {b.email && (
                                <span className="flex items-center gap-1">
                                  <Mail className="h-3.5 w-3.5 text-gray-400" />
                                  <span>{b.email}</span>
                                </span>
                              )}
                              {b.phone && (
                                <span className="flex items-center gap-1">
                                  <Phone className="h-3.5 w-3.5 text-gray-400" />
                                  <span>{b.phone}</span>
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex flex-wrap gap-2 pt-1">
                            {allGuests.map((gName, gIdx) => (
                              <span
                                key={gIdx}
                                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-gray-100 text-gray-800 font-semibold text-xs border border-gray-200"
                              >
                                <Users className="h-3 w-3 text-gray-500" />
                                <span>{gName}</span>
                              </span>
                            ))}
                          </div>
                          {b.notes && (
                            <div className="pt-2 border-t border-gray-100">
                              <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block mb-0.5">
                                {tr("Notes & Remarks:", "Notes & Remarques :", "Notas y Observaciones:")}
                              </span>
                              <p className="text-xs text-gray-600 italic bg-gray-50 p-2 rounded-lg border border-gray-100">
                                {b.notes}
                              </p>
                            </div>
                          )}
                          {b.discountCode && (
                            <p className="pt-1 text-[11px] font-semibold text-amber-800">
                              Promo: <code className="bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">{b.discountCode}</code> (-{b.discountAmount || 0} €)
                            </p>
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

        {/* ═══════════════════════════════════════════════════════════════ */}
        {/* 5. CULTURAL TOURISM & EXCURSIONS LIST                           */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        <div className="pt-4 border-t border-gray-200">
          <div className="flex items-center justify-between gap-4 mb-3 flex-wrap">
            <div>
              <h3 className="font-display text-base font-bold text-gray-900 flex items-center gap-2">
                <Compass className="h-4 w-4 text-blue-600" />
                <span>{tr("Cultural Excursions & Tours", "Excursions Touristiques", "Excursiones Turísticas")}</span>
                <span className="px-2 py-0.5 rounded-full text-xs font-mono bg-blue-100 text-blue-900 font-bold">
                  {tourismBookings.length}
                </span>
              </h3>
              <p className="text-xs text-gray-500 mt-0.5">
                {tr(
                  "Guided tour bookings (Asilah, Tangier, Chefchaouen) with commission breakdown (5 € / passenger).",
                  "Réservations de visites guidées (Asilah, Tanger, Chefchaouen) avec commission de 5 € / passager.",
                  "Reservas de tours guiados (Asilah, Tánger, Chefchaouen) con comisión de 5 € / pasajero."
                )}
              </p>
            </div>
          </div>

          {tourismBookings.length === 0 ? (
            <div className="rounded-xl border border-gray-200 bg-white shadow-xs px-5 py-8 text-center text-xs text-gray-400">
              {tr(
                "No excursion bookings yet — share your tourism link to start earning €5 per passenger.",
                "Pas encore d'excursions réservées — partagez votre lien pour commencer à gagner 5 € par passager.",
                "Aún no hay excursiones reservadas — comparte tu enlace para ganar 5 € por pasajero."
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {tourismBookings.map((b) => {
                const hasTicket = b.status === "confirmed" || b.status === "checked-in";
                const numPeople = b.numPeople || 1;
                const unitPrice = getTourismPrice(b.packId || b.packName);
                const grossTotal = unitPrice * numPeople;
                const commissionAmt = numPeople * 5;

                const { guest1, guest2, allGuests } = extractGuests(b);
                const isExpanded = !!expandedBookings[b.id];

                // Look for matched festival booking
                const matchedFest = allFestivalBookings.find((fb) => {
                  if (b.notes?.includes(fb.ticketCode)) return true;
                  const fbPhone = (fb.phone || "").replace(/\D/g, "");
                  const bPhone = (b.phone || "").replace(/\D/g, "");
                  if (fbPhone.length >= 6 && bPhone.length >= 6 && (fbPhone.endsWith(bPhone.slice(-8)) || bPhone.endsWith(fbPhone.slice(-8)))) return true;
                  if (fb.email && b.email && fb.email.toLowerCase() === b.email.toLowerCase()) return true;
                  return false;
                });

                return (
                  <div
                    key={b.id}
                    className="rounded-2xl border border-blue-200/90 bg-white shadow-xs overflow-hidden transition-all duration-200 hover:border-blue-300"
                  >
                    {/* Compact Header Summary Row */}
                    <div className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        {/* 1. First Guest & 2. Second Guest */}
                        <div className="flex items-center gap-2 flex-wrap text-sm">
                          <span className="font-bold text-gray-950 flex items-center gap-1.5">
                            <Users className="h-4 w-4 text-gray-500 shrink-0" />
                            <span>{guest1}</span>
                          </span>
                          {guest2 ? (
                            <span className="text-gray-600 font-medium">
                              · {tr("Guest 2:", "2ème participant :", "2º participante:")}{" "}
                              <strong className="text-gray-900 font-bold">{guest2}</strong>
                            </span>
                          ) : numPeople > 1 ? (
                            <span className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-800 text-xs font-semibold">
                              +{numPeople - 1} {tr("guest", "personne", "persona")}
                            </span>
                          ) : null}
                        </div>

                        {/* 3. Destination & 4. Total Price & Commission */}
                        <div className="mt-2 flex items-center gap-2 flex-wrap text-xs">
                          <span className="inline-flex items-center px-2.5 py-1 rounded-lg font-bold bg-blue-50 text-blue-900 border border-blue-200">
                            <Compass className="h-3.5 w-3.5 text-blue-600 mr-1" />
                            <span>{b.packName}</span>
                          </span>
                          <span className="inline-flex items-center px-2.5 py-1 rounded-lg font-extrabold bg-amber-50 text-amber-900 border border-amber-200">
                            {grossTotal} €
                          </span>
                          <span className="inline-flex items-center px-2.5 py-1 rounded-lg font-black bg-emerald-50 text-emerald-800 border border-emerald-200">
                            +{commissionAmt} € {tr("Commission", "Commission", "Comisión")}
                          </span>
                        </div>
                      </div>

                      {/* Right side actions: View Details + Ticket + Status */}
                      <div className="flex items-center gap-2 shrink-0 flex-wrap">
                        <button
                          type="button"
                          onClick={() => toggleExpand(b.id)}
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                            isExpanded
                              ? "bg-blue-600 text-white shadow-sm"
                              : "bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200"
                          }`}
                        >
                          <Info className="h-3.5 w-3.5" />
                          <span>{isExpanded ? tr("Hide details", "Masquer détails", "Ocultar detalles") : tr("View details", "Voir détails", "Ver detalles")}</span>
                          {isExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                        </button>

                        {hasTicket && (
                          <a
                            href={ticketUrl(b.ticketCode)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 rounded-xl bg-blue-100 text-blue-700 hover:bg-blue-200 transition shadow-2xs"
                            title={tr(
                              `Open ticket ${b.ticketCode}`,
                              `Ouvrir le billet ${b.ticketCode}`,
                              `Abrir entrada ${b.ticketCode}`
                            )}
                          >
                            <QrCode className="h-4 w-4" />
                          </a>
                        )}

                        {b.status === "checked-in" ? (
                          <span
                            className={`px-3 py-1.5 rounded-full text-[10px] tracking-widest uppercase font-bold border ${statusStyles["checked-in"]}`}
                          >
                            {tr("Checked In", "Enregistré", "Registrado")}
                          </span>
                        ) : (
                          <select
                            value={b.status}
                            onChange={(e) =>
                              changeBookingStatus(b.id, e.target.value as BookingStatus)
                            }
                            className={`appearance-none rounded-full px-3 py-1.5 text-[10px] tracking-widest uppercase font-bold border cursor-pointer focus:outline-none ${statusStyles[b.status] ?? statusStyles.pending}`}
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

                    {/* Expandable Details Container */}
                    {isExpanded && (
                      <div className="border-t border-blue-100 bg-blue-50/40 p-4 sm:p-5 text-xs text-gray-700 space-y-3.5">
                        <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-3">
                          {/* Excursion & Rate */}
                          <div className="bg-white p-3 rounded-xl border border-blue-200/80 shadow-2xs">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-blue-500 block mb-1">
                              {tr("Excursion & Rate", "Excursion & Tarif", "Excursión y Tarifa")}
                            </span>
                            <p className="font-bold text-gray-900 text-sm">{b.packName}</p>
                            <p className="text-gray-500 mt-1">
                              {numPeople} {numPeople > 1 ? tr("passengers", "passagers", "pasajeros") : tr("passenger", "passager", "pasajero")} · {unitPrice} €/pers
                            </p>
                            <p className="text-emerald-700 font-bold mt-1 text-[11px]">
                              {tr("Partner Commission:", "Commission Partenaire :", "Comisión Colaborador:")} {commissionAmt} € (5 € / pers)
                            </p>
                          </div>

                          {/* Pickup & Location */}
                          <div className="bg-white p-3 rounded-xl border border-blue-200/80 shadow-2xs">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-blue-500 block mb-1">
                              {tr("Pickup Location", "Lieu de départ", "Lugar de salida")}
                            </span>
                            <p className="font-bold text-gray-900 text-sm flex items-center gap-1.5">
                              <MapPin className="h-4 w-4 text-blue-600 shrink-0" />
                              <span>Hotel Kenzi Solazur Lobby</span>
                            </p>
                            {b.roomNumber && (
                              <p className="mt-1.5 text-blue-900 font-bold bg-blue-50 px-2 py-0.5 rounded border border-blue-200 text-[11px]">
                                {tr("Hotel Room:", "Chambre :", "Habitación:")} #{b.roomNumber}
                              </p>
                            )}
                          </div>

                          {/* Linked Festival Pass */}
                          <div className="bg-white p-3 rounded-xl border border-blue-200/80 shadow-2xs">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-blue-500 block mb-1">
                              {tr("Linked Pass", "Pass Lié", "Pase Vinculado")}
                            </span>
                            {matchedFest ? (
                              <>
                                <p className="font-bold text-emerald-900 flex items-center gap-1.5">
                                  <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                                  <span>#{matchedFest.ticketCode}</span>
                                </p>
                                <p className="text-gray-600 text-[11px] mt-1 truncate">
                                  {matchedFest.packName}
                                </p>
                              </>
                            ) : (
                              <p className="text-gray-400 italic mt-2">
                                {tr("Direct booking", "Réservation directe", "Reserva directa")}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Guest List & Contacts */}
                        <div className="bg-white p-3 rounded-xl border border-blue-200/80 shadow-2xs space-y-2">
                          <div className="flex items-center justify-between gap-2 flex-wrap">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                              {tr("Full Guest List & Contacts", "Liste des participants & Contacts", "Lista de participantes y Contactos")}
                            </span>
                            <div className="flex items-center gap-3 text-xs text-gray-500">
                              {b.email && (
                                <span className="flex items-center gap-1">
                                  <Mail className="h-3.5 w-3.5 text-gray-400" />
                                  <span>{b.email}</span>
                                </span>
                              )}
                              {b.phone && (
                                <span className="flex items-center gap-1">
                                  <Phone className="h-3.5 w-3.5 text-gray-400" />
                                  <span>{b.phone}</span>
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex flex-wrap gap-2 pt-1">
                            {allGuests.map((gName, gIdx) => (
                              <span
                                key={gIdx}
                                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-50 text-blue-900 font-semibold text-xs border border-blue-200"
                              >
                                <Users className="h-3 w-3 text-blue-500" />
                                <span>{gName}</span>
                              </span>
                            ))}
                          </div>
                          {b.notes && (
                            <div className="pt-2 border-t border-gray-100">
                              <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block mb-0.5">
                                {tr("Notes & Remarks:", "Notes & Remarques :", "Notas y Observaciones:")}
                              </span>
                              <p className="text-xs text-gray-600 italic bg-gray-50 p-2 rounded-lg border border-gray-100">
                                {b.notes}
                              </p>
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

        {/* ═══════════════════════════════════════════════════════════════ */}
        {/* 6. SHUTTLE BUS & AIRPORT / PORT TRANSFERS LIST                  */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        <div className="pt-4 border-t border-gray-200">
          <div className="flex items-center justify-between gap-4 mb-3 flex-wrap">
            <div>
              <h3 className="font-display text-base font-bold text-gray-900 flex items-center gap-2">
                <Bus className="h-4 w-4 text-sky-600" />
                <span>{tr("Shuttle Bus & Transfers", "Navettes Bus & Transferts", "Shuttle Bus y Traslados")}</span>
                <span className="px-2 py-0.5 rounded-full text-xs font-mono bg-sky-100 text-sky-900 font-bold">
                  {shuttleBookings.length}
                </span>
              </h3>
              <p className="text-xs text-gray-500 mt-0.5">
                {tr(
                  "Airport & Port shuttle pickups with arrival/departure flight schedules.",
                  "Navettes aéroport et port avec les horaires de vol et de bateau.",
                  "Traslados de aeropuerto y puerto con horarios de vuelo y barco."
                )}
              </p>
            </div>
          </div>

          {shuttleBookings.length === 0 ? (
            <div className="rounded-xl border border-gray-200 bg-white shadow-xs px-5 py-8 text-center text-xs text-gray-400">
              {tr(
                "No shuttle requests from your clients yet.",
                "Aucune demande de navette pour l'instant.",
                "Aún no hay solicitudes de shuttle de tus clientes."
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {shuttleBookings.map((b) => {
                const isPort = b.transferType === "port";
                const hubName = b.transferLocation || (isPort ? "Port of Tangier (Tanger Ville)" : "Tangier Airport (TNG)");
                const optLabel =
                  b.transferOption === "one_way_arrival"
                    ? tr("One Way (Arrival)", "Aller simple (Arrivée)", "Solo ida (Llegada)")
                    : b.transferOption === "one_way_departure"
                    ? tr("One Way (Departure)", "Aller simple (Départ)", "Solo ida (Salida)")
                    : tr("Round Trip (A/R)", "Aller-Retour (A/R)", "Ida y Vuelta (I/V)");

                const { guest1, guest2, allGuests } = extractGuests(b);
                const isExpanded = !!expandedBookings[b.id];

                return (
                  <div
                    key={b.id}
                    className="rounded-2xl border border-sky-200 bg-white shadow-xs overflow-hidden transition-all duration-200 hover:border-sky-300"
                  >
                    {/* Compact Header Summary Row */}
                    <div className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        {/* 1. First Guest & 2. Second Guest */}
                        <div className="flex items-center gap-2 flex-wrap text-sm">
                          <span className="font-bold text-gray-950 flex items-center gap-1.5">
                            <Users className="h-4 w-4 text-gray-500 shrink-0" />
                            <span>{guest1}</span>
                          </span>
                          {guest2 ? (
                            <span className="text-gray-600 font-medium">
                              · {tr("Guest 2:", "2ème participant :", "2º participante:")}{" "}
                              <strong className="text-gray-900 font-bold">{guest2}</strong>
                            </span>
                          ) : (b.numPeople || 1) > 1 ? (
                            <span className="px-2 py-0.5 rounded-md bg-sky-50 text-sky-800 text-xs font-semibold">
                              +{(b.numPeople || 1) - 1} {tr("guest", "personne", "persona")}
                            </span>
                          ) : null}
                        </div>

                        {/* 3. Transfer & 4. Total Price */}
                        <div className="mt-2 flex items-center gap-2 flex-wrap text-xs">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg font-bold ${
                            isPort ? "bg-blue-50 text-blue-800 border border-blue-200" : "bg-indigo-50 text-indigo-800 border border-indigo-200"
                          }`}>
                            {isPort ? <Ship className="h-3.5 w-3.5" /> : <Plane className="h-3.5 w-3.5" />}
                            <span>{hubName}</span>
                          </span>
                          <span className="inline-flex items-center px-2.5 py-1 rounded-lg font-bold bg-slate-100 text-slate-800">
                            {optLabel}
                          </span>
                          <span className="inline-flex items-center px-2.5 py-1 rounded-lg font-black bg-emerald-50 text-emerald-800 border border-emerald-200">
                            {b.transferCost || 0} € {tr("Transfer", "Transfert", "Traslado")}
                          </span>
                        </div>
                      </div>

                      {/* Right side actions: View Details + Status */}
                      <div className="flex items-center gap-2 shrink-0 flex-wrap">
                        <button
                          type="button"
                          onClick={() => toggleExpand(b.id)}
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                            isExpanded
                              ? "bg-sky-600 text-white shadow-sm"
                              : "bg-sky-50 hover:bg-sky-100 text-sky-700 border border-sky-200"
                          }`}
                        >
                          <Info className="h-3.5 w-3.5" />
                          <span>{isExpanded ? tr("Hide details", "Masquer détails", "Ocultar detalles") : tr("View details", "Voir détails", "Ver detalles")}</span>
                          {isExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                        </button>

                        <select
                          value={b.status}
                          onChange={(e) =>
                            changeBookingStatus(b.id, e.target.value as BookingStatus)
                          }
                          className={`appearance-none rounded-full px-3 py-1.5 text-[10px] tracking-widest uppercase font-bold border cursor-pointer focus:outline-none ${statusStyles[b.status] ?? statusStyles.pending}`}
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
                      </div>
                    </div>

                    {/* Expandable Details Container */}
                    {isExpanded && (
                      <div className="border-t border-sky-100 bg-sky-50/40 p-4 sm:p-5 text-xs text-gray-700 space-y-3.5">
                        <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-3">
                          {/* Flight / Ferry info */}
                          <div className="bg-white p-3 rounded-xl border border-sky-200/80 shadow-2xs">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-sky-500 block mb-1">
                              {tr("Flight / Ferry Details", "Détails Vol / Ferry", "Detalles Vuelo / Ferry")}
                            </span>
                            <p className="font-mono text-xs text-sky-950 font-semibold bg-sky-50 p-2 rounded-lg border border-sky-200">
                              {b.transferDetails || tr("No flight/ferry details entered", "Aucune information de vol/ferry saisie", "Sin detalles de vuelo/ferry ingresados")}
                            </p>
                          </div>

                          {/* Travel Dates */}
                          <div className="bg-white p-3 rounded-xl border border-sky-200/80 shadow-2xs">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-sky-500 block mb-1">
                              {tr("Travel Dates", "Dates de voyage", "Fechas de viaje")}
                            </span>
                            <p className="text-gray-800 font-semibold flex items-center gap-1.5">
                              <Calendar className="h-4 w-4 text-sky-600 shrink-0" />
                              <span>
                                {b.arrivalDate ? new Date(b.arrivalDate).toLocaleDateString() : "?"} → {b.departureDate ? new Date(b.departureDate).toLocaleDateString() : "?"}
                              </span>
                            </p>
                            {b.roomNumber && (
                              <p className="mt-1 text-sky-900 font-bold bg-sky-50 px-2 py-0.5 rounded border border-sky-200 text-[11px] inline-block">
                                {tr("Hotel Room:", "Chambre :", "Habitación:")} #{b.roomNumber}
                              </p>
                            )}
                          </div>

                          {/* Passengers & Total */}
                          <div className="bg-white p-3 rounded-xl border border-sky-200/80 shadow-2xs">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-sky-500 block mb-1">
                              {tr("Transfer Fee", "Frais de transfert", "Tarifa de traslado")}
                            </span>
                            <p className="font-bold text-gray-900 text-sm">{b.transferCost || 0} €</p>
                            <p className="text-gray-500 mt-0.5">
                              {b.numPeople || 1} {tr("passengers", "passagers", "pasajeros")} · {optLabel}
                            </p>
                          </div>
                        </div>

                        {/* Contact Details */}
                        <div className="bg-white p-3 rounded-xl border border-sky-200/80 shadow-2xs flex items-center justify-between gap-3 flex-wrap">
                          <div className="flex flex-wrap gap-2">
                            {allGuests.map((gName, gIdx) => (
                              <span
                                key={gIdx}
                                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-sky-50 text-sky-900 font-semibold text-xs border border-sky-200"
                              >
                                <Users className="h-3 w-3 text-sky-500" />
                                <span>{gName}</span>
                              </span>
                            ))}
                          </div>
                          <div className="flex items-center gap-3 text-xs text-gray-500">
                            {b.email && (
                              <span className="flex items-center gap-1">
                                <Mail className="h-3.5 w-3.5 text-gray-400" />
                                <span>{b.email}</span>
                              </span>
                            )}
                            {b.phone && (
                              <span className="flex items-center gap-1">
                                <Phone className="h-3.5 w-3.5 text-gray-400" />
                                <span>{b.phone}</span>
                              </span>
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
