import { redirect } from "next/navigation";
import { getViewer } from "@/lib/auth";
import { getSocietiesWithAnyOffice } from "@/lib/membership";
import { ResidentShell } from "@/components/ResidentShell";

/**
 * Shared frame for the resident screens (/app, /dues, /complaints, /notices,
 * /me, /help, /feedback, /ledger). Logged-out visitors go to the sign-in page;
 * office bearers can use these too — they're residents as well — and get a
 * "Committee" shortcut back to the admin tools.
 */
export default async function ResidentLayout({ children }: { children: React.ReactNode }) {
  const viewer = await getViewer();
  if (!viewer) redirect("/");
  const isCommittee = viewer.admin || (await getSocietiesWithAnyOffice(viewer.id)).length > 0;
  return (
    <ResidentShell viewer={viewer} isCommittee={isCommittee}>
      {children}
    </ResidentShell>
  );
}
