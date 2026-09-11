import Link from "next/link";
import { Card } from "./ui";

/** Empty state for module pages when no society is selected. */
export function NeedsSociety({ label }: { label: string }) {
  return (
    <Card className="text-center">
      <p className="font-medium">Select a society to view {label}.</p>
      <p className="mt-1 text-sm text-zinc-500">
        Use the switcher above — or <Link href="/admin/societies" className="underline">manage societies</Link>.
      </p>
    </Card>
  );
}
