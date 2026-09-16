import { getEnv, mockStore, uid, type Notification } from "./cloudflare";
import { getSocietyMembers } from "./membership";
import { sendPushToUser } from "./push";

/**
 * Notifies every member of a society (excluding one user, e.g. the actor who
 * caused it) — writes the in-app notification and, best-effort, a Web Push to
 * any device they've subscribed on. Push never blocks or fails this call.
 */
export async function notifySociety(societyId: string, title: string, body?: string, excludeUserId?: string): Promise<void> {
  const members = await getSocietyMembers(societyId);
  const userIds = members.map((m) => m.userId).filter((id) => id !== excludeUserId);
  if (userIds.length === 0) return;
  const created_at = new Date().toISOString();
  const env = await getEnv();
  if (env?.DB) {
    await env.DB.batch(
      userIds.map((userId) =>
        env.DB.prepare("INSERT INTO notifications (id, user_id, society_id, title, body, created_at) VALUES (?, ?, ?, ?, ?, ?)")
          .bind(uid("ntf"), userId, societyId, title, body ?? null, created_at)
      )
    );
  } else {
    const store = mockStore();
    for (const userId of userIds) {
      store.notifications.push({ id: uid("ntf"), user_id: userId, society_id: societyId, title, body: body ?? null, created_at });
    }
  }
  await Promise.all(userIds.map((userId) => sendPushToUser(userId, title, body)));
}

export async function listNotifications(userId: string, societyId: string, limit = 20): Promise<Notification[]> {
  const env = await getEnv();
  if (env?.DB) {
    const { results } = await env.DB.prepare(
      "SELECT * FROM notifications WHERE user_id = ? AND society_id = ? ORDER BY created_at DESC LIMIT ?"
    ).bind(userId, societyId, limit).all<Notification>();
    return results ?? [];
  }
  return mockStore().notifications
    .filter((n) => n.user_id === userId && n.society_id === societyId)
    .sort((a, b) => (a.created_at < b.created_at ? 1 : -1))
    .slice(0, limit);
}

export async function unreadCount(userId: string, societyId: string): Promise<number> {
  const env = await getEnv();
  if (env?.DB) {
    const row = await env.DB.prepare("SELECT COUNT(*) AS n FROM notifications WHERE user_id = ? AND society_id = ? AND read_at IS NULL")
      .bind(userId, societyId).first<{ n: number }>();
    return row?.n ?? 0;
  }
  return mockStore().notifications.filter((n) => n.user_id === userId && n.society_id === societyId && !n.read_at).length;
}

/** Marks one notification read (only if it belongs to this user), or all of a society's if `id` is omitted. */
export async function markRead(userId: string, societyId: string, id?: string): Promise<void> {
  const read_at = new Date().toISOString();
  const env = await getEnv();
  if (env?.DB) {
    if (id) {
      await env.DB.prepare("UPDATE notifications SET read_at = ? WHERE id = ? AND user_id = ?").bind(read_at, id, userId).run();
    } else {
      await env.DB.prepare("UPDATE notifications SET read_at = ? WHERE user_id = ? AND society_id = ? AND read_at IS NULL")
        .bind(read_at, userId, societyId).run();
    }
    return;
  }
  const store = mockStore();
  for (const n of store.notifications) {
    if (n.user_id !== userId) continue;
    if (id ? n.id === id : n.society_id === societyId && !n.read_at) n.read_at = read_at;
  }
}
