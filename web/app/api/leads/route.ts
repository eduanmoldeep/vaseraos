import { NextResponse } from "next/server";
import { getEnv, mockStore, uid, type Lead } from "@/lib/cloudflare";
import { requireAdmin } from "@/lib/auth";

export const runtime = "nodejs";

const clip = (v: unknown, max: number) => String(v ?? "").trim().slice(0, max);

/** Platform admins only — list every lead, newest first. */
export async function GET() {
  const denied = await requireAdmin();
  if (denied) return denied;
  const env = await getEnv();
  if (env?.DB) {
    const { results } = await env.DB.prepare("SELECT * FROM leads ORDER BY created_at DESC").all();
    return NextResponse.json(results);
  }
  return NextResponse.json(mockStore().leads);
}

/** Public — anyone on the landing page can submit a lead. */
export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  // Honeypot: real users never fill this hidden field.
  if (body.website) return NextResponse.json({ ok: true }, { status: 201 });

  const name = clip(body.name, 100);
  const phone = clip(body.phone, 20);
  const email = clip(body.email, 120);
  if (!name || !phone) return NextResponse.json({ error: "Provide your name and phone." }, { status: 400 });
  if (!/^[+\d][\d\s-]{6,17}$/.test(phone)) return NextResponse.json({ error: "Enter a valid phone number." }, { status: 400 });
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return NextResponse.json({ error: "Enter a valid email." }, { status: 400 });
  const unitsNum = Number(body.units);
  const units = Number.isInteger(unitsNum) && unitsNum > 0 && unitsNum < 100000 ? unitsNum : null;

  const lead: Lead = {
    id: uid("l"),
    name,
    phone,
    email: email || null,
    society_name: clip(body.society_name, 120) || null,
    city: clip(body.city, 80) || null,
    units,
    message: clip(body.message, 1000) || null,
    created_at: new Date().toISOString(),
  };
  const env = await getEnv();
  if (env?.DB) {
    await env.DB.prepare(
      "INSERT INTO leads (id, name, phone, email, society_name, city, units, message, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)"
    ).bind(lead.id, lead.name, lead.phone, lead.email, lead.society_name, lead.city, lead.units, lead.message, lead.created_at).run();
  } else {
    mockStore().leads.push(lead);
  }
  return NextResponse.json({ ok: true }, { status: 201 });
}
