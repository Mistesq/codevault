import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";
import authConfig from "@/auth.config";

// Full auth instance: Prisma adapter for account/user persistence plus the JWT
// session strategy (required when mixing OAuth with the Credentials provider
// later). The edge-safe providers come from auth.config.ts.
export const { auth, handlers, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" },
  callbacks: {
    session({ session, token }) {
      // Under the JWT strategy the user id lives in the standard `sub` claim.
      if (token.sub) {
        session.user.id = token.sub;
      }
      return session;
    },
  },
  ...authConfig,
});
