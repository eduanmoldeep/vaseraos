import { Card, PageHeader } from "@/components/ui";

export default function AboutPage() {
  return (
    <div>
      <PageHeader title="About" subtitle="The platform behind this society's management tools." />
      <Card>
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-zinc-950 text-sm font-bold text-white dark:bg-white dark:text-black">
            V
          </span>
          <div>
            <p className="font-semibold">VaseraOS</p>
            <p className="text-sm text-zinc-500">Society management, minus the paperwork.</p>
          </div>
        </div>
        <p className="mt-4 text-sm text-zinc-600 dark:text-zinc-400">
          Residents, maintenance, complaints, visitors and notices — one fast, installable app per
          society, scoped so every tenant only ever sees its own data.
        </p>
      </Card>
    </div>
  );
}
