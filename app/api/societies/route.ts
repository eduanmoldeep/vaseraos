import { NextResponse } from "next/server";
import { DEFAULT_SOCIETY_ID, getEnv, mockStore, uid } from "@/lib/cloudflare";
import { requireAdmin } from "@/lib/auth";

export const runtime = "nodejs";

export async function GET() {
  const denied = await requireAdmin();
  if (denied) return denied;
  const env = await getEnv();
  if (env?.DB) {
    const { results } = await env.DB.prepare("SELECT * FROM societies ORDER BY name").all();
    return NextResponse.json(results);
  }
  return NextResponse.json(mockStore().societies);
}

export async function POST(req: Request) {
  const denied = await requireAdmin();
  if (denied) return denied;
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  const name = String(body.name ?? "").trim();
  if (!name) return NextResponse.json({ error: "Provide name" }, { status: 400 });
  const society = {
    id: uid("s"),
    name,
    city: String(body.city ?? ""),
  };
  const env = await getEnv();
  if (env?.DB) {
    await env.DB.prepare("INSERT INTO societies (id, name, city) VALUES (?, ?, ?)")
      .bind(society.id, society.name, society.city)
      .run();
  } else {
    mockStore().societies.push(society);
  }
  return NextResponse.json(society, { status: 201 });
}

export async function DELETE(req: Request) {
  const denied = await requireAdmin();
  if (denied) return denied;
  const id = new URL(req.url).searchParams.get("id") ?? "";
  if (!id) return NextResponse.json({ error: "Provide ?id=" }, { status: 400 });
  if (id === DEFAULT_SOCIETY_ID) {
    return NextResponse.json({ error: "Cannot delete the default society" }, { status: 400 });
  }
  const env = await getEnv();
  if (env?.DB) {
    const tables = ["residents", "maintenance_bills", "complaints", "visitors", "notices"];
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
  return NextResponse.json({ ok: true, id });
}
