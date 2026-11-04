"use client";

import { useState } from "react";
import { Button } from "@/components/ui";

/** Composes an invite message with the society's join code, via the native share sheet (or clipboard fallback). */
export function ShareJoinCode({ societyName, joinCode, size = "md" }: { societyName: string; joinCode: string; size?: "sm" | "md" }) {
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
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard blocked — the code is shown on screen anyway
    }
  }

  return (
    <Button variant="secondary" size={size} icon={copied ? "check" : "share"} onClick={share} type="button">
      {copied ? "Invite copied" : "Share invite"}
    </Button>
  );
}
