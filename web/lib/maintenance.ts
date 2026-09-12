import { getEnv, uid, mockStore, type Env, type Cadence, type MaintenanceSetting } from "./cloudflare";

export const CADENCES: Cadence[] = ["monthly", "quarterly", "yearly"];

async function db(env: Env | null) {
  return env?.DB ?? null;
}

/** Current billing period label for a cadence — bills raised in the same period share this key so re-checks stay idempotent. */
export function currentPeriod(cadence: Cadence, now = new Date()): string {
  const y = now.getFullYear();
  const m = now.getMonth();
  if (cadence === "yearly") return `${y}`;
  if (cadence === "quarterly") return `${y}-Q${Math.floor(m / 3) + 1}`;
  return `${y}-${String(m + 1).padStart(2, "0")}`;
}

export async function getMaintenanceSetting(societyId: string): Promise<MaintenanceSetting | undefined> {
  const env = await getEnv();
  const conn = await db(env);
  if (conn) {
    const row = await conn.prepare("SELECT * FROM maintenance_settings WHERE society_id = ?").bind(societyId).first<MaintenanceSetting>();
    return row ?? undefined;
  }
  return mockStore().maintenanceSettings.find((s) => s.society_id === societyId);
}

/** Treasurer-set config: amount due and how often. Upsert — one row per society. */
export async function setMaintenanceSetting(societyId: string, amount: number, cadence: Cadence, updatedBy: string): Promise<MaintenanceSetting> {
  const updated_at = new Date().toISOString();
  const env = await getEnv();
  const conn = await db(env);
  if (conn) {
    await conn.prepare(
      `INSERT INTO maintenance_settings (society_id, amount, cadence, updated_by, updated_at) VALUES (?, ?, ?, ?, ?)
       ON CONFLICT (society_id) DO UPDATE SET amount = excluded.amount, cadence = excluded.cadence, updated_by = excluded.updated_by, updated_at = excluded.updated_at`
    ).bind(societyId, amount, cadence, updatedBy, updated_at).run();
  } else {
    const store = mockStore();
    const existing = store.maintenanceSettings.find((s) => s.society_id === societyId);
    if (existing) {
      existing.amount = amount;
      existing.cadence = cadence;
      existing.updated_by = updatedBy;
      existing.updated_at = updated_at;
    } else {
      store.maintenanceSettings.push({ society_id: societyId, amount, cadence, updated_by: updatedBy, updated_at });
    }
  }
  return { society_id: societyId, amount, cadence, updated_by: updatedBy, updated_at };
}

/**
 * Lazily raises this period's due bill for every resident flat missing one.
 * No cron trigger needed — called wherever bills/dues are read, so the due
 * bill "just appears" the first time anyone loads the page after the period
 * (1st of the month/quarter/year) rolls over. Idempotent per (society, flat, period).
 */
export async function ensureMaintenanceDue(societyId: string): Promise<void> {
  const setting = await getMaintenanceSetting(societyId);
  if (!setting) return;
  const period = currentPeriod(setting.cadence);
  const env = await getEnv();
  const conn = await db(env);
  if (conn) {
    const { results: flats } = await conn.prepare("SELECT DISTINCT flat FROM residents WHERE society_id = ?")
      .bind(societyId).all<{ flat: string }>();
    const { results: existing } = await conn.prepare("SELECT flat FROM maintenance_bills WHERE society_id = ? AND month = ?")
      .bind(societyId, period).all<{ flat: string }>();
    const have = new Set((existing ?? []).map((r: { flat: string }) => r.flat));
    const missing = (flats ?? []).filter((r: { flat: string }) => !have.has(r.flat));
    if (missing.length === 0) return;
    await conn.batch(missing.map((r: { flat: string }) =>
      conn.prepare("INSERT INTO maintenance_bills (id, flat, amount, month, status, society_id) VALUES (?, ?, ?, ?, 'pending', ?)")
        .bind(uid("b"), r.flat, setting.amount, period, societyId)
    ));
    return;
  }
  const store = mockStore();
  const flats = [...new Set(store.residents.filter((r) => r.society_id === societyId).map((r) => r.flat))];
  const have = new Set(store.bills.filter((b) => b.society_id === societyId && b.month === period).map((b) => b.flat));
  for (const flat of flats) {
    if (!have.has(flat)) {
      store.bills.push({ id: uid("b"), flat, amount: setting.amount, month: period, status: "pending", society_id: societyId });
    }
  }
}
