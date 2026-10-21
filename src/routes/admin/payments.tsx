import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect, useCallback, useMemo } from "react";
import {
  Wallet,
  Search,
  X,
  Plus,
  Trash2,
  Pencil,
  Check,
  Paperclip,
  Image as ImageIcon,
  FileText,
  Send,
  Mail,
  Phone,
  MessageCircle,
  ChevronDown,
  ChevronRight,
  Loader2,
  AlertTriangle,
  Receipt,
} from "lucide-react";
import {
  getBookings,
  getPacks,
  getCollaborators,
  getClients,
  getPayments,
  addPayment,
  deletePayment,
  uploadPaymentProof,
  getPaymentProofUrl,
  markPaymentReceiptSent,
  updateBooking,
  updateBookingStatus,
  guestOrigin,
  isTourismBooking,
  isTransferBooking,
  bookingAmountDueMad,
  paymentStatusFor,
  formatMad,
  PAYMENT_METHOD_LABELS,
  type Booking,
  type Pack,
  type Collaborator,
  type BookingPayment,
  type PaymentMethod,
  type PaymentStatus,
} from "@/lib/admin-store";
import { getCurrentAdmin } from "@/lib/auth-store";
import { sendFormNotification, paymentReceiptEmail } from "@/lib/form-notify";
import { sendTicketConfirmationEmail } from "@/lib/ticket-confirmation";
import { translateDynamicText } from "@/lib/translations";
import { formatInternationalPhone } from "@/lib/phone";

export const Route = createFileRoute("/admin/payments")({
  component: AdminPayments,
});

const STATUS_LABEL: Record<PaymentStatus, string> = {
  unpaid: "Non payé",
  partial: "Partiel",
  paid: "Payé",
};

const STATUS_STYLE: Record<PaymentStatus, string> = {
  unpaid: "bg-red-50 text-red-700 border-red-200",
  partial: "bg-amber-50 text-amber-800 border-amber-200",
  paid: "bg-emerald-50 text-emerald-700 border-emerald-200",
};

const todayIso = () => new Date().toISOString().slice(0, 10);

const emptyForm = () => ({
  amount: "",
  method: "virement" as PaymentMethod,
  paidAt: todayIso(),
  note: "",
  file: null as File | null,
  sendReceipt: true,
});

interface Row {
  booking: Booking;
  pack?: Pack;
  payments: BookingPayment[];
  due: number;
  received: number;
  remaining: number;
  status: PaymentStatus;
}

