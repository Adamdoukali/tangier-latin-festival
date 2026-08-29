import { getCurrentAdmin, type AdminIdentity } from "./auth-store";
import { supabase } from "./supabase";

const LOCAL_LOGS_KEY = "tlf_admin_audit_logs";
const MAX_LOCAL_LOGS = 500;

export type AdminAuditAction = "create" | "update" | "delete" | "status" | "reorder";

export interface AdminAuditLog {
  id: string;
  adminId: string;
  adminName: string;
  adminEmail: string;
  action: AdminAuditAction;
  section: string;
  entityId?: string | null;
  entityLabel?: string | null;
  summary: string;
  changes?: Record<string, unknown> | null;
  createdAt: string;
  storage?: "database" | "local";
}

export interface RecordAdminActionInput {
  action: AdminAuditAction;
  section: string;
  entityId?: string | null;
  entityLabel?: string | null;
  summary: string;
  before?: unknown;
  after?: unknown;
  changes?: unknown;
  admin?: AdminIdentity | null;
}

const sensitiveKey = /password|hash|token|access.?code|secret|authorization/i;

function sanitise(value: unknown, depth = 0): unknown {
  if (depth > 4) return "[omitted]";
  if (Array.isArray(value)) return value.slice(0, 30).map((item) => sanitise(item, depth + 1));
  if (!value || typeof value !== "object") {
    return typeof value === "string" && value.length > 500 ? `${value.slice(0, 500)}…` : value;
  }
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .filter(([key]) => !sensitiveKey.test(key))
      .slice(0, 60)
      .map(([key, item]) => [key, sanitise(item, depth + 1)]),
  );
}

function localLogs(): AdminAuditLog[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(LOCAL_LOGS_KEY) || "[]") as AdminAuditLog[];
  } catch {
    return [];
  }
}

function saveLocal(log: AdminAuditLog): void {
  if (typeof window === "undefined") return;
  const logs = [log, ...localLogs().filter((item) => item.id !== log.id)].slice(0, MAX_LOCAL_LOGS);
  localStorage.setItem(LOCAL_LOGS_KEY, JSON.stringify(logs));
}

function clearLocal(): void {
  if (typeof window !== "undefined") localStorage.removeItem(LOCAL_LOGS_KEY);
}

const toRow = (log: AdminAuditLog) => ({
  id: log.id,
  admin_id: log.adminId,
  admin_name: log.adminName,
  admin_email: log.adminEmail,
  action: log.action,
  section: log.section,
  entity_id: log.entityId,
  entity_label: log.entityLabel,
  summary: log.summary,
  changes: log.changes,
  created_at: log.createdAt,
});

const fromRow = (row: Record<string, unknown>): AdminAuditLog => ({
  id: String(row.id),
  adminId: String(row.admin_id || "unknown"),
  adminName: String(row.admin_name || "Unknown admin"),
  adminEmail: String(row.admin_email || ""),
  action: String(row.action || "update") as AdminAuditAction,
  section: String(row.section || "Admin"),
  entityId: row.entity_id ? String(row.entity_id) : null,
  entityLabel: row.entity_label ? String(row.entity_label) : null,
  summary: String(row.summary || "Changed a record"),
  changes: (row.changes as Record<string, unknown> | null) ?? null,
  createdAt: String(row.created_at),
  storage: "database",
});

/** Only mutations performed while the browser is inside /admin are audited. */
function activeAdmin(explicit?: AdminIdentity | null): AdminIdentity | null {
  if (explicit) return explicit;
  if (typeof window === "undefined" || !window.location.pathname.startsWith("/admin")) return null;
  return getCurrentAdmin();
}

/** Best-effort audit recording. A logging outage must never undo the admin's change. */
export async function recordAdminAction(input: RecordAdminActionInput): Promise<void> {
  const admin = activeAdmin(input.admin);
  if (!admin || typeof window === "undefined") return;

  const id = crypto.randomUUID?.() || `audit-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const detail = sanitise({
    before: input.before,
    after: input.after,
    changes: input.changes,
  }) as Record<string, unknown>;
  const log: AdminAuditLog = {
    id,
    adminId: admin.id,
    adminName: admin.name,
    adminEmail: admin.email,
    action: input.action,
    section: input.section,
    entityId: input.entityId ?? null,
    entityLabel: input.entityLabel ?? null,
    summary: input.summary,
    changes: detail,
    createdAt: new Date().toISOString(),
    storage: "local",
  };

  if (supabase) {
    const { error } = await supabase.from("admin_audit_logs").insert(toRow(log));
    if (!error) return;
    console.warn(
      "[admin-audit] Database log failed; preserving it in this browser.",
      error.message,
    );
  }

  saveLocal(log);
}

export async function getAdminAuditLogs(limit = 500): Promise<AdminAuditLog[]> {
  const local = localLogs();
  if (!supabase) return local;

  const { data, error } = await supabase
    .from("admin_audit_logs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) return local;

  let database = (data || []).map((row) => fromRow(row as Record<string, unknown>));
  // If the migration was installed after admins had already made changes,
  // promote those browser-only entries into the shared history automatically.
  if (local.length) {
    const databaseIds = new Set(database.map((item) => item.id));
    const pending = local.filter((item) => !databaseIds.has(item.id));
    if (pending.length) {
      const { error: syncError } = await supabase
        .from("admin_audit_logs")
        .insert(pending.map(toRow));
      if (!syncError) {
        database = [
          ...pending.map((item) => ({ ...item, storage: "database" as const })),
          ...database,
        ];
        clearLocal();
      }
    } else {
      clearLocal();
    }
  }
  const ids = new Set(database.map((item) => item.id));
  return [...database, ...local.filter((item) => !ids.has(item.id))].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
}

export async function adminAuditDatabaseReady(): Promise<boolean> {
  if (!supabase) return false;
  const { error } = await supabase.from("admin_audit_logs").select("id").limit(1);
  return !error;
}
