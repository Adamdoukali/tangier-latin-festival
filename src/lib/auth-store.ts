// ─── Admin Authentication Store ───────────────────────────────────────────────
// Manages a simple client-side session using localStorage for the admin panel.

const AUTH_KEY = "tlf_admin_auth_token";

export const getAuthStatus = (): boolean => {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(AUTH_KEY) === "true";
};

export const setAuthStatus = (status: boolean) => {
  if (typeof window === "undefined") return;
  if (status) {
    localStorage.setItem(AUTH_KEY, "true");
  } else {
    localStorage.removeItem(AUTH_KEY);
  }
};

export const loginAdmin = (email: string, pass: string): boolean => {
  // Hardcoded master credentials for demo/MVP
  if (email === "admin@tangierlatinfestival.com" && pass === "TLFadmin2027") {
    setAuthStatus(true);
    return true;
  }
  return false;
};

export const logoutAdmin = () => {
  setAuthStatus(false);
};
