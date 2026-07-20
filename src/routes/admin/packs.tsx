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
  ArrowLeft,
  ArrowRight,
  ChevronUp,
  ChevronDown,
  Eye,
  EyeOff,
  Lock,
} from "lucide-react";
import {
  getPacks,
  addPack,
  updatePack,
  deletePack,
  seedPacksToDb,
  reorderPacks,
  type Pack,
} from "@/lib/admin-store";
import { supabase } from "@/lib/supabase";
import { priceUnitLabel } from "@/lib/translations";

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
  category: "chambre double",
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
  const [dbEmpty, setDbEmpty] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [seedError, setSeedError] = useState("");
  const [orderError, setOrderError] = useState("");
  const [previewCategory, setPreviewCategory] = useState<string | null>(null);

  const reload = async () => {
    setPacks(await getPacks());
    if (supabase) {
      const { data, error } = await supabase.from("packs").select("id").limit(1);
      setDbEmpty(!error && (data ?? []).length === 0);
    }
  };

  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Category grouping (in display order) ─────────────────────────
  const categories: string[] = [];
  const groups: Record<string, Pack[]> = {};
  for (const p of packs) {
    const cat = p.category || "Other";
    if (!groups[cat]) {
      groups[cat] = [];
      categories.push(cat);
    }
    groups[cat].push(p);
  }

  const flatten = (cats: string[], g: Record<string, Pack[]>) =>
    cats.flatMap((c) => g[c].map((p) => p.id));

  const persistOrder = async (orderedIds: string[]) => {
    setOrderError("");
    const ok = await reorderPacks(orderedIds);
    if (!ok) setOrderError("Could not save the new order — please try again.");
    await reload();
  };

  /** Move a pack left/right inside its own category. */
  const movePackInCategory = async (pack: Pack, dir: -1 | 1) => {
    const cat = pack.category || "Other";
    const list = [...groups[cat]];
    const i = list.findIndex((p) => p.id === pack.id);
    const j = i + dir;
    if (i === -1 || j < 0 || j >= list.length) return;
    [list[i], list[j]] = [list[j], list[i]];
    await persistOrder(flatten(categories, { ...groups, [cat]: list }));
  };

  /** Move a whole category up/down on the page. */
  const moveCategory = async (cat: string, dir: -1 | 1) => {
    const i = categories.indexOf(cat);
    const j = i + dir;
    if (i === -1 || j < 0 || j >= categories.length) return;
    const cats = [...categories];
    [cats[i], cats[j]] = [cats[j], cats[i]];
    await persistOrder(flatten(cats, groups));
  };

  const handleSeed = async () => {
    setSeeding(true);
    setSeedError("");
    try {
      await seedPacksToDb();
      await reload();
    } catch {
      setSeedError(
        "The database refused the write — its security rules aren't set up yet. " +
          "Run supabase/schema.sql in the Supabase Dashboard → SQL Editor, then try again."
      );
    }
    setSeeding(false);
  };

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
      category: pack.category || "chambre double",
      price: pack.price,
      currency: pack.currency || "€",
      features: pack.features.length ? [...pack.features] : [""],
      popular: pack.popular,
      active: pack.active,
    });
    setShowForm(true);
  };

  const handleSave = async () => {
    const cleanFeatures = form.features.filter((f) => f.trim() !== "");
    if (!form.name.trim() || !form.price.trim() || cleanFeatures.length === 0) return;

    if (editingId) {
      await updatePack(editingId, { ...form, features: cleanFeatures });
    } else {
      await addPack({ ...form, features: cleanFeatures });
    }
    setShowForm(false);
    setEditingId(null);
    reload();
  };

  const handleDelete = async (id: string) => {
    await deletePack(id);
    setDeleteConfirm(null);
    reload();
  };

  const toggleActive = async (pack: Pack) => {
    await updatePack(pack.id, { active: !pack.active });
    reload();
  };

  const togglePopular = async (pack: Pack) => {
    await updatePack(pack.id, { popular: !pack.popular });
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
          <h2 className="font-display text-2xl tracking-wide text-gray-900">
            Pack Management
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            Create and manage festival packs. Visible packs appear on the website;{" "}
            <span className="text-violet-600 font-medium">private packs</span> exist only
            here — perfect for special deals you book yourself (partners and the public
            never see them).
          </p>
        </div>
        <button
          onClick={openNew}
          className="inline-flex items-center gap-2 rounded-lg bg-amber-500 px-4 py-2.5 text-sm font-semibold text-zinc-950 hover:bg-amber-400 transition cursor-pointer"
        >
          <Plus className="h-4 w-4" /> Add Pack
        </button>
      </div>

      {/* DB seed banner */}
      {dbEmpty && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-5 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <p className="text-sm text-amber-800 flex-1">
              The database has no packs yet — the packs below are the built-in defaults, and edits
              will only be saved on this device. Push them to the database so they're shared with
              the whole website and every admin.
            </p>
            <button
              onClick={handleSeed}
              disabled={seeding}
              className="inline-flex items-center gap-2 rounded-lg bg-amber-500 px-4 py-2.5 text-sm font-semibold text-zinc-950 hover:bg-amber-400 transition cursor-pointer disabled:opacity-50 self-start shrink-0"
            >
              {seeding ? "Pushing…" : "Push packs to database"}
            </button>
          </div>
          {seedError && <p className="text-sm font-medium text-red-600">{seedError}</p>}
        </div>
      )}

      {/* Ordering error */}
      {orderError && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {orderError}
        </div>
      )}

      {/* Category sections */}
      {categories.map((cat, catIdx) => (
        <section key={cat} className="rounded-2xl border border-gray-200 bg-white/30">
          {/* Category header */}
          <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-200">
            <div className="flex items-center gap-1">
              <button
                onClick={() => moveCategory(cat, -1)}
                disabled={catIdx === 0}
                className="p-1.5 rounded-lg text-gray-500 hover:text-amber-600 hover:bg-amber-50 transition cursor-pointer disabled:opacity-25 disabled:cursor-not-allowed"
                title="Move this category up"
              >
                <ChevronUp className="h-4 w-4" />
              </button>
              <button
                onClick={() => moveCategory(cat, 1)}
                disabled={catIdx === categories.length - 1}
                className="p-1.5 rounded-lg text-gray-500 hover:text-amber-600 hover:bg-amber-50 transition cursor-pointer disabled:opacity-25 disabled:cursor-not-allowed"
                title="Move this category down"
              >
                <ChevronDown className="h-4 w-4" />
              </button>
            </div>
            <h3 className="font-display text-base tracking-wide text-gray-900 uppercase">
              {cat}
            </h3>
            <span className="text-xs text-gray-400">
              {groups[cat].length} pack{groups[cat].length === 1 ? "" : "s"}
            </span>
            <button
              onClick={() => setPreviewCategory(cat)}
              className="ml-auto inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-violet-700 bg-violet-50 border border-violet-200 hover:bg-violet-200 transition cursor-pointer"
              title="Preview how this category looks on the website"
            >
              <Eye className="h-3.5 w-3.5" /> Preview
            </button>
          </div>

          {/* Packs in this category, in website order (left → right) */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 p-4">
            {groups[cat].map((pack, i) => (
              <div
                key={pack.id}
                className={`relative rounded-xl border bg-white shadow-sm p-5 transition-all duration-300 ${
                  pack.active
                    ? "border-gray-200 hover:border-gray-300"
                    : "border-gray-100 opacity-60"
                }`}
              >
                {/* Position + badges + order controls */}
                <div className="flex items-center gap-2 mb-4">
                  <span className="h-6 w-6 grid place-items-center rounded-full bg-gray-100/80 text-[11px] font-bold text-gray-600 border border-gray-300/50">
                    {i + 1}
                  </span>
                  {pack.popular && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 text-amber-600 text-[10px] tracking-widest uppercase font-medium border border-amber-200">
                      <Star className="h-3 w-3" /> Popular
                    </span>
                  )}
                  <span
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] tracking-widest uppercase font-medium border ${
                      pack.active
                        ? "bg-emerald-100 text-emerald-600 border-emerald-200"
                        : "bg-violet-50 text-violet-600 border-violet-200"
                    }`}
                  >
                    {pack.active ? (
                      <>
                        <Eye className="h-3 w-3" /> Visible on website
                      </>
                    ) : (
                      <>
                        <Lock className="h-3 w-3" /> Private
                      </>
                    )}
                  </span>
                  <span className="ml-auto flex items-center gap-1">
                    <button
                      onClick={() => movePackInCategory(pack, -1)}
                      disabled={i === 0}
                      className="p-1.5 rounded-lg text-gray-500 hover:text-amber-600 hover:bg-amber-50 transition cursor-pointer disabled:opacity-25 disabled:cursor-not-allowed"
                      title="Move left on the website"
                    >
                      <ArrowLeft className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => movePackInCategory(pack, 1)}
                      disabled={i === groups[cat].length - 1}
                      className="p-1.5 rounded-lg text-gray-500 hover:text-amber-600 hover:bg-amber-50 transition cursor-pointer disabled:opacity-25 disabled:cursor-not-allowed"
                      title="Move right on the website"
                    >
                      <ArrowRight className="h-3.5 w-3.5" />
                    </button>
                  </span>
                </div>

                {/* Pack info */}
                <h3 className="font-display text-xl text-gray-900">{pack.name}</h3>
                <p className="text-xs text-gray-500 tracking-wide uppercase mt-0.5">
                  {pack.sub}
                </p>
                <p className="mt-3 font-display text-3xl text-amber-600">
                  {pack.price}{" "}
                  <span className="text-xs text-gray-500 font-normal tracking-widest uppercase">
                    {pack.currency || "€"}
                  </span>
                </p>

                {/* Features */}
                <ul className="mt-4 space-y-1.5">
                  {pack.features.map((f, fi) => (
                    <li key={fi} className="flex items-start gap-2 text-sm text-gray-600">
                      <Check className="h-3.5 w-3.5 text-amber-500/60 mt-0.5 shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>

                {/* Actions */}
                <div className="mt-5 pt-4 border-t border-gray-200 flex items-center gap-2">
                  <button
                    onClick={() => openEdit(pack)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition cursor-pointer"
                  >
                    <Pencil className="h-3.5 w-3.5" /> Edit
                  </button>
                  <button
                    onClick={() => toggleActive(pack)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition cursor-pointer"
                    title={
                      pack.active
                        ? "Hide from the website — becomes a private admin-only pack"
                        : "Publish on the website booking pages"
                    }
                  >
                    {pack.active ? (
                      <EyeOff className="h-3.5 w-3.5" />
                    ) : (
                      <Eye className="h-3.5 w-3.5 text-emerald-600" />
                    )}
                    {pack.active ? "Hide from website" : "Show on website"}
                  </button>
                  <button
                    onClick={() => togglePopular(pack)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition cursor-pointer"
                  >
                    <Star className={`h-3.5 w-3.5 ${pack.popular ? "text-amber-600" : ""}`} />
                    {pack.popular ? "Unfeature" : "Feature"}
                  </button>
                  <button
                    onClick={() => setDeleteConfirm(pack.id)}
                    className="ml-auto inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-red-600/70 hover:text-red-600 hover:bg-red-50 transition cursor-pointer"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      ))}

      {packs.length === 0 && (
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm px-5 py-16 text-center text-sm text-gray-400">
          No packs yet. Click "Add Pack" to create your first one.
        </div>
      )}

      {/* Website Preview Modal (the "eye") */}
      {previewCategory && groups[previewCategory] && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) setPreviewCategory(null);
          }}
        >
          <div className="w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-2xl border border-gray-200 bg-slate-100 p-6">
            <div className="flex items-center justify-between mb-1">
              <h3 className="font-display text-lg text-gray-900 flex items-center gap-2">
                <Eye className="h-4 w-4 text-violet-600" /> Website Preview — {previewCategory}
              </h3>
              <button
                onClick={() => setPreviewCategory(null)}
                className="text-gray-500 hover:text-gray-700 transition cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <p className="text-xs text-gray-500 mb-6">
              This is how visitors see this category on the packs page (inactive packs are hidden
              there).
            </p>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 items-start pt-4">
              {groups[previewCategory]
                .filter((p) => p.active)
                .map((p) => (
                  <div
                    key={p.id}
                    className={`relative rounded-2xl p-5 border text-center ${
                      p.popular
                        ? "border-amber-500/60 bg-gradient-to-b from-amber-50 to-transparent -mt-3 shadow-lg shadow-amber-50"
                        : "border-gray-300 bg-white/60"
                    }`}
                  >
                    {p.popular && (
                      <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-amber-500 text-zinc-950 text-[9px] font-black tracking-widest uppercase px-3 py-1 rounded-full">
                        Populaire
                      </span>
                    )}
                    <p className="font-display text-lg text-gray-900 mt-1">{p.name}</p>
                    <p className="text-[10px] text-gray-500 uppercase tracking-widest mt-0.5">
                      {p.sub}
                    </p>
                    <p className="mt-3 font-display text-3xl text-gray-900">
                      {p.price}
                      <span className="text-xs text-gray-500 ml-1">
                        {p.currency || "€"}
                        {priceUnitLabel(p, "en") ? ` / ${priceUnitLabel(p, "en")}` : ""}
                      </span>
                    </p>
                    <ul className="mt-3 space-y-1 text-left">
                      {p.features.slice(0, 4).map((f, fi) => (
                        <li key={fi} className="flex items-start gap-1.5 text-[11px] text-gray-600">
                          <Check className="h-3 w-3 text-amber-500/70 mt-0.5 shrink-0" />
                          {f}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
            </div>
            <div className="mt-6 text-center">
              <a
                href="/packs"
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-violet-700 hover:text-violet-200 underline"
              >
                Open the real packs page in a new tab →
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm rounded-xl border border-gray-200 bg-white p-6">
            <h3 className="font-display text-lg text-gray-900">Delete Pack?</h3>
            <p className="mt-2 text-sm text-gray-500">
              This action cannot be undone. All data related to this pack will be lost.
            </p>
            <div className="mt-6 flex items-center gap-3 justify-end">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="px-4 py-2 rounded-lg text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deleteConfirm)}
                className="px-4 py-2 rounded-lg text-sm font-medium bg-red-200 text-red-600 hover:bg-red-200 transition cursor-pointer"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Pack Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-xl border border-gray-200 bg-white p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-display text-lg text-gray-900">
                {editingId ? "Edit Pack" : "New Pack"}
              </h3>
              <button
                onClick={() => setShowForm(false)}
                className="text-gray-500 hover:text-gray-700 transition cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Name */}
              <div>
                <label className="block text-xs tracking-widest uppercase text-gray-500 mb-1.5">
                  Pack Name
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. Gold"
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-amber-500 transition"
                />
              </div>

              {/* Category */}
              <div>
                <label className="block text-xs tracking-widest uppercase text-gray-500 mb-1.5">
                  Category
                </label>
                <select
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:border-amber-500 transition"
                >
                  <option value="Hotel Packs (Double)">Hotel Packs (Double)</option>
                  <option value="Hotel Packs (Single)">Hotel Packs (Single)</option>
                  <option value="Full Pass">Full Pass</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              {/* Subtitle */}
              <div>
                <label className="block text-xs tracking-widest uppercase text-gray-500 mb-1.5">
                  Subtitle
                </label>
                <input
                  type="text"
                  value={form.sub}
                  onChange={(e) => setForm({ ...form, sub: e.target.value })}
                  placeholder="e.g. VIP Pack"
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-amber-500 transition"
                />
              </div>

              {/* Price & Currency */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs tracking-widest uppercase text-gray-500 mb-1.5">
                    Price
                  </label>
                  <input
                    type="text"
                    value={form.price}
                    onChange={(e) => setForm({ ...form, price: e.target.value })}
                    placeholder="e.g. 2299"
                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-amber-500 transition"
                  />
                </div>
                <div>
                  <label className="block text-xs tracking-widest uppercase text-gray-500 mb-1.5">
                    Currency
                  </label>
                  <select
                    value={form.currency}
                    onChange={(e) => setForm({ ...form, currency: e.target.value })}
                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:border-amber-500 transition"
                  >
                    <option value="€">EUR (€)</option>
                    <option value="$">USD ($)</option>
                    <option value="MAD">MAD</option>
                  </select>
                </div>
              </div>

              {/* Features */}
              <div>
                <label className="block text-xs tracking-widest uppercase text-gray-500 mb-1.5">
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
                        className="flex-1 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-amber-500 transition"
                      />
                      {form.features.length > 1 && (
                        <button
                          onClick={() => removeFeatureField(i)}
                          className="text-gray-400 hover:text-red-600 transition cursor-pointer"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                <button
                  onClick={addFeatureField}
                  className="mt-2 inline-flex items-center gap-1 text-xs text-amber-600 hover:text-amber-700 transition cursor-pointer"
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
                  <span className="text-sm text-gray-600">Popular</span>
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
                  <span className="text-sm text-gray-600">Visible on website</span>
                </label>
              </div>
              <p className="mt-2 text-[11px] text-gray-500">
                Uncheck "Visible on website" to create a{" "}
                <span className="text-violet-600 font-medium">private pack</span>: it never
                appears on the website or partner links — only you can book it, from the
                Bookings page ("special" packs in the pack list).
              </p>
            </div>

            {/* Save */}
            <div className="mt-6 flex items-center gap-3 justify-end">
              <button
                onClick={() => setShowForm(false)}
                className="px-4 py-2 rounded-lg text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition cursor-pointer"
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
