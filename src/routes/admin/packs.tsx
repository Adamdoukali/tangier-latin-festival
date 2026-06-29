import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import {
  Plus,
  Pencil,
  Trash2,
  X,
  Check,
  Star,
  ToggleLeft,
  ToggleRight,
} from "lucide-react";
import {
  getPacks,
  addPack,
  updatePack,
  deletePack,
  type Pack,
} from "@/lib/admin-store";

export const Route = createFileRoute("/admin/packs")({
  component: AdminPacks,
});

interface PackFormData {
  name: string;
  sub: string;
  category: string;
  price: string;
  currency: string;
  features: string[];
  popular: boolean;
  active: boolean;
}

const emptyForm: PackFormData = {
  name: "",
  sub: "",
  category: "Hotel Packs (Double)",
  price: "",
  currency: "€",
  features: [""],
  popular: false,
  active: true,
};

function AdminPacks() {
  const [packs, setPacks] = useState<Pack[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<PackFormData>(emptyForm);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const reload = () => setPacks(getPacks());

  useEffect(() => {
    reload();
  }, []);

  const openNew = () => {
    setEditingId(null);
    setForm(emptyForm);
    setShowForm(true);
  };

  const openEdit = (pack: Pack) => {
    setEditingId(pack.id);
    setForm({
      name: pack.name,
      sub: pack.sub,
      category: pack.category || "Hotel Packs (Double)",
      price: pack.price,
      currency: pack.currency || "€",
      features: pack.features.length ? [...pack.features] : [""],
      popular: pack.popular,
      active: pack.active,
    });
    setShowForm(true);
  };

  const handleSave = () => {
    const cleanFeatures = form.features.filter((f) => f.trim() !== "");
    if (!form.name.trim() || !form.price.trim() || cleanFeatures.length === 0) return;

    if (editingId) {
      updatePack(editingId, { ...form, features: cleanFeatures });
    } else {
      addPack({ ...form, features: cleanFeatures });
    }
    setShowForm(false);
    setEditingId(null);
    reload();
  };

  const handleDelete = (id: string) => {
    deletePack(id);
    setDeleteConfirm(null);
    reload();
  };

  const toggleActive = (pack: Pack) => {
    updatePack(pack.id, { active: !pack.active });
    reload();
  };

  const togglePopular = (pack: Pack) => {
    updatePack(pack.id, { popular: !pack.popular });
    reload();
  };

  const addFeatureField = () => {
    setForm((prev) => ({ ...prev, features: [...prev.features, ""] }));
  };

  const removeFeatureField = (idx: number) => {
    setForm((prev) => ({
      ...prev,
      features: prev.features.filter((_, i) => i !== idx),
    }));
  };

  const updateFeature = (idx: number, value: string) => {
    setForm((prev) => ({
      ...prev,
      features: prev.features.map((f, i) => (i === idx ? value : f)),
    }));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-2xl tracking-wide text-zinc-100">
            Pack Management
          </h2>
          <p className="mt-1 text-sm text-zinc-500">
            Create and manage festival packs that appear on the main website.
          </p>
        </div>
        <button
          onClick={openNew}
          className="inline-flex items-center gap-2 rounded-lg bg-amber-500 px-4 py-2.5 text-sm font-semibold text-zinc-950 hover:bg-amber-400 transition cursor-pointer"
        >
          <Plus className="h-4 w-4" /> Add Pack
        </button>
      </div>

      {/* Pack Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {packs.map((pack) => (
          <div
            key={pack.id}
            className={`relative rounded-xl border bg-zinc-900/50 p-5 transition-all duration-300 ${
              pack.active
                ? "border-zinc-800/60 hover:border-zinc-700/60"
                : "border-zinc-800/30 opacity-60"
            }`}
          >
            {/* Active/Popular badges */}
            <div className="flex items-center gap-2 mb-4">
              {pack.popular && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400 text-[10px] tracking-widest uppercase font-medium border border-amber-500/20">
                  <Star className="h-3 w-3" /> Popular
                </span>
              )}
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] tracking-widest uppercase font-medium border ${
                  pack.active
                    ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/20"
                    : "bg-zinc-800/40 text-zinc-500 border-zinc-700/40"
                }`}
              >
                {pack.active ? "Active" : "Inactive"}
              </span>
            </div>

            {/* Pack info */}
            <div className="flex items-center justify-between">
              <h3 className="font-display text-xl text-zinc-100">{pack.name}</h3>
              {pack.category && (
                <span className="text-[9px] font-bold tracking-widest uppercase text-amber-500/70 border border-amber-500/20 px-2 py-0.5 rounded-full">
                  {pack.category}
                </span>
              )}
            </div>
            <p className="text-xs text-zinc-500 tracking-wide uppercase mt-0.5">
              {pack.sub}
            </p>
            <p className="mt-3 font-display text-3xl text-amber-400">
              {pack.price}{" "}
              <span className="text-xs text-zinc-500 font-normal tracking-widest uppercase">
                {pack.currency || "€"}
              </span>
            </p>

            {/* Features */}
            <ul className="mt-4 space-y-1.5">
              {pack.features.map((f, i) => (
                <li
                  key={i}
                  className="flex items-start gap-2 text-sm text-zinc-400"
                >
                  <Check className="h-3.5 w-3.5 text-amber-500/60 mt-0.5 shrink-0" />
                  {f}
                </li>
              ))}
            </ul>

            {/* Actions */}
            <div className="mt-5 pt-4 border-t border-zinc-800/40 flex items-center gap-2">
              <button
                onClick={() => openEdit(pack)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60 transition cursor-pointer"
              >
                <Pencil className="h-3.5 w-3.5" /> Edit
              </button>
              <button
                onClick={() => toggleActive(pack)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60 transition cursor-pointer"
              >
                {pack.active ? (
                  <ToggleRight className="h-3.5 w-3.5 text-emerald-400" />
                ) : (
                  <ToggleLeft className="h-3.5 w-3.5" />
                )}
                {pack.active ? "Deactivate" : "Activate"}
              </button>
              <button
                onClick={() => togglePopular(pack)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60 transition cursor-pointer"
              >
                <Star className={`h-3.5 w-3.5 ${pack.popular ? "text-amber-400" : ""}`} />
                {pack.popular ? "Unfeature" : "Feature"}
              </button>
              <button
                onClick={() => setDeleteConfirm(pack.id)}
                className="ml-auto inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-red-400/70 hover:text-red-400 hover:bg-red-500/10 transition cursor-pointer"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {packs.length === 0 && (
        <div className="rounded-xl border border-zinc-800/60 bg-zinc-900/50 px-5 py-16 text-center text-sm text-zinc-600">
          No packs yet. Click "Add Pack" to create your first one.
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm rounded-xl border border-zinc-800/60 bg-zinc-900 p-6">
            <h3 className="font-display text-lg text-zinc-100">Delete Pack?</h3>
            <p className="mt-2 text-sm text-zinc-500">
              This action cannot be undone. All data related to this pack will be lost.
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

      {/* Pack Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-xl border border-zinc-800/60 bg-zinc-900 p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-display text-lg text-zinc-100">
                {editingId ? "Edit Pack" : "New Pack"}
              </h3>
              <button
                onClick={() => setShowForm(false)}
                className="text-zinc-500 hover:text-zinc-300 transition cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Name */}
              <div>
                <label className="block text-xs tracking-widest uppercase text-zinc-500 mb-1.5">
                  Pack Name
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. Gold"
                  className="w-full rounded-lg border border-zinc-700/60 bg-zinc-800/50 px-3 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-amber-500/50 transition"
                />
              </div>

              {/* Category */}
              <div>
                <label className="block text-xs tracking-widest uppercase text-zinc-500 mb-1.5">
                  Category
                </label>
                <select
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                  className="w-full rounded-lg border border-zinc-700/60 bg-zinc-800/50 px-3 py-2.5 text-sm text-zinc-100 focus:outline-none focus:border-amber-500/50 transition"
                >
                  <option value="Hotel Packs (Double)">Hotel Packs (Double)</option>
                  <option value="Hotel Packs (Single)">Hotel Packs (Single)</option>
                  <option value="Full Pass">Full Pass</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              {/* Subtitle */}
              <div>
                <label className="block text-xs tracking-widest uppercase text-zinc-500 mb-1.5">
                  Subtitle
                </label>
                <input
                  type="text"
                  value={form.sub}
                  onChange={(e) => setForm({ ...form, sub: e.target.value })}
                  placeholder="e.g. VIP Pack"
                  className="w-full rounded-lg border border-zinc-700/60 bg-zinc-800/50 px-3 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-amber-500/50 transition"
                />
              </div>

              {/* Price & Currency */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs tracking-widest uppercase text-zinc-500 mb-1.5">
                    Price
                  </label>
                  <input
                    type="text"
                    value={form.price}
                    onChange={(e) => setForm({ ...form, price: e.target.value })}
                    placeholder="e.g. 2299"
                    className="w-full rounded-lg border border-zinc-700/60 bg-zinc-800/50 px-3 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-amber-500/50 transition"
                  />
                </div>
                <div>
                  <label className="block text-xs tracking-widest uppercase text-zinc-500 mb-1.5">
                    Currency
                  </label>
                  <select
                    value={form.currency}
                    onChange={(e) => setForm({ ...form, currency: e.target.value })}
                    className="w-full rounded-lg border border-zinc-700/60 bg-zinc-800/50 px-3 py-2.5 text-sm text-zinc-100 focus:outline-none focus:border-amber-500/50 transition"
                  >
                    <option value="€">EUR (€)</option>
                    <option value="$">USD ($)</option>
                    <option value="MAD">MAD</option>
                  </select>
                </div>
              </div>

              {/* Features */}
              <div>
                <label className="block text-xs tracking-widest uppercase text-zinc-500 mb-1.5">
                  Features
                </label>
                <div className="space-y-2">
                  {form.features.map((f, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <input
                        type="text"
                        value={f}
                        onChange={(e) => updateFeature(i, e.target.value)}
                        placeholder="e.g. VIP lounge access"
                        className="flex-1 rounded-lg border border-zinc-700/60 bg-zinc-800/50 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-amber-500/50 transition"
                      />
                      {form.features.length > 1 && (
                        <button
                          onClick={() => removeFeatureField(i)}
                          className="text-zinc-600 hover:text-red-400 transition cursor-pointer"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                <button
                  onClick={addFeatureField}
                  className="mt-2 inline-flex items-center gap-1 text-xs text-amber-400 hover:text-amber-300 transition cursor-pointer"
                >
                  <Plus className="h-3 w-3" /> Add feature
                </button>
              </div>

              {/* Toggles */}
              <div className="flex items-center gap-6">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.popular}
                    onChange={(e) =>
                      setForm({ ...form, popular: e.target.checked })
                    }
                    className="accent-amber-500"
                  />
                  <span className="text-sm text-zinc-400">Popular</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.active}
                    onChange={(e) =>
                      setForm({ ...form, active: e.target.checked })
                    }
                    className="accent-amber-500"
                  />
                  <span className="text-sm text-zinc-400">Active</span>
                </label>
              </div>
            </div>

            {/* Save */}
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
                <Check className="h-4 w-4" />
                {editingId ? "Update Pack" : "Create Pack"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
