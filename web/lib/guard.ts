import { NextResponse } from "next/server";
import { hashPassword, verifyPassword } from "./auth";
import { getEnv, mockStore, uid, type Env, type Guard, type GuardPlatform } from "./cloudflare";

async function db(env: Env | null) {
  return env?.DB ?? null;
}

// ---- Guard accounts: D1 on Cloudflare, in-memory locally ----
export async function createGuard(societyId: string, name: string, phone: string, password: string, email?: string): Promise<{ guard?: Guard; error?: string }> {
  if (!name.trim() || !phone.trim() || password.length < 8) {
    return { error: "Provide a name, phone, and 8+ character password." };
  }
  const env = await getEnv();
  const conn = await db(env);
  const guard: Guard & { password_hash: string } = {
    id: uid("g"),
    society_id: societyId,
    name: name.trim(),
    phone: phone.trim(),
    email: email?.trim() || null,
    active: true,
    password_hash: hashPassword(password),
  };
  if (conn) {
    await conn.prepare("INSERT INTO guards (id, society_id, name, phone, email, password_hash) VALUES (?, ?, ?, ?, ?, ?)")
      .bind(guard.id, guard.society_id, guard.name, guard.phone, guard.email, guard.password_hash)
      .run();
  } else {
    mockStore().guards.push(guard);
  }
  const { password_hash: _drop, ...safe } = guard;
  return { guard: safe };
}

export async function listGuards(societyId: string): Promise<Guard[]> {
  const env = await getEnv();
  const conn = await db(env);
  if (conn) {
    const { results } = await conn.prepare("SELECT id, society_id, name, phone, email, active FROM guards WHERE society_id = ? ORDER BY created_at DESC")
      .bind(societyId)
      .all<{ id: string; society_id: string; name: string; phone: string; email: string | null; active: number }>();
    return (results ?? []).map((r: { id: string; society_id: string; name: string; phone: string; email: string | null; active: number }) => ({
      id: r.id, society_id: r.society_id, name: r.name, phone: r.phone, email: r.email, active: r.active === 1,
    }));
  }
  return mockStore().guards.filter((g) => g.society_id === societyId).map(({ password_hash: _drop, ...safe }) => safe);
}

/** Every guard's id → name, across all societies — for enriching the platform audit log. */
export async function listAllGuardNames(): Promise<Map<string, string>> {
  const env = await getEnv();
  const conn = await db(env);
  if (conn) {
    const { results } = await conn.prepare("SELECT id, name FROM guards").all<{ id: string; name: string }>();
    return new Map((results ?? []).map((r: { id: string; name: string }) => [r.id, r.name]));
  }
  return new Map(mockStore().guards.map((g) => [g.id, g.name]));
}

export async function deactivateGuard(id: string, societyId: string): Promise<boolean> {
  const env = await getEnv();
  const conn = await db(env);
  if (conn) {
    const row = await conn.prepare("SELECT society_id FROM guards WHERE id = ?").bind(id).first<{ society_id: string }>();
    if (!row || row.society_id !== societyId) return false;
    await conn.prepare("UPDATE guards SET active = 0 WHERE id = ?").bind(id).run();
    return true;
  }
  const guard = mockStore().guards.find((g) => g.id === id && g.society_id === societyId);
  if (!guard) return false;
  guard.active = false;
  return true;
}

async function findGuardByPhone(env: Env | null, societyId: string, phone: string): Promise<(Guard & { password_hash: string }) | undefined> {
  const conn = await db(env);
  if (conn) {
    const row = await conn.prepare("SELECT * FROM guards WHERE society_id = ? AND phone = ? AND active = 1")
      .bind(societyId, phone)
      .first<Guard & { password_hash: string; active: number }>();
    return row ? { ...row, active: row.active === 1 } : undefined;
  }
  return mockStore().guards.find((g) => g.society_id === societyId && g.phone === phone && g.active);
}

async function findGuardById(env: Env | null, id: string): Promise<Guard | undefined> {
  const conn = await db(env);
  if (conn) {
    const row = await conn.prepare("SELECT id, society_id, name, phone, email, active FROM guards WHERE id = ?")
      .bind(id)
      .first<{ id: string; society_id: string; name: string; phone: string; email: string | null; active: number }>();
    return row ? { id: row.id, society_id: row.society_id, name: row.name, phone: row.phone, email: row.email, active: row.active === 1 } : undefined;
  }
  const g = mockStore().guards.find((x) => x.id === id);
  if (!g) return undefined;
  const { password_hash: _drop, ...safe } = g;
  return safe;
}

