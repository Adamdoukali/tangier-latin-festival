// ─── Admin Data Store ───────────────────────────────────────────────
// Supabase-backed CRUD for packs, bookings, invites and collaborators.
// All functions are async. When Supabase is not configured (no .env keys)
// or a request fails, the store falls back to localStorage so the site
// keeps working offline / in local dev.
//
// DB setup lives in supabase/schema.sql — run it once in the Supabase
// SQL Editor to create the collaborators table + attribution columns.

import { supabase } from "./supabase";

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
  numGuests?: number;
  isPrivate?: boolean;
  /** Display position on the website (lower = earlier); null = unordered */
  sortOrder?: number | null;
  createdAt: string;
}

export type BookingStatus = "pending" | "confirmed" | "checked-in" | "declined";
export type BookingSource = "manual" | "website" | "invite" | "referral";

export type TransferType = "port" | "airport";
export type TransferOption = "one_way_arrival" | "one_way_departure" | "round_trip";

export const SHUTTLE_PRICES = {
  port: {
    one_way_arrival: 5,
    one_way_departure: 5,
    round_trip: 10,
  },
  airport_tangier: {
    one_way_arrival: 10,
    one_way_departure: 10,
    round_trip: 20,
  },
  airport_tetouan: {
    one_way_arrival: 15,
    one_way_departure: 15,
    round_trip: 30,
  },
} as const;

export function calculateTransferCost(
  type: TransferType | null | undefined,
  option: TransferOption | null | undefined,
  numGuests: number = 1,
  location?: string | null | undefined
): number {
  if (!type || !option) return 0;
  const locLower = (location || "").toLowerCase();

  let roundTripPrice = 10;
  if (type === "airport") {
    if (locLower.includes("tetouan") || locLower.includes("tétouan") || locLower.includes("ttu")) {
      roundTripPrice = 30;
    } else {
      roundTripPrice = 20;
    }
  } else {
    // Port of Tangier
    roundTripPrice = 10;
  }

  const unitPrice = option === "round_trip" ? roundTripPrice : roundTripPrice / 2;
  return unitPrice * Math.max(1, numGuests);
}

export function formatTransferOptionLabel(
  option: TransferOption | null | undefined,
  lang: string = "en"
): string {
  if (!option) return "";
  if (option === "one_way_arrival") {
    return lang === "fr"
      ? "Aller simple (Arrivée)"
      : lang === "es"
      ? "Solo ida (Llegada)"
      : "One-Way (Arrival)";
  }
  if (option === "one_way_departure") {
    return lang === "fr"
      ? "Retour simple (Départ)"
      : lang === "es"
      ? "Solo vuelta (Salida)"
      : "One-Way (Return / Departure)";
  }
  return lang === "fr"
    ? "Aller-Retour"
    : lang === "es"
    ? "Ida y vuelta"
    : "Round Trip (Arrival & Return)";
}

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
  /** ISO dates (YYYY-MM-DD) from the booking form; hotel planning */
  arrivalDate?: string | null;
  /** Arrival time (HH:MM) e.g. flight/ferry landing time */
  arrivalTime?: string | null;
  departureDate?: string | null;
  /** Departure time (HH:MM) e.g. flight/ferry departure time */
  departureTime?: string | null;
  /** Company / Organisation name (dance school, agency, etc.) */
  company?: string | null;
  /** Bracelet override — a single category or a JSON array with one
   *  category per guest (e.g. '["artist","hotel"]'); null = automatic */
  bracelet?: string | null;
  /** JSON array of booleans — has each guest received their bracelet? */
  braceletGiven?: string | null;
  /** Real hotel room number assigned at check-in (e.g. "214") */
  roomNumber?: string | null;
  /** Room type (e.g. "Vue sur mer", "Duplexe junior") */
  roomType?: string | null;
  /** JSON array of per-guest overrides [{firstName, lastName, email, phone, origin, notes}] */
  guestDetails?: string | null;
  /** Language the guest booked in ('en' | 'fr' | 'es') */
  lang?: string | null;
  status: BookingStatus;
  source?: BookingSource;
  collaboratorId?: string | null;
  inviteId?: string;
  inviteCode?: string;
  discountCode?: string | null;
  discountAmount?: number | null;
  discountCodeId?: string | null;
  /** Shuttle transfer option */
  needsTransfer?: boolean;
  /** Transfer location type: 'port' | 'airport' */
  transferType?: TransferType | null;
  /** Transfer option: 'one_way_arrival' | 'one_way_departure' | 'round_trip' */
  transferOption?: TransferOption | null;
  /** Transfer specific location name, e.g. 'Tanger Ville Port', 'Tangier Airport (TNG)' */
  transferLocation?: string | null;
  /** Flight or boat number / timing info if provided by client */
  transferDetails?: string | null;
  /** Total cost for the transfer in EUR */
  transferCost?: number | null;
  createdAt: string;
}

export type DiscountType = "fixed" | "percent";
export type DiscountApplyScope = "per_booking" | "per_person" | "fixed_price";

export interface DiscountCode {
  id: string;
  code: string;
  discountAmount: number;
  discountType: DiscountType;
  /** Apply scope: per booking (total), per person (€ off each guest), or fixed price override */
  applyScope?: DiscountApplyScope;
  /** Custom override price when applyScope === 'fixed_price' */
  overridePrice?: number | null;
  /** Specific pack IDs this discount applies to; null or empty array = all packs */
  applicablePackIds?: string[] | null;
  /** Maximum number of guests in a booking that receive the per-person discount (null/0 = all guests) */
  maxGuestsDiscounted?: number | null;
  /** Optional custom collaborator commission (e.g., €10) when used on referral links */
  commissionOverride?: number | null;

  commissionType?: CommissionType;
  maxUses?: number | null;
  usedCount: number;
  active: boolean;
  notes?: string;
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
  collaboratorId?: string | null;
  createdAt: string;
}

export type CommissionType = "percent" | "per_person" | "fixed";
export type CommissionCurrency = "EUR" | "MAD";
export type PartnerLanguage = "en" | "fr" | "es";

export interface Collaborator {
  id: string;
  name: string;
  code: string;
  email?: string;
  phone?: string;
  /** % of sales (percent) or fixed amount per person (per_person) */
  commission?: number;
  commissionType?: CommissionType;
  /** Currency of per-person amounts; % commissions are always in € (sales are in €) */
  commissionCurrency?: CommissionCurrency;
  /** Per-person rates split by what was sold (per_person deals only);
   *  null falls back to `commission` */
  commissionDouble?: number | null;
  commissionSingle?: number | null;
  commissionFullpass?: number | null;
  /** Portal UI language; the partner's guest links open the site in it too */
  language?: PartnerLanguage;
  /** Bonus mission: bring missionGoal people → win missionReward (null/0 goal = none) */
  missionGoal?: number | null;
  missionReward?: number;
  missionCurrency?: CommissionCurrency;
  active: boolean;
  notes?: string;
  /** Partner Portal login */
  username?: string;
  accessCode?: string;
  passwordHash?: string;
  resetToken?: string;
  resetTokenExpires?: string;
  /** Max invites they may generate in the portal; null/undefined = unlimited */
  inviteQuota?: number | null;
  lastSeenAt?: string | null;
  createdAt: string;
}

export async function hashPassword(password: string): Promise<string> {
  const msgBuffer = new TextEncoder().encode(password.trim());
  const hashBuffer = await crypto.subtle.digest("SHA-256", msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

// ─── Partner account creation ──────────────────────────────────────────────
/** Create a new partner (collaborator) with email, name (full brand name) and password.
 *  The account is created with `active: false` and must be activated by an admin.
 */
export async function createPartnerAccount({
  email,
  name,
  password,
}: {
  email: string;
  name: string;
  password: string;
}): Promise<{ success: boolean; collaborator?: Collaborator; error?: string }> {
  try {
    // Hash password
    const passwordHash = await hashPassword(password);
    // Generate a unique partner code
    const code = `P${Date.now().toString(36).toUpperCase()}${Math.random().toString(36).slice(2, 5).toUpperCase()}`;
    const newCollab: Omit<Collaborator, "createdAt"> = {
      id: generateId(),
      name,
      code,
      email: email.trim().toLowerCase(),
      active: false,
      passwordHash,
      // optional fields left undefined
    } as any;
    // Insert into Supabase
    if (useDb() && supabase) {
      const { data, error } = await supabase.from("collaborators").insert(newCollab).single();
      if (!error && data) {
        return { success: true, collaborator: data as Collaborator };
      }
    }
    // fallback to localStorage
    const collabs = JSON.parse(localStorage.getItem(COLLABS_KEY) ?? "[]");
    const fallbackCollab = { ...newCollab, createdAt: new Date().toISOString() } as Collaborator;
    collabs.push(fallbackCollab);
    localStorage.setItem(COLLABS_KEY, JSON.stringify(collabs));
    return { success: true, collaborator: fallbackCollab };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : String(e) };
  }
}



// ─── Keys (localStorage fallback) ───────────────────────────────────

const PACKS_KEY = "tlf_admin_packs";
const BOOKINGS_KEY = "tlf_admin_bookings";
const INVITES_KEY = "tlf_admin_invites";
const COLLABS_KEY = "tlf_admin_collaborators";
const DISCOUNTS_KEY = "tlf_admin_discounts";
const SEEDED_KEY = "tlf_admin_seeded_v4";

// ─── Helpers ────────────────────────────────────────────────────────

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

/** Full display label for a pack — name + distinguishing details
 *  (e.g. "Chambre double (SOLAZUR HOTEL TANGIER (3 NIGHTS))"), so
 *  bookings/invites always say exactly which pack was chosen. */
export function packLabel(
  pack: { name: string; sub?: string } | null | undefined,
  fallback = "Unknown"
): string {
  if (!pack) return fallback;
  return pack.sub ? `${pack.name} — ${pack.sub}` : pack.name;
}

/** Public verification page for a ticket — this is what ticket QRs encode,
 *  so any phone camera opens it and shows valid / pending / already used. */
export function ticketUrl(code: string): string {
  const base = typeof window !== "undefined" ? window.location.origin : "";
  return `${base}/ticket?code=${code}`;
}

/** The partner's shareable booking link. On the live site it's the short
 *  subdomain form (tickets.tangierlatinfestival.com/CODE → /book?ref=CODE
 *  via a host redirect); locally it falls back to the direct path. The
 *  /book page applies the partner's language automatically. */
export function partnerShareLink(code: string, lang?: string): string {
  const host = typeof window !== "undefined" ? window.location.host : "";
  if (host.endsWith("tangierlatinfestival.com")) {
    return `https://tickets.tangierlatinfestival.com/${code}`;
  }
  const base = typeof window !== "undefined" ? window.location.origin : "";
  return `${base}/book?ref=${code}${lang ? `&lang=${lang}` : ""}`;
}

/** The partner's shareable Tourism booking link (/book-tourism?ref=CODE). */
export function partnerTourismShareLink(code: string, lang?: string): string {
  const host = typeof window !== "undefined" ? window.location.host : "";
  if (host.endsWith("tangierlatinfestival.com")) {
    return `https://www.tangierlatinfestival.com/book-tourism?ref=${code}${lang ? `&lang=${lang}` : ""}`;
  }
  const base = typeof window !== "undefined" ? window.location.origin : "";
  return `${base}/book-tourism?ref=${code}${lang ? `&lang=${lang}` : ""}`;
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

// When the database rejects writes (RLS policies not set up yet — see
// supabase/schema.sql), flip to localStorage for the whole browser session
// so reads and writes stay consistent instead of writing locally while
// listing from an empty database. Kept in sessionStorage so it survives
// page reloads but re-checks on the next visit (e.g. after fixing RLS).
const DB_BLOCKED_KEY = "tlf_db_write_blocked";

function isDbBlocked(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return sessionStorage.getItem(DB_BLOCKED_KEY) === "true";
  } catch {
    return false;
  }
}

function setDbBlocked(): void {
  try {
    sessionStorage.setItem(DB_BLOCKED_KEY, "true");
  } catch {
    /* ignore */
  }
}

const useDb = () => supabase !== null && typeof window !== "undefined" && !isDbBlocked();

/* eslint-disable @typescript-eslint/no-explicit-any */
function warn(op: string, error: unknown) {
  const msg = String((error as any)?.message ?? error ?? "");
  const code = String((error as any)?.code ?? "");
  if (code === "42501" || /row-level security|permission denied/i.test(msg)) {
    setDbBlocked();
    console.warn(
      `[admin-store] Database writes are blocked by row-level security — ` +
        `run supabase/schema.sql in the Supabase SQL Editor to fix. ` +
        `Falling back to localStorage for this session.`
    );
  }
  console.warn(`[admin-store] ${op} failed, using local fallback:`, error);
}
/* eslint-enable @typescript-eslint/no-explicit-any */

/** True when database writes were rejected this session (RLS not set up). */
export function isDbWriteBlocked(): boolean {
  return isDbBlocked();
}

// ─── Row mappers (DB uses snake_case) ───────────────────────────────

/* eslint-disable @typescript-eslint/no-explicit-any */
const packFromRow = (r: any): Pack => ({
  id: r.id,
  name: r.name,
  sub: r.sub ?? "",
  price: String(r.price ?? ""),
  currency: r.currency ?? "€",
  category: r.category ?? undefined,
  features: Array.isArray(r.features) ? r.features : [],
  popular: !!r.popular,
  active: !!r.active,
  numGuests:
    typeof r.num_guests === "number" && r.num_guests > 1
      ? r.num_guests
      : /double|doble|couple/i.test(`${r.name} ${r.sub} ${r.category}`)
        ? 2
        : (r.num_guests ?? 1),
  isPrivate: !!r.is_private,
  sortOrder: r.sort_order ?? null,
  createdAt: r.created_at,
});

// Sort by explicit admin order first, then by creation date.
const sortPacks = (packs: Pack[]): Pack[] =>
  [...packs].sort((a, b) => {
    const ao = a.sortOrder ?? Number.MAX_SAFE_INTEGER;
    const bo = b.sortOrder ?? Number.MAX_SAFE_INTEGER;
    if (ao !== bo) return ao - bo;
    return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
  });

const packToRow = (p: Partial<Omit<Pack, "id" | "createdAt">>) => {
  const row: Record<string, unknown> = {};
  if (p.name !== undefined) row.name = p.name;
  if (p.sub !== undefined) row.sub = p.sub;
  if (p.price !== undefined) row.price = p.price;
  if (p.currency !== undefined) row.currency = p.currency;
  if (p.category !== undefined) row.category = p.category;
  if (p.features !== undefined) row.features = p.features;
  if (p.popular !== undefined) row.popular = p.popular;
  if (p.active !== undefined) row.active = p.active;
  if (p.numGuests !== undefined) row.num_guests = p.numGuests;
  if (p.isPrivate !== undefined) row.is_private = p.isPrivate;
  if (p.sortOrder !== undefined) row.sort_order = p.sortOrder;
  return row;
};

export function getTourIdFromName(packName?: string | null): string | null {
  if (!packName) return null;
  const s = packName.toLowerCase();
  if (s.includes("chefchaouen") || s.includes("chawan") || s.includes("chaouen")) return "tour-chefchaouen";
  if (s.includes("asilah") || s.includes("asella")) return "tour-asilah";
  if (s.includes("tangier") && !s.includes("solazur") && !s.includes("hotel") && !s.includes("room")) return "tour-tangier";
  if (s.includes("tourism") || s.includes("excursion")) return "tour-tangier";
  return null;
}

export const isValidUuid = (val: unknown): boolean =>
  typeof val === "string" &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val);

