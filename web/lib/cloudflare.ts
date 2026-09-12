import { getCloudflareContext } from "@opennextjs/cloudflare";
import type { CloudflareEnv } from "../worker-configuration";

export type Env = CloudflareEnv;

/** Returns real bindings on Cloudflare, null when running plain `next dev`. */
export async function getEnv(): Promise<CloudflareEnv | null> {
  try {
    const ctx = (await getCloudflareContext({ async: true })) as unknown as { env: CloudflareEnv };
    return ctx.env ?? null;
  } catch {
    return null;
  }
}

export function uid(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random()
    .toString(36)
    .slice(2, 8)}`;
}

// ---- In-memory fallback so the UI works before D1/R2 are provisioned ----
export type Society = {
  id: string;
  name: string;
  city?: string;
  status: "pending" | "approved" | "rejected";
  join_code?: string | null;
  created_by?: string | null;
};

export const DEFAULT_SOCIETY_ID = "s_default";

/** Account holder. `admin` (platform-wide) is granted only by direct DB SQL — never via API/UI. */
export type AuthUser = { id: string; name: string; email: string; admin: boolean };

/**
 * Plain membership in a society — everyone who joined or created it is a
 * resident of it. Admin-level privilege is never stored here: it comes only
 * from holding a `SocietyOffice` below, so it rotates with the office.
 */
export type SocietyMember = { id: string; user_id: string; society_id: string };

/** Elected society offices — independent of the admin/resident role; any combo, any holder(s). */
export type Office = "president" | "secretary" | "treasurer";
export type SocietyOffice = { society_id: string; user_id: string; office: Office };

export type AuditEntry = {
  id: string;
  actor_id: string;
  action: string;
  target_user_id?: string | null;
  society_id?: string | null;
  detail?: string | null;
  ip: string;
  created_at: string;
};

export type Resident = {
  id: string;
  name: string;
  flat: string;
  phone: string;
  email?: string;
  members: number;
  owner_tenant: "owner" | "tenant";
  society_id: string;
  user_id?: string | null;
};

export type Bill = {
  id: string;
  flat: string;
  amount: number;
  month: string;
  status: "pending" | "paid" | "overdue";
  society_id: string;
  receipt_key?: string | null;
  paid_at?: string | null;
};

export type Notification = {
  id: string;
  user_id: string;
  society_id: string;
  title: string;
  body?: string | null;
  read_at?: string | null;
  created_at: string;
};

export type HelpTicket = {
  id: string;
  user_id: string;
  society_id?: string | null;
  subject: string;
  message: string;
  status: "open" | "resolved";
  created_at: string;
  resolved_at?: string | null;
};

export type Expense = {
  id: string;
  society_id: string;
  category: string;
  vendor: string;
  amount: number;
  description?: string | null;
  receipt_key?: string | null;
  created_by?: string | null;
  created_at: string;
};

/** How often dues are raised. Bills carry the current period's label in `Bill.month` — "2026-09", "2026-Q3" or "2026". */
export type Cadence = "monthly" | "quarterly" | "yearly";
export type MaintenanceSetting = {
  society_id: string;
  amount: number;
  cadence: Cadence;
  updated_by: string | null;
  updated_at: string;
};

export type Complaint = {
  id: string;
  flat: string;
  title: string;
  category: string;
  status: "open" | "in_progress" | "resolved";
  society_id: string;
};

export type Visitor = {
  id: string;
  name: string;
  flat: string;
  purpose: string;
  status: "expected" | "checked_in" | "checked_out";
  society_id: string;
};

export type Notice = {
  id: string;
  title: string;
  body: string;
  audience: string;
  attachment?: string;
  society_id: string;
};

/** A guard is not a resident and never holds a society office — a fully separate identity, authenticated by bearer token (mobile-friendly) rather than the session cookie. */
export type Guard = {
  id: string;
  society_id: string;
  name: string;
  phone: string;
  email?: string | null;
  active: boolean;
};

export type GuardPlatform = "android" | "ios";
export type GuardPushToken = { id: string; guard_id: string; platform: GuardPlatform; expo_token?: string | null; voip_token?: string | null };

export type SosStatus = "open" | "acknowledged" | "resolved";
export type SosAlert = {
  id: string;
  society_id: string;
  raised_by_user_id: string;
  flat: string;
  status: SosStatus;
  acknowledged_by_guard_id?: string | null;
  created_at: string;
  acknowledged_at?: string | null;
  resolved_at?: string | null;
};

const g = globalThis as unknown as {
  __vasera?: {
    societies: Society[];
    members: SocietyMember[];
    offices: SocietyOffice[];
    auditLog: AuditEntry[];
    residents: Resident[];
    bills: Bill[];
    expenses: Expense[];
    notifications: Notification[];
    helpTickets: HelpTicket[];
    maintenanceSettings: MaintenanceSetting[];
    complaints: Complaint[];
    visitors: Visitor[];
    notices: Notice[];
    guards: (Guard & { password_hash: string })[];
    guardPushTokens: GuardPushToken[];
    sosAlerts: SosAlert[];
  };
};

export function mockStore() {
  if (!g.__vasera) {
    g.__vasera = {
      societies: [
        { id: "s_default", name: "Greenview Heights", city: "Pune", status: "approved", join_code: "GREEN01" },
        { id: "s2", name: "Lakeview Residency", city: "Mumbai", status: "approved", join_code: "LAKE02" },
      ],
      members: [],
      offices: [],
      auditLog: [],
      maintenanceSettings: [],
      residents: [
        { id: "r1", name: "Aarav Sharma", flat: "A-101", phone: "98200 11111", email: "aarav@example.com", members: 4, owner_tenant: "owner", society_id: "s_default" },
        { id: "r2", name: "Meera Iyer", flat: "B-204", phone: "98200 22222", members: 3, owner_tenant: "tenant", society_id: "s_default" },
        { id: "r3", name: "Kabir Malhotra", flat: "C-303", phone: "98200 33333", members: 2, owner_tenant: "owner", society_id: "s2" },
      ],
      bills: [
        { id: "b1", flat: "A-101", amount: 4500, month: "2026-09", status: "paid", society_id: "s_default" },
        { id: "b2", flat: "B-204", amount: 4500, month: "2026-09", status: "pending", society_id: "s_default" },
        { id: "b3", flat: "C-303", amount: 5200, month: "2026-09", status: "overdue", society_id: "s2" },
      ],
      expenses: [],
      notifications: [],
      helpTickets: [],
      complaints: [
        { id: "c1", flat: "B-204", title: "Lift not working in Block B", category: "maintenance", status: "in_progress", society_id: "s_default" },
        { id: "c2", flat: "A-101", title: "Water leakage in parking", category: "plumbing", status: "open", society_id: "s_default" },
      ],
      visitors: [
        { id: "v1", name: "Ravi Kumar", flat: "A-101", purpose: "Delivery", status: "expected", society_id: "s_default" },
        { id: "v2", name: "Sunita Rao", flat: "C-303", purpose: "Guest", status: "checked_in", society_id: "s2" },
      ],
      notices: [
        { id: "n1", title: "AGM on 20th Sept", body: "Annual General Body Meeting at clubhouse, 10 AM. All residents requested to attend.", audience: "all", society_id: "s_default" },
        { id: "n2", title: "Water tank cleaning", body: "Tank cleaning on Sunday 6 AM – 10 AM. Please store water accordingly.", audience: "all", society_id: "s_default" },
      ],
      guards: [],
      guardPushTokens: [],
      sosAlerts: [],
    };
  }
  return g.__vasera;
}
