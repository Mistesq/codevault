// No-op stub for the `server-only` package in unit tests.
//
// The real package throws on import outside a React Server Component graph to
// stop server code leaking into client bundles. Under Vitest (a Node runner)
// that guard is irrelevant and would break every test that imports a
// server-scoped module, so `vitest.config.mts` aliases `server-only` here.
export {};
