import NextAuth, { CredentialsSignin } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import authConfig from "@/auth.config";
import { isEmailVerificationEnabled } from "@/lib/auth/email-verification";
import { signInSchema } from "@/lib/validations/auth";
import { RATE_LIMITS, checkRateLimit, getClientIp } from "@/lib/rate-limit";

// Thrown when credentials are valid but the email hasn't been verified yet. The
// `code` is surfaced to the client (via signIn's returned `code`) so the sign-in
// UI can show a "verify your email" message and offer to resend the link.
class EmailNotVerifiedError extends CredentialsSignin {
  code = "email_not_verified";
}

// Thrown when too many sign-in attempts come from the same IP + email. NextAuth
// owns the /api/auth/callback/credentials route, so we can't return a real 429
// here — instead surface a `code` the sign-in UI maps to a friendly message.
class RateLimitError extends CredentialsSignin {
  code = "rate_limited";
}

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
      authorize: async (credentials, request) => {
        const parsed = signInSchema.safeParse(credentials);
        if (!parsed.success) return null;

        const { email, password } = parsed.data;

        // Throttle brute-force / credential-stuffing by IP + email before doing
        // any password work. Fails open if Upstash is unavailable.
        const ip = getClientIp(request.headers);
        const limit = await checkRateLimit(RATE_LIMITS.login, `${ip}:${email}`);
        if (!limit.success) throw new RateLimitError();

        const user = await prisma.user.findUnique({
          where: { email },
          select: {
            id: true,
            email: true,
            name: true,
            image: true,
            password: true,
            emailVerified: true,
          },
        });

        // No account, or an OAuth-only account with no password set.
        if (!user?.password) return null;

        const passwordMatches = await bcrypt.compare(password, user.password);
        if (!passwordMatches) return null;

        // Credentials are valid but the email isn't verified — block sign-in and
        // signal the UI to prompt for verification. (Only reachable with the
        // correct password, so this doesn't enable user enumeration.) Skipped
        // entirely when email verification is disabled.
        if (isEmailVerificationEnabled() && !user.emailVerified) {
          throw new EmailNotVerifiedError();
        }

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
