import { NextResponse } from "next/server";
import { getEnv, mockStore, uid, type Lead, type LeadStatus } from "@/lib/cloudflare";
import { requireAdmin } from "@/lib/auth";

export const runtime = "nodejs";

const STATUSES: LeadStatus[] = ["new", "follow_up", "wip", "closed_lost", "closed_won"];

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
    status: "new",
    created_at: new Date().toISOString(),
  };
  const env = await getEnv();
  if (env?.DB) {
    await env.DB.prepare(
      "INSERT INTO leads (id, name, phone, email, society_name, city, units, message, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
    ).bind(lead.id, lead.name, lead.phone, lead.email, lead.society_name, lead.city, lead.units, lead.message, lead.status, lead.created_at).run();
  } else {
    mockStore().leads.push(lead);
  }
  return NextResponse.json({ ok: true }, { status: 201 });
}

/** Platform admins only — move a lead through the pipeline. */
export async function PATCH(req: Request) {
  const denied = await requireAdmin();
  if (denied) return denied;
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  const id = String(body.id ?? "");
  const status = body.status as LeadStatus;
  if (!id || !STATUSES.includes(status)) return NextResponse.json({ error: "Provide id and a valid status." }, { status: 400 });

  const env = await getEnv();
  if (env?.DB) {
    await env.DB.prepare("UPDATE leads SET status = ? WHERE id = ?").bind(status, id).run();
    const updated = await env.DB.prepare("SELECT * FROM leads WHERE id = ?").bind(id).first();
    if (!updated) return NextResponse.json({ error: "Lead not found" }, { status: 404 });
    return NextResponse.json(updated);
  }
  const lead = mockStore().leads.find((l) => l.id === id);
  if (!lead) return NextResponse.json({ error: "Lead not found" }, { status: 404 });
  lead.status = status;
  return NextResponse.json(lead);
}
