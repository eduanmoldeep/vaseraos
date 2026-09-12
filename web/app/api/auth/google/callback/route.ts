import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { SESSION_COOKIE, createSession, findOrCreateGoogleUser, sessionCookieOptions } from "@/lib/auth";
import { getEnv } from "@/lib/cloudflare";

export const runtime = "nodejs";

const GOOGLE_STATE_COOKIE = "vasera_google_state";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const jar = await cookies();
  const expectedState = jar.get(GOOGLE_STATE_COOKIE)?.value;
  jar.delete(GOOGLE_STATE_COOKIE);

  if (!code || !state || !expectedState || state !== expectedState) {
    return NextResponse.redirect(new URL("/?error=google_login_failed", url.origin));
  }

  const env = await getEnv();
  const clientId = env?.GOOGLE_CLIENT_ID;
  const clientSecret = env?.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    return NextResponse.json({ error: "Google login is not configured." }, { status: 500 });
  }

  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: `${url.origin}/api/auth/google/callback`,
      grant_type: "authorization_code",
    }),
  });
  if (!tokenRes.ok) return NextResponse.redirect(new URL("/?error=google_login_failed", url.origin));
  const tokens = (await tokenRes.json()) as { access_token: string };

  const profileRes = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
    headers: { authorization: `Bearer ${tokens.access_token}` },
  });
  if (!profileRes.ok) return NextResponse.redirect(new URL("/?error=google_login_failed", url.origin));
  const profile = (await profileRes.json()) as { sub: string; email: string; name?: string };
  if (!profile.email) return NextResponse.redirect(new URL("/?error=google_login_failed", url.origin));

  const user = await findOrCreateGoogleUser(profile.sub, profile.email, profile.name ?? profile.email);
  jar.set(SESSION_COOKIE, await createSession(user.id), sessionCookieOptions());
  return NextResponse.redirect(new URL("/", url.origin));
}
