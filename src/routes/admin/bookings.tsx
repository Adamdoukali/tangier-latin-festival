import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect, useCallback } from "react";
import QRCode from "qrcode";
import {
  Plus,
  Search,
  X,
  Check,
  QrCode,
  Trash2,
  ChevronDown,
  Download,
  Copy,
  Link2,
} from "lucide-react";
import {
  getBookings,
  addBooking,
  updateBookingStatus,
  deleteBooking,
  getPacks,
  type Booking,
  type BookingStatus,
  type Pack,
} from "@/lib/admin-store";

export const Route = createFileRoute("/admin/bookings")({
  component: AdminBookings,
});

function AdminBookings() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [packs, setPacks] = useState<Pack[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<BookingStatus | "all">("all");
  const [showForm, setShowForm] = useState(false);
  const [qrBooking, setQrBooking] = useState<Booking | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string>("");
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const reload = useCallback(() => {
    setBookings(getBookings());
    setPacks(getPacks());
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  // Form state
  const [form, setForm] = useState({
    packId: "",
    customerName: "",
    email: "",
    phone: "",
    country: "",
    numPeople: 1,
    danceLevel: "Beginner",
    notes: "",
    status: "pending" as BookingStatus,
  });

  const resetForm = () => {
    setForm({
      packId: packs[0]?.id ?? "",
      customerName: "",
      email: "",
      phone: "",
      country: "",
      numPeople: 1,
      danceLevel: "Beginner",
      notes: "",
      status: "pending",
    });
  };

  const handleCreate = () => {
    if (!form.customerName.trim() || !form.packId) return;
    const pack = packs.find((p) => p.id === form.packId);
    addBooking({
      ...form,
      packName: pack?.name ?? "Unknown",
    });
    setShowForm(false);
    reload();
  };

  const handleStatusChange = (id: string, status: BookingStatus) => {
    updateBookingStatus(id, status);
    reload();
  };

  const handleDelete = (id: string) => {
    deleteBooking(id);
    setDeleteConfirm(null);
    reload();
  };

  const showQr = async (booking: Booking) => {
    setQrBooking(booking);
    try {
      const url = await QRCode.toDataURL(
        `TLF-TICKET:${booking.ticketCode}|${booking.customerName}|${booking.packName}`,
        {
          width: 300,
          margin: 2,
          color: { dark: "#18181b", light: "#fafafa" },
        }
      );
      setQrDataUrl(url);
    } catch {
      setQrDataUrl("");
    }
  };

  const downloadQr = () => {
    if (!qrDataUrl || !qrBooking) return;
    const a = document.createElement("a");
    a.href = qrDataUrl;
    a.download = `ticket-${qrBooking.ticketCode}.png`;
    a.click();
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
  };

  const filtered = bookings
    .filter((b) => statusFilter === "all" || b.status === statusFilter)
    .filter(
      (b) =>
        !search ||
        b.customerName.toLowerCase().includes(search.toLowerCase()) ||
        b.ticketCode.toLowerCase().includes(search.toLowerCase()) ||
        b.email.toLowerCase().includes(search.toLowerCase())
    )
    .sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

  const statusStyles: Record<string, string> = {
    pending: "bg-amber-500/15 text-amber-400 border-amber-500/20",
    confirmed: "bg-emerald-500/15 text-emerald-400 border-emerald-500/20",
    "checked-in": "bg-cyan-500/15 text-cyan-400 border-cyan-500/20",
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-2xl tracking-wide text-zinc-100">
            Booking Management
          </h2>
          <p className="mt-1 text-sm text-zinc-500">
            Manage tickets, change statuses, and generate QR codes.
          </p>
        </div>
        <button
          onClick={() => {
            resetForm();
            setShowForm(true);
          }}
          className="inline-flex items-center gap-2 rounded-lg bg-amber-500 px-4 py-2.5 text-sm font-semibold text-zinc-950 hover:bg-amber-400 transition cursor-pointer self-start"
        >
          <Plus className="h-4 w-4" /> Add Booking
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-600" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, email, or ticket code..."
            className="w-full rounded-lg border border-zinc-700/60 bg-zinc-800/50 pl-9 pr-3 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-amber-500/50 transition"
          />
        </div>
        <div className="relative">
          <select
            value={statusFilter}
            onChange={(e) =>
              setStatusFilter(e.target.value as BookingStatus | "all")
            }
            className="appearance-none rounded-lg border border-zinc-700/60 bg-zinc-800/50 px-4 pr-8 py-2.5 text-sm text-zinc-100 focus:outline-none focus:border-amber-500/50 transition cursor-pointer"
          >
            <option value="all">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="confirmed">Confirmed</option>
            <option value="checked-in">Checked In</option>
          </select>
          <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500 pointer-events-none" />
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-zinc-800/60 bg-zinc-900/50 overflow-hidden">
        {filtered.length === 0 ? (
          <div className="px-5 py-16 text-center text-sm text-zinc-600">
            {bookings.length === 0
              ? 'No bookings yet. Click "Add Booking" to create one.'
              : "No bookings match your filters."}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-800/60 text-xs tracking-widest uppercase text-zinc-500">
                  <th className="px-5 py-3 text-left font-medium">Customer</th>
                  <th className="px-5 py-3 text-left font-medium">Ticket</th>
                  <th className="px-5 py-3 text-left font-medium">Pack</th>
                  <th className="px-5 py-3 text-left font-medium">Source</th>
                  <th className="px-5 py-3 text-left font-medium">Status</th>
                  <th className="px-5 py-3 text-left font-medium">Date</th>
                  <th className="px-5 py-3 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/40">
                {filtered.map((b) => (
                  <tr
                    key={b.id}
                    className="hover:bg-zinc-800/30 transition"
                  >
                    <td className="px-5 py-3">
                      <p className="font-medium text-zinc-200">{b.customerName}</p>
                      <p className="text-xs text-zinc-500">{b.email}</p>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-1.5">
                        <code className="text-xs font-mono text-amber-400/80 bg-amber-500/10 px-1.5 py-0.5 rounded">
                          {b.ticketCode}
                        </code>
                        <button
                          onClick={() => copyCode(b.ticketCode)}
                          className="text-zinc-600 hover:text-zinc-400 transition cursor-pointer"
                          title="Copy code"
                        >
                          <Copy className="h-3 w-3" />
                        </button>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-zinc-400">{b.packName}</td>
                    <td className="px-5 py-3">
                      {b.inviteCode ? (
                        <span className="inline-flex items-center gap-1 text-xs text-violet-400">
                          <Link2 className="h-3 w-3" />
                          <code className="font-mono bg-violet-500/10 px-1 py-0.5 rounded text-[10px]">
                            {b.inviteCode}
                          </code>
                        </span>
                      ) : (
                        <span className="text-xs text-zinc-600">Manual</span>
                      )}
                    </td>
                    <td className="px-5 py-3">
                      <select
                        value={b.status}
                        onChange={(e) =>
                          handleStatusChange(b.id, e.target.value as BookingStatus)
                        }
                        className={`appearance-none rounded-full px-2.5 py-0.5 text-[10px] tracking-widest uppercase font-medium border cursor-pointer focus:outline-none ${statusStyles[b.status]}`}
                      >
                        <option value="pending">Pending</option>
                        <option value="confirmed">Confirmed</option>
                        <option value="checked-in">Checked In</option>
                      </select>
                    </td>
                    <td className="px-5 py-3 text-zinc-500 whitespace-nowrap">
                      {new Date(b.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-5 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => showQr(b)}
                          className="p-1.5 rounded-lg text-zinc-500 hover:text-violet-400 hover:bg-violet-500/10 transition cursor-pointer"
                          title="View QR Code"
                        >
                          <QrCode className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => setDeleteConfirm(b.id)}
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

      {/* Add Booking Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-xl border border-zinc-800/60 bg-zinc-900 p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-display text-lg text-zinc-100">New Booking</h3>
              <button
                onClick={() => setShowForm(false)}
                className="text-zinc-500 hover:text-zinc-300 transition cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Pack Select */}
              <div>
                <label className="block text-xs tracking-widest uppercase text-zinc-500 mb-1.5">
                  Pack
                </label>
                <select
                  value={form.packId}
                  onChange={(e) => setForm({ ...form, packId: e.target.value })}
                  className="w-full rounded-lg border border-zinc-700/60 bg-zinc-800/50 px-3 py-2.5 text-sm text-zinc-100 focus:outline-none focus:border-amber-500/50 transition cursor-pointer"
                >
                  <option value="">Select a pack</option>
                  {packs
                    .filter((p) => p.active)
                    .map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} — {p.price} MAD
                      </option>
                    ))}
                </select>
              </div>

              {/* Name */}
              <div>
                <label className="block text-xs tracking-widest uppercase text-zinc-500 mb-1.5">
                  Customer Name
                </label>
                <input
                  type="text"
                  value={form.customerName}
                  onChange={(e) =>
                    setForm({ ...form, customerName: e.target.value })
                  }
                  placeholder="Full name"
                  className="w-full rounded-lg border border-zinc-700/60 bg-zinc-800/50 px-3 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-amber-500/50 transition"
                />
              </div>

              {/* Email & Phone */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs tracking-widest uppercase text-zinc-500 mb-1.5">
                    Email
                  </label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    placeholder="email@example.com"
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

              {/* Country & People */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs tracking-widest uppercase text-zinc-500 mb-1.5">
                    Country
                  </label>
                  <input
                    type="text"
                    value={form.country}
                    onChange={(e) =>
                      setForm({ ...form, country: e.target.value })
                    }
                    placeholder="Morocco"
                    className="w-full rounded-lg border border-zinc-700/60 bg-zinc-800/50 px-3 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-amber-500/50 transition"
                  />
                </div>
                <div>
                  <label className="block text-xs tracking-widest uppercase text-zinc-500 mb-1.5">
                    Number of People
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={form.numPeople}
                    onChange={(e) =>
                      setForm({ ...form, numPeople: parseInt(e.target.value) || 1 })
                    }
                    className="w-full rounded-lg border border-zinc-700/60 bg-zinc-800/50 px-3 py-2.5 text-sm text-zinc-100 focus:outline-none focus:border-amber-500/50 transition"
                  />
                </div>
              </div>

              {/* Dance Level */}
              <div>
                <label className="block text-xs tracking-widest uppercase text-zinc-500 mb-1.5">
                  Dance Level
                </label>
                <select
                  value={form.danceLevel}
                  onChange={(e) =>
                    setForm({ ...form, danceLevel: e.target.value })
                  }
                  className="w-full rounded-lg border border-zinc-700/60 bg-zinc-800/50 px-3 py-2.5 text-sm text-zinc-100 focus:outline-none focus:border-amber-500/50 transition cursor-pointer"
                >
                  <option value="Beginner">Beginner</option>
                  <option value="Intermediate">Intermediate</option>
                  <option value="Advanced">Advanced</option>
                  <option value="Professional">Professional</option>
                </select>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs tracking-widest uppercase text-zinc-500 mb-1.5">
                  Notes (optional)
                </label>
                <textarea
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  placeholder="Special requests..."
                  rows={2}
                  className="w-full rounded-lg border border-zinc-700/60 bg-zinc-800/50 px-3 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-amber-500/50 transition resize-none"
                />
              </div>

              {/* Status */}
              <div>
                <label className="block text-xs tracking-widest uppercase text-zinc-500 mb-1.5">
                  Initial Status
                </label>
                <select
                  value={form.status}
                  onChange={(e) =>
                    setForm({ ...form, status: e.target.value as BookingStatus })
                  }
                  className="w-full rounded-lg border border-zinc-700/60 bg-zinc-800/50 px-3 py-2.5 text-sm text-zinc-100 focus:outline-none focus:border-amber-500/50 transition cursor-pointer"
                >
                  <option value="pending">Pending</option>
                  <option value="confirmed">Confirmed</option>
                  <option value="checked-in">Checked In</option>
                </select>
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
                onClick={handleCreate}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold bg-amber-500 text-zinc-950 hover:bg-amber-400 transition cursor-pointer"
              >
                <Check className="h-4 w-4" /> Create Booking
              </button>
            </div>
          </div>
        </div>
      )}

      {/* QR Code Modal */}
      {qrBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm rounded-xl border border-zinc-800/60 bg-zinc-900 p-6 text-center">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display text-lg text-zinc-100">Ticket QR Code</h3>
              <button
                onClick={() => setQrBooking(null)}
                className="text-zinc-500 hover:text-zinc-300 transition cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {qrDataUrl && (
              <div className="flex flex-col items-center gap-4">
                <div className="rounded-xl border border-zinc-700/40 bg-zinc-100 p-4 inline-block">
                  <img src={qrDataUrl} alt="QR Code" className="w-48 h-48" />
                </div>
                <div>
                  <p className="font-display text-sm text-zinc-200">
                    {qrBooking.customerName}
                  </p>
                  <code className="text-xs font-mono text-amber-400/80 bg-amber-500/10 px-2 py-0.5 rounded mt-1 inline-block">
                    {qrBooking.ticketCode}
                  </code>
                  <p className="text-xs text-zinc-500 mt-1">{qrBooking.packName}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={downloadQr}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium bg-amber-500/15 text-amber-400 hover:bg-amber-500/25 transition cursor-pointer"
                  >
                    <Download className="h-3.5 w-3.5" /> Download
                  </button>
                  <button
                    onClick={() => copyCode(qrBooking.ticketCode)}
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
            <h3 className="font-display text-lg text-zinc-100">
              Delete Booking?
            </h3>
            <p className="mt-2 text-sm text-zinc-500">
              This will permanently remove this booking and its ticket.
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
