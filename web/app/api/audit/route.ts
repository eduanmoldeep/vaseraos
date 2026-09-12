import { NextResponse } from "next/server";
import { listUsers, requireAdmin } from "@/lib/auth";
import { listAuditLog } from "@/lib/audit";

export const runtime = "nodejs";

export async function GET() {
  const denied = await requireAdmin();
  if (denied) return denied;
  const [entries, users] = await Promise.all([listAuditLog(), listUsers()]);
  const nameOf = new Map(users.map((u) => [u.id, u.name]));
  return NextResponse.json(
    entries.map((e) => ({
      ...e,
      actorName: nameOf.get(e.actor_id) ?? e.actor_id,
      targetName: e.target_user_id ? nameOf.get(e.target_user_id) ?? e.target_user_id : null,
    }))
  );
}