const bookingFromRow = (r: any): Booking => ({
  id: r.id,
  ticketCode: r.ticket_code,
  packId: r.pack_id ?? getTourIdFromName(r.pack_name) ?? "",
  packName: r.pack_name ?? "",
  customerName: r.customer_name ?? "",
  email: r.email ?? "",
  phone: r.phone ?? "",
  country: r.country ?? "",
  numPeople: r.num_people ?? 1,
  danceLevel: r.dance_level ?? "",
  notes: r.notes ?? "",
  arrivalDate: r.arrival_date ?? null,
  departureDate: r.departure_date ?? null,
  bracelet: r.bracelet ?? null,
  braceletGiven: r.bracelet_given ?? null,
  roomNumber: r.room_number ?? null,
  roomType: r.room_type ?? null,
  guestDetails: typeof r.guest_details === "string" ? r.guest_details : r.guest_details ? JSON.stringify(r.guest_details) : null,
  lang: r.lang ?? null,
  status: (r.status as BookingStatus) ?? "pending",
  source: (r.source as BookingSource) ?? undefined,
  collaboratorId: r.collaborator_id ?? null,
  inviteId: r.invite_id ?? undefined,
  inviteCode: r.invite_code ?? undefined,
  discountCode: r.discount_code ?? null,
  discountAmount: r.discount_amount != null ? Number(r.discount_amount) : 0,
  discountCodeId: r.discount_code_id ?? null,
  needsTransfer: !!r.needs_transfer,
  transferType: (r.transfer_type as TransferType) ?? null,
  transferOption: (r.transfer_option as TransferOption) ?? null,
  transferLocation: r.transfer_location ?? null,
  transferDetails: r.transfer_details ?? null,
  transferCost: r.transfer_cost != null ? Number(r.transfer_cost) : 0,
  createdAt: r.created_at,
});

const discountFromRow = (r: any): DiscountCode => ({
  id: r.id,
  code: r.code,
  discountAmount: Number(r.discount_amount) || 0,
  discountType: (r.discount_type as DiscountType) || "fixed",
  applyScope: (r.apply_scope as DiscountApplyScope) || "per_booking",
  overridePrice: r.override_price != null ? Number(r.override_price) : null,
  applicablePackIds: Array.isArray(r.applicable_pack_ids)
    ? r.applicable_pack_ids
    : r.applicable_pack_ids
    ? JSON.parse(r.applicable_pack_ids)
    : null,
  maxGuestsDiscounted: r.max_guests_discounted != null ? Number(r.max_guests_discounted) : null,
  commissionOverride: r.commission_override != null ? Number(r.commission_override) : null,
  commissionType: (r.commission_type as CommissionType) || "fixed",
  maxUses: r.max_uses != null ? Number(r.max_uses) : null,
  usedCount: Number(r.used_count) || 0,
  active: !!r.active,
  notes: r.notes ?? "",
  createdAt: r.created_at || new Date().toISOString(),
});

const discountToRow = (d: Partial<DiscountCode>): Record<string, any> => {
  const row: Record<string, any> = {};
  if (d.code !== undefined) row.code = d.code.trim().toUpperCase();
  if (d.discountAmount !== undefined) row.discount_amount = d.discountAmount;
  if (d.discountType !== undefined) row.discount_type = d.discountType;
  if (d.applyScope !== undefined) row.apply_scope = d.applyScope;
  if (d.overridePrice !== undefined) row.override_price = d.overridePrice;
  if (d.applicablePackIds !== undefined) row.applicable_pack_ids = d.applicablePackIds;
  if (d.maxGuestsDiscounted !== undefined) row.max_guests_discounted = d.maxGuestsDiscounted;
  if (d.commissionOverride !== undefined) row.commission_override = d.commissionOverride;
  if (d.commissionType !== undefined) row.commission_type = d.commissionType;
  if (d.maxUses !== undefined) row.max_uses = d.maxUses;
  if (d.usedCount !== undefined) row.used_count = d.usedCount;
  if (d.active !== undefined) row.active = d.active;
  if (d.notes !== undefined) row.notes = d.notes;
  return row;
};



const inviteFromRow = (r: any): Invite => ({
  id: r.id,
  code: r.code,
  packId: r.pack_id ?? "",
  packName: r.pack_name ?? "",
  used: !!r.used,
  redeemedBy: r.redeemed_by ?? undefined,
  redeemedAt: r.redeemed_at ?? undefined,
  bookingId: r.booking_id ?? undefined,
  assignee: r.assignee ?? undefined,
  collaboratorId: r.collaborator_id ?? null,
  createdAt: r.created_at,
});

const collabFromRow = (r: any): Collaborator => ({
  id: r.id,
  name: r.name,
  code: r.code,
  email: r.email ?? undefined,
  phone: r.phone ?? undefined,
  commission: r.commission != null ? Number(r.commission) : 0,
  commissionType: (r.commission_type as CommissionType) ?? "percent",
  commissionCurrency: (r.commission_currency as CommissionCurrency) ?? "EUR",
  commissionDouble: r.commission_double != null ? Number(r.commission_double) : null,
  commissionSingle: r.commission_single != null ? Number(r.commission_single) : null,
  commissionFullpass: r.commission_fullpass != null ? Number(r.commission_fullpass) : null,
  language: (r.language as PartnerLanguage) ?? "en",
  missionGoal: r.mission_goal ?? null,
  missionReward: r.mission_reward != null ? Number(r.mission_reward) : 0,
  missionCurrency: (r.mission_currency as CommissionCurrency) ?? "EUR",
  active: !!r.active,
  notes: r.notes ?? undefined,
  username: r.username ?? undefined,
  accessCode: r.access_code ?? undefined,
  passwordHash: r.password_hash ?? undefined,
  resetToken: r.reset_token ?? undefined,
  resetTokenExpires: r.reset_token_expires ?? undefined,
  inviteQuota: r.invite_quota ?? null,
  lastSeenAt: r.last_seen_at ?? null,
  createdAt: r.created_at,
});
/* eslint-enable @typescript-eslint/no-explicit-any */

// Insert that tolerates a DB that hasn't run the latest supabase/*.sql:
// when the error complains about an unknown column, retry without the
// column(s) it actually names — never strip the others, they may be fine.
async function insertRow(
  table: string,
  row: Record<string, unknown>,
  optionalCols: string[] = []
): Promise<Record<string, unknown>> {
  const attempt = { ...row };
  let { data, error } = await supabase!.from(table).insert(attempt).select().single();
  while (
    error &&
    optionalCols.some((c) => attempt[c] !== undefined && error!.message?.includes(c))
  ) {
    for (const c of optionalCols) {
      if (error.message?.includes(c)) delete attempt[c];
    }
    ({ data, error } = await supabase!.from(table).insert(attempt).select().single());
  }
  if (error) throw error;
  return data as Record<string, unknown>;
}

// ─── Default Seed Data ──────────────────────────────────────────────

