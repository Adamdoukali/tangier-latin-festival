import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect, useCallback, useRef } from "react";
import { TopHorizontalScrollbar } from "@/components/TopHorizontalScrollbar";
import {
  Plus,
  Pencil,
  Trash2,
  X,
  Check,
  Link2,
  CheckCircle2,
  AlertTriangle,
  ToggleLeft,
  ToggleRight,
  Users,
  Download,
  Search,
  Mail,
  KeyRound,
  ShieldAlert,
  ShieldCheck,
  Bus,
  Compass,
  Eye,
  Clock,
  Ticket,
  CreditCard,
} from "lucide-react";
import {
  getCollaboratorStats,
  getBookings,
  getPacks,
  addCollaborator,
  updateCollaborator,
  deleteCollaborator,
  requestPasswordReset,
  collaboratorsReady,
  commissionColumnsReady,
  commissionRatesReady,
  languageColumnReady,
  missionColumnsReady,
  formatMoney,
  formatMoneyPair,
  formatForPartner,
  commissionLabel,
  collaboratorMissionProgress,
  partnerShareLink,
  partnerTransferShareLink,
  partnerTourismShareLink,
  isConfirmedBooking,
  isTourismBooking,
  isTransferBooking,
  packRoomCategory,
  type Collaborator,
  type CollaboratorStats,
  type Booking,
  type Pack,
  type CommissionType,
  type CommissionCurrency,
  type PartnerLanguage,
} from "@/lib/admin-store";
import { translateDynamicText } from "@/lib/translations";
import {
  buildCollaboratorDetailsSpreadsheet,
  buildCollaboratorSummarySpreadsheet,
} from "@/lib/admin-export-data";
import { downloadXlsx } from "@/lib/spreadsheet-export";
import { getCurrentAdmin, canViewAsPartner, startPartnerImpersonation } from "@/lib/auth-store";
import { recordAdminAction } from "@/lib/admin-audit";

export const Route = createFileRoute("/admin/collaborators")({
  component: AdminCollaborators,
});

interface CollabForm {
  name: string;
  code: string;
  email: string;
  phone: string;
  commission: number;
  commissionType: CommissionType;
  commissionCurrency: CommissionCurrency;
  commissionDouble: number;
  commissionSingle: number;
  commissionFullpass: number;
  language: PartnerLanguage;
  missionGoal: string; // "" = no mission
  missionReward: number;
  missionCurrency: CommissionCurrency;
  notes: string;
  active: boolean;
  username: string;
  accessCode: string;
  inviteQuota: string; // legacy field, kept so edits don't wipe it
}

const emptyForm: CollabForm = {
  name: "",
  code: "",
  email: "",
  phone: "",
  commission: 0,
  commissionType: "percent",
  commissionCurrency: "EUR",
  commissionDouble: 0,
  commissionSingle: 0,
  commissionFullpass: 0,
  language: "en",
  missionGoal: "",
  missionReward: 0,
  missionCurrency: "EUR",
  notes: "",
  active: false, // Default newly created accounts to inactive until admin activates them!
  username: "",
  accessCode: "",
  inviteQuota: "",
};

const LANGUAGES: { value: PartnerLanguage; label: string }[] = [
  { value: "en", label: "English" },
  { value: "fr", label: "Français" },
  { value: "es", label: "Español" },
];

function generateAccessCode(): string {
  const chars = "abcdefghjkmnpqrstuvwxyz23456789";
  let out = "";
  for (let i = 0; i < 10; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

function suggestCode(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-zA-Z0-9]/g, "")
    .toUpperCase()
    .slice(0, 12);
}

// The partner link: short subdomain form on the live site
// (tickets.tangierlatinfestival.com/CODE), /book?ref locally.
function referralUrl(code: string, lang?: PartnerLanguage): string {
  return partnerShareLink(code, lang);
}

function transferReferralUrl(code: string, lang?: PartnerLanguage): string {
  return partnerTransferShareLink(code, lang);
}

function tourismReferralUrl(code: string, lang?: PartnerLanguage): string {
  return partnerTourismShareLink(code, lang);
}

