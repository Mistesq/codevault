import NextAuth from "next-auth";
import { NextResponse } from "next/server";
import authConfig from "@/auth.config";

// Next.js 16 proxy runs on the Node.js runtime, but we still build a dedicated,
// adapter-free auth instance from the edge-safe config — it only needs to read
// the JWT cookie, never the database.
const { auth } = NextAuth(authConfig);

export const proxy = auth((req) => {
  if (!req.auth) {
    // Send unauthenticated users to the custom sign-in page and bring them back
    // to where they were headed afterwards.
    const signInUrl = new URL("/sign-in", req.nextUrl.origin);
    signInUrl.searchParams.set("callbackUrl", req.nextUrl.href);
    return NextResponse.redirect(signInUrl);
  }
});

// Every route wrapped in the authenticated AppShell. AppShell's own `auth()`
// check is the real guard (defense-in-depth); this matcher lets the edge proxy
// redirect unauthenticated users before the page renders. Keep in sync with the
// AppShell-wrapped routes under src/app.
export const config = {
  matcher: [
    "/dashboard/:path*",
    "/profile/:path*",
    "/settings/:path*",
    "/favorites/:path*",
    "/pinned/:path*",
    "/recent/:path*",
    "/items/:path*",
    "/collections/:path*",
    "/upgrade/:path*",
  ],
};