const DEFAULT_PACKS: Omit<Pack, "id" | "createdAt">[] = [
  {
    name: "Double Room",
    sub: "SOLAZUR TANGIER (2 NIGHTS)",
    price: "335",
    currency: "€",
    features: ["2 NIGHTS", "BREAKFAST", "DINNER", "FULL PASS"],
    popular: false,
    active: true,
    category: "Double Room",
  },
  {
    name: "Double Room",
    sub: "SOLAZUR TANGIER (3 NIGHTS)",
    price: "385",
    currency: "€",
    features: ["3 NIGHTS", "BREAKFAST", "DINNER", "FULL PASS"],
    popular: true,
    active: true,
    category: "Double Room",
  },
  {
    name: "Double Room",
    sub: "SOLAZUR TANGIER (4 NIGHTS)",
    price: "435",
    currency: "€",
    features: ["4 NIGHTS", "BREAKFAST", "DINNER", "FULL PASS"],
    popular: false,
    active: true,
    category: "Double Room",
  },
  {
    name: "Single Room",
    sub: "SOLAZUR TANGIER (2 NIGHTS)",
    price: "435",
    currency: "€",
    features: ["2 NIGHTS", "BREAKFAST", "DINNER", "FULL PASS"],
    popular: false,
    active: true,
    category: "Single Room",
  },
  {
    name: "Single Room",
    sub: "SOLAZUR TANGIER (3 NIGHTS)",
    price: "535",
    currency: "€",
    features: ["3 NIGHTS", "BREAKFAST", "DINNER", "FULL PASS"],
    popular: false,
    active: true,
    category: "Single Room",
  },
  {
    name: "Single Room",
    sub: "SOLAZUR TANGIER (4 NIGHTS)",
    price: "635",
    currency: "€",
    features: ["4 NIGHTS", "BREAKFAST", "DINNER", "FULL PASS"],
    popular: false,
    active: true,
    category: "Single Room",
  },
  {
    name: "Full Pass",
    sub: "WITHOUT ACCOMMODATION",
    price: "130",
    currency: "€",
    features: ["ALL WORKSHOPS", "SHOWS", "SOCIAL PARTIES", "POOL PARTIES"],
    popular: false,
    active: true,
    category: "Full Pass",
  },
  {
    name: "Couple Pass",
    sub: "WITHOUT ACCOMMODATION",
    price: "200",
    currency: "€",
    features: ["1 LEADER + 1 FOLLOWER", "ALL WORKSHOPS", "SHOWS & PARTIES", "POOL PARTIES"],
    popular: false,
    active: true,
    category: "Full Pass",
  },
  {
    name: "Party Pass",
    sub: "WITHOUT ACCOMMODATION",
    price: "90",
    currency: "€",
    features: ["SHOWS", "SOCIAL PARTIES", "POOL PARTIES", "(NO WORKSHOPS)"],
    popular: false,
    active: true,
    category: "Full Pass",
  },
  {
    name: "Day Pass",
    sub: "WITHOUT ACCOMMODATION",
    price: "50",
    currency: "€",
    features: ["ALL WORKSHOPS", "SHOWS", "SOCIAL PARTIES", "POOL PARTIES (1 DAY ONLY)"],
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

function getLocalPacks(): Pack[] {
  seedIfNeeded();
  return readStore<Pack>(PACKS_KEY);
}

export async function getPacks(): Promise<Pack[]> {
  if (useDb()) {
    try {
      const { data, error } = await supabase!
        .from("packs")
        .select("*")
        .order("created_at", { ascending: true });
      if (error) throw error;
      if (data && data.length > 0) return sortPacks(data.map(packFromRow));
      // Empty DB: fall back to defaults so the public site never shows nothing.
      return sortPacks(getLocalPacks());
    } catch (e) {
      warn("getPacks", e);
    }
  }
  return sortPacks(getLocalPacks());
}

/** True when the packs table has the sort_order column
 *  (created by supabase/pack-order.sql). */
export async function hasPackOrderColumn(): Promise<boolean> {
  if (!useDb()) return true; // local mode stores it fine
  const { error } = await supabase!.from("packs").select("sort_order").limit(1);
  return !error;
}

/** Persist a full display order following the given id list.
 *
 *  Preferred key is the sort_order column (supabase/pack-order.sql).
 *  When that column doesn't exist, the order is stored by rewriting
 *  created_at timestamps instead — getPacks() sorts by sort_order and
 *  falls back to created_at, so both paths give the same result and
 *  no database migration is required. */
export async function reorderPacks(orderedIds: string[]): Promise<boolean> {
  if (!useDb()) {
    for (let i = 0; i < orderedIds.length; i++) {
      await updatePack(orderedIds[i], { sortOrder: i + 1 });
    }
    return true;
  }

  const packs = await getPacks();
  const useColumn = await hasPackOrderColumn();

  if (useColumn) {
    for (let i = 0; i < orderedIds.length; i++) {
      const pack = packs.find((p) => p.id === orderedIds[i]);
      if (!pack || pack.sortOrder === i + 1) continue;
      const { error } = await supabase!
        .from("packs")
        .update({ sort_order: i + 1 })
        .eq("id", orderedIds[i]);
      if (error) {
        warn("reorderPacks", error);
        return false;
      }
    }
    return true;
  }

  // Fallback: encode the order in created_at (spaced 1 hour apart from a
  // fixed base so the sequence is stable and unambiguous).
  const base = Date.UTC(2024, 0, 1);
  for (let i = 0; i < orderedIds.length; i++) {
    const wanted = new Date(base + i * 3600_000).toISOString();
    const pack = packs.find((p) => p.id === orderedIds[i]);
    if (!pack || pack.createdAt === wanted) continue;
    const { error } = await supabase!
      .from("packs")
      .update({ created_at: wanted })
      .eq("id", orderedIds[i]);
    if (error) {
      warn("reorderPacks(created_at)", error);
      return false;
    }
  }
  return true;
}

export async function getActivePacks(): Promise<Pack[]> {
  return (await getPacks()).filter((p) => p.active && !p.isPrivate);
}

export async function getPackById(id: string): Promise<Pack | undefined> {
  return (await getPacks()).find((p) => p.id === id);
}

export async function addPack(pack: Omit<Pack, "id" | "createdAt">): Promise<Pack> {
  if (useDb()) {
    try {
      const data = await insertRow("packs", packToRow(pack));
      return packFromRow(data);
    } catch (e) {
      warn("addPack", e);
    }
  }
  const packs = getLocalPacks();
  const newPack: Pack = { ...pack, id: generateId(), createdAt: new Date().toISOString() };
  packs.push(newPack);
  writeStore(PACKS_KEY, packs);
  return newPack;
}

export async function updatePack(
  id: string,
  updates: Partial<Omit<Pack, "id" | "createdAt">>
): Promise<Pack | null> {
  if (useDb()) {
    try {
      const { data, error } = await supabase!
        .from("packs")
        .update(packToRow(updates))
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return packFromRow(data);
    } catch (e) {
      warn("updatePack", e);
    }
  }
  const packs = getLocalPacks();
  const idx = packs.findIndex((p) => p.id === id);
  if (idx === -1) return null;
  packs[idx] = { ...packs[idx], ...updates };
  writeStore(PACKS_KEY, packs);
  return packs[idx];
}

export async function deletePack(id: string): Promise<boolean> {
  if (useDb()) {
    try {
      const { error } = await supabase!.from("packs").delete().eq("id", id);
      if (error) throw error;
      return true;
    } catch (e) {
      warn("deletePack", e);
    }
  }
  const packs = getLocalPacks();
  const filtered = packs.filter((p) => p.id !== id);
  if (filtered.length === packs.length) return false;
  writeStore(PACKS_KEY, filtered);
  return true;
}

/** Push the hardcoded default packs into the database (admin action).
 *  Throws when the database refuses the writes (e.g. RLS not set up). */
export async function seedPacksToDb(): Promise<number> {
  if (!useDb()) return 0;
  const { data } = await supabase!.from("packs").select("name, sub");
  const existing = new Set((data ?? []).map((r) => `${r.name}::${r.sub}`));
  let inserted = 0;
  let firstError: unknown = null;
  for (const p of DEFAULT_PACKS) {
    if (existing.has(`${p.name}::${p.sub}`)) continue;
    const { error } = await supabase!.from("packs").insert(packToRow(p));
    if (error) {
      firstError = firstError ?? error;
    } else {
      inserted++;
    }
  }
  if (inserted === 0 && firstError) {
    warn("seedPacksToDb", firstError);
    throw firstError;
  }
  return inserted;
}

// ─── Bookings CRUD ──────────────────────────────────────────────────

export async function getBookings(): Promise<Booking[]> {
  if (useDb()) {
    try {
      const { data, error } = await supabase!
        .from("bookings")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []).map(bookingFromRow);
    } catch (e) {
      warn("getBookings", e);
    }
  }
  return readStore<Booking>(BOOKINGS_KEY);
}

export async function getBookingById(id: string): Promise<Booking | undefined> {
  return (await getBookings()).find((b) => b.id === id);
}

/** Look up a booking by its ticket code (used by the public /ticket page). */
export async function getBookingByTicketCode(code: string): Promise<Booking | undefined> {
  const wanted = code.trim().toUpperCase();
  if (useDb()) {
    try {
      const { data, error } = await supabase!
        .from("bookings")
        .select("*")
        .eq("ticket_code", wanted)
        .maybeSingle();
      if (error) throw error;
      if (data) return bookingFromRow(data);
    } catch (e) {
      warn("getBookingByTicketCode", e);
    }
  }
  return readStore<Booking>(BOOKINGS_KEY).find(
    (b) => b.ticketCode.toUpperCase() === wanted
  );
}

export async function addBooking(
  booking: Omit<Booking, "id" | "ticketCode" | "createdAt"> & { ticketCode?: string }
): Promise<Booking> {
  const ticketCode = (booking.ticketCode?.trim() || generateTicketCode()).toUpperCase();
  if (booking.discountCode) {
    incrementDiscountUsage(booking.discountCode).catch(() => {});
  }

  // Resolve collaboratorId to valid UUID if a partner code or ID was passed
  let resolvedCollabId = booking.collaboratorId;
  if (resolvedCollabId && !isValidUuid(resolvedCollabId)) {
    try {
      const allCollabs = await getCollaborators();
      const found = allCollabs.find(
        (c) =>
          c.id === resolvedCollabId ||
          c.code?.toUpperCase() === resolvedCollabId?.toUpperCase() ||
          c.name?.toUpperCase() === resolvedCollabId?.toUpperCase()
      );
      if (found && isValidUuid(found.id)) {
        resolvedCollabId = found.id;
      } else {
        resolvedCollabId = null;
      }
    } catch {
      resolvedCollabId = null;
    }
  }

  if (useDb()) {
    try {
      const data = await insertRow(
        "bookings",
        {
          ticket_code: ticketCode,
          pack_id: isValidUuid(booking.packId) ? booking.packId : null,
          pack_name: booking.packName,
          customer_name: booking.customerName,
          email: booking.email,
          phone: booking.phone,
          country: booking.country,
          num_people: booking.numPeople,
          dance_level: booking.danceLevel,
          notes: booking.notes,
          arrival_date: booking.arrivalDate || null,
          departure_date: booking.departureDate || null,
          lang: booking.lang || null,
          status: booking.status,
          source: booking.source ?? "manual",
          collaborator_id: isValidUuid(resolvedCollabId) ? resolvedCollabId : null,
          room_number: booking.roomNumber ?? null,
          room_type: booking.roomType ?? null,
          guest_details: booking.guestDetails ?? null,
          invite_id: isValidUuid(booking.inviteId) ? booking.inviteId : null,
          invite_code: booking.inviteCode ?? null,
          discount_code: booking.discountCode ?? null,
          discount_amount: booking.discountAmount ?? 0,
          discount_code_id: isValidUuid(booking.discountCodeId) ? booking.discountCodeId : null,
          needs_transfer: !!booking.needsTransfer,
          transfer_type: booking.transferType ?? null,
          transfer_option: booking.transferOption ?? null,
          transfer_location: booking.transferLocation ?? null,
          transfer_details: booking.transferDetails ?? null,
          transfer_cost: booking.transferCost ?? 0,
        },
        [
          "source",
          "collaborator_id",
          "room_number",
          "room_type",
          "guest_details",
          "arrival_date",
          "departure_date",
          "lang",
          "discount_code",
          "discount_amount",
          "discount_code_id",
          "needs_transfer",
          "transfer_type",
          "transfer_option",
          "transfer_location",
          "transfer_details",
          "transfer_cost",
        ]
      );
      return bookingFromRow(data);
    } catch (e) {
      warn("addBooking", e);
    }
  }
  const bookings = readStore<Booking>(BOOKINGS_KEY);
  const newBooking: Booking = {
    ...booking,
    id: generateId(),
    ticketCode,
    createdAt: new Date().toISOString(),
  };
  bookings.push(newBooking);
  writeStore(BOOKINGS_KEY, bookings);
  return newBooking;
}

export async function updateBookingTransfer(
  id: string,
  transfer: {
    needsTransfer?: boolean;
    transferType?: TransferType | null;
    transferOption?: TransferOption | null;
    transferLocation?: string | null;
    transferDetails?: string | null;
    transferCost?: number | null;
  }
): Promise<Booking | null> {
  if (useDb() && !isLocalId(id)) {
    try {
      const updates: Record<string, any> = {};
      if (transfer.needsTransfer !== undefined) updates.needs_transfer = transfer.needsTransfer;
      if (transfer.transferType !== undefined) updates.transfer_type = transfer.transferType;
      if (transfer.transferOption !== undefined) updates.transfer_option = transfer.transferOption;
      if (transfer.transferLocation !== undefined) updates.transfer_location = transfer.transferLocation;
      if (transfer.transferDetails !== undefined) updates.transfer_details = transfer.transferDetails;
      if (transfer.transferCost !== undefined) updates.transfer_cost = transfer.transferCost;

      const { data, error } = await supabase!
        .from("bookings")
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return bookingFromRow(data);
    } catch (e) {
      warn("updateBookingTransfer", e);
    }
  }
  const bookings = readStore<Booking>(BOOKINGS_KEY);
  const idx = bookings.findIndex((b) => b.id === id);
  if (idx === -1) return null;
  bookings[idx] = { ...bookings[idx], ...transfer };
  writeStore(BOOKINGS_KEY, bookings);
  return bookings[idx];
}

export async function updateBooking(
  id: string,
  updates: Partial<Booking>
): Promise<Booking | null> {
  if (useDb() && !isLocalId(id)) {
    try {
      const rowUpdates: Record<string, any> = {};
      if (updates.customerName !== undefined) rowUpdates.customer_name = updates.customerName;
      if (updates.packId !== undefined) rowUpdates.pack_id = isValidUuid(updates.packId) ? updates.packId : null;
      if (updates.packName !== undefined) rowUpdates.pack_name = updates.packName;
      if (updates.numPeople !== undefined) rowUpdates.num_people = updates.numPeople;
      if (updates.email !== undefined) rowUpdates.email = updates.email;
      if (updates.phone !== undefined) rowUpdates.phone = updates.phone;
      if (updates.country !== undefined) rowUpdates.country = updates.country;
      if (updates.roomNumber !== undefined) rowUpdates.room_number = updates.roomNumber;
      if (updates.notes !== undefined) rowUpdates.notes = updates.notes;
      if (updates.status !== undefined) rowUpdates.status = updates.status;
      if (updates.arrivalDate !== undefined) rowUpdates.arrival_date = updates.arrivalDate;
      if (updates.departureDate !== undefined) rowUpdates.departure_date = updates.departureDate;
      if (updates.guestDetails !== undefined) rowUpdates.guest_details = updates.guestDetails;
      if (updates.collaboratorId !== undefined) rowUpdates.collaborator_id = isValidUuid(updates.collaboratorId) ? updates.collaboratorId : null;

      const { data, error } = await supabase!
        .from("bookings")
        .update(rowUpdates)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return bookingFromRow(data);
    } catch (e) {
      warn("updateBooking", e);
    }
  }
  const bookings = readStore<Booking>(BOOKINGS_KEY);
  const idx = bookings.findIndex((b) => b.id === id);
  if (idx === -1) return null;
  bookings[idx] = { ...bookings[idx], ...updates };
  writeStore(BOOKINGS_KEY, bookings);
  return bookings[idx];
}

export async function updateBookingStatus(
  id: string,
  status: BookingStatus
): Promise<Booking | null> {
  if (useDb() && !isLocalId(id)) {
    const { data, error } = await supabase!
      .from("bookings")
      .update({ status })
      .eq("id", id)
      .select()
      .single();
    if (error) {
      warn("updateBookingStatus", error);
      // A database row can't be patched locally — surface the real reason
      // instead of silently reverting (e.g. an old CHECK constraint that
      // doesn't allow "declined" — fixed by supabase/booking-status.sql).
      if (/check constraint|bookings_status/i.test(error.message ?? "")) {
        throw new Error(
          `The database still rejects the "${status}" status. ` +
            `Run supabase/booking-status.sql in the Supabase SQL Editor to fix it.`
        );
      }
      throw new Error(error.message || "Could not update the booking status.");
    }
    return bookingFromRow(data);
  }
  const bookings = readStore<Booking>(BOOKINGS_KEY);
  const idx = bookings.findIndex((b) => b.id === id);
  if (idx === -1) return null;
  bookings[idx] = { ...bookings[idx], status };
  writeStore(BOOKINGS_KEY, bookings);
  return bookings[idx];
}

export async function deleteBooking(id: string): Promise<boolean> {
  if (useDb()) {
    try {
      const { error } = await supabase!.from("bookings").delete().eq("id", id);
      if (error) throw error;
      return true;
    } catch (e) {
      warn("deleteBooking", e);
    }
  }
  const bookings = readStore<Booking>(BOOKINGS_KEY);
  const filtered = bookings.filter((b) => b.id !== id);
  if (filtered.length === bookings.length) return false;
  writeStore(BOOKINGS_KEY, filtered);
  return true;
}

// ─── Discount Codes CRUD ─────────────────────────────────────────────

export async function getDiscountCodes(): Promise<DiscountCode[]> {
  if (useDb()) {
    try {
      const { data, error } = await supabase!
        .from("discount_codes")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []).map(discountFromRow);
    } catch (e) {
      warn("getDiscountCodes", e);
    }
  }
  return readStore<DiscountCode>(DISCOUNTS_KEY);
}

