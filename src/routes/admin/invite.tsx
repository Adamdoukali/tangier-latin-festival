import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect, useCallback, useRef } from "react";
import QRCode from "qrcode";
import {
  QrCode,
  Download,
  Copy,
  Trash2,
  Plus,
  ChevronDown,
  CheckCircle2,
  X,
  Zap,
  Link2,
  User,
  Users,
  Search,
} from "lucide-react";
import {
  getInvites,
  generateInvite,
  generateBulkInvites,
  deleteInvite,
  getPacks,
  getCollaborators,
  packLabel,
  packGuestCount,
  type Invite,
  type Pack,
  type Collaborator,
} from "@/lib/admin-store";
import { translateDynamicText } from "@/lib/translations";

export const Route = createFileRoute("/admin/invite")({
  component: AdminInvite,
});

function getRedeemUrl(code: string): string {
  if (typeof window !== "undefined") {
    return `${window.location.origin}/redeem?code=${code}`;
  }
  return `/redeem?code=${code}`;
}

function CollaboratorCombobox({
  collaborators,
  value,
  onChange,
}: {
  collaborators: Collaborator[];
  value: string;
  onChange: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const selected = collaborators.find((c) => c.id === value);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
      const timer = setTimeout(() => searchInputRef.current?.focus(), 50);
      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
        clearTimeout(timer);
      };
    }
  }, [open]);

  const activeCollabs = collaborators.filter((c) => c.active);
  const filtered = activeCollabs.filter(
    (c) =>
      c.name.toLowerCase().includes(query.toLowerCase()) ||
      c.code.toLowerCase().includes(query.toLowerCase()),
  );

  return (
    <div ref={containerRef} className="relative flex-1 min-w-[200px]">
      <button
        type="button"
        onClick={() => {
          setOpen((v) => !v);
          setQuery("");
        }}
        className="w-full flex items-center justify-between gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 hover:border-slate-300 focus:outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-400 transition cursor-pointer text-left"
        title="Attribuer ces invitations à un collaborateur"
      >
        <span className={`truncate ${selected ? "font-medium text-slate-900" : "text-slate-500"}`}>
          {selected ? `${selected.name} (${selected.code})` : "Aucun collaborateur"}
        </span>
        <div className="flex items-center gap-1 shrink-0 text-slate-400">
          {selected && (
            <span
              role="button"
              tabIndex={0}
              onClick={(e) => {
                e.stopPropagation();
                onChange("");
              }}
              className="p-0.5 hover:text-slate-700 cursor-pointer rounded"
              title="Désélectionner"
            >
              <X className="h-3 w-3" />
            </span>
          )}
          <ChevronDown className={`h-3.5 w-3.5 transition-transform ${open ? "rotate-180" : ""}`} />
        </div>
      </button>

      {open && (
        <div className="absolute left-0 right-0 top-full mt-1 z-50 rounded-lg border border-slate-200 bg-white shadow-lg py-1.5 min-w-[240px]">
          <div className="px-2 pb-1.5 border-b border-slate-100">
            <div className="relative flex items-center">
              <Search className="absolute left-2.5 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
              <input
                ref={searchInputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Rechercher nom ou code..."
                className="w-full rounded-md border border-slate-200 bg-slate-50 pl-8 pr-2.5 py-1.5 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-slate-400 transition"
              />
            </div>
          </div>

          <div className="max-h-56 overflow-y-auto pt-1">
            <button
              type="button"
              onClick={() => {
                onChange("");
                setOpen(false);
              }}
              className={`w-full text-left px-3 py-1.5 text-xs transition flex items-center justify-between cursor-pointer ${
                !value ? "bg-slate-100 font-semibold text-slate-900" : "text-slate-600 hover:bg-slate-50"
              }`}
            >
              <span>Aucun collaborateur</span>
              {!value && <CheckCircle2 className="h-3.5 w-3.5 text-slate-900" />}
            </button>

            {filtered.length === 0 ? (
              <div className="px-3 py-3 text-center text-xs text-slate-400">
                Aucun collaborateur trouvé
              </div>
            ) : (
              filtered.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => {
                    onChange(c.id);
                    setOpen(false);
                  }}
                  className={`w-full text-left px-3 py-1.5 text-xs transition flex items-center justify-between cursor-pointer ${
                    value === c.id
                      ? "bg-slate-100 font-semibold text-slate-900"
                      : "text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  <span className="truncate">{c.name}</span>
                  <span className="ml-2 font-mono text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 shrink-0">
                    {c.code}
                  </span>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function AdminInvite() {
  const [invites, setInvites] = useState<Invite[]>([]);
  const [packs, setPacks] = useState<Pack[]>([]);
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [selectedPackId, setSelectedPackId] = useState<string>("");
  const [selectedCollabId, setSelectedCollabId] = useState<string>("");
  const [assignee, setAssignee] = useState<string>("");
  const [bulkCount, setBulkCount] = useState(5);
  const [showBulk, setShowBulk] = useState(false);
  const [qrUrls, setQrUrls] = useState<Record<string, string>>({});
  const [previewInvite, setPreviewInvite] = useState<Invite | null>(null);
  const [previewQr, setPreviewQr] = useState<string>("");
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const reload = useCallback(async () => {
    const [allInvites, allPacks, allCollabs] = await Promise.all([
      getInvites(),
      getPacks(),
      getCollaborators(),
    ]);
    setInvites(
      allInvites.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    );
    // Private (admin-only) packs are invitable too — invites are always
    // handed out by the team, never listed on the website.
    const p = allPacks;
    setPacks(p);
    // Keep the full list so origin chips resolve even for deactivated partners;
    // the generation dropdown filters to active ones itself.
    setCollaborators(allCollabs);
    if (!selectedPackId && p.length > 0) setSelectedPackId(p[0].id);
  }, [selectedPackId]);

  useEffect(() => {
    reload();
  }, [reload]);

  // Generate QR URLs for visible invites — encodes the redeem URL
  useEffect(() => {
    const generateQrs = async () => {
      const urls: Record<string, string> = {};
      for (const inv of invites.slice(0, 50)) {
        if (!qrUrls[inv.id]) {
          try {
            urls[inv.id] = await QRCode.toDataURL(getRedeemUrl(inv.code), {
              width: 200,
              margin: 1,
              color: { dark: "#18181b", light: "#fafafa" },
            });
          } catch {
            urls[inv.id] = "";
          }
        } else {
          urls[inv.id] = qrUrls[inv.id];
        }
      }
      setQrUrls((prev) => ({ ...prev, ...urls }));
    };
    if (invites.length > 0) generateQrs();
  }, [invites]);

  const handleGenerateOne = async () => {
    if (!selectedPackId) return;
    const pack = packs.find((p) => p.id === selectedPackId);
    await generateInvite(selectedPackId, packLabel(pack), assignee, selectedCollabId || undefined);
    setAssignee("");
    await reload();
  };

  const handleGenerateBulk = async () => {
    if (!selectedPackId || bulkCount < 1) return;
    const pack = packs.find((p) => p.id === selectedPackId);
    await generateBulkInvites(
      selectedPackId,
      packLabel(pack),
      bulkCount,
      assignee,
      selectedCollabId || undefined,
    );
    setShowBulk(false);
    setAssignee("");
    await reload();
  };

  const handleDelete = async (id: string) => {
    await deleteInvite(id);
    setDeleteConfirm(null);
    await reload();
  };

  const openPreview = async (invite: Invite) => {
    setPreviewInvite(invite);
    try {
      const url = await QRCode.toDataURL(getRedeemUrl(invite.code), {
        width: 300,
        margin: 2,
        color: { dark: "#18181b", light: "#fafafa" },
      });
      setPreviewQr(url);
    } catch {
      setPreviewQr("");
    }
  };

  const downloadQr = async (invite: Invite) => {
    try {
      const url = await QRCode.toDataURL(getRedeemUrl(invite.code), {
        width: 400,
        margin: 2,
        color: { dark: "#18181b", light: "#fafafa" },
      });
      const a = document.createElement("a");
      a.href = url;
      a.download = `invite-${invite.code}.png`;
      a.click();
    } catch {
      // fail silently
    }
  };

  const copyCode = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  const copyLink = (id: string, code: string) => {
    navigator.clipboard.writeText(getRedeemUrl(code));
    setCopiedId(`link-${id}`);
    setTimeout(() => setCopiedId(null), 1500);
  };

  const usedCount = invites.filter((i) => i.used).length;
  const unusedCount = invites.filter((i) => !i.used).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-semibold text-slate-900">
          Générateur d’invitations QR
        </h2>
        <p className="mt-1 text-xs text-slate-500">
          Générez des invitations QR. Après le scan, les clients renseignent leurs informations et
          arrivent comme réservations en attente ; leur confirmation envoie automatiquement leur
          billet QR.
        </p>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-xs">
          <p className="text-xs font-medium text-slate-500">Total des invitations</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums text-slate-900">{invites.length}</p>
        </div>
        <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-xs">
          <p className="text-xs font-medium text-slate-500">Non utilisées</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums text-emerald-700">{unusedCount}</p>
        </div>
        <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-xs">
          <p className="text-xs font-medium text-slate-500">Utilisées</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums text-amber-700">{usedCount}</p>
        </div>
      </div>

      {/* Generator Controls */}
      <div className="rounded-xl border border-slate-200/80 bg-white p-4.5 shadow-xs">
        <h3 className="text-xs font-semibold text-slate-900 mb-3">
          Générer des invitations
        </h3>
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Pack select */}
          <div className="relative flex-1 min-w-[200px]">
            <select
              value={selectedPackId}
              onChange={(e) => setSelectedPackId(e.target.value)}
              className="w-full appearance-none rounded-lg border border-slate-200 bg-white px-3 pr-8 py-2 text-xs text-slate-900 focus:outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-400 transition cursor-pointer"
            >
              <option value="">Sélectionner un forfait</option>
              {packs.map((p) => {
                const guests = packGuestCount(p);
                const guestLabel =
                  guests === 1
                    ? "1 participant"
                    : guests === 2
                      ? "2 participants (double)"
                      : `${guests} participants (forfait spécial)`;
                const nights = p.features.find((f) => /night|nuit|noche/i.test(f));
                return (
                  <option key={p.id} value={p.id}>
                    {translateDynamicText(p.name, "fr")} · [{guestLabel}]
                    {nights
                      ? ` · ${translateDynamicText(nights, "fr")}`
                      : ` · ${translateDynamicText(p.sub, "fr")}`}{" "}
                    — {p.price} {p.currency || "€"}
                    {p.active ? "" : "  · PRIVÉ (administration uniquement)"}
                  </option>
                );
              })}
            </select>
            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
          </div>

          {/* Collaborator search dropdown */}
          <CollaboratorCombobox
            collaborators={collaborators}
            value={selectedCollabId}
            onChange={setSelectedCollabId}
          />

          {/* Assignee Input */}
          <div className="flex-1 min-w-[200px]">
            <input
              type="text"
              placeholder="Nom du bénéficiaire (facultatif)"
              value={assignee}
              onChange={(e) => setAssignee(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-400 transition"
            />
          </div>

          {/* Buttons */}
          <button
            onClick={handleGenerateOne}
            disabled={!selectedPackId}
            className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-slate-900 px-3.5 py-2 text-xs font-medium text-white hover:bg-slate-800 transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shadow-xs"
          >
            <Plus className="h-3.5 w-3.5" /> Générer 1 invitation
          </button>
          <button
            onClick={() => setShowBulk(true)}
            disabled={!selectedPackId}
            className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shadow-xs"
          >
            <Zap className="h-3.5 w-3.5" /> Générer en masse
          </button>
        </div>
      </div>

      {/* Invites Grid */}
      {invites.length === 0 ? (
        <div className="rounded-xl border border-slate-200/80 bg-white shadow-xs px-5 py-16 text-center text-xs text-slate-400">
          Aucune invitation générée. Sélectionnez un forfait puis cliquez sur « Générer » pour
          commencer.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {invites.map((inv) => (
            <div
              key={inv.id}
              className={`rounded-xl border bg-white shadow-xs p-4 transition ${
                inv.used
                  ? "border-slate-200/60 bg-slate-50/50 opacity-75"
                  : "border-slate-200/80 hover:border-slate-300"
              }`}
            >
              {/* QR Preview */}
              <div
                className="flex justify-center mb-3 cursor-pointer"
                onClick={() => openPreview(inv)}
              >
                {qrUrls[inv.id] ? (
                  <div className="rounded-lg border border-slate-200/80 bg-slate-50 p-2 inline-block hover:scale-[1.02] transition">
                    <img src={qrUrls[inv.id]} alt={`QR ${inv.code}`} className="w-24 h-24" />
                  </div>
                ) : (
                  <div className="w-28 h-28 rounded-lg border border-slate-200/80 bg-slate-50 grid place-items-center">
                    <QrCode className="h-8 w-8 text-slate-300" />
                  </div>
                )}
              </div>

              {/* Code & Status */}
              <div className="text-center">
                <code className="text-xs font-mono text-slate-700 bg-slate-100 border border-slate-200/60 px-2 py-0.5 rounded">
                  {inv.code}
                </code>
                <p className="text-xs font-medium text-slate-900 mt-1.5">{inv.packName}</p>
                {(() => {
                  const p = packs.find((x) => x.id === inv.packId);
                  const guests = p
                    ? packGuestCount(p)
                    : /double|doble|couple/i.test(inv.packName)
                      ? 2
                      : 1;
                  return (
                    <div className="mt-1">
                      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-600 bg-slate-100 border border-slate-200/60 px-2 py-0.5 rounded-md">
                        <Users className="h-3 w-3" /> {guests}{" "}
                        {guests > 1 ? "participants" : "participant"}
                      </span>
                    </div>
                  );
                })()}
                {inv.assignee && (
                  <p className="text-[11px] font-medium text-slate-600 mt-1.5 border border-slate-200/80 rounded bg-slate-50 px-2 py-0.5 inline-block">
                    Pour : {inv.assignee}
                  </p>
                )}
                {inv.collaboratorId && (
                  <p className="text-[11px] font-medium text-sky-700 mt-1.5 border border-sky-200/80 rounded bg-sky-50 px-2 py-0.5 inline-block">
                    {collaborators.find((c) => c.id === inv.collaboratorId)?.name ??
                      "Collaborateur"}
                  </p>
                )}
                {inv.used && (
                  <div className="mt-1.5">
                    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700">
                      <CheckCircle2 className="h-3 w-3" /> Utilisée
                    </span>
                    {inv.redeemedBy && (
                      <p className="text-[11px] text-slate-500 flex items-center justify-center gap-1 mt-0.5">
                        <User className="h-2.5 w-2.5" /> {inv.redeemedBy}
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="mt-3 flex items-center justify-center gap-1 pt-2 border-t border-slate-100">
                <button
                  onClick={() => copyLink(inv.id, inv.code)}
                  className={`h-8 w-8 inline-flex items-center justify-center rounded-lg border text-xs transition cursor-pointer ${
                    copiedId === `link-${inv.id}`
                      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                      : "border-slate-200/80 bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                  }`}
                  title="Copier le lien d’invitation"
                >
                  {copiedId === `link-${inv.id}` ? (
                    <CheckCircle2 className="h-3.5 w-3.5" />
                  ) : (
                    <Link2 className="h-3.5 w-3.5" />
                  )}
                </button>
                <button
                  onClick={() => copyCode(inv.id, inv.code)}
                  className={`h-8 w-8 inline-flex items-center justify-center rounded-lg border text-xs transition cursor-pointer ${
                    copiedId === inv.id
                      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                      : "border-slate-200/80 bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                  }`}
                  title="Copier le code"
                >
                  {copiedId === inv.id ? (
                    <CheckCircle2 className="h-3.5 w-3.5" />
                  ) : (
                    <Copy className="h-3.5 w-3.5" />
                  )}
                </button>
                <button
                  onClick={() => downloadQr(inv)}
                  className="h-8 w-8 inline-flex items-center justify-center rounded-lg border border-slate-200/80 bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition cursor-pointer"
                  title="Télécharger le QR"
                >
                  <Download className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => setDeleteConfirm(inv.id)}
                  className="h-8 w-8 inline-flex items-center justify-center rounded-lg border border-slate-200/80 bg-white text-slate-600 hover:bg-rose-50 hover:text-rose-700 hover:border-rose-200 transition cursor-pointer"
                  title="Supprimer"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Générer en masse Modal */}
      {showBulk && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-sm rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xl">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-slate-900">Générer en masse</h3>
              <button
                onClick={() => setShowBulk(false)}
                className="text-slate-400 hover:text-slate-600 transition cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className="text-xs text-slate-500 mb-4">
              Générez plusieurs codes d’invitation à la fois pour le forfait sélectionné.
            </p>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">
                Nombre d’invitations
              </label>
              <input
                type="number"
                min={1}
                max={100}
                value={bulkCount}
                onChange={(e) =>
                  setBulkCount(Math.min(100, Math.max(1, parseInt(e.target.value) || 1)))
                }
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-400 transition"
              />
            </div>
            <div className="mt-5 flex items-center gap-2 justify-end">
              <button
                onClick={() => setShowBulk(false)}
                className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition cursor-pointer"
              >
                Annuler
              </button>
              <button
                onClick={handleGenerateBulk}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-medium bg-slate-900 text-white hover:bg-slate-800 transition cursor-pointer shadow-xs"
              >
                <Zap className="h-3.5 w-3.5" /> Générer {bulkCount}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* QR Preview Modal */}
      {previewInvite && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-sm rounded-2xl border border-slate-200/80 bg-white p-5 text-center shadow-xl">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-slate-900">Code QR de l’invitation</h3>
              <button
                onClick={() => setPreviewInvite(null)}
                className="text-slate-400 hover:text-slate-600 transition cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            {previewQr && (
              <div className="flex flex-col items-center gap-3">
                <div className="rounded-xl border border-slate-200/80 bg-slate-50 p-3 inline-block">
                  <img src={previewQr} alt="QR Code" className="w-44 h-44" />
                </div>
                <div>
                  <code className="text-xs font-mono text-slate-800 bg-slate-100 border border-slate-200/60 px-2.5 py-1 rounded">
                    {previewInvite.code}
                  </code>
                  <p className="text-xs text-slate-600 font-medium mt-2">{previewInvite.packName}</p>
                  {previewInvite.assignee && (
                    <p className="text-[11px] font-medium text-slate-600 mt-1 border border-slate-200/80 rounded bg-slate-50 px-2 py-0.5 inline-block">
                      Pour : {previewInvite.assignee}
                    </p>
                  )}
                  {previewInvite.collaboratorId && (
                    <p className="text-[11px] font-medium text-sky-700 mt-1 border border-sky-200/80 rounded bg-sky-50 px-2 py-0.5 inline-block">
                      Partenaire :{" "}
                      {collaborators.find((c) => c.id === previewInvite.collaboratorId)?.name ??
                        "Collaborateur"}
                    </p>
                  )}
                  {previewInvite.used && previewInvite.redeemedBy && (
                    <p className="text-xs text-emerald-700 mt-1.5 flex items-center justify-center gap-1">
                      <CheckCircle2 className="h-3 w-3" /> Utilisé par {previewInvite.redeemedBy}
                    </p>
                  )}
                  <p className="text-[10px] text-slate-400 mt-2 break-all font-mono">
                    {getRedeemUrl(previewInvite.code)}
                  </p>
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <button
                    onClick={() => downloadQr(previewInvite)}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-900 text-white hover:bg-slate-800 transition cursor-pointer shadow-xs"
                  >
                    <Download className="h-3.5 w-3.5" /> Télécharger
                  </button>
                  <button
                    onClick={() => copyLink(previewInvite.id, previewInvite.code)}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 transition cursor-pointer shadow-xs"
                  >
                    <Link2 className="h-3.5 w-3.5" /> Lien
                  </button>
                  <button
                    onClick={() => copyCode(previewInvite.id, previewInvite.code)}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 transition cursor-pointer shadow-xs"
                  >
                    <Copy className="h-3.5 w-3.5" /> Code
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-sm rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xl">
            <h3 className="text-sm font-semibold text-slate-900">Supprimer l’invitation ?</h3>
            <p className="mt-1.5 text-xs text-slate-500">
              Ce code d’invitation sera supprimé définitivement.
            </p>
            <div className="mt-5 flex items-center gap-2 justify-end">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition cursor-pointer"
              >
                Annuler
              </button>
              <button
                onClick={() => handleDelete(deleteConfirm)}
                className="px-3 py-1.5 rounded-lg text-xs font-medium bg-rose-600 text-white hover:bg-rose-700 transition cursor-pointer shadow-xs"
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
