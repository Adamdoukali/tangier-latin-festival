// ─── Partner Portal session ───────────────────────────────────────────
// Client-side session for collaborators. The stored credentials are
// re-validated against the database on every portal load, so deactivating a
// collaborator or changing their password locks them out immediately.

import { partnerLogin, type Collaborator } from "./admin-store";

const SESSION_KEY = "tlf_partner_session";

interface PartnerSession {
  email?: string;
  password?: string;
  // Legacy fields for backwards compatibility
  username?: string;
  accessCode?: string;
}

export function savePartnerSession(email: string, password?: string): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(SESSION_KEY, JSON.stringify({ email, password }));
}

export function clearPartnerSession(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(SESSION_KEY);
}

/** Restore + re-validate the stored session. Returns the collaborator or null. */
export async function restorePartnerSession(): Promise<Collaborator | null> {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const session = JSON.parse(raw) as PartnerSession;
    const identifier = session.email || session.username;
    const pass = session.password || session.accessCode;
    if (!identifier || !pass) return null;
    const result = await partnerLogin(identifier, pass);
    if (result.success) return result.collaborator;
    clearPartnerSession();
    return null;
  } catch {
    return null;
  }
}
