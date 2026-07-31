import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect, useCallback } from "react";
import {
  Tag,
  Plus,
  Search,
  X,
  Check,
  Trash2,
  Edit2,
  Copy,
  CheckCircle2,
  AlertCircle,
  Percent,
  Euro,
  Users,
  Power,
} from "lucide-react";
import {
  getDiscountCodes,
  addDiscountCode,
  updateDiscountCode,
  deleteDiscountCode,
  type DiscountCode,
  type DiscountType,
  type CommissionType,
} from "@/lib/admin-store";

export const Route = createFileRoute("/admin/discounts")({
  component: AdminDiscounts,
});

function AdminDiscounts() {
  const [discounts, setDiscounts] = useState<DiscountCode[]>([]);
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<DiscountCode | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [error, setError] = useState("");

  const reload = useCallback(async () => {
    const list = await getDiscountCodes();
    setDiscounts(list);
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  // Form State
  const [form, setForm] = useState({
    code: "",
    discountAmount: 50,
    discountType: "fixed" as DiscountType,
    commissionOverride: "" as string | number,
    commissionType: "fixed" as CommissionType,
    maxUses: "" as string | number,
    active: true,
    notes: "",
  });

  const openCreateModal = () => {
    setEditing(null);
    setForm({
      code: "",
      discountAmount: 50,
      discountType: "fixed",
      commissionOverride: 10, // Default €10 override as requested
      commissionType: "fixed",
      maxUses: "",
      active: true,
      notes: "",
    });
    setError("");
    setShowModal(true);
  };

  const openEditModal = (d: DiscountCode) => {
    setEditing(d);
    setForm({
      code: d.code,
      discountAmount: d.discountAmount,
      discountType: d.discountType,
      commissionOverride: d.commissionOverride != null ? d.commissionOverride : "",
      commissionType: d.commissionType || "fixed",
      maxUses: d.maxUses != null ? d.maxUses : "",
      active: d.active,
      notes: d.notes || "",
    });
    setError("");
    setShowModal(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!form.code.trim()) {
      setError("Discount code is required.");
      return;
    }

    const cleanCode = form.code.trim().toUpperCase();
    const existing = discounts.find(
      (d) => d.code.toUpperCase() === cleanCode && d.id !== editing?.id
    );
    if (existing) {
      setError(`Discount code "${cleanCode}" already exists.`);
      return;
    }

    const commOverride =
      form.commissionOverride !== "" && !isNaN(Number(form.commissionOverride))
        ? Number(form.commissionOverride)
        : null;

    const maxUsesVal =
      form.maxUses !== "" && !isNaN(Number(form.maxUses))
        ? Number(form.maxUses)
        : null;

    try {
      if (editing) {
        await updateDiscountCode(editing.id, {
          code: cleanCode,
          discountAmount: Number(form.discountAmount) || 0,
          discountType: form.discountType,
          commissionOverride: commOverride,
          commissionType: form.commissionType,
          maxUses: maxUsesVal,
          active: form.active,
          notes: form.notes,
        });
      } else {
        await addDiscountCode({
          code: cleanCode,
          discountAmount: Number(form.discountAmount) || 0,
          discountType: form.discountType,
          commissionOverride: commOverride,
          commissionType: form.commissionType,
          maxUses: maxUsesVal,
          active: form.active,
          notes: form.notes,
        });
      }
      setShowModal(false);
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  const handleToggleActive = async (d: DiscountCode) => {
    await updateDiscountCode(d.id, { active: !d.active });
    await reload();
  };

  const handleDelete = async (id: string) => {
    await deleteDiscountCode(id);
    setDeleteConfirm(null);
    await reload();
  };

  const copyToClipboard = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const filtered = discounts.filter(
    (d) =>
      d.code.toLowerCase().includes(search.toLowerCase()) ||
      (d.notes && d.notes.toLowerCase().includes(search.toLowerCase()))
  );

  const totalActive = discounts.filter((d) => d.active).length;
  const totalUses = discounts.reduce((acc, d) => acc + (d.usedCount || 0), 0);

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Tag className="h-6 w-6 text-amber-500" />
            <h1 className="text-2xl font-bold text-gray-900">Discount Codes</h1>
          </div>
          <p className="text-sm text-gray-500 mt-1">
            Create public and collaborator discount codes with custom commission overrides.
          </p>
        </div>
        <button
          onClick={openCreateModal}
          className="inline-flex items-center gap-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold px-4 py-2.5 rounded-lg shadow-sm transition cursor-pointer self-start sm:self-auto"
        >
          <Plus className="h-4 w-4" /> New Discount Code
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex items-center gap-4">
          <div className="h-12 w-12 rounded-lg bg-amber-50 grid place-items-center text-amber-600 shrink-0">
            <Tag className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Total Discount Codes
            </p>
            <p className="text-2xl font-bold text-gray-900 mt-0.5">{discounts.length}</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex items-center gap-4">
          <div className="h-12 w-12 rounded-lg bg-emerald-50 grid place-items-center text-emerald-600 shrink-0">
            <Power className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Active Codes
            </p>
            <p className="text-2xl font-bold text-gray-900 mt-0.5">{totalActive}</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex items-center gap-4">
          <div className="h-12 w-12 rounded-lg bg-blue-50 grid place-items-center text-blue-600 shrink-0">
            <Users className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Total Redemptions
            </p>
            <p className="text-2xl font-bold text-gray-900 mt-0.5">{totalUses}</p>
          </div>
        </div>
      </div>

      {/* Search & Filter */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search discount codes or notes..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:border-blue-500 focus:bg-white transition"
          />
        </div>
      </div>

      {/* Discount Codes Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-600">
            <thead className="bg-slate-50 text-gray-700 font-semibold border-b border-gray-200 uppercase text-xs tracking-wider">
              <tr>
                <th className="px-6 py-4">Code</th>
                <th className="px-6 py-4">Discount</th>
                <th className="px-6 py-4">Partner Commission</th>
                <th className="px-6 py-4">Redemptions</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Notes</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-400">
                    No discount codes found.
                  </td>
                </tr>
              ) : (
                filtered.map((d) => (
                  <tr key={d.id} className="hover:bg-slate-50/80 transition">
                    <td className="px-6 py-4 font-mono font-bold text-gray-900">
                      <div className="flex items-center gap-2">
                        <span className="px-2.5 py-1 rounded bg-amber-50 text-amber-700 border border-amber-200">
                          {d.code}
                        </span>
                        <button
                          onClick={() => copyToClipboard(d.code)}
                          className="p-1 text-gray-400 hover:text-gray-600 rounded transition cursor-pointer"
                          title="Copy code"
                        >
                          {copiedCode === d.code ? (
                            <Check className="h-3.5 w-3.5 text-emerald-600" />
                          ) : (
                            <Copy className="h-3.5 w-3.5" />
                          )}
                        </button>
                      </div>
                    </td>

                    <td className="px-6 py-4 font-semibold text-gray-900">
                      {d.discountType === "percent"
                        ? `-${d.discountAmount}%`
                        : `-€${d.discountAmount}`}
                    </td>

                    <td className="px-6 py-4">
                      {d.commissionOverride != null ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-200">
                          {d.commissionType === "percent"
                            ? `${d.commissionOverride}%`
                            : `€${d.commissionOverride} / booking`}
                        </span>
                      ) : (
                        <span className="text-gray-400 text-xs italic">
                          Standard rate
                        </span>
                      )}
                    </td>

                    <td className="px-6 py-4 text-gray-700 font-medium">
                      {d.usedCount}
                      {d.maxUses != null ? (
                        <span className="text-gray-400 font-normal"> / {d.maxUses}</span>
                      ) : (
                        <span className="text-gray-400 font-normal"> / ∞</span>
                      )}
                    </td>

                    <td className="px-6 py-4">
                      <button
                        onClick={() => handleToggleActive(d)}
                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold cursor-pointer transition ${
                          d.active
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100"
                            : "bg-gray-100 text-gray-500 border border-gray-200 hover:bg-gray-200"
                        }`}
                      >
                        <span
                          className={`h-2 w-2 rounded-full ${
                            d.active ? "bg-emerald-500" : "bg-gray-400"
                          }`}
                        />
                        {d.active ? "Active" : "Disabled"}
                      </button>
                    </td>

                    <td className="px-6 py-4 text-gray-500 text-xs max-w-xs truncate">
                      {d.notes || "—"}
                    </td>

                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => openEditModal(d)}
                          className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition cursor-pointer"
                          title="Edit"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        {deleteConfirm === d.id ? (
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => handleDelete(d.id)}
                              className="px-2 py-1 bg-red-600 text-white rounded text-xs font-bold hover:bg-red-700 cursor-pointer"
                            >
                              Confirm
                            </button>
                            <button
                              onClick={() => setDeleteConfirm(null)}
                              className="p-1 text-gray-400 hover:text-gray-600 rounded cursor-pointer"
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setDeleteConfirm(d.id)}
                            className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition cursor-pointer"
                            title="Delete"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Form */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-gray-200 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between px-6 py-4 bg-slate-900 text-white">
              <h2 className="font-semibold text-lg flex items-center gap-2">
                <Tag className="h-5 w-5 text-amber-400" />
                {editing ? "Edit Discount Code" : "New Discount Code"}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-white transition cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-6 space-y-4">
              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                  Discount Code Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. VIP50, SUMMER20"
                  value={form.code}
                  onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                  className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg font-mono font-bold text-gray-900 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                    Discount Value *
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    required
                    value={form.discountAmount}
                    onChange={(e) =>
                      setForm({ ...form, discountAmount: Number(e.target.value) })
                    }
                    className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                    Discount Type
                  </label>
                  <select
                    value={form.discountType}
                    onChange={(e) =>
                      setForm({ ...form, discountType: e.target.value as DiscountType })
                    }
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-gray-900 bg-white focus:outline-none focus:border-amber-500"
                  >
                    <option value="fixed">Fixed Amount (€)</option>
                    <option value="percent">Percentage (%)</option>
                  </select>
                </div>
              </div>

              {/* Collaborator Commission Override */}
              <div className="p-4 rounded-xl bg-purple-50/60 border border-purple-200/80 space-y-3">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-purple-600" />
                  <label className="text-xs font-bold text-purple-900 uppercase tracking-wider">
                    Collaborator Commission Override
                  </label>
                </div>
                <p className="text-xs text-purple-700 leading-relaxed">
                  When a guest uses this discount code via a partner&apos;s link, set a custom lowered commission for that partner (e.g. €10 instead of standard rate). Leave empty to use standard partner rates.
                </p>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <input
                      type="number"
                      min="0"
                      step="any"
                      placeholder="e.g. 10"
                      value={form.commissionOverride}
                      onChange={(e) =>
                        setForm({ ...form, commissionOverride: e.target.value })
                      }
                      className="w-full px-3.5 py-2 border border-purple-300 rounded-lg text-gray-900 bg-white focus:outline-none focus:border-purple-500"
                    />
                  </div>
                  <div>
                    <select
                      value={form.commissionType}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          commissionType: e.target.value as CommissionType,
                        })
                      }
                      className="w-full px-3 py-2 border border-purple-300 rounded-lg text-gray-900 bg-white focus:outline-none focus:border-purple-500 text-xs font-semibold"
                    >
                      <option value="fixed">€ per booking / person</option>
                      <option value="percent">% of sale</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                    Max Redemptions (Optional)
                  </label>
                  <input
                    type="number"
                    min="1"
                    placeholder="Unlimited"
                    value={form.maxUses}
                    onChange={(e) => setForm({ ...form, maxUses: e.target.value })}
                    className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                    Status
                  </label>
                  <label className="flex items-center gap-2 pt-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.active}
                      onChange={(e) => setForm({ ...form, active: e.target.checked })}
                      className="h-4 w-4 rounded border-gray-300 text-amber-500 focus:ring-amber-400"
                    />
                    <span className="text-sm font-semibold text-gray-800">
                      Active and usable
                    </span>
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                  Notes / Assignee (Optional)
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Created for specific VIPs or promoter campaigns"
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  className="w-full px-3.5 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="pt-4 flex items-center justify-end gap-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-100 rounded-lg transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold text-sm rounded-lg shadow transition cursor-pointer"
                >
                  {editing ? "Save Changes" : "Create Code"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
