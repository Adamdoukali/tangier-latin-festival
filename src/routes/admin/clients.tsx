import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect, useCallback } from "react";
import {
  Users,
  Search,
  Download,
  Pencil,
  AlertTriangle,
  X,
  UserCheck,
  Building2,
  Mail,
  Phone,
  Check,
  MessageCircle,
  Calendar,
  Tag,
  Trash2,
  Sparkles,
  Ticket,
  Plane,
  Compass,
} from "lucide-react";
import {
  getBookings,
  getPacks,
  getCollaborators,
  guestDetailsColumnReady,
  updateBooking,
  getClients,
  parseGuestDetails,
  bookingUnitPrice,
  packPrice,
  guestBracelets,
  packRoomCategory,
  setClientArtistStatus,
  type Booking,
  type Pack,
  type Collaborator,
  type ClientGuest,
  type GuestDetail,
} from "@/lib/admin-store";
import { translateDynamicText } from "@/lib/translations";
import { formatInternationalPhone } from "@/lib/phone";
import { downloadXlsx } from "@/lib/spreadsheet-export";

export const Route = createFileRoute("/admin/clients")({
  component: AdminClients,
});

function getClientPackBadge(packName: string = "") {
  const p = (packName || "").toLowerCase();
  if (p.includes("modifier") || p.includes("modifiable")) {
    return {
      style: "bg-sky-50 text-blue-900 border-blue-300 shadow-2xs font-semibold",
      icon: "modifier" as const,
    };
  }
  if (
    p.includes("hotel") ||
    p.includes("chambre") ||
    p.includes("single") ||
    p.includes("double") ||
    p.includes("triple") ||
    p.includes("quad") ||
    p.includes("room") ||
    p.includes("solazur")
  ) {
    return {
      style: "bg-blue-50/80 text-blue-800 border-blue-200/90 font-medium",
      icon: "hotel" as const,
    };
  }
  if (
    p.includes("navette") ||
    p.includes("transfer") ||
    p.includes("shuttle") ||
    p.includes("aéroport") ||
    p.includes("airport")
  ) {
    return {
      style: "bg-emerald-50 text-emerald-800 border-emerald-200/90 font-medium",
      icon: "transfer" as const,
    };
  }
  if (
    p.includes("excursion") ||
    p.includes("tour") ||
    p.includes("chefchaouen") ||
    p.includes("asilah") ||
    p.includes("visite")
  ) {
    return {
      style: "bg-indigo-50 text-indigo-800 border-indigo-200/90 font-medium",
      icon: "excursion" as const,
    };
  }
  if (
    p.includes("pass") ||
    p.includes("full") ||
    p.includes("party") ||
    p.includes("soirée") ||
    p.includes("day")
  ) {
    return {
      style: "bg-amber-50 text-amber-800 border-amber-200/90 font-medium",
      icon: "pass" as const,
    };
  }
  return {
    style: "bg-slate-50 text-slate-700 border-slate-200/90 font-medium",
    icon: "default" as const,
  };
}

