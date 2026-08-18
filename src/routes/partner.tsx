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

// ─── Portal ───────────────────────────────────────────────────────────


function Portal({ partner, onSignOut }: { partner: Collaborator; onSignOut: () => void }) {
  const L = partner.language ?? "en";
  const tr = (en: string, fr: string, es: string) =>
    L === "fr" ? fr : L === "es" ? es : en;

  const [activeSection, setActiveSection] = useState<"festival" | "tourism">("festival");
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
    setAllFestivalBookings(allBookings.filter((b) => !isTourismBooking(b)));
    const mine = allBookings
      .filter((b) => b.collaboratorId === partner.id)
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
  const tourismSales = collaboratorTourismRevenue(partner.id, myBookings);
  const tourismCommissions = collaboratorTourismCommission(partner.id, myBookings);

  return (
    <div
      className="min-h-screen bg-slate-100 text-gray-900 notranslate"
      translate="no"
      style={{ fontFamily: "'Poppins','Segoe UI',system-ui,sans-serif" }}
    >
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap');`}</style>
      {/* Header — classic navy bar */}
      <header className="bg-[#13234d] shadow-md">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="h-10 w-10 rounded-xl bg-amber-500 grid place-items-center shrink-0">
              <Users className="h-5 w-5 text-[#13234d]" />
            </div>
            <div className="min-w-0">
              <p className="font-display text-sm tracking-wide truncate text-white">
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
            className="inline-flex items-center gap-2 text-xs text-slate-300 hover:text-red-300 transition cursor-pointer shrink-0"
          >
            <LogOut className="h-4 w-4" />
            {tr("Sign Out", "Déconnexion", "Cerrar sesión")}
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 sm:px-6 py-8 space-y-8">
        {/* Navigation Tabs between Festival Packs & Tourism */}
        <div className="flex items-center gap-2 border-b border-gray-200 pb-3">
          <button
            onClick={() => setActiveSection("festival")}
            className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl text-xs font-bold transition cursor-pointer ${
              activeSection === "festival"
                ? "bg-[#13234d] text-white shadow-md shadow-slate-900/20"
                : "bg-white text-gray-600 hover:bg-gray-50 border border-gray-200"
            }`}
          >
            <Ticket className="h-4 w-4 text-amber-400" />
            <span>{tr("Festival Packs & Rooms", "Packs & Chambres Festival", "Packs y Hotel Festival")}</span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono ${
              activeSection === "festival" ? "bg-white/20 text-white" : "bg-gray-100 text-gray-700"
            }`}>
              {festivalBookings.length}
            </span>
          </button>

          <button
            onClick={() => setActiveSection("tourism")}
            className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl text-xs font-bold transition cursor-pointer ${
              activeSection === "tourism"
                ? "bg-gradient-to-r from-blue-700 to-indigo-700 text-white shadow-md shadow-blue-900/30"
                : "bg-white text-gray-600 hover:bg-blue-50 border border-gray-200"
            }`}
          >
            <Compass className="h-4 w-4 text-cyan-300" />
            <span>{tr("Cultural Tourism & Tours", "Tourisme & Excursions", "Turismo y Excursiones")}</span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono ${
              activeSection === "tourism" ? "bg-white/20 text-white" : "bg-blue-100 text-blue-800"
            }`}>
              {tourismBookings.length}
            </span>
          </button>
        </div>

        {/* ═══════════════════════════════════════════════════════════════ */}
        {/* SECTION 1: FESTIVAL PACKS                                       */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        {activeSection === "festival" && (
          <div className="space-y-8 animate-fadeIn">
            {/* Stats */}
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
                  },
                  {
                    label: tr("Single Rooms", "Chambres single", "Habitaciones individuales"),
                    value: live.filter((b) => catOf(b) === "single").length,
                    icon: Ticket,
                  },
                  {
                    label: tr("Full Pass", "Full Pass", "Full Pass"),
                    value: live.filter((b) => catOf(b) === "fullpass").length,
                    icon: CheckCircle2,
                  },
                  {
                    label: tr("Festival Sales", "Ventes Festival", "Ventas Festival"),
                    value: formatForPartner(sales, partner),
                    icon: Euro,
                  },
                  {
                    label: `Commission (${commissionLabel(partner)})`,
                    value: formatForPartner(earned, partner),
                    icon: Euro,
                  },
                ];
              })().map((s) => (
                <div
                  key={s.label}
                  className="rounded-xl border border-gray-200 bg-white shadow-sm p-4"
                >
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] tracking-widest uppercase text-gray-500">{s.label}</p>
                    <s.icon className="h-4 w-4 text-amber-600" />
                  </div>
                  <p className="mt-1.5 font-display text-2xl">{s.value}</p>
                </div>
              ))}
            </div>

            {/* Mission — bonus goal set by the festival team */}
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

            {/* Main Packs Booking Link */}
            <div className="rounded-2xl border border-gray-200 bg-white shadow-sm p-6 flex flex-col sm:flex-row gap-6 items-start">
              <div className="flex-1 space-y-4">
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
                      "Send this link to your community for Hotel & Full Pass bookings. They choose their pack and receive a pending reservation email.",
                      "Envoyez ce lien à votre communauté pour les réservations Hôtel & Full Pass. Ils reçoivent un email de confirmation en attente.",
                      "Envía este enlace a tu comunidad para reservas de Hotel y Full Pass. Recibirán un email de confirmación pendiente."
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

            {/* Festival Bookings List */}
            <div>
              <h3 className="font-display text-sm tracking-wide mb-1">
                {tr("Festival Reservations", "Réservations Festival", "Reservas de Festival")} ({festivalBookings.length})
              </h3>
              <p className="text-sm text-gray-500 mb-4 whitespace-pre-line">
                {tr(
                  "Here you will find hotel and pass reservations made through your code.\nNB: Only confirm bookings after receiving payment.",
                  "Vous trouverez ici les réservations d'hôtels et pass réalisées via votre code.\nNB : Confirmez uniquement les réservations après réception du paiement.",
                  "Aquí encontrarás las reservas de hotel y pases realizadas a través de tu código.\nNota: Confirma únicamente las reservas tras recibir el pago."
                )}
              </p>
              {statusError && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 mb-3">
                  <p className="text-sm text-red-700">{statusError}</p>
                </div>
              )}
              {festivalBookings.length === 0 ? (
                <div className="rounded-xl border border-gray-200 bg-white shadow-sm px-5 py-10 text-center text-sm text-gray-400">
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

                    return (
                      <div
                        key={b.id}
                        className="rounded-xl border border-gray-200 bg-white shadow-sm p-4 flex flex-col sm:flex-row sm:items-center gap-3"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-sm font-semibold text-gray-900 truncate">
                              {b.customerName}
                            </p>
                            {pack && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-amber-50 text-amber-900 border border-amber-200">
                                {tr("Total:", "Total :", "Total:")} {netTotal} {currency}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-gray-500 mt-1">
                            <span className="font-medium text-gray-700">{label}</span>
                            {pack && (
                              numPeople > 1 ? (
                                <span>
                                  {" · "}
                                  <strong className="text-gray-800">
                                    {numPeople} {tr("people", "personnes", "personas")}
                                  </strong>
                                  {" "}
                                  ({unitPrice} {currency}/pers → <strong className="text-amber-800 font-semibold">{grossTotal} {currency}</strong>)
                                </span>
                              ) : (
                                <span>{" · "}{unitPrice} {currency}</span>
                              )
                            )}
                            {b.arrivalDate
                              ? ` · ${new Date(b.arrivalDate).toLocaleDateString()} → ${
                                  b.departureDate
                                    ? new Date(b.departureDate).toLocaleDateString()
                                    : "?"
                                }`
                              : ""}{" "}
                            · {new Date(b.createdAt).toLocaleDateString()}
                          </p>
                          {b.discountCode && (
                            <p className="mt-1">
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200 text-[10px] font-mono font-semibold">
                                Promo: {b.discountCode} ({b.discountAmount ? `-€${b.discountAmount}` : "Discount"})
                              </span>
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {hasTicket && (
                            <a
                              href={ticketUrl(b.ticketCode)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-2 rounded-lg bg-amber-100 text-amber-600 hover:bg-amber-100 transition"
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
                              className={`px-3 py-1.5 rounded-full text-[10px] tracking-widest uppercase font-medium border ${statusStyles["checked-in"]}`}
                            >
                              {tr("Checked In", "Enregistré", "Registrado")}
                            </span>
                          ) : (
                            <select
                              value={b.status}
                              onChange={(e) =>
                                changeBookingStatus(b.id, e.target.value as BookingStatus)
                              }
                              className={`appearance-none rounded-full px-3 py-1.5 text-[10px] tracking-widest uppercase font-medium border cursor-pointer focus:outline-none ${statusStyles[b.status] ?? statusStyles.pending}`}
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
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════ */}
        {/* SECTION 2: CULTURAL TOURISM & EXCURSIONS                        */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        {activeSection === "tourism" && (
          <div className="space-y-8 animate-fadeIn">
            {/* Tourism Stats Banner */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              <div className="rounded-xl border border-blue-200 bg-white p-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <p className="text-[10px] tracking-widest uppercase text-blue-700 font-bold">
                    {tr("Total Excursion Guests", "Total Passagers", "Total Pasajeros")}
                  </p>
                  <Users className="h-4 w-4 text-blue-600" />
                </div>
                <p className="mt-1.5 font-display text-2xl font-black text-slate-900">{tourismGuests}</p>
                <span className="text-[10px] text-gray-400">{tr("Passengers", "Passagers", "Pasajeros")}</span>
              </div>

              <div className="rounded-xl border border-blue-200 bg-blue-50/50 p-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <p className="text-[10px] tracking-widest uppercase text-blue-800 font-bold">Tangier Tour</p>
                  <MapPin className="h-4 w-4 text-blue-600" />
                </div>
                <p className="mt-1.5 font-display text-2xl font-black text-blue-900">
                  {tourismBookings
                    .filter((b) => (b.packId?.includes("tangier") || b.packName?.toLowerCase().includes("tangier")) && b.status !== "declined")
                    .reduce((sum, b) => sum + (b.numPeople || 1), 0)}
                </p>
                <span className="text-[10px] text-blue-700 font-semibold">15 € / {tr("pers.", "pers.", "pers.")}</span>
              </div>

              <div className="rounded-xl border border-cyan-200 bg-cyan-50/50 p-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <p className="text-[10px] tracking-widest uppercase text-cyan-800 font-bold">Asilah Tour</p>
                  <MapPin className="h-4 w-4 text-cyan-600" />
                </div>
                <p className="mt-1.5 font-display text-2xl font-black text-cyan-900">
                  {tourismBookings
                    .filter((b) => (b.packId?.includes("asilah") || b.packName?.toLowerCase().includes("asilah")) && b.status !== "declined")
                    .reduce((sum, b) => sum + (b.numPeople || 1), 0)}
                </p>
                <span className="text-[10px] text-cyan-700 font-semibold">25 € / {tr("pers.", "pers.", "pers.")}</span>
              </div>

              <div className="rounded-xl border border-indigo-200 bg-indigo-50/50 p-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <p className="text-[10px] tracking-widest uppercase text-indigo-800 font-bold">Chefchaouen</p>
                  <MapPin className="h-4 w-4 text-indigo-600" />
                </div>
                <p className="mt-1.5 font-display text-2xl font-black text-indigo-900">
                  {tourismBookings
                    .filter((b) => (b.packId?.includes("chefchaouen") || b.packName?.toLowerCase().includes("chefchaouen") || b.packName?.toLowerCase().includes("chawan")) && b.status !== "declined")
                    .reduce((sum, b) => sum + (b.numPeople || 1), 0)}
                </p>
                <span className="text-[10px] text-indigo-700 font-semibold">30 € / {tr("pers.", "pers.", "pers.")}</span>
              </div>

              <div className="rounded-xl border-2 border-emerald-400 bg-gradient-to-br from-emerald-500 to-teal-600 text-white p-4 shadow-md col-span-2 sm:col-span-1">
                <div className="flex items-center justify-between text-emerald-100">
                  <p className="text-[10px] tracking-widest uppercase font-black">
                    {tr("Tourism Commission", "Commission Tourisme", "Comisión Turismo")}
                  </p>
                  <Euro className="h-4 w-4 text-white" />
                </div>
                <p className="mt-1.5 font-display text-2xl font-black text-white">{tourismCommissions} €</p>
                <span className="text-[10px] text-emerald-100 font-bold">5 € / {tr("guest", "passager", "pasajero")}</span>
              </div>
            </div>

            {/* Blue-on-Blue Tourism Share Link Card */}
            <div className="rounded-2xl border-2 border-blue-400/80 bg-gradient-to-br from-[#0e275c] via-[#123880] to-[#1c4ea8] text-white shadow-xl shadow-blue-950/20 p-6 flex flex-col sm:flex-row gap-6 items-start relative overflow-hidden">
              <div className="absolute -top-12 -right-12 w-48 h-48 bg-blue-400/20 rounded-full blur-2xl pointer-events-none" />

              <div className="flex-1 space-y-4 relative z-10">
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
                      "Partagez ce lien avec vos clients pour les visites de Tanger (15 €), Asilah (25 €) et Chefchaouen (30 €). Vous touchez 5 € de commission pour chaque passager inscrit.",
                      "Comparte este enlace con tus clientes para tours a Tánger (15 €), Asilah (25 €) y Chefchaouen (30 €). Recibes 5 € de comisión por cada pasajero registrado."
                    )}
                  </p>

                  <div className="mt-4 flex items-center gap-2.5 flex-wrap">
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

            {/* Tourism Bookings List */}
            <div>
              <h3 className="font-display text-sm tracking-wide mb-1">
                {tr("Excursion Bookings", "Réservations Excursions", "Reservas de Excursiones")} ({tourismBookings.length})
              </h3>
              <p className="text-sm text-gray-500 mb-4">
                {tr(
                  "All guided tour bookings made through your link with guest lists, hotel room numbers, and commission breakdown.",
                  "Toutes les réservations d'excursions avec les noms des passagers, numéros de chambre et calcul des commissions.",
                  "Todas las reservas de excursiones con lista de pasajeros, número de habitación y cálculo de comisiones."
                )}
              </p>

              {tourismBookings.length === 0 ? (
                <div className="rounded-xl border border-gray-200 bg-white shadow-sm px-5 py-10 text-center text-sm text-gray-400">
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

                    let guestList: string[] = [];
                    if (b.guestDetails) {
                      try {
                        const parsed = JSON.parse(b.guestDetails);
                        if (Array.isArray(parsed)) {
                          guestList = parsed.map((g) => `${g.firstName || ""} ${g.lastName || ""}`.trim()).filter(Boolean);
                        }
                      } catch {}
                    }
                    if (guestList.length === 0 && b.customerName) {
                      guestList = b.customerName.split(/\s*&\s*/).map((s) => s.trim()).filter(Boolean);
                    }

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
                        className="rounded-xl border border-blue-200/80 bg-white shadow-sm p-4 flex flex-col sm:flex-row sm:items-center gap-3"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-sm font-bold text-gray-900 truncate">
                              {b.customerName}
                            </p>
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-blue-50 text-blue-900 border border-blue-200">
                              {b.packName}
                            </span>
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-black bg-emerald-50 text-emerald-800 border border-emerald-200">
                              +{commissionAmt} € {tr("Commission", "Commission", "Comisión")}
                            </span>
                          </div>

                          <div className="text-xs text-gray-500 mt-1 space-y-0.5">
                            <p>
                              <strong className="text-gray-800">{numPeople} {numPeople > 1 ? tr("passengers", "passagers", "pasajeros") : tr("passenger", "passager", "pasajero")}</strong>
                              {" "}
                              ({unitPrice} €/pers → <strong className="text-blue-900 font-semibold">{grossTotal} €</strong>)
                              {b.roomNumber ? ` · ${tr("Hotel Room:", "Chambre :", "Habitación:")} ${b.roomNumber}` : ""}
                              {" · "}{new Date(b.createdAt).toLocaleDateString()}
                            </p>
                            {guestList.length > 0 && (
                              <p className="text-[11px] text-gray-600">
                                <span className="font-semibold">{tr("Guests:", "Participants :", "Participantes:")}</span>{" "}
                                {guestList.join(", ")}
                              </p>
                            )}
                            {matchedFest && (
                              <p className="mt-1">
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-semibold">
                                  <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                                  <span>{tr("Linked Festival Reservation:", "Réservation Festival liée :", "Reserva Festival vinculada:")} #{matchedFest.ticketCode} ({matchedFest.packName})</span>
                                </span>
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          {hasTicket && (
                            <a
                              href={ticketUrl(b.ticketCode)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-2 rounded-lg bg-blue-100 text-blue-700 hover:bg-blue-200 transition"
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
                              className={`px-3 py-1.5 rounded-full text-[10px] tracking-widest uppercase font-medium border ${statusStyles["checked-in"]}`}
                            >
                              {tr("Checked In", "Enregistré", "Registrado")}
                            </span>
                          ) : (
                            <select
                              value={b.status}
                              onChange={(e) =>
                                changeBookingStatus(b.id, e.target.value as BookingStatus)
                              }
                              className={`appearance-none rounded-full px-3 py-1.5 text-[10px] tracking-widest uppercase font-medium border cursor-pointer focus:outline-none ${statusStyles[b.status] ?? statusStyles.pending}`}
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
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
