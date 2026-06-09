import { loadEnvLocal } from "./load-env-local.mjs";

if (!loadEnvLocal()) {
  console.error("Falta .env.local con credenciales de Supabase.");
  process.exit(1);
}

const { seedCatalogFromData } = await import("../src/lib/catalog/seed.ts");
const { syncAsesoresDesarrollosFromData } = await import("../src/lib/asesores/seed.ts");

seedCatalogFromData()
  .then(async (catalogResult) => {
    console.log("Catálogo sincronizado con Supabase:", catalogResult);
    const asesoresResult = await syncAsesoresDesarrollosFromData();
    console.log("Asesores BBR alineados con data.ts:", asesoresResult);
  })
  .catch((error) => {
    console.error("Error al sincronizar:", error instanceof Error ? error.message : error);
    process.exit(1);
  });