export async function getDiscountCodeByCode(code: string): Promise<DiscountCode | undefined> {
  const wanted = code.trim().toUpperCase();
  if (useDb()) {
    try {
      const { data, error } = await supabase!
        .from("discount_codes")
        .select("*")
        .eq("code", wanted)
        .maybeSingle();
      if (error) throw error;
      if (data) return discountFromRow(data);
    } catch (e) {
      warn("getDiscountCodeByCode", e);
    }
  }
  return readStore<DiscountCode>(DISCOUNTS_KEY).find(
    (d) => d.code.toUpperCase() === wanted
  );
}

export async function addDiscountCode(
  discount: Omit<DiscountCode, "id" | "createdAt" | "usedCount">
): Promise<DiscountCode> {
  const cleanCode = discount.code.trim().toUpperCase();
  if (useDb()) {
    try {
      const data = await insertRow("discount_codes", {
        code: cleanCode,
        discount_amount: discount.discountAmount,
        discount_type: discount.discountType || "fixed",
        apply_scope: discount.applyScope || "per_booking",
        override_price: discount.overridePrice ?? null,
        applicable_pack_ids: discount.applicablePackIds ?? null,
        max_guests_discounted: discount.maxGuestsDiscounted ?? null,
        commission_override: discount.commissionOverride ?? null,
        commission_type: discount.commissionType || "fixed",
        max_uses: discount.maxUses ?? null,
        used_count: 0,
        active: discount.active ?? true,
        notes: discount.notes ?? null,
      });

      return discountFromRow(data);
    } catch (e) {
      warn("addDiscountCode", e);
    }
  }
  const discounts = readStore<DiscountCode>(DISCOUNTS_KEY);
  const newDiscount: DiscountCode = {
    ...discount,
    code: cleanCode,
    id: generateId(),
    usedCount: 0,
    createdAt: new Date().toISOString(),
  };
  discounts.push(newDiscount);
  writeStore(DISCOUNTS_KEY, discounts);
  return newDiscount;
}

export async function updateDiscountCode(
  id: string,
  updates: Partial<Omit<DiscountCode, "id" | "createdAt">>
): Promise<DiscountCode | null> {
  if (useDb() && !isLocalId(id)) {
    try {
      const { data, error } = await supabase!
        .from("discount_codes")
        .update(discountToRow(updates))
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return discountFromRow(data);
    } catch (e) {
      warn("updateDiscountCode", e);
    }
  }
  const discounts = readStore<DiscountCode>(DISCOUNTS_KEY);
  const idx = discounts.findIndex((d) => d.id === id);
  if (idx === -1) return null;
  discounts[idx] = { ...discounts[idx], ...updates };
  if (updates.code) discounts[idx].code = updates.code.trim().toUpperCase();
  writeStore(DISCOUNTS_KEY, discounts);
  return discounts[idx];
}

export async function deleteDiscountCode(id: string): Promise<boolean> {
  if (useDb() && !isLocalId(id)) {
    try {
      const { error } = await supabase!.from("discount_codes").delete().eq("id", id);
      if (error) throw error;
      return true;
    } catch (e) {
      warn("deleteDiscountCode", e);
    }
  }
  const discounts = readStore<DiscountCode>(DISCOUNTS_KEY);
  const filtered = discounts.filter((d) => d.id !== id);
  if (filtered.length === discounts.length) return false;
  writeStore(DISCOUNTS_KEY, filtered);
  return true;
}

export async function incrementDiscountUsage(code: string): Promise<void> {
  const d = await getDiscountCodeByCode(code);
  if (!d) return;
  const newCount = (d.usedCount || 0) + 1;
  await updateDiscountCode(d.id, { usedCount: newCount });
}

export function isDiscountApplicableToPack(
  discount: DiscountCode | null | undefined,
  packId?: string | null
): boolean {
  if (!discount || !discount.active) return false;
  if (!discount.applicablePackIds || discount.applicablePackIds.length === 0) {
    return true; // applies to all packs
  }
  if (!packId) return false;
  return discount.applicablePackIds.includes(packId);
}

export function calculateDiscountAmount(
  discount: DiscountCode,
  basePrice: number,
  numGuests: number = 1,
  singlePrice: number = 0,
  currency: string = "EUR",
  packId?: string
): number {
  if (!discount || !discount.active) return 0;

  // Check pack eligibility if restricted
  if (discount.applicablePackIds && discount.applicablePackIds.length > 0) {
    if (!packId || !discount.applicablePackIds.includes(packId)) {
      return 0;
    }
  }

  const isMad = /mad|dh/i.test(currency);
  const rateMultiplier = isMad ? EUR_TO_MAD : 1;

  const scope = discount.applyScope || "per_booking";

  if (scope === "fixed_price") {
    if (discount.overridePrice != null && discount.overridePrice >= 0) {
      const targetPriceInPackCurrency = discount.overridePrice * rateMultiplier;
      const customTotal =
        discount.discountType === "fixed" && numGuests > 1 && singlePrice > 0
          ? targetPriceInPackCurrency * numGuests
          : targetPriceInPackCurrency;
      return Math.max(0, basePrice - customTotal);
    }
  }

  if (scope === "per_person") {
    const maxAllowed =
      discount.maxGuestsDiscounted && discount.maxGuestsDiscounted > 0
        ? discount.maxGuestsDiscounted
        : numGuests;
    const applicableGuests = Math.min(numGuests, maxAllowed);

    if (discount.discountType === "percent") {
      const singleGuestBase = singlePrice > 0 ? singlePrice : basePrice / Math.max(1, numGuests);
      const discountPerGuest = singleGuestBase * (discount.discountAmount / 100);
      return Math.round(discountPerGuest * applicableGuests * 100) / 100;
    }
    const discountInPackCurrency = discount.discountAmount * rateMultiplier;
    const totalDiscount = discountInPackCurrency * applicableGuests;
    return Math.min(basePrice, totalDiscount);
  }

  // per_booking (default)
  if (discount.discountType === "percent") {
    return Math.round((basePrice * (discount.discountAmount / 100)) * 100) / 100;
  }
  const discountInPackCurrency = discount.discountAmount * rateMultiplier;
  return Math.min(basePrice, discountInPackCurrency);
}

export async function validateDiscountCode(
  code: string,
  basePrice: number = 0,
  packId?: string,
  numGuests: number = 1,
  singlePrice: number = 0,
  currency: string = "EUR"
): Promise<{ valid: boolean; error?: string; discount?: DiscountCode; discountAmount?: number }> {
  if (!code || !code.trim()) {
    return { valid: false, error: "Empty code" };
  }
  const d = await getDiscountCodeByCode(code);
  if (!d) {
    return { valid: false, error: "Invalid discount code" };
  }
  if (!d.active) {
    return { valid: false, error: "This discount code is no longer active" };
  }
  if (d.maxUses != null && d.maxUses > 0 && d.usedCount >= d.maxUses) {
    return { valid: false, error: "This discount code has reached its maximum uses" };
  }

  // Pack restriction check
  if (packId && d.applicablePackIds && d.applicablePackIds.length > 0) {
    if (!d.applicablePackIds.includes(packId)) {
      return { valid: false, error: "This discount code is not applicable to the selected pack" };
    }
  }

  const discountAmount = calculateDiscountAmount(d, basePrice, numGuests, singlePrice, currency, packId);
  return { valid: true, discount: d, discountAmount };
}



// ─── Invites CRUD ───────────────────────────────────────────────────

export async function getInvites(): Promise<Invite[]> {
  if (useDb()) {
    try {
      const { data, error } = await supabase!
        .from("invites")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []).map(inviteFromRow);
    } catch (e) {
      warn("getInvites", e);
    }
  }
  return readStore<Invite>(INVITES_KEY);
}

export async function generateInvite(
  packId: string,
  packName: string,
  assignee?: string,
  collaboratorId?: string
): Promise<Invite> {
  const code = generateTicketCode();
  if (useDb()) {
    try {
      const data = await insertRow(
        "invites",
        {
          code,
          pack_id: packId || null,
          pack_name: packName,
          used: false,
          assignee: assignee || null,
          collaborator_id: collaboratorId || null,
        },
        ["collaborator_id"]
      );
      return inviteFromRow(data);
    } catch (e) {
      warn("generateInvite", e);
    }
  }
  const invites = readStore<Invite>(INVITES_KEY);
  const invite: Invite = {
    id: generateId(),
    code,
    packId,
    packName,
    used: false,
    assignee: assignee || undefined,
    collaboratorId: collaboratorId || null,
    createdAt: new Date().toISOString(),
  };
  invites.push(invite);
  writeStore(INVITES_KEY, invites);
  return invite;
}

export async function generateBulkInvites(
  packId: string,
  packName: string,
  count: number,
  assignee?: string,
  collaboratorId?: string
): Promise<Invite[]> {
  const out: Invite[] = [];
  for (let i = 0; i < count; i++) {
    out.push(await generateInvite(packId, packName, assignee, collaboratorId));
  }
  return out;
}

export async function markInviteUsed(id: string): Promise<Invite | null> {
  if (useDb()) {
    try {
      const { data, error } = await supabase!
        .from("invites")
        .update({ used: true })
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return inviteFromRow(data);
    } catch (e) {
      warn("markInviteUsed", e);
    }
  }
  const invites = readStore<Invite>(INVITES_KEY);
  const idx = invites.findIndex((i) => i.id === id);
  if (idx === -1) return null;
  invites[idx] = { ...invites[idx], used: true };
  writeStore(INVITES_KEY, invites);
  return invites[idx];
}

export async function deleteInvite(id: string): Promise<boolean> {
  if (useDb()) {
    try {
      const { error } = await supabase!.from("invites").delete().eq("id", id);
      if (error) throw error;
      return true;
    } catch (e) {
      warn("deleteInvite", e);
    }
  }
  const invites = readStore<Invite>(INVITES_KEY);
  const filtered = invites.filter((i) => i.id !== id);
  if (filtered.length === invites.length) return false;
  writeStore(INVITES_KEY, filtered);
  return true;
}

// ─── Invite Lookup & Redeem ─────────────────────────────────────────