function AdminPayments() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [packs, setPacks] = useState<Pack[]>([]);
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [payments, setPayments] = useState<BookingPayment[]>([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<PaymentStatus | "all">("all");
  const [showDeclined, setShowDeclined] = useState(false);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const [modalBooking, setModalBooking] = useState<Booking | null>(null);
  const [form, setForm] = useState(emptyForm());
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  const [editingDue, setEditingDue] = useState<{ id: string; value: string } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<BookingPayment | null>(null);
  const [proofUrls, setProofUrls] = useState<Record<string, string | null>>({});
  const [sendingReceipt, setSendingReceipt] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ kind: "ok" | "error"; text: string } | null>(null);

  const reload = useCallback(async () => {
    const [b, p, c, pay] = await Promise.all([
      getBookings(),
      getPacks(),
      getCollaborators(),
      getPayments(),
    ]);
    setBookings(b);
    setPacks(p);
    setCollaborators(c);
    setPayments(pay);
    setLoading(false);
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(null), 8000);
    return () => clearTimeout(t);
  }, [notice]);

  // Only Moroccan festival guests (hotel packs and passes), in MAD
  const rows = useMemo<Row[]>(() => {
    return bookings
      .filter((b) => guestOrigin(b) === "morocco")
      .filter((b) => !isTourismBooking(b) && !isTransferBooking(b))
      .filter((b) => showDeclined || b.status !== "declined")
      .map((b) => {
        const pack = packs.find((p) => p.id === b.packId);
        const list = payments.filter((p) => p.bookingId === b.id);
        const due = bookingAmountDueMad(b, pack);
        const received = list.reduce((sum, p) => sum + p.amountMad, 0);
        return {
          booking: b,
          pack,
          payments: list,
          due,
          received,
          remaining: Math.max(due - received, 0),
          status: paymentStatusFor(due, received),
        };
      })
      .sort((a, b) => b.booking.createdAt.localeCompare(a.booking.createdAt));
  }, [bookings, packs, payments, showDeclined]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (statusFilter !== "all" && r.status !== statusFilter) return false;
      if (!q) return true;
      const b = r.booking;
      return (
        b.customerName.toLowerCase().includes(q) ||
        b.email.toLowerCase().includes(q) ||
        b.phone.toLowerCase().includes(q) ||
        b.ticketCode.toLowerCase().includes(q) ||
        b.packName.toLowerCase().includes(q)
      );
    });
  }, [rows, search, statusFilter]);

  const totals = useMemo(() => {
    const active = rows.filter((r) => r.booking.status !== "declined");
    return {
      clients: active.length,
      // Same rule as the Clients page: one entry per person, each with their
      // own nationality, so both pages show the identical Moroccan count.
      people: getClients(
        active.map((r) => r.booking),
        packs,
        collaborators,
      ).filter((c) => c.origin === "morocco").length,
      due: active.reduce((s, r) => s + r.due, 0),
      received: active.reduce((s, r) => s + r.received, 0),
      remaining: active.reduce((s, r) => s + r.remaining, 0),
      unpaid: active.filter((r) => r.status === "unpaid").length,
      partial: active.filter((r) => r.status === "partial").length,
      paid: active.filter((r) => r.status === "paid").length,
    };
  }, [rows, packs, collaborators]);

  const toggleExpanded = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Resolve proof links lazily for the rows that are open
  useEffect(() => {
    const open = payments.filter(
      (p) => expanded.has(p.bookingId) && p.proofPath && proofUrls[p.id] === undefined,
    );
    if (open.length === 0) return;
    let cancelled = false;
    (async () => {
      const entries = await Promise.all(
        open.map(async (p) => [p.id, await getPaymentProofUrl(p.proofPath)] as const),
      );
      if (cancelled) return;
      setProofUrls((prev) => {
        const next = { ...prev };
        for (const [id, url] of entries) next[id] = url;
        return next;
      });
    })();
    return () => {
      cancelled = true;
    };
  }, [expanded, payments, proofUrls]);

  const whatsappLink = (b: Booking): string | null => {
    const digits = formatInternationalPhone(b.phone).replace(/\D/g, "");
    return digits ? `https://wa.me/${digits}` : null;
  };

  const openModal = (b: Booking) => {
    setForm(emptyForm());
    setFormError("");
    setModalBooking(b);
  };

  const sendReceipt = async (row: Row, payment: BookingPayment, receivedSoFar: number) => {
    if (!row.booking.email) return false;
    const mail = paymentReceiptEmail({
      customerName: row.booking.customerName,
      ticketCode: row.booking.ticketCode,
      packName: translateDynamicText(row.booking.packName, "fr"),
      amountMad: payment.amountMad,
      methodLabel: PAYMENT_METHOD_LABELS[payment.method],
      paidAt: payment.paidAt,
      totalDueMad: row.due,
      totalReceivedMad: receivedSoFar,
      note: payment.note,
    });
    const ok = await sendFormNotification({
      subject: `Reçu de paiement : ${row.booking.customerName} (${row.booking.ticketCode}) — ${formatMad(payment.amountMad)}`,
      guestSubject: mail.subject,
      lang: "fr",
      fields: {
        name: row.booking.customerName,
        email: row.booking.email,
        Montant: formatMad(payment.amountMad),
        Mode: PAYMENT_METHOD_LABELS[payment.method],
        Date: payment.paidAt,
        "Total dû": formatMad(row.due),
        "Total reçu": formatMad(receivedSoFar),
        "Reste à payer": formatMad(Math.max(row.due - receivedSoFar, 0)),
        Code: row.booking.ticketCode,
      },
      autoresponse: mail.body,
    });
    if (ok) await markPaymentReceiptSent(payment.id);
    return ok;
  };

  const handleSavePayment = async () => {
    if (!modalBooking) return;
    const amount = Number(String(form.amount).replace(/\s/g, "").replace(",", "."));
    if (!Number.isFinite(amount) || amount <= 0) {
      setFormError("Indiquez un montant en dirhams supérieur à 0.");
      return;
    }
    if (!form.paidAt) {
      setFormError("Indiquez la date du paiement.");
      return;
    }
    setSaving(true);
    setFormError("");
    const row = rows.find((r) => r.booking.id === modalBooking.id);
    const messages: string[] = [];
    try {
      let proof: { path: string; name: string } | null = null;
      if (form.file) proof = await uploadPaymentProof(modalBooking.id, form.file);

      const created = await addPayment(
        {
          bookingId: modalBooking.id,
          amountMad: Math.round(amount),
          method: form.method,
          paidAt: form.paidAt,
          note: form.note.trim() || null,
          proofPath: proof?.path ?? null,
          proofName: proof?.name ?? null,
          receiptSentAt: null,
          recordedBy: getCurrentAdmin()?.name ?? null,
        },
        modalBooking,
      );
      messages.push(`Paiement de ${formatMad(created.amountMad)} enregistré.`);

      const due =
        row?.due ??
        bookingAmountDueMad(
          modalBooking,
          packs.find((p) => p.id === modalBooking.packId),
        );
      const receivedSoFar = (row?.received ?? 0) + created.amountMad;

      // Receipt to the guest (partial or final)
      if (form.sendReceipt && modalBooking.email) {
        const ok = await sendReceipt(
          {
            ...(row as Row),
            booking: modalBooking,
            due,
            received: receivedSoFar,
            remaining: Math.max(due - receivedSoFar, 0),
            status: paymentStatusFor(due, receivedSoFar),
            pack: row?.pack,
            payments: row?.payments ?? [],
          },
          created,
          receivedSoFar,
        );
        messages.push(ok ? "Reçu envoyé par e-mail." : "Le reçu n’a pas pu être envoyé.");
      }

      // Fully paid → confirm the booking and send the ticket automatically
      if (due > 0 && receivedSoFar >= due && modalBooking.status === "pending") {
        const updated = await updateBookingStatus(modalBooking.id, "confirmed");
        if (updated) {
          if (updated.email) {
            const ok = await sendTicketConfirmationEmail(updated, collaborators);
            messages.push(
              ok
                ? "Réservation confirmée : billet envoyé par e-mail."
                : "Réservation confirmée, mais l’e-mail du billet n’a pas pu être envoyé.",
            );
          } else {
            messages.push(
              "Réservation confirmée (aucun e-mail enregistré pour envoyer le billet).",
            );
          }
        }
      }

      setModalBooking(null);
      setNotice({ kind: "ok", text: messages.join(" ") });
      setExpanded((prev) => new Set(prev).add(modalBooking.id));
      await reload();
    } catch (e) {
      setFormError(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  };

  const handleResendReceipt = async (row: Row, payment: BookingPayment) => {
    setSendingReceipt(payment.id);
    try {
      // Running total up to and including this payment (chronological)
      const ordered = [...row.payments].sort((a, b) =>
        (a.paidAt + a.createdAt).localeCompare(b.paidAt + b.createdAt),
      );
      let runningTotal = 0;
      for (const p of ordered) {
        runningTotal += p.amountMad;
        if (p.id === payment.id) break;
      }
      const ok = await sendReceipt(row, payment, runningTotal);
      setNotice(
        ok
          ? { kind: "ok", text: `Reçu envoyé à ${row.booking.email}.` }
          : { kind: "error", text: "Le reçu n’a pas pu être envoyé." },
      );
      await reload();
    } finally {
      setSendingReceipt(null);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    const b = bookings.find((x) => x.id === deleteTarget.bookingId);
    try {
      await deletePayment(deleteTarget, b);
      setDeleteTarget(null);
      await reload();
    } catch (e) {
      setNotice({ kind: "error", text: e instanceof Error ? e.message : String(e) });
      setDeleteTarget(null);
    }
  };

  const saveDue = async () => {
    if (!editingDue) return;
    const raw = editingDue.value.trim().replace(/\s/g, "").replace(",", ".");
    const value = raw === "" ? null : Number(raw);
    if (value !== null && (!Number.isFinite(value) || value < 0)) {
      setNotice({ kind: "error", text: "Montant dû invalide." });
      return;
    }
    try {
      await updateBooking(editingDue.id, {
        amountDueMad: value === null ? null : Math.round(value),
      });
      setEditingDue(null);
      await reload();
    } catch (e) {
      setNotice({ kind: "error", text: e instanceof Error ? e.message : String(e) });
    }
  };

  const fmtDate = (d?: string | null) => (d ? new Date(d).toLocaleDateString("fr-FR") : "");

  return (
    <div className="p-6 lg:p-8">
      <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
        <div>
          <h2 className="font-display text-2xl text-gray-900 uppercase tracking-wide">
            Paiements Maroc
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            Suivi des paiements en dirhams des clients marocains : acomptes, justificatifs et reçus.
            Une réservation entièrement réglée est confirmée automatiquement et le billet est envoyé
            par e-mail.
          </p>
        </div>
      </div>

      {notice && (
        <div
          className={`mb-4 rounded-lg border px-4 py-3 text-sm flex items-start gap-2 ${
            notice.kind === "ok"
              ? "bg-emerald-50 border-emerald-200 text-emerald-800"
              : "bg-red-50 border-red-200 text-red-800"
          }`}
        >
          {notice.kind === "ok" ? (
            <Check className="h-4 w-4 mt-0.5 shrink-0" />
          ) : (
            <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
          )}
          <span className="flex-1">{notice.text}</span>
          <button
            onClick={() => setNotice(null)}
            className="text-current/60 hover:text-current cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="text-[10px] uppercase tracking-widest text-gray-500 font-semibold flex items-center gap-1">
            <Wallet className="h-3.5 w-3.5" /> Clients marocains
          </p>
          <p className="text-2xl font-semibold text-gray-900 mt-1">{totals.people}</p>
          <p className="text-[11px] text-gray-700 mt-1 font-medium">
            {totals.clients} réservation{totals.clients > 1 ? "s" : ""}
          </p>
          <p className="text-[11px] text-gray-500">
            <span className="text-emerald-700">{totals.paid} payée{totals.paid > 1 ? "s" : ""}</span>
            {" · "}
            <span className="text-amber-700">
              {totals.partial} partielle{totals.partial > 1 ? "s" : ""}
            </span>
            {" · "}
            <span className="text-red-700">
              {totals.unpaid} non payée{totals.unpaid > 1 ? "s" : ""}
            </span>
          </p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="text-[10px] uppercase tracking-widest text-gray-500 font-semibold">
            Total dû
          </p>
          <p className="text-2xl font-semibold text-gray-900 mt-1">{formatMad(totals.due)}</p>
        </div>
        <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-4">
          <p className="text-[10px] uppercase tracking-widest text-emerald-700 font-semibold">
            Total reçu
          </p>
          <p className="text-2xl font-semibold text-emerald-800 mt-1">
            {formatMad(totals.received)}
          </p>
        </div>
        <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-4">
          <p className="text-[10px] uppercase tracking-widest text-amber-700 font-semibold">
            Reste à encaisser
          </p>
          <p className="text-2xl font-semibold text-amber-800 mt-1">
            {formatMad(totals.remaining)}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="flex items-center gap-2 flex-wrap">
          {(["all", "unpaid", "partial", "paid"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition cursor-pointer ${
                statusFilter === s
                  ? "bg-gray-900 text-white border-gray-900"
                  : "bg-white text-gray-700 border-gray-200 hover:border-gray-400"
              }`}
            >
              {s === "all"
                ? `Tous (${rows.filter((r) => r.booking.status !== "declined").length})`
                : `${STATUS_LABEL[s]} (${totals[s]})`}
            </button>
          ))}
        </div>
        <div className="relative flex-1 min-w-[240px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher par nom, e-mail, téléphone, billet ou forfait…"
            className="w-full rounded-lg border border-gray-300 bg-white pl-9 pr-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-amber-500 transition"
          />
        </div>
        <label className="flex items-center gap-2 text-xs text-gray-600 cursor-pointer">
          <input
            type="checkbox"
            checked={showDeclined}
            onChange={(e) => setShowDeclined(e.target.checked)}
            className="rounded border-gray-300"
          />
          Afficher les réservations refusées
        </label>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
        {loading ? (
          <div className="p-10 text-center text-sm text-gray-500 flex items-center justify-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" /> Chargement…
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-10 text-center text-sm text-gray-500">
            Aucun client marocain ne correspond à ce filtre.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-[10px] uppercase tracking-widest text-gray-500">
                <tr>
                  <th className="px-4 py-3 text-left font-medium w-8"></th>
                  <th className="px-4 py-3 text-left font-medium">Client</th>
                  <th className="px-4 py-3 text-left font-medium">Forfait</th>
                  <th className="px-4 py-3 text-right font-medium">Montant dû</th>
                  <th className="px-4 py-3 text-right font-medium">Reçu</th>
                  <th className="px-4 py-3 text-right font-medium">Reste</th>
                  <th className="px-4 py-3 text-left font-medium">Paiement</th>
                  <th className="px-4 py-3 text-left font-medium">Réservation</th>
                  <th className="px-4 py-3 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map((row) => {
                  const b = row.booking;
                  const isOpen = expanded.has(b.id);
                  const wa = whatsappLink(b);
                  const last = row.payments[0];
                  return (
                    <RowFragment key={b.id}>
                      <tr
                        className={`hover:bg-gray-50/60 ${b.status === "declined" ? "opacity-60" : ""}`}
                      >
                        <td className="px-3 py-3 align-top">
                          <button
                            onClick={() => toggleExpanded(b.id)}
                            className="p-1 rounded text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition cursor-pointer"
                            title={isOpen ? "Masquer les paiements" : "Voir les paiements"}
                          >
                            {isOpen ? (
                              <ChevronDown className="h-4 w-4" />
                            ) : (
                              <ChevronRight className="h-4 w-4" />
                            )}
                          </button>
                        </td>
                        <td className="px-4 py-3 align-top">
                          <p className="font-medium text-gray-900">{b.customerName}</p>
                          <div className="text-[11px] text-gray-500 mt-0.5 space-y-0.5">
                            {b.email && (
                              <p className="flex items-center gap-1">
                                <Mail className="h-3 w-3" /> {b.email}
                              </p>
                            )}
                            {b.phone && (
                              <p className="flex items-center gap-1">
                                <Phone className="h-3 w-3" /> {b.phone}
                                {wa && (
                                  <a
                                    href={wa}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="ml-1 text-[#16a34a] hover:bg-green-50 rounded p-0.5"
                                    title="Ouvrir WhatsApp"
                                  >
                                    <MessageCircle className="h-3.5 w-3.5" />
                                  </a>
                                )}
                              </p>
                            )}
                          </div>
                          <code className="inline-block mt-1 text-[10px] font-mono text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded">
                            {b.ticketCode}
                          </code>
                        </td>
                        <td className="px-4 py-3 align-top">
                          <p className="text-gray-700">{translateDynamicText(b.packName, "fr")}</p>
                          <p className="text-[11px] text-gray-500 mt-0.5">
                            {b.numPeople > 1 ? `${b.numPeople} personnes` : "1 personne"}
                            {row.pack ? ` · ${row.pack.price} ${row.pack.currency}` : ""}
                            {b.discountAmount ? ` · -€${b.discountAmount}` : ""}
                          </p>
                        </td>
                        <td className="px-4 py-3 align-top text-right whitespace-nowrap">
                          {editingDue?.id === b.id ? (
                            <span className="inline-flex items-center gap-1">
                              <input
                                autoFocus
                                value={editingDue.value}
                                onChange={(e) => setEditingDue({ id: b.id, value: e.target.value })}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") saveDue();
                                  if (e.key === "Escape") setEditingDue(null);
                                }}
                                placeholder="auto"
                                className="w-24 rounded border border-gray-300 px-2 py-1 text-right text-sm focus:outline-none focus:border-amber-500"
                              />
                              <button
                                onClick={saveDue}
                                className="p-1 text-emerald-600 hover:bg-emerald-50 rounded cursor-pointer"
                                title="Enregistrer"
                              >
                                <Check className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => setEditingDue(null)}
                                className="p-1 text-gray-400 hover:bg-gray-100 rounded cursor-pointer"
                                title="Annuler"
                              >
                                <X className="h-4 w-4" />
                              </button>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 justify-end">
                              <span className="font-medium text-gray-900">
                                {formatMad(row.due)}
                              </span>
                              <button
                                onClick={() =>
                                  setEditingDue({
                                    id: b.id,
                                    value: b.amountDueMad != null ? String(b.amountDueMad) : "",
                                  })
                                }
                                className="p-1 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded cursor-pointer"
                                title={
                                  b.amountDueMad != null
                                    ? "Montant personnalisé — modifier (vider pour revenir au calcul automatique)"
                                    : "Calculé depuis le prix du forfait — modifier"
                                }
                              >
                                <Pencil className="h-3 w-3" />
                              </button>
                            </span>
                          )}
                          {b.amountDueMad != null && (
                            <p className="text-[10px] text-violet-600 mt-0.5">personnalisé</p>
                          )}
                        </td>
                        <td className="px-4 py-3 align-top text-right whitespace-nowrap text-emerald-700 font-medium">
                          {formatMad(row.received)}
                        </td>
                        <td className="px-4 py-3 align-top text-right whitespace-nowrap font-medium text-gray-900">
                          {formatMad(row.remaining)}
                        </td>
                        <td className="px-4 py-3 align-top">
                          <span
                            className={`inline-block rounded-full px-2.5 py-0.5 text-[10px] tracking-widest uppercase font-semibold border ${STATUS_STYLE[row.status]}`}
                          >
                            {STATUS_LABEL[row.status]}
                          </span>
                          {last && (
                            <p className="text-[11px] text-gray-500 mt-1">
                              Dernier : {fmtDate(last.paidAt)} · {formatMad(last.amountMad)}
                            </p>
                          )}
                        </td>
                        <td className="px-4 py-3 align-top">
                          <span
                            className={`inline-block rounded-full px-2.5 py-0.5 text-[10px] tracking-widest uppercase font-medium border ${
                              b.status === "confirmed" || b.status === "checked-in"
                                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                : b.status === "declined"
                                  ? "bg-gray-100 text-gray-500 border-gray-200"
                                  : "bg-amber-50 text-amber-800 border-amber-200"
                            }`}
                          >
                            {b.status === "pending"
                              ? "En attente"
                              : b.status === "confirmed"
                                ? "Confirmé"
                                : b.status === "checked-in"
                                  ? "Arrivé"
                                  : "Refusé"}
                          </span>
                        </td>
                        <td className="px-4 py-3 align-top text-right whitespace-nowrap">
                          <button
                            onClick={() => openModal(b)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-amber-500 text-white hover:bg-amber-600 transition cursor-pointer"
                          >
                            <Plus className="h-3.5 w-3.5" /> Paiement
                          </button>
                        </td>
                      </tr>
                      {isOpen && (
                        <tr className="bg-slate-50/70">
                          <td></td>
                          <td colSpan={8} className="px-4 py-3">
                            {row.payments.length === 0 ? (
                              <p className="text-xs text-gray-500">
                                Aucun paiement enregistré pour cette réservation.
                              </p>
                            ) : (
                              <ul className="divide-y divide-gray-200 rounded-lg border border-gray-200 bg-white">
                                {row.payments.map((p) => {
                                  const url = proofUrls[p.id];
                                  const isImage =
                                    !!p.proofPath &&
                                    (/\.(jpe?g|png|webp|gif|heic)$/i.test(
                                      p.proofName || p.proofPath,
                                    ) ||
                                      p.proofPath.startsWith("data:image"));
                                  return (
                                    <li
                                      key={p.id}
                                      className="flex flex-wrap items-center gap-3 px-3 py-2 text-xs"
                                    >
                                      <span className="font-semibold text-gray-900 w-28">
                                        {formatMad(p.amountMad)}
                                      </span>
                                      <span className="text-gray-700 w-32">
                                        {PAYMENT_METHOD_LABELS[p.method]}
                                      </span>
                                      <span className="text-gray-500 w-24">
                                        {fmtDate(p.paidAt)}
                                      </span>
                                      {p.note && (
                                        <span className="text-gray-500 italic flex-1 min-w-[120px]">
                                          {p.note}
                                        </span>
                                      )}
                                      {p.proofPath ? (
                                        url ? (
                                          <a
                                            href={url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="inline-flex items-center gap-1.5 text-violet-700 hover:underline"
                                            title={p.proofName || "Justificatif"}
                                          >
                                            {isImage ? (
                                              <img
                                                src={url}
                                                alt="Justificatif"
                                                className="h-10 w-10 rounded object-cover border border-gray-200"
                                              />
                                            ) : (
                                              <FileText className="h-4 w-4" />
                                            )}
                                            <span className="max-w-[160px] truncate">
                                              {p.proofName || "Justificatif"}
                                            </span>
                                          </a>
                                        ) : url === null ? (
                                          <span className="inline-flex items-center gap-1 text-gray-400">
                                            <Paperclip className="h-3.5 w-3.5" /> Justificatif
                                            indisponible
                                          </span>
                                        ) : (
                                          <span className="inline-flex items-center gap-1 text-gray-400">
                                            <Loader2 className="h-3.5 w-3.5 animate-spin" />{" "}
                                            Justificatif…
                                          </span>
                                        )
                                      ) : (
                                        <span className="text-gray-400">Sans justificatif</span>
                                      )}
                                      <span className="ml-auto inline-flex items-center gap-1">
                                        {p.receiptSentAt && (
                                          <span
                                            className="text-[10px] text-emerald-700 inline-flex items-center gap-1 mr-1"
                                            title={new Date(p.receiptSentAt).toLocaleString(
                                              "fr-FR",
                                            )}
                                          >
                                            <Receipt className="h-3 w-3" /> reçu envoyé
                                          </span>
                                        )}
                                        {b.email && (
                                          <button
                                            onClick={() => handleResendReceipt(row, p)}
                                            disabled={sendingReceipt === p.id}
                                            className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition cursor-pointer disabled:opacity-50"
                                            title={`Envoyer le reçu à ${b.email}`}
                                          >
                                            {sendingReceipt === p.id ? (
                                              <Loader2 className="h-3 w-3 animate-spin" />
                                            ) : (
                                              <Send className="h-3 w-3" />
                                            )}
                                            {p.receiptSentAt
                                              ? "Renvoyer le reçu"
                                              : "Envoyer le reçu"}
                                          </button>
                                        )}
                                        <button
                                          onClick={() => setDeleteTarget(p)}
                                          className="p-1 rounded text-gray-400 hover:text-red-600 hover:bg-red-50 transition cursor-pointer"
                                          title="Supprimer ce paiement"
                                        >
                                          <Trash2 className="h-3.5 w-3.5" />
                                        </button>
                                      </span>
                                      {p.recordedBy && (
                                        <span className="basis-full text-[10px] text-gray-400">
                                          Enregistré par {p.recordedBy}
                                        </span>
                                      )}
                                    </li>
                                  );
                                })}
                              </ul>
                            )}
                          </td>
                        </tr>
                      )}
                    </RowFragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add payment modal */}
      {modalBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-xl border border-gray-200 bg-white p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display text-lg text-gray-900">Enregistrer un paiement</h3>
              <button
                onClick={() => !saving && setModalBooking(null)}
                className="text-gray-400 hover:text-gray-600 transition cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {(() => {
              const row = rows.find((r) => r.booking.id === modalBooking.id);
              return (
                <div className="text-xs text-gray-600 bg-slate-50 p-3 rounded-lg mb-4 space-y-1">
                  <p>
                    <span className="font-semibold text-gray-900">{modalBooking.customerName}</span>{" "}
                    · <code className="font-mono text-amber-800">{modalBooking.ticketCode}</code>
                  </p>
                  <p>Forfait : {translateDynamicText(modalBooking.packName, "fr")}</p>
                  {row && (
                    <p>
                      Dû : <strong>{formatMad(row.due)}</strong> · Reçu : {formatMad(row.received)}{" "}
                      · Reste : <strong>{formatMad(row.remaining)}</strong>
                    </p>
                  )}
                </div>
              );
            })()}

            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Montant (MAD)
                </label>
                <input
                  type="number"
                  min={1}
                  step={1}
                  inputMode="decimal"
                  value={form.amount}
                  onChange={(e) => setForm({ ...form, amount: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:outline-none focus:border-amber-500 transition"
                  placeholder="1500"
                />
                {(() => {
                  const row = rows.find((r) => r.booking.id === modalBooking.id);
                  if (!row || row.remaining <= 0) return null;
                  return (
                    <button
                      type="button"
                      onClick={() => setForm({ ...form, amount: String(row.remaining) })}
                      className="mt-1 text-[11px] text-amber-700 hover:underline cursor-pointer"
                    >
                      Solde complet : {formatMad(row.remaining)}
                    </button>
                  );
                })()}
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Mode de paiement
                </label>
                <select
                  value={form.method}
                  onChange={(e) => setForm({ ...form, method: e.target.value as PaymentMethod })}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:outline-none focus:border-amber-500 transition cursor-pointer"
                >
                  {(Object.keys(PAYMENT_METHOD_LABELS) as PaymentMethod[]).map((m) => (
                    <option key={m} value={m}>
                      {PAYMENT_METHOD_LABELS[m]}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Date du paiement
                </label>
                <input
                  type="date"
                  value={form.paidAt}
                  onChange={(e) => setForm({ ...form, paidAt: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:outline-none focus:border-amber-500 transition"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Justificatif{" "}
                  <span className="font-normal text-gray-400">(photo du virement, reçu…)</span>
                </label>
                <label className="flex items-center gap-2 w-full rounded-lg border border-dashed border-gray-300 px-3 py-2 text-gray-600 hover:border-amber-500 cursor-pointer transition">
                  {form.file ? (
                    <ImageIcon className="h-4 w-4 text-violet-600" />
                  ) : (
                    <Paperclip className="h-4 w-4" />
                  )}
                  <span className="truncate text-xs">
                    {form.file ? form.file.name : "Choisir un fichier"}
                  </span>
                  <input
                    type="file"
                    accept="image/*,application/pdf"
                    className="hidden"
                    onChange={(e) => setForm({ ...form, file: e.target.files?.[0] ?? null })}
                  />
                </label>
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-semibold text-gray-700 mb-1">Remarque</label>
                <input
                  type="text"
                  value={form.note}
                  onChange={(e) => setForm({ ...form, note: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:outline-none focus:border-amber-500 transition"
                  placeholder="Ex. : acompte reçu par virement CIH, référence 12345"
                />
              </div>
              <label className="col-span-2 flex items-center gap-2 text-xs text-gray-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.sendReceipt}
                  disabled={!modalBooking.email}
                  onChange={(e) => setForm({ ...form, sendReceipt: e.target.checked })}
                  className="rounded border-gray-300"
                />
                {modalBooking.email
                  ? `Envoyer le reçu par e-mail à ${modalBooking.email}`
                  : "Aucun e-mail enregistré : le reçu ne peut pas être envoyé"}
              </label>
            </div>

            {formError && (
              <p className="mt-3 text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                {formError}
              </p>
            )}

            <div className="flex items-center justify-end gap-2 mt-5">
              <button
                onClick={() => setModalBooking(null)}
                disabled={saving}
                className="px-4 py-2 rounded-lg text-sm text-gray-600 hover:bg-gray-100 transition cursor-pointer"
              >
                Annuler
              </button>
              <button
                onClick={handleSavePayment}
                disabled={saving}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold bg-amber-500 text-white hover:bg-amber-600 transition cursor-pointer disabled:opacity-60"
              >
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Check className="h-4 w-4" />
                )}
                Enregistrer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirm */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm rounded-xl border border-gray-200 bg-white p-6">
            <h3 className="font-display text-lg text-gray-900 mb-2">Supprimer ce paiement ?</h3>
            <p className="text-sm text-gray-600">
              Le paiement de <strong>{formatMad(deleteTarget.amountMad)}</strong> du{" "}
              {fmtDate(deleteTarget.paidAt)} et son justificatif seront supprimés définitivement.
            </p>
            <div className="flex items-center justify-end gap-2 mt-5">
              <button
                onClick={() => setDeleteTarget(null)}
                className="px-4 py-2 rounded-lg text-sm text-gray-600 hover:bg-gray-100 transition cursor-pointer"
              >
                Annuler
              </button>
              <button
                onClick={handleDelete}
                className="px-4 py-2 rounded-lg text-sm font-semibold bg-red-600 text-white hover:bg-red-700 transition cursor-pointer"
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

/** Lets a row and its expandable detail share one key inside <tbody>. */
function RowFragment({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
