import { NextResponse } from "next/server";
import { isSuperAdmin } from "@/lib/admin/permissions";
import { getAdminSession } from "@/lib/admin/session";
import { isGoogleDriveConfiguredForDesarrollo } from "@/lib/integrations/google-drive-config";
import { testGoogleDriveConnection } from "@/lib/integrations/google-drive-service";

export async function GET() {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  if (!isSuperAdmin(session.profile)) {
    return NextResponse.json({ error: "Solo super admin" }, { status: 403 });
  }

  const desarrolloId = "pasaje-alamos";
  if (!isGoogleDriveConfiguredForDesarrollo(desarrolloId)) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "Faltan GOOGLE_SERVICE_ACCOUNT_* o GOOGLE_DRIVE_PASAJE_ALAMOS_FOLDER_ID en el servidor.",
      },
      { status: 400 },
    );
  }

  try {
    const result = await testGoogleDriveConnection(desarrolloId);
    return NextResponse.json({
      ok: true,
      desarrolloId,
      folderName: result.folderName,
      folderId: result.folderId,
      folderUrl: `https://drive.google.com/drive/folders/${result.folderId}`,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Error al conectar con Drive.",
      },
      { status: 500 },
    );
  }
}
