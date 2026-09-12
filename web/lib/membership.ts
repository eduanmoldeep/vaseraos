import { getEnv, uid, type Env, type Society, type Office, type Resident, mockStore } from "./cloudflare";

export type Membership = { societyId: string };

const OFFICES: Office[] = ["president", "secretary", "treasurer"];

async function db(env: Env | null) {
  return env?.DB ?? null;
}

/** Every society a user belongs to — resident by default; office-holding is tracked separately. */
export async function getMemberships(userId: string): Promise<Membership[]> {
  const env = await getEnv();
  const conn = await db(env);
  if (conn) {
    const { results } = await conn.prepare("SELECT society_id FROM society_members WHERE user_id = ?")
      .bind(userId)
      .all<{ society_id: string }>();
    return (results ?? []).map((r: { society_id: string }) => ({ societyId: r.society_id }));
  }
  return mockStore().members.filter((m) => m.user_id === userId).map((m) => ({ societyId: m.society_id }));
}

export async function isMember(userId: string, societyId: string): Promise<boolean> {
  return (await getMemberships(userId)).some((m) => m.societyId === societyId);
}

/**
 * The flat this user occupies in a society, or null if unlinked. Matches by
 * user_id first; falls back to matching the resident row's email (opportunistically
 * linking it) so residents added by an admin before signup still resolve.
 */
export async function getMyFlat(userId: string, userEmail: string, societyId: string): Promise<string | null> {
  const env = await getEnv();
  const conn = await db(env);
  if (conn) {
    const byId = await conn.prepare("SELECT flat FROM residents WHERE society_id = ? AND user_id = ?")
      .bind(societyId, userId).first<{ flat: string }>();
    if (byId) return byId.flat;
    const byEmail = await conn.prepare("SELECT id, flat FROM residents WHERE society_id = ? AND email = ?")
      .bind(societyId, userEmail.toLowerCase()).first<{ id: string; flat: string }>();
    if (byEmail) {
      await conn.prepare("UPDATE residents SET user_id = ? WHERE id = ?").bind(userId, byEmail.id).run();
      return byEmail.flat;
    }
    return null;
  }
  const store = mockStore();
  const resident = store.residents.find((r) => r.society_id === societyId && r.user_id === userId)
    ?? store.residents.find((r) => r.society_id === societyId && r.email?.toLowerCase() === userEmail.toLowerCase());
  return resident?.flat ?? null;
}

/**
 * The full resident record this user occupies in a society, or null if unlinked.
 * Same matching as `getMyFlat` (user_id first, opportunistic email link), returning
 * the whole row so self-service "My info" can show/edit it.
 */
export async function getMyResident(userId: string, userEmail: string, societyId: string): Promise<Resident | null> {
  const env = await getEnv();
  const conn = await db(env);
  if (conn) {
    const byId = await conn.prepare("SELECT * FROM residents WHERE society_id = ? AND user_id = ?")
      .bind(societyId, userId).first<Resident>();
    if (byId) return byId;
    const byEmail = await conn.prepare("SELECT * FROM residents WHERE society_id = ? AND email = ?")
      .bind(societyId, userEmail.toLowerCase()).first<Resident>();
    if (byEmail) {
      await conn.prepare("UPDATE residents SET user_id = ? WHERE id = ?").bind(userId, byEmail.id).run();
      return { ...byEmail, user_id: userId };
    }
    return null;
  }
  const store = mockStore();
  const resident = store.residents.find((r) => r.society_id === societyId && r.user_id === userId)
    ?? store.residents.find((r) => r.society_id === societyId && r.email?.toLowerCase() === userEmail.toLowerCase());
  if (resident && !resident.user_id) resident.user_id = userId;
  return resident ?? null;
}

