// Reads CONTEXT7_API_KEY from the project .env and emits it as an MCP auth header.
import { readFileSync } from "node:fs";

// Resolve .env relative to this script, so CWD doesn't matter
const content = readFileSync(new URL("../.env", import.meta.url), "utf8");
const match = content.match(/^CONTEXT7_API_KEY\s*=\s*(.*)$/m);
const key = match ? match[1].trim().replace(/^["']|["']$/g, "") : "";

process.stdout.write(JSON.stringify({ CONTEXT7_API_KEY: key }));
