import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect, useCallback } from "react";
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
  formatForPartner,
  commissionLabel,
  collaboratorMissionProgress,
  partnerShareLink,
  partnerTransferShareLink,
  type Collaborator,
  type CollaboratorStats,
  type Booking,
  type Pack,
  type CommissionType,
  type CommissionCurrency,
  type PartnerLanguage,
} from "@/lib/admin-store";
import {
  buildCollaboratorDetailsSpreadsheet,
  buildCollaboratorSummarySpreadsheet,
} from "@/lib/admin-export-data";
import { downloadXlsx } from "@/lib/spreadsheet-export";

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

function AdminCollaborators() {
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
          requestPasswordReset(created.email).catch(() => {});
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
    const res = await requestPasswordReset(c.email);
    if (res.success) {
      setResetSentId(c.id);
      setTimeout(() => setResetSentId(null), 3000);
      if (res.resetUrl) {
        navigator.clipboard.writeText(res.resetUrl);
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-2xl tracking-wide text-gray-900">Collaborateurs</h2>
          <p className="mt-1 text-sm text-gray-500">
            Partenaires qui vendent des billets ou distribuent des invitations. Chaque vente et
            invitation est attribuée au collaborateur concerné.
          </p>
        </div>
        <button
          onClick={openNew}
          className="inline-flex items-center gap-2 rounded-lg bg-amber-500 px-4 py-2.5 text-sm font-semibold text-zinc-950 hover:bg-amber-400 transition cursor-pointer self-start"
        >
          <Plus className="h-4 w-4" /> Ajouter un collaborateur
        </button>
      </div>

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
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Rechercher un collaborateur par nom, code, identifiant, e-mail ou téléphone…"
          className="w-full rounded-lg border border-gray-300 bg-white pl-9 pr-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-amber-500 transition"
        />
      </div>

      {/* Table */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        {loading ? (
          <div className="px-5 py-16 text-center text-sm text-gray-400">Chargement…</div>
        ) : visibleStats.length === 0 ? (
          <div className="px-5 py-16 text-center text-sm text-gray-400">
            <Users className="h-8 w-8 mx-auto mb-3 text-gray-300" />
            Aucun collaborateur. Cliquez sur « Ajouter un collaborateur » pour créer le premier.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-xs tracking-widest uppercase text-gray-500">
                  <th className="px-5 py-3 text-left font-medium">Partenaire / e-mail</th>
                  <th className="px-5 py-3 text-left font-medium">Code / lien</th>
                  <th className="px-5 py-3 text-right font-medium">Chambres individuelles</th>
                  <th className="px-5 py-3 text-right font-medium">Chambres doubles</th>
                  <th className="px-5 py-3 text-right font-medium">Pass complet</th>
                  <th className="px-5 py-3 text-right font-medium">Billets vendus</th>
                  <th className="px-5 py-3 text-right font-medium">Ventes</th>
                  <th className="px-5 py-3 text-right font-medium">Commission</th>
                  <th className="px-5 py-3 text-right font-medium">Mission</th>
                  <th className="px-5 py-3 text-left font-medium">Dernière activité</th>
                  <th className="px-5 py-3 text-center font-medium">Statut</th>
                  <th className="px-5 py-3 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
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
                        </div>
                      </td>
                      <td className="px-5 py-3 text-right text-gray-700">{s.singleRooms}</td>
                      <td className="px-5 py-3 text-right text-gray-700">{s.doubleRooms}</td>
                      <td className="px-5 py-3 text-right text-gray-700">{s.fullPass}</td>
                      <td className="px-5 py-3 text-right text-gray-800 font-medium">
                        {s.ticketsSold}
                      </td>
                      <td className="px-5 py-3 text-right whitespace-nowrap text-emerald-600">
                        {formatForPartner(s.revenue, c)}
                      </td>
                      <td className="px-5 py-3 text-right whitespace-nowrap">
                        <span className="text-amber-600">{formatForPartner(s.commission, c)}</span>
                        <span className="ml-1.5 text-[10px] text-gray-500">
                          ({commissionLabel(c)}
                          {mission.complete ? " + mission reward" : ""})
                        </span>
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
                                  ? "Lien de mot de passe copié et e-mail envoyé !"
                                  : "Envoyer le lien de création du mot de passe par e-mail et le copier"
                              }
                            >
                              <KeyRound className="h-4 w-4" />
                            </button>
                          )}
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
