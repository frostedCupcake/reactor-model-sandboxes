import { spawnSync } from "node:child_process";
import { readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const files = ["shared.js", "token-server.js", "scripts/check.mjs"];

for (const entry of readdirSync(root, { withFileTypes: true })) {
  if (entry.isDirectory() && entry.name !== "scripts" && entry.name !== "node_modules") {
    files.push(join(entry.name, "sandbox.js"));
  }
}

for (const file of files) {
  const result = spawnSync(process.execPath, ["--check", join(root, file)], { encoding: "utf8" });
  if (result.status !== 0) {
    process.stderr.write(result.stderr);
    process.exit(result.status || 1);
  }
}

console.log(`Checked ${files.length} source files.`);
