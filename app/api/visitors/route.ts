import { NextResponse } from "next/server";
import { getEnv, mockStore, uid, DEFAULT_SOCIETY_ID, type Visitor } from "@/lib/cloudflare";
import { requireSocietyAdmin, requireSocietyMember } from "@/lib/auth";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const society_id = new URL(req.url).searchParams.get("society") ?? DEFAULT_SOCIETY_ID;
  const denied = await requireSocietyMember(society_id);
  if (denied) return denied;
  const env = await getEnv();
  if (env?.DB) {
    const { results } = await env.DB.prepare("SELECT * FROM visitors WHERE society_id = ? ORDER BY created_at DESC")
      .bind(society_id)
      .all();
    return NextResponse.json(results);
  }
  return NextResponse.json(mockStore().visitors.filter((v) => v.society_id === society_id));
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  const society_id = String(body.society_id ?? body.society ?? DEFAULT_SOCIETY_ID);
  // Residents pre-approve their own visitors; admins can log on anyone's behalf.
  const denied = await requireSocietyMember(society_id);
  if (denied) return denied;
  const visitor = {
    id: uid("v"),
    name: String(body.name ?? "Guest"),
    flat: String(body.flat ?? "A-101"),
    purpose: String(body.purpose ?? "visit"),
    status: (["expected", "checked_in", "checked_out"].includes(body.status) ? body.status : "expected") as
      | "expected"
      | "checked_in"
      | "checked_out",
    society_id,
  };
  const env = await getEnv();
  if (env?.DB) {
    await env.DB.prepare("INSERT INTO visitors (id, name, flat, purpose, status, society_id) VALUES (?, ?, ?, ?, ?, ?)")
      .bind(visitor.id, visitor.name, visitor.flat, visitor.purpose, visitor.status, visitor.society_id)
      .run();
  } else {
    mockStore().visitors.push(visitor);
  }
  return NextResponse.json(visitor, { status: 201 });
}

const VISITOR_STATUSES = ["expected", "checked_in", "checked_out"] as const;

export async function PATCH(req: Request) {
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  const id = String(body.id ?? "");
  const status = String(body.status ?? "");
  if (!id || !VISITOR_STATUSES.includes(status as (typeof VISITOR_STATUSES)[number])) {
    return NextResponse.json({ error: "Provide id and valid status: expected | checked_in | checked_out" }, { status: 400 });
  }
  const env = await getEnv();
  if (env?.DB) {
    const row = await env.DB.prepare("SELECT society_id FROM visitors WHERE id = ?").bind(id).first<{ society_id: string }>();
    if (!row) return NextResponse.json({ error: "Visitor not found" }, { status: 404 });
    const denied = await requireSocietyAdmin(row.society_id);
    if (denied) return denied;
    await env.DB.prepare("UPDATE visitors SET status = ? WHERE id = ?").bind(status, id).run();
    const updated = await env.DB.prepare("SELECT * FROM visitors WHERE id = ?").bind(id).first();
    return NextResponse.json(updated);
  }
  const visitor = mockStore().visitors.find((v) => v.id === id);
  if (!visitor) return NextResponse.json({ error: "Visitor not found" }, { status: 404 });
  const denied = await requireSocietyAdmin(visitor.society_id);
  if (denied) return denied;
  visitor.status = status as Visitor["status"];
  return NextResponse.json(visitor);
}

export async function DELETE(req: Request) {
  const id = new URL(req.url).searchParams.get("id") ?? "";
  if (!id) return NextResponse.json({ error: "Provide ?id=" }, { status: 400 });
  const env = await getEnv();
  if (env?.DB) {
    const row = await env.DB.prepare("SELECT society_id FROM visitors WHERE id = ?").bind(id).first<{ society_id: string }>();
    if (!row) return NextResponse.json({ error: "Visitor not found" }, { status: 404 });
    const denied = await requireSocietyAdmin(row.society_id);
    if (denied) return denied;
    await env.DB.prepare("DELETE FROM visitors WHERE id = ?").bind(id).run();
    return NextResponse.json({ ok: true, id });
  }
  const store = mockStore();
  const idx = store.visitors.findIndex((v) => v.id === id);
  if (idx === -1) return NextResponse.json({ error: "Visitor not found" }, { status: 404 });
  const denied = await requireSocietyAdmin(store.visitors[idx].society_id);
  if (denied) return denied;
  store.visitors.splice(idx, 1);
  return NextResponse.json({ ok: true, id });
}
