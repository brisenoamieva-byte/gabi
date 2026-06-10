import { loadEnvLocal } from "./load-env-local.mjs";

if (!loadEnvLocal()) {
  process.exit(1);
}

const { seedCatalogFromData } = await import("../src/lib/catalog/seed.ts");
const result = await seedCatalogFromData();
console.log("Catálogo sincronizado:", result);
