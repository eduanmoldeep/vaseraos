"use client";

import { Button, Card, LinkButton } from "@/components/ui";

export default function Error({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="mx-auto w-full max-w-md px-4 py-16">
      <Card className="text-center">
        <h1 className="text-2xl font-bold">Something went wrong</h1>
        <p className="mt-2 text-lg text-zinc-700 dark:text-zinc-300">This page couldn&apos;t load. Please try again, or go back to Home.</p>
        <div className="mt-6 grid gap-2 sm:grid-cols-2">
          <Button onClick={reset} icon="chevronLeft" size="lg">
            Try again
          </Button>
          <LinkButton href="/" variant="secondary" icon="home" size="lg">
            Go to Home
          </LinkButton>
        </div>
      </Card>
    </div>
  );
}
