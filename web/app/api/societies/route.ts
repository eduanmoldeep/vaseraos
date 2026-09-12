import { NextResponse } from "next/server";
import { DEFAULT_SOCIETY_ID, getEnv, mockStore, uid, type Society } from "@/lib/cloudflare";
import { getViewer, requireAdmin, requireSocietyAdmin } from "@/lib/auth";
import { getSocietiesWithAnyOffice, randomJoinCode } from "@/lib/membership";

export const runtime = "nodejs";

/** Societies the caller manages: every society for a platform admin, else their own admin memberships. */
export async function GET() {
  const viewer = await getViewer();
  if (!viewer) return NextResponse.json({ error: "Login required." }, { status: 401 });
  const env = await getEnv();
  if (viewer.admin) {
    if (env?.DB) {
      const { results } = await env.DB.prepare("SELECT * FROM societies ORDER BY name").all();
      return NextResponse.json(results);
    }
    return NextResponse.json(mockStore().societies);
  }
  const adminSocietyIds = await getSocietiesWithAnyOffice(viewer.id);
  if (adminSocietyIds.length === 0) return NextResponse.json({ error: "Admin access required." }, { status: 403 });
  if (env?.DB) {
    const placeholders = adminSocietyIds.map(() => "?").join(",");
    const { results } = await env.DB.prepare(`SELECT * FROM societies WHERE id IN (${placeholders}) ORDER BY name`)
      .bind(...adminSocietyIds)
      .all();
    return NextResponse.json(results);
  }
  return NextResponse.json(mockStore().societies.filter((s) => adminSocietyIds.includes(s.id)));
}

/** Platform admin creates a society directly — auto-approved, no join code yet. */
export async function POST(req: Request) {
  const denied = await requireAdmin();
  if (denied) return denied;
  const viewer = await getViewer();
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  const name = String(body.name ?? "").trim();
  if (!name) return NextResponse.json({ error: "Provide name" }, { status: 400 });
  const society: Society = {
    id: uid("s"),
    name,
    city: String(body.city ?? ""),
    status: "approved",
    created_by: viewer?.id ?? null,
  };
  const env = await getEnv();
  if (env?.DB) {
    await env.DB.prepare("INSERT INTO societies (id, name, city, status, created_by) VALUES (?, ?, ?, 'approved', ?)")
      .bind(society.id, society.name, society.city, society.created_by)
      .run();
  } else {
    mockStore().societies.push(society);
  }
  return NextResponse.json(society, { status: 201 });
}

/** Platform admin approves or rejects a self-registered society. */
export async function PATCH(req: Request) {
  const denied = await requireAdmin();
  if (denied) return denied;
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  const id = String(body.id ?? "");
  const action = String(body.action ?? "");
  if (!id || !["approve", "reject"].includes(action)) {
    return NextResponse.json({ error: "Provide id and action: approve | reject" }, { status: 400 });
  }
  const env = await getEnv();
  if (action === "reject") {
    if (env?.DB) {
      await env.DB.batch([
        env.DB.prepare("DELETE FROM society_members WHERE society_id = ?").bind(id),
        env.DB.prepare("DELETE FROM society_offices WHERE society_id = ?").bind(id),
        env.DB.prepare("DELETE FROM societies WHERE id = ?").bind(id),
      ]);
    } else {
      const store = mockStore();
      store.societies = store.societies.filter((s) => s.id !== id);
      store.members = store.members.filter((m) => m.society_id !== id);
      store.offices = store.offices.filter((o) => o.society_id !== id);
    }
    return NextResponse.json({ ok: true, id, status: "rejected" });
  }
  const joinCode = randomJoinCode();
  if (env?.DB) {
    const res = await env.DB.prepare("UPDATE societies SET status = 'approved', join_code = ? WHERE id = ?").bind(joinCode, id).run();
    if (res.meta.changes === 0) return NextResponse.json({ error: "Society not found" }, { status: 404 });
  } else {
    const society = mockStore().societies.find((s) => s.id === id);
    if (!society) return NextResponse.json({ error: "Society not found" }, { status: 404 });
    society.status = "approved";
    society.join_code = joinCode;
  }
  return NextResponse.json({ ok: true, id, status: "approved", joinCode });
}

export async function DELETE(req: Request) {
  const id = new URL(req.url).searchParams.get("id") ?? "";
  if (!id) return NextResponse.json({ error: "Provide ?id=" }, { status: 400 });
  if (id === DEFAULT_SOCIETY_ID) {
    return NextResponse.json({ error: "Cannot delete the default society" }, { status: 400 });
  }
  const denied = await requireSocietyAdmin(id);
  if (denied) return denied;
  const env = await getEnv();
  if (env?.DB) {
    const tables = ["residents", "maintenance_bills", "complaints", "visitors", "notices", "society_members", "society_offices"];
    const results = await env.DB.batch([
      ...tables.map((t) => env.DB.prepare(`DELETE FROM ${t} WHERE society_id = ?`).bind(id)),
      env.DB.prepare("DELETE FROM societies WHERE id = ?").bind(id),
    ]);
    const res = results[results.length - 1];
    if (res.meta.changes === 0) {
      return NextResponse.json({ error: "Society not found" }, { status: 404 });
    }
    return NextResponse.json({ ok: true, id });
  }
  const store = mockStore();
  const idx = store.societies.findIndex((s) => s.id === id);
  if (idx === -1) return NextResponse.json({ error: "Society not found" }, { status: 404 });
  store.societies.splice(idx, 1);
  store.residents = store.residents.filter((r) => r.society_id !== id);
  store.bills = store.bills.filter((b) => b.society_id !== id);
  store.complaints = store.complaints.filter((c) => c.society_id !== id);
  store.visitors = store.visitors.filter((v) => v.society_id !== id);
  store.notices = store.notices.filter((n) => n.society_id !== id);
  store.members = store.members.filter((m) => m.society_id !== id);
  store.offices = store.offices.filter((o) => o.society_id !== id);
  return NextResponse.json({ ok: true, id });
}
