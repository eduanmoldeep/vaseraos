import { NextResponse } from "next/server";
import { getEnv, mockStore } from "@/lib/cloudflare";

export const runtime = "edge";

// Aggregated dashboard numbers — served from D1 on Cloudflare, mock locally.
export async function GET() {
  const env = await getEnv();
  if (env?.DB) {
    const [[r], [b], [c], [v]] = await Promise.all([
      env.DB.prepare("SELECT COUNT(*) AS n FROM residents").all<{ n: number }>(),
      env.DB.prepare("SELECT COALESCE(SUM(amount),0) AS due FROM maintenance_bills WHERE status != 'paid'").all<{ due: number }>(),
      env.DB.prepare("SELECT COUNT(*) AS n FROM complaints WHERE status != 'resolved'").all<{ n: number }>(),
      env.DB.prepare("SELECT COUNT(*) AS n FROM visitors WHERE status != 'checked_out'").all<{ n: number }>(),
    ]);
      return NextResponse.json({
      residents: r.results[0]?.n ?? 0,
      dues: b.results[0]?.due ?? 0,
      openComplaints: c.results[0]?.n ?? 0,
      activeVisitors: v.results[0]?.n ?? 0,
    });
  }
  const s = mockStore();
  return NextResponse.json({
    residents: s.residents.length,
    dues: s.bills.filter((x) => x.status !== "paid").reduce((a, x) => a + x.amount, 0),
    openComplaints: s.complaints.filter((x) => x.status !== "resolved").length,
    activeVisitors: s.visitors.filter((x) => x.status !== "checked_out").length,
  });
}
