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
  /** Display position on the website (lower = earlier); null = unordered */
  sortOrder?: number | null;
  createdAt: string;
}

export type BookingStatus = "pending" | "confirmed" | "checked-in" | "declined";
export type BookingSource = "manual" | "website" | "invite" | "referral";

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
  departureDate?: string | null;
  status: BookingStatus;
  source?: BookingSource;
  collaboratorId?: string | null;
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
  collaboratorId?: string | null;
  createdAt: string;
}

export type CommissionType = "percent" | "per_person";
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
  /** Portal UI language; the partner's guest links open the site in it too */
  language?: PartnerLanguage;
  /** Bonus mission: bring missionGoal people → win missionReward (null/0 goal = none) */
  missionGoal?: number | null;
  missionReward?: number;
  missionCurrency?: CommissionCurrency;
  active: boolean;
  notes?: string;
  /** Partner Portal login (optional — no account without it) */
  username?: string;
  accessCode?: string;
  /** Max invites they may generate in the portal; null/undefined = unlimited */
  inviteQuota?: number | null;
  lastSeenAt?: string | null;
  createdAt: string;
}

// ─── Keys (localStorage fallback) ───────────────────────────────────

const PACKS_KEY = "tlf_admin_packs";
const BOOKINGS_KEY = "tlf_admin_bookings";
const INVITES_KEY = "tlf_admin_invites";
const COLLABS_KEY = "tlf_admin_collaborators";
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
export function partnerShareLink(code: string): string {
  const host = typeof window !== "undefined" ? window.location.host : "";
  if (host.endsWith("tangierlatinfestival.com")) {
    return `https://tickets.tangierlatinfestival.com/${code}`;
  }
  const base = typeof window !== "undefined" ? window.location.origin : "";
  return `${base}/book?ref=${code}`;
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
  if (p.sortOrder !== undefined) row.sort_order = p.sortOrder;
  return row;
};