function AdminClients() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [packs, setPacks] = useState<Pack[]>([]);
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [guestDetailsReady, setGuestDetailsReady] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [originFilter, setOriginFilter] = useState<"all" | "morocco" | "international" | "artist">("all");
  const [missingContactOnly, setMissingContactOnly] = useState(false);

  // Edit Modal State
  const [editingClient, setEditingClient] = useState<ClientGuest | null>(null);
  const [editForm, setEditForm] = useState<{
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    origin: "morocco" | "international";
    country: string;
    notes: string;
    /** "website" | "manual" | "collab:<collaboratorId>" — who gets the referral */
    referral: string;
    arrivalDate: string;
    departureDate: string;
    unitPrice: string | number;
    priceCurrency: "EUR" | "MAD";
    discountCode: string;
    discountAmount: string | number;
    isArtist: boolean;
  }>({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    origin: "morocco",
    country: "Maroc",
    notes: "",
    referral: "website",
    arrivalDate: "",
    departureDate: "",
    unitPrice: "",
    priceCurrency: "EUR",
    discountCode: "",
    discountAmount: 0,
    isArtist: false,
  });

  // Referral of a booking as a select value (admin can hand it to another partner)
  const referralValueOf = (b: Booking | undefined): string =>
    b?.collaboratorId ? `collab:${b.collaboratorId}` : b?.source === "manual" ? "manual" : "website";

  const reload = useCallback(async () => {
    const [b, p, c, detailsOk] = await Promise.all([
      getBookings(),
      getPacks(),
      getCollaborators(),
      guestDetailsColumnReady(),
    ]);
    setBookings(b);
    setPacks(p);
    setCollaborators(c);
    setGuestDetailsReady(detailsOk);
    setLoading(false);
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  const allClients = getClients(bookings, packs, collaborators);

  // Quick stats
  const moroccanCount = allClients.filter((c) => c.origin === "morocco").length;
  const internationalCount = allClients.filter((c) => c.origin === "international").length;
  const artistCount = allClients.filter((c) => c.isArtist).length;
  const missingContactCount = allClients.filter((c) => !c.email.trim() || !c.phone.trim()).length;

  // Filtered Clients
  const filteredClients = allClients.filter((c) => {
    if (originFilter === "morocco" && c.origin !== "morocco") return false;
    if (originFilter === "international" && c.origin !== "international") return false;
    if (originFilter === "artist" && !c.isArtist) return false;
    if (missingContactOnly && c.email.trim() && c.phone.trim()) return false;

    if (!search.trim()) return true;
    const q = search.trim().toLowerCase();
    return (
      c.fullName.toLowerCase().includes(q) ||
      c.firstName.toLowerCase().includes(q) ||
      c.lastName.toLowerCase().includes(q) ||
      c.email.toLowerCase().includes(q) ||
      c.phone.toLowerCase().includes(q) ||
      c.country.toLowerCase().includes(q) ||
      c.ticketCode.toLowerCase().includes(q) ||
      (c.roomNumber ?? "").toLowerCase().includes(q) ||
      (c.roomType ?? "").toLowerCase().includes(q) ||
      (c.collaboratorName ?? "").toLowerCase().includes(q)
    );
  });

  const handleToggleArtist = async (client: ClientGuest) => {
    const targetBooking = bookings.find((b) => b.id === client.bookingId);
    if (!targetBooking) return;
    try {
      await setClientArtistStatus(targetBooking, client.guestIndex, !client.isArtist, packs);
      await reload();
    } catch (e: any) {
      setError(e.message || "Erreur lors de la mise à jour du statut d'artiste.");
    }
  };

  const openEditModal = (client: ClientGuest) => {
    const targetBooking = bookings.find((b) => b.id === client.bookingId);
    const targetPack = targetBooking ? packs.find((p) => p.id === targetBooking.packId) : null;
    const lockedPrice = targetBooking
      ? bookingUnitPrice(targetBooking, targetPack)
      : { amount: 0, currency: "EUR" as const };

    setEditingClient(client);
    setEditForm({
      firstName: client.firstName,
      lastName: client.lastName,
      email: client.email,
      phone: client.phone,
      origin: client.origin,
      country: client.country,
      notes: client.notes ?? "",
      referral: referralValueOf(targetBooking),
      arrivalDate: targetBooking?.arrivalDate ?? client.arrivalDate ?? "",
      departureDate: targetBooking?.departureDate ?? client.departureDate ?? "",
      unitPrice:
        targetBooking?.unitPrice != null ? targetBooking.unitPrice : lockedPrice.amount,
      priceCurrency: (targetBooking?.priceCurrency || lockedPrice.currency || "EUR") as "EUR" | "MAD",
      discountCode: targetBooking?.discountCode ?? "",
      discountAmount: targetBooking?.discountAmount ?? 0,
      isArtist: client.isArtist,
    });
  };

  const countryForOrigin = (
    currentCountry: string,
    origin: "morocco" | "international",
  ): string => {
    if (origin === "morocco") return "Maroc";
    return /^(morocco|maroc|المغرب)?$/i.test(currentCountry.trim())
      ? "Étranger"
      : currentCountry.trim() || "Étranger";
  };

  const saveSynchronizedGuestDetails = async (
    targetBooking: Booking,
    updatedDetails: GuestDetail[],
  ) => {
    const currentGuests = getClients([targetBooking], packs, collaborators);
    const synchronizedNames = currentGuests.map((guest, index) => {
      const detail = updatedDetails[index] ?? {};
      const firstName = detail.firstName ?? guest.firstName;
      const lastName = detail.lastName ?? guest.lastName;
      return `${firstName} ${lastName}`.trim() || guest.fullName;
    });
    const primary = updatedDetails[0] ?? {};

    const currentBracelets = guestBracelets(targetBooking, packs);
    if (editingClient) {
      if (editForm.isArtist) {
        currentBracelets[editingClient.guestIndex] = "artist";
      } else if (currentBracelets[editingClient.guestIndex] === "artist") {
        const p = packs.find((x) => x.id === targetBooking.packId);
        currentBracelets[editingClient.guestIndex] =
          packRoomCategory(p || targetBooking.packName, targetBooking.numPeople) === "fullpass"
            ? "fullpass"
            : "hotel";
      }
    }

    const saved = await updateBooking(targetBooking.id, {
      guestDetails: JSON.stringify(updatedDetails),
      bracelet: JSON.stringify(currentBracelets),
      customerName: synchronizedNames.join(" & ") || targetBooking.customerName,
      email: primary.email ?? targetBooking.email,
      phone: primary.phone ?? targetBooking.phone,
      country: primary.country ?? targetBooking.country,
      arrivalDate: editForm.arrivalDate || null,
      departureDate: editForm.departureDate || null,
      unitPrice:
        editForm.unitPrice !== "" ? Math.max(0, Number(editForm.unitPrice)) : null,
      priceCurrency: editForm.priceCurrency,
      discountCode: editForm.discountCode.trim() || null,
      discountAmount: Math.max(0, Number(editForm.discountAmount) || 0),
    });
    if (!saved) throw new Error("Les modifications du client n’ont pas été enregistrées.");
  };

  const handleSaveClient = async () => {
    if (!editingClient) return;
    setError("");

    const targetBooking = bookings.find((b) => b.id === editingClient.bookingId);
    if (!targetBooking) return;

    const currentDetails: GuestDetail[] = parseGuestDetails(targetBooking.guestDetails);
    const updatedDetails = [...currentDetails];

    // Ensure array is padded up to guestIndex
    while (updatedDetails.length <= editingClient.guestIndex) {
      updatedDetails.push({});
    }

    updatedDetails[editingClient.guestIndex] = {
      firstName: editForm.firstName.trim(),
      lastName: editForm.lastName.trim(),
      email: editForm.email.trim(),
      phone: editForm.phone.trim(),
      origin: editForm.origin,
      country: countryForOrigin(editForm.country, editForm.origin),
      notes: editForm.notes.trim(),
      isArtist: editForm.isArtist,
    };

    try {
      await saveSynchronizedGuestDetails(targetBooking, updatedDetails);

      // Referral reassignment (whole booking): hand the sale to another
      // partner, or detach it (website / manual). Only admins reach this form.
      if (editForm.referral !== referralValueOf(targetBooking)) {
        const toCollaborator = editForm.referral.startsWith("collab:")
          ? editForm.referral.slice("collab:".length)
          : null;
        const saved = await updateBooking(targetBooking.id, {
          collaboratorId: toCollaborator,
          source: toCollaborator
            ? targetBooking.source === "invite" && targetBooking.inviteCode
              ? "invite"
              : "referral"
            : editForm.referral === "manual"
              ? "manual"
              : "website",
        });
        if (!saved) throw new Error("Le parrainage n’a pas pu être modifié.");
      }

      setEditingClient(null);
      await reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  const handleInlineOriginChange = async (
    client: ClientGuest,
    newOrigin: "morocco" | "international",
  ) => {
    if (client.origin === newOrigin) return;
    setError("");

    const targetBooking = bookings.find((b) => b.id === client.bookingId);
    if (!targetBooking) return;

    const currentDetails: GuestDetail[] = parseGuestDetails(targetBooking.guestDetails);
    const updatedDetails = [...currentDetails];

    while (updatedDetails.length <= client.guestIndex) {
      updatedDetails.push({});
    }

    updatedDetails[client.guestIndex] = {
      ...updatedDetails[client.guestIndex],
      origin: newOrigin,
      country: countryForOrigin(client.country, newOrigin),
    };

    try {
      await saveSynchronizedGuestDetails(targetBooking, updatedDetails);
      await reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  const downloadClientsXlsx = (targetOrigin: "all" | "morocco" | "international" = "all") => {
    const header = [
      "Prénom",
      "Nom",
      "E-mail",
      "Téléphone",
      "Origine / Nationalité",
      "N° Chambre",
      "Type de Chambre",
      "Forfait / billet",
      "Code Billet",
      "Promoteur / partenaire",
      "Notes",
    ];

    const targetList = allClients.filter((c) => {
      if (targetOrigin === "morocco") return c.origin === "morocco";
      if (targetOrigin === "international") return c.origin === "international";
      return true;
    });

    const spreadsheetRows = targetList.map((c) => [
      c.firstName,
      c.lastName,
      c.email,
      c.phone,
      c.origin === "morocco" ? "Maroc 🇲🇦" : `${c.country || "Étranger"} 🌐`,
      c.roomNumber ?? "",
      c.roomType ?? "",
      c.packName,
      c.ticketCode,
      c.collaboratorName ?? "Sans partenaire",
      c.notes ?? "",
    ]);

    const suffix =
      targetOrigin === "morocco" ? "maroc" : targetOrigin === "international" ? "etranger" : "all";
    downloadXlsx(
      `clients-database-${suffix}-${new Date().toISOString().slice(0, 10)}.xlsx`,
      [header, ...spreadsheetRows],
      targetOrigin === "morocco"
        ? "Clients Maroc"
        : targetOrigin === "international"
          ? "Clients Etranger"
          : "Tous les clients",
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-slate-900">
            Base de données clients
          </h2>
          <p className="mt-1 text-xs text-slate-500">
            Répertoire consolidé des clients et participants, coordonnées, chambres et origines.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
          <button
            onClick={() => downloadClientsXlsx("morocco")}
            disabled={moroccanCount === 0}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200/80 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-colors shadow-xs cursor-pointer disabled:opacity-40"
          >
            <Download className="h-3.5 w-3.5 text-slate-400" /> Export Maroc ({moroccanCount})
          </button>
          <button
            onClick={() => downloadClientsXlsx("international")}
            disabled={internationalCount === 0}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200/80 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-colors shadow-xs cursor-pointer disabled:opacity-40"
          >
            <Download className="h-3.5 w-3.5 text-slate-400" /> Export Étranger ({internationalCount})
          </button>
          <button
            onClick={() => downloadClientsXlsx("all")}
            disabled={allClients.length === 0}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-900 bg-slate-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-800 transition-colors shadow-xs cursor-pointer disabled:opacity-40"
          >
            <Download className="h-3.5 w-3.5 text-slate-300" /> Export Tous ({allClients.length})
          </button>
        </div>
      </div>

      {/* Database Warning */}
      {!guestDetailsReady && (
        <div className="rounded-xl border border-amber-200/80 bg-amber-50/80 p-4 flex gap-3 text-xs text-amber-900">
          <AlertTriangle className="h-4.5 w-4.5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-amber-800">
              Migration requise pour les informations détaillées par participant
            </p>
            <p className="mt-1 text-amber-700">
              Les e-mails et téléphones personnalisés par participant nécessitent d'exécuter{" "}
              <code className="font-mono bg-amber-100/80 px-1 py-0.5 rounded text-amber-900">
                supabase/guest-details.sql
              </code>{" "}
              dans votre console Supabase.
            </p>
          </div>
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 flex items-start justify-between gap-3 text-xs text-rose-700">
          <p>{error}</p>
          <button
            onClick={() => setError("")}
            className="text-rose-400 hover:text-rose-600 transition-colors cursor-pointer shrink-0"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Stats Summary - unslop clean metric cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3.5">
        <div className="rounded-xl border border-slate-200/80 bg-white shadow-xs p-4 hover:border-slate-300 transition-colors">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-slate-500">Total clients</p>
            <Users className="h-4 w-4 text-slate-400" />
          </div>
          <p className="mt-1.5 text-2xl font-semibold tracking-tight text-slate-900 tabular-nums">
            {allClients.length}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200/80 bg-white shadow-xs p-4 hover:border-slate-300 transition-colors">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-slate-500">Maroc</p>
            <UserCheck className="h-4 w-4 text-emerald-600" />
          </div>
          <p className="mt-1.5 text-2xl font-semibold tracking-tight text-slate-900 tabular-nums">
            {moroccanCount}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200/80 bg-white shadow-xs p-4 hover:border-slate-300 transition-colors">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-slate-500">Étranger</p>
            <UserCheck className="h-4 w-4 text-sky-600" />
          </div>
          <p className="mt-1.5 text-2xl font-semibold tracking-tight text-slate-900 tabular-nums">
            {internationalCount}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200/80 bg-white shadow-xs p-4 hover:border-slate-300 transition-colors">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-slate-500">Artistes</p>
            <Sparkles className="h-4 w-4 text-purple-600" />
          </div>
          <p className="mt-1.5 text-2xl font-semibold tracking-tight text-slate-900 tabular-nums">
            {artistCount}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200/80 bg-white shadow-xs p-4 hover:border-slate-300 transition-colors">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-slate-500">Sans contact</p>
            <Mail className="h-4 w-4 text-amber-500" />
          </div>
          <p className="mt-1.5 text-2xl font-semibold tracking-tight text-slate-900 tabular-nums">
            {missingContactCount}
          </p>
        </div>
      </div>

      {/* Filter Controls */}
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-200/80 pb-3">
          <span className="text-xs font-medium text-slate-400 mr-1">
            Filtre :
          </span>
          <button
            onClick={() => setOriginFilter("all")}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
              originFilter === "all"
                ? "bg-slate-900 text-white shadow-xs"
                : "bg-white text-slate-600 border border-slate-200/80 hover:bg-slate-50"
            }`}
          >
            Tous ({allClients.length})
          </button>
          <button
            onClick={() => setOriginFilter("morocco")}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
              originFilter === "morocco"
                ? "bg-rose-600 text-white shadow-xs"
                : "bg-rose-50/70 text-rose-700 border border-rose-200/80 hover:bg-rose-100/70"
            }`}
          >
            Maroc ({moroccanCount})
          </button>
          <button
            onClick={() => setOriginFilter("international")}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
              originFilter === "international"
                ? "bg-slate-800 text-white shadow-xs"
                : "bg-slate-100 text-slate-700 border border-slate-200/80 hover:bg-slate-200/60"
            }`}
          >
            Étranger ({internationalCount})
          </button>
          <button
            onClick={() => setOriginFilter("artist")}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
              originFilter === "artist"
                ? "bg-purple-700 text-white shadow-xs"
                : "bg-purple-50 text-purple-700 border border-purple-200/80 hover:bg-purple-100/70"
            }`}
          >
            Artistes ({artistCount})
          </button>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher par nom, e-mail, téléphone, chambre ou code…"
              className="w-full rounded-lg border border-slate-200/80 bg-white pl-9 pr-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-slate-400 shadow-xs transition-colors"
            />
          </div>
          <label className="inline-flex items-center gap-2 text-xs text-slate-600 cursor-pointer shrink-0">
            <input
              type="checkbox"
              checked={missingContactOnly}
              onChange={(e) => setMissingContactOnly(e.target.checked)}
              className="accent-slate-900 rounded"
            />
            Afficher uniquement les contacts manquants
          </label>
        </div>
      </div>

      {/* Clients Table */}
      {loading ? (
        <div className="rounded-xl border border-slate-200/80 bg-white shadow-xs px-5 py-16 text-center text-xs text-slate-400">
          Chargement de la base clients…
        </div>
      ) : filteredClients.length === 0 ? (
        <div className="rounded-xl border border-slate-200/80 bg-white shadow-xs px-5 py-16 text-center text-xs text-slate-400">
          <Users className="h-8 w-8 mx-auto mb-2 text-slate-300" />
          Aucun client ne correspond aux critères de recherche.
        </div>
      ) : (
        <div className="rounded-xl border border-slate-200/80 bg-white shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-slate-200/80 text-slate-500 bg-slate-50/70">
                  <th className="px-4 py-3 text-left font-medium">#</th>
                  <th className="px-4 py-3 text-left font-medium">Nom du client</th>
                  <th className="px-4 py-3 text-left font-medium">E-mail</th>
                  <th className="px-4 py-3 text-left font-medium">Téléphone</th>
                  <th className="px-4 py-3 text-left font-medium">Origine</th>
                  <th className="px-4 py-3 text-left font-medium">Chambre</th>
                  <th className="px-4 py-3 text-left font-medium">Forfait</th>
                  <th className="px-4 py-3 text-left font-medium">Partenaire</th>
                  <th className="px-4 py-3 text-center font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredClients.map((client, idx) => (
                  <tr key={client.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-4 py-3 text-slate-400 tabular-nums">{idx + 1}</td>
                    <td className="px-4 py-3 font-medium text-slate-900">
                      <div className="flex items-center gap-1.5">
                        <span>{client.fullName}</span>
                        {client.guestIndex > 0 && (
                          <span className="text-[10px] text-slate-500 bg-slate-100 border border-slate-200/60 px-1.5 py-0.2 rounded font-normal">
                            Part. {client.guestIndex + 1}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {client.email ? (
                        <span className="text-slate-600 flex items-center gap-1.5">
                          <Mail className="h-3.5 w-3.5 text-slate-400" />
                          {client.email}
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => openEditModal(client)}
                          className="text-xs text-slate-400 hover:text-slate-700 hover:underline font-medium inline-flex items-center gap-1 cursor-pointer"
                        >
                          + Ajouter
                        </button>
                      )}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {client.phone ? (
                        <span className="text-slate-600 flex items-center gap-1.5 tabular-nums">
                          <Phone className="h-3.5 w-3.5 text-slate-400" />
                          {client.phone}
                          {formatInternationalPhone(client.phone).replace(/\D/g, "") && (
                            <a
                              href={`https://wa.me/${formatInternationalPhone(client.phone).replace(/\D/g, "")}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="ml-1 p-0.5 rounded text-emerald-600 hover:bg-emerald-50 transition-colors"
                              title="Ouvrir WhatsApp"
                            >
                              <MessageCircle className="h-3.5 w-3.5" />
                            </a>
                          )}
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => openEditModal(client)}
                          className="text-xs text-slate-400 hover:text-slate-700 hover:underline font-medium inline-flex items-center gap-1 cursor-pointer"
                        >
                          + Ajouter
                        </button>
                      )}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex flex-col gap-1 items-start">
                        <select
                          value={client.origin}
                          onChange={(e) =>
                            handleInlineOriginChange(
                              client,
                              e.target.value as "morocco" | "international",
                            )
                          }
                          className="rounded-md px-2 py-0.5 text-xs font-medium border border-slate-200/80 bg-slate-50/60 text-slate-700 focus:outline-none focus:border-slate-400 transition-colors cursor-pointer"
                        >
                          <option value="morocco">Maroc</option>
                          <option value="international">Étranger</option>
                        </select>

                        {client.isArtist ? (
                          <button
                            type="button"
                            onClick={() => handleToggleArtist(client)}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium bg-purple-50 text-purple-700 border border-purple-200/80 hover:bg-purple-100 transition-colors cursor-pointer"
                            title="Artiste — Cliquer pour retirer"
                          >
                            <Sparkles className="h-2.5 w-2.5 text-purple-600" />
                            Artiste ✓
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleToggleArtist(client)}
                            className="text-[10px] text-slate-400 hover:text-purple-600 hover:underline transition-colors cursor-pointer font-medium"
                            title="Marquer comme Artiste"
                          >
                            + Artiste
                          </button>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {client.roomNumber || client.roomType ? (
                        <span
                          className={`font-medium px-2 py-0.5 rounded-md border text-xs inline-flex items-center gap-1.5 ${
                            client.roomNumber
                              ? "text-blue-800 bg-blue-50/80 border-blue-200/80"
                              : "text-slate-700 bg-slate-100 border-slate-200/80"
                          }`}
                        >
                          <Building2 className="h-3 w-3 text-blue-600 shrink-0" />
                          {client.roomNumber ? `Nº ${client.roomNumber}` : client.roomType}
                          {client.roomNumber && client.roomType ? ` · ${client.roomType}` : ""}
                        </span>
                      ) : (
                        <span className="text-xs text-slate-400">Non attribuée</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-700">
                      {(() => {
                        const packBadge = getClientPackBadge(client.packName);
                        return (
                          <div className="flex flex-col items-start gap-1">
                            <span
                              className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs border ${packBadge.style}`}
                            >
                              {packBadge.icon === "modifier" && (
                                <Sparkles className="h-3 w-3 text-blue-600 shrink-0" />
                              )}
                              {packBadge.icon === "hotel" && (
                                <Building2 className="h-3 w-3 text-blue-600 shrink-0" />
                              )}
                              {packBadge.icon === "pass" && (
                                <Ticket className="h-3 w-3 text-amber-600 shrink-0" />
                              )}
                              {packBadge.icon === "transfer" && (
                                <Plane className="h-3 w-3 text-emerald-600 shrink-0" />
                              )}
                              {packBadge.icon === "excursion" && (
                                <Compass className="h-3 w-3 text-indigo-600 shrink-0" />
                              )}
                              <span>{translateDynamicText(client.packName, "fr")}</span>
                            </span>
                            <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                              <code className="text-[10px] text-slate-600 bg-slate-100 border border-slate-200/60 px-1 py-0.2 rounded font-mono">
                                {client.ticketCode}
                              </code>
                              {client.arrivalDate && client.departureDate && (
                                <span className="text-[10px] text-slate-500 font-medium inline-flex items-center gap-1 bg-slate-50 border border-slate-200/60 px-1.5 py-0.2 rounded tabular-nums">
                                  <Calendar className="h-2.5 w-2.5 text-slate-400" />
                                  {new Date(client.arrivalDate).toLocaleDateString("fr-FR")} →{" "}
                                  {new Date(client.departureDate).toLocaleDateString("fr-FR")}
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })()}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-600">{client.collaboratorName}</td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => openEditModal(client)}
                        className="p-1.5 rounded-md hover:bg-slate-200 text-slate-600 hover:text-slate-900 transition cursor-pointer"
                        title="Modifier les informations du client"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Edit Client Modal */}
      {editingClient && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-lg rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                <Pencil className="h-4 w-4 text-slate-600" /> Modifier les informations du client
              </h3>
              <button
                onClick={() => setEditingClient(null)}
                className="text-slate-400 hover:text-slate-600 transition cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="text-xs text-slate-500 bg-slate-50 border border-slate-200/60 p-2.5 rounded-lg flex items-center justify-between">
              <span>
                Code du billet :{" "}
                <code className="font-mono text-slate-900 font-semibold">
                  {editingClient.ticketCode}
                </code>
              </span>
              <span className="font-medium text-slate-700">Forfait : {translateDynamicText(editingClient.packName, "fr")}</span>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Prénom</label>
                <input
                  type="text"
                  value={editForm.firstName}
                  onChange={(e) => setEditForm({ ...editForm, firstName: e.target.value })}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-400 transition"
                  placeholder="John"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Nom</label>
                <input
                  type="text"
                  value={editForm.lastName}
                  onChange={(e) => setEditForm({ ...editForm, lastName: e.target.value })}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-400 transition"
                  placeholder="Doe"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Adresse e-mail
                </label>
                <input
                  type="email"
                  value={editForm.email}
                  onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-400 transition"
                  placeholder="john.doe@gmail.com"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Numéro de téléphone
                </label>
                <input
                  type="text"
                  value={editForm.phone}
                  onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-400 transition"
                  placeholder="+212 600 000 000"
                />
              </div>

              <div className="col-span-2">
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Nationalité / Origine
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() =>
                      setEditForm((current) => ({
                        ...current,
                        origin: "morocco",
                        country: "Maroc",
                      }))
                    }
                    className={`px-3.5 py-2 rounded-lg text-xs font-medium border transition cursor-pointer flex items-center justify-center gap-2 ${
                      editForm.origin === "morocco"
                        ? "bg-slate-900 text-white border-slate-900 shadow-xs"
                        : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    Maroc
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setEditForm((current) => ({
                        ...current,
                        origin: "international",
                        country: countryForOrigin(current.country, "international"),
                      }))
                    }
                    className={`px-3.5 py-2 rounded-lg text-xs font-medium border transition cursor-pointer flex items-center justify-center gap-2 ${
                      editForm.origin === "international"
                        ? "bg-slate-900 text-white border-slate-900 shadow-xs"
                        : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    Étranger
                  </button>
                </div>
                {editForm.origin === "international" && (
                  <div className="mt-2.5">
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Pays / Nationalité
                    </label>
                    <input
                      type="text"
                      value={editForm.country}
                      onChange={(e) =>
                        setEditForm((current) => ({ ...current, country: e.target.value }))
                      }
                      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-400 transition"
                      placeholder="Ex: Espagne, France, Royaume-Uni"
                    />
                  </div>
                )}
              </div>

              <div className="col-span-2 rounded-xl border border-slate-200/80 bg-slate-50/70 p-3.5 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-900 flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5 text-slate-600" /> Dates de la réservation (Hôtel & festival)
                  </label>
                  {editForm.arrivalDate && editForm.departureDate && (
                    <span className="text-[11px] font-medium text-slate-700 bg-white border border-slate-200 px-2 py-0.5 rounded-md tabular-nums">
                      {Math.max(
                        0,
                        Math.round(
                          (new Date(editForm.departureDate).getTime() -
                            new Date(editForm.arrivalDate).getTime()) /
                            (1000 * 60 * 60 * 24),
                        ),
                      )}{" "}
                      nuit(s)
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-medium text-slate-600 mb-1">
                      Date d’arrivée (Check-in)
                    </label>
                    <input
                      type="date"
                      value={editForm.arrivalDate}
                      onChange={(e) => setEditForm({ ...editForm, arrivalDate: e.target.value })}
                      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-400 transition"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-slate-600 mb-1">
                      Date de départ (Check-out)
                    </label>
                    <input
                      type="date"
                      value={editForm.departureDate}
                      min={editForm.arrivalDate || undefined}
                      onChange={(e) => setEditForm({ ...editForm, departureDate: e.target.value })}
                      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-400 transition"
                    />
                  </div>
                </div>
                <p className="text-[11px] text-slate-500">
                  La modification des dates est synchronisée pour toute la réservation et s’applique immédiatement à l’hôtel et aux réservations.
                </p>
              </div>

              {/* Statut Artiste */}
              <div className="col-span-2 flex items-center justify-between p-3 rounded-xl border border-slate-200/80 bg-slate-50/70">
                <div className="flex items-center gap-2.5">
                  <Sparkles className="h-4 w-4 text-purple-600 shrink-0" />
                  <div>
                    <p className="text-xs font-semibold text-slate-900">Statut du participant : Artiste</p>
                    <p className="text-[11px] text-slate-500">
                      Comptabilisé dans les statistiques Artistes et synchronisé avec le bracelet Artiste
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setEditForm((prev) => ({ ...prev, isArtist: !prev.isArtist }))}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer ${
                    editForm.isArtist
                      ? "bg-purple-700 text-white shadow-xs"
                      : "bg-white text-slate-700 border border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  {editForm.isArtist ? "✓ Artiste actif" : "Non-artiste"}
                </button>
              </div>

              {/* Tarification & Code Promo */}
              <div className="col-span-2 rounded-xl border border-slate-200/80 bg-slate-50/70 p-3.5 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Tag className="h-3.5 w-3.5 text-slate-600" />
                    <h4 className="text-xs font-semibold text-slate-900">
                      Tarification et code promo
                    </h4>
                  </div>
                  {(editForm.discountCode || Number(editForm.discountAmount) > 0) && (
                    <button
                      type="button"
                      onClick={() =>
                        setEditForm((prev) => ({
                          ...prev,
                          discountCode: "",
                          discountAmount: 0,
                        }))
                      }
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium text-rose-700 bg-rose-50 border border-rose-200 hover:bg-rose-100 transition cursor-pointer"
                    >
                      <Trash2 className="h-3 w-3" /> Supprimer la promo
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-medium text-slate-700 mb-1">
                      Prix du forfait par personne
                    </label>
                    <div className="flex gap-1.5">
                      <input
                        type="number"
                        min="0"
                        step="any"
                        value={editForm.unitPrice}
                        onChange={(e) =>
                          setEditForm({ ...editForm, unitPrice: e.target.value })
                        }
                        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-900 focus:outline-none focus:border-slate-400 tabular-nums"
                        placeholder="Ex: 180"
                      />
                      <select
                        value={editForm.priceCurrency}
                        onChange={(e) =>
                          setEditForm({
                            ...editForm,
                            priceCurrency: e.target.value as "EUR" | "MAD",
                          })
                        }
                        className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs font-medium text-slate-800 focus:outline-none focus:border-slate-400 cursor-pointer"
                      >
                        <option value="EUR">€</option>
                        <option value="MAD">MAD</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-slate-700 mb-1">
                      Montant de la réduction ({editForm.priceCurrency})
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="any"
                      value={editForm.discountAmount}
                      onChange={(e) =>
                        setEditForm({ ...editForm, discountAmount: e.target.value })
                      }
                      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-900 focus:outline-none focus:border-slate-400 tabular-nums"
                      placeholder="Ex: 50"
                    />
                  </div>
                </div>

                {editForm.discountCode && (
                  <p className="text-[11px] text-slate-700 font-mono">
                    Code promo actuel : <strong>{editForm.discountCode}</strong> (-{editForm.discountAmount} {editForm.priceCurrency})
                  </p>
                )}
                <p className="text-[10px] text-slate-500">
                  Modifie le prix unitaire et la promo appliqués à la réservation ({editingClient.ticketCode}).
                </p>
              </div>

              <div className="col-span-2">
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Parrainage / source de la réservation
                </label>
                <select
                  value={editForm.referral}
                  onChange={(e) => setEditForm({ ...editForm, referral: e.target.value })}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-slate-400 transition cursor-pointer"
                >
                  <option value="website">Site web (sans parrainage)</option>
                  <option value="manual">Réservation manuelle (sans parrainage)</option>
                  <optgroup label="Attribuer à un collaborateur">
                    {collaborators
                      .slice()
                      .sort((a, b) => a.name.localeCompare(b.name))
                      .map((c) => (
                        <option key={c.id} value={`collab:${c.id}`}>
                          {c.name} ({c.code}){c.active ? "" : " — inactif"}
                        </option>
                      ))}
                  </optgroup>
                </select>
                <p className="text-[11px] text-slate-500 mt-1">
                  S’applique à toute la réservation ({editingClient.ticketCode}) : la commission
                  passe au collaborateur choisi.
                  {editingClient.collaboratorName
                    ? ` Actuellement : ${editingClient.collaboratorName}.`
                    : " Actuellement : aucun parrainage."}
                </p>
              </div>

              <div className="col-span-2">
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Notes / commentaires
                </label>
                <textarea
                  rows={2}
                  value={editForm.notes}
                  onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-slate-400 transition"
                  placeholder="Notes supplémentaires concernant ce client…"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 border-t border-slate-100 pt-3">
              <button
                type="button"
                onClick={() => setEditingClient(null)}
                className="px-3.5 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-medium text-slate-700 hover:bg-slate-50 transition cursor-pointer"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleSaveClient}
                className="px-4 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium transition cursor-pointer shadow-xs flex items-center gap-1.5"
              >
                <Check className="h-3.5 w-3.5" /> Enregistrer les informations
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
