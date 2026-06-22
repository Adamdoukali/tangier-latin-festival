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
} from "lucide-react";
import {
  getInvites,
  generateInvite,
  generateBulkInvites,
  deleteInvite,
  getPacks,
  type Invite,
  type Pack,
} from "@/lib/admin-store";

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
  const [selectedPackId, setSelectedPackId] = useState<string>("");
  const [assignee, setAssignee] = useState<string>("");
  const [bulkCount, setBulkCount] = useState(5);
  const [showBulk, setShowBulk] = useState(false);
  const [qrUrls, setQrUrls] = useState<Record<string, string>>({});
  const [previewInvite, setPreviewInvite] = useState<Invite | null>(null);
  const [previewQr, setPreviewQr] = useState<string>("");
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const reload = useCallback(() => {
    const inv = getInvites().sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    setInvites(inv);
    const p = getPacks().filter((pk) => pk.active);
    setPacks(p);
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

  const handleGenerateOne = () => {
    if (!selectedPackId) return;
    const pack = packs.find((p) => p.id === selectedPackId);
    generateInvite(selectedPackId, pack?.name ?? "Unknown", assignee);
    setAssignee("");
    reload();
  };

  const handleGenerateBulk = () => {
    if (!selectedPackId || bulkCount < 1) return;
    const pack = packs.find((p) => p.id === selectedPackId);
    generateBulkInvites(selectedPackId, pack?.name ?? "Unknown", bulkCount, assignee);
    setShowBulk(false);
    setAssignee("");
    reload();
  };

  const handleDelete = (id: string) => {
    deleteInvite(id);
    setDeleteConfirm(null);
    reload();
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
        <h2 className="font-display text-2xl tracking-wide text-zinc-100">
          QR Invite Generator
        </h2>
        <p className="mt-1 text-sm text-zinc-500">
          Generate invite QR codes. When scanned, clients fill in their info and get a confirmed ticket.
        </p>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-xl border border-zinc-800/60 bg-zinc-900/50 p-4">
          <p className="text-xs tracking-widest uppercase text-zinc-500">Total</p>
          <p className="mt-1 font-display text-2xl text-zinc-100">{invites.length}</p>
        </div>
        <div className="rounded-xl border border-zinc-800/60 bg-zinc-900/50 p-4">
          <p className="text-xs tracking-widest uppercase text-zinc-500">Unused</p>
          <p className="mt-1 font-display text-2xl text-emerald-400">{unusedCount}</p>
        </div>
        <div className="rounded-xl border border-zinc-800/60 bg-zinc-900/50 p-4">
          <p className="text-xs tracking-widest uppercase text-zinc-500">Redeemed</p>
          <p className="mt-1 font-display text-2xl text-amber-400">{usedCount}</p>
        </div>
      </div>

      {/* Generator Controls */}
      <div className="rounded-xl border border-zinc-800/60 bg-zinc-900/50 p-5">
        <h3 className="font-display text-sm tracking-wide text-zinc-200 mb-4">
          Generate Invites
        </h3>
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Pack select */}
          <div className="relative flex-1 min-w-[200px]">
            <select
              value={selectedPackId}
              onChange={(e) => setSelectedPackId(e.target.value)}
              className="w-full appearance-none rounded-lg border border-zinc-700/60 bg-zinc-800/50 px-4 pr-8 py-2.5 text-sm text-zinc-100 focus:outline-none focus:border-amber-500/50 transition cursor-pointer"
            >
              <option value="">Select a pack</option>
              {packs.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} — {p.price} {p.currency || "€"}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500 pointer-events-none" />
          </div>

          {/* Assignee Input */}
          <div className="flex-1 min-w-[200px]">
            <input
              type="text"
              placeholder="Assignee name (Optional)"
              value={assignee}
              onChange={(e) => setAssignee(e.target.value)}
              className="w-full rounded-lg border border-zinc-700/60 bg-zinc-800/50 px-4 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-amber-500/50 transition"
            />
          </div>

          {/* Buttons */}
          <button
            onClick={handleGenerateOne}
            disabled={!selectedPackId}
            className="inline-flex items-center gap-2 rounded-lg bg-amber-500 px-4 py-2.5 text-sm font-semibold text-zinc-950 hover:bg-amber-400 transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Plus className="h-4 w-4" /> Generate 1
          </button>
          <button
            onClick={() => setShowBulk(true)}
            disabled={!selectedPackId}
            className="inline-flex items-center gap-2 rounded-lg border border-amber-500/30 px-4 py-2.5 text-sm font-semibold text-amber-400 hover:bg-amber-500/10 transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Zap className="h-4 w-4" /> Bulk Generate
          </button>
        </div>
      </div>

      {/* Invites Grid */}
      {invites.length === 0 ? (
        <div className="rounded-xl border border-zinc-800/60 bg-zinc-900/50 px-5 py-16 text-center text-sm text-zinc-600">
          No invites generated yet. Select a pack and click "Generate" to get started.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {invites.map((inv) => (
            <div
              key={inv.id}
              className={`rounded-xl border bg-zinc-900/50 p-4 transition-all duration-300 ${
                inv.used
                  ? "border-zinc-800/30 opacity-70"
                  : "border-zinc-800/60 hover:border-zinc-700/60"
              }`}
            >
              {/* QR Preview */}
              <div
                className="flex justify-center mb-3 cursor-pointer"
                onClick={() => openPreview(inv)}
              >
                {qrUrls[inv.id] ? (
                  <div className="rounded-lg border border-zinc-700/30 bg-zinc-100 p-2 inline-block hover:scale-105 transition">
                    <img
                      src={qrUrls[inv.id]}
                      alt={`QR ${inv.code}`}
                      className="w-24 h-24"
                    />
                  </div>
                ) : (
                  <div className="w-28 h-28 rounded-lg border border-zinc-700/30 bg-zinc-800/50 grid place-items-center">
                    <QrCode className="h-8 w-8 text-zinc-700" />
                  </div>
                )}
              </div>

              {/* Code & Status */}
              <div className="text-center">
                <code className="text-xs font-mono text-amber-400/80 bg-amber-500/10 px-2 py-0.5 rounded">
                  {inv.code}
                </code>
                <p className="text-xs text-zinc-500 mt-1">{inv.packName}</p>
                {inv.assignee && (
                  <p className="text-[10px] font-semibold text-zinc-300 mt-1.5 uppercase tracking-widest border border-zinc-700/50 rounded bg-zinc-800/40 px-2 py-0.5 inline-block">
                    For: {inv.assignee}
                  </p>
                )}
                {inv.used && (
                  <div className="mt-1.5">
                    <span className="inline-flex items-center gap-1 text-[10px] text-emerald-400">
                      <CheckCircle2 className="h-3 w-3" /> Redeemed
                    </span>
                    {inv.redeemedBy && (
                      <p className="text-[10px] text-zinc-500 flex items-center justify-center gap-1 mt-0.5">
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
                      ? "text-emerald-400 bg-emerald-500/10"
                      : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/60"
                  }`}
                  title="Copy invite link"
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
                      ? "text-emerald-400 bg-emerald-500/10"
                      : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/60"
                  }`}
                  title="Copy code"
                >
                  {copiedId === inv.id ? (
                    <CheckCircle2 className="h-3.5 w-3.5" />
                  ) : (
                    <Copy className="h-3.5 w-3.5" />
                  )}
                </button>
                <button
                  onClick={() => downloadQr(inv)}
                  className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/60 transition cursor-pointer"
                  title="Download QR"
                >
                  <Download className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => setDeleteConfirm(inv.id)}
                  className="p-1.5 rounded-lg text-zinc-500 hover:text-red-400 hover:bg-red-500/10 transition cursor-pointer"
                  title="Delete"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Bulk Generate Modal */}
      {showBulk && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm rounded-xl border border-zinc-800/60 bg-zinc-900 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display text-lg text-zinc-100">
                Bulk Generate
              </h3>
              <button
                onClick={() => setShowBulk(false)}
                className="text-zinc-500 hover:text-zinc-300 transition cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <p className="text-sm text-zinc-500 mb-4">
              Generate multiple invite codes at once for the selected pack.
            </p>
            <div>
              <label className="block text-xs tracking-widest uppercase text-zinc-500 mb-1.5">
                Number of Invites
              </label>
              <input
                type="number"
                min={1}
                max={100}
                value={bulkCount}
                onChange={(e) =>
                  setBulkCount(Math.min(100, Math.max(1, parseInt(e.target.value) || 1)))
                }
                className="w-full rounded-lg border border-zinc-700/60 bg-zinc-800/50 px-3 py-2.5 text-sm text-zinc-100 focus:outline-none focus:border-amber-500/50 transition"
              />
            </div>
            <div className="mt-6 flex items-center gap-3 justify-end">
              <button
                onClick={() => setShowBulk(false)}
                className="px-4 py-2 rounded-lg text-sm text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition cursor-pointer"
              >
                Cancel
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm rounded-xl border border-zinc-800/60 bg-zinc-900 p-6 text-center">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display text-lg text-zinc-100">Invite QR Code</h3>
              <button
                onClick={() => setPreviewInvite(null)}
                className="text-zinc-500 hover:text-zinc-300 transition cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            {previewQr && (
              <div className="flex flex-col items-center gap-4">
                <div className="rounded-xl border border-zinc-700/40 bg-zinc-100 p-4 inline-block">
                  <img
                    src={previewQr}
                    alt="QR Code"
                    className="w-48 h-48"
                  />
                </div>
                <div>
                  <code className="text-sm font-mono text-amber-400/80 bg-amber-500/10 px-2.5 py-1 rounded">
                    {previewInvite.code}
                  </code>
                  <p className="text-xs text-zinc-500 mt-2">
                    {previewInvite.packName}
                  </p>
                  {previewInvite.assignee && (
                    <p className="text-[10px] font-semibold text-amber-400 mt-2 uppercase tracking-widest border border-amber-500/20 rounded bg-amber-500/10 px-2 py-1 inline-block">
                      For: {previewInvite.assignee}
                    </p>
                  )}
                  {previewInvite.used && previewInvite.redeemedBy && (
                    <p className="text-xs text-emerald-400/80 mt-1 flex items-center justify-center gap-1">
                      <CheckCircle2 className="h-3 w-3" /> Redeemed by {previewInvite.redeemedBy}
                    </p>
                  )}
                  <p className="text-[10px] text-zinc-600 mt-2 break-all">
                    {getRedeemUrl(previewInvite.code)}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => downloadQr(previewInvite)}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium bg-amber-500/15 text-amber-400 hover:bg-amber-500/25 transition cursor-pointer"
                  >
                    <Download className="h-3.5 w-3.5" /> Download
                  </button>
                  <button
                    onClick={() => copyLink(previewInvite.id, previewInvite.code)}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium bg-zinc-800/60 text-zinc-400 hover:text-zinc-200 transition cursor-pointer"
                  >
                    <Link2 className="h-3.5 w-3.5" /> Copy Link
                  </button>
                  <button
                    onClick={() => copyCode(previewInvite.id, previewInvite.code)}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium bg-zinc-800/60 text-zinc-400 hover:text-zinc-200 transition cursor-pointer"
                  >
                    <Copy className="h-3.5 w-3.5" /> Copy Code
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm rounded-xl border border-zinc-800/60 bg-zinc-900 p-6">
            <h3 className="font-display text-lg text-zinc-100">Delete Invite?</h3>
            <p className="mt-2 text-sm text-zinc-500">
              This will permanently remove this invite code.
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
