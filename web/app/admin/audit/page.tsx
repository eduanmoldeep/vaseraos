"use client";

import { useEffect, useState } from "react";
import { Card, Empty, ErrorBanner, ListSkeleton, PageHeader } from "@/components/ui";
import type { AuditEntry } from "@/lib/cloudflare";

type Row = AuditEntry & { actorName: string; targetName: string | null };

export default function AuditLogPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = () => {
    setLoading(true);
    setError("");
    fetch("/api/audit")
      .then((r) => r.json())
      .then(setRows)
      .catch(() => setError("Couldn't load the audit log."))
      .finally(() => setLoading(false));
  };
  useEffect(() => {
    fetch("/api/audit")
      .then((r) => r.json())
      .then(setRows)
      .catch(() => setError("Couldn't load the audit log."))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <PageHeader title="Audit log" subtitle="Role and office changes, plus every admin impersonation — newest first." />
      {error ? <div className="mb-4"><ErrorBanner text={error} onRetry={load} /></div> : null}
      <div className="grid gap-2">
        {loading ? (
          <ListSkeleton />
        ) : rows.length === 0 ? (
          <Empty text="No audit events yet." />
        ) : (
          rows.map((e) => (
            <Card key={e.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
              <div className="min-w-0">
                <p className="text-sm">
                  <span className="font-medium">{e.actorName}</span>{" "}
                  <span className="text-zinc-500">{describe(e.action)}</span>
                  {e.targetName ? <span className="font-medium"> {e.targetName}</span> : null}
                </p>
                <p className="mt-0.5 text-xs text-zinc-500">
                  {new Date(e.created_at).toLocaleString()} · IP {e.ip}
                  {e.detail ? ` · ${e.detail}` : ""}
                </p>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}

function describe(action: string): string {
  switch (action) {
    case "impersonate.start": return "logged in as";
    case "impersonate.stop": return "returned from impersonating";
    case "office.assign": return "updated offices for";
    case "membership.join": return "joined a society";
    case "society.register": return "registered a society";
    case "maintenance.settings.update": return "updated maintenance settings for";
    case "guard.create": return "added a guard to";
    case "guard.deactivate": return "deactivated a guard in";
    case "sos.raise": return "raised an SOS alarm in";
    case "sos.acknowledge": return "acknowledged an SOS alarm in";
    case "sos.resolve": return "resolved an SOS alarm in";
    default: return action;
  }
}
