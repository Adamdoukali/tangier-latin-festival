import { createFileRoute } from "@tanstack/react-router";
import {
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Clock3,
  Database,
  Filter,
  RefreshCw,
  Search,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  adminAuditDatabaseReady,
  getAdminAuditLogs,
  type AdminAuditAction,
  type AdminAuditLog,
} from "@/lib/admin-audit";

export const Route = createFileRoute("/admin/logs")({
  component: AdminLogsPage,
});

const actionStyle: Record<AdminAuditAction, string> = {
  create: "bg-emerald-50 text-emerald-700 border-emerald-200",
  update: "bg-blue-50 text-blue-700 border-blue-200",
  delete: "bg-red-50 text-red-700 border-red-200",
  status: "bg-amber-50 text-amber-700 border-amber-200",
  reorder: "bg-violet-50 text-violet-700 border-violet-200",
};

function readableKey(key: string): string {
  return key
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/_/g, " ")
    .replace(/^./, (letter) => letter.toUpperCase());
}

function displayValue(value: unknown): string {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

function ChangeDetails({ log }: { log: AdminAuditLog }) {
  const details = log.changes || {};
  const directChanges = (details.changes || details.after || {}) as Record<string, unknown>;
  const before = (details.before || {}) as Record<string, unknown>;
  const rows = Object.entries(directChanges)
    .filter(([key]) => !["id", "createdAt"].includes(key))
    .slice(0, 30);

  if (!rows.length) return <p className="text-xs text-slate-500">No field details recorded.</p>;

  return (
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
      {rows.map(([key, value]) => (
        <div
          key={key}
          className="grid grid-cols-[minmax(110px,0.7fr)_minmax(0,1fr)] border-b border-slate-100 last:border-0 sm:grid-cols-[170px_1fr_1fr]"
        >
          <div className="px-3 py-2 text-[11px] font-semibold text-slate-500">
            {readableKey(key)}
          </div>
          <div className="hidden break-words px-3 py-2 text-xs text-slate-500 sm:block">
            {key in before ? displayValue(before[key]) : "—"}
          </div>
          <div className="break-words px-3 py-2 text-xs font-medium text-slate-800">
            {displayValue(value)}
          </div>
        </div>
      ))}
    </div>
  );
}

function AdminLogsPage() {
  const [logs, setLogs] = useState<AdminAuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [databaseReady, setDatabaseReady] = useState(true);
  const [search, setSearch] = useState("");
  const [adminFilter, setAdminFilter] = useState("all");
  const [sectionFilter, setSectionFilter] = useState("all");
  const [actionFilter, setActionFilter] = useState<AdminAuditAction | "all">("all");
  const [openId, setOpenId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const [entries, ready] = await Promise.all([getAdminAuditLogs(), adminAuditDatabaseReady()]);
    setLogs(entries);
    setDatabaseReady(ready);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const admins = useMemo(
    () =>
      Array.from(new Set(logs.map((log) => log.adminEmail)))
        .filter(Boolean)
        .sort(),
    [logs],
  );
  const sections = useMemo(
    () =>
      Array.from(new Set(logs.map((log) => log.section)))
        .filter(Boolean)
        .sort(),
    [logs],
  );
  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return logs.filter((log) => {
      if (adminFilter !== "all" && log.adminEmail !== adminFilter) return false;
      if (sectionFilter !== "all" && log.section !== sectionFilter) return false;
      if (actionFilter !== "all" && log.action !== actionFilter) return false;
      if (!query) return true;
      return [
        log.adminName,
        log.adminEmail,
        log.section,
        log.summary,
        log.entityLabel,
        log.entityId,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query));
    });
  }, [logs, search, adminFilter, sectionFilter, actionFilter]);

  return (
    <div className="mx-auto max-w-7xl space-y-5">
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="rounded-xl bg-slate-900 p-2.5 text-amber-300">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">Admin Activity Logs</h2>
              <p className="mt-1 text-sm text-slate-500">
                A chronological record of which administrator changed what and when.
              </p>
            </div>
          </div>
          <button
            onClick={load}
            disabled={loading}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Refresh
          </button>
        </div>
      </section>

      {!databaseReady && (
        <div className="flex gap-3 rounded-xl border border-amber-300 bg-amber-50 p-4 text-amber-900">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
          <div>
            <p className="text-sm font-bold">Database log table is not installed yet</p>
            <p className="mt-1 text-xs leading-5">
              New activity is temporarily saved in this browser only. Run
              <code className="mx-1 rounded bg-amber-100 px-1.5 py-0.5">
                supabase/admin-audit-logs.sql
              </code>
              once to share the history across all admin accounts and devices.
            </p>
          </div>
        </div>
      )}

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="grid gap-3 md:grid-cols-[minmax(220px,1fr)_repeat(3,minmax(140px,auto))]">
          <label className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search activity, record, or admin…"
              className="h-10 w-full rounded-lg border border-slate-200 pl-9 pr-3 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
            />
          </label>
          <select
            value={adminFilter}
            onChange={(event) => setAdminFilter(event.target.value)}
            className="h-10 rounded-lg border border-slate-200 px-3 text-sm"
          >
            <option value="all">All admins</option>
            {admins.map((admin) => (
              <option key={admin} value={admin}>
                {admin}
              </option>
            ))}
          </select>
          <select
            value={sectionFilter}
            onChange={(event) => setSectionFilter(event.target.value)}
            className="h-10 rounded-lg border border-slate-200 px-3 text-sm"
          >
            <option value="all">All sections</option>
            {sections.map((section) => (
              <option key={section} value={section}>
                {section}
              </option>
            ))}
          </select>
          <select
            value={actionFilter}
            onChange={(event) => setActionFilter(event.target.value as AdminAuditAction | "all")}
            className="h-10 rounded-lg border border-slate-200 px-3 text-sm"
          >
            <option value="all">All actions</option>
            <option value="create">Created</option>
            <option value="update">Updated</option>
            <option value="status">Status changed</option>
            <option value="reorder">Reordered</option>
            <option value="delete">Deleted</option>
          </select>
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3 text-xs text-slate-500">
          <span className="inline-flex items-center gap-2">
            <Filter className="h-3.5 w-3.5" /> {filtered.length} activities
          </span>
          {databaseReady && (
            <span className="inline-flex items-center gap-1.5 text-emerald-700">
              <Database className="h-3.5 w-3.5" /> Shared database history
            </span>
          )}
        </div>
        {loading ? (
          <div className="grid min-h-48 place-items-center text-sm text-slate-500">
            Loading activity…
          </div>
        ) : filtered.length === 0 ? (
          <div className="grid min-h-48 place-items-center px-5 text-center text-sm text-slate-500">
            No activity matches these filters.
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filtered.map((log) => {
              const expanded = openId === log.id;
              return (
                <article key={log.id} className="px-4 py-4 sm:px-5">
                  <button
                    onClick={() => setOpenId(expanded ? null : log.id)}
                    className="flex w-full items-start gap-3 text-left"
                  >
                    <div className="mt-0.5 hidden rounded-full bg-slate-100 p-2 text-slate-500 sm:block">
                      <UserRound className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase ${actionStyle[log.action]}`}
                        >
                          {log.action}
                        </span>
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
                          {log.section}
                        </span>
                        {log.storage === "local" && (
                          <span className="text-[10px] font-semibold text-amber-600">
                            Local only
                          </span>
                        )}
                      </div>
                      <p className="mt-2 text-sm font-semibold text-slate-900">{log.summary}</p>
                      <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-500">
                        <span className="font-semibold text-slate-700">{log.adminName}</span>
                        <span>{log.adminEmail}</span>
                        <span className="inline-flex items-center gap-1">
                          <Clock3 className="h-3 w-3" />
                          {new Date(log.createdAt).toLocaleString()}
                        </span>
                      </div>
                    </div>
                    {expanded ? (
                      <ChevronUp className="mt-2 h-4 w-4 text-slate-400" />
                    ) : (
                      <ChevronDown className="mt-2 h-4 w-4 text-slate-400" />
                    )}
                  </button>
                  {expanded && (
                    <div className="ml-0 mt-4 sm:ml-11">
                      <ChangeDetails log={log} />
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
