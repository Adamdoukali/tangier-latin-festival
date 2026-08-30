import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect, useCallback } from "react";
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
        <h2 className="font-display text-2xl tracking-wide text-gray-900">
          Générateur d’invitations QR
        </h2>
        <p className="mt-1 text-sm text-gray-500">
          Générez des invitations QR. Après le scan, les clients renseignent leurs informations et
          arrivent comme réservations en attente ; leur confirmation envoie automatiquement leur
          billet QR.
        </p>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm p-4">
          <p className="text-xs tracking-widest uppercase text-gray-500">Total</p>
          <p className="mt-1 font-display text-2xl text-gray-900">{invites.length}</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm p-4">
          <p className="text-xs tracking-widest uppercase text-gray-500">Non utilisée</p>
          <p className="mt-1 font-display text-2xl text-emerald-600">{unusedCount}</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm p-4">
          <p className="text-xs tracking-widest uppercase text-gray-500">Utilisée</p>
          <p className="mt-1 font-display text-2xl text-amber-600">{usedCount}</p>
        </div>
      </div>

      {/* Generator Controls */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm p-5">
        <h3 className="font-display text-sm tracking-wide text-gray-800 mb-4">
          Générer des invitations
        </h3>
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Pack select */}
          <div className="relative flex-1 min-w-[200px]">
            <select
              value={selectedPackId}
              onChange={(e) => setSelectedPackId(e.target.value)}
              className="w-full appearance-none rounded-lg border border-gray-300 bg-white px-4 pr-8 py-2.5 text-sm text-gray-900 focus:outline-none focus:border-amber-500 transition cursor-pointer"
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
            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500 pointer-events-none" />
          </div>

          {/* Collaborator select */}
          <div className="relative flex-1 min-w-[180px]">
            <select
              value={selectedCollabId}
              onChange={(e) => setSelectedCollabId(e.target.value)}
              className="w-full appearance-none rounded-lg border border-gray-300 bg-white px-4 pr-8 py-2.5 text-sm text-gray-900 focus:outline-none focus:border-amber-500 transition cursor-pointer"
              title="Attribuer ces invitations à un collaborateur"
            >
              <option value="">Aucun collaborateur</option>
              {collaborators
                .filter((c) => c.active)
                .map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.code})
                  </option>
                ))}
            </select>
            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500 pointer-events-none" />
          </div>

          {/* Assignee Input */}
          <div className="flex-1 min-w-[200px]">
            <input
              type="text"
              placeholder="Nom du bénéficiaire (facultatif)"
              value={assignee}
              onChange={(e) => setAssignee(e.target.value)}
              className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-amber-500 transition"
            />
          </div>

          {/* Buttons */}
          <button
            onClick={handleGenerateOne}
            disabled={!selectedPackId}
            className="inline-flex items-center gap-2 rounded-lg bg-amber-500 px-4 py-2.5 text-sm font-semibold text-zinc-950 hover:bg-amber-400 transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Plus className="h-4 w-4" /> Générer 1 invitation
          </button>
          <button
            onClick={() => setShowBulk(true)}
            disabled={!selectedPackId}
            className="inline-flex items-center gap-2 rounded-lg border border-amber-200 px-4 py-2.5 text-sm font-semibold text-amber-600 hover:bg-amber-50 transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Zap className="h-4 w-4" /> Générer en masse
          </button>
        </div>
      </div>

      {/* Invites Grid */}
      {invites.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm px-5 py-16 text-center text-sm text-gray-400">
          Aucune invitation générée. Sélectionnez un forfait puis cliquez sur « Générer » pour
          commencer.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {invites.map((inv) => (
            <div
              key={inv.id}
              className={`rounded-xl border bg-white shadow-sm p-4 transition-all duration-300 ${
                inv.used ? "border-gray-100 opacity-70" : "border-gray-200 hover:border-gray-300"
              }`}
            >
              {/* QR Preview */}
              <div
                className="flex justify-center mb-3 cursor-pointer"
                onClick={() => openPreview(inv)}
              >
                {qrUrls[inv.id] ? (
                  <div className="rounded-lg border border-gray-200 bg-zinc-100 p-2 inline-block hover:scale-105 transition">
                    <img src={qrUrls[inv.id]} alt={`QR ${inv.code}`} className="w-24 h-24" />
                  </div>
                ) : (
                  <div className="w-28 h-28 rounded-lg border border-gray-200 bg-white grid place-items-center">
                    <QrCode className="h-8 w-8 text-gray-300" />
                  </div>
                )}
              </div>

              {/* Code & Status */}
              <div className="text-center">
                <code className="text-xs font-mono text-amber-700 bg-amber-50 px-2 py-0.5 rounded">
                  {inv.code}
                </code>
                <p className="text-xs text-gray-800 font-semibold mt-1">{inv.packName}</p>
                {(() => {
                  const p = packs.find((x) => x.id === inv.packId);
                  const guests = p
                    ? packGuestCount(p)
                    : /double|doble|couple/i.test(inv.packName)
                      ? 2
                      : 1;
                  return (
                    <div className="mt-1">
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full">
                        <Users className="h-3 w-3" /> {guests}{" "}
                        {guests > 1 ? "Participants" : "Participant"}
                      </span>
                    </div>
                  );
                })()}
                {inv.assignee && (
                  <p className="text-[10px] font-semibold text-gray-700 mt-1.5 uppercase tracking-widest border border-gray-300/50 rounded bg-gray-50 px-2 py-0.5 inline-block">
                    For: {inv.assignee}
                  </p>
                )}
                {inv.collaboratorId && (
                  <p className="text-[10px] font-semibold text-violet-700 mt-1.5 uppercase tracking-widest border border-violet-200 rounded bg-violet-50 px-2 py-0.5 inline-block">
                    {collaborators.find((c) => c.id === inv.collaboratorId)?.name ??
                      "Collaborateur"}
                  </p>
                )}
                {inv.used && (
                  <div className="mt-1.5">
                    <span className="inline-flex items-center gap-1 text-[10px] text-emerald-600">
                      <CheckCircle2 className="h-3 w-3" /> Utilisée
                    </span>
                    {inv.redeemedBy && (
                      <p className="text-[10px] text-gray-500 flex items-center justify-center gap-1 mt-0.5">
                        <User className="h-2.5 w-2.5" /> {inv.redeemedBy}
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="mt-3 flex items-center justify-center gap-1">
                <button
                  onClick={() => copyLink(inv.id, inv.code)}
                  className={`p-1.5 rounded-lg text-xs transition cursor-pointer ${
                    copiedId === `link-${inv.id}`
                      ? "text-emerald-600 bg-emerald-50"
                      : "text-gray-500 hover:text-gray-700 hover:bg-gray-100"
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
                  className={`p-1.5 rounded-lg text-xs transition cursor-pointer ${
                    copiedId === inv.id
                      ? "text-emerald-600 bg-emerald-50"
                      : "text-gray-500 hover:text-gray-700 hover:bg-gray-100"
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
                  className="p-1.5 rounded-lg text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition cursor-pointer"
                  title="Télécharger le QR"
                >
                  <Download className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => setDeleteConfirm(inv.id)}
                  className="p-1.5 rounded-lg text-gray-500 hover:text-red-600 hover:bg-red-50 transition cursor-pointer"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm rounded-xl border border-gray-200 bg-white p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display text-lg text-gray-900">Générer en masse</h3>
              <button
                onClick={() => setShowBulk(false)}
                className="text-gray-500 hover:text-gray-700 transition cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <p className="text-sm text-gray-500 mb-4">
              Générez plusieurs codes d’invitation à la fois pour le forfait sélectionné.
            </p>
            <div>
              <label className="block text-xs tracking-widest uppercase text-gray-500 mb-1.5">
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
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:border-amber-500 transition"
              />
            </div>
            <div className="mt-6 flex items-center gap-3 justify-end">
              <button
                onClick={() => setShowBulk(false)}
                className="px-4 py-2 rounded-lg text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition cursor-pointer"
              >
                Annuler
              </button>
              <button
                onClick={handleGenerateBulk}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold bg-amber-500 text-zinc-950 hover:bg-amber-400 transition cursor-pointer"
              >
                <Zap className="h-4 w-4" /> Generate {bulkCount}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* QR Preview Modal */}
      {previewInvite && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm rounded-xl border border-gray-200 bg-white p-6 text-center">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display text-lg text-gray-900">Code QR de l’invitation</h3>
              <button
                onClick={() => setPreviewInvite(null)}
                className="text-gray-500 hover:text-gray-700 transition cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            {previewQr && (
              <div className="flex flex-col items-center gap-4">
                <div className="rounded-xl border border-gray-200 bg-zinc-100 p-4 inline-block">
                  <img src={previewQr} alt="QR Code" className="w-48 h-48" />
                </div>
                <div>
                  <code className="text-sm font-mono text-amber-700 bg-amber-50 px-2.5 py-1 rounded">
                    {previewInvite.code}
                  </code>
                  <p className="text-xs text-gray-500 mt-2">{previewInvite.packName}</p>
                  {previewInvite.assignee && (
                    <p className="text-[10px] font-semibold text-amber-600 mt-2 uppercase tracking-widest border border-amber-200 rounded bg-amber-50 px-2 py-1 inline-block">
                      For: {previewInvite.assignee}
                    </p>
                  )}
                  {previewInvite.collaboratorId && (
                    <p className="text-[10px] font-semibold text-violet-600 mt-2 uppercase tracking-widest border border-violet-200 rounded bg-violet-50 px-2 py-1 inline-block">
                      Partenaire :{" "}
                      {collaborators.find((c) => c.id === previewInvite.collaboratorId)?.name ??
                        "Collaborateur"}
                    </p>
                  )}
                  {previewInvite.used && previewInvite.redeemedBy && (
                    <p className="text-xs text-emerald-600/80 mt-1 flex items-center justify-center gap-1">
                      <CheckCircle2 className="h-3 w-3" /> Redeemed by {previewInvite.redeemedBy}
                    </p>
                  )}
                  <p className="text-[10px] text-gray-400 mt-2 break-all">
                    {getRedeemUrl(previewInvite.code)}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => downloadQr(previewInvite)}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium bg-amber-100 text-amber-600 hover:bg-amber-100 transition cursor-pointer"
                  >
                    <Download className="h-3.5 w-3.5" /> Télécharger
                  </button>
                  <button
                    onClick={() => copyLink(previewInvite.id, previewInvite.code)}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium bg-gray-100 text-gray-600 hover:text-gray-800 transition cursor-pointer"
                  >
                    <Link2 className="h-3.5 w-3.5" /> Copier le lien
                  </button>
                  <button
                    onClick={() => copyCode(previewInvite.id, previewInvite.code)}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium bg-gray-100 text-gray-600 hover:text-gray-800 transition cursor-pointer"
                  >
                    <Copy className="h-3.5 w-3.5" /> Copier le code
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm rounded-xl border border-gray-200 bg-white p-6">
            <h3 className="font-display text-lg text-gray-900">Supprimer l’invitation ?</h3>
            <p className="mt-2 text-sm text-gray-500">
              Ce code d’invitation sera supprimé définitivement.
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
