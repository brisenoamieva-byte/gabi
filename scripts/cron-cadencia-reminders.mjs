/**
 * Dispara manualmente el cron de recordatorios de cadencia (requiere CRON_SECRET en .env.local).
 * Uso: npm run cron:cadencia-reminders
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const loadEnvLocal = () => {
  try {
    const raw = readFileSync(resolve(process.cwd(), ".env.local"), "utf8");
    for (const line of raw.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq <= 0) continue;
      const key = trimmed.slice(0, eq).trim();
      const value = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, "");
      if (!process.env[key]) process.env[key] = value;
    }
  } catch {
    // .env.local opcional
  }
};

loadEnvLocal();

const secret = process.env.CRON_SECRET?.trim();
const port = process.env.PORT ?? "3000";
const baseUrl = process.env.SITE_URL?.replace(/\/$/, "") ?? `http://localhost:${port}`;

if (!secret) {
  console.error("Falta CRON_SECRET en el entorno.");
  process.exit(1);
}

const url = `${baseUrl}/api/cron/cadencia-reminders`;

const response = await fetch(url, {
  headers: { Authorization: `Bearer ${secret}` },
});

const body = await response.text();
console.log(response.status, body);

if (!response.ok) {
  process.exit(1);
}
