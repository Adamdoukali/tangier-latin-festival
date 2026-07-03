// ─── Partner Portal session ───────────────────────────────────────────
// Simple client-side session for collaborators, mirroring the admin's
// localStorage approach. The stored credentials are re-validated against
// the database on every portal load, so deactivating a collaborator or
// changing their access code locks them out immediately.

import { partnerLogin, type Collaborator } from "./admin-store";

const SESSION_KEY = "tlf_partner_session";

interface PartnerSession {
  username: string;
  accessCode: string;
}

export function savePartnerSession(username: string, accessCode: string): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(SESSION_KEY, JSON.stringify({ username, accessCode }));
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
    if (!session.username || !session.accessCode) return null;
    const result = await partnerLogin(session.username, session.accessCode);
    if (result.success) return result.collaborator;
    clearPartnerSession();
    return null;
  } catch {
    return null;
  }
}
