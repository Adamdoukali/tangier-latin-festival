// The credential check runs server-side. The browser stores only the signed-in
// admin's identity so back-office changes can be attributed in activity logs.

import { verifyAdminCredentials } from "./admin-auth-server";

const AUTH_KEY = "tlf_admin_auth_token";
const SESSION_KEY = "tlf_admin_session";

export interface AdminIdentity {
  id: string;
  name: string;
  email: string;
}

const PRIMARY_ADMIN: AdminIdentity = {
  id: "primary-admin",
  name: "Primary Admin",
  email: "admin@tangierlatinfestival.com",
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
