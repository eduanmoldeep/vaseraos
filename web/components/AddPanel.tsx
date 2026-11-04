"use client";

import { useState, type ReactNode } from "react";
import { Button, Card } from "@/components/ui";
import type { IconName } from "@/components/icons";

/**
 * Keeps "add something" forms out of the way until asked for: a single clear
 * button ("+ Add resident") that opens the form in a card with a Cancel button.
 * `children` receives `close` so a form can collapse itself after saving.
 */
export function AddPanel({
  label,
  title,
  icon = "plus",
  variant = "accent",
  children,
  className = "",
}: {
  label: string;
  title?: string;
  icon?: IconName;
  variant?: "accent" | "primary" | "secondary";
  children: (close: () => void) => ReactNode;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);

  if (!open) {
    return (
      <Button variant={variant} icon={icon} onClick={() => setOpen(true)} className={`w-full sm:w-auto ${className}`} aria-expanded={false}>
        {label}
      </Button>
    );
  }

  return (
    <Card tone="indigo" className={className}>
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-xl font-semibold">{title ?? label}</h2>
        <Button variant="secondary" size="sm" onClick={close} icon="x">
          Cancel
        </Button>
      </div>
      {children(close)}
    </Card>
  );
}
