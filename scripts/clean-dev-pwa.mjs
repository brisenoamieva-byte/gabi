import { existsSync, readdirSync, rmSync, unlinkSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const publicDir = join(root, "public");
const fullReset = process.argv.includes("--full");

for (const name of readdirSync(publicDir)) {
  if (
    name === "sw.js" ||
    name.startsWith("workbox-") ||
    name.startsWith("fallback-")
  ) {
    unlinkSync(join(publicDir, name));
    console.log(`Removed public/${name}`);
  }
}

if (fullReset) {
  const nextDir = join(root, ".next");
  if (existsSync(nextDir)) {
    rmSync(nextDir, { recursive: true, force: true });
    console.log("Removed .next/");
  }
}