export async function getInviteByCode(code: string): Promise<Invite | undefined> {
  if (useDb()) {
    try {
      const { data, error } = await supabase!
        .from("invites")
        .select("*")
        .eq("code", code)
        .maybeSingle();
      if (error) throw error;
      if (data) return inviteFromRow(data);
      // Not in the database — fall through and check localStorage too
      // (covers invites created while database writes were blocked).
    } catch (e) {
      warn("getInviteByCode", e);
    }
  }
  return readStore<Invite>(INVITES_KEY).find((i) => i.code === code);
}

// Local (fallback) records use timestamp-based ids; database rows use uuids.
const isLocalId = (id: string) => !/^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(id);

export interface RedeemData {
  customerName: string;
  email: string;
  phone: string;
  country: string;
  numPeople: number;
  danceLevel: string;
  notes: string;
  arrivalDate?: string | null;
  departureDate?: string | null;
}

export async function redeemInvite(
  inviteCode: string,
  data: RedeemData
): Promise<{ success: true; booking: Booking } | { success: false; error: string }> {
  const invite = await getInviteByCode(inviteCode);
  if (!invite) return { success: false, error: "Invite code not found." };
  if (invite.used) return { success: false, error: "This invite has already been used." };

  const pack = await getPackById(invite.packId);

  if (useDb() && !isLocalId(invite.id)) {
    try {
      // Claim the invite first (guards against double redemption):
      // the update only matches if the invite is still unused.
      const { data: claimed, error: claimErr } = await supabase!
        .from("invites")
        .update({
          used: true,
          redeemed_by: data.customerName,
          redeemed_at: new Date().toISOString(),
        })
        .eq("id", invite.id)
        .eq("used", false)
        .select();
      if (claimErr) throw claimErr;
      if (!claimed || claimed.length === 0) {
        return { success: false, error: "This invite has already been used." };
      }

      // Redemptions arrive as PENDING — the ticket is only issued when the
      // festival team (or the partner) confirms, which auto-sends the QR.
      const booking = await addBooking({
        ...data,
        packId: invite.packId,
        packName: invite.packName,
        status: "pending",
        source: "invite",
        collaboratorId: invite.collaboratorId ?? null,
        inviteId: invite.id,
        inviteCode: invite.code,
      });

      await supabase!.from("invites").update({ booking_id: booking.id }).eq("id", invite.id);
      return { success: true, booking };
    } catch (e) {
      warn("redeemInvite", e);
      return { success: false, error: "Something went wrong. Please try again." };
    }
  }

  // Local fallback
  if (!pack) return { success: false, error: "Pack no longer available." };
  const booking = await addBooking({
    ...data,
    packId: invite.packId,
    packName: invite.packName,
    status: "pending",
    source: "invite",
    collaboratorId: invite.collaboratorId ?? null,
    inviteId: invite.id,
    inviteCode: invite.code,
  });
  const invites = readStore<Invite>(INVITES_KEY);
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

// ─── Collaborators ──────────────────────────────────────────────────

/** True when the collaborators table exists in the database. */
export async function collaboratorsReady(): Promise<boolean> {
  if (!useDb()) return true; // local mode always "works"
  const { error } = await supabase!.from("collaborators").select("id").limit(1);
  return !error;
}

/** True when the commission_type/commission_currency columns exist
 *  (created by supabase/commission.sql). While they're missing, the
 *  per-person / MAD choices can't be saved. */
export async function commissionColumnsReady(): Promise<boolean> {
  if (!useDb()) return true;
  const { error } = await supabase!
    .from("collaborators")
    .select("commission_type")
    .limit(1);
  return !error;
}

/** True when the language column exists (supabase/partner-language.sql). */
export async function languageColumnReady(): Promise<boolean> {
  if (!useDb()) return true;
  const { error } = await supabase!.from("collaborators").select("language").limit(1);
  return !error;
}

/** True when the mission columns exist (supabase/partner-missions.sql). */
export async function missionColumnsReady(): Promise<boolean> {
  if (!useDb()) return true;
  const { error } = await supabase!.from("collaborators").select("mission_goal").limit(1);
  return !error;
}

/** True when the split-rate columns exist (supabase/commission-rates.sql). */
export async function commissionRatesReady(): Promise<boolean> {
  if (!useDb()) return true;
  const { error } = await supabase!
    .from("collaborators")
    .select("commission_double")
    .limit(1);
  return !error;
}

export async function getCollaborators(): Promise<Collaborator[]> {
  if (useDb()) {
    try {
      const { data, error } = await supabase!
        .from("collaborators")
        .select("*")
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []).map(collabFromRow);
    } catch (e) {
      warn("getCollaborators", e);
    }
  }
  return readStore<Collaborator>(COLLABS_KEY);
}

export async function getCollaboratorByCode(code: string): Promise<Collaborator | undefined> {
  if (!code) return undefined;
  const wanted = code.trim().toUpperCase();
  const all = await getCollaborators();
  return all.find(
    (c) =>
      c.code?.toUpperCase() === wanted ||
      c.name?.toUpperCase() === wanted ||
      c.id === code
  );
}

export async function getCollaboratorById(id: string): Promise<Collaborator | undefined> {
  return (await getCollaborators()).find((c) => c.id === id);
}

export async function countInvitesByCollaborator(collaboratorId: string): Promise<number> {
  return (await getInvites()).filter((i) => i.collaboratorId === collaboratorId).length;
}

/** Partner Portal login: email (or username) + password against collaborators. */
export async function partnerLogin(
  identifier: string,
  password: string
): Promise<{ success: true; collaborator: Collaborator } | { success: false; error: string }> {
  const cleanId = identifier.trim().toLowerCase();
  const cleanPass = password.trim();
  const all = await getCollaborators();
  const found = all.find(
    (c) =>
      (c.email ?? "").toLowerCase() === cleanId ||
      (c.username ?? "").toLowerCase() === cleanId
  );
  if (!found) {
    return { success: false, error: "No account found with this email." };
  }

  // Account activation check: Account must be activated by admin before login
  if (!found.active) {
    return {
      success: false,
      error: "Your account is not activated yet. Please wait for an administrator to activate your account.",
    };
  }

  let passMatches = false;
  if (found.passwordHash) {
    const hashed = await hashPassword(cleanPass);
    passMatches = hashed === found.passwordHash;
  } else if (found.accessCode) {
    // Legacy fallback to access code
    passMatches = found.accessCode === cleanPass;
  }

  if (!passMatches) {
    if (!found.passwordHash && !found.accessCode) {
      return {
        success: false,
        error: "Password has not been set yet. Please click 'Forgot / Set Password' to create your password.",
      };
    }
    return { success: false, error: "Incorrect password." };
  }

  // Best-effort "last active" stamp — ignore failures.
  updateCollaborator(found.id, { lastSeenAt: new Date().toISOString() }).catch(() => {});
  return { success: true, collaborator: found };
}

/** Request password reset / setup link via email. */
export async function requestPasswordReset(
  email: string,
  userLang?: string
): Promise<{ success: boolean; error?: string; resetUrl?: string }> {
  const cleanEmail = email.trim().toLowerCase();
  const all = await getCollaborators();
  const found = all.find((c) => (c.email ?? "").toLowerCase() === cleanEmail);
  if (!found) {
    return { success: false, error: "No partner account found with that email address." };
  }

  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  const resetToken = Array.from(array, (b) => b.toString(16).padStart(2, "0")).join("");
  const resetTokenExpires = new Date(Date.now() + 24 * 3600 * 1000).toISOString();

  // Save token directly to Supabase (bypass updateCollaborator to avoid silent failures)
  let tokenSaved = false;
  if (useDb()) {
    try {
      const { error } = await supabase!
        .from("collaborators")
        .update({ reset_token: resetToken, reset_token_expires: resetTokenExpires })
        .eq("id", found.id);
      if (!error) tokenSaved = true;
      else warn("requestPasswordReset: direct update failed", error);
    } catch (e) {
      warn("requestPasswordReset: direct update exception", e);
    }
  }
  // Fallback: also try updateCollaborator (handles localStorage fallback)
  if (!tokenSaved) {
    await updateCollaborator(found.id, { resetToken, resetTokenExpires });
  }

  const reqLang = (userLang || found.language || "en").toLowerCase();
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const resetUrl = `${origin}/partner?resetToken=${resetToken}&lang=${reqLang}`;

  // Dynamically import sendFormNotification to avoid circular dependencies if any
  const { sendFormNotification } = await import("./form-notify");

  const emailSubjects = {
    en: "Set / Reset Your Partner Portal Password — Tangier Latin Festival",
    fr: "Créer / Réinitialiser votre mot de passe Partenaire — Tangier Latin Festival",
    es: "Establecer / Restablecer tu contraseña de Colaborador — Tangier Latin Festival",
  };
  const subject = emailSubjects[reqLang as "en" | "fr" | "es"] || emailSubjects.en;

  const trilingualBody =
    `Hello / Bonjour / Hola ${found.name},\n\n` +
    `--------------------------------------------------\n` +
    `🇬🇧 ENGLISH:\n` +
    `You requested to set or reset your password for the Tangier International Latin Festival Partner Portal.\n` +
    `Click the link below to create your password:\n${resetUrl}\n\n` +
    `--------------------------------------------------\n` +
    `🇫🇷 FRANÇAIS:\n` +
    `Vous avez demandé à créer ou réinitialiser votre mot de passe pour l'Espace Partenaire.\n` +
    `Cliquez sur le lien ci-dessous pour créer votre mot de passe :\n${resetUrl}\n\n` +
    `--------------------------------------------------\n` +
    `🇪🇸 ESPAÑOL:\n` +
    `Has solicitado crear o restablecer tu contraseña para el Área de Colaboradores.\n` +
    `Haz clic en el siguiente enlace para crear tu contraseña:\n${resetUrl}\n\n` +
    `--------------------------------------------------\n` +
    `This link is valid for 24 hours / Ce lien est valable 24h / Válido por 24 horas.\n\n` +
    `— Tangier International Latin Festival Team\n` +
    `contact@tangierlatinfestival.com · +212 6 64 01 02 79 / +212 6 64 63 06 32`;

  sendFormNotification({
    subject,
    fields: {
      email: found.email!,
      name: found.name,
      resetUrl,
    },
    autoresponse: trilingualBody,
    guestSubject: subject,
    lang: reqLang,
  }).catch(() => {});

  return { success: true, resetUrl };
}

/** Reset or set partner password using reset token. */
export async function resetPartnerPassword(
  token: string,
  newPassword: string
): Promise<{ success: boolean; error?: string }> {
  const cleanPass = newPassword.trim();
  if (!cleanPass || cleanPass.length < 6) {
    return { success: false, error: "Password must be at least 6 characters long." };
  }
  const cleanToken = token.trim();

  // Try direct Supabase lookup by reset_token first (most reliable)
  let found: Collaborator | undefined;
  if (useDb()) {
    try {
      const { data, error } = await supabase!
        .from("collaborators")
        .select("*")
        .eq("reset_token", cleanToken)
        .single();
      if (!error && data) {
        found = collabFromRow(data);
      }
    } catch (_) { /* fall through to getCollaborators */ }
  }

  // Fallback: search all collaborators (covers localStorage path)
  if (!found) {
    const all = await getCollaborators();
    found = all.find((c) => c.resetToken === cleanToken);
  }

  if (!found) {
    return { success: false, error: "Invalid or expired password reset link." };
  }
  if (found.resetTokenExpires && new Date(found.resetTokenExpires).getTime() < Date.now()) {
    return { success: false, error: "Password reset link has expired. Please request a new one." };
  }

  const pHash = await hashPassword(cleanPass);

  // Save password directly to Supabase (bypass updateCollaborator)
  let saved = false;
  if (useDb()) {
    try {
      const { error } = await supabase!
        .from("collaborators")
        .update({ password_hash: pHash, reset_token: null, reset_token_expires: null })
        .eq("id", found.id);
      if (!error) saved = true;
      else warn("resetPartnerPassword: direct update failed", error);
    } catch (e) {
      warn("resetPartnerPassword: direct update exception", e);
    }
  }
  if (!saved) {
    await updateCollaborator(found.id, {
      passwordHash: pHash,
      resetToken: null as any,
      resetTokenExpires: null as any,
    });
  }

  return { success: true };
}

