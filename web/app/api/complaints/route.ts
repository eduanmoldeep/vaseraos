import { NextResponse } from "next/server";
import { getEnv, mockStore, uid, DEFAULT_SOCIETY_ID, type Complaint } from "@/lib/cloudflare";
import { getViewer, requireSocietyAdmin, requireSocietyMember } from "@/lib/auth";
import { getMyFlat, getOffices } from "@/lib/membership";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const society_id = url.searchParams.get("society") ?? DEFAULT_SOCIETY_ID;
  const mine = url.searchParams.get("mine") === "1";
  const denied = await requireSocietyMember(society_id);
  if (denied) return denied;

  let myFlat: string | null = null;
  if (mine) {
    const viewer = (await getViewer())!; // requireSocietyMember already confirmed a logged-in viewer
    myFlat = await getMyFlat(viewer.id, viewer.email, society_id);
    if (!myFlat) return NextResponse.json([]);
  }

  const env = await getEnv();
  if (env?.DB) {
    const { results } = await env.DB.prepare("SELECT * FROM complaints WHERE society_id = ? ORDER BY created_at DESC")
      .bind(society_id)
      .all<Complaint>();
    return NextResponse.json(mine ? (results as Complaint[]).filter((c) => c.flat === myFlat) : results);
  }
  const rows = mockStore().complaints.filter((c) => c.society_id === society_id);
  return NextResponse.json(mine ? rows.filter((c) => c.flat === myFlat) : rows);
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  const society_id = String(body.society_id ?? body.society ?? DEFAULT_SOCIETY_ID);
  // Any member can raise a ticket — residents raise their own, admins raise on a resident's behalf.
  const denied = await requireSocietyMember(society_id);
  if (denied) return denied;

  const viewer = (await getViewer())!; // requireSocietyMember already confirmed a logged-in viewer
  const isAdminish = viewer.admin || (await getOffices(viewer.id, society_id)).length > 0;
  let flat: string;
  if (isAdminish && body.flat) {
    flat = String(body.flat);
  } else {
    const myFlat = await getMyFlat(viewer.id, viewer.email, society_id);
    if (!myFlat) {
      return NextResponse.json(
        { error: "Your account isn't linked to a flat yet — ask your society admin to add you as a resident with this email." },
        { status: 400 }
      );
    }
    flat = myFlat;
  }

  const complaint = {
    id: uid("c"),
    flat,
    title: String(body.title ?? "New complaint"),
    category: String(body.category ?? "general"),
    status: (["open", "in_progress", "resolved"].includes(body.status) ? body.status : "open") as "open" | "in_progress" | "resolved",
    society_id,
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
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  const id = String(body.id ?? "");
  const status = String(body.status ?? "");
  if (!id || !COMPLAINT_STATUSES.includes(status as (typeof COMPLAINT_STATUSES)[number])) {
    return NextResponse.json({ error: "Provide id and valid status: open | in_progress | resolved" }, { status: 400 });
  }
  const env = await getEnv();
  if (env?.DB) {
    const row = await env.DB.prepare("SELECT society_id FROM complaints WHERE id = ?").bind(id).first<{ society_id: string }>();
    if (!row) return NextResponse.json({ error: "Complaint not found" }, { status: 404 });
    const denied = await requireSocietyAdmin(row.society_id);
    if (denied) return denied;
    await env.DB.prepare("UPDATE complaints SET status = ? WHERE id = ?").bind(status, id).run();
    const updated = await env.DB.prepare("SELECT * FROM complaints WHERE id = ?").bind(id).first();
    return NextResponse.json(updated);
  }
  const complaint = mockStore().complaints.find((c) => c.id === id);
  if (!complaint) return NextResponse.json({ error: "Complaint not found" }, { status: 404 });
  const denied = await requireSocietyAdmin(complaint.society_id);
  if (denied) return denied;
  complaint.status = status as Complaint["status"];
  return NextResponse.json(complaint);
}

export async function DELETE(req: Request) {
  const id = new URL(req.url).searchParams.get("id") ?? "";
  if (!id) return NextResponse.json({ error: "Provide ?id=" }, { status: 400 });
  const env = await getEnv();
  if (env?.DB) {
    const row = await env.DB.prepare("SELECT society_id FROM complaints WHERE id = ?").bind(id).first<{ society_id: string }>();
    if (!row) return NextResponse.json({ error: "Complaint not found" }, { status: 404 });
    const denied = await requireSocietyAdmin(row.society_id);
    if (denied) return denied;
    await env.DB.prepare("DELETE FROM complaints WHERE id = ?").bind(id).run();
    return NextResponse.json({ ok: true, id });
  }
  const store = mockStore();
  const idx = store.complaints.findIndex((c) => c.id === id);
  if (idx === -1) return NextResponse.json({ error: "Complaint not found" }, { status: 404 });
  const denied = await requireSocietyAdmin(store.complaints[idx].society_id);
  if (denied) return denied;
  store.complaints.splice(idx, 1);
  return NextResponse.json({ ok: true, id });
}
