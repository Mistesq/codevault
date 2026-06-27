import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// Unit-test config for CodeVault. Scope is server actions + utilities only — we
// do not test React components, so there's no jsdom / React Testing Library here
// and the environment stays `node`.
//
// `resolve.tsconfigPaths` wires up the `@/*` alias from tsconfig so tests import
// the same way app code does. `server-only` is aliased to a no-op stub because
// that package throws when imported outside a React Server Component graph
// (which is exactly what a Node test runner is).
export default defineConfig({
  resolve: {
    tsconfigPaths: true,
    alias: {
      "server-only": fileURLToPath(
        new URL("./test/stubs/server-only.ts", import.meta.url),
      ),
    },
  },
  test: {
    environment: "node",
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
  },
});
