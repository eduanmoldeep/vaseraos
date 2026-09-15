"use client";

import { useState } from "react";
import { Button } from "@/components/ui";

/** Composes an invite message with the society's join code, via the native share sheet (or clipboard fallback). */
export function ShareJoinCode({ societyName, joinCode, size = "sm" }: { societyName: string; joinCode: string; size?: "sm" | "md" }) {
  const [copied, setCopied] = useState(false);

  async function share() {
    const text = `Join ${societyName} on VaseraOS! Sign up at ${window.location.origin} and enter invite code ${joinCode} to join.`;
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ text });
      } catch {
        // user cancelled the share sheet — not an error
      }
      return;
    }
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <Button variant="secondary" size={size} onClick={share}>
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
        <circle cx="18" cy="5" r="3" stroke="currentColor" strokeWidth="1.8" />
        <circle cx="6" cy="12" r="3" stroke="currentColor" strokeWidth="1.8" />
        <circle cx="18" cy="19" r="3" stroke="currentColor" strokeWidth="1.8" />
        <path d="M8.7 10.7l6.6-3.4M8.7 13.3l6.6 3.4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
      {copied ? "Copied!" : "Share invite"}
    </Button>
  );
}