export async function verifyGuardLogin(societyId: string, phone: string, password: string): Promise<{ guard?: Guard; error?: string }> {
  const env = await getEnv();
  const found = await findGuardByPhone(env, societyId, phone.trim());
  if (!found || !verifyPassword(password, found.password_hash)) return { error: "Wrong society, phone or password." };
  return { guard: { id: found.id, society_id: found.society_id, name: found.name, phone: found.phone, email: found.email, active: found.active } };
}

// ---- Guard sessions: same SESSIONS KV as user sessions, value-prefixed so the two never collide ----
const GUARD_PREFIX = "guard:";
const localGuardSessions = new Map<string, string>();

async function sessionStore(env: Env | null) {
  if (env?.SESSIONS) {
    return {
      get: (t: string) => env.SESSIONS.get(t),
      set: (t: string, v: string) => env.SESSIONS.put(t, v),
      del: (t: string) => env.SESSIONS.delete(t),
    };
  }
  return {
    get: async (t: string) => localGuardSessions.get(t) ?? null,
    set: async (t: string, v: string) => { localGuardSessions.set(t, v); },
    del: async (t: string) => { localGuardSessions.delete(t); },
  };
}

export async function createGuardSession(guardId: string): Promise<string> {
  const token = crypto.randomUUID().replace(/-/g, "") + crypto.randomUUID().replace(/-/g, "");
  await (await sessionStore(await getEnv())).set(token, `${GUARD_PREFIX}${guardId}`);
  return token;
}

/** The guard behind a bearer token, or null. Fully parallel to `getViewer()` — guards aren't in `users`, so this never touches that table. */
export async function getGuardFromToken(token: string | null): Promise<Guard | null> {
  if (!token) return null;
  const env = await getEnv();
  const value = await (await sessionStore(env)).get(token);
  if (!value || !value.startsWith(GUARD_PREFIX)) return null;
  return (await findGuardById(env, value.slice(GUARD_PREFIX.length))) ?? null;
}

function bearerToken(req: Request): string | null {
  const header = req.headers.get("authorization") ?? "";
  return header.startsWith("Bearer ") ? header.slice(7).trim() : null;
}

/** Gate for guard-only routes (mobile app): 401 if not a valid guard bearer token. */
export async function requireGuard(req: Request): Promise<{ guard: Guard } | NextResponse> {
  const guard = await getGuardFromToken(bearerToken(req));
  if (!guard) return NextResponse.json({ error: "Guard login required." }, { status: 401 });
  return { guard };
}

// ---- Push token registration ----
export async function registerPushToken(guardId: string, platform: GuardPlatform, expoToken?: string, voipToken?: string): Promise<void> {
  const env = await getEnv();
  const conn = await db(env);
  if (conn) {
    await conn.prepare(
      `INSERT INTO guard_push_tokens (id, guard_id, platform, expo_token, voip_token) VALUES (?, ?, ?, ?, ?)
       ON CONFLICT (guard_id, platform) DO UPDATE SET expo_token = excluded.expo_token, voip_token = excluded.voip_token`
    ).bind(uid("gpt"), guardId, platform, expoToken ?? null, voipToken ?? null).run();
    return;
  }
  const store = mockStore();
  const existing = store.guardPushTokens.find((t) => t.guard_id === guardId && t.platform === platform);
  if (existing) {
    existing.expo_token = expoToken ?? null;
    existing.voip_token = voipToken ?? null;
  } else {
    store.guardPushTokens.push({ id: uid("gpt"), guard_id: guardId, platform, expo_token: expoToken ?? null, voip_token: voipToken ?? null });
  }
}

export async function getGuardPushTokens(societyId: string): Promise<{ platform: GuardPlatform; expo_token: string | null; voip_token: string | null }[]> {
  const env = await getEnv();
  const conn = await db(env);
  if (conn) {
    const { results } = await conn.prepare(
      `SELECT t.platform, t.expo_token, t.voip_token FROM guard_push_tokens t JOIN guards g ON g.id = t.guard_id WHERE g.society_id = ? AND g.active = 1`
    ).bind(societyId).all<{ platform: GuardPlatform; expo_token: string | null; voip_token: string | null }>();
    return results ?? [];
  }
  const store = mockStore();
  const guardIds = new Set(store.guards.filter((g) => g.society_id === societyId && g.active).map((g) => g.id));
  return store.guardPushTokens.filter((t) => guardIds.has(t.guard_id)).map((t) => ({ platform: t.platform, expo_token: t.expo_token ?? null, voip_token: t.voip_token ?? null }));
}
