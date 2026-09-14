import { NextResponse } from "next/server";
import { getEnv, mockStore, uid, type Resident } from "@/lib/cloudflare";
import { getViewer, requireSocietyMember } from "@/lib/auth";
import { getMyResident } from "@/lib/membership";

export const runtime = "nodejs";

/** Your own resident record in a society (name, flat, phone, owner/tenant) — or null if unlinked. */
export async function GET(req: Request) {
  const society_id = new URL(req.url).searchParams.get("society") ?? "";
  const denied = await requireSocietyMember(society_id);
  if (denied) return denied;
  const viewer = (await getViewer())!;
  const resident = await getMyResident(viewer.id, viewer.email, society_id);
  return NextResponse.json(resident);
}

/**
 * Self-link: only when you have no resident row yet in this society. Declares your
 * own flat/phone. Once a row exists (self-declared or admin-added), further changes
 * go through PATCH (name/phone only) — flat stays admin-controlled to prevent a
 * resident from claiming a flat that isn't theirs.
 */
export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  const society_id = String(body.society_id ?? "");
  const denied = await requireSocietyMember(society_id);
  if (denied) return denied;
  const viewer = (await getViewer())!;

  const existing = await getMyResident(viewer.id, viewer.email, society_id);
  if (existing) return NextResponse.json({ error: "You're already linked to a flat here — ask your society admin to change it." }, { status: 409 });

  const flat = String(body.flat ?? "").trim();
  if (!flat) return NextResponse.json({ error: "Provide your flat." }, { status: 400 });

  const resident: Resident = {
    id: uid("r"),
    name: viewer.name || "Resident",
    flat,
    phone: String(body.phone ?? "").trim(),
    email: viewer.email,
    members: 1,
    owner_tenant: body.owner_tenant === "owner" ? "owner" : "tenant",
    society_id,
    user_id: viewer.id,
  };
  const conflictError = NextResponse.json(
    { error: `Flat ${flat} is already linked to another resident here — check the flat number, or ask your society admin.` },
    { status: 409 }
  );

  const env = await getEnv();
  if (env?.DB) {
    try {
      await env.DB.prepare(
        "INSERT INTO residents (id, name, flat, phone, email, members, owner_tenant, society_id, user_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)"
      )
        .bind(resident.id, resident.name, resident.flat, resident.phone, resident.email ?? null, resident.members, resident.owner_tenant, resident.society_id, resident.user_id)
        .run();
    } catch (err) {
      if (err instanceof Error && err.message.includes("UNIQUE")) return conflictError;
      throw err;
    }
  } else {
    const store = mockStore();
    if (store.residents.some((r) => r.society_id === society_id && r.flat === flat)) return conflictError;
    store.residents.push(resident);
  }
  return NextResponse.json(resident, { status: 201 });
}

/** Self-edit: name and phone only, on your own resident row. Flat/owner-tenant stay admin-controlled. */
export async function PATCH(req: Request) {
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  const society_id = String(body.society_id ?? "");
  const denied = await requireSocietyMember(society_id);
  if (denied) return denied;
  const viewer = (await getViewer())!;

  const existing = await getMyResident(viewer.id, viewer.email, society_id);
  if (!existing) return NextResponse.json({ error: "You're not linked to a flat here yet." }, { status: 404 });

  const name = body.name !== undefined ? String(body.name).trim() || existing.name : existing.name;
  const phone = body.phone !== undefined ? String(body.phone).trim() : existing.phone;

  const env = await getEnv();
  if (env?.DB) {
    await env.DB.prepare("UPDATE residents SET name = ?, phone = ? WHERE id = ?").bind(name, phone, existing.id).run();
  } else {
    const row = mockStore().residents.find((r) => r.id === existing.id);
    if (row) { row.name = name; row.phone = phone; }
  }
  return NextResponse.json({ ...existing, name, phone });
}
