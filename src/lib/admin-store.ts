// ─── Admin Data Store ───────────────────────────────────────────────
// localStorage-backed CRUD for packs, bookings, and invite codes.
// Falls back to hardcoded defaults on first load.

// ─── Types ──────────────────────────────────────────────────────────

export interface Pack {
  id: string;
  name: string;
  sub: string;
  price: string;
  currency: string;
  category?: string;
  features: string[];
  popular: boolean;
  active: boolean;
  createdAt: string;
}

export type BookingStatus = "pending" | "confirmed" | "checked-in";

export interface Booking {
  id: string;
  ticketCode: string;
  packId: string;
  packName: string;
  customerName: string;
  email: string;
  phone: string;
  country: string;
  numPeople: number;
  danceLevel: string;
  notes: string;
  status: BookingStatus;
  inviteId?: string;
  inviteCode?: string;
  createdAt: string;
}

export interface Invite {
  id: string;
  code: string;
  packId: string;
  packName: string;
  used: boolean;
  redeemedBy?: string;
  redeemedAt?: string;
  bookingId?: string;
  assignee?: string;
  createdAt: string;
}

// ─── Keys ───────────────────────────────────────────────────────────

const PACKS_KEY = "tlf_admin_packs";
const BOOKINGS_KEY = "tlf_admin_bookings";
const INVITES_KEY = "tlf_admin_invites";
const SEEDED_KEY = "tlf_admin_seeded_v3";

