import { NextResponse } from "next/server";
import { DEFAULT_SOCIETY_ID, getEnv, mockStore } from "@/lib/cloudflare";
import { requireAdmin, requireSocietyMember } from "@/lib/auth";

export const runtime = "nodejs";

// Aggregated dashboard numbers — served from D1 on Cloudflare, mock locally.
// Scoped by ?society=<id>; ?society=all for platform-wide totals (platform admin only).
export async function GET(req: Request) {
  const society = new URL(req.url).searchParams.get("society") ?? DEFAULT_SOCIETY_ID;
  const scoped = society !== "all";
  const denied = scoped ? await requireSocietyMember(society) : await requireAdmin();
  if (denied) return denied;
  const env = await getEnv();
  if (env?.DB) {
    const where = (col = "society_id") => (scoped ? `WHERE ${col} = ?` : "");
    const args = (scoped ? [society] : []) as string[];
    const [r, b, c, v] = await Promise.all([
      env.DB.prepare(`SELECT COUNT(*) AS n FROM residents ${where()}`).bind(...args).all<{ n: number }>(),
      env.DB.prepare(`SELECT COALESCE(SUM(amount),0) AS due FROM maintenance_bills ${where()}${scoped ? " AND" : "WHERE"} status != 'paid'`).bind(...args).all<{ due: number }>(),
      env.DB.prepare(`SELECT COUNT(*) AS n FROM complaints ${where()}${scoped ? " AND" : "WHERE"} status != 'resolved'`).bind(...args).all<{ n: number }>(),
      env.DB.prepare(`SELECT COUNT(*) AS n FROM visitors ${where()}${scoped ? " AND" : "WHERE"} status != 'checked_out'`).bind(...args).all<{ n: number }>(),
    ]);
      return NextResponse.json({
      residents: r.results[0]?.n ?? 0,
      dues: b.results[0]?.due ?? 0,
      openComplaints: c.results[0]?.n ?? 0,
      activeVisitors: v.results[0]?.n ?? 0,
    });
  }
  const s = mockStore();
  const inScope = <T extends { society_id: string }>(rows: T[]) =>
    scoped ? rows.filter((x) => x.society_id === society) : rows;
  const bills = inScope(s.bills).filter((x) => x.status !== "paid");
  return NextResponse.json({
    residents: inScope(s.residents).length,
    dues: bills.reduce((a, x) => a + x.amount, 0),
    openComplaints: inScope(s.complaints).filter((x) => x.status !== "resolved").length,
    activeVisitors: inScope(s.visitors).filter((x) => x.status !== "checked_out").length,
  });
}
