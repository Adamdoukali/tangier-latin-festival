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
} from "lucide-react";
import {
  getBookings,
  getPacks,
  getCollaborators,
  guestDetailsColumnReady,
  updateBooking,
  getClients,
  parseGuestDetails,
  type Booking,
  type Pack,
  type Collaborator,
  type ClientGuest,
  type GuestDetail,
} from "@/lib/admin-store";
import { translateDynamicText } from "@/lib/translations";
import { downloadXlsx } from "@/lib/spreadsheet-export";

export const Route = createFileRoute("/admin/clients")({
  component: AdminClients,
});

function AdminClients() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [packs, setPacks] = useState<Pack[]>([]);
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [guestDetailsReady, setGuestDetailsReady] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [originFilter, setOriginFilter] = useState<"all" | "morocco" | "international">("all");
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
  }>({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    origin: "morocco",
    country: "Maroc",
    notes: "",
  });

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
  const missingContactCount = allClients.filter((c) => !c.email.trim() || !c.phone.trim()).length;

  // Filtered Clients
  const filteredClients = allClients.filter((c) => {
    if (originFilter === "morocco" && c.origin !== "morocco") return false;
    if (originFilter === "international" && c.origin !== "international") return false;
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

  const openEditModal = (client: ClientGuest) => {
    setEditingClient(client);
    setEditForm({
      firstName: client.firstName,
      lastName: client.lastName,
      email: client.email,
      phone: client.phone,
      origin: client.origin,
      country: client.country,
      notes: client.notes ?? "",
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
    const saved = await updateBooking(targetBooking.id, {
      guestDetails: JSON.stringify(updatedDetails),
      customerName: synchronizedNames.join(" & ") || targetBooking.customerName,
      email: primary.email ?? targetBooking.email,
      phone: primary.phone ?? targetBooking.phone,
      country: primary.country ?? targetBooking.country,
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
    };

    try {
      await saveSynchronizedGuestDetails(targetBooking, updatedDetails);
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
          <h2 className="font-display text-2xl tracking-wide text-gray-900">
            Base de données clients
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            Base complète de chaque client et participant, avec ses coordonnées, sa chambre et sa
            nationalité.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
          <button
            onClick={() => downloadClientsXlsx("morocco")}
            disabled={moroccanCount === 0}
            className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-600 bg-emerald-600 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-700 transition cursor-pointer disabled:opacity-40"
          >
            <Download className="h-3.5 w-3.5" /> 🇲🇦 XLSX Maroc ({moroccanCount})
          </button>
          <button
            onClick={() => downloadClientsXlsx("international")}
            disabled={internationalCount === 0}
            className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-600 bg-emerald-600 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-700 transition cursor-pointer disabled:opacity-40"
          >
            <Download className="h-3.5 w-3.5" /> 🌐 XLSX Étranger ({internationalCount})
          </button>
          <button
            onClick={() => downloadClientsXlsx("all")}
            disabled={allClients.length === 0}
            className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-600 bg-emerald-600 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-700 transition cursor-pointer disabled:opacity-40"
          >
            <Download className="h-3.5 w-3.5" /> 📁 XLSX Tous ({allClients.length})
          </button>
        </div>
      </div>

      {/* Database Warning */}
      {!guestDetailsReady && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-5 flex gap-3">
          <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="text-sm text-amber-800">
            <p className="font-semibold text-amber-700">
              Les informations par participant nécessitent une migration de la base de données
            </p>
            <p className="mt-1">
              Les e-mails et téléphones personnalisés par participant ne peuvent pas encore être
              enregistrés dans Supabase. Ouvrez le tableau de bord Supabase → Éditeur SQL et
              exécutez{" "}
              <code className="font-mono bg-amber-100 px-1 rounded">
                supabase/guest-details.sql
              </code>
              , puis actualisez cette page.
            </p>
          </div>
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 flex items-start justify-between gap-3">
          <p className="text-sm text-red-700">{error}</p>
          <button
            onClick={() => setError("")}
            className="text-red-400 hover:text-red-600 transition cursor-pointer shrink-0"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Stats Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm p-4">
          <div className="flex items-center justify-between">
            <p className="text-xs tracking-widest uppercase text-gray-500">Total clients</p>
            <Users className="h-4 w-4 text-slate-600" />
          </div>
          <p className="mt-1 font-display text-2xl text-gray-900">{allClients.length}</p>
        </div>
        <div className="rounded-xl border border-emerald-200 bg-emerald-50/30 shadow-sm p-4">
          <div className="flex items-center justify-between">
            <p className="text-xs tracking-widest uppercase text-emerald-700 font-semibold">
              Morocco 🇲🇦
            </p>
            <UserCheck className="h-4 w-4 text-emerald-600" />
          </div>
          <p className="mt-1 font-display text-2xl text-emerald-900">{moroccanCount}</p>
        </div>
        <div className="rounded-xl border border-blue-200 bg-blue-50/30 shadow-sm p-4">
          <div className="flex items-center justify-between">
            <p className="text-xs tracking-widest uppercase text-blue-700 font-semibold">
              Étranger 🌐
            </p>
            <UserCheck className="h-4 w-4 text-blue-600" />
          </div>
          <p className="mt-1 font-display text-2xl text-blue-900">{internationalCount}</p>
        </div>
        <div className="rounded-xl border border-amber-200 bg-amber-50/30 shadow-sm p-4">
          <div className="flex items-center justify-between">
            <p className="text-xs tracking-widest uppercase text-amber-700 font-semibold">
              Coordonnées manquantes
            </p>
            <Mail className="h-4 w-4 text-amber-600" />
          </div>
          <p className="mt-1 font-display text-2xl text-amber-900">{missingContactCount}</p>
        </div>
      </div>

      {/* Filter Controls */}
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2 border-b border-gray-200 pb-3">
          <span className="text-xs font-semibold uppercase tracking-wider text-gray-500 mr-2">
            Filtrer par origine :
          </span>
          <button
            onClick={() => setOriginFilter("all")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
              originFilter === "all"
                ? "bg-gray-900 text-white shadow-xs"
                : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"
            }`}
          >
            Tous les clients ({allClients.length})
          </button>
          <button
            onClick={() => setOriginFilter("morocco")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer inline-flex items-center gap-1.5 ${
              originFilter === "morocco"
                ? "bg-emerald-600 text-white shadow-xs"
                : "bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100"
            }`}
          >
            <span>🇲🇦</span> Morocco ({moroccanCount})
          </button>
          <button
            onClick={() => setOriginFilter("international")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer inline-flex items-center gap-1.5 ${
              originFilter === "international"
                ? "bg-blue-600 text-white shadow-xs"
                : "bg-blue-50 text-blue-800 border border-blue-200 hover:bg-blue-100"
            }`}
          >
            <span>🌐</span> Étranger ({internationalCount})
          </button>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher par nom, e-mail, téléphone, chambre ou code…"
              className="w-full rounded-lg border border-gray-300 bg-white pl-9 pr-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-amber-500 transition"
            />
          </div>
          <label className="inline-flex items-center gap-2 text-sm text-gray-600 cursor-pointer shrink-0">
            <input
              type="checkbox"
              checked={missingContactOnly}
              onChange={(e) => setMissingContactOnly(e.target.checked)}
              className="accent-amber-500"
            />
            Afficher les clients sans téléphone ou e-mail
          </label>
        </div>
      </div>

      {/* Clients Table */}
      {loading ? (
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm px-5 py-16 text-center text-sm text-gray-400">
          Chargement de la base clients…
        </div>
      ) : filteredClients.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm px-5 py-16 text-center text-sm text-gray-400">
          <Users className="h-8 w-8 mx-auto mb-3 text-gray-300" />
          Aucun client ne correspond aux filtres.
        </div>
      ) : (
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-xs tracking-widest uppercase text-gray-500 bg-slate-50">
                  <th className="px-4 py-3 text-left font-medium">#</th>
                  <th className="px-4 py-3 text-left font-medium">Nom du client</th>
                  <th className="px-4 py-3 text-left font-medium">E-mail</th>
                  <th className="px-4 py-3 text-left font-medium">Téléphone</th>
                  <th className="px-4 py-3 text-left font-medium">Nationalité / origine</th>
                  <th className="px-4 py-3 text-left font-medium">Chambre</th>
                  <th className="px-4 py-3 text-left font-medium">Forfait</th>
                  <th className="px-4 py-3 text-left font-medium">Partenaire</th>
                  <th className="px-4 py-3 text-center font-medium">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredClients.map((client, idx) => (
                  <tr key={client.id} className="hover:bg-slate-50 transition">
                    <td className="px-4 py-3 text-xs text-gray-400">{idx + 1}</td>
                    <td className="px-4 py-3 font-semibold text-gray-900">
                      <div>
                        {client.fullName}
                        {client.guestIndex > 0 && (
                          <span className="ml-1.5 text-[10px] text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded font-normal">
                            Participant {client.guestIndex + 1}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {client.email ? (
                        <span className="text-gray-700 flex items-center gap-1.5">
                          <Mail className="h-3.5 w-3.5 text-gray-400" />
                          {client.email}
                        </span>
                      ) : (
                        <button
                          onClick={() => openEditModal(client)}
                          className="text-xs text-amber-600 hover:text-amber-700 hover:underline font-medium inline-flex items-center gap-1 cursor-pointer"
                        >
                          + Ajouter un e-mail
                        </button>
                      )}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {client.phone ? (
                        <span className="text-gray-700 flex items-center gap-1.5">
                          <Phone className="h-3.5 w-3.5 text-gray-400" />
                          {client.phone}
                        </span>
                      ) : (
                        <button
                          onClick={() => openEditModal(client)}
                          className="text-xs text-amber-600 hover:text-amber-700 hover:underline font-medium inline-flex items-center gap-1 cursor-pointer"
                        >
                          + Ajouter un téléphone
                        </button>
                      )}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <select
                        value={client.origin}
                        onChange={(e) =>
                          handleInlineOriginChange(
                            client,
                            e.target.value as "morocco" | "international",
                          )
                        }
                        className={`rounded-full px-2.5 py-1 text-xs font-semibold border focus:outline-none transition cursor-pointer ${
                          client.origin === "morocco"
                            ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                            : "bg-blue-50 text-blue-800 border-blue-200"
                        }`}
                      >
                        <option value="morocco">🇲🇦 Maroc</option>
                        <option value="international">🌐 Étranger</option>
                      </select>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {client.roomNumber || client.roomType ? (
                        <span
                          className={`font-semibold px-2 py-0.5 rounded border text-xs ${
                            client.roomNumber
                              ? "text-emerald-800 bg-emerald-50 border-emerald-200"
                              : "text-amber-800 bg-amber-50 border-amber-200"
                          }`}
                          title={
                            client.roomNumber
                              ? "Chambre d’hôtel attribuée"
                              : "Type de chambre attribué ; numéro de chambre en attente"
                          }
                        >
                          {client.roomNumber ? `Nº ${client.roomNumber}` : client.roomType}
                          {client.roomNumber && client.roomType ? ` · ${client.roomType}` : ""}
                        </span>
                      ) : (
                        <span className="text-xs text-gray-400">Non attribuée</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-700">
                      <div>{translateDynamicText(client.packName, "fr")}</div>
                      <code className="text-[10px] text-amber-700 bg-amber-50 px-1 py-0.5 rounded font-mono">
                        {client.ticketCode}
                      </code>
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
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in duration-150">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="font-display text-lg font-bold text-gray-900 flex items-center gap-2">
                <Pencil className="h-5 w-5 text-amber-600" /> Modifier les informations du client
              </h3>
              <button
                onClick={() => setEditingClient(null)}
                className="text-gray-400 hover:text-gray-600 transition cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="text-xs text-gray-500 bg-slate-50 p-2.5 rounded-lg flex items-center justify-between">
              <span>
                Code du billet :{" "}
                <code className="font-mono text-amber-800 font-bold">
                  {editingClient.ticketCode}
                </code>
              </span>
              <span>Forfait : {translateDynamicText(editingClient.packName, "fr")}</span>
            </div>

            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Prénom</label>
                <input
                  type="text"
                  value={editForm.firstName}
                  onChange={(e) => setEditForm({ ...editForm, firstName: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:outline-none focus:border-amber-500 transition"
                  placeholder="John"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Nom</label>
                <input
                  type="text"
                  value={editForm.lastName}
                  onChange={(e) => setEditForm({ ...editForm, lastName: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:outline-none focus:border-amber-500 transition"
                  placeholder="Doe"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Adresse e-mail
                </label>
                <input
                  type="email"
                  value={editForm.email}
                  onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:outline-none focus:border-amber-500 transition"
                  placeholder="john.doe@gmail.com"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Numéro de téléphone
                </label>
                <input
                  type="text"
                  value={editForm.phone}
                  onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:outline-none focus:border-amber-500 transition"
                  placeholder="+212 600 000 000"
                />
              </div>

              <div className="col-span-2">
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Nationality / Origin
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
                    className={`px-4 py-2.5 rounded-lg text-sm font-semibold border transition cursor-pointer flex items-center justify-center gap-2 ${
                      editForm.origin === "morocco"
                        ? "bg-emerald-600 text-white border-emerald-600 shadow-sm"
                        : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                    }`}
                  >
                    <span>🇲🇦</span> Maroc
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
                    className={`px-4 py-2.5 rounded-lg text-sm font-semibold border transition cursor-pointer flex items-center justify-center gap-2 ${
                      editForm.origin === "international"
                        ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                        : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                    }`}
                  >
                    <span>🌐</span> Étranger
                  </button>
                </div>
                {editForm.origin === "international" && (
                  <div className="mt-3">
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Country / Nationality
                    </label>
                    <input
                      type="text"
                      value={editForm.country}
                      onChange={(e) =>
                        setEditForm((current) => ({ ...current, country: e.target.value }))
                      }
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:outline-none focus:border-amber-500 transition"
                      placeholder="e.g. Spain, France, United Kingdom"
                    />
                  </div>
                )}
              </div>

              <div className="col-span-2">
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Notes / commentaires
                </label>
                <textarea
                  rows={2}
                  value={editForm.notes}
                  onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:outline-none focus:border-amber-500 transition"
                  placeholder="Notes supplémentaires concernant ce client…"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 border-t border-gray-100 pt-3">
              <button
                type="button"
                onClick={() => setEditingClient(null)}
                className="px-4 py-2 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50 transition cursor-pointer"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleSaveClient}
                className="px-5 py-2 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold transition cursor-pointer shadow-sm flex items-center gap-1.5"
              >
                <Check className="h-4 w-4" /> Enregistrer les informations
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
