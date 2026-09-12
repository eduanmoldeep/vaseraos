import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { getEnv, uid, type AuthUser, type Env } from "./cloudflare";
import { getOffices, hasOffice, isMember } from "./membership";
import type { Office } from "./cloudflare";

export type { AuthUser };

export const SESSION_COOKIE = "vasera_session";
export const IMPERSONATOR_COOKIE = "vasera_impersonator";
const SESSION_TTL = 60 * 60 * 24 * 30; // 30 days

type StoredUser = AuthUser & { password_hash: string; created_at?: string };

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

/**
 * Finds the account for a verified Google identity, linking it to an existing
 * email match or creating a new (non-admin) account. password_hash is set to
 * a random unusable value — Google-only accounts never log in via password.
 */
export async function findOrCreateGoogleUser(googleId: string, email: string, name: string): Promise<AuthUser> {
  const cleanEmail = email.trim().toLowerCase();
  const env = await getEnv();
  if (env?.DB) {
    const byGoogleId = await env.DB.prepare("SELECT id, name, email, admin FROM users WHERE google_id = ?")
      .bind(googleId)
      .first<AuthUser & { admin: number }>();
    if (byGoogleId) return { id: byGoogleId.id, name: byGoogleId.name, email: byGoogleId.email, admin: byGoogleId.admin === 1 };

    const byEmail = await findByEmail(env, cleanEmail);
    if (byEmail) {
      await env.DB.prepare("UPDATE users SET google_id = ? WHERE id = ?").bind(googleId, byEmail.id).run();
      return { id: byEmail.id, name: byEmail.name, email: byEmail.email, admin: byEmail.admin };
    }

    const user: StoredUser = {
      id: uid("u"),
      name: name.trim() || cleanEmail,
      email: cleanEmail,
      password_hash: hashPassword(randomBytes(32).toString("hex")),
      admin: false,
    };
    await env.DB.prepare("INSERT INTO users (id, name, email, password_hash, admin, google_id) VALUES (?, ?, ?, ?, 0, ?)")
      .bind(user.id, user.name, user.email, user.password_hash, googleId)
      .run();
    return { id: user.id, name: user.name, email: user.email, admin: false };
  }

  // Local dev fallback: in-memory only, no google_id tracking (single-process).
  const byEmail = localUsers().find((u) => u.email === cleanEmail);
  if (byEmail) return { id: byEmail.id, name: byEmail.name, email: byEmail.email, admin: byEmail.admin };
  const user: StoredUser = {
    id: uid("u"),
    name: name.trim() || cleanEmail,
    email: cleanEmail,
    password_hash: hashPassword(randomBytes(32).toString("hex")),
    admin: false,
  };
  localUsers().push(user);
  return { id: user.id, name: user.name, email: user.email, admin: false };
}

/** All accounts, newest first — for the admin user list. Never exposes password hashes. */
export async function listUsers(): Promise<(AuthUser & { createdAt: string })[]> {
  const env = await getEnv();
  if (env?.DB) {
    const { results } = await env.DB.prepare("SELECT id, name, email, admin, created_at FROM users ORDER BY created_at DESC")
      .all<{ id: string; name: string; email: string; admin: number; created_at: string }>();
    return (results ?? []).map((r: { id: string; name: string; email: string; admin: number; created_at: string }) => ({
      id: r.id,
      name: r.name,
      email: r.email,
      admin: r.admin === 1,
      createdAt: r.created_at,
    }));
  }
  return localUsers().map((u) => ({ id: u.id, name: u.name, email: u.email, admin: u.admin, createdAt: u.created_at ?? "" }));
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

/** The admin behind an impersonated session, or null when not impersonating. */
export async function getImpersonator(): Promise<AuthUser | null> {
  const token = (await cookies()).get(IMPERSONATOR_COOKIE)?.value;
  if (!token) return null;
  const env = await getEnv();
  const userId = await (await sessionStore(env)).get(token);
  if (!userId) return null;
  return (await findById(env, userId)) ?? null;
}

/**
 * Switches the active session to `targetUserId` while keeping the admin's own
 * session alive under a second cookie, so "back to admin" needs no re-login.
 */
export async function startImpersonation(targetUserId: string): Promise<{ user?: AuthUser; error?: string }> {
  const env = await getEnv();
  const target = await findById(env, targetUserId);
  if (!target) return { error: "User not found." };
  const adminToken = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!adminToken) return { error: "Login required." };
  const jar = await cookies();
  jar.set(IMPERSONATOR_COOKIE, adminToken, sessionCookieOptions());
  jar.set(SESSION_COOKIE, await createSession(target.id), sessionCookieOptions());
  return { user: target };
}

