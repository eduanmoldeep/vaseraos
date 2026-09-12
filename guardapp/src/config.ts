// EXPO_PUBLIC_-prefixed env vars are inlined by Expo at build time — no extra config wiring needed.
// Set via `.env` (staging) / EAS build profile env (prod) once those exist; localhost is the dev default.
export const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL ?? "http://localhost:3000";
