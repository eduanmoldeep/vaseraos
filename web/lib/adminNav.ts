import type { IconName } from "@/components/icons";

export type AdminNavItem = {
  href: string;
  label: string;
  /** One line shown in the phone menu so people know what each section is for. */
  description: string;
  icon: IconName;
  platformOnly: boolean;
};

/** Committee tools, grouped by the job being done rather than listed as one long row. */
export const ADMIN_NAV_GROUPS: { title: string; items: AdminNavItem[] }[] = [
  {
    title: "Today",
    items: [
      { href: "/admin", label: "Dashboard", description: "What needs your attention", icon: "grid", platformOnly: false },
      { href: "/admin/complaints", label: "Complaints", description: "Problems reported by residents", icon: "wrench", platformOnly: false },
      { href: "/admin/visitors", label: "Visitors", description: "Who is expected or at the gate", icon: "door", platformOnly: false },
      { href: "/admin/notices", label: "Notices", description: "Post announcements to everyone", icon: "megaphone", platformOnly: false },
    ],
  },
  {
    title: "Money",
    items: [
      { href: "/admin/maintenance", label: "Maintenance dues", description: "Bills, payments to approve, UPI", icon: "wallet", platformOnly: false },
      { href: "/admin/ledger", label: "Accounts", description: "Money in and out, expenses", icon: "book", platformOnly: false },
    ],
  },
  {
    title: "People",
    items: [
      { href: "/admin/residents", label: "Residents", description: "Flats, owners and tenants", icon: "users", platformOnly: false },
      { href: "/admin/guards", label: "Guards", description: "Security staff and salaries", icon: "shield", platformOnly: false },
      { href: "/admin/roles", label: "Committee roles", description: "President, secretary, treasurer", icon: "key", platformOnly: false },
    ],
  },
  {
    title: "Platform",
    items: [
      { href: "/admin/societies", label: "Societies", description: "Approve and manage societies", icon: "building", platformOnly: true },
      { href: "/admin/users", label: "Users", description: "Every account on VaseraOS", icon: "user", platformOnly: true },
      { href: "/admin/support", label: "Support", description: "Help requests and feedback", icon: "lifebuoy", platformOnly: true },
      { href: "/admin/audit", label: "Audit log", description: "Who did what, and when", icon: "clipboard", platformOnly: true },
    ],
  },
];

export function visibleAdminNav(isPlatformAdmin: boolean) {
  return ADMIN_NAV_GROUPS.map((g) => ({ ...g, items: g.items.filter((i) => !i.platformOnly || isPlatformAdmin) })).filter((g) => g.items.length > 0);
}

export function isAdminNavActive(pathname: string, href: string) {
  return href === "/admin" ? pathname === "/admin" : pathname.startsWith(href);
}
