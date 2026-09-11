import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { getEnv, uid, type AuthUser, type Env } from "./cloudflare";

export type { AuthUser };

export const SESSION_COOKIE = "vasera_session";
const SESSION_TTL = 60 * 60 * 24 * 30; // 30 days

type StoredUser = AuthUser & { password_hash: string };

// ---- Passwords (scrypt, node:crypto — route handlers run on nodejs runtime) ----
export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  return `${salt}:${scryptSync(password, salt, 64).toString("hex")}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const derived = scryptSync(password, salt, 64);
  const expected = Buffer.from(hash, "hex");
  return derived.length === expected.length && timingSafeEqual(derived, expected);
}

// ---- Users: D1 on Cloudflare, in-memory locally (dev only) ----
const g = globalThis as unknown & { __vasera_users?: StoredUser[] };

function localUsers(): StoredUser[] {
  if (!g.__vasera_users) {
    // Dev-only seed so `next dev` is usable. Prod D1 has no such row;
    // admin there is granted purely by direct DB SQL.
    g.__vasera_users = [
      { id: "u_local_admin", name: "Local Admin", email: "admin@local.test", password_hash: hashPassword("admin123"), admin: true },
    ];
  }
  return g.__vasera_users;
}

async function findByEmail(env: Env | null, email: string): Promise<StoredUser | undefined> {
  if (env?.DB) {
    const row = await env.DB.prepare("SELECT * FROM users WHERE email = ?").bind(email.toLowerCase()).first<StoredUser & { admin: number }>();
    return row ? { ...row, admin: row.admin === 1 } : undefined;
  }
  return localUsers().find((u) => u.email === email.toLowerCase());
}

async function findById(env: Env | null, id: string): Promise<AuthUser | undefined> {
  const row = env?.DB
    ? await env.DB.prepare("SELECT id, name, email, admin FROM users WHERE id = ?").bind(id).first<AuthUser & { admin: number }>()
    : localUsers().find((u) => u.id === id);
  return row ? { id: row.id, name: row.name, email: row.email, admin: (row.admin as number | boolean) === 1 || row.admin === true } : undefined;
}

/** Creates a NON-admin user. There is intentionally no way to set admin here. */
export async function createUser(name: string, email: string, password: string): Promise<{ user?: AuthUser; error?: string }> {
  const cleanEmail = email.trim().toLowerCase();
  if (!name.trim() || !cleanEmail.includes("@") || password.length < 8) {
    return { error: "Provide a name, valid email, and 8+ character password." };
  }
  const env = await getEnv();
  if (await findByEmail(env, cleanEmail)) return { error: "An account with that email already exists." };
  const user: StoredUser = { id: uid("u"), name: name.trim(), email: cleanEmail, password_hash: hashPassword(password), admin: false };
  if (env?.DB) {
    await env.DB.prepare("INSERT INTO users (id, name, email, password_hash, admin) VALUES (?, ?, ?, ?, 0)")
      .bind(user.id, user.name, user.email, user.password_hash)
      .run();
  } else {
    localUsers().push(user);
  }
  return { user: { id: user.id, name: user.name, email: user.email, admin: false } };
}

export async function verifyLogin(email: string, password: string): Promise<{ user?: AuthUser; error?: string }> {
  const env = await getEnv();
  const found = await findByEmail(env, email.trim().toLowerCase());
  if (!found || !verifyPassword(password, found.password_hash)) return { error: "Wrong email or password." };
  return { user: { id: found.id, name: found.name, email: found.email, admin: found.admin } };
}

// ---- Sessions: KV SESSIONS on Cloudflare, in-memory locally ----
const localSessions = new Map<string, string>();

async function sessionStore(env: Env | null) {
  if (env?.SESSIONS) {
    return {
      get: (t: string) => env.SESSIONS.get(t),
      set: (t: string, v: string) => env.SESSIONS.put(t, v, { expirationTtl: SESSION_TTL }),
      del: (t: string) => env.SESSIONS.delete(t),
    };
  }
  return {
    get: async (t: string) => localSessions.get(t) ?? null,
    set: async (t: string, v: string) => { localSessions.set(t, v); },
    del: async (t: string) => { localSessions.delete(t); },
  };
}

export async function createSession(userId: string): Promise<string> {
  const token = randomBytes(32).toString("hex");
  await (await sessionStore(await getEnv())).set(token, userId);
  return token;
}

export async function destroySession(token: string) {
  await (await sessionStore(await getEnv())).del(token);
}

/** Current viewer from the session cookie, or null when logged out. */
export async function getViewer(): Promise<AuthUser | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const env = await getEnv();
  const userId = await (await sessionStore(env)).get(token);
  if (!userId) return null;
  return (await findById(env, userId)) ?? null;
}

/** Gate for every non-auth API handler: 401 logged out, 403 non-admin. */
export async function requireAdmin(): Promise<NextResponse | null> {
  const viewer = await getViewer();
  if (!viewer) return NextResponse.json({ error: "Login required." }, { status: 401 });
  if (!viewer.admin) return NextResponse.json({ error: "Admin access required." }, { status: 403 });
  return null;
}

export function sessionCookieOptions() {
  return { httpOnly: true, sameSite: "lax" as const, secure: process.env.NODE_ENV === "production", path: "/", maxAge: SESSION_TTL };
}
