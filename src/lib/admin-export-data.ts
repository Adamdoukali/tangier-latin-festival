import {
  bookingPeopleCount,
  commissionLabel,
  getClients,
  getTourismPrice,
  isTransferBooking,
  isTourismBooking,
  moneyIn,
  packPrice,
  packRoomCategory,
  partnerCurrency,
  perPersonRate,
  type Booking,
  type Collaborator,
  type CollaboratorStats,
  type CommissionCurrency,
  type Pack,
  type PackRoomCategory,
} from "./admin-store";
import type { SpreadsheetCell } from "./spreadsheet-export";

export type SpreadsheetRows = SpreadsheetCell[][];

export const HOTEL_EXPORT_HEADER: SpreadsheetCell[] = [
  "Id chambre / Promoteur",
  "N° chambre",
  "Prénom",
  "Nom",
  "Origine / Pays",
  "Date d'entrée",
  "Date de sortie",
  "Nombre de nuits",
  "Type de chambre",
  "Catégorie de chambre",
  "Montant",
  "Commission",
  "Paiement",
  "Reste à payer",
  "Total a verser au Festival",
  "Commentaire",
];

export const TRANSFER_EXPORT_HEADER: SpreadsheetCell[] = [
  "Prénom",
  "Nom",
  "Origine / Pays",
  "collaborateur",
  "Lieu du transfert",
  "Aeroport de départ",
  "Date et heure d'arrivée",
  "compagnie d'arrivée",
  "Date et heure de départ",
  "Formule de trajet",
  "Montant à payer au Festival",
];

export const EXCURSION_EXPORT_HEADER: SpreadsheetCell[] = [
  "Prénom",
  "Nom",
  "Origine / Pays",
  "collaborateur",
  "Nombre d'excursions",
  "Type d'excursion",
  "Montant",
  "comissions",
  "Montant à payer au Festival",
];

export const COLLABORATOR_SUMMARY_HEADER: SpreadsheetCell[] = [
  "Collaborateurs",
  "Code",
  "chambre single",
  "chambre double",
  "Full Pass",
  "Excursions",
  "Transferts",
  "Total participants",
  "Total ventes",
  "Total Commissions",
  "Total a verser au Festival",
  "Commission Deal",
  "Mission",
  "Mission Reward",
  "Active",
];

export const COLLABORATOR_DETAILS_HEADER: SpreadsheetCell[] = [
  "Id Pack / Promoteur",
  "Prénom",
  "Nom",
  "Origine / Pays",
  "Date d'entrée",
  "Date de sortie",
  "Type de Pack",
  "N° chambre",
  "Nombre de nuitées",
  "Catégorie chambre",
  "Type de chambre",
  "Total du Pack",
  "Commission /Pack",
  "Total des excursions",
  "Commission/ excursion",
  "Total des Transferts",
  "Montant à payer au Festival",
];

const roundMoney = (value: number): number => Math.round(value * 100) / 100;

const normalizedName = (value: string): string =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

const guestKey = (collaboratorId: string | null | undefined, fullName: string): string =>
  `${collaboratorId || "direct"}|${normalizedName(fullName)}`;

export const formatSpreadsheetOrigin = (country: string, isMoroccan?: boolean): string => {
  const moroccan = isMoroccan ?? /morocco|maroc/i.test(country);
  return moroccan ? "Maroc 🇲🇦" : `${country || "Étranger"} 🌐`;
};

export const formatSpreadsheetDate = (date?: string | null): string => {
  if (!date) return "";
  const match = date.match(/^(\d{4})-(\d{2})-(\d{2})/);
  return match ? `${match[3]}/${match[2]}/${match[1]}` : date;
};

const formatSpreadsheetTime = (time?: string | null): string => {
  if (!time) return "";
  const match = time.match(/(\d{1,2})[:h](\d{2})/i);
  return match ? `${match[1].padStart(2, "0")}h${match[2]}` : time.trim();
};

const formatSpreadsheetDateTime = (date?: string | null, time?: string | null): string => {
  const formattedDate = formatSpreadsheetDate(date);
  const formattedTime = formatSpreadsheetTime(time);
  return [formattedDate, formattedTime].filter(Boolean).join(" à ");
};

export const transferDetail = (details: string | null | undefined, label: string): string => {
  if (!details) return "";
  const wanted = label.trim().toLowerCase();
  const part = details
    .split(/\s*\|\s*|\r?\n/)
    .find((item) => item.trim().toLowerCase().startsWith(`${wanted}:`));
  return part ? part.slice(part.indexOf(":") + 1).trim() : "";
};