function AdminCollaborators() {
  const tableContainerRef = useRef<HTMLDivElement>(null);
  const [stats, setStats] = useState<CollaboratorStats[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [packs, setPacks] = useState<Pack[]>([]);
  const [ready, setReady] = useState(true);
  const [commissionReady, setCommissionReady] = useState(true);
  const [langReady, setLangReady] = useState(true);
  const [missionReady, setMissionReady] = useState(true);
  const [ratesReady, setRatesReady] = useState(true);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<CollabForm>(emptyForm);
  // Auto-suggest the referral code from the name until it's edited by hand.
  const [codeTouched, setCodeTouched] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [selectedCollabForDetails, setSelectedCollabForDetails] = useState<CollaboratorStats | null>(null);
  const [detailsTab, setDetailsTab] = useState<"passes" | "excursions" | "all">("passes");
  const [detailsStatusFilter, setDetailsStatusFilter] = useState<"all" | "confirmed" | "pending">("all");

  const openDetailsModal = (collabStats: CollaboratorStats, tab: "passes" | "excursions" | "all" = "passes") => {
    setSelectedCollabForDetails(collabStats);
    setDetailsTab(tab);
    setDetailsStatusFilter("all");
  };

  const reload = useCallback(async () => {
    const [ok, commOk, langOk, missionOk, ratesOk, s, b, p] = await Promise.all([
      collaboratorsReady(),
      commissionColumnsReady(),
      languageColumnReady(),
      missionColumnsReady(),
      commissionRatesReady(),
      getCollaboratorStats(),
      getBookings(),
      getPacks(),
    ]);
    setReady(ok);
    setCommissionReady(commOk);
    setLangReady(langOk);
    setMissionReady(missionOk);
    setRatesReady(ratesOk);
    setStats(s.sort((a, b) => b.ticketsSold - a.ticketsSold));
    setBookings(b);
    setPacks(p);
    setLoading(false);
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  const openNew = () => {
    setEditingId(null);
    setForm(emptyForm);
    setCodeTouched(false);
    setSaveError("");
    setShowForm(true);
  };

  const openEdit = (c: Collaborator) => {
    setEditingId(c.id);
    setForm({
      name: c.name,
      code: c.code,
      email: c.email ?? "",
      phone: c.phone ?? "",
      commission: c.commission ?? 0,
      commissionType: c.commissionType ?? "percent",
      commissionCurrency: c.commissionCurrency ?? "EUR",
      commissionDouble: c.commissionDouble ?? c.commission ?? 0,
      commissionSingle: c.commissionSingle ?? c.commission ?? 0,
      commissionFullpass: c.commissionFullpass ?? c.commission ?? 0,
      language: c.language ?? "en",
      missionGoal: c.missionGoal ? String(c.missionGoal) : "",
      missionReward: c.missionReward ?? 0,
      missionCurrency: c.missionCurrency ?? "EUR",
      notes: c.notes ?? "",
      active: c.active,
      username: c.username ?? "",
      accessCode: c.accessCode ?? "",
      inviteQuota: c.inviteQuota == null ? "" : String(c.inviteQuota),
    });
    setCodeTouched(true);
    setSaveError("");
    setShowForm(true);
  };

  const [resetSentId, setResetSentId] = useState<string | null>(null);
  const [emailNotice, setEmailNotice] = useState<{ kind: "ok" | "error"; text: string } | null>(
    null,
  );

  const reportResetEmail = (
    name: string,
    email: string,
    res: { success: boolean; error?: string; emailSent?: boolean },
  ) => {
    if (!res.success) {
      setEmailNotice({ kind: "error", text: res.error || "Lien non généré." });
      return;
    }
    setEmailNotice(
      res.emailSent
        ? { kind: "ok", text: `E-mail de création de mot de passe envoyé à ${email} (${name}). Lien copié dans le presse-papiers.` }
        : {
            kind: "error",
            text: `L’e-mail n’a PAS pu être envoyé à ${email} (${name}). Le lien a été copié dans le presse-papiers : envoyez-le par WhatsApp.`,
          },
    );
  };

  const handleSave = async () => {
    if (!form.name.trim() || !form.code.trim()) {
      setSaveError("Le nom et le code sont obligatoires.");
      return;
    }
    if (!form.email.trim()) {
      setSaveError(
        "L’e-mail du partenaire est obligatoire afin qu’il puisse définir son mot de passe et se connecter.",
      );
      return;
    }
    const payload = {
      ...form,
      email: form.email.trim().toLowerCase(),
      inviteQuota: form.inviteQuota.trim() === "" ? null : parseInt(form.inviteQuota, 10) || 0,
      missionGoal: form.missionGoal.trim() === "" ? null : parseInt(form.missionGoal, 10) || null,
      commission: form.commissionType === "per_person" ? form.commissionDouble : form.commission,
    };
    try {
      if (editingId) {
        await updateCollaborator(editingId, payload);
      } else {
        const created = await addCollaborator(payload);
        // Automatically send password setup link to partner's email
        if (created.email) {
          const res = await requestPasswordReset(created.email).catch(
            (e: unknown) => ({ success: false, error: e instanceof Error ? e.message : String(e) }),
          );
          reportResetEmail(created.name, created.email, res);
          if (res.success && "resetUrl" in res && res.resetUrl) {
            navigator.clipboard?.writeText(res.resetUrl).catch(() => {});
          }
        }
      }
      setShowForm(false);
      setEditingId(null);
      await reload();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      setSaveError(
        msg.includes("duplicate")
          ? "Ce code de parrainage ou cet e-mail est déjà enregistré."
          : msg,
      );
    }
  };

  const handleSendResetEmail = async (c: Collaborator) => {
    if (!c.email) return;
    setEmailNotice(null);
    const res = await requestPasswordReset(c.email).catch((e: unknown) => ({
      success: false,
      error: e instanceof Error ? e.message : String(e),
    }));
    reportResetEmail(c.name, c.email, res);
    if (res.success) {
      setResetSentId(c.id);
      setTimeout(() => setResetSentId(null), 3000);
      if ("resetUrl" in res && res.resetUrl) {
        navigator.clipboard?.writeText(res.resetUrl).catch(() => {});
      }
    }
  };

  const handleDelete = async (id: string) => {
    await deleteCollaborator(id);
    setDeleteConfirm(null);
    await reload();
  };

  const toggleActive = async (c: Collaborator) => {
    await updateCollaborator(c.id, { active: !c.active });
    await reload();
  };

  const copyLink = (c: Collaborator) => {
    navigator.clipboard.writeText(referralUrl(c.code, c.language));
    setCopiedId(c.id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  const copyTransferLink = (c: Collaborator) => {
    navigator.clipboard.writeText(transferReferralUrl(c.code, c.language));
    setCopiedId(`transfer-${c.id}`);
    setTimeout(() => setCopiedId(null), 1500);
  };

  const copyTourismLink = (c: Collaborator) => {
    navigator.clipboard.writeText(tourismReferralUrl(c.code, c.language));
    setCopiedId(`tourism-${c.id}`);
    setTimeout(() => setCopiedId(null), 1500);
  };

  // Search filters the table and both collaborator workbook exports.
  const visibleStats = stats.filter(({ collaborator: c }) => {
    if (!search.trim()) return true;
    const q = search.trim().toLowerCase();
    return (
      c.name.toLowerCase().includes(q) ||
      c.code.toLowerCase().includes(q) ||
      (c.username ?? "").toLowerCase().includes(q) ||
      (c.email ?? "").toLowerCase().includes(q) ||
      (c.phone ?? "").toLowerCase().includes(q) ||
      (c.notes ?? "").toLowerCase().includes(q)
    );
  });

  const downloadCollaboratorsSummaryXlsx = () => {
    downloadXlsx(
      `bilan-collaborateurs-resume-${new Date().toISOString().slice(0, 10)}.xlsx`,
      buildCollaboratorSummarySpreadsheet(visibleStats, bookings, packs),
      "Bilan résumé",
    );
  };

  const downloadCollaboratorsDetailsXlsx = () => {
    downloadXlsx(
      `bilan-collaborateurs-details-${new Date().toISOString().slice(0, 10)}.xlsx`,
      buildCollaboratorDetailsSpreadsheet(
        visibleStats.map(({ collaborator }) => collaborator),
        bookings,
        packs,
      ),
      "Bilan détaillé",
    );
  };

  // Summary totals for cards
  const totalConfirmedTickets = stats.reduce((sum, s) => sum + s.ticketsSold, 0);
  const totalPendingTickets = stats.reduce((sum, s) => sum + (s.pendingTicketsSold || 0), 0);
  const totalConfirmedRevenue = stats.reduce(
    (acc, s) => ({ eur: acc.eur + s.revenue.eur, mad: acc.mad + s.revenue.mad }),
    { eur: 0, mad: 0 },
  );
  const totalPendingRevenue = stats.reduce(
    (acc, s) => ({
      eur: acc.eur + (s.pendingRevenue?.eur || 0),
      mad: acc.mad + (s.pendingRevenue?.mad || 0),
    }),
    { eur: 0, mad: 0 },
  );
  const totalConfirmedPasses = stats.reduce((sum, s) => sum + s.fullPass, 0);
  const totalPendingPasses = stats.reduce((sum, s) => sum + (s.pendingPassesCount || 0), 0);
  const totalConfirmedExcursions = stats.reduce((sum, s) => sum + (s.excursions || 0), 0);
  const totalPendingExcursions = stats.reduce((sum, s) => sum + (s.pendingExcursions || 0), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-slate-900">Collaborateurs</h2>
          <p className="mt-1 text-xs text-slate-500">
            Partenaires et promoteurs du festival, liens d'affiliation, ventes et commissions.
          </p>
        </div>
        <button
          onClick={openNew}
          className="inline-flex items-center gap-2 rounded-lg bg-amber-500 px-4 py-2 text-xs font-bold text-zinc-950 hover:bg-amber-400 transition shadow-xs cursor-pointer self-start"
        >
          <Plus className="h-4 w-4 text-zinc-950" /> Ajouter un collaborateur
        </button>
      </div>

      {/* Summary Cards - rich partner colors */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
        <div className="rounded-xl border border-violet-200 bg-violet-50/50 p-4 shadow-xs hover:border-violet-300 transition-colors">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-violet-900">Partenaires</p>
            <div className="h-7 w-7 rounded-lg bg-violet-100 grid place-items-center text-violet-700">
              <Users className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-1.5 text-2xl font-bold tracking-tight text-violet-950 tabular-nums">
            {stats.filter((s) => s.collaborator.active).length}
            <span className="text-xs font-normal text-violet-600 ml-1.5">/ {stats.length} total</span>
          </p>
          <p className="text-[11px] text-violet-600 mt-1">Comptes collaborateurs</p>
        </div>

        <div className="rounded-xl border border-blue-200 bg-blue-50/60 p-4 shadow-xs hover:border-blue-300 transition-colors">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-blue-900">Billets vendus</p>
            <div className="h-7 w-7 rounded-lg bg-blue-100 grid place-items-center text-blue-700">
              <Ticket className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-1.5 text-2xl font-bold tracking-tight text-blue-950 tabular-nums">
            {totalConfirmedTickets}
            {totalPendingTickets > 0 && (
              <span className="text-xs font-bold text-amber-700 ml-1.5">
                (+{totalPendingTickets} en attente)
              </span>
            )}
          </p>
          <p className="text-[11px] text-blue-600 mt-1">
            {totalConfirmedPasses} pass · {totalConfirmedExcursions} excursion{totalConfirmedExcursions > 1 ? "s" : ""}
          </p>
        </div>

        <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-4 shadow-xs hover:border-emerald-300 transition-colors">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-emerald-900">Ventes confirmées</p>
            <div className="h-7 w-7 rounded-lg bg-emerald-100 grid place-items-center text-emerald-700">
              <CreditCard className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-1.5 text-2xl font-bold tracking-tight text-emerald-950 tabular-nums">
            {formatMoneyPair(totalConfirmedRevenue)}
          </p>
          <p className="text-[11px] text-emerald-600 mt-1">Chiffre d’affaires payé</p>
        </div>

        <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-4 shadow-xs hover:border-amber-300 transition-colors">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-amber-900">Paiements en attente</p>
            <div className="h-7 w-7 rounded-lg bg-amber-100 grid place-items-center text-amber-700">
              <Clock className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-1.5 text-2xl font-bold tracking-tight text-amber-950 tabular-nums">
            {formatMoneyPair(totalPendingRevenue)}
          </p>
          <p className="text-[11px] text-amber-600 mt-1">
            {totalPendingTickets} billet(s) en attente
          </p>
        </div>
      </div>

      {/* Result of the last password-link e-mail */}
      {emailNotice && (
        <div
          className={`rounded-xl border p-4 flex gap-3 text-sm ${
            emailNotice.kind === "ok"
              ? "border-emerald-200 bg-emerald-50 text-emerald-800"
              : "border-red-200 bg-red-50 text-red-800"
          }`}
        >
          {emailNotice.kind === "ok" ? (
            <CheckCircle2 className="h-5 w-5 shrink-0 mt-0.5" />
          ) : (
            <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5" />
          )}
          <p className="flex-1">{emailNotice.text}</p>
          <button
            onClick={() => setEmailNotice(null)}
            className="text-current/60 hover:text-current cursor-pointer"
            aria-label="Fermer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* DB setup notice */}
      {!ready && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-5 flex gap-3">
          <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="text-sm text-amber-800">
            <p className="font-semibold text-amber-700">
              Configuration de la base de données requise
            </p>
            <p className="mt-1">
              La table <code className="font-mono">collaborators</code> n’existe pas encore dans
              votre projet Supabase. Ouvrez le tableau de bord Supabase → Éditeur SQL, exécutez le
              script <code className="font-mono bg-amber-50 px-1 rounded">supabase/schema.sql</code>
              du projet, puis actualisez cette page.
            </p>
          </div>
        </div>
      )}

      {/* Commission columns missing */}
      {ready && !commissionReady && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-5 flex gap-3">
          <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="text-sm text-amber-800">
            <p className="font-semibold text-amber-700">
              Les options de commission nécessitent une mise à jour de la base
            </p>
            <p className="mt-1">
              Le <em>type</em> de commission (par personne) et la <em>devise</em> (MAD) ne peuvent
              pas encore être enregistrés : deux colonnes manquent dans la base. Ouvrez le tableau
              de bord Supabase → Éditeur SQL et exécutez le script{" "}
              <code className="font-mono bg-amber-50 px-1 rounded">supabase/commission.sql</code>,
              puis actualisez cette page. En attendant, seule la commission classique en pourcentage
              est enregistrée pour les collaborateurs.
            </p>
          </div>
        </div>
      )}

      {/* Split-rate columns missing */}
      {ready && !ratesReady && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-5 flex gap-3">
          <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="text-sm text-amber-800">
            <p className="font-semibold text-amber-700">
              Les commissions par catégorie nécessitent une mise à jour de la base
            </p>
            <p className="mt-1">
              Les tarifs distincts pour chambre double, chambre individuelle et pass complet ne
              peuvent pas encore être enregistrés. Ouvrez le tableau de bord Supabase → Éditeur SQL
              et exécutez le script{" "}
              <code className="font-mono bg-amber-100 px-1 rounded">
                supabase/commission-rates.sql
              </code>
              , puis actualisez cette page.
            </p>
          </div>
        </div>
      )}

      {/* Mission columns missing */}
      {ready && !missionReady && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-5 flex gap-3">
          <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="text-sm text-amber-800">
            <p className="font-semibold text-amber-700">
              Les missions nécessitent une mise à jour de la base
            </p>
            <p className="mt-1">
              Les objectifs et récompenses des missions ne peuvent pas encore être enregistrés.
              Ouvrez le tableau de bord Supabase → Éditeur SQL et exécutez le script{" "}
              <code className="font-mono bg-amber-50 px-1 rounded">
                supabase/partner-missions.sql
              </code>
              , puis actualisez cette page.
            </p>
          </div>
        </div>
      )}

      {/* Language column missing */}
      {ready && !langReady && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-5 flex gap-3">
          <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="text-sm text-amber-800">
            <p className="font-semibold text-amber-700">
              La langue du partenaire nécessite une mise à jour de la base
            </p>
            <p className="mt-1">
              La langue du partenaire ne peut pas encore être enregistrée. Ouvrez le tableau de bord
              Supabase → Éditeur SQL et exécutez le script{" "}
              <code className="font-mono bg-amber-50 px-1 rounded">
                supabase/partner-language.sql
              </code>
              , puis actualisez cette page.
            </p>
          </div>
        </div>
      )}

      {/* How it works */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm p-5 text-sm text-gray-600 space-y-1.5">
        <p className="font-display text-sm tracking-wide text-gray-800 mb-2">
          Fonctionnement du suivi
        </p>
        <p>
          · <span className="text-gray-700">Vente :</span> donnez à chaque collaborateur son lien de
          parrainage ; toute réservation effectuée par ce lien lui sera attribuée.
        </p>
        <p>
          · <span className="text-gray-700">Confirmation :</span> les réservations arrivent en
          attente. Après confirmation du paiement par vous ou le partenaire, le participant reçoit
          automatiquement son billet QR avec ses informations.
        </p>
        <p>
          · <span className="text-gray-700">Espace partenaire :</span> donnez au partenaire un
          identifiant et un code d’accès. Il pourra se connecter sur{" "}
          <code className="font-mono text-violet-700">/partner</code> pour suivre et confirmer ses
          réservations et consulter sa commission.
        </p>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Rechercher par nom, code, identifiant, e-mail ou téléphone…"
          className="w-full rounded-lg border border-slate-200/80 bg-white pl-9 pr-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-slate-400 shadow-xs transition-colors"
        />
      </div>

      {/* Table */}
      <div className="space-y-1.5">
        <TopHorizontalScrollbar targetRef={tableContainerRef} label="Défilement collaborateurs" />
        <div className="rounded-xl border border-slate-200/80 bg-white shadow-xs overflow-hidden">
          {loading ? (
            <div className="px-5 py-16 text-center text-xs text-slate-400">Chargement…</div>
          ) : visibleStats.length === 0 ? (
            <div className="px-5 py-16 text-center text-xs text-slate-400">
              <Users className="h-8 w-8 mx-auto mb-2 text-slate-300" />
              Aucun collaborateur. Cliquez sur « Ajouter un collaborateur » pour créer le premier.
            </div>
          ) : (
            <div ref={tableContainerRef} className="overflow-x-auto">
              <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-slate-200/80 text-slate-500 bg-slate-50/70">
                  <th className="px-5 py-3 text-left font-medium">Partenaire</th>
                  <th className="px-5 py-3 text-left font-medium">Code / lien</th>
                  <th className="px-5 py-3 text-right font-medium">Chambres ind.</th>
                  <th className="px-5 py-3 text-right font-medium">Chambres doubles</th>
                  <th className="px-5 py-3 text-right font-medium">Pass complet</th>
                  <th className="px-5 py-3 text-right font-medium">Excursions</th>
                  <th className="px-5 py-3 text-right font-medium">Billets vendus</th>
                  <th className="px-5 py-3 text-right font-medium">Ventes</th>
                  <th className="px-5 py-3 text-right font-medium">Commission</th>
                  <th className="px-5 py-3 text-right font-medium">Mission</th>
                  <th className="px-5 py-3 text-left font-medium">Dernière activité</th>
                  <th className="px-5 py-3 text-center font-medium">Statut</th>
                  <th className="px-5 py-3 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {visibleStats.map(({ collaborator: c, ...s }) => {
                  const mission = collaboratorMissionProgress(c, bookings);
                  return (
                    <tr key={c.id} className="hover:bg-gray-50 transition">
                      <td className="px-5 py-3">
                        <p className="font-medium text-gray-800">{c.name}</p>
                        <p className="text-xs text-gray-500">
                          {c.email ? (
                            <span className="text-gray-600 font-mono">{c.email}</span>
                          ) : (
                            <span className="text-red-400">no email specified</span>
                          )}
                          <span className="text-gray-400 uppercase"> · {c.language ?? "en"}</span>
                        </p>
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-1.5">
                          <code className="text-xs font-mono text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded">
                            {c.code}
                          </code>
                          <button
                            onClick={() => copyLink(c)}
                            className={`p-1 rounded transition cursor-pointer ${
                              copiedId === c.id
                                ? "text-emerald-600"
                                : "text-gray-400 hover:text-gray-700"
                            }`}
                            title={`Copier le lien de parrainage: ${referralUrl(c.code, c.language)}`}
                          >
                            {copiedId === c.id ? (
                              <CheckCircle2 className="h-3.5 w-3.5" />
                            ) : (
                              <Link2 className="h-3.5 w-3.5" />
                            )}
                          </button>
                          <button
                            onClick={() => copyTransferLink(c)}
                            className={`p-1 rounded transition cursor-pointer ${
                              copiedId === `transfer-${c.id}`
                                ? "text-emerald-600"
                                : "text-blue-500 hover:text-blue-800"
                            }`}
                            title={`Copier le lien de transfert du partenaire: ${transferReferralUrl(c.code, c.language)}`}
                          >
                            {copiedId === `transfer-${c.id}` ? (
                              <CheckCircle2 className="h-3.5 w-3.5" />
                            ) : (
                              <Bus className="h-3.5 w-3.5" />
                            )}
                          </button>
                          <button
                            onClick={() => copyTourismLink(c)}
                            className={`p-1 rounded transition cursor-pointer ${
                              copiedId === `tourism-${c.id}`
                                ? "text-emerald-600"
                                : "text-teal-600 hover:text-teal-800"
                            }`}
                            title={`Copier le lien d'excursion du partenaire: ${tourismReferralUrl(c.code, c.language)}`}
                          >
                            {copiedId === `tourism-${c.id}` ? (
                              <CheckCircle2 className="h-3.5 w-3.5" />
                            ) : (
                              <Compass className="h-3.5 w-3.5" />
                            )}
                          </button>
                        </div>
                      </td>
                      <td className="px-5 py-3 text-right">
                        <span className="text-gray-700">{s.singleRooms}</span>
                        {s.pendingSingleRooms > 0 && (
                          <span className="block text-[11px] text-amber-600 font-normal">
                            +{s.pendingSingleRooms} en attente
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-3 text-right">
                        <span className="text-gray-700">{s.doubleRooms}</span>
                        {s.pendingDoubleRooms > 0 && (
                          <span className="block text-[11px] text-amber-600 font-normal">
                            +{s.pendingDoubleRooms} en attente
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-3 text-right">
                        <div className="flex flex-col items-end">
                          <div className="flex items-center gap-1.5 justify-end">
                            <span className="text-gray-900 font-bold">{s.fullPass || s.allPassesCount}</span>
                            {s.pendingPassesCount > 0 && (
                              <span
                                className="text-amber-600 font-semibold text-xs"
                                title={`${s.pendingPassesCount} pass avec paiement en attente`}
                              >
                                (+{s.pendingPassesCount} att.)
                              </span>
                            )}
                            <button
                              type="button"
                              onClick={() => openDetailsModal({ collaborator: c, ...s }, "passes")}
                              className="p-1 rounded text-gray-400 hover:text-amber-600 hover:bg-amber-50 transition cursor-pointer"
                              title="Voir tous les pass en détail"
                            >
                              <Eye className="h-3.5 w-3.5" />
                            </button>
                          </div>
                          {/* Itemized Pass Breakdown */}
                          {s.passesDetail && s.passesDetail.length > 0 && (
                            <div className="mt-1 flex flex-col items-end gap-1">
                              {s.passesDetail.map((p, idx) => (
                                <span
                                  key={idx}
                                  className="inline-flex items-center gap-1 rounded bg-slate-100 border border-slate-200 px-1.5 py-0.5 text-[10px] text-slate-700"
                                  title={`${p.packName} : ${p.confirmedCount} confirmé(s), ${p.pendingCount} en attente`}
                                >
                                  <span className="font-semibold text-slate-900">{p.packName}:</span>
                                  <span>{p.confirmedCount}</span>
                                  {p.pendingCount > 0 && (
                                    <span className="text-amber-600 font-semibold">
                                      (+{p.pendingCount})
                                    </span>
                                  )}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-3 text-right">
                        <div className="flex flex-col items-end">
                          <div className="flex items-center gap-1.5 justify-end">
                            <span className="text-teal-900 font-bold">{s.excursions || 0}</span>
                            {(s.pendingExcursions || 0) > 0 && (
                              <span
                                className="text-amber-600 font-semibold text-xs"
                                title={`${s.pendingExcursions} excursion(s) avec paiement en attente`}
                              >
                                (+{s.pendingExcursions} att.)
                              </span>
                            )}
                            <button
                              type="button"
                              onClick={() => openDetailsModal({ collaborator: c, ...s }, "excursions")}
                              className="p-1 rounded text-gray-400 hover:text-teal-600 hover:bg-teal-50 transition cursor-pointer"
                              title="Voir les excursions de ce collaborateur en détail"
                            >
                              <Eye className="h-3.5 w-3.5" />
                            </button>
                          </div>
                          {/* Itemized Excursion Breakdown */}
                          {s.excursionsDetail && s.excursionsDetail.length > 0 && (
                            <div className="mt-1 flex flex-col items-end gap-1">
                              {s.excursionsDetail.map((e, idx) => (
                                <span
                                  key={idx}
                                  className="inline-flex items-center gap-1 rounded bg-teal-50 border border-teal-200 px-1.5 py-0.5 text-[10px] text-teal-800"
                                  title={`${e.tourName} : ${e.confirmedCount} confirmé(s), ${e.pendingCount} en attente`}
                                >
                                  <span className="font-semibold text-teal-950">{e.tourName}:</span>
                                  <span>{e.confirmedCount}</span>
                                  {e.pendingCount > 0 && (
                                    <span className="text-amber-600 font-semibold">
                                      (+{e.pendingCount})
                                    </span>
                                  )}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-3 text-right font-medium text-gray-800">
                        <span>{s.ticketsSold}</span>
                        {s.pendingTicketsSold > 0 && (
                          <span className="block text-[11px] text-amber-600 font-normal">
                            +{s.pendingTicketsSold} en attente
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-3 text-right whitespace-nowrap">
                        <span className="text-emerald-600 font-semibold">{formatForPartner(s.revenue, c)}</span>
                        {(s.pendingRevenue?.eur > 0 || s.pendingRevenue?.mad > 0) && (
                          <div className="text-[11px] text-amber-600 font-medium flex items-center justify-end gap-1 mt-0.5">
                            <Clock className="h-3 w-3 shrink-0" />
                            <span>+{formatForPartner(s.pendingRevenue, c)} en attente</span>
                          </div>
                        )}
                      </td>
                      <td className="px-5 py-3 text-right whitespace-nowrap">
                        <span className="text-amber-600 font-semibold">{formatForPartner(s.commission, c)}</span>
                        <span className="ml-1.5 text-[10px] text-gray-500">
                          ({commissionLabel(c)}
                          {mission.complete ? " + mission reward" : ""})
                        </span>
                        {(s.pendingCommission?.eur > 0 || s.pendingCommission?.mad > 0) && (
                          <div className="text-[10px] text-amber-600/80 font-normal mt-0.5">
                            +{formatForPartner(s.pendingCommission, c)} si payé
                          </div>
                        )}
                      </td>
                      <td className="px-5 py-3 text-right whitespace-nowrap">
                        {mission.goal ? (
                          <span
                            className={mission.complete ? "text-emerald-600" : "text-gray-700"}
                            title={`Bring ${mission.goal} personnes → gagner ${formatMoney(c.missionReward ?? 0, c.missionCurrency)}`}
                          >
                            {mission.complete ? "✓ " : ""}
                            {mission.creditedParticipants}/{mission.goal}
                            <span className="ml-1.5 text-[10px] text-gray-500">
                              ({formatMoney(c.missionReward ?? 0, c.missionCurrency)})
                            </span>
                          </span>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                      <td className="px-5 py-3 text-xs text-gray-500 whitespace-nowrap">
                        {c.lastSeenAt ? new Date(c.lastSeenAt).toLocaleString("fr-FR") : "jamais"}
                      </td>
                      <td className="px-5 py-3 text-center">
                        <button
                          onClick={() => toggleActive(c)}
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border transition cursor-pointer ${
                            c.active
                              ? "bg-emerald-50 text-emerald-700 border-emerald-300 hover:bg-emerald-100"
                              : "bg-amber-50 text-amber-700 border-amber-300 hover:bg-amber-100"
                          }`}
                          title={
                            c.active
                              ? "Cliquer pour désactiver le compte"
                              : "Cliquer pour activer le compte"
                          }
                        >
                          {c.active ? (
                            <>
                              <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" /> Actif
                            </>
                          ) : (
                            <>
                              <ShieldAlert className="h-3.5 w-3.5 text-amber-600" /> Inactif
                            </>
                          )}
                        </button>
                      </td>
                      <td className="px-5 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {c.email && (
                            <button
                              onClick={() => handleSendResetEmail(c)}
                              className={`p-1.5 rounded-lg transition cursor-pointer ${
                                resetSentId === c.id
                                  ? "text-emerald-600 bg-emerald-50"
                                  : "text-gray-500 hover:text-violet-600 hover:bg-violet-50"
                              }`}
                              title={
                                resetSentId === c.id
                                  ? "Lien copié — voir le résultat de l’envoi en haut de page"
                                  : "Envoyer le lien de création du mot de passe par e-mail et le copier"
                              }
                            >
                              <KeyRound className="h-4 w-4" />
                            </button>
                          )}
                          {canViewAsPartner(getCurrentAdmin()) && (
                            <button
                              onClick={() => {
                                if (!startPartnerImpersonation(c.id)) return;
                                recordAdminAction({
                                  action: "update",
                                  section: "Collaborators",
                                  entityId: c.id,
                                  entityLabel: c.name,
                                  summary: `Opened the partner portal as ${c.name} (view as)`,
                                });
                                window.open("/partner", "_blank", "noopener");
                              }}
                              className="p-1.5 rounded-lg text-gray-500 hover:text-violet-600 hover:bg-violet-50 transition cursor-pointer"
                              title="Voir le portail partenaire en tant que ce collaborateur"
                            >
                              <Eye className="h-4 w-4" />
                            </button>
                          )}
                          <button
                            onClick={() => openDetailsModal({ collaborator: c, ...s }, "passes")}
                            className="p-1.5 rounded-lg text-gray-500 hover:text-amber-600 hover:bg-amber-50 transition cursor-pointer"
                            title="Voir tous les pass et détails des ventes"
                          >
                            <Ticket className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => openEdit(c)}
                            className="p-1.5 rounded-lg text-gray-500 hover:text-amber-600 hover:bg-amber-50 transition cursor-pointer"
                            title="Modifier"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => setDeleteConfirm(c.id)}
                            className="p-1.5 rounded-lg text-gray-500 hover:text-red-600 hover:bg-red-50 transition cursor-pointer"
                            title="Supprimer"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
      </div>

      {/* Supplied collaborator summary and detailed financial templates. */}
      {stats.length > 0 && (
        <div className="flex flex-wrap justify-end gap-2">
          <button
            onClick={downloadCollaboratorsSummaryXlsx}
            className="inline-flex items-center gap-2 rounded-lg border border-emerald-600 bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-emerald-700 transition cursor-pointer"
          >
            <Download className="h-4 w-4" /> Bilan résumé XLSX
          </button>
          <button
            onClick={downloadCollaboratorsDetailsXlsx}
            className="inline-flex items-center gap-2 rounded-lg border border-emerald-600 bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-emerald-700 transition cursor-pointer"
          >
            <Download className="h-4 w-4" /> Bilan détails XLSX
          </button>
        </div>
      )}

      {/* Add / Edit Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-xl border border-gray-200 bg-white p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-display text-lg text-gray-900">
                {editingId ? "Modifier le collaborateur" : "Nouveau collaborateur"}
              </h3>
              <button
                onClick={() => setShowForm(false)}
                className="text-gray-500 hover:text-gray-700 transition cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs tracking-widest uppercase text-gray-500 mb-1.5">
                  Nom
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      name: e.target.value,
                      code: editingId || codeTouched ? f.code : suggestCode(e.target.value),
                    }))
                  }
                  placeholder="e.g. Salsero Madrid"
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-amber-500 transition"
                />
              </div>

              <div>
                <label className="block text-xs tracking-widest uppercase text-gray-500 mb-1.5">
                  Referral Code
                </label>
                <input
                  type="text"
                  value={form.code}
                  onChange={(e) => {
                    const v = e.target.value.toUpperCase().replace(/\s/g, "");
                    setCodeTouched(v !== "");
                    setForm({ ...form, code: v });
                  }}
                  placeholder="SALSERO"
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm font-mono text-amber-700 placeholder:text-gray-400 focus:outline-none focus:border-amber-500 transition"
                />
                {form.code && (
                  <p className="mt-1.5 text-[11px] text-gray-500 break-all">
                    Referral link: {referralUrl(form.code, form.language)}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs tracking-widest uppercase text-gray-500 mb-1.5">
                    E-mail
                  </label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    placeholder="partner@email.com"
                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-amber-500 transition"
                  />
                </div>
                <div>
                  <label className="block text-xs tracking-widest uppercase text-gray-500 mb-1.5">
                    Téléphone
                  </label>
                  <input
                    type="tel"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    placeholder="+212..."
                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-amber-500 transition"
                  />
                </div>
              </div>

              {/* Commission deal */}
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 space-y-3">
                <p className="text-xs tracking-widest uppercase text-amber-700 font-semibold">
                  Commission
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs tracking-widest uppercase text-gray-500 mb-1.5">
                      Type
                    </label>
                    <select
                      value={form.commissionType}
                      onChange={(e) =>
                        setForm({ ...form, commissionType: e.target.value as CommissionType })
                      }
                      className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:border-amber-500 transition cursor-pointer"
                    >
                      <option value="percent">% des ventes</option>
                      <option value="per_person">Montant fixe par personne</option>
                    </select>
                  </div>
                  {form.commissionType === "percent" ? (
                    <div>
                      <label className="block text-xs tracking-widest uppercase text-gray-500 mb-1.5">
                        Percentage
                      </label>
                      <div className="flex gap-1.5">
                        <input
                          type="number"
                          min={0}
                          max={100}
                          value={form.commission}
                          onChange={(e) =>
                            setForm({ ...form, commission: parseFloat(e.target.value) || 0 })
                          }
                          className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:border-amber-500 transition"
                        />
                        <span className="grid place-items-center px-3 rounded-lg border border-gray-300 bg-gray-50 text-sm text-gray-600 shrink-0">
                          %
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <label className="block text-xs tracking-widest uppercase text-gray-500 mb-1.5">
                        Devise
                      </label>
                      <select
                        value={form.commissionCurrency}
                        onChange={(e) =>
                          setForm({
                            ...form,
                            commissionCurrency: e.target.value as CommissionCurrency,
                          })
                        }
                        className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:border-amber-500 transition cursor-pointer"
                        title="Devise de la commission"
                      >
                        <option value="EUR">€ (Euro)</option>
                        <option value="MAD">MAD (Dirham)</option>
                      </select>
                    </div>
                  )}
                </div>

                {form.commissionType === "per_person" && (
                  <div className="grid grid-cols-3 gap-3">
                    {(
                      [
                        ["commissionDouble", "Double room / pers"],
                        ["commissionSingle", "Single room / pers"],
                        ["commissionFullpass", "Full pass / pers"],
                      ] as const
                    ).map(([key, label]) => (
                      <div key={key}>
                        <label className="block text-xs tracking-widest uppercase text-gray-500 mb-1.5">
                          {label}
                        </label>
                        <input
                          type="number"
                          min={0}
                          value={form[key]}
                          onChange={(e) =>
                            setForm({ ...form, [key]: parseFloat(e.target.value) || 0 })
                          }
                          className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:border-amber-500 transition"
                        />
                      </div>
                    ))}
                  </div>
                )}
                <p className="text-[11px] text-gray-500">
                  {form.commissionType === "percent"
                    ? "Le partenaire gagne un pourcentage de la valeur en euros de chaque vente réalisée avec son lien. Les invitations gratuites ne comptent pas."
                    : "Le partenaire gagne un montant différent par personne selon le produit vendu, par exemple 15 pour une chambre double, 10 pour une chambre individuelle et 5 pour un pass complet (une chambre double = 2 personnes). Les invitations gratuites ne comptent pas."}
                </p>
              </div>

              {/* Mission */}
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 space-y-3">
                <p className="text-xs tracking-widest uppercase text-emerald-700 font-semibold">
                  Mission facultative
                </p>
                <p className="text-xs text-gray-500 -mt-1">
                  Objectif bonus affiché dans l’espace partenaire : apporter ce nombre de personnes
                  pour gagner la récompense. Tant que la mission est en cours, les premières ventes
                  ne génèrent aucune commission. La commission commence après l’objectif atteint.
                  Laissez l’objectif vide pour désactiver la mission. Modifiable à tout moment.
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs tracking-widest uppercase text-gray-500 mb-1.5">
                      Objectif (personnes)
                    </label>
                    <input
                      type="number"
                      min={1}
                      value={form.missionGoal}
                      onChange={(e) => setForm({ ...form, missionGoal: e.target.value })}
                      placeholder="p. ex. 2"
                      className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-amber-500 transition"
                    />
                  </div>
                  <div>
                    <label className="block text-xs tracking-widest uppercase text-gray-500 mb-1.5">
                      Récompense
                    </label>
                    <div className="flex gap-1.5">
                      <input
                        type="number"
                        min={0}
                        value={form.missionReward}
                        onChange={(e) =>
                          setForm({ ...form, missionReward: parseFloat(e.target.value) || 0 })
                        }
                        placeholder="p. ex. 100"
                        className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-amber-500 transition"
                      />
                      <select
                        value={form.missionCurrency}
                        onChange={(e) =>
                          setForm({
                            ...form,
                            missionCurrency: e.target.value as CommissionCurrency,
                          })
                        }
                        className="rounded-lg border border-gray-300 bg-white px-2 text-sm text-gray-900 focus:outline-none focus:border-amber-500 transition cursor-pointer shrink-0"
                        title="Devise de la récompense"
                      >
                        <option value="EUR">€</option>
                        <option value="MAD">MAD</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs tracking-widest uppercase text-gray-500 mb-1.5">
                    Langue
                  </label>
                  <select
                    value={form.language}
                    onChange={(e) =>
                      setForm({ ...form, language: e.target.value as PartnerLanguage })
                    }
                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:border-amber-500 transition cursor-pointer"
                  >
                    {LANGUAGES.map((l) => (
                      <option key={l.value} value={l.value}>
                        {l.label}
                      </option>
                    ))}
                  </select>
                  <p className="mt-1.5 text-[11px] text-gray-500">
                    Leur espace s’affiche dans cette langue et leurs liens ouvrent le site dans
                    cette langue pour leurs clients.
                  </p>
                </div>
                <div className="flex items-start pt-7">
                  <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.active}
                      onChange={(e) => setForm({ ...form, active: e.target.checked })}
                      className="accent-amber-500"
                    />
                    Actif
                  </label>
                </div>
              </div>

              {/* Portal account & security */}
              <div className="rounded-lg border border-violet-200 bg-violet-50 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs tracking-widest uppercase text-violet-700 font-semibold">
                    Espace partenaire et sécurité
                  </p>
                  <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.active}
                      onChange={(e) => setForm({ ...form, active: e.target.checked })}
                      className="accent-emerald-600 h-4 w-4"
                    />
                    <span className={form.active ? "text-emerald-700 font-bold" : "text-amber-700"}>
                      {form.active ? "Activé" : "Inactif (en attente)"}
                    </span>
                  </label>
                </div>
                <p className="text-xs text-gray-600">
                  Les partenaires se connectent sur{" "}
                  <code className="font-mono text-violet-700">/partner</code> avec leur e-mail et
                  leur mot de passe. Ils définissent leur mot de passe grâce au lien reçu par e-mail
                  ; il n’est jamais affiché en clair.
                </p>
                <div className="p-2.5 rounded-md bg-white border border-violet-100 text-xs text-gray-600 space-y-1">
                  <p>
                    <span className="font-semibold text-gray-800">État du compte :</span>{" "}
                    {form.active ? (
                      <span className="text-emerald-700 font-semibold">
                        Actif — le partenaire peut se connecter
                      </span>
                    ) : (
                      <span className="text-amber-700 font-semibold">
                        Inactif — le partenaire ne peut pas se connecter avant l’activation du
                        compte.
                      </span>
                    )}
                  </p>
                  <p className="text-gray-500">
                    À la création du compte, un e-mail contenant un lien de définition du mot de
                    passe est automatiquement envoyé au partenaire.
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-xs tracking-widest uppercase text-gray-500 mb-1.5">
                  Notes (facultatives)
                </label>
                <textarea
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  rows={2}
                  placeholder="Conditions, région, personne de contact…"
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-amber-500 transition resize-none"
                />
              </div>

              {saveError && <p className="text-sm text-red-600">{saveError}</p>}
            </div>

            <div className="mt-6 flex items-center gap-3 justify-end">
              <button
                onClick={() => setShowForm(false)}
                className="px-4 py-2 rounded-lg text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition cursor-pointer"
              >
                Annuler
              </button>
              <button
                onClick={handleSave}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold bg-amber-500 text-zinc-950 hover:bg-amber-400 transition cursor-pointer"
              >
                <Check className="h-4 w-4" />{" "}
                {editingId ? "Enregistrer les modifications" : "Créer"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Collaborator Passes & Bookings Details Modal */}
      {selectedCollabForDetails && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-5xl max-h-[90vh] flex flex-col rounded-2xl bg-white shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-gray-200 bg-[#13234d] text-white flex items-center justify-between">
              <div>
                <h3 className="font-display text-lg font-bold flex items-center gap-2">
                  <Ticket className="h-5 w-5 text-amber-300" />
                  Détail des ventes : {selectedCollabForDetails.collaborator.name}
                </h3>
                <p className="text-xs text-slate-300 mt-0.5">
                  Code :{" "}
                  <code className="font-mono text-amber-300">
                    {selectedCollabForDetails.collaborator.code}
                  </code>{" "}
                  · E-mail :{" "}
                  {selectedCollabForDetails.collaborator.email || "Non renseigné"} · Devise :{" "}
                  {selectedCollabForDetails.collaborator.commissionCurrency || "EUR"}
                </p>
              </div>
              <button
                onClick={() => setSelectedCollabForDetails(null)}
                className="text-slate-300 hover:text-white p-1 rounded-lg hover:bg-white/10 transition cursor-pointer"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            {/* Partner Financial Overview */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-5 bg-slate-50 border-b border-gray-200">
              <div className="bg-white p-3 rounded-xl border border-gray-200 shadow-xs">
                <span className="text-[11px] font-semibold text-gray-500 uppercase">
                  Billets vendus
                </span>
                <p className="text-xl font-bold text-gray-900 mt-1">
                  {selectedCollabForDetails.ticketsSold}
                  {selectedCollabForDetails.pendingTicketsSold > 0 && (
                    <span className="text-xs font-semibold text-amber-600 ml-1.5">
                      (+{selectedCollabForDetails.pendingTicketsSold} att.)
                    </span>
                  )}
                </p>
              </div>
              <div className="bg-white p-3 rounded-xl border border-emerald-200 shadow-xs">
                <span className="text-[11px] font-semibold text-emerald-700 uppercase">
                  Ventes confirmées
                </span>
                <p className="text-xl font-bold text-emerald-700 mt-1">
                  {formatForPartner(
                    selectedCollabForDetails.revenue,
                    selectedCollabForDetails.collaborator,
                  )}
                </p>
              </div>
              <div className="bg-white p-3 rounded-xl border border-amber-200 shadow-xs">
                <span className="text-[11px] font-semibold text-amber-700 uppercase">
                  Paiements en attente
                </span>
                <p className="text-xl font-bold text-amber-800 mt-1">
                  {formatForPartner(
                    selectedCollabForDetails.pendingRevenue,
                    selectedCollabForDetails.collaborator,
                  )}
                </p>
              </div>
              <div className="bg-white p-3 rounded-xl border border-violet-200 shadow-xs">
                <span className="text-[11px] font-semibold text-violet-700 uppercase">
                  Commission totale
                </span>
                <p className="text-xl font-bold text-violet-700 mt-1">
                  {formatForPartner(
                    selectedCollabForDetails.commission,
                    selectedCollabForDetails.collaborator,
                  )}
                </p>
              </div>
            </div>

            {/* Pass Types Breakdown */}
            {selectedCollabForDetails.passesDetail.length > 0 && (
              <div className="px-6 py-3 bg-amber-50/70 border-b border-amber-100 flex items-center gap-2 flex-wrap text-xs">
                <span className="font-semibold text-amber-900 flex items-center gap-1">
                  <Ticket className="h-3.5 w-3.5 text-amber-600" /> Récapitulatif de tous les pass :
                </span>
                {selectedCollabForDetails.passesDetail.map((pd, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-1.5 bg-white border border-amber-200 px-2.5 py-1 rounded-lg text-amber-900 font-medium shadow-xs"
                  >
                    <span>{pd.packName}:</span>
                    <span className="font-bold text-emerald-700">
                      {pd.confirmedCount} confirmés
                    </span>
                    {pd.pendingCount > 0 && (
                      <span className="text-amber-700 font-semibold">
                        (+{pd.pendingCount} en attente)
                      </span>
                    )}
                  </span>
                ))}
              </div>
            )}

            {/* Excursions Breakdown */}
            {selectedCollabForDetails.excursionsDetail && selectedCollabForDetails.excursionsDetail.length > 0 && (
              <div className="px-6 py-2.5 bg-teal-50/70 border-b border-teal-100 flex items-center gap-2 flex-wrap text-xs">
                <span className="font-semibold text-teal-900 flex items-center gap-1">
                  <Compass className="h-3.5 w-3.5 text-teal-600" /> Récapitulatif des excursions :
                </span>
                {selectedCollabForDetails.excursionsDetail.map((ed, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-1.5 bg-white border border-teal-200 px-2.5 py-1 rounded-lg text-teal-900 font-medium shadow-xs"
                  >
                    <span>{ed.tourName}:</span>
                    <span className="font-bold text-teal-700">
                      {ed.confirmedCount} confirmés
                    </span>
                    {ed.pendingCount > 0 && (
                      <span className="text-amber-700 font-semibold">
                        (+{ed.pendingCount} en attente)
                      </span>
                    )}
                  </span>
                ))}
              </div>
            )}

            {/* Tabs & Filter */}
            <div className="px-6 py-3 border-b border-gray-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setDetailsTab("passes")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                    detailsTab === "passes"
                      ? "bg-amber-500 text-zinc-950 font-bold"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  Tous les Pass (
                  {
                    bookings.filter(
                      (b) =>
                        b.collaboratorId === selectedCollabForDetails.collaborator.id &&
                        !isTransferBooking(b) &&
                        !isTourismBooking(b) &&
                        packRoomCategory(packs.find((p) => p.id === b.packId) || b.packName, b.numPeople) !== "excursion" &&
                        b.status !== "declined" &&
                        ((b.packName || "").toLowerCase().includes("pass") ||
                          packRoomCategory(
                            packs.find((p) => p.id === b.packId) || b.packName,
                            b.numPeople,
                          ) === "fullpass"),
                    ).length
                  }
                  )
                </button>
                <button
                  type="button"
                  onClick={() => setDetailsTab("excursions")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer flex items-center gap-1 ${
                    detailsTab === "excursions"
                      ? "bg-teal-600 text-white font-bold"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  <Compass className="h-3 w-3" />
                  Excursions (
                  {
                    bookings.filter(
                      (b) =>
                        b.collaboratorId === selectedCollabForDetails.collaborator.id &&
                        !isTransferBooking(b) &&
                        b.status !== "declined" &&
                        (isTourismBooking(b) ||
                          packRoomCategory(
                            packs.find((p) => p.id === b.packId) || b.packName,
                            b.numPeople,
                          ) === "excursion"),
                    ).length
                  }
                  )
                </button>
                <button
                  type="button"
                  onClick={() => setDetailsTab("all")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                    detailsTab === "all"
                      ? "bg-amber-500 text-zinc-950 font-bold"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  Toutes les réservations (
                  {
                    bookings.filter(
                      (b) =>
                        b.collaboratorId === selectedCollabForDetails.collaborator.id &&
                        !isTransferBooking(b) &&
                        b.status !== "declined",
                    ).length
                  }
                  )
                </button>
              </div>

              <div className="flex items-center gap-1.5 text-xs">
                <span className="text-gray-500">Filtrer par statut :</span>
                {(["all", "confirmed", "pending"] as const).map((filterVal) => (
                  <button
                    key={filterVal}
                    type="button"
                    onClick={() => setDetailsStatusFilter(filterVal)}
                    className={`px-2.5 py-1 rounded-md text-xs font-medium transition cursor-pointer ${
                      detailsStatusFilter === filterVal
                        ? filterVal === "pending"
                          ? "bg-amber-600 text-white font-semibold"
                          : filterVal === "confirmed"
                            ? "bg-emerald-600 text-white font-semibold"
                            : "bg-gray-800 text-white font-semibold"
                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    }`}
                  >
                    {filterVal === "all"
                      ? "Tous"
                      : filterVal === "confirmed"
                        ? "Confirmés"
                        : "Paiements en attente"}
                  </button>
                ))}
              </div>
            </div>

            {/* Bookings List Table */}
            <div className="flex-1 overflow-y-auto p-6">
              {(() => {
                const partnerBookings = bookings
                  .filter(
                    (b) =>
                      b.collaboratorId === selectedCollabForDetails.collaborator.id &&
                      !isTransferBooking(b) &&
                      b.status !== "declined",
                  )
                  .filter((b) => {
                    if (detailsTab === "passes") {
                      const p = packs.find((x) => x.id === b.packId);
                      return (
                        !isTourismBooking(b) &&
                        packRoomCategory(p || b.packName, b.numPeople) !== "excursion" &&
                        ((b.packName || "").toLowerCase().includes("pass") ||
                          packRoomCategory(p || b.packName, b.numPeople) === "fullpass" ||
                          (p?.category || "").toLowerCase().includes("pass"))
                      );
                    }
                    if (detailsTab === "excursions") {
                      const p = packs.find((x) => x.id === b.packId);
                      return (
                        isTourismBooking(b) ||
                        packRoomCategory(p || b.packName, b.numPeople) === "excursion"
                      );
                    }
                    return true;
                  })
                  .filter((b) => {
                    if (detailsStatusFilter === "confirmed") return isConfirmedBooking(b);
                    if (detailsStatusFilter === "pending") return b.status === "pending";
                    return true;
                  })
                  .sort(
                    (a, b) =>
                      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
                  );

                if (partnerBookings.length === 0) {
                  return (
                    <div className="py-12 text-center text-sm text-gray-400">
                      Aucune réservation trouvée pour ce filtre.
                    </div>
                  );
                }

                return (
                  <div className="border border-gray-200 rounded-xl overflow-hidden">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-200 bg-gray-50 text-xs font-semibold uppercase text-gray-500">
                          <th className="px-4 py-2.5 text-left">Participant / Client</th>
                          <th className="px-4 py-2.5 text-left">Forfait / Pass</th>
                          <th className="px-4 py-2.5 text-left">Dates du séjour</th>
                          <th className="px-4 py-2.5 text-left">Billet</th>
                          <th className="px-4 py-2.5 text-center">Personnes</th>
                          <th className="px-4 py-2.5 text-center">Statut paiement</th>
                          <th className="px-4 py-2.5 text-right">Date création</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {partnerBookings.map((b) => {
                          const isPend = b.status === "pending";
                          return (
                            <tr key={b.id} className="hover:bg-gray-50 transition">
                              <td className="px-4 py-3">
                                <p className="font-medium text-gray-900">{b.customerName}</p>
                                <p className="text-xs text-gray-500">
                                  {b.email || b.phone || "—"}
                                </p>
                              </td>
                              <td className="px-4 py-3">
                                <span className="font-semibold text-gray-800">
                                  {translateDynamicText(b.packName, "fr")}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-xs text-gray-600 whitespace-nowrap">
                                {b.arrivalDate && b.departureDate ? (
                                  <span>
                                    {new Date(b.arrivalDate).toLocaleDateString("fr-FR")} →{" "}
                                    {new Date(b.departureDate).toLocaleDateString("fr-FR")}
                                  </span>
                                ) : (
                                  <span className="text-gray-400">—</span>
                                )}
                              </td>
                              <td className="px-4 py-3">
                                <code className="text-xs font-mono font-bold text-amber-800 bg-amber-50 px-1.5 py-0.5 rounded">
                                  {b.ticketCode}
                                </code>
                              </td>
                              <td className="px-4 py-3 text-center font-semibold text-gray-700">
                                {b.numPeople || 1}
                              </td>
                              <td className="px-4 py-3 text-center whitespace-nowrap">
                                {isPend ? (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300">
                                    <Clock className="h-3 w-3" /> Paiement en attente
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                                    <Check className="h-3 w-3" /> Confirmé
                                  </span>
                                )}
                              </td>
                              <td className="px-4 py-3 text-right text-xs text-gray-500 whitespace-nowrap">
                                {new Date(b.createdAt).toLocaleDateString("fr-FR")}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                );
              })()}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-3 border-t border-gray-200 bg-gray-50 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedCollabForDetails(null)}
                className="px-4 py-2 rounded-lg bg-gray-900 text-white hover:bg-gray-800 text-sm font-semibold transition cursor-pointer"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm rounded-xl border border-gray-200 bg-white p-6">
            <h3 className="font-display text-lg text-gray-900">Supprimer le collaborateur ?</h3>
            <p className="mt-2 text-sm text-gray-500">
              Their past bookings and invites stay in the system but lose the attribution link.
            </p>
            <div className="mt-6 flex items-center gap-3 justify-end">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="px-4 py-2 rounded-lg text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition cursor-pointer"
              >
                Annuler
              </button>
              <button
                onClick={() => handleDelete(deleteConfirm)}
                className="px-4 py-2 rounded-lg text-sm font-medium bg-red-200 text-red-600 hover:bg-red-200 transition cursor-pointer"
              >
                Supprimer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
