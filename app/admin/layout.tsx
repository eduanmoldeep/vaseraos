import Link from "next/link";
import { redirect } from "next/navigation";
import { getViewer } from "@/lib/auth";
import { SocietySwitcher } from "@/components/SocietySwitcher";
import { LogoutButton } from "@/components/LogoutButton";

const NAV = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/societies", label: "Societies" },
  { href: "/admin/residents", label: "Residents" },
  { href: "/admin/maintenance", label: "Maintenance" },
  { href: "/admin/complaints", label: "Complaints" },
  { href: "/admin/visitors", label: "Visitors" },
  { href: "/admin/notices", label: "Notices" },
];

/** Admin-only shell: non-admins and logged-out users bounce to the landing page. */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const viewer = await getViewer();
  if (!viewer?.admin) redirect("/");

  return (
    <>
      <header className="sticky top-0 z-10 border-b border-teal-900/20 bg-gradient-to-r from-teal-950 via-teal-900 to-emerald-900 text-white shadow-md">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3">
          <Link href="/admin" className="flex items-center gap-2 font-semibold">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white text-sm font-bold text-teal-900 shadow">
              V
            </span>
            VaseraOS
          </Link>
          <nav className="flex flex-1 items-center gap-1 overflow-x-auto text-sm [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {NAV.map((n) => (
              <Link
                key={n.href}
                href={n.href}
                  className="whitespace-nowrap rounded-full px-3 py-1.5 text-white transition hover:bg-white/15"
              >
                {n.label}
              </Link>
            ))}
          </nav>
          <SocietySwitcher />
          <LogoutButton />
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">{children}</main>
    </>
  );
}