const transferFormula = (booking: Booking): string => {
  if (booking.transferOption === "one_way_arrival") return "Aller simple";
  if (booking.transferOption === "one_way_departure") return "Retour simple";
  return "Aller / retour";
};

const guestsForBooking = (booking: Booking, packs: Pack[], collaborators: Collaborator[]) =>
  getClients([booking], packs, collaborators);

const selectedTransferGuests = (booking: Booking, packs: Pack[], collaborators: Collaborator[]) => {
  const guests = guestsForBooking(booking, packs, collaborators);
  const selected = transferDetail(booking.transferDetails, "Transfer Passengers");
  if (!selected) return guests;

  const selectedNames = selected
    .split(/\s*&\s*|\s*,\s*/)
    .map(normalizedName)
    .filter(Boolean);
  const filtered = guests.filter((guest) => selectedNames.includes(normalizedName(guest.fullName)));
  return filtered.length ? filtered : guests;
};

export function buildTransferSpreadsheet(
  bookings: Booking[],
  packs: Pack[],
  collaborators: Collaborator[],
): SpreadsheetRows {
  const rows: SpreadsheetRows = [];
  for (const booking of bookings.filter((item) => item.status !== "declined")) {
    const guests = selectedTransferGuests(booking, packs, collaborators);
    const collaborator = collaborators.find((item) => item.id === booking.collaboratorId);
    const perGuestCost = guests.length
      ? roundMoney((booking.transferCost ?? 0) / guests.length)
      : (booking.transferCost ?? 0);
    const arrivalTime =
      booking.arrivalTime || transferDetail(booking.transferDetails, "Arrival Time");
    const departureTime =
      booking.departureTime || transferDetail(booking.transferDetails, "Departure Time");
    const company = booking.company || transferDetail(booking.transferDetails, "Company") || "";
    const departureAirport =
      booking.departureAirport ||
      transferDetail(booking.transferDetails, "Departure Airport") ||
      transferDetail(booking.transferDetails, "Departure Port") ||
      transferDetail(booking.transferDetails, "Origin") ||
      "";

    for (const guest of guests) {
      rows.push([
        guest.firstName,
        guest.lastName.toUpperCase(),
        formatSpreadsheetOrigin(guest.country, guest.origin === "morocco"),
        collaborator?.name || "Direct",
        booking.transferLocation || "",
        departureAirport,
        formatSpreadsheetDateTime(booking.arrivalDate, arrivalTime),
        company,
        formatSpreadsheetDateTime(booking.departureDate, departureTime),
        transferFormula(booking),
        perGuestCost,
      ]);
    }
  }
  return [TRANSFER_EXPORT_HEADER, ...rows];
}

const excursionName = (booking: Booking): string => {
  const value = `${booking.packId} ${booking.packName}`.toLowerCase();
  if (/chefchaouen|chaouen|chawan/.test(value)) return "Chefchaouen";
  if (/asilah|asella/.test(value)) return "Asilah";
  return "Tanger";
};

interface ExcursionLine {
  firstName: string;
  lastName: string;
  origin: string;
  collaborator: string;
  excursions: string[];
  total: number;
  commission: number;
}

export function buildExcursionSpreadsheet(
  bookings: Booking[],
  packs: Pack[],
  collaborators: Collaborator[],
): SpreadsheetRows {
  const grouped = new Map<string, ExcursionLine>();

  for (const booking of bookings.filter(
    (item) => item.status !== "declined" && isTourismBooking(item),
  )) {
    const guests = guestsForBooking(booking, packs, collaborators);
    const collaborator = collaborators.find((item) => item.id === booking.collaboratorId);
    const namesInBooking = new Map<string, number>();
    for (const guest of guests) {
      const name = normalizedName(guest.fullName);
      namesInBooking.set(name, (namesInBooking.get(name) ?? 0) + 1);
    }

    guests.forEach((guest, guestIndex) => {
      const normalized = normalizedName(guest.fullName);
      const key =
        (namesInBooking.get(normalized) ?? 0) > 1
          ? `${booking.id}|${guestIndex}`
          : guestKey(booking.collaboratorId, guest.fullName);
      const line = grouped.get(key) ?? {
        firstName: guest.firstName,
        lastName: guest.lastName.toUpperCase(),
        origin: formatSpreadsheetOrigin(guest.country, guest.origin === "morocco"),
        collaborator: collaborator?.name || "Direct",
        excursions: [],
        total: 0,
        commission: 0,
      };
      line.excursions.push(excursionName(booking));
      line.total += getTourismPrice(booking.packId || booking.packName);
      line.commission += collaborator ? 5 : 0;
      grouped.set(key, line);
    });
  }

  const rows = Array.from(grouped.values()).map((line) => [
    line.firstName,
    line.lastName,
    line.origin,
    line.collaborator,
    line.excursions.length,
    line.excursions.join(" et "),
    roundMoney(line.total),
    roundMoney(line.commission),
    roundMoney(line.total - line.commission),
  ]);
  return [EXCURSION_EXPORT_HEADER, ...rows];
}