export async function addCollaborator(
  c: Omit<Collaborator, "id" | "createdAt">
): Promise<Collaborator> {
  if (useDb()) {
    try {
      const data = await insertRow(
        "collaborators",
        {
          name: c.name,
          code: c.code.trim().toUpperCase(),
          email: c.email || null,
          phone: c.phone || null,
          commission: c.commission ?? 0,
          commission_type: c.commissionType ?? "percent",
          commission_currency: c.commissionCurrency ?? "EUR",
          commission_double: c.commissionDouble ?? null,
          commission_single: c.commissionSingle ?? null,
          commission_fullpass: c.commissionFullpass ?? null,
          language: c.language ?? "en",
          mission_goal: c.missionGoal ?? null,
          mission_reward: c.missionReward ?? 0,
          mission_currency: c.missionCurrency ?? "EUR",
          active: c.active ?? false,
          notes: c.notes || null,
          username: c.username?.trim().toLowerCase() || null,
          access_code: c.accessCode || null,
          password_hash: c.passwordHash || null,
          reset_token: c.resetToken || null,
          reset_token_expires: c.resetTokenExpires || null,
          invite_quota: c.inviteQuota ?? null,
        },
        [
          "username",
          "access_code",
          "password_hash",
          "reset_token",
          "reset_token_expires",
          "invite_quota",
          "commission_type",
          "commission_currency",
          "commission_double",
          "commission_single",
          "commission_fullpass",
          "language",
          "mission_goal",
          "mission_reward",
          "mission_currency",
        ]
      );
      return collabFromRow(data);
    } catch (e) {
      warn("addCollaborator", e);
      throw e;
    }
  }
  const all = readStore<Collaborator>(COLLABS_KEY);
  const created: Collaborator = {
    ...c,
    code: c.code.trim().toUpperCase(),
    id: generateId(),
    createdAt: new Date().toISOString(),
  };
  all.push(created);
  writeStore(COLLABS_KEY, all);
  return created;
}

export async function updateCollaborator(
  id: string,
  updates: Partial<Omit<Collaborator, "id" | "createdAt">>
): Promise<Collaborator | null> {
  if (useDb()) {
    try {
      const row: Record<string, unknown> = {};
      if (updates.name !== undefined) row.name = updates.name;
      if (updates.code !== undefined) row.code = updates.code.trim().toUpperCase();
      if (updates.email !== undefined) row.email = updates.email || null;
      if (updates.phone !== undefined) row.phone = updates.phone || null;
      if (updates.commission !== undefined) row.commission = updates.commission;
      if (updates.commissionType !== undefined) row.commission_type = updates.commissionType;
      if (updates.commissionCurrency !== undefined)
        row.commission_currency = updates.commissionCurrency;
      if (updates.commissionDouble !== undefined)
        row.commission_double = updates.commissionDouble;
      if (updates.commissionSingle !== undefined)
        row.commission_single = updates.commissionSingle;
      if (updates.commissionFullpass !== undefined)
        row.commission_fullpass = updates.commissionFullpass;
      if (updates.language !== undefined) row.language = updates.language;
      if (updates.missionGoal !== undefined) row.mission_goal = updates.missionGoal;
      if (updates.missionReward !== undefined) row.mission_reward = updates.missionReward;
      if (updates.missionCurrency !== undefined)
        row.mission_currency = updates.missionCurrency;
      if (updates.active !== undefined) row.active = updates.active;
      if (updates.notes !== undefined) row.notes = updates.notes || null;
      if (updates.username !== undefined)
        row.username = updates.username?.trim().toLowerCase() || null;
      if (updates.accessCode !== undefined) row.access_code = updates.accessCode || null;
      if (updates.passwordHash !== undefined) row.password_hash = updates.passwordHash || null;
      if (updates.resetToken !== undefined) row.reset_token = updates.resetToken || null;
      if (updates.resetTokenExpires !== undefined) row.reset_token_expires = updates.resetTokenExpires || null;
      if (updates.inviteQuota !== undefined) row.invite_quota = updates.inviteQuota;
      if (updates.lastSeenAt !== undefined) row.last_seen_at = updates.lastSeenAt;
      const optionalCols = [
        "commission_type",
        "commission_currency",
        "commission_double",
        "commission_single",
        "commission_fullpass",
        "language",
        "mission_goal",
        "mission_reward",
        "mission_currency",
      ];
      let { data, error } = await supabase!
        .from("collaborators")
        .update(row)
        .eq("id", id)
        .select()
        .single();
      // Tolerate a DB that hasn't run supabase/commission.sql yet.
      if (error && optionalCols.some((c) => error!.message?.includes(c))) {
        for (const c of optionalCols) delete row[c];
        ({ data, error } = await supabase!
          .from("collaborators")
          .update(row)
          .eq("id", id)
          .select()
          .single());
      }
      if (error) throw error;
      return collabFromRow(data);
    } catch (e) {
      warn("updateCollaborator", e);
    }
  }
  const all = readStore<Collaborator>(COLLABS_KEY);
  const idx = all.findIndex((x) => x.id === id);
  if (idx === -1) return null;
  all[idx] = { ...all[idx], ...updates };
  writeStore(COLLABS_KEY, all);
  return all[idx];
}

export async function deleteCollaborator(id: string): Promise<boolean> {
  if (useDb()) {
    try {
      const { error } = await supabase!.from("collaborators").delete().eq("id", id);
      if (error) throw error;
      return true;
    } catch (e) {
      warn("deleteCollaborator", e);
    }
  }
  const all = readStore<Collaborator>(COLLABS_KEY);
  const filtered = all.filter((x) => x.id !== id);
  if (filtered.length === all.length) return false;
  writeStore(COLLABS_KEY, filtered);
  return true;
}

export interface CollaboratorStats {
  collaborator: Collaborator;
  invitesIssued: number;
  invitesRedeemed: number;
  bookings: number;
  ticketsSold: number; // sum of numPeople over attributed bookings
  /** Non-declined bookings split by pack type */
  singleRooms: number;
  doubleRooms: number;
  fullPass: number;
  /** Sales in the currency each pack is priced in — never converted */
  revenue: Money;
  /** Commission earned (% of sales, or fixed amount × people) */
  commission: Money;
}

export type GuestOrigin = "morocco" | "international" | "unknown";

/** Where a booking's guests come from. Country names are typed by hand
 *  (Morocco / Maroc / Marruecos / typos…), so we also fall back to the
 *  phone number: +212 or a local Moroccan mobile (06/07/6x/7x).
 *  When no country or phone is specified, defaults to "morocco". */
export function guestOrigin(booking: Booking): GuestOrigin {
  const c = (booking.country ?? "").trim().toLowerCase();
  if (c) {
    if (/^(ma|mar)$|maroc|marroc|morocc|morroc|marruecos|المغرب/.test(c)) return "morocco";
    return "international";
  }
  const digits = (booking.phone ?? "").replace(/[^\d+]/g, "");
  if (digits) {
    if (/^(\+?212)/.test(digits)) return "morocco";
    if (/^\+/.test(digits)) return "international"; // any other country code
    const local = digits.replace(/^0+/, "");
    if (/^[67]\d{8}$/.test(local)) return "morocco"; // 06…/07… mobile
  }
  // When country is unassigned, default to "morocco"
  return "morocco";
}

export type PackRoomCategory = "single" | "double" | "special" | "fullpass";

/** Calculate the expected number of guests for a pack (1, 2, 3, 4, etc.) */
export function packGuestCount(p?: Pack | null): number {
  if (!p) return 1;
  if (typeof p.numGuests === "number" && p.numGuests > 0) return p.numGuests;
  const combined = `${p.name} ${p.sub} ${p.category || ""}`.toLowerCase();
  if (/triple|3\s*pers|3\s*guests|3\s*personnes|3\s*people/.test(combined)) return 3;
  if (/quad|4\s*pers|4\s*guests|4\s*personnes|4\s*people/.test(combined)) return 4;
  if (/double|doble|couple|pareja|chambre\s*double|2\s*pers|2\s*guests|2\s*personnes|2\s*people/.test(combined)) return 2;
  return 1;
}

/** Classify a pack by its name, category, subtitle, or guest count:
 *  - 2 people / "Double Room" / "Chambre Double" / "Couple" -> "double"
 *  - 1 person with hotel/room / "Single Room" / "Chambre Single" -> "single"
 *  - 3+ people / "Special Pack" / "Triple" / "Quad" -> "special"
 *  - Full Pass / Party Pass without hotel room -> "fullpass"
 */
export function packRoomCategory(
  packOrName?: string | Pack | null,
  numGuests?: number
): PackRoomCategory {
  if (!packOrName) {
    if (numGuests === 2) return "double";
    if (numGuests && numGuests >= 3) return "double"; // All 3+ guests assigned to double room
    if (numGuests === 1) return "single";
    return "fullpass";
  }

  let name = "";
  let sub = "";
  let category = "";
  let guests = numGuests;

  if (typeof packOrName === "object") {
    name = packOrName.name || "";
    sub = packOrName.sub || "";
    category = packOrName.category || "";
    if (guests == null && packOrName.numGuests != null) {
      guests = packOrName.numGuests;
    }
  } else {
    name = packOrName;
  }

  const combined = `${name} ${sub} ${category}`.toLowerCase();

  // 1. 3+ guests or triple/quad/special -> assign to double room
  if (
    (guests && guests >= 3) ||
    /triple|quadruple|quad|special|spécial|3\s*pers|4\s*pers|5\s*pers|6\s*pers/i.test(combined) ||
    /special\s*pack|pack\s*spécial/i.test(category)
  ) {
    return "double";
  }

  // 2. 2 guests or double room / couple / chambre double
  if (
    guests === 2 ||
    /double|doble|couple|pareja|chambre\s*double|2\s*pers|2\s*guests|2\s*personnes|2\s*people/i.test(combined) ||
    /double\s*room|chambre\s*double/i.test(category)
  ) {
    return "double";
  }

  // 3. 1 guest or single room
  if (
    /single|simple|individual|chambre\s*single|1\s*pers|1\s*person/i.test(combined) ||
    /single\s*room|chambre\s*single/i.test(category)
  ) {
    return "single";
  }

  // 4. If name/sub/category mentions hotel or room
  if (/hotel|room|chambre|nuit|night|hébergement|alojamiento/i.test(combined)) {
    return guests === 1 ? "single" : "double";
  }

  return "fullpass";
}

/** Calculate total people for a booking based on numPeople, customerName splits (&), and room category (double room = 2 people min). */
export function bookingPeopleCount(booking: Booking, packs?: Pack[]): number {
  const pack = packs?.find((p) => p.id === booking.packId);
  const cat = packRoomCategory(pack || booking.packName, booking.numPeople);
  const guestCount = booking.customerName.split(/\s*&\s*/).filter(Boolean).length;
  const expectedPackGuests = packGuestCount(pack);
  let count = Math.max(booking.numPeople || 1, expectedPackGuests, guestCount);
  if (cat === "double") {
    count = Math.max(2, count);
  }
  return count;
}

// ─── Bracelets ──────────────────────────────────────────────────────

export type BraceletCategory = "artist" | "hotel" | "fullpass";

/** One bracelet per guest of a booking. Manual overrides (single value
 *  or JSON array per guest) win; otherwise automatic — room packs →
 *  hotel bracelet, everything else → full pass. */
export function guestBracelets(booking: Booking, packs: Pack[]): BraceletCategory[] {
  const count = Math.max(bookingPeopleCount(booking, packs), booking.numPeople || 1);
  const pack = packs.find((p) => p.id === booking.packId);
  const def: BraceletCategory =
    packRoomCategory(pack || booking.packName, booking.numPeople) === "fullpass" ? "fullpass" : "hotel";

  let overrides: Array<BraceletCategory | null> = [];
  if (booking.bracelet) {
    try {
      const parsed = JSON.parse(booking.bracelet);
      overrides = Array.isArray(parsed) ? parsed : [];
    } catch {
      // legacy single value applies to every guest
      overrides = Array(count).fill(booking.bracelet as BraceletCategory);
    }
  }
  return Array.from({ length: count }, (_, i) => overrides[i] ?? def);
}

/** Set one guest's bracelet; the whole per-guest array is persisted. */
export async function setGuestBracelet(
  booking: Booking,
  guestIndex: number,
  value: BraceletCategory,
  packs: Pack[]
): Promise<void> {
  const arr = guestBracelets(booking, packs);
  arr[guestIndex] = value;
  await updateBookingBracelet(booking.id, JSON.stringify(arr));
}

/** Has each guest of the booking received their bracelet? */
export function guestBraceletsGiven(booking: Booking): boolean[] {
  const count = Math.max(1, booking.numPeople || 1);
  let given: boolean[] = [];
  if (booking.braceletGiven) {
    try {
      const parsed = JSON.parse(booking.braceletGiven);
      if (Array.isArray(parsed)) given = parsed.map(Boolean);
    } catch {
      /* treat as none given */
    }
  }
  return Array.from({ length: count }, (_, i) => given[i] ?? false);
}

/** True when the bracelet_given column exists (supabase/bracelet-given.sql). */
export async function braceletGivenColumnReady(): Promise<boolean> {
  if (!useDb()) return true;
  const { error } = await supabase!.from("bookings").select("bracelet_given").limit(1);
  return !error;
}

