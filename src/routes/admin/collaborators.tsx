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
} from "lucide-react";
import {
  getCollaboratorStats,
  addCollaborator,
  updateCollaborator,
  deleteCollaborator,
  collaboratorsReady,
  commissionColumnsReady,
  languageColumnReady,
  formatMoney,
  commissionLabel,
  type Collaborator,
  type CollaboratorStats,
  type CommissionType,
  type CommissionCurrency,
  type PartnerLanguage,
} from "@/lib/admin-store";

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
  language: PartnerLanguage;
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
  language: "en",
  notes: "",
  active: true,
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

function referralUrl(code: string, lang?: PartnerLanguage): string {
  const base = typeof window !== "undefined" ? window.location.origin : "";
  return `${base}/packs?ref=${code}${lang && lang !== "en" ? `&lang=${lang}` : ""}`;
}

function AdminCollaborators() {
  const [stats, setStats] = useState<CollaboratorStats[]>([]);
  const [ready, setReady] = useState(true);
  const [commissionReady, setCommissionReady] = useState(true);
  const [langReady, setLangReady] = useState(true);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<CollabForm>(emptyForm);
  // Auto-suggest the referral code from the name until it's edited by hand.
  const [codeTouched, setCodeTouched] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const reload = useCallback(async () => {
    const [ok, commOk, langOk, s] = await Promise.all([
      collaboratorsReady(),
      commissionColumnsReady(),
      languageColumnReady(),
      getCollaboratorStats(),
    ]);
    setReady(ok);
    setCommissionReady(commOk);
    setLangReady(langOk);
    setStats(s.sort((a, b) => b.ticketsSold - a.ticketsSold));
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
      language: c.language ?? "en",
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

  const handleSave = async () => {
    if (!form.name.trim() || !form.code.trim()) {
      setSaveError("Name and code are required.");
      return;
    }
    if (form.username.trim() && !form.accessCode.trim()) {
      setSaveError("Set an access code for the portal account (or clear the username).");
      return;
    }
    const payload = {
      ...form,
      inviteQuota: form.inviteQuota.trim() === "" ? null : parseInt(form.inviteQuota, 10) || 0,
    };
    try {
      if (editingId) {
        await updateCollaborator(editingId, payload);
      } else {
        await addCollaborator(payload);
      }
      setShowForm(false);
      setEditingId(null);
      await reload();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      setSaveError(
        msg.includes("duplicate")
          ? "This code or username is already taken — pick another one."
          : msg
      );
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-2xl tracking-wide text-zinc-100">Collaborators</h2>
          <p className="mt-1 text-sm text-zinc-500">
            Partners who sell tickets or distribute invites. Every sale and invite is tracked per
            collaborator.
          </p>
        </div>
        <button
          onClick={openNew}
          className="inline-flex items-center gap-2 rounded-lg bg-amber-500 px-4 py-2.5 text-sm font-semibold text-zinc-950 hover:bg-amber-400 transition cursor-pointer self-start"
        >
          <Plus className="h-4 w-4" /> Add Collaborator
        </button>
      </div>

      {/* DB setup notice */}
      {!ready && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-5 flex gap-3">
          <AlertTriangle className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
          <div className="text-sm text-amber-200/90">
            <p className="font-semibold text-amber-300">Database setup required</p>
            <p className="mt-1">
              The <code className="font-mono">collaborators</code> table doesn't exist yet in your
              Supabase project. Open the Supabase Dashboard → SQL Editor and run the script in{" "}
              <code className="font-mono bg-amber-500/10 px-1 rounded">supabase/schema.sql</code>{" "}
              (in the project repo), then refresh this page.
            </p>
          </div>
        </div>
      )}

      {/* Commission columns missing */}
      {ready && !commissionReady && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-5 flex gap-3">
          <AlertTriangle className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
          <div className="text-sm text-amber-200/90">
            <p className="font-semibold text-amber-300">
              Commission options need a database update
            </p>
            <p className="mt-1">
              The commission <em>type</em> (per person) and <em>currency</em> (MAD) can't be
              saved yet — the database is missing two columns. Open the Supabase Dashboard →
              SQL Editor, run the script in{" "}
              <code className="font-mono bg-amber-500/10 px-1 rounded">
                supabase/commission.sql
              </code>
              , then refresh this page. Until then, collaborators save with the classic
              percentage commission only.
            </p>
          </div>
        </div>
      )}

      {/* Language column missing */}
      {ready && !langReady && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-5 flex gap-3">
          <AlertTriangle className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
          <div className="text-sm text-amber-200/90">
            <p className="font-semibold text-amber-300">
              Partner language needs a database update
            </p>
            <p className="mt-1">
              The partner's language choice can't be saved yet. Open the Supabase Dashboard →
              SQL Editor, run the script in{" "}
              <code className="font-mono bg-amber-500/10 px-1 rounded">
                supabase/partner-language.sql
              </code>
              , then refresh this page.
            </p>
          </div>
        </div>
      )}

      {/* How it works */}
      <div className="rounded-xl border border-zinc-800/60 bg-zinc-900/50 p-5 text-sm text-zinc-400 space-y-1.5">
        <p className="font-display text-sm tracking-wide text-zinc-200 mb-2">How tracking works</p>
        <p>
          · <span className="text-zinc-300">Selling:</span> give each collaborator their referral
          link — any pack booking made through it is attributed to them.
        </p>
        <p>
          · <span className="text-zinc-300">Confirming:</span> bookings arrive as Pending; when
          you (or the partner) confirm after payment, the guest automatically receives their
          ticket QR with their names and details.
        </p>
        <p>
          · <span className="text-zinc-300">Self-service:</span> give a partner a username +
          access code and they can sign in at{" "}
          <code className="font-mono text-violet-400/90">/partner</code> — in their own
          language — to track and confirm their bookings and see their commission.
        </p>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-zinc-800/60 bg-zinc-900/50 overflow-hidden">
        {loading ? (
          <div className="px-5 py-16 text-center text-sm text-zinc-600">Loading…</div>
        ) : stats.length === 0 ? (
          <div className="px-5 py-16 text-center text-sm text-zinc-600">
            <Users className="h-8 w-8 mx-auto mb-3 text-zinc-700" />
            No collaborators yet. Click "Add Collaborator" to create the first one.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-800/60 text-xs tracking-widest uppercase text-zinc-500">
                  <th className="px-5 py-3 text-left font-medium">Name</th>
                  <th className="px-5 py-3 text-left font-medium">Code / Link</th>
                  <th className="px-5 py-3 text-right font-medium">Tickets Sold</th>
                  <th className="px-5 py-3 text-right font-medium">Invites</th>
                  <th className="px-5 py-3 text-right font-medium">Sales (€)</th>
                  <th className="px-5 py-3 text-right font-medium">Commission</th>
                  <th className="px-5 py-3 text-left font-medium">Last Active</th>
                  <th className="px-5 py-3 text-center font-medium">Active</th>
                  <th className="px-5 py-3 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/40">
                {stats.map(({ collaborator: c, ...s }) => (
                  <tr key={c.id} className="hover:bg-zinc-800/30 transition">
                    <td className="px-5 py-3">
                      <p className="font-medium text-zinc-200">{c.name}</p>
                      <p className="text-xs text-zinc-500">
                        {c.username ? (
                          <span className="font-mono text-violet-400/80">@{c.username}</span>
                        ) : (
                          <span className="text-zinc-600">no portal account</span>
                        )}
                        <span className="text-zinc-600 uppercase"> · {c.language ?? "en"}</span>
                      </p>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-1.5">
                        <code className="text-xs font-mono text-amber-400/80 bg-amber-500/10 px-1.5 py-0.5 rounded">
                          {c.code}
                        </code>
                        <button
                          onClick={() => copyLink(c)}
                          className={`p-1 rounded transition cursor-pointer ${
                            copiedId === c.id
                              ? "text-emerald-400"
                              : "text-zinc-600 hover:text-zinc-300"
                          }`}
                          title={`Copy referral link: ${referralUrl(c.code, c.language)}`}
                        >
                          {copiedId === c.id ? (
                            <CheckCircle2 className="h-3.5 w-3.5" />
                          ) : (
                            <Link2 className="h-3.5 w-3.5" />
                          )}
                        </button>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-right text-zinc-200 font-medium">
                      {s.ticketsSold}
                    </td>
                    <td className="px-5 py-3 text-right text-zinc-400">
                      {s.invitesRedeemed}/{s.invitesIssued}
                    </td>
                    <td className="px-5 py-3 text-right text-emerald-400">
                      {s.revenue.toLocaleString()}
                    </td>
                    <td className="px-5 py-3 text-right whitespace-nowrap">
                      <span className="text-amber-400">
                        {formatMoney(s.commission, s.commissionCurrency)}
                      </span>
                      <span className="ml-1.5 text-[10px] text-zinc-500">
                        ({commissionLabel(c)})
                      </span>
                    </td>
                    <td className="px-5 py-3 text-xs text-zinc-500 whitespace-nowrap">
                      {c.lastSeenAt ? new Date(c.lastSeenAt).toLocaleString() : "never"}
                    </td>
                    <td className="px-5 py-3 text-center">
                      <button
                        onClick={() => toggleActive(c)}
                        className="cursor-pointer align-middle"
                        title={c.active ? "Deactivate" : "Activate"}
                      >
                        {c.active ? (
                          <ToggleRight className="h-5 w-5 text-emerald-400" />
                        ) : (
                          <ToggleLeft className="h-5 w-5 text-zinc-600" />
                        )}
                      </button>
                    </td>
                    <td className="px-5 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => openEdit(c)}
                          className="p-1.5 rounded-lg text-zinc-500 hover:text-amber-400 hover:bg-amber-500/10 transition cursor-pointer"
                          title="Edit"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => setDeleteConfirm(c.id)}
                          className="p-1.5 rounded-lg text-zinc-500 hover:text-red-400 hover:bg-red-500/10 transition cursor-pointer"
                          title="Delete"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add / Edit Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-xl border border-zinc-800/60 bg-zinc-900 p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-display text-lg text-zinc-100">
                {editingId ? "Edit Collaborator" : "New Collaborator"}
              </h3>
              <button
                onClick={() => setShowForm(false)}
                className="text-zinc-500 hover:text-zinc-300 transition cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs tracking-widest uppercase text-zinc-500 mb-1.5">
                  Name
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      name: e.target.value,
                      code:
                        editingId || codeTouched ? f.code : suggestCode(e.target.value),
                    }))
                  }
                  placeholder="e.g. Salsero Madrid"
                  className="w-full rounded-lg border border-zinc-700/60 bg-zinc-800/50 px-3 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-amber-500/50 transition"
                />
              </div>

              <div>
                <label className="block text-xs tracking-widest uppercase text-zinc-500 mb-1.5">
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
                  className="w-full rounded-lg border border-zinc-700/60 bg-zinc-800/50 px-3 py-2.5 text-sm font-mono text-amber-300 placeholder:text-zinc-600 focus:outline-none focus:border-amber-500/50 transition"
                />
                {form.code && (
                  <p className="mt-1.5 text-[11px] text-zinc-500 break-all">
                    Referral link: {referralUrl(form.code, form.language)}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs tracking-widest uppercase text-zinc-500 mb-1.5">
                    Email
                  </label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    placeholder="partner@email.com"
                    className="w-full rounded-lg border border-zinc-700/60 bg-zinc-800/50 px-3 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-amber-500/50 transition"
                  />
                </div>
                <div>
                  <label className="block text-xs tracking-widest uppercase text-zinc-500 mb-1.5">
                    Phone
                  </label>
                  <input
                    type="tel"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    placeholder="+212..."
                    className="w-full rounded-lg border border-zinc-700/60 bg-zinc-800/50 px-3 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-amber-500/50 transition"
                  />
                </div>
              </div>

              {/* Commission deal */}
              <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-4 space-y-3">
                <p className="text-xs tracking-widest uppercase text-amber-300 font-semibold">
                  Commission
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs tracking-widest uppercase text-zinc-500 mb-1.5">
                      Type
                    </label>
                    <select
                      value={form.commissionType}
                      onChange={(e) =>
                        setForm({ ...form, commissionType: e.target.value as CommissionType })
                      }
                      className="w-full rounded-lg border border-zinc-700/60 bg-zinc-800/50 px-3 py-2.5 text-sm text-zinc-100 focus:outline-none focus:border-amber-500/50 transition cursor-pointer"
                    >
                      <option value="percent">% of sales</option>
                      <option value="per_person">Fixed amount per person</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs tracking-widest uppercase text-zinc-500 mb-1.5">
                      {form.commissionType === "percent" ? "Percentage" : "Amount / person"}
                    </label>
                    <div className="flex gap-1.5">
                      <input
                        type="number"
                        min={0}
                        max={form.commissionType === "percent" ? 100 : undefined}
                        value={form.commission}
                        onChange={(e) =>
                          setForm({ ...form, commission: parseFloat(e.target.value) || 0 })
                        }
                        className="w-full rounded-lg border border-zinc-700/60 bg-zinc-800/50 px-3 py-2.5 text-sm text-zinc-100 focus:outline-none focus:border-amber-500/50 transition"
                      />
                      {form.commissionType === "percent" ? (
                        <span className="grid place-items-center px-3 rounded-lg border border-zinc-700/60 bg-zinc-800/30 text-sm text-zinc-400 shrink-0">
                          %
                        </span>
                      ) : (
                        <select
                          value={form.commissionCurrency}
                          onChange={(e) =>
                            setForm({
                              ...form,
                              commissionCurrency: e.target.value as CommissionCurrency,
                            })
                          }
                          className="rounded-lg border border-zinc-700/60 bg-zinc-800/50 px-2 text-sm text-zinc-100 focus:outline-none focus:border-amber-500/50 transition cursor-pointer shrink-0"
                          title="Commission currency"
                        >
                          <option value="EUR">€</option>
                          <option value="MAD">MAD</option>
                        </select>
                      )}
                    </div>
                  </div>
                </div>
                <p className="text-[11px] text-zinc-500">
                  {form.commissionType === "percent"
                    ? "Earns a percentage of the € value of every sale made through their link. Free invite tickets don't count."
                    : "Earns this amount for every person who books through their link (a double room = 2 people). Free invite tickets don't count."}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs tracking-widest uppercase text-zinc-500 mb-1.5">
                    Language
                  </label>
                  <select
                    value={form.language}
                    onChange={(e) =>
                      setForm({ ...form, language: e.target.value as PartnerLanguage })
                    }
                    className="w-full rounded-lg border border-zinc-700/60 bg-zinc-800/50 px-3 py-2.5 text-sm text-zinc-100 focus:outline-none focus:border-amber-500/50 transition cursor-pointer"
                  >
                    {LANGUAGES.map((l) => (
                      <option key={l.value} value={l.value}>
                        {l.label}
                      </option>
                    ))}
                  </select>
                  <p className="mt-1.5 text-[11px] text-zinc-500">
                    Their portal displays in this language, and their links open the website
                    in it for their guests.
                  </p>
                </div>
                <div className="flex items-start pt-7">
                  <label className="flex items-center gap-2 text-sm text-zinc-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.active}
                      onChange={(e) => setForm({ ...form, active: e.target.checked })}
                      className="accent-amber-500"
                    />
                    Active
                  </label>
                </div>
              </div>

              {/* Portal account */}
              <div className="rounded-lg border border-violet-500/20 bg-violet-500/5 p-4 space-y-3">
                <p className="text-xs tracking-widest uppercase text-violet-300 font-semibold">
                  Partner Portal account (optional)
                </p>
                <p className="text-xs text-zinc-500 -mt-1">
                  Lets this partner sign in at <code className="font-mono">/partner</code> to
                  track their bookings, confirm them, and see their commission.
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs tracking-widest uppercase text-zinc-500 mb-1.5">
                      Username
                    </label>
                    <input
                      type="text"
                      value={form.username}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          username: e.target.value.toLowerCase().replace(/\s/g, ""),
                        })
                      }
                      placeholder="salsero"
                      className="w-full rounded-lg border border-zinc-700/60 bg-zinc-800/50 px-3 py-2.5 text-sm font-mono text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-amber-500/50 transition"
                    />
                  </div>
                  <div>
                    <label className="block text-xs tracking-widest uppercase text-zinc-500 mb-1.5">
                      Access Code
                    </label>
                    <div className="flex gap-1.5">
                      <input
                        type="text"
                        value={form.accessCode}
                        onChange={(e) => setForm({ ...form, accessCode: e.target.value.trim() })}
                        placeholder="secret code"
                        className="w-full rounded-lg border border-zinc-700/60 bg-zinc-800/50 px-3 py-2.5 text-sm font-mono text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-amber-500/50 transition"
                      />
                      <button
                        type="button"
                        onClick={() => setForm({ ...form, accessCode: generateAccessCode() })}
                        className="px-2.5 rounded-lg border border-zinc-700/60 text-xs text-zinc-400 hover:text-amber-400 hover:border-amber-500/40 transition cursor-pointer shrink-0"
                        title="Generate a random access code"
                      >
                        ↻
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs tracking-widest uppercase text-zinc-500 mb-1.5">
                  Notes (optional)
                </label>
                <textarea
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  rows={2}
                  placeholder="Deal terms, region, contact person..."
                  className="w-full rounded-lg border border-zinc-700/60 bg-zinc-800/50 px-3 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-amber-500/50 transition resize-none"
                />
              </div>

              {saveError && <p className="text-sm text-red-400">{saveError}</p>}
            </div>

            <div className="mt-6 flex items-center gap-3 justify-end">
              <button
                onClick={() => setShowForm(false)}
                className="px-4 py-2 rounded-lg text-sm text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold bg-amber-500 text-zinc-950 hover:bg-amber-400 transition cursor-pointer"
              >
                <Check className="h-4 w-4" /> {editingId ? "Save Changes" : "Create"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm rounded-xl border border-zinc-800/60 bg-zinc-900 p-6">
            <h3 className="font-display text-lg text-zinc-100">Delete Collaborator?</h3>
            <p className="mt-2 text-sm text-zinc-500">
              Their past bookings and invites stay in the system but lose the attribution link.
            </p>
            <div className="mt-6 flex items-center gap-3 justify-end">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="px-4 py-2 rounded-lg text-sm text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deleteConfirm)}
                className="px-4 py-2 rounded-lg text-sm font-medium bg-red-500/20 text-red-400 hover:bg-red-500/30 transition cursor-pointer"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
