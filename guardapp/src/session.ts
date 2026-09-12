import * as SecureStore from "expo-secure-store";
import type { Guard } from "./api";

const TOKEN_KEY = "guard_token";
const GUARD_KEY = "guard_profile";

export async function saveSession(token: string, guard: Guard): Promise<void> {
  await SecureStore.setItemAsync(TOKEN_KEY, token);
  await SecureStore.setItemAsync(GUARD_KEY, JSON.stringify(guard));
}

export async function loadSession(): Promise<{ token: string; guard: Guard } | null> {
  const [token, guardJson] = await Promise.all([SecureStore.getItemAsync(TOKEN_KEY), SecureStore.getItemAsync(GUARD_KEY)]);
  if (!token || !guardJson) return null;
  return { token, guard: JSON.parse(guardJson) as Guard };
}

export async function clearSession(): Promise<void> {
  await SecureStore.deleteItemAsync(TOKEN_KEY);
  await SecureStore.deleteItemAsync(GUARD_KEY);
}