/** Records that a user belongs to a society. Idempotent — joining twice is a no-op. */
export async function addMembership(userId: string, societyId: string): Promise<void> {
  const env = await getEnv();
  const conn = await db(env);
  if (conn) {
    await conn.prepare(
      "INSERT INTO society_members (id, user_id, society_id) VALUES (?, ?, ?) ON CONFLICT (user_id, society_id) DO NOTHING"
    ).bind(uid("m"), userId, societyId).run();
    return;
  }
  const store = mockStore();
  if (!store.members.some((m) => m.user_id === userId && m.society_id === societyId)) {
    store.members.push({ id: uid("m"), user_id: userId, society_id: societyId });
  }
}

/** Every member of one society — for the roles-assignment admin page. */
export async function getSocietyMembers(societyId: string): Promise<{ userId: string }[]> {
  const env = await getEnv();
  const conn = await db(env);
  if (conn) {
    const { results } = await conn.prepare("SELECT user_id FROM society_members WHERE society_id = ?")
      .bind(societyId)
      .all<{ user_id: string }>();
    return (results ?? []).map((r: { user_id: string }) => ({ userId: r.user_id }));
  }
  return mockStore().members.filter((m) => m.society_id === societyId).map((m) => ({ userId: m.user_id }));
}

export async function getOffices(userId: string, societyId: string): Promise<Office[]> {
  const env = await getEnv();
  const conn = await db(env);
  if (conn) {
    const { results } = await conn.prepare("SELECT office FROM society_offices WHERE society_id = ? AND user_id = ?")
      .bind(societyId, userId)
      .all<{ office: string }>();
    return (results ?? []).map((r: { office: string }) => r.office as Office);
  }
  return mockStore().offices.filter((o) => o.society_id === societyId && o.user_id === userId).map((o) => o.office);
}

export async function hasOffice(userId: string, societyId: string, office: Office): Promise<boolean> {
  return (await getOffices(userId, societyId)).includes(office);
}

/** Every society where this user currently holds at least one office — the actual source of admin privilege. */
export async function getSocietiesWithAnyOffice(userId: string): Promise<string[]> {
  const env = await getEnv();
  const conn = await db(env);
  if (conn) {
    const { results } = await conn.prepare("SELECT DISTINCT society_id FROM society_offices WHERE user_id = ?")
      .bind(userId)
      .all<{ society_id: string }>();
    return (results ?? []).map((r: { society_id: string }) => r.society_id);
  }
  return [...new Set(mockStore().offices.filter((o) => o.user_id === userId).map((o) => o.society_id))];
}

/** Replaces the full set of offices a user holds in a society (checkbox-style assignment). */
export async function setOffices(societyId: string, userId: string, offices: Office[]): Promise<void> {
  const clean = offices.filter((o) => OFFICES.includes(o));
  const env = await getEnv();
  const conn = await db(env);
  if (conn) {
    const deletes = [conn.prepare("DELETE FROM society_offices WHERE society_id = ? AND user_id = ?").bind(societyId, userId)];
    const inserts = clean.map((o) =>
      conn.prepare("INSERT INTO society_offices (society_id, user_id, office) VALUES (?, ?, ?)").bind(societyId, userId, o)
    );
    await conn.batch([...deletes, ...inserts]);
    return;
  }
  const store = mockStore();
  store.offices = store.offices.filter((o) => !(o.society_id === societyId && o.user_id === userId));
  for (const o of clean) store.offices.push({ society_id: societyId, user_id: userId, office: o });
}

export async function findSocietyByJoinCode(code: string): Promise<Society | undefined> {
  const env = await getEnv();
  const conn = await db(env);
  if (conn) {
    const row = await conn.prepare("SELECT * FROM societies WHERE join_code = ? AND status = 'approved'").bind(code).first<Society>();
    return row ?? undefined;
  }
  return mockStore().societies.find((s) => s.join_code === code && s.status === "approved");
}

function randomJoinCode(): string {
  return randomBytesAlnum(6);
}
function randomBytesAlnum(len: number): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no ambiguous chars
  let out = "";
  for (let i = 0; i < len; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

export { randomJoinCode };
