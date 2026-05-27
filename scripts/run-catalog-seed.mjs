import { loadEnvLocal } from "./load-env-local.mjs";

if (!loadEnvLocal()) {
  console.error("Falta .env.local con credenciales de Supabase.");
  process.exit(1);
}

const { seedCatalogFromData } = await import("../src/lib/catalog/seed.ts");

seedCatalogFromData()
  .then((result) => {
    console.log("Catálogo sincronizado con Supabase:", result);
  })
  .catch((error) => {
    console.error("Error al sincronizar:", error instanceof Error ? error.message : error);
    process.exit(1);
  });
