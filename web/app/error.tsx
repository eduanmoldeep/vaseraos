"use client";

import Link from "next/link";
import { Card } from "@/components/ui";

export default function Error({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="mx-auto max-w-md py-16">
      <Card className="text-center">
        <p className="text-4xl">🛠️</p>
        <h1 className="mt-3 text-xl font-semibold">Something went wrong</h1>
        <p className="mt-1 text-sm text-zinc-500">
          This part of the app crashed. Try again — or head back to safety.
        </p>
        <div className="mt-5 flex justify-center gap-2">
          <button
            onClick={reset}
            className="rounded-xl bg-gradient-to-r from-teal-800 to-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow hover:brightness-110"
          >
            Try again
          </button>
          <Link
            href="/"
            className="rounded-xl border border-zinc-300 px-4 py-2 text-sm font-medium hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
          >
            Home
          </Link>
        </div>
      </Card>
    </div>
  );
}
