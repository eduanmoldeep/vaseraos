import { redirect } from "next/navigation";
import { getViewer } from "@/lib/auth";
import { getSocietiesWithAnyOffice } from "@/lib/membership";
import { AdminSidebar } from "@/components/AdminSidebar";
import { AdminNav } from "@/components/AdminNav";
import { SocietySwitcher } from "@/components/SocietySwitcher";
import { NotificationBell } from "@/components/NotificationBell";
import { UserMenu } from "@/components/UserMenu";
import { SosWatcher } from "@/components/SosWatcher";

/**
 * Admin shell: platform admins get in always; everyone else needs to currently
 * hold an office (president/secretary/treasurer) in at least one society —
 * that's the only source of admin privilege. Plain residents and logged-out
 * visitors bounce to the landing page.
 */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const viewer = await getViewer();
  if (!viewer) redirect("/");
  if (!viewer.admin) {
    const officeSocieties = await getSocietiesWithAnyOffice(viewer.id);
    if (officeSocieties.length === 0) redirect("/");
  }

  return (
    <div className="flex flex-1">
      <SosWatcher />
      <AdminSidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-10 border-b border-zinc-200 bg-white/95 px-4 py-3 backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/95 md:hidden">
          <div className="flex items-center justify-between gap-3">
            <SocietySwitcher compact />
            <div className="flex items-center gap-1">
              <NotificationBell />
              <UserMenu />
            </div>
          </div>
          <div className="mt-3">
            <AdminNav />
          </div>
        </header>
        <header className="sticky top-0 z-10 hidden justify-end border-b border-zinc-200 bg-white/95 px-4 py-2.5 backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/95 md:flex sm:px-6 lg:px-8">
          <div className="flex items-center gap-1">
            <NotificationBell />
            <UserMenu />
          </div>
        </header>
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}
