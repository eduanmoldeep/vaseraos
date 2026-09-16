"use client";

import { startTransition, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { QRCodeSVG } from "qrcode.react";
import { Badge, Button, Card, Empty, ErrorBanner, PageHeader } from "@/components/ui";
import { useSelectedSociety } from "@/lib/society";
import type { Bill, MaintenanceSetting } from "@/lib/cloudflare";

const inr = (n: number) => `₹${n.toLocaleString("en-IN")}`;

function upiUri(upiId: string, amount: number, note: string) {
  return `upi://pay?pa=${encodeURIComponent(upiId)}&am=${amount}&cu=INR&tn=${encodeURIComponent(note)}`;
}

export default function DuesPage() {
  const router = useRouter();
  const society = useSelectedSociety();
  const [checked, setChecked] = useState(false);
  const [bills, setBills] = useState<Bill[]>([]);
  const [setting, setSetting] = useState<MaintenanceSetting | null>(null);
  const [payingId, setPayingId] = useState<string | null>(null);
  const [submittingId, setSubmittingId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const fileInputs = useRef<Record<string, HTMLInputElement | null>>({});

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (!d?.user) router.replace("/"); })
      .catch(() => router.replace("/"))
      .finally(() => setChecked(true));
  }, [router]);

  const load = () => {
    if (!society) { setBills([]); setSetting(null); return; }
    fetch(`/api/bills?society=${society}&mine=1`).then((r) => (r.ok ? r.json() : [])).then(setBills).catch(() => {});
    fetch(`/api/maintenance/settings?society=${society}`).then((r) => (r.ok ? r.json() : null)).then(setSetting).catch(() => {});
  };
  useEffect(() => {
    startTransition(load);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [society]);

  async function submitProof(bill: Bill) {
    const file = fileInputs.current[bill.id]?.files?.[0];
    if (!file) { setError("Choose a screenshot first."); return; }
    setSubmittingId(bill.id);
    setError("");
    try {
      const fd = new FormData();
      fd.set("id", bill.id);
      fd.set("status", "pending_verification");
      fd.set("receipt", file);
      const res = await fetch("/api/bills", { method: "PATCH", body: fd });
      const data = await res.json().catch(() => null);
      if (!res.ok) { setError(data?.error ?? "Couldn't submit payment proof."); return; }
      setPayingId(null);
      load();
    } catch {
      setError("Couldn't submit payment proof. Try again.");
    } finally {
      setSubmittingId(null);
    }
  }

  if (!checked) {
    return (
      <div className="mx-auto w-full max-w-2xl flex-1 px-4 py-8">
        <Card className="animate-pulse"><div className="h-20 rounded-lg bg-zinc-100 dark:bg-zinc-900" /></Card>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-2xl flex-1 px-4 py-8">
      <PageHeader title="My dues" subtitle="Maintenance bills for your flat — pay via UPI and upload proof." />
      {error ? <div className="mb-4"><ErrorBanner text={error} /></div> : null}

      {!society ? (
        <Card><p className="text-sm text-zinc-500">Select a society first.</p></Card>
      ) : bills.length === 0 ? (
        <Empty text="No dues yet." />
      ) : (
        <div className="grid gap-3">
          {bills.map((b) => (
            <Card key={b.id}>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-medium">{b.month}</p>
                  <p className="text-sm text-zinc-500">{inr(b.amount)}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge
                    tone={
                      b.status === "paid" ? "green" : b.status === "pending_verification" ? "blue" : b.status === "overdue" ? "red" : "amber"
                    }
                  >
                    {b.status === "pending_verification" ? "awaiting approval" : b.status}
                  </Badge>
                  {b.status === "pending" || b.status === "overdue" ? (
                    <Button size="sm" onClick={() => setPayingId(payingId === b.id ? null : b.id)}>
                      Pay via UPI
                    </Button>
                  ) : null}
                  {b.receipt_key ? (
                    <a href={`/api/uploads/${b.receipt_key}`} target="_blank" rel="noreferrer" className="text-xs font-medium text-indigo-600 hover:underline dark:text-indigo-400">
                      View screenshot
                    </a>
                  ) : null}
                </div>
              </div>

              {payingId === b.id ? (
                <div className="mt-4 border-t border-zinc-100 pt-4 dark:border-zinc-800">
                  {setting?.upi_id ? (
                    <div className="flex flex-col items-center gap-3 text-center">
                      <div className="rounded-xl border border-zinc-200 bg-white p-3 dark:border-zinc-800">
                        <QRCodeSVG value={upiUri(setting.upi_id, b.amount, `Maintenance ${b.month} ${b.flat}`)} size={176} />
                      </div>
                      <p className="text-sm text-zinc-600 dark:text-zinc-400">
                        Scan with any UPI app and pay <span className="font-semibold text-zinc-900 dark:text-zinc-100">{inr(b.amount)}</span> to{" "}
                        <span className="font-mono">{setting.upi_id}</span>. The amount is fixed in the QR — nothing to type.
                      </p>
                      <div className="flex w-full max-w-xs flex-col gap-2">
                        <input
                          ref={(el) => { fileInputs.current[b.id] = el; }}
                          type="file"
                          accept="image/*"
                          className="text-sm text-zinc-600 file:mr-3 file:rounded-lg file:border-0 file:bg-zinc-100 file:px-3 file:py-1.5 file:text-sm file:font-medium dark:text-zinc-400 dark:file:bg-zinc-800"
                        />
                        <Button busy={submittingId === b.id} busyText="Submitting…" onClick={() => submitProof(b)}>
                          I&apos;ve paid — submit screenshot
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-zinc-500">
                      Your society hasn&apos;t set up a UPI ID yet — pay through your usual channel and ask the treasurer to mark it paid.
                    </p>
                  )}
                </div>
              ) : null}
            </Card>
          ))}
        </div>
      )}

      <Link href="/" className="mt-6 inline-block text-sm font-medium text-indigo-600 hover:underline dark:text-indigo-400">
        ← Back
      </Link>
    </div>
  );
}