/** Restores the admin's own session and discards the impersonated one. */
export async function stopImpersonation(): Promise<{ user?: AuthUser; error?: string }> {
  const jar = await cookies();
  const adminToken = jar.get(IMPERSONATOR_COOKIE)?.value;
  if (!adminToken) return { error: "Not impersonating." };
  const impersonatedToken = jar.get(SESSION_COOKIE)?.value;
  const env = await getEnv();
  const adminId = await (await sessionStore(env)).get(adminToken);
  const admin = adminId ? await findById(env, adminId) : undefined;
  if (!admin) {
    jar.delete(IMPERSONATOR_COOKIE);
    return { error: "Admin session expired." };
  }
  if (impersonatedToken) await destroySession(impersonatedToken);
  jar.set(SESSION_COOKIE, adminToken, sessionCookieOptions());
  jar.delete(IMPERSONATOR_COOKIE);
  return { user: admin };
}

/** Gate for platform-only routes (approvals, the global user list): 401 logged out, 403 non-admin. */
export async function requireAdmin(): Promise<NextResponse | null> {
  const viewer = await getViewer();
  if (!viewer) return NextResponse.json({ error: "Login required." }, { status: 401 });
  if (!viewer.admin) return NextResponse.json({ error: "Admin access required." }, { status: 403 });
  return null;
}

/**
 * Gate for a single society's admin CRUD routes: a platform admin, or a user
 * currently holding ANY office (president/secretary/treasurer) in THIS
 * society. Privilege lives on the office, not the person — vacate the office
 * and the access goes with it, no separate "admin" flag to also revoke.
 */
export async function requireSocietyAdmin(societyId: string): Promise<NextResponse | null> {
  const viewer = await getViewer();
  if (!viewer) return NextResponse.json({ error: "Login required." }, { status: 401 });
  if (viewer.admin) return null;
  const offices = await getOffices(viewer.id, societyId);
  if (offices.length > 0) return null;
  return NextResponse.json({ error: "An elected office (president, secretary or treasurer) is required for this society." }, { status: 403 });
}

/** Gate for one specific office's action (e.g. notices are president-only), plus the platform-admin override. */
export async function requireSocietyOffice(societyId: string, office: Office): Promise<NextResponse | null> {
  const viewer = await getViewer();
  if (!viewer) return NextResponse.json({ error: "Login required." }, { status: 401 });
  if (viewer.admin) return null;
  if (await hasOffice(viewer.id, societyId, office)) return null;
  return NextResponse.json({ error: `Only the society's ${office} can do this.` }, { status: 403 });
}

/** Gate for read/self-service routes: any member of the society (office-holder or plain resident), or a platform admin. */
export async function requireSocietyMember(societyId: string): Promise<NextResponse | null> {
  const viewer = await getViewer();
  if (!viewer) return NextResponse.json({ error: "Login required." }, { status: 401 });
  if (viewer.admin) return null;
  if (await isMember(viewer.id, societyId)) return null;
  return NextResponse.json({ error: "You're not a member of this society." }, { status: 403 });
}

export function sessionCookieOptions() {
  return { httpOnly: true, sameSite: "lax" as const, secure: process.env.NODE_ENV === "production", path: "/", maxAge: SESSION_TTL };
}
