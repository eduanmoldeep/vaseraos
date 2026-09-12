import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { getEnv } from "@/lib/cloudflare";

export const runtime = "nodejs";

const GOOGLE_STATE_COOKIE = "vasera_google_state";

/** Redirects to Google's consent screen. State is CSRF protection, checked in the callback. */
export async function GET(req: Request) {
  const env = await getEnv();
  const clientId = env?.GOOGLE_CLIENT_ID;
  if (!clientId) return NextResponse.json({ error: "Google login is not configured." }, { status: 500 });

  const state = randomBytes(16).toString("hex");
  const redirectUri = `${new URL(req.url).origin}/api/auth/google/callback`;

  const authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  authUrl.searchParams.set("client_id", clientId);
  authUrl.searchParams.set("redirect_uri", redirectUri);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("scope", "openid email profile");
  authUrl.searchParams.set("state", state);

  const res = NextResponse.redirect(authUrl);
  res.cookies.set(GOOGLE_STATE_COOKIE, state, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 600,
  });
  return res;
}
