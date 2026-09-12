"use client";

import { useEffect, useState } from "react";

/** Whether the signed-in user is a platform admin (global flag), not just a society-scoped one. */
export function useIsPlatformAdmin(): boolean {
  const [isPlatformAdmin, setIsPlatformAdmin] = useState(false);
  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setIsPlatformAdmin(!!d?.user?.admin))
      .catch(() => {});
  }, []);
  return isPlatformAdmin;
}
