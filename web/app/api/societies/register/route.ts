import { NextResponse } from "next/server";
import { getEnv, mockStore, uid, type Office, type Society } from "@/lib/cloudflare";
import { getViewer } from "@/lib/auth";
import { getRequestIp, logAudit } from "@/lib/audit";
import { addMembership, setOffices } from "@/lib/membership";

const ALL_OFFICES: Office[] = ["president", "secretary", "treasurer"];

export const runtime = "nodejs";

/** Any signed-in user can register a new society. It stays pending until a platform admin approves it. */
export async function POST(req: Request) {
  const viewer = await getViewer();
  if (!viewer) return NextResponse.json({ error: "Login required." }, { status: 401 });
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  const name = String(body.name ?? "").trim();
  if (!name) return NextResponse.json({ error: "Provide a society name." }, { status: 400 });
  const flat = String(body.flat ?? "").trim() || "A-101";
  const phone = String(body.phone ?? "").trim();
  const society: Society = {
    id: uid("s"),
    name,
    city: String(body.city ?? ""),
    status: "pending",
    created_by: viewer.id,
  };
  const env = await getEnv();
  if (env?.DB) {
    await env.DB.batch([
      env.DB.prepare("INSERT INTO societies (id, name, city, status, created_by) VALUES (?, ?, ?, 'pending', ?)")
        .bind(society.id, society.name, society.city, society.created_by),
      env.DB.prepare(
        "INSERT INTO residents (id, name, flat, phone, email, members, owner_tenant, society_id) VALUES (?, ?, ?, ?, ?, 1, 'owner', ?)"
      ).bind(uid("r"), viewer.name, flat, phone, viewer.email, society.id),
    ]);
  } else {
    mockStore().societies.push(society);
    mockStore().residents.push({
      id: uid("r"),
      name: viewer.name,
      flat,
      phone,
      email: viewer.email,
      members: 1,
      owner_tenant: "owner",
      society_id: society.id,
    });
  }
  // Registrant becomes the society's first resident, holding every office until they redistribute them.
  await addMembership(viewer.id, society.id);
  await setOffices(society.id, viewer.id, ALL_OFFICES);
  await logAudit({
    actorId: viewer.id,
    action: "society.register",
    societyId: society.id,
    detail: `offices=${ALL_OFFICES.join(",")}`,
    ip: getRequestIp(req),
  });
  return NextResponse.json(society, { status: 201 });
}