const bookingFromRow = (r: any): Booking => ({
  id: r.id,
  ticketCode: r.ticket_code,
  packId: r.pack_id ?? "",
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
  status: (r.status as BookingStatus) ?? "pending",
  source: (r.source as BookingSource) ?? undefined,
  collaboratorId: r.collaborator_id ?? null,
  inviteId: r.invite_id ?? undefined,
  inviteCode: r.invite_code ?? undefined,
  createdAt: r.created_at,
});

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
  language: (r.language as PartnerLanguage) ?? "en",
  missionGoal: r.mission_goal ?? null,
  missionReward: r.mission_reward != null ? Number(r.mission_reward) : 0,
  missionCurrency: (r.mission_currency as CommissionCurrency) ?? "EUR",
  active: !!r.active,
  notes: r.notes ?? undefined,
  username: r.username ?? undefined,
  accessCode: r.access_code ?? undefined,
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
    name: "Chambre double",
    sub: "SOLAZUR HOTEL TANGIER (2 NIGHTS)",
    price: "335",
    currency: "€",
    features: ["2 NIGHTS", "BREAKFAST", "DINNER", "FULL PASS"],
    popular: false,
    active: true,
    category: "Chambre double",
  },
  {
    name: "Chambre double",
    sub: "SOLAZUR HOTEL TANGIER (3 NIGHTS)",
    price: "385",
    currency: "€",
    features: ["3 NIGHTS", "BREAKFAST", "DINNER", "FULL PASS"],
    popular: true,
    active: true,
    category: "Chambre double",
  },
  {
    name: "Chambre double",
    sub: "SOLAZUR HOTEL TANGIER (4 NIGHTS)",
    price: "435",
    currency: "€",
    features: ["4 NIGHTS", "BREAKFAST", "DINNER", "FULL PASS"],
    popular: false,
    active: true,
    category: "Chambre double",
  },
  {
    name: "Chambre single",
    sub: "SOLAZUR HOTEL TANGIER (2 NIGHTS)",
    price: "435",
    currency: "€",
    features: ["2 NIGHTS", "BREAKFAST", "DINNER", "FULL PASS"],
    popular: false,
    active: true,
    category: "Chambre single",
  },
  {
    name: "Chambre single",
    sub: "SOLAZUR HOTEL TANGIER (3 NIGHTS)",
    price: "535",
    currency: "€",
    features: ["3 NIGHTS", "BREAKFAST", "DINNER", "FULL PASS"],
    popular: false,
    active: true,
    category: "Chambre single",
  },
  {
    name: "Chambre single",
    sub: "SOLAZUR HOTEL TANGIER (4 NIGHTS)",
    price: "635",
    currency: "€",
    features: ["4 NIGHTS", "BREAKFAST", "DINNER", "FULL PASS"],
    popular: false,
    active: true,
    category: "Chambre single",
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
  return (await getPacks()).filter((p) => p.active);
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
  booking: Omit<Booking, "id" | "ticketCode" | "createdAt">
): Promise<Booking> {
  const ticketCode = generateTicketCode();
  if (useDb()) {
    try {
      const data = await insertRow(
        "bookings",
        {
          ticket_code: ticketCode,
          pack_id: booking.packId || null,
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
          status: booking.status,
          source: booking.source ?? "manual",
          collaborator_id: booking.collaboratorId ?? null,
          invite_id: booking.inviteId ?? null,
          invite_code: booking.inviteCode ?? null,
        },
        ["source", "collaborator_id", "arrival_date", "departure_date"]
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
  const wanted = code.trim().toUpperCase();
  return (await getCollaborators()).find((c) => c.code.toUpperCase() === wanted && c.active);
}

export async function getCollaboratorById(id: string): Promise<Collaborator | undefined> {
  return (await getCollaborators()).find((c) => c.id === id);
}

export async function countInvitesByCollaborator(collaboratorId: string): Promise<number> {
  return (await getInvites()).filter((i) => i.collaboratorId === collaboratorId).length;
}

/** Partner Portal login: username + access code against active collaborators. */
export async function partnerLogin(
  username: string,
  accessCode: string
): Promise<{ success: true; collaborator: Collaborator } | { success: false; error: string }> {
  const u = username.trim().toLowerCase();
  const all = await getCollaborators();
  const found = all.find((c) => (c.username ?? "").toLowerCase() === u);
  if (!found || !found.accessCode || found.accessCode !== accessCode.trim()) {
    return { success: false, error: "Wrong username or access code." };
  }
  if (!found.active) {
    return { success: false, error: "This account has been deactivated. Contact the festival team." };
  }
  // Best-effort "last active" stamp — ignore failures.
  updateCollaborator(found.id, { lastSeenAt: new Date().toISOString() }).catch(() => {});
  return { success: true, collaborator: found };
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
          language: c.language ?? "en",
          mission_goal: c.missionGoal ?? null,
          mission_reward: c.missionReward ?? 0,
          mission_currency: c.missionCurrency ?? "EUR",
          active: c.active,
          notes: c.notes || null,
          username: c.username?.trim().toLowerCase() || null,
          access_code: c.accessCode || null,
          invite_quota: c.inviteQuota ?? null,
        },
        [
          "username",
          "access_code",
          "invite_quota",
          "commission_type",
          "commission_currency",
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
      if (updates.inviteQuota !== undefined) row.invite_quota = updates.inviteQuota;
      if (updates.lastSeenAt !== undefined) row.last_seen_at = updates.lastSeenAt;
      const optionalCols = [
        "commission_type",
        "commission_currency",
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
  revenue: number;
  /** Commission earned (% of sales, or fixed amount × people) */
  commission: number;
  commissionCurrency: CommissionCurrency;
}

export type PackRoomCategory = "single" | "double" | "fullpass";

/** Classify a pack by its name: single room / double room / full pass. */
export function packRoomCategory(packName: string): PackRoomCategory {
  const n = packName.toLowerCase();
  if (/single|simple|individual/.test(n)) return "single";
  if (/double|doble/.test(n)) return "double";
  return "fullpass";
}

/** "€1,234" or "1,234 MAD" */
export function formatMoney(value: number, currency: CommissionCurrency = "EUR"): string {
  const n = value.toLocaleString();
  return currency === "MAD" ? `${n} MAD` : `€${n}`;
}

/** Human label of a collaborator's deal: "10%" or "50 MAD / person" */
export function commissionLabel(c: Collaborator): string {
  if ((c.commissionType ?? "percent") === "per_person") {
    return `${formatMoney(c.commission ?? 0, c.commissionCurrency ?? "EUR")} / person`;
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
export function collaboratorCommission(
  c: Collaborator,
  bookings: Booking[],
  packs: Pack[]
): { amount: number; currency: CommissionCurrency } {
  let mine = bookings
    .filter(
      (b) => b.collaboratorId === c.id && b.status !== "declined" && b.source !== "invite"
    )
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

  const goal = c.missionGoal ?? 0;
  if (goal > 0) {
    let counted = 0;
    mine = mine.filter((b) => {
      if (counted < goal) {
        counted += b.numPeople || 1;
        return false; // consumed by the mission
      }
      return true;
    });
  }

  if ((c.commissionType ?? "percent") === "per_person") {
    const people = mine.reduce((s, b) => s + (b.numPeople || 1), 0);
    return {
      amount: (c.commission ?? 0) * people,
      currency: c.commissionCurrency ?? "EUR",
    };
  }
  const priceOf = (packId: string) => {
    const p = packs.find((x) => x.id === packId);
    return p ? parseInt(p.price, 10) || 0 : 0;
  };
  const revenue = mine.reduce((s, b) => s + priceOf(b.packId) * (b.numPeople || 1), 0);
  return {
    amount: Math.round(revenue * ((c.commission ?? 0) / 100) * 100) / 100,
    currency: "EUR",
  };
}

/** Sales revenue (€) attributed to one collaborator: non-declined,
 *  non-invite bookings × pack price. Shared by admin and the portal. */
export function collaboratorRevenue(
  collaboratorId: string,
  bookings: Booking[],
  packs: Pack[]
): number {
  const priceOf = (packId: string) => {
    const p = packs.find((x) => x.id === packId);
    return p ? parseInt(p.price, 10) || 0 : 0;
  };
  return bookings
    .filter(
      (b) =>
        b.collaboratorId === collaboratorId &&
        b.status !== "declined" &&
        b.source !== "invite"
    )
    .reduce((s, b) => s + priceOf(b.packId) * (b.numPeople || 1), 0);
}

export async function getCollaboratorStats(): Promise<CollaboratorStats[]> {
  const [collaborators, invites, bookings, packs] = await Promise.all([
    getCollaborators(),
    getInvites(),
    getBookings(),
    getPacks(),
  ]);
  const priceOf = (packId: string) => {
    const p = packs.find((x) => x.id === packId);
    return p ? parseInt(p.price, 10) || 0 : 0;
  };
  return collaborators.map((c) => {
    const myInvites = invites.filter((i) => i.collaboratorId === c.id);
    const myBookings = bookings.filter(
      (b) => b.collaboratorId === c.id && b.status !== "declined"
    );
    const revenue = myBookings
      .filter((b) => b.source !== "invite")
      .reduce((s, b) => s + priceOf(b.packId) * (b.numPeople || 1), 0);
    const earned = collaboratorCommission(c, bookings, packs);
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
      commission: earned.amount,
      commissionCurrency: earned.currency,
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

  const totalRevenue = bookings
    .filter((b) => b.status !== "declined")
    .reduce((sum, b) => {
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
