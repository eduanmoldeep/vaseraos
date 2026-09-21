import { buildPushPayload, type PushSubscription as WebPushSubscription } from "@block65/webcrypto-web-push";
import { getEnv, uid, mockStore, type Env, type PushSubscriptionRow } from "./cloudflare";

async function db(env: Env | null) {
  return env?.DB ?? null;
}

export type PushSubscriptionInput = { endpoint: string; keys: { p256dh: string; auth: string } };

/** Saves (or refreshes) a browser's push subscription for this user. Upsert by endpoint. */
export async function savePushSubscription(userId: string, sub: PushSubscriptionInput): Promise<void> {
  const env = await getEnv();
  const conn = await db(env);
  if (conn) {
    await conn.prepare(
      `INSERT INTO push_subscriptions (id, user_id, endpoint, p256dh, auth) VALUES (?, ?, ?, ?, ?)
       ON CONFLICT (endpoint) DO UPDATE SET user_id = excluded.user_id, p256dh = excluded.p256dh, auth = excluded.auth`
    ).bind(uid("push"), userId, sub.endpoint, sub.keys.p256dh, sub.keys.auth).run();
    return;
  }
  const store = mockStore();
  const existing = store.pushSubscriptions.find((s) => s.endpoint === sub.endpoint);
  if (existing) {
    existing.user_id = userId;
    existing.p256dh = sub.keys.p256dh;
    existing.auth = sub.keys.auth;
  } else {
    store.pushSubscriptions.push({ id: uid("push"), user_id: userId, endpoint: sub.endpoint, p256dh: sub.keys.p256dh, auth: sub.keys.auth, created_at: new Date().toISOString() });
  }
}

/**
 * Removes a subscription (a device unsubscribing, or one we discovered is
 * dead). Pass `ownerId` when the caller must only be able to remove their own
 * (client-facing DELETE); omit it for internal cleanup (e.g. a dead endpoint
 * discovered mid-send, which may belong to any user).
 */
export async function removePushSubscription(endpoint: string, ownerId?: string): Promise<void> {
  const env = await getEnv();
  const conn = await db(env);
  if (conn) {
    if (ownerId) {
      await conn.prepare("DELETE FROM push_subscriptions WHERE endpoint = ? AND user_id = ?").bind(endpoint, ownerId).run();
    } else {
      await conn.prepare("DELETE FROM push_subscriptions WHERE endpoint = ?").bind(endpoint).run();
    }
    return;
  }
  const store = mockStore();
  store.pushSubscriptions = store.pushSubscriptions.filter((s) => s.endpoint !== endpoint || (ownerId ? s.user_id !== ownerId : false));
}

export async function hasPushSubscription(userId: string): Promise<boolean> {
  const env = await getEnv();
  const conn = await db(env);
  if (conn) {
    const row = await conn.prepare("SELECT id FROM push_subscriptions WHERE user_id = ? LIMIT 1").bind(userId).first();
    return !!row;
  }
  return mockStore().pushSubscriptions.some((s) => s.user_id === userId);
}

async function getSubscriptionsForUser(userId: string): Promise<PushSubscriptionRow[]> {
  const env = await getEnv();
  const conn = await db(env);
  if (conn) {
    const { results } = await conn.prepare("SELECT * FROM push_subscriptions WHERE user_id = ?").bind(userId).all<PushSubscriptionRow>();
    return results ?? [];
  }
  return mockStore().pushSubscriptions.filter((s) => s.user_id === userId);
}

/**
 * Best-effort: pushes a notification to every device a user has subscribed on.
 * Never throws — a push failure should never break the caller (e.g. notice
 * creation). Dead subscriptions (410/404) are cleaned up automatically.
 */
export async function sendPushToUser(userId: string, title: string, body?: string, url = "/"): Promise<void> {
  const env = await getEnv();
  const publicKey = env?.VAPID_PUBLIC_KEY;
  const privateKey = env?.VAPID_PRIVATE_KEY;
  if (!publicKey || !privateKey) {
    console.warn(`[push] skipped for user ${userId}: VAPID keys not configured in this environment`);
    return; // in-app notification still lands
  }

  const subs = await getSubscriptionsForUser(userId);
  if (subs.length === 0) {
    console.log(`[push] skipped for user ${userId}: no subscriptions on file`);
    return;
  }

  const vapid = { subject: "mailto:support@vaseraos.com", publicKey, privateKey };

  await Promise.all(
    subs.map(async (s) => {
      const subscription: WebPushSubscription = {
        endpoint: s.endpoint,
        expirationTime: null,
        keys: { p256dh: s.p256dh, auth: s.auth },
      };
      try {
        const payload = await buildPushPayload({ data: { title, body: body ?? null, url } }, subscription, vapid);
        const res = await fetch(subscription.endpoint, { method: payload.method, headers: payload.headers, body: payload.body });
        if (res.status === 404 || res.status === 410) {
          console.warn(`[push] dead subscription for user ${userId} (status ${res.status}) — removing`);
          await removePushSubscription(s.endpoint);
        } else if (!res.ok) {
          console.error(`[push] send failed for user ${userId}: ${res.status} ${await res.text().catch(() => "")}`);
        } else {
          console.log(`[push] sent to user ${userId}`);
        }
      } catch (err) {
        console.error(`[push] error sending to user ${userId}:`, err instanceof Error ? err.message : err);
      }
    })
  );
}
