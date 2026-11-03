import Link from "next/link";
import { Card } from "./ui";

/** Empty state for module pages when no society is selected. */
export function NeedsSociety({ label }: { label: string }) {
  return (
    <Card className="text-center">
      <p className="text-lg font-semibold">Choose a society to see {label}.</p>
      <p className="mt-1 text-base text-zinc-600 dark:text-zinc-400">
        Use the society name at the top of the screen — or{" "}
        <Link href="/admin/societies" className="font-medium text-indigo-700 underline underline-offset-4 dark:text-indigo-300">
          manage societies
        </Link>
        .
      </p>
    </Card>
  );
}
