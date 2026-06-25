import GitHub from "next-auth/providers/github";
import type { NextAuthConfig } from "next-auth";

// Edge-safe config: providers only, no database adapter. Shared by the full
// Node-runtime instance (auth.ts) and the proxy (src/proxy.ts) so route
// protection never has to import Prisma.
export default {
  providers: [GitHub],
} satisfies NextAuthConfig;
