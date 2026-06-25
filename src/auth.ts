import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import authConfig from "@/auth.config";
import { signInSchema } from "@/lib/validations/auth";

// Full auth instance: Prisma adapter for account/user persistence plus the JWT
// session strategy (required when mixing OAuth with the Credentials provider).
// The edge-safe providers come from auth.config.ts; here we swap the Credentials
// placeholder for the real bcrypt-backed validation, which needs Prisma + the
// Node runtime and so must stay out of the shared (edge) config.
const { providers, ...restConfig } = authConfig;

export const { auth, handlers, signIn, signOut } = NextAuth({
  ...restConfig,
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" },
  providers: providers.map((provider) => {
    // GitHub is passed as a function reference; leave it untouched. Replace the
    // Credentials placeholder from auth.config.ts with the real authorize logic.
    if (typeof provider === "function") return provider;
    if (provider.id !== "credentials") return provider;

    return Credentials({
      credentials: {
        email: {},
        password: {},
      },
      authorize: async (credentials) => {
        const parsed = signInSchema.safeParse(credentials);
        if (!parsed.success) return null;

        const { email, password } = parsed.data;

        const user = await prisma.user.findUnique({
          where: { email },
          select: { id: true, email: true, name: true, image: true, password: true },
        });

        // No account, or an OAuth-only account with no password set.
        if (!user?.password) return null;

        const passwordMatches = await bcrypt.compare(password, user.password);
        if (!passwordMatches) return null;

        // Never leak the password hash into the session/JWT.
        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
        };
      },
    });
  }),
  callbacks: {
    session({ session, token }) {
      // Under the JWT strategy the user id lives in the standard `sub` claim.
      if (token.sub) {
        session.user.id = token.sub;
      }
      return session;
    },
  },
});
