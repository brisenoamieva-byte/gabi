import { NextResponse } from "next/server";
import { isSuperAdmin } from "@/lib/admin/permissions";
import { getAdminSession } from "@/lib/admin/session";
import { seedCatalogFromData } from "@/lib/catalog/seed";

const seedsAllowed =
  process.env.NODE_ENV !== "production" || process.env.GABI_ADMIN_SEEDS === "1";

export async function POST() {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  if (!isSuperAdmin(session.profile)) {
    return NextResponse.json({ error: "Solo superadmin puede importar catálogo." }, { status: 403 });
  }

  if (!seedsAllowed) {
    return NextResponse.json(
      { error: "Importar catálogo deshabilitado en producción. Usa GABI_ADMIN_SEEDS=1 si es necesario." },
      { status: 403 },
    );
  }

  try {
    const result = await seedCatalogFromData();
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error al importar catálogo" },
      { status: 500 },
    );
  }
}
