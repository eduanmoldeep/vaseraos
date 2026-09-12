import { API_BASE_URL } from "./config";

export type Guard = { id: string; society_id: string; name: string; phone: string; active: boolean };
export type SosAlert = { id: string; society_id: string; flat: string; status: "open" | "acknowledged" | "resolved"; created_at: string };

async function api<T>(path: string, token: string | null, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      "content-type": "application/json",
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      ...(init?.headers ?? {}),
    },
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error(data?.error ?? `Request failed (${res.status})`);
  return data as T;
}

export function loginGuard(societyId: string, phone: string, password: string) {
  return api<{ token: string; guard: Guard }>("/api/guards/login", null, {
    method: "POST",
    body: JSON.stringify({ society_id: societyId, phone, password }),
  });
}

export function registerPushToken(token: string, platform: "android" | "ios", expoToken?: string, voipToken?: string) {
  return api<{ ok: true }>("/api/guards/push-token", token, {
    method: "POST",
    body: JSON.stringify({ platform, expo_token: expoToken, voip_token: voipToken }),
  });
}

export function listActiveSos(token: string, societyId: string) {
  return api<SosAlert[]>(`/api/sos?society=${societyId}`, token);
}

export function acknowledgeSos(token: string, id: string) {
  return api<SosAlert>(`/api/sos/${id}`, token, {
    method: "PATCH",
    body: JSON.stringify({ action: "acknowledge" }),
  });
}
