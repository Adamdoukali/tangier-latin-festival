// The credential check runs server-side. The browser stores only the signed-in
// admin's identity so back-office changes can be attributed in activity logs.

import { verifyAdminCredentials } from "./admin-auth-server";
import { supabase } from "./supabase";

const AUTH_KEY = "tlf_admin_auth_token";
const SESSION_KEY = "tlf_admin_session";
const REMOTE_ONLY_CLEANUP_KEY = "tlf_remote_only_cleanup_v1";

/** Clear browser-only records created before production was connected to
 * Supabase. The cached pack catalog is intentionally preserved. */
export function clearStaleLocalAdminData(): void {
  if (typeof window === "undefined" || !supabase) return;
  if (localStorage.getItem(REMOTE_ONLY_CLEANUP_KEY) === "done") return;
  [
    "tlf_admin_bookings",
    "tlf_admin_invites",
    "tlf_admin_collaborators",
    "tlf_admin_discounts",
    "tlf_admin_audit_logs",
  ].forEach((key) => localStorage.removeItem(key));
  sessionStorage.removeItem("tlf_db_write_blocked");
  localStorage.setItem(REMOTE_ONLY_CLEANUP_KEY, "done");
}

export interface AdminIdentity {
  id: string;
  name: string;
  email: string;
  /** owner = full access + can open any partner's portal ("view as") */
  role?: "owner" | "admin" | "scanner";
}

const PRIMARY_ADMIN: AdminIdentity = {
  id: "primary-admin",
  name: "Propriétaire",
  email: "admin@tangierlatinfestival.com",
  role: "owner",
};

export function getCurrentAdmin(): AdminIdentity | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as AdminIdentity;
      if (parsed?.id && parsed?.email && parsed?.name) return parsed;
    }
  } catch {
    // Fall through to the legacy-session migration below.
  }

  // Existing signed-in browsers stored only a boolean. Attribute that legacy
  // session to the primary account and upgrade it in place.
  if (localStorage.getItem(AUTH_KEY) === "true") {
    const identity: AdminIdentity = {
      id: PRIMARY_ADMIN.id,
      name: PRIMARY_ADMIN.name,
      email: PRIMARY_ADMIN.email,
    };
    localStorage.setItem(SESSION_KEY, JSON.stringify(identity));
    return identity;
  }
  return null;
}

export const getAuthStatus = (): boolean => getCurrentAdmin() !== null;

export function setAuthStatus(status: boolean, identity?: AdminIdentity): void {
  if (typeof window === "undefined") return;
  if (status) {
    const admin = identity ?? PRIMARY_ADMIN;
    localStorage.setItem(AUTH_KEY, "true");
    localStorage.setItem(SESSION_KEY, JSON.stringify(admin));
  } else {
    localStorage.removeItem(AUTH_KEY);
    localStorage.removeItem(SESSION_KEY);
  }
}

export async function loginAdmin(email: string, pass: string): Promise<boolean> {
  const result = await verifyAdminCredentials({ data: { email, password: pass } });
  if (!result.success) return false;
  setAuthStatus(true, result.admin);
  return true;
}

export const logoutAdmin = (): void => setAuthStatus(false);

/** The owner account can open any partner's portal without their password. */
export const isOwner = (admin: AdminIdentity | null = getCurrentAdmin()): boolean =>
  admin?.role === "owner";

// ─── "View as collaborator" ──────────────────────────────────────────
// The owner opens the Partner Portal as a given collaborator. The marker is
// stored in the partner session slot; the portal validates it against the
// signed-in owner before showing anything, so it is useless on its own.

const PARTNER_SESSION_KEY = "tlf_partner_session";

export interface PartnerImpersonation {
  impersonateCollaboratorId: string;
  adminId: string;
  adminName: string;
  startedAt: string;
}

export function startPartnerImpersonation(collaboratorId: string): boolean {
  const admin = getCurrentAdmin();
  if (typeof window === "undefined" || !isOwner(admin)) return false;
  const marker: PartnerImpersonation = {
    impersonateCollaboratorId: collaboratorId,
    adminId: admin!.id,
    adminName: admin!.name,
    startedAt: new Date().toISOString(),
  };
  localStorage.setItem(PARTNER_SESSION_KEY, JSON.stringify(marker));
  return true;
}

/** The active "view as" marker, only while the same owner is still signed in. */
export function getPartnerImpersonation(): PartnerImpersonation | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(PARTNER_SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<PartnerImpersonation>;
    if (!parsed.impersonateCollaboratorId) return null;
    const admin = getCurrentAdmin();
    if (!isOwner(admin) || admin!.id !== parsed.adminId) return null;
    return parsed as PartnerImpersonation;
  } catch {
    return null;
  }
}
