import { loadEnvLocal } from "./load-env-local.mjs";

loadEnvLocal();

const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
const service = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

const missing = [];
if (!url) missing.push("NEXT_PUBLIC_SUPABASE_URL");
if (!anon) missing.push("NEXT_PUBLIC_SUPABASE_ANON_KEY");
if (!service) missing.push("SUPABASE_SERVICE_ROLE_KEY");

if (missing.length) {
  console.warn(
    "\n[gabi] Supabase incompleto en .env.local:",
    missing.join(", "),
    "\n→ Sin esto, local usa solo data.ts y puede diferir de producción.",
    "\n→ Copia .env.example a .env.local y usa las mismas variables que en Vercel.",
    "\n→ Tras configurar: npm run catalog:sync\n",
  );
  process.exit(0);
}

console.log("[gabi] Supabase configurado:", url.replace(/\/$/, ""));
