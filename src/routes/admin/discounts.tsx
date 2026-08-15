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
  Package,
  Layers,
} from "lucide-react";
import {
  getDiscountCodes,
  addDiscountCode,
  updateDiscountCode,
  deleteDiscountCode,
  getPacks,
  type DiscountCode,
  type DiscountType,
  type DiscountApplyScope,
  type CommissionType,
  type Pack,
} from "@/lib/admin-store";

export const Route = createFileRoute("/admin/discounts")({
  component: AdminDiscounts,
});

function AdminDiscounts() {
  const [discounts, setDiscounts] = useState<DiscountCode[]>([]);
  const [packs, setPacks] = useState<Pack[]>([]);
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<DiscountCode | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [error, setError] = useState("");

  const reload = useCallback(async () => {
    const list = await getDiscountCodes();
    setDiscounts(list);
    const pList = await getPacks();
    setPacks(pList.filter((p) => p.active));
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  // Form State
  const [form, setForm] = useState({
    code: "",
    discountAmount: 50,
    discountType: "fixed" as DiscountType,
    applyScope: "per_booking" as DiscountApplyScope,
    overridePrice: "" as string | number,
    maxGuestsDiscounted: "" as string | number,
    allPacks: true,
    applicablePackIds: [] as string[],
    commissionOverride: 10 as string | number,
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
      applyScope: "per_booking",
      overridePrice: "",
      maxGuestsDiscounted: "",
      allPacks: true,
      applicablePackIds: [],
      commissionOverride: 10,
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
      discountType: d.discountType || "fixed",
      applyScope: d.applyScope || "per_booking",
      overridePrice: d.overridePrice != null ? d.overridePrice : "",
      maxGuestsDiscounted: d.maxGuestsDiscounted != null ? d.maxGuestsDiscounted : "",
      allPacks: !d.applicablePackIds || d.applicablePackIds.length === 0,
      applicablePackIds: d.applicablePackIds || [],
      commissionOverride: d.commissionOverride != null ? d.commissionOverride : "",
      commissionType: d.commissionType || "fixed",
      maxUses: d.maxUses != null ? d.maxUses : "",
      active: d.active,
      notes: d.notes || "",
    });
    setError("");
    setShowModal(true);
  };

  const togglePackSelection = (packId: string) => {
    setForm((f) => {
      const exists = f.applicablePackIds.includes(packId);
      const next = exists
        ? f.applicablePackIds.filter((id) => id !== packId)
        : [...f.applicablePackIds, packId];
      return { ...f, applicablePackIds: next };
    });
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

    const overrideVal =
      form.overridePrice !== "" && !isNaN(Number(form.overridePrice))
        ? Number(form.overridePrice)
        : null;

    const maxGuestsVal =
      form.maxGuestsDiscounted !== "" && !isNaN(Number(form.maxGuestsDiscounted))
        ? Number(form.maxGuestsDiscounted)
        : null;

    const targetPackIds = form.allPacks ? null : form.applicablePackIds;

    try {
      const payload = {
        code: cleanCode,
        discountAmount: Number(form.discountAmount) || 0,
        discountType: form.discountType,
        applyScope: form.applyScope,
        overridePrice: overrideVal,
        applicablePackIds: targetPackIds,
        maxGuestsDiscounted: maxGuestsVal,
        commissionOverride: commOverride,
        commissionType: form.commissionType,
        maxUses: maxUsesVal,
        active: form.active,
        notes: form.notes,
      };

      if (editing) {
        await updateDiscountCode(editing.id, payload);
      } else {
        await addDiscountCode(payload);
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
                <th className="px-6 py-4">Discount & Scope</th>
                <th className="px-6 py-4">Applicable Packs</th>
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
                  <td colSpan={8} className="px-6 py-12 text-center text-gray-400">
                    No discount codes found.
                  </td>
                </tr>
              ) : (
                filtered.map((d) => {
                  const madAmount = Math.round(d.discountAmount * 11);
                  const madOverride = Math.round((d.overridePrice ?? 0) * 11);
                  const scopeLabel =
                    d.applyScope === "fixed_price"
                      ? `Fixed €${d.overridePrice ?? 0} Rate (${madOverride} MAD)`
                      : d.applyScope === "per_person"
                      ? `${d.discountType === "percent" ? `-${d.discountAmount}%` : `-€${d.discountAmount} (-${madAmount} MAD)`} / person`
                      : `${d.discountType === "percent" ? `-${d.discountAmount}%` : `-€${d.discountAmount} (-${madAmount} MAD)`} / booking`;

                  const packCount = d.applicablePackIds?.length ?? 0;
                  const packBadge =
                    !d.applicablePackIds || packCount === 0
                      ? "All Packs"
                      : `${packCount} Pack${packCount > 1 ? "s" : ""}`;

                  return (
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

                      <td className="px-6 py-4">
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-bold bg-amber-100/70 text-amber-800 border border-amber-200">
                          {scopeLabel}
                        </span>
                      </td>

                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold border ${
                          packBadge === "All Packs"
                            ? "bg-slate-100 text-slate-700 border-slate-200"
                            : "bg-blue-50 text-blue-700 border-blue-200 font-bold"
                        }`}>
                          <Package className="h-3 w-3" />
                          {packBadge}
                        </span>
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
                );
              })
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

            <form onSubmit={handleSave} className="p-6 space-y-4 max-h-[85vh] overflow-y-auto">
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                  Discount Code *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. SUMMER2027"
                  value={form.code}
                  onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                  className="w-full px-3.5 py-2 border border-gray-300 rounded-lg text-gray-900 font-mono font-bold uppercase focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* Mode & Scope Selector */}
              <div className="p-4 rounded-xl bg-amber-50/70 border border-amber-200 space-y-3">
                <div className="flex items-center gap-2 text-amber-900 font-bold text-xs uppercase tracking-wider">
                  <Coins className="h-4 w-4 text-amber-600" />
                  <span>Discount Application Mode</span>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, applyScope: "per_booking" })}
                    className={`px-3 py-2 rounded-lg text-xs font-semibold text-center transition cursor-pointer border ${
                      form.applyScope === "per_booking"
                        ? "bg-amber-500 text-slate-950 border-amber-600 shadow-sm"
                        : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"
                    }`}
                  >
                    Per Booking
                  </button>
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, applyScope: "per_person" })}
                    className={`px-3 py-2 rounded-lg text-xs font-semibold text-center transition cursor-pointer border ${
                      form.applyScope === "per_person"
                        ? "bg-amber-500 text-slate-950 border-amber-600 shadow-sm"
                        : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"
                    }`}
                  >
                    Per Person
                  </button>
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, applyScope: "fixed_price" })}
                    className={`px-3 py-2 rounded-lg text-xs font-semibold text-center transition cursor-pointer border ${
                      form.applyScope === "fixed_price"
                        ? "bg-amber-500 text-slate-950 border-amber-600 shadow-sm"
                        : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"
                    }`}
                  >
                    Fixed Rate
                  </button>
                </div>

                {form.applyScope === "fixed_price" ? (
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                      Fixed Special Price (€ / MAD) *
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        min="0"
                        step="any"
                        required
                        placeholder="e.g. 250 (Sets price to €250 / 2,750 MAD)"
                        value={form.overridePrice}
                        onChange={(e) => setForm({ ...form, overridePrice: e.target.value })}
                        className="w-full px-3.5 py-2 border border-amber-300 rounded-lg text-gray-900 bg-white focus:outline-none focus:border-amber-500 font-bold text-sm"
                      />
                    </div>
                    <p className="text-[11px] text-gray-600 mt-1 font-medium">
                      Exact rate: <strong className="text-amber-800">€{form.overridePrice || 0}</strong> = <strong className="text-amber-800">{Math.round(Number(form.overridePrice || 0) * 11)} MAD</strong>
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                        {form.applyScope === "per_person" ? "Amount Off Per Person *" : "Discount Value *"}
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
                        className="w-full px-3.5 py-2 border border-amber-300 rounded-lg text-gray-900 bg-white focus:outline-none focus:border-amber-500 font-bold text-sm"
                      />
                      {form.discountType === "fixed" && (
                        <p className="text-[11px] text-gray-600 mt-1 font-medium">
                          <strong className="text-amber-800">€{form.discountAmount || 0}</strong> = <strong className="text-amber-800">{Math.round((form.discountAmount || 0) * 11)} MAD</strong>
                        </p>
                      )}
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                        Type
                      </label>
                      <select
                        value={form.discountType}
                        onChange={(e) =>
                          setForm({ ...form, discountType: e.target.value as DiscountType })
                        }
                        className="w-full px-3 py-2 border border-amber-300 rounded-lg text-gray-900 bg-white focus:outline-none focus:border-amber-500 text-xs font-medium"
                      >
                        <option value="fixed">Fixed Amount (€ / MAD)</option>
                        <option value="percent">Percentage (%)</option>
                      </select>
                    </div>

                    {form.applyScope === "per_person" && (
                      <div className="col-span-2 pt-2 border-t border-amber-200/80">
                        <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                          Which Guests Receive the Discount?
                        </label>
                        <select
                          value={form.maxGuestsDiscounted}
                          onChange={(e) =>
                            setForm({
                              ...form,
                              maxGuestsDiscounted: e.target.value === "" ? "" : Number(e.target.value),
                            })
                          }
                          className="w-full px-3 py-2 border border-amber-300 rounded-lg text-gray-900 bg-white focus:outline-none focus:border-amber-500 text-xs font-bold"
                        >
                          <option value="">All Guests in Booking (Default)</option>
                          <option value="1">1st Guest Only (1 Person)</option>
                          <option value="2">Up to 2 Guests (2 Persons)</option>
                          <option value="3">Up to 3 Guests (3 Persons)</option>
                        </select>
                        <p className="text-[11px] text-gray-600 mt-1 font-medium">
                          {form.maxGuestsDiscounted === 1
                            ? "Only the 1st guest in a multi-guest booking receives the per-person discount."
                            : form.maxGuestsDiscounted === 2
                            ? "Only up to 2 guests in a booking receive the per-person discount."
                            : form.maxGuestsDiscounted === 3
                            ? "Only up to 3 guests in a booking receive the per-person discount."
                            : "Every guest in the booking receives the per-person discount."}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>


              {/* Target Packs Selection */}
              <div className="p-4 rounded-xl bg-blue-50/60 border border-blue-200/80 space-y-3">
                <div className="flex items-center gap-2 text-blue-900 font-bold text-xs uppercase tracking-wider">
                  <Package className="h-4 w-4 text-blue-600" />
                  <span>Applicable Packs</span>
                </div>

                <div className="space-y-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="packSelectionMode"
                      checked={form.allPacks}
                      onChange={() => setForm({ ...form, allPacks: true, applicablePackIds: [] })}
                      className="text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-xs font-bold text-gray-900">
                      Applies to ALL Festival Packs
                    </span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="packSelectionMode"
                      checked={!form.allPacks}
                      onChange={() => setForm({ ...form, allPacks: false })}
                      className="text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-xs font-bold text-gray-900">
                      Applies ONLY to Specific Packs
                    </span>
                  </label>
                </div>

                {!form.allPacks && (
                  <div className="pt-2 border-t border-blue-200/60 space-y-1.5 max-h-48 overflow-y-auto pr-1">
                    <p className="text-[11px] text-blue-700 font-medium mb-1">
                      Check the packs allowed for this discount code:
                    </p>
                    {packs.map((p) => {
                      const isSelected = form.applicablePackIds.includes(p.id);
                      return (
                        <label
                          key={p.id}
                          onClick={() => togglePackSelection(p.id)}
                          className={`flex items-center justify-between p-2 rounded-lg border text-xs cursor-pointer transition ${
                            isSelected
                              ? "bg-blue-100/80 border-blue-400 text-blue-900 font-bold"
                              : "bg-white border-gray-200 text-gray-700 hover:bg-gray-50"
                          }`}
                        >
                          <div className="flex items-center gap-2 truncate">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => {}} // handled by parent onClick
                              className="rounded text-blue-600 border-gray-300"
                            />
                            <span className="truncate">{p.name} {p.sub ? `(${p.sub})` : ""}</span>
                          </div>
                          <span className="font-mono text-gray-500 shrink-0 ml-2">{p.price} {p.currency || "€"}</span>
                        </label>
                      );
                    })}
                  </div>
                )}
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