/** True when the room_number column exists (supabase/room-number.sql). */
export async function roomNumberColumnReady(): Promise<boolean> {
  if (!useDb()) return true;
  const { error } = await supabase!.from("bookings").select("room_number").limit(1);
  return !error;
}

/** Set (or clear) the real hotel room number of a booking. */
export async function updateBookingRoomNumber(
  id: string,
  roomNumber: string | null
): Promise<void> {
  const value = roomNumber?.trim() || null;
  if (useDb() && !isLocalId(id)) {
    const { error } = await supabase!
      .from("bookings")
      .update({ room_number: value })
      .eq("id", id);
    if (error) {
      warn("updateBookingRoomNumber", error);
      if (/room_number/i.test(error.message ?? "")) {
        throw new Error(
          "The room_number column doesn't exist yet — run supabase/room-number.sql in the Supabase SQL Editor."
        );
      }
      throw new Error(error.message || "Could not save the room number.");
    }
    return;
  }
  const bookings = readStore<Booking>(BOOKINGS_KEY);
  const idx = bookings.findIndex((b) => b.id === id);
  if (idx !== -1) {
    bookings[idx] = { ...bookings[idx], roomNumber: value };
    writeStore(BOOKINGS_KEY, bookings);
  }
}

export interface RoomTypeOption {
  id: string;
  label: string;
  capacity?: number;
}

export const ROOM_TYPES: RoomTypeOption[] = [
  { id: "Vue sur mer", label: "Vue sur mer", capacity: 60 },
  { id: "Vue sur piscine", label: "Vue sur piscine", capacity: 60 },
  { id: "Vue normal", label: "Vue normal", capacity: 60 },
  { id: "Twin normal", label: "Twin normal", capacity: 50 },
  { id: "Twin vue sur mer", label: "Twin vue sur mer", capacity: 30 },
  { id: "Triple", label: "Triple", capacity: 10 },
  { id: "Duplexe junior", label: "Duplexe junior", capacity: 18 },
  { id: "Duplexe senior", label: "Duplexe senior", capacity: 2 },
];

/** True when the room_type column exists (supabase/room-type.sql). */
export async function roomTypeColumnReady(): Promise<boolean> {
  if (!useDb()) return true;
  const { error } = await supabase!.from("bookings").select("room_type").limit(1);
  return !error;
}

/** Set (or clear) the hotel room type of a booking. */
export async function updateBookingRoomType(
  id: string,
  roomType: string | null
): Promise<void> {
  const value = roomType?.trim() || null;
  if (useDb() && !isLocalId(id)) {
    const { error } = await supabase!
      .from("bookings")
      .update({ room_type: value })
      .eq("id", id);
    if (error) {
      warn("updateBookingRoomType", error);
      if (/room_type/i.test(error.message ?? "")) {
        throw new Error(
          "The room_type column doesn't exist yet — run supabase/room-type.sql in the Supabase SQL Editor."
        );
      }
      throw new Error(error.message || "Could not save the room type.");
    }
    return;
  }
  const bookings = readStore<Booking>(BOOKINGS_KEY);
  const idx = bookings.findIndex((b) => b.id === id);
  if (idx !== -1) {
    bookings[idx] = { ...bookings[idx], roomType: value };
    writeStore(BOOKINGS_KEY, bookings);
  }
}

export interface GuestDetail {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  origin?: "morocco" | "international";
  notes?: string;
}

export interface ClientGuest {
  id: string;
  bookingId: string;
  guestIndex: number;
  firstName: string;
  lastName: string;
  fullName: string;
  email: string;
  phone: string;
  origin: "morocco" | "international";
  country: string;
  ticketCode: string;
  packName: string;
  roomNumber?: string | null;
  roomType?: string | null;
  status: BookingStatus;
  collaboratorName?: string;
  notes?: string;
  createdAt: string;
}

/** True when the guest_details column exists (supabase/guest-details.sql). */
export async function guestDetailsColumnReady(): Promise<boolean> {
  if (!useDb()) return true;
  const { error } = await supabase!.from("bookings").select("guest_details").limit(1);
  return !error;
}

/** Set (or update) the per-guest details JSON of a booking. */
export async function updateBookingGuestDetails(
  id: string,
  guestDetails: string | null
): Promise<void> {
  const value = guestDetails?.trim() || null;
  if (useDb() && !isLocalId(id)) {
    const { error } = await supabase!
      .from("bookings")
      .update({ guest_details: value })
      .eq("id", id);
    if (error) {
      warn("updateBookingGuestDetails", error);
      if (/guest_details/i.test(error.message ?? "")) {
        throw new Error(
          "The guest_details column doesn't exist yet — run supabase/guest-details.sql in the Supabase SQL Editor."
        );
      }
      throw new Error(error.message || "Could not save guest details.");
    }
    return;
  }
  const bookings = readStore<Booking>(BOOKINGS_KEY);
  const idx = bookings.findIndex((b) => b.id === id);
  if (idx !== -1) {
    bookings[idx] = { ...bookings[idx], guestDetails: value };
    writeStore(BOOKINGS_KEY, bookings);
  }
}

