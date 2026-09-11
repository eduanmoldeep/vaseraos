import { NextResponse } from "next/server";
import { getEnv, mockStore, uid, DEFAULT_SOCIETY_ID, type Complaint } from "@/lib/cloudflare";
import { requireAdmin } from "@/lib/auth";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const denied = await requireAdmin();
  if (denied) return denied;
  const society_id = new URL(req.url).searchParams.get("society") ?? DEFAULT_SOCIETY_ID;
  const env = await getEnv();
  if (env?.DB) {
    const { results } = await env.DB.prepare("SELECT * FROM complaints WHERE society_id = ? ORDER BY created_at DESC")
      .bind(society_id)
      .all();
    return NextResponse.json(results);
  }
  return NextResponse.json(mockStore().complaints.filter((c) => c.society_id === society_id));
}

export async function POST(req: Request) {
  const denied = await requireAdmin();
  if (denied) return denied;
  const body = await req.json();
  const complaint = {
    id: uid("c"),
    flat: String(body.flat ?? "A-101"),
    title: String(body.title ?? "New complaint"),
    category: String(body.category ?? "general"),
    status: (["open", "in_progress", "resolved"].includes(body.status) ? body.status : "open") as "open" | "in_progress" | "resolved",
    society_id: String(body.society_id ?? body.society ?? DEFAULT_SOCIETY_ID),
  };
  const env = await getEnv();
  if (env?.DB) {
    await env.DB.prepare("INSERT INTO complaints (id, flat, title, category, status, society_id) VALUES (?, ?, ?, ?, ?, ?)")
      .bind(complaint.id, complaint.flat, complaint.title, complaint.category, complaint.status, complaint.society_id)
      .run();
  } else {
    mockStore().complaints.push(complaint);
  }
  return NextResponse.json(complaint, { status: 201 });
}

const COMPLAINT_STATUSES = ["open", "in_progress", "resolved"] as const;

export async function PATCH(req: Request) {
  const denied = await requireAdmin();
  if (denied) return denied;
  const body = await req.json();
  const id = String(body.id ?? "");
  const status = String(body.status ?? "");
  if (!id || !COMPLAINT_STATUSES.includes(status as (typeof COMPLAINT_STATUSES)[number])) {
    return NextResponse.json({ error: "Provide id and valid status: open | in_progress | resolved" }, { status: 400 });
  }
  const env = await getEnv();
  if (env?.DB) {
    const res = await env.DB.prepare("UPDATE complaints SET status = ? WHERE id = ?")
      .bind(status, id)
      .run();
    if (res.meta.changes === 0) {
      return NextResponse.json({ error: "Complaint not found" }, { status: 404 });
    }
    const row = await env.DB.prepare("SELECT * FROM complaints WHERE id = ?").bind(id).first();
    return NextResponse.json(row);
  }
  const complaint = mockStore().complaints.find((c) => c.id === id);
  if (!complaint) return NextResponse.json({ error: "Complaint not found" }, { status: 404 });
  complaint.status = status as Complaint["status"];
  return NextResponse.json(complaint);
}

export async function DELETE(req: Request) {
  const denied = await requireAdmin();
  if (denied) return denied;
  const id = new URL(req.url).searchParams.get("id") ?? "";
  if (!id) return NextResponse.json({ error: "Provide ?id=" }, { status: 400 });
  const env = await getEnv();
  if (env?.DB) {
    const res = await env.DB.prepare("DELETE FROM complaints WHERE id = ?").bind(id).run();
    if (res.meta.changes === 0) {
      return NextResponse.json({ error: "Complaint not found" }, { status: 404 });
    }
    return NextResponse.json({ ok: true, id });
  }
  const store = mockStore();
  const idx = store.complaints.findIndex((c) => c.id === id);
  if (idx === -1) return NextResponse.json({ error: "Complaint not found" }, { status: 404 });
  store.complaints.splice(idx, 1);
  return NextResponse.json({ ok: true, id });
}
