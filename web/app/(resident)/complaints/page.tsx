"use client";

import { startTransition, useEffect, useState } from "react";
import Link from "next/link";
import { useResident } from "@/components/ResidentShell";
import { Badge, Button, Card, ChoiceGroup, Empty, ErrorBanner, Field, Input, ListSkeleton, PageHeader, Section, SuccessBanner } from "@/components/ui";
import { COMPLAINT_CATEGORIES, COMPLAINT_STATUS, labelFor, statusOf } from "@/lib/labels";

type Complaint = { id: string; flat: string; title: string; category: string; status: "open" | "in_progress" | "resolved" };
type Category = (typeof COMPLAINT_CATEGORIES)[number]["value"];

export default function MyComplaintsPage() {
  const { society, flat } = useResident();
  const [complaints, setComplaints] = useState<Complaint[] | null>(null);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<Category>("plumbing");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState("");

  const load = () => {
    if (!society) return;
    fetch(`/api/complaints?society=${society}&mine=1`).then((r) => (r.ok ? r.json() : [])).then(setComplaints).catch(() => setComplaints([]));
  };
  useEffect(() => {
    startTransition(load);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [society]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!society) return;
    setSaving(true);
    setError("");
    setDone("");
    try {
      const res = await fetch("/api/complaints", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ title, category, society_id: society }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error ?? "Couldn't send your complaint.");
      setDone("Thank you. Your complaint has been sent to the committee. You can follow it below.");
      setTitle("");
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't send your complaint. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  const open = (complaints ?? []).filter((c) => c.status !== "resolved");
  const resolved = (complaints ?? []).filter((c) => c.status === "resolved");

  return (
    <div>
      <PageHeader title="Complaints" subtitle="Tell the committee about a problem, and see what's being done about it." />

      {done ? <div className="mb-5"><SuccessBanner text={done} onClose={() => setDone("")} /></div> : null}

      <Card>
        <h2 className="mb-4 text-xl font-semibold">Report a problem</h2>
        {flat === null ? (
          <p className="text-lg text-zinc-700 dark:text-zinc-300">
            First set your flat number in{" "}
            <Link href="/me" className="font-semibold text-indigo-700 underline underline-offset-4 dark:text-indigo-300">
              Account
            </Link>
            , so the committee knows where the problem is.
          </p>
        ) : (
          <form onSubmit={submit} className="grid gap-5">
            <Field label="What is the problem?" hint="A short sentence is enough, e.g. “Kitchen tap is leaking”.">
              <Input required value={title} onChange={(e) => setTitle(e.target.value)} />
            </Field>
            <fieldset>
              <legend className="mb-2 text-base font-medium">What kind of problem is it?</legend>
              <ChoiceGroup name="category" options={COMPLAINT_CATEGORIES} value={category} onChange={setCategory} />
            </fieldset>
            {flat ? <p className="text-base text-zinc-600 dark:text-zinc-400">This will be reported for flat {flat}.</p> : null}
            {error ? <ErrorBanner text={error} /> : null}
            <Button size="lg" icon="check" busy={saving} busyText="Sending…" className="w-full sm:w-auto">
              Send complaint
            </Button>
          </form>
        )}
      </Card>

      <Section title="My complaints">
        {complaints === null ? (
          <ListSkeleton rows={2} />
        ) : complaints.length === 0 ? (
          <Empty text="You haven't reported any problems." />
        ) : (
          <div className="grid gap-3">
            {[...open, ...resolved].map((c) => {
              const s = statusOf(COMPLAINT_STATUS, c.status);
              return (
                <Card key={c.id} className={`flex flex-wrap items-start justify-between gap-3 ${c.status === "resolved" ? "opacity-80" : ""}`}>
                  <div className="min-w-0">
                    <p className="text-lg font-semibold">{c.title}</p>
                    <p className="text-base text-zinc-600 dark:text-zinc-400">{labelFor(COMPLAINT_CATEGORIES, c.category)}</p>
                  </div>
                  <Badge tone={s.tone}>{s.label}</Badge>
                </Card>
              );
            })}
          </div>
        )}
      </Section>
    </div>
  );
}