/** Parse per-guest details array stored in guestDetails JSON. */
export function parseGuestDetails(raw?: string | null): GuestDetail[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/** Extracts every individual client guest from all bookings, merging per-guest overrides. */
export function getClients(
  bookings: Booking[],
  packs: Pack[] = [],
  collaborators: Collaborator[] = []
): ClientGuest[] {
  const clients: ClientGuest[] = [];

  for (const b of bookings) {
    if (b.status === "declined") continue;
    const count = bookingPeopleCount(b, packs);
    const overrides = parseGuestDetails(b.guestDetails);
    const partner = b.collaboratorId
      ? collaborators.find((c) => c.id === b.collaboratorId)
      : undefined;
    const names = b.customerName
      .split(/\s*&\s*/)
      .map((g) => g.trim())
      .filter(Boolean);

    const defaultOrigin = guestOrigin(b);

    for (let gi = 0; gi < count; gi++) {
      const ov = overrides[gi] ?? {};
      const rawName = (names[gi] ?? names[0] ?? b.customerName).trim();
      const parts = rawName.split(/\s+/);

      const firstName = ov.firstName !== undefined ? ov.firstName : (parts[0] ?? "");
      const lastName =
        ov.lastName !== undefined ? ov.lastName : parts.slice(1).join(" ");
      const fullName = `${firstName} ${lastName}`.trim() || rawName;

      const email = ov.email !== undefined ? ov.email : (gi === 0 ? b.email : "");
      const phone = ov.phone !== undefined ? ov.phone : (gi === 0 ? b.phone : "");
      const origin: "morocco" | "international" =
        ov.origin ? ov.origin : defaultOrigin === "international" ? "international" : "morocco";
      const notes = ov.notes !== undefined ? ov.notes : (gi === 0 ? b.notes : "");

      clients.push({
        id: `${b.id}-${gi}`,
        bookingId: b.id,
        guestIndex: gi,
        firstName,
        lastName,
        fullName,
        email,
        phone,
        origin,
        country: b.country || (origin === "morocco" ? "Morocco" : "Étranger"),
        ticketCode: b.ticketCode,
        packName: b.packName,
        roomNumber: b.roomNumber,
        roomType: b.roomType,
        status: b.status,
        collaboratorName: partner ? `${partner.name} (${partner.code})` : "Direct",
        notes,
        createdAt: b.createdAt,
      });
    }
  }

  return clients.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

/** Toggle one guest's "bracelet received" flag. */
export async function setGuestBraceletGiven(
  booking: Booking,
  guestIndex: number,
  given: boolean
): Promise<void> {
  const arr = guestBraceletsGiven(booking);
  arr[guestIndex] = given;
  const value = JSON.stringify(arr);
  if (useDb() && !isLocalId(booking.id)) {
    const { error } = await supabase!
      .from("bookings")
      .update({ bracelet_given: value })
      .eq("id", booking.id);
    if (error) {
      warn("setGuestBraceletGiven", error);
      if (/bracelet_given/i.test(error.message ?? "")) {
        throw new Error(
          "The bracelet_given column doesn't exist yet — run supabase/bracelet-given.sql in the Supabase SQL Editor."
        );
      }
      throw new Error(error.message || "Could not save the bracelet status.");
    }
    return;
  }
  const bookings = readStore<Booking>(BOOKINGS_KEY);
  const idx = bookings.findIndex((b) => b.id === booking.id);
  if (idx !== -1) {
    bookings[idx] = { ...bookings[idx], braceletGiven: value };
    writeStore(BOOKINGS_KEY, bookings);
  }
}

/** True when the bracelet column exists (supabase/bracelets.sql). */
export async function braceletColumnReady(): Promise<boolean> {
  if (!useDb()) return true;
  const { error } = await supabase!.from("bookings").select("bracelet").limit(1);
  return !error;
}

/** Set (or clear with null) a booking's raw bracelet value. */
export async function updateBookingBracelet(
  id: string,
  bracelet: string | null
): Promise<void> {
  if (useDb() && !isLocalId(id)) {
    const { error } = await supabase!.from("bookings").update({ bracelet }).eq("id", id);
    if (error) {
      warn("updateBookingBracelet", error);
      if (/bracelet/i.test(error.message ?? "")) {
        throw new Error(
          "The bracelet column doesn't exist yet — run supabase/bracelets.sql in the Supabase SQL Editor."
        );
      }
      throw new Error(error.message || "Could not save the bracelet category.");
    }
    return;
  }
  const bookings = readStore<Booking>(BOOKINGS_KEY);
  const idx = bookings.findIndex((b) => b.id === id);
  if (idx !== -1) {
    bookings[idx] = { ...bookings[idx], bracelet };
    writeStore(BOOKINGS_KEY, bookings);
  }
}

/** Money kept per currency — never converted, so euro sales and dirham
 *  sales stay separate and honest. */
export interface Money {
  eur: number;
  mad: number;
}

export const emptyMoney = (): Money => ({ eur: 0, mad: 0 });

export const addMoney = (a: Money, b: Money): Money => ({
  eur: a.eur + b.eur,
  mad: a.mad + b.mad,
});

/** A pack's price in its own currency. */
export function packPrice(pack: Pack | undefined): {
  amount: number;
  currency: CommissionCurrency;
} {
  if (!pack) return { amount: 0, currency: "EUR" };
  const amount = parseInt(pack.price, 10) || 0;
  return {
    amount,
    currency: /mad|dh/i.test(pack.currency ?? "") ? "MAD" : "EUR",
  };
}

/** "€1,234" or "1,234 MAD" */
export function formatMoney(value: number, currency: CommissionCurrency = "EUR"): string {
  const n = value.toLocaleString();
  return currency === "MAD" ? `${n} MAD` : `€${n}`;
}

/** "€1,234", "8,250 MAD", "€1,234 + 8,250 MAD" or "€0" — never converts. */
export function formatMoneyPair(m: Money): string {
  const parts: string[] = [];
  if (m.eur) parts.push(formatMoney(m.eur, "EUR"));
  if (m.mad) parts.push(formatMoney(m.mad, "MAD"));
  return parts.length ? parts.join(" + ") : "€0";
}

/** Rate used only to state a partner's figures in THEIR currency
 *  (a euro partner sees euros, a dirham partner sees dirhams).
 *  Edit this single value if the rate moves. */
export const EUR_TO_MAD = 10;

/** The one currency a partner is accounted in — the currency of their
 *  commission deal. All their amounts are shown in it. */
export function partnerCurrency(c: Collaborator): CommissionCurrency {
  return c.commissionCurrency ?? "EUR";
}

/** Express a per-currency amount as a single figure in one currency. */
export function moneyIn(m: Money, currency: CommissionCurrency): number {
  const value =
    currency === "MAD" ? m.mad + m.eur * EUR_TO_MAD : m.eur + m.mad / EUR_TO_MAD;
  return Math.round(value * 100) / 100;
}

/** A partner's amount, written in their own currency: "300 MAD" / "€750". */
export function formatForPartner(m: Money, c: Collaborator): string {
  const cur = partnerCurrency(c);
  return formatMoney(moneyIn(m, cur), cur);
}

/** Per-person rate for one pack category, falling back to the general amount. */
export function perPersonRate(c: Collaborator, cat: PackRoomCategory): number {
  const v =
    cat === "double"
      ? c.commissionDouble
      : cat === "single"
        ? c.commissionSingle
        : cat === "special"
          ? (c.commissionDouble ?? c.commissionSingle ?? c.commissionFullpass)
          : c.commissionFullpass;
  return v ?? c.commission ?? 0;
}

/** Human label of a collaborator's deal: "10%", "50 MAD / person" or the
 *  split rates when they differ per category. */
export function commissionLabel(c: Collaborator): string {
  if ((c.commissionType ?? "percent") === "per_person") {
    const cur = c.commissionCurrency ?? "EUR";
    const d = perPersonRate(c, "double");
    const s = perPersonRate(c, "single");
    const f = perPersonRate(c, "fullpass");
    if (d === s && s === f) return `${formatMoney(d, cur)} / person`;
    return `${formatMoney(d, cur)} double · ${formatMoney(s, cur)} single · ${formatMoney(f, cur)} full pass`;
  }
  return `${c.commission ?? 0}%`;
}

/** Commission earned by a collaborator over the given bookings.
 *  Basis: non-declined bookings that came through their link (free
 *  invite tickets don't pay commission).
 *  - percent:    % of the € sales value
 *  - per_person: fixed amount × number of people, in € or MAD
 *
 *  When the collaborator has a mission (missionGoal > 0), their FIRST
 *  sales only fill the mission — no commission on them. Commission
 *  starts on the bookings that come after the goal is reached. A
 *  booking that crosses the goal line is consumed by the mission. */
export function isTourismBooking(b: Booking): boolean {
  if (b.packId?.startsWith("tour-")) return true;
  const name = (b.packName || "").toLowerCase();
  if (name.includes("tourism") || name.includes("excursion")) return true;
  if (name.includes("asilah") || name.includes("asella")) return true;
  if (name.includes("chefchaouen") || name.includes("chawan") || name.includes("chaouen")) return true;
  if (name.includes("tangier") && !name.includes("solazur") && !name.includes("hotel") && !name.includes("room")) return true;
  return false;
}

export function getTourismPrice(tourIdOrName: string | null | undefined): number {
  if (!tourIdOrName) return 15;
  const s = tourIdOrName.toLowerCase();
  if (s.includes("chefchaouen") || s.includes("chawan") || s.includes("chaouen")) {
    return 30;
  }
  if (s.includes("asilah") || s.includes("asella")) {
    return 25;
  }
  return 15; // Tangier
}

export function normalizePhone(phone: string | null | undefined): string {
  if (!phone) return "";
  return phone.replace(/\D/g, "");
}

/** Auto-link database query to find a matching master festival pack booking */
export async function findMatchingFestivalBooking(query: {
  phone?: string | null;
  email?: string | null;
  name?: string | null;
}): Promise<Booking | undefined> {
  const bookings = await getBookings();
  const festivalBookings = bookings.filter((b) => !isTourismBooking(b) && b.status !== "declined");

  const cleanPhone = normalizePhone(query.phone);
  const cleanEmail = (query.email || "").trim().toLowerCase();
  const cleanName = (query.name || "").trim().toLowerCase();

  // 1. Match by phone (last 8 digits)
  if (cleanPhone.length >= 6) {
    const last8 = cleanPhone.slice(-8);
    const byPhone = festivalBookings.find((b) => {
      const bPhone = normalizePhone(b.phone);
      if (bPhone.length < 6) return false;
      return bPhone.endsWith(last8) || last8.endsWith(bPhone.slice(-8));
    });
    if (byPhone) return byPhone;
  }

  // 2. Match by email
  if (cleanEmail && cleanEmail.includes("@")) {
    const byEmail = festivalBookings.find(
      (b) => (b.email || "").trim().toLowerCase() === cleanEmail
    );
    if (byEmail) return byEmail;
  }

  // 3. Match by name
  if (cleanName && cleanName.length >= 4) {
    const byName = festivalBookings.find((b) => {
      const bName = (b.customerName || "").trim().toLowerCase();
      if (bName === cleanName) return true;
      if (bName.includes(cleanName) || cleanName.includes(bName)) return true;
      if (b.guestDetails) {
        try {
          const guests = JSON.parse(b.guestDetails);
          if (Array.isArray(guests)) {
            return guests.some((g) => {
              const fullName = `${g.firstName || ""} ${g.lastName || ""}`.trim().toLowerCase();
              return fullName === cleanName || fullName.includes(cleanName);
            });
          }
        } catch {}
      }
      return false;
    });
    if (byName) return byName;
  }

  return undefined;
}

/** Commission earned by a collaborator over the given bookings.
 *  - Tourism bookings earn a fixed €5 per person/ticket.
 *  - Festival Pack bookings earn their configured rate (% or per person).
 */
export function collaboratorCommission(
  c: Collaborator,
  bookings: Booking[],
  packs: Pack[],
  discountCodes: DiscountCode[] = []
): Money {
  const mine = bookings
    .filter(
      (b) => b.collaboratorId === c.id && b.status !== "declined" && b.source !== "invite"
    )
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

  const goal = c.missionGoal ?? 0;
  let missionPeopleConsumed = 0;
  const cur = c.commissionCurrency ?? "EUR";

  return mine.reduce((acc, b) => {
    const totalPeopleInBooking = b.numPeople || 1;

    // Special rule for Tourism Excursions: fixed €5 per person commission
    if (isTourismBooking(b)) {
      const commValue = 5 * totalPeopleInBooking;
      return { ...acc, eur: acc.eur + commValue };
    }

    // Determine how many people from this booking go to the mission vs earn commission
    let commissionablePeople = totalPeopleInBooking;
    if (goal > 0 && missionPeopleConsumed < goal) {
      const neededForMission = goal - missionPeopleConsumed;
      const consumedFromThisBooking = Math.min(totalPeopleInBooking, neededForMission);
      missionPeopleConsumed += consumedFromThisBooking;
      commissionablePeople = totalPeopleInBooking - consumedFromThisBooking;
    }

    if (commissionablePeople <= 0) {
      return acc; // All people in this booking were consumed by the mission
    }

    // Find discount code if used on this booking
    const disc = b.discountCode
      ? discountCodes.find(
          (d) =>
            d.code.toUpperCase() === b.discountCode?.toUpperCase() ||
            d.id === b.discountCodeId
        )
      : undefined;

    // Check if the discount code overrides collaborator commission (e.g. lowered to €10)
    if (disc && disc.commissionOverride != null) {
      const overrideVal = disc.commissionOverride;
      const type = disc.commissionType ?? "fixed";
      if (type === "percent") {
        const pack = packs.find((x) => x.id === b.packId);
        const { amount, currency } = packPrice(pack);
        const perPersonDiscount = (b.discountAmount || 0) / totalPeopleInBooking;
        const netPerPerson = Math.max(0, amount - perPersonDiscount);
        const saleValue = netPerPerson * commissionablePeople;
        const commValue = Math.round(saleValue * (overrideVal / 100) * 100) / 100;
        return currency === "MAD"
          ? { ...acc, mad: acc.mad + commValue }
          : { ...acc, eur: acc.eur + commValue };
      } else {
        // Fixed amount override (e.g., €10 per person)
        const commValue = Math.round(overrideVal * commissionablePeople * 100) / 100;
        return cur === "MAD"
          ? { ...acc, mad: acc.mad + commValue }
          : { ...acc, eur: acc.eur + commValue };
      }
    }

    // Standard collaborator commission calculation
    if ((c.commissionType ?? "percent") === "per_person") {
      const pack = packs.find((x) => x.id === b.packId);
      const cat = packRoomCategory(pack?.name ?? b.packName);
      const rate = perPersonRate(c, cat);
      const amount = Math.round(rate * commissionablePeople * 100) / 100;
      return cur === "MAD"
        ? { ...acc, mad: acc.mad + amount }
        : { ...acc, eur: acc.eur + amount };
    } else {
      const pct = (c.commission ?? 0) / 100;
      const pack = packs.find((x) => x.id === b.packId);
      const { amount, currency } = packPrice(pack);
      const perPersonDiscount = (b.discountAmount || 0) / totalPeopleInBooking;
      const netPerPerson = Math.max(0, amount - perPersonDiscount);
      const value = netPerPerson * commissionablePeople;
      const commValue = Math.round(value * pct * 100) / 100;
      return currency === "MAD"
        ? { ...acc, mad: acc.mad + commValue }
        : { ...acc, eur: acc.eur + commValue };
    }
  }, emptyMoney());
}

/** Separate Tourism commission (€5/person in EUR) */
export function collaboratorTourismCommission(
  collaboratorId: string,
  bookings: Booking[]
): number {
  return bookings
    .filter(
      (b) =>
        b.collaboratorId === collaboratorId &&
        b.status !== "declined" &&
        isTourismBooking(b)
    )
    .reduce((sum, b) => sum + (b.numPeople || 1) * 5, 0);
}

/** Separate Tourism revenue in EUR */
export function collaboratorTourismRevenue(
  collaboratorId: string,
  bookings: Booking[]
): number {
  return bookings
    .filter(
      (b) =>
        b.collaboratorId === collaboratorId &&
        b.status !== "declined" &&
        isTourismBooking(b)
    )
    .reduce((sum, b) => {
      const unitPrice = getTourismPrice(b.packId || b.packName);
      return sum + unitPrice * (b.numPeople || 1);
    }, 0);
}

/** Separate Festival Pack commission */
export function collaboratorFestivalCommission(
  c: Collaborator,
  bookings: Booking[],
  packs: Pack[],
  discountCodes: DiscountCode[] = []
): Money {
  const festivalBookings = bookings.filter((b) => !isTourismBooking(b));
  return collaboratorCommission(c, festivalBookings, packs, discountCodes);
}

/** Sum bookings by the currency their pack is actually priced in. */
function salesOf(bookings: Booking[], packs: Pack[]): Money {
  return bookings.reduce((acc, b) => {
    if (isTourismBooking(b)) {
      const unitPrice = getTourismPrice(b.packId || b.packName);
      const value = unitPrice * (b.numPeople || 1);
      return { ...acc, eur: acc.eur + value };
    }
    const { amount, currency } = packPrice(packs.find((p) => p.id === b.packId));
    const grossValue = amount * (b.numPeople || 1);
    const value = Math.max(0, grossValue - (b.discountAmount || 0));
    return currency === "MAD"
      ? { ...acc, mad: acc.mad + value }
      : { ...acc, eur: acc.eur + value };
  }, emptyMoney());
}

/** Sales attributed to one collaborator, split by currency (never
 *  converted): non-declined, non-invite bookings × pack price. */
export function collaboratorRevenue(
  collaboratorId: string,
  bookings: Booking[],
  packs: Pack[]
): Money {
  return salesOf(
    bookings.filter(
      (b) =>
        b.collaboratorId === collaboratorId &&
        b.status !== "declined" &&
        b.source !== "invite"
    ),
    packs
  );
}

export async function getCollaboratorStats(): Promise<CollaboratorStats[]> {
  const [collaborators, invites, bookings, packs, discountCodes] = await Promise.all([
    getCollaborators(),
    getInvites(),
    getBookings(),
    getPacks(),
    getDiscountCodes(),
  ]);
  return collaborators.map((c) => {
    const myInvites = invites.filter((i) => i.collaboratorId === c.id);
    const myBookings = bookings.filter(
      (b) => b.collaboratorId === c.id && b.status !== "declined"
    );
    const revenue = salesOf(
      myBookings.filter((b) => b.source !== "invite"),
      packs
    );
    const earned = collaboratorCommission(c, bookings, packs, discountCodes);
    const catOf = (b: Booking) => {
      const p = packs.find((x) => x.id === b.packId);
      return packRoomCategory(p?.name ?? b.packName);
    };
    return {
      collaborator: c,
      invitesIssued: myInvites.length,
      invitesRedeemed: myInvites.filter((i) => i.used).length,
      bookings: myBookings.length,
      ticketsSold: myBookings.reduce((s, b) => s + (b.numPeople || 1), 0),
      singleRooms: myBookings.filter((b) => catOf(b) === "single").length,
      doubleRooms: myBookings.filter((b) => catOf(b) === "double").length,
      fullPass: myBookings.filter((b) => catOf(b) === "fullpass").length,
      revenue,
      commission: earned,
    };
  });
}

// ─── Referral tracking (public site) ────────────────────────────────

const REF_KEY = "tlf_ref_code";

/** Remember a ?ref= code so later bookings are attributed to it. */
export function rememberReferral(code: string): void {
  if (typeof window === "undefined" || !code) return;
  localStorage.setItem(REF_KEY, code.trim().toUpperCase());
}

export function getRememberedReferral(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(REF_KEY);
}

// ─── Stats Helpers ──────────────────────────────────────────────────

export async function getStats() {
  const [bookings, packs] = await Promise.all([getBookings(), getPacks()]);

  const totalBookings = bookings.length;
  const pendingBookings = bookings.filter((b) => b.status === "pending").length;
  const confirmedBookings = bookings.filter((b) => b.status === "confirmed").length;
  const checkedIn = bookings.filter((b) => b.status === "checked-in").length;

  // Split by the currency each pack is priced in — never converted.
  const totalRevenue = salesOf(
    bookings.filter((b) => b.status !== "declined"),
    packs
  );

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
