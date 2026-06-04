import { loadEnvLocal } from "./load-env-local.mjs";

loadEnvLocal();

const { testGoogleDriveConnection } = await import("../src/lib/integrations/google-drive-service.ts");

try {
  const result = await testGoogleDriveConnection("pasaje-alamos");
  console.log("\n[gabi] Google Drive OK para Pasaje Álamos");
  console.log("  Carpeta:", result.folderName);
  console.log("  ID:", result.folderId);
  console.log("  URL: https://drive.google.com/drive/folders/" + result.folderId + "\n");
} catch (error) {
  console.error(
    "\n[gabi] Google Drive falló:",
    error instanceof Error ? error.message : error,
    "\n→ Revisa que la cuenta de servicio tenga acceso al disco compartido.\n",
  );
  process.exit(1);
}
