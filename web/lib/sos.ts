import { getEnv, mockStore, uid, type Env, type SosAlert } from "./cloudflare";
import { getGuardPushTokens } from "./guard";

async function db(env: Env | null) {
  return env?.DB ?? null;
}

export async function raiseSos(societyId: string, userId: string, flat: string): Promise<SosAlert> {
  const env = await getEnv();
  const conn = await db(env);
  const alert: SosAlert = {
    id: uid("sos"),
    society_id: societyId,
    raised_by_user_id: userId,
    flat,
    status: "open",
    created_at: new Date().toISOString(),
  };
  if (conn) {
    await conn.prepare("INSERT INTO sos_alerts (id, society_id, raised_by_user_id, flat, status) VALUES (?, ?, ?, ?, 'open')")
      .bind(alert.id, alert.society_id, alert.raised_by_user_id, alert.flat)
      .run();
  } else {
    mockStore().sosAlerts.unshift(alert);
  }
  return alert;
}

export async function listActiveSos(societyId: string): Promise<SosAlert[]> {
  const env = await getEnv();
  const conn = await db(env);
  if (conn) {
    const { results } = await conn.prepare("SELECT * FROM sos_alerts WHERE society_id = ? AND status != 'resolved' ORDER BY created_at DESC")
      .bind(societyId)
      .all<SosAlert>();
    return results ?? [];
  }
  return mockStore().sosAlerts.filter((s) => s.society_id === societyId && s.status !== "resolved");
}

export async function getSos(id: string): Promise<SosAlert | undefined> {
  const env = await getEnv();
  const conn = await db(env);
  if (conn) {
    const row = await conn.prepare("SELECT * FROM sos_alerts WHERE id = ?").bind(id).first<SosAlert>();
    return row ?? undefined;
  }
  return mockStore().sosAlerts.find((s) => s.id === id);
}

export async function acknowledgeSos(id: string, guardId: string): Promise<SosAlert | undefined> {
  const now = new Date().toISOString();
  const env = await getEnv();
  const conn = await db(env);
  if (conn) {
    await conn.prepare("UPDATE sos_alerts SET status = 'acknowledged', acknowledged_by_guard_id = ?, acknowledged_at = ? WHERE id = ? AND status = 'open'")
      .bind(guardId, now, id)
      .run();
    return getSos(id);
  }
  const alert = mockStore().sosAlerts.find((s) => s.id === id);
  if (alert && alert.status === "open") {
    alert.status = "acknowledged";
    alert.acknowledged_by_guard_id = guardId;
    alert.acknowledged_at = now;
  }
  return alert;
}

export async function resolveSos(id: string): Promise<SosAlert | undefined> {
  const now = new Date().toISOString();
  const env = await getEnv();
  const conn = await db(env);
  if (conn) {
    await conn.prepare("UPDATE sos_alerts SET status = 'resolved', resolved_at = ? WHERE id = ?").bind(now, id).run();
    return getSos(id);
  }
  const alert = mockStore().sosAlerts.find((s) => s.id === id);
  if (alert) {
    alert.status = "resolved";
    alert.resolved_at = now;
  }
  return alert;
}

/**
 * Fans the alert out to every active guard device in the society. Android goes
 * through Expo's push service (data-only, so the guard app's own background
 * handler shows the real alarm rather than a default OS banner) — no secrets
 * needed, Expo manages FCM delivery for us. iOS VoIP/APNs delivery is wired in
 * once the Apple `.p8` auth key + Team ID + Key ID are configured (Phase F) —
 * until then this is a documented no-op for iOS tokens.
 * Best-effort like `logAudit`: a push failure must never fail the SOS request.
 */
export async function notifyGuards(societyId: string, alert: SosAlert): Promise<void> {
  try {
    const tokens = await getGuardPushTokens(societyId);
    const expoTokens = tokens.filter((t) => t.platform === "android" && t.expo_token).map((t) => t.expo_token as string);
    if (expoTokens.length > 0) {
      await fetch("https://exp.host/--/api/v2/push/send", {
        method: "POST",
        headers: { "content-type": "application/json", accept: "application/json" },
        body: JSON.stringify(
          expoTokens.map((to) => ({
            to,
            priority: "high",
            data: { type: "sos", sosId: alert.id, societyId, flat: alert.flat },
          }))
        ),
      });
    }
    // iOS VoIP/APNs delivery: see notifyGuardsIOS() in Phase F once .p8/Team ID/Key ID are configured.
  } catch {
    // Push delivery is best-effort — never fail the SOS request over it.
  }
}
