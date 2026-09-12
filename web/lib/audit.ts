import { getEnv, mockStore, uid, type AuditEntry } from "./cloudflare";

/** Best-effort caller IP — Cloudflare sets `CF-Connecting-IP`; falls back for local dev. */
export function getRequestIp(req: Request): string {
  return req.headers.get("cf-connecting-ip") ?? req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
}

type LogInput = {
  actorId: string;
  action: string;
  ip: string;
  targetUserId?: string;
  societyId?: string;
  detail?: string;
};

/** Records a role/ability change or an impersonation event. Never throws — logging must not break the action it records. */
export async function logAudit(input: LogInput): Promise<void> {
  try {
    const env = await getEnv();
    const entry: AuditEntry = {
      id: uid("audit"),
      actor_id: input.actorId,
      action: input.action,
      target_user_id: input.targetUserId ?? null,
      society_id: input.societyId ?? null,
      detail: input.detail ?? null,
      ip: input.ip,
      created_at: new Date().toISOString(),
    };
    if (env?.DB) {
      await env.DB.prepare(
        "INSERT INTO audit_log (id, actor_id, action, target_user_id, society_id, detail, ip) VALUES (?, ?, ?, ?, ?, ?, ?)"
      ).bind(entry.id, entry.actor_id, entry.action, entry.target_user_id, entry.society_id, entry.detail, entry.ip).run();
    } else {
      mockStore().auditLog.unshift(entry);
    }
  } catch {
    // Auditing is best-effort — a logging failure must never fail the underlying request.
  }
}

export async function listAuditLog(limit = 100): Promise<AuditEntry[]> {
  const env = await getEnv();
  if (env?.DB) {
    const { results } = await env.DB.prepare("SELECT * FROM audit_log ORDER BY created_at DESC LIMIT ?").bind(limit).all<AuditEntry>();
    return results ?? [];
  }
  return mockStore().auditLog.slice(0, limit);
}