// ─── Helpers ────────────────────────────────────────────────────────

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function generateTicketCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "TLF-";
  for (let i = 0; i < 8; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

function readStore<T>(key: string): T[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function writeStore<T>(key: string, data: T[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(key, JSON.stringify(data));
}

// ─── Default Seed Data ──────────────────────────────────────────────

const DEFAULT_PACKS: Omit<Pack, "id" | "createdAt">[] = [
  {
    name: "Basic Ticket",
    sub: "SOLAZUR HOTEL TANGIER (2 NIGHTS)",
    price: "335",
    currency: "€",
    features: [
      "2 NIGHTS",
      "BREAKFAST",
      "DINNER",
      "FULL PASS",
    ],
    popular: false,
    active: true,
    category: "Hotel Packs (Double)",
  },
  {
    name: "Basic Ticket",
    sub: "SOLAZUR HOTEL TANGIER (3 NIGHTS)",
    price: "385",
    currency: "€",
    features: [
      "3 NIGHTS",
      "BREAKFAST",
      "DINNER",
      "FULL PASS",
    ],
    popular: true,
    active: true,
    category: "Hotel Packs (Double)",
  },
  {
    name: "Basic Ticket",
    sub: "SOLAZUR HOTEL TANGIER (4 NIGHTS)",
    price: "435",
    currency: "€",
    features: [
      "4 NIGHTS",
      "BREAKFAST",
      "DINNER",
      "FULL PASS",
    ],
    popular: false,
    active: true,
    category: "Hotel Packs (Double)",
  },
  {
    name: "Full Pass",
    sub: "WITHOUT ACCOMMODATION",
    price: "130",
    currency: "€",
    features: [
      "ALL WORKSHOPS",
      "SHOWS",
      "SOCIAL PARTIES",
      "POOL PARTIES",
    ],
    popular: false,
    active: true,
    category: "Full Pass",
  },
  {
    name: "Couple Pass",
    sub: "WITHOUT ACCOMMODATION",
    price: "200",
    currency: "€",
    features: [
      "1 LEADER + 1 FOLLOWER",
      "ALL WORKSHOPS",
      "SHOWS & PARTIES",
      "POOL PARTIES",
    ],
    popular: false,
    active: true,
    category: "Full Pass",
  },
  {
    name: "Party Pass",
    sub: "WITHOUT ACCOMMODATION",
    price: "90",
    currency: "€",
    features: [
      "SHOWS",
      "SOCIAL PARTIES",
      "POOL PARTIES",
      "(NO WORKSHOPS)",
    ],
    popular: false,
    active: true,
    category: "Full Pass",
  },
  {
    name: "Day Pass",
    sub: "WITHOUT ACCOMMODATION",
    price: "50",
    currency: "€",
    features: [
      "ALL WORKSHOPS",
      "SHOWS",
      "SOCIAL PARTIES",
      "POOL PARTIES (1 DAY ONLY)",
    ],
    popular: false,
    active: true,
    category: "Full Pass",
  },
];

export function seedIfNeeded(): void {
  if (typeof window === "undefined") return;
  if (localStorage.getItem(SEEDED_KEY)) return;

  const packs: Pack[] = DEFAULT_PACKS.map((p) => ({
    ...p,
    id: generateId(),
    createdAt: new Date().toISOString(),
  }));

  writeStore(PACKS_KEY, packs);
  localStorage.setItem(SEEDED_KEY, "true");
}

// ─── Packs CRUD ─────────────────────────────────────────────────────

export function getPacks(): Pack[] {
  seedIfNeeded();
  return readStore<Pack>(PACKS_KEY);
}

export function getActivePacks(): Pack[] {
  return getPacks().filter((p) => p.active);
}

export function getPackById(id: string): Pack | undefined {
  return getPacks().find((p) => p.id === id);
}

export function addPack(
  pack: Omit<Pack, "id" | "createdAt">
): Pack {
  const packs = getPacks();
  const newPack: Pack = {
    ...pack,
    id: generateId(),
    createdAt: new Date().toISOString(),
  };
  packs.push(newPack);
  writeStore(PACKS_KEY, packs);
  return newPack;
}

export function updatePack(
  id: string,
  updates: Partial<Omit<Pack, "id" | "createdAt">>
): Pack | null {
  const packs = getPacks();
  const idx = packs.findIndex((p) => p.id === id);
  if (idx === -1) return null;
  packs[idx] = { ...packs[idx], ...updates };
  writeStore(PACKS_KEY, packs);
  return packs[idx];
}

export function deletePack(id: string): boolean {
  const packs = getPacks();
  const filtered = packs.filter((p) => p.id !== id);
  if (filtered.length === packs.length) return false;
  writeStore(PACKS_KEY, filtered);
  return true;
}

// ─── Bookings CRUD ──────────────────────────────────────────────────

export function getBookings(): Booking[] {
  return readStore<Booking>(BOOKINGS_KEY);
}

export function getBookingById(id: string): Booking | undefined {
  return getBookings().find((b) => b.id === id);
}

export function addBooking(
  booking: Omit<Booking, "id" | "ticketCode" | "createdAt">
): Booking {
  const bookings = getBookings();
  const newBooking: Booking = {
    ...booking,
    id: generateId(),
    ticketCode: generateTicketCode(),
    createdAt: new Date().toISOString(),
  };
  bookings.push(newBooking);
  writeStore(BOOKINGS_KEY, bookings);
  return newBooking;
}

export function updateBookingStatus(
  id: string,
  status: BookingStatus
): Booking | null {
  const bookings = getBookings();
  const idx = bookings.findIndex((b) => b.id === id);
  if (idx === -1) return null;
  bookings[idx] = { ...bookings[idx], status };
  writeStore(BOOKINGS_KEY, bookings);
  return bookings[idx];
}

export function deleteBooking(id: string): boolean {
  const bookings = getBookings();
  const filtered = bookings.filter((b) => b.id !== id);
  if (filtered.length === bookings.length) return false;
  writeStore(BOOKINGS_KEY, filtered);
  return true;
}

// ─── Invites CRUD ───────────────────────────────────────────────────

export function getInvites(): Invite[] {
  return readStore<Invite>(INVITES_KEY);
}

export function generateInvite(packId: string, packName: string, assignee?: string): Invite {
  const invites = getInvites();
  const invite: Invite = {
    id: generateId(),
    code: generateTicketCode(),
    packId,
    packName,
    used: false,
    assignee: assignee || undefined,
    createdAt: new Date().toISOString(),
  };
  invites.push(invite);
  writeStore(INVITES_KEY, invites);
  return invite;
}

export function generateBulkInvites(
  packId: string,
  packName: string,
  count: number,
  assignee?: string
): Invite[] {
  const invites = getInvites();
  const newInvites: Invite[] = [];
  for (let i = 0; i < count; i++) {
    const invite: Invite = {
      id: generateId(),
      code: generateTicketCode(),
      packId,
      packName,
      used: false,
      assignee: assignee || undefined,
      createdAt: new Date().toISOString(),
    };
    newInvites.push(invite);
    invites.push(invite);
  }
  writeStore(INVITES_KEY, invites);
  return newInvites;
}

export function markInviteUsed(id: string): Invite | null {
  const invites = getInvites();
  const idx = invites.findIndex((i) => i.id === id);
  if (idx === -1) return null;
  invites[idx] = { ...invites[idx], used: true };
  writeStore(INVITES_KEY, invites);
  return invites[idx];
}

export function deleteInvite(id: string): boolean {
  const invites = getInvites();
  const filtered = invites.filter((i) => i.id !== id);
  if (filtered.length === invites.length) return false;
  writeStore(INVITES_KEY, filtered);
  return true;
}

// ─── Invite Lookup & Redeem ─────────────────────────────────────────

export function getInviteByCode(code: string): Invite | undefined {
  return getInvites().find((i) => i.code === code);
}

export interface RedeemData {
  customerName: string;
  email: string;
  phone: string;
  country: string;
  numPeople: number;
  danceLevel: string;
  notes: string;
}

export function redeemInvite(
  inviteCode: string,
  data: RedeemData
): { success: true; booking: Booking } | { success: false; error: string } {
  const invite = getInviteByCode(inviteCode);
  if (!invite) return { success: false, error: "Invite code not found." };
  if (invite.used) return { success: false, error: "This invite has already been used." };

  const pack = getPackById(invite.packId);
  if (!pack) return { success: false, error: "Pack no longer available." };

  // Create booking linked to invite
  const booking = addBooking({
    ...data,
    packId: invite.packId,
    packName: invite.packName,
    status: "confirmed",
    inviteId: invite.id,
    inviteCode: invite.code,
  });

  // Mark invite as used
  const invites = getInvites();
  const idx = invites.findIndex((i) => i.id === invite.id);
  if (idx !== -1) {
    invites[idx] = {
      ...invites[idx],
      used: true,
      redeemedBy: data.customerName,
      redeemedAt: new Date().toISOString(),
      bookingId: booking.id,
    };
    writeStore(INVITES_KEY, invites);
  }

  return { success: true, booking };
}

// ─── Stats Helpers ──────────────────────────────────────────────────

export function getStats() {
  const bookings = getBookings();
  const packs = getPacks();

  const totalBookings = bookings.length;
  const pendingBookings = bookings.filter((b) => b.status === "pending").length;
  const confirmedBookings = bookings.filter((b) => b.status === "confirmed").length;
  const checkedIn = bookings.filter((b) => b.status === "checked-in").length;

  const totalRevenue = bookings.reduce((sum, b) => {
    const pack = packs.find((p) => p.id === b.packId);
    const price = pack ? parseInt(pack.price, 10) : 0;
    return sum + price * b.numPeople;
  }, 0);

  const totalPacks = packs.length;
  const activePacks = packs.filter((p) => p.active).length;

  return {
    totalBookings,
    pendingBookings,
    confirmedBookings,
    checkedIn,
    totalRevenue,
    totalPacks,
    activePacks,
  };
}
