import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  // Expose the user id on the session (populated via the session callback).
  interface Session {
    user: {
      id: string;
    } & DefaultSession["user"];
  }
}
