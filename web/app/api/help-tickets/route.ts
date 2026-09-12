import { NextResponse } from "next/server";
import { getEnv, mockStore, uid, type HelpTicket } from "@/lib/cloudflare";
import { getViewer, requireAdmin } from "@/lib/auth";

export const runtime = "nodejs";

/** Platform admins see every ticket; everyone else sees only their own (to track status). */
export async function GET() {
  const viewer = await getViewer();
  if (!viewer) return NextResponse.json({ error: "Login required." }, { status: 401 });
  const env = await getEnv();
  if (env?.DB) {
    const { results } = viewer.admin
      ? await env.DB.prepare("SELECT * FROM help_tickets ORDER BY created_at DESC").all()
      : await env.DB.prepare("SELECT * FROM help_tickets WHERE user_id = ? ORDER BY created_at DESC").bind(viewer.id).all();
    return NextResponse.json(results);
  }
  const all = mockStore().helpTickets;
  return NextResponse.json(viewer.admin ? all : all.filter((t) => t.user_id === viewer.id));
}

/** Any signed-in user can raise a ticket. */
export async function POST(req: Request) {
  const viewer = await getViewer();
  if (!viewer) return NextResponse.json({ error: "Login required." }, { status: 401 });
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  const subject = String(body.subject ?? "").trim();
  const message = String(body.message ?? "").trim();
  if (!subject || !message) return NextResponse.json({ error: "Provide a subject and a message." }, { status: 400 });

  const ticket: HelpTicket = {
    id: uid("h"),
    user_id: viewer.id,
    society_id: body.society_id ? String(body.society_id) : null,
    subject,
    message,
    status: "open",
    created_at: new Date().toISOString(),
    resolved_at: null,
  };
  const env = await getEnv();
  if (env?.DB) {
    await env.DB.prepare(
      "INSERT INTO help_tickets (id, user_id, society_id, subject, message, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)"
    ).bind(ticket.id, ticket.user_id, ticket.society_id, ticket.subject, ticket.message, ticket.status, ticket.created_at).run();
  } else {
    mockStore().helpTickets.push(ticket);
  }
  return NextResponse.json(ticket, { status: 201 });
}

/** Platform admins only — resolve or reopen a ticket. */
export async function PATCH(req: Request) {
  const denied = await requireAdmin();
  if (denied) return denied;
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  const id = String(body.id ?? "");
  const status = body.status === "open" ? "open" : "resolved";
  if (!id) return NextResponse.json({ error: "Provide id." }, { status: 400 });
  const resolved_at = status === "resolved" ? new Date().toISOString() : null;

  const env = await getEnv();
  if (env?.DB) {
    await env.DB.prepare("UPDATE help_tickets SET status = ?, resolved_at = ? WHERE id = ?").bind(status, resolved_at, id).run();
    const updated = await env.DB.prepare("SELECT * FROM help_tickets WHERE id = ?").bind(id).first();
    if (!updated) return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
    return NextResponse.json(updated);
  }
  const ticket = mockStore().helpTickets.find((t) => t.id === id);
  if (!ticket) return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
  ticket.status = status;
  ticket.resolved_at = resolved_at;
  return NextResponse.json(ticket);
}
