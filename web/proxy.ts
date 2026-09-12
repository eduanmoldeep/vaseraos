import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Security proxy: never serve dotfiles or toolchain config.
 * Blocks /.env*, /.git/*, /.dev.vars, /.wrangler, etc. with a 404
 * so secret paths are neither readable nor enumerable.
 * `/.well-known/*` stays public (ACME challenges, security.txt).
 */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/.well-known/")) {
    return NextResponse.next();
  }

  const firstSegment = pathname.split("/")[1] ?? "";
  if (firstSegment.startsWith(".")) {
    return new NextResponse("Not Found", { status: 404 });
  }

  return NextResponse.next();
}

export const config = {
  // Only invoke on requests whose first path segment is a dotfile.
  matcher: ["/.:file", "/.:file/:path*"],
};
