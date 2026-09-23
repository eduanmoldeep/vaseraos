import {
  LayoutDashboard,
  Building2,
  Users,
  Wrench,
  Receipt,
  MessageSquareWarning,
  UserCheck,
  Shield,
  Megaphone,
  KeyRound,
  UserCog,
  LifeBuoy,
  ClipboardList,
  Inbox,
  type LucideIcon,
} from "lucide-react";

export const ADMIN_NAV: {
  href: string;
  label: string;
  dot: string;
  color: string;
  icon: LucideIcon;
  platformOnly: boolean;
}[] = [
  { href: "/admin", label: "Dashboard", dot: "bg-zinc-400 dark:bg-zinc-500", color: "text-zinc-500 dark:text-zinc-400", icon: LayoutDashboard, platformOnly: false },
  { href: "/admin/societies", label: "Societies", dot: "bg-teal-500", color: "text-teal-500", icon: Building2, platformOnly: true },
  { href: "/admin/residents", label: "Residents", dot: "bg-sky-500", color: "text-sky-500", icon: Users, platformOnly: false },
  { href: "/admin/maintenance", label: "Maintenance", dot: "bg-amber-500", color: "text-amber-500", icon: Wrench, platformOnly: false },
  { href: "/admin/ledger", label: "Ledger", dot: "bg-lime-500", color: "text-lime-500", icon: Receipt, platformOnly: false },
  { href: "/admin/complaints", label: "Complaints", dot: "bg-rose-500", color: "text-rose-500", icon: MessageSquareWarning, platformOnly: false },
  { href: "/admin/visitors", label: "Visitors", dot: "bg-violet-500", color: "text-violet-500", icon: UserCheck, platformOnly: false },
  { href: "/admin/guards", label: "Guards", dot: "bg-cyan-500", color: "text-cyan-500", icon: Shield, platformOnly: false },
  { href: "/admin/notices", label: "Notices", dot: "bg-emerald-500", color: "text-emerald-500", icon: Megaphone, platformOnly: true },
  { href: "/admin/roles", label: "Roles", dot: "bg-fuchsia-500", color: "text-fuchsia-500", icon: KeyRound, platformOnly: false },
  { href: "/admin/users", label: "Users", dot: "bg-indigo-500", color: "text-indigo-500", icon: UserCog, platformOnly: true },
  { href: "/admin/support", label: "Support", dot: "bg-orange-500", color: "text-orange-500", icon: LifeBuoy, platformOnly: true },
  { href: "/admin/leads", label: "Leads", dot: "bg-pink-500", color: "text-pink-500", icon: Inbox, platformOnly: true },
  { href: "/admin/audit", label: "Audit log", dot: "bg-slate-500", color: "text-slate-500", icon: ClipboardList, platformOnly: true },
] as const;
