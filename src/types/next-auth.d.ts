import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  // Expose the user id + Pro flag on the session (populated via the callbacks).
  interface Session {
    user: {
      id: string;
      isPro: boolean;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  // The Pro flag is re-read from the DB on every jwt() pass (see src/auth.ts).
  interface JWT {
    isPro?: boolean;
  }
}
