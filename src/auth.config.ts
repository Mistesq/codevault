import GitHub from "next-auth/providers/github";
import Credentials from "next-auth/providers/credentials";
import type { NextAuthConfig } from "next-auth";

// Edge-safe config: providers only, no database adapter. Shared by the full
// Node-runtime instance (auth.ts) and the proxy (src/proxy.ts) so route
// protection never has to import Prisma.
//
// The Credentials provider here is a placeholder — its `authorize` always
// returns null. The real bcrypt + Prisma validation lives in auth.ts (Node
// runtime), which overrides this provider. Keeping the heavy logic out of the
// shared config is what keeps the proxy edge-safe.
export default {
  providers: [
    GitHub,
    Credentials({
      credentials: {
        email: {},
        password: {},
      },
      authorize: () => null,
    }),
  ],
} satisfies NextAuthConfig;
