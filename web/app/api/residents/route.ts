import { NextResponse } from "next/server";
import { DEFAULT_SOCIETY_ID, getEnv, mockStore, uid } from "@/lib/cloudflare";
import { requireSocietyAdmin } from "@/lib/auth";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const society_id = new URL(req.url).searchParams.get("society") ?? DEFAULT_SOCIETY_ID;
  const denied = await requireSocietyAdmin(society_id);
  if (denied) return denied;
  const env = await getEnv();
  if (env?.DB) {
    const { results } = await env.DB.prepare("SELECT * FROM residents WHERE society_id = ? ORDER BY flat")
      .bind(society_id)
      .all();
    return NextResponse.json(results);
  }
  return NextResponse.json(mockStore().residents.filter((r) => r.society_id === society_id));
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  const society_id = String(body.society_id ?? body.society ?? DEFAULT_SOCIETY_ID);
  const denied = await requireSocietyAdmin(society_id);
  if (denied) return denied;
  const resident = {
    id: uid("r"),
    name: String(body.name ?? "New Resident"),
    flat: String(body.flat ?? "A-100"),
    phone: String(body.phone ?? ""),
    email: body.email ? String(body.email) : undefined,
    members: Number(body.members ?? 1),
    owner_tenant: (body.owner_tenant === "owner" ? "owner" : "tenant") as "owner" | "tenant",
    society_id,
  };
  const env = await getEnv();
  if (env?.DB) {
    await env.DB.prepare(
      "INSERT INTO residents (id, name, flat, phone, email, members, owner_tenant, society_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
    )
      .bind(resident.id, resident.name, resident.flat, resident.phone, resident.email ?? null, resident.members, resident.owner_tenant, resident.society_id)
      .run();
  } else {
    mockStore().residents.push(resident);
  }
  return NextResponse.json(resident, { status: 201 });
}

export async function DELETE(req: Request) {
  const id = new URL(req.url).searchParams.get("id") ?? "";
  if (!id) return NextResponse.json({ error: "Provide ?id=" }, { status: 400 });
  const env = await getEnv();
  if (env?.DB) {
    const row = await env.DB.prepare("SELECT society_id FROM residents WHERE id = ?").bind(id).first<{ society_id: string }>();
    if (!row) return NextResponse.json({ error: "Resident not found" }, { status: 404 });
    const denied = await requireSocietyAdmin(row.society_id);
    if (denied) return denied;
    await env.DB.prepare("DELETE FROM residents WHERE id = ?").bind(id).run();
    return NextResponse.json({ ok: true, id });
  }
  const store = mockStore();
  const idx = store.residents.findIndex((r) => r.id === id);
  if (idx === -1) return NextResponse.json({ error: "Resident not found" }, { status: 404 });
  const denied = await requireSocietyAdmin(store.residents[idx].society_id);
  if (denied) return denied;
  store.residents.splice(idx, 1);
  return NextResponse.json({ ok: true, id });
}
