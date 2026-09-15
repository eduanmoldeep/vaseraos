import { NextResponse } from "next/server";
import { getEnv, mockStore } from "@/lib/cloudflare";
import { getViewer } from "@/lib/auth";
import { getMemberships, getOffices } from "@/lib/membership";

export const runtime = "nodejs";

/** The caller's own society memberships, with names and offices held — used to route them after login. */
export async function GET() {
  const viewer = await getViewer();
  if (!viewer) return NextResponse.json({ error: "Login required." }, { status: 401 });
  const memberships = await getMemberships(viewer.id);
  if (memberships.length === 0) return NextResponse.json([]);
  const env = await getEnv();
  const ids = memberships.map((m) => m.societyId);
  let names = new Map<string, { name: string; status: string; join_code: string | null }>();
  if (env?.DB) {
    const placeholders = ids.map(() => "?").join(",");
    const { results } = await env.DB.prepare(`SELECT id, name, status, join_code FROM societies WHERE id IN (${placeholders})`)
      .bind(...ids)
      .all<{ id: string; name: string; status: string; join_code: string | null }>();
    names = new Map((results ?? []).map((r: { id: string; name: string; status: string; join_code: string | null }) => [r.id, { name: r.name, status: r.status, join_code: r.join_code }]));
  } else {
    names = new Map(mockStore().societies.filter((s) => ids.includes(s.id)).map((s) => [s.id, { name: s.name, status: s.status, join_code: s.join_code ?? null }]));
  }
  const rows = await Promise.all(
    memberships.map(async (m) => ({
      societyId: m.societyId,
      name: names.get(m.societyId)?.name ?? "Unknown",
      status: names.get(m.societyId)?.status ?? "approved",
      join_code: names.get(m.societyId)?.join_code ?? null,
      offices: await getOffices(viewer.id, m.societyId),
    }))
  );
  return NextResponse.json(rows);
}