const categoryOf = (booking: Booking, packs: Pack[]): PackRoomCategory =>
  packRoomCategory(
    packs.find((pack) => pack.id === booking.packId) || booking.packName,
    booking.numPeople,
  );

export function buildCollaboratorSummarySpreadsheet(
  visibleStats: CollaboratorStats[],
  bookings: Booking[],
  packs: Pack[],
): SpreadsheetRows {
  const rows = visibleStats.map(({ collaborator, revenue, commission }) => {
    const mine = bookings.filter(
      (booking) => booking.collaboratorId === collaborator.id && booking.status !== "declined",
    );
    const festival = mine.filter(
      (booking) => !isTourismBooking(booking) && !isTransferBooking(booking),
    );
    const excursions = mine
      .filter(isTourismBooking)
      .reduce((sum, booking) => sum + (booking.numPeople || 1), 0);
    const participants = festival.reduce(
      (sum, booking) => sum + bookingPeopleCount(booking, packs),
      0,
    );
    const currency = partnerCurrency(collaborator);
    const sales = moneyIn(revenue, currency);
    const earned = moneyIn(commission, currency);
    const missionAchieved = !!collaborator.missionGoal && participants >= collaborator.missionGoal;
    const reward = missionAchieved
      ? moneyIn(
          collaborator.missionCurrency === "MAD"
            ? { eur: 0, mad: collaborator.missionReward ?? 0 }
            : { eur: collaborator.missionReward ?? 0, mad: 0 },
          currency,
        )
      : 0;

    return [
      collaborator.name,
      collaborator.code,
      festival.filter((booking) => categoryOf(booking, packs) === "single").length,
      festival.filter((booking) => categoryOf(booking, packs) === "double").length,
      festival.filter((booking) => categoryOf(booking, packs) === "fullpass").length,
      excursions,
      0,
      participants,
      roundMoney(sales),
      roundMoney(earned),
      roundMoney(sales - earned - reward),
      commissionLabel(collaborator),
      collaborator.missionGoal
        ? `${Math.min(participants, collaborator.missionGoal)}/${collaborator.missionGoal}`
        : "",
      roundMoney(reward),
      collaborator.active ? "yes" : "no",
    ];
  });

  const total = Array.from(
    { length: COLLABORATOR_SUMMARY_HEADER.length },
    () => "",
  ) as SpreadsheetCell[];
  total[0] = "TOTAL";
  for (let column = 2; column <= 10; column++) {
    total[column] = roundMoney(
      rows.reduce((sum, row) => sum + (typeof row[column] === "number" ? row[column] : 0), 0),
    );
  }
  total[13] = roundMoney(
    rows.reduce((sum, row) => sum + (typeof row[13] === "number" ? row[13] : 0), 0),
  );

  return [COLLABORATOR_SUMMARY_HEADER, ...rows, total];
}

interface AddOnTotals {
  excursions: number;
  excursionCommission: number;
}

const convertedAmount = (
  value: number,
  from: CommissionCurrency,
  collaborator: Collaborator,
): number =>
  moneyIn(
    from === "MAD" ? { eur: 0, mad: value } : { eur: value, mad: 0 },
    partnerCurrency(collaborator),
  );

const collaboratorAddOns = (
  bookings: Booking[],
  packs: Pack[],
  collaborators: Collaborator[],
): Map<string, AddOnTotals> => {
  const totals = new Map<string, AddOnTotals>();
  const add = (key: string, values: Partial<AddOnTotals>) => {
    const current = totals.get(key) ?? {
      excursions: 0,
      excursionCommission: 0,
    };
    totals.set(key, {
      excursions: current.excursions + (values.excursions ?? 0),
      excursionCommission: current.excursionCommission + (values.excursionCommission ?? 0),
    });
  };

  for (const booking of bookings.filter((item) => item.status !== "declined")) {
    const collaborator = collaborators.find((item) => item.id === booking.collaboratorId);
    if (!collaborator) continue;

    if (isTourismBooking(booking)) {
      for (const guest of guestsForBooking(booking, packs, collaborators)) {
        add(guestKey(collaborator.id, guest.fullName), {
          excursions: convertedAmount(
            getTourismPrice(booking.packId || booking.packName),
            "EUR",
            collaborator,
          ),
          excursionCommission: convertedAmount(5, "EUR", collaborator),
        });
      }
    }
  }
  return totals;
};

