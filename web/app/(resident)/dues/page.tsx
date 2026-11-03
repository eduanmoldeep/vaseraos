"use client";

import { startTransition, useEffect, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Icon } from "@/components/icons";
import { useResident } from "@/components/ResidentShell";
import { Badge, Button, Card, Empty, ErrorBanner, FilePicker, ListSkeleton, PageHeader, Section, SuccessBanner, buttonClass } from "@/components/ui";
import type { Bill, MaintenanceSetting } from "@/lib/cloudflare";
import { BILL_STATUS, formatPeriod, inr, statusOf } from "@/lib/labels";

function upiUri(upiId: string, amount: number, note: string) {
  return `upi://pay?pa=${encodeURIComponent(upiId)}&am=${amount}&cu=INR&tn=${encodeURIComponent(note)}`;
}

export default function DuesPage() {
  const { society } = useResident();
  const [bills, setBills] = useState<Bill[] | null>(null);
  const [setting, setSetting] = useState<MaintenanceSetting | null>(null);
  const [payingId, setPayingId] = useState<string | null>(null);
  const [done, setDone] = useState("");

  const load = () => {
    if (!society) return;
    fetch(`/api/bills?society=${society}&mine=1`).then((r) => (r.ok ? r.json() : [])).then(setBills).catch(() => setBills([]));
    fetch(`/api/maintenance/settings?society=${society}`).then((r) => (r.ok ? r.json() : null)).then(setSetting).catch(() => {});
  };
  useEffect(() => {
    startTransition(load);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [society]);

  const byOldest = (a: Bill, b: Bill) => a.month.localeCompare(b.month);
  const unpaid = (bills ?? []).filter((b) => b.status === "pending" || b.status === "overdue").sort(byOldest);
  const checking = (bills ?? []).filter((b) => b.status === "pending_verification");
  const paid = (bills ?? []).filter((b) => b.status === "paid");
  const total = unpaid.reduce((a, b) => a + b.amount, 0);

  return (
    <div>
      <PageHeader title="Maintenance dues" subtitle="Your flat's maintenance bills and payments." />

      {done ? <div className="mb-5"><SuccessBanner text={done} onClose={() => setDone("")} /></div> : null}

      {bills === null ? (
        <ListSkeleton rows={2} />
      ) : bills.length === 0 ? (
        <Empty text="No bills yet." hint="Your maintenance bills will appear here." />
      ) : (
        <>
          <Card tone={total > 0 ? "amber" : "green"}>
            {total > 0 ? (
              <>
                <p className="text-lg font-medium">Total to pay</p>
                <p className="text-4xl font-bold tracking-tight">{inr(total)}</p>
                <p className="mt-1 text-base text-zinc-700 dark:text-zinc-300">
                  {unpaid.length} bill{unpaid.length === 1 ? "" : "s"} below. Pay them one at a time.
                </p>
              </>
            ) : (
              <p className="flex items-center gap-2 text-xl font-semibold text-green-900 dark:text-green-200">
                <Icon name="check" className="h-7 w-7" /> You have nothing to pay right now.
              </p>
            )}
          </Card>

          {unpaid.length > 0 ? (
            <Section title="To pay">
              <div className="grid gap-3">
                {unpaid.map((b) => {
                  const s = statusOf(BILL_STATUS, b.status);
                  const open = payingId === b.id;
                  return (
                    <Card key={b.id} tone={open ? "indigo" : "default"}>
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="text-xl font-semibold">{formatPeriod(b.month)}</p>
                          <p className="text-2xl font-bold">{inr(b.amount)}</p>
                        </div>
                        <Badge tone={s.tone}>{s.label}</Badge>
                      </div>
                      {open ? (
                        <PaySteps
                          bill={b}
                          upiId={setting?.upi_id ?? null}
                          onCancel={() => setPayingId(null)}
                          onSubmitted={() => {
                            setPayingId(null);
                            setDone(`Thank you! Your payment for ${formatPeriod(b.month)} has been sent. The treasurer will check it and mark it paid.`);
                            load();
                          }}
                        />
                      ) : (
                        <Button variant="accent" size="lg" icon="wallet" className="mt-4 w-full sm:w-auto" onClick={() => setPayingId(b.id)}>
                          Pay {inr(b.amount)}
                        </Button>
                      )}
                    </Card>
                  );
                })}
              </div>
            </Section>
          ) : null}

          {checking.length > 0 ? (
            <Section title="Being checked by the treasurer">
              <div className="grid gap-3">
                {checking.map((b) => (
                  <Card key={b.id} className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-lg font-semibold">{formatPeriod(b.month)} · {inr(b.amount)}</p>
                      <p className="text-base text-zinc-600 dark:text-zinc-400">You sent the payment. Nothing more to do.</p>
                    </div>
                    {b.receipt_key ? (
                      <a href={`/api/uploads/${b.receipt_key}`} target="_blank" rel="noreferrer" className={buttonClass("secondary", "sm")}>
                        See my screenshot
                      </a>
                    ) : null}
                  </Card>
                ))}
              </div>
            </Section>
          ) : null}

          {paid.length > 0 ? (
            <Section title="Paid">
              <Card padding="none">
                <ul className="divide-y divide-zinc-200 dark:divide-zinc-800">
                  {paid.map((b) => (
                    <li key={b.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
                      <span className="text-lg">{formatPeriod(b.month)}</span>
                      <span className="flex items-center gap-3">
                        <span className="text-lg font-semibold">{inr(b.amount)}</span>
                        <Badge tone="green">Paid</Badge>
                      </span>
                    </li>
                  ))}
                </ul>
              </Card>
            </Section>
          ) : null}
        </>
      )}
    </div>
  );
}

function Step({ n, title, children }: { n: number; title: string; children?: React.ReactNode }) {
  return (
    <li className="grid grid-cols-[2.25rem_1fr] gap-3">
      <span aria-hidden className="flex h-9 w-9 items-center justify-center rounded-full bg-indigo-600 text-lg font-bold text-white">
        {n}
      </span>
      <div className="min-w-0">
        <p className="pt-1 text-lg font-semibold">
          <span className="sr-only">Step {n}: </span>
          {title}
        </p>
        {children ? <div className="mt-2">{children}</div> : null}
      </div>
    </li>
  );
}

function PaySteps({ bill, upiId, onCancel, onSubmitted }: { bill: Bill; upiId: string | null; onCancel: () => void; onSubmitted: () => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [sending, setSending] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");

  async function copyUpi() {
    if (!upiId) return;
    try {
      await navigator.clipboard.writeText(upiId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard blocked — the ID is visible on screen anyway
    }
  }

  async function send() {
    if (!file) {
      setError("Please choose the payment screenshot first.");
      return;
    }
    setSending(true);
    setError("");
    try {
      const fd = new FormData();
      fd.set("id", bill.id);
      fd.set("status", "pending_verification");
      fd.set("receipt", file);
      const res = await fetch("/api/bills", { method: "PATCH", body: fd });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error ?? "Couldn't send your payment proof.");
      onSubmitted();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't send your payment proof. Please try again.");
    } finally {
      setSending(false);
    }
  }

  if (!upiId) {
    return (
      <div className="mt-4 rounded-xl bg-zinc-50 p-4 text-base dark:bg-zinc-900">
        <p>Online payment isn&apos;t set up for your society yet. Please pay the treasurer the usual way — they will mark this bill as paid.</p>
        <Button variant="secondary" className="mt-3" onClick={onCancel}>
          Close
        </Button>
      </div>
    );
  }

  const note = `Maintenance ${formatPeriod(bill.month)} ${bill.flat}`;

  return (
    <div className="mt-5 border-t border-zinc-200 pt-5 dark:border-zinc-800">
      <ol className="grid gap-6">
        <Step n={1} title={`Pay ${inr(bill.amount)} with any UPI app`}>
          <p className="text-base text-zinc-700 dark:text-zinc-300">Google Pay, PhonePe, Paytm or your bank app. The amount is filled in for you.</p>
          <a href={upiUri(upiId, bill.amount, note)} className={buttonClass("accent", "lg", "mt-3 w-full sm:w-auto")}>
            <Icon name="wallet" /> Open UPI app to pay
          </a>
          <details className="mt-3 rounded-xl border border-zinc-200 dark:border-zinc-800">
            <summary className="flex min-h-12 cursor-pointer items-center px-4 text-base font-medium">Paying from another phone? Show QR code</summary>
            <div className="flex flex-col items-center gap-2 p-4 pt-0 text-center">
              <div className="rounded-xl border border-zinc-200 bg-white p-3">
                <QRCodeSVG value={upiUri(upiId, bill.amount, note)} size={200} />
              </div>
              <p className="text-base text-zinc-700 dark:text-zinc-300">Scan with any UPI app.</p>
            </div>
          </details>
          <p className="mt-3 flex flex-wrap items-center gap-2 text-base">
            UPI ID: <span className="font-mono font-semibold">{upiId}</span>
            <Button variant="secondary" size="sm" icon={copied ? "check" : "copy"} onClick={copyUpi} type="button">
              {copied ? "Copied" : "Copy"}
            </Button>
          </p>
        </Step>
        <Step n={2} title="Take a screenshot of the “Payment successful” screen" />
        <Step n={3} title="Choose that screenshot">
          <FilePicker label="Choose screenshot" file={file} onChange={(f) => { setFile(f); setError(""); }} />
        </Step>
        <Step n={4} title="Send it to the treasurer">
          {error ? <div className="mb-3"><ErrorBanner text={error} /></div> : null}
          <div className="flex flex-wrap gap-2">
            <Button size="lg" icon="check" busy={sending} busyText="Sending…" onClick={send} className="w-full sm:w-auto">
              Send payment proof
            </Button>
            <Button variant="secondary" size="lg" onClick={onCancel} className="w-full sm:w-auto">
              Cancel
            </Button>
          </div>
        </Step>
      </ol>
    </div>
  );
}
