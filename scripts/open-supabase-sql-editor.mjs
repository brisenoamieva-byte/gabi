/**
 * Abre Supabase SQL Editor para pegar migraciones manualmente.
 *   npm run db:open-sql-editor
 */
import { execSync } from "node:child_process";
import { loadEnvLocalIntoProcess } from "./resolve-supabase-db-url.mjs";

loadEnvLocalIntoProcess();

const ref = process.env.NEXT_PUBLIC_SUPABASE_URL?.match(/https:\/\/([^.]+)\.supabase\.co/i)?.[1];
if (!ref) {
  console.error("Falta NEXT_PUBLIC_SUPABASE_URL en .env.local");
  process.exit(1);
}

const url = `https://supabase.com/dashboard/project/${ref}/sql/new`;
console.log("Abriendo SQL Editor:", url);
console.log("Pega: supabase/migrations/_bundle_037_038_apply_once.sql");

const platform = process.platform;
try {
  if (platform === "win32") {
    execSync(`start "" "${url}"`, { shell: true });
  } else if (platform === "darwin") {
    execSync(`open "${url}"`);
  } else {
    execSync(`xdg-open "${url}"`);
  }
} catch {
  console.log("No se pudo abrir el navegador. Usa la URL de arriba.");
}