const nightsBetween = (arrival?: string | null, departure?: string | null): number | "" => {
  if (!arrival || !departure) return "";
  const start = Date.parse(`${arrival.slice(0, 10)}T00:00:00Z`);
  const end = Date.parse(`${departure.slice(0, 10)}T00:00:00Z`);
  const nights = Math.round((end - start) / 86400000);
  return nights > 0 ? nights : "";
};

const categoryLabel = (category: PackRoomCategory): string => {
  if (category === "double") return "Double";
  if (category === "single") return "Single";
  if (category === "special") return "Spéciale";
  return "";
};

export function buildCollaboratorDetailsSpreadsheet(
  collaborators: Collaborator[],
  bookings: Booking[],
  packs: Pack[],
): SpreadsheetRows {
  const addOns = collaboratorAddOns(bookings, packs, collaborators);
  const claimedAddOns = new Set<string>();
  const roomCounts = new Map<string, number>();
  const missionRemaining = new Map(
    collaborators.map((collaborator) => [collaborator.id, collaborator.missionGoal ?? 0]),
  );
  const rows: SpreadsheetRows = [];

  const festivalBookings = bookings
    .filter(
      (booking) =>
        booking.status !== "declined" &&
        !!booking.collaboratorId &&
        !isTourismBooking(booking) &&
        !isTransferBooking(booking),
    )
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

  for (const booking of festivalBookings) {
    const collaborator = collaborators.find((item) => item.id === booking.collaboratorId);
    if (!collaborator) continue;
    const pack = packs.find((item) => item.id === booking.packId);
    const category = categoryOf(booking, packs);
    const guests = guestsForBooking(booking, packs, collaborators);
    const roomNumber = category === "fullpass" ? 0 : (roomCounts.get(collaborator.id) ?? 0) + 1;
    if (roomNumber) roomCounts.set(collaborator.id, roomNumber);
    const packId =
      category === "fullpass"
        ? `Full Pass / ${collaborator.name}`
        : `Chambre ${roomNumber} / ${collaborator.name}`;
    const nativePack = packPrice(pack);
    const discountPerGuest = (booking.discountAmount ?? 0) / Math.max(1, guests.length);
    const nativeNetPack = Math.max(0, nativePack.amount - discountPerGuest);
    const packTotal = convertedAmount(nativeNetPack, nativePack.currency, collaborator);

    for (const guest of guests) {
      const remaining = missionRemaining.get(collaborator.id) ?? 0;
      const missionConsumesGuest = remaining > 0;
      if (missionConsumesGuest) missionRemaining.set(collaborator.id, remaining - 1);
      const packCommission =
        booking.source === "invite" || missionConsumesGuest
          ? 0
          : (collaborator.commissionType ?? "percent") === "per_person"
            ? perPersonRate(collaborator, category)
            : roundMoney(packTotal * ((collaborator.commission ?? 0) / 100));
      const key = guestKey(collaborator.id, guest.fullName);
      const addOn = claimedAddOns.has(key)
        ? { excursions: 0, excursionCommission: 0 }
        : (addOns.get(key) ?? { excursions: 0, excursionCommission: 0 });
      claimedAddOns.add(key);
      const due = packTotal - packCommission + addOn.excursions - addOn.excursionCommission;

      rows.push([
        packId,
        guest.firstName,
        guest.lastName.toUpperCase(),
        formatSpreadsheetOrigin(guest.country, guest.origin === "morocco"),
        formatSpreadsheetDate(booking.arrivalDate),
        formatSpreadsheetDate(booking.departureDate),
        category === "fullpass" ? booking.packName || "Full Pass" : "Hotel",
        booking.roomNumber || "",
        category === "fullpass" ? "" : nightsBetween(booking.arrivalDate, booking.departureDate),
        categoryLabel(category),
        category === "fullpass" ? "" : booking.roomType || "",
        roundMoney(packTotal),
        roundMoney(packCommission),
        addOn.excursions ? roundMoney(addOn.excursions) : "",
        addOn.excursionCommission ? roundMoney(addOn.excursionCommission) : "",
        "",
        roundMoney(due),
      ]);
    }
  }

  return [COLLABORATOR_DETAILS_HEADER, ...rows];
}
