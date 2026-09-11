import { NextResponse } from "next/server";
import { getEnv, mockStore, uid } from "@/lib/cloudflare";

export const runtime = "edge";

export async function GET() {
  const env = await getEnv();
  if (env?.DB) {
    const { results } = await env.DB.prepare("SELECT * FROM residents ORDER BY flat").all();
    return NextResponse.json(results);
  }
  return NextResponse.json(mockStore().residents);
}

export async function POST(req: Request) {
  const body = await req.json();
  const resident = {
    id: uid("r"),
    name: String(body.name ?? "New Resident"),
    flat: String(body.flat ?? "A-100"),
    phone: String(body.phone ?? ""),
    email: body.email ? String(body.email) : undefined,
    members: Number(body.members ?? 1),
    owner_tenant: (body.owner_tenant === "tenant" ? "tenant" : "owner") as "owner" | "tenant",
  };
  const env = await getEnv();
  if (env?.DB) {
    await env.DB.prepare(
      "INSERT INTO residents (id, name, flat, phone, email, members, owner_tenant) VALUES (?, ?, ?, ?, ?, ?, ?)"
    )
      .bind(resident.id, resident.name, resident.flat, resident.phone, resident.email ?? null, resident.members, resident.owner_tenant)
      .run();
  } else {
    mockStore().residents.push(resident);
  }
  return NextResponse.json(resident, { status: 201 });
}
