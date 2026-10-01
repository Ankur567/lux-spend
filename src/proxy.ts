import NextAuth from "next-auth";
import { NextResponse } from "next/server";
import { authConfig } from "@/lib/auth/auth.config";

const { auth } = NextAuth(authConfig);

const PUBLIC_PREFIXES = ["/login", "/register", "/forgot-password", "/reset-password", "/invite", "/offline"];
const AUTH_PAGES = ["/login", "/register"];

/**
 * Optimistic route protection only (cookie presence/validity). Every page,
 * server action and route handler still verifies the session and couple-space
 * membership against the database.
 */
export default auth((req) => {
  const { pathname, search } = req.nextUrl;
  const isLoggedIn = Boolean(req.auth?.user);
  const isPublic = PUBLIC_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));

  if (!isLoggedIn && !isPublic) {
    const url = new URL("/login", req.nextUrl);
    if (pathname !== "/") url.searchParams.set("callbackUrl", pathname + search);
    return NextResponse.redirect(url);
  }

  if (isLoggedIn && AUTH_PAGES.includes(pathname)) {
    const invite = req.nextUrl.searchParams.get("invite");
    return NextResponse.redirect(new URL(invite ? `/invite/${encodeURIComponent(invite)}` : "/", req.nextUrl));
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|icon|apple-icon|manifest.webmanifest|sw.js|icons/).*)",
  ],
};
