import { NextResponse } from "next/server";
import { extractInvesttiSimuladorFromBuffer } from "@/lib/corredor/investti-simulador-extract";
import { publishInvesttiSimulador } from "@/lib/admin/investti-simulador-service";
import { getAdminSession } from "@/lib/admin/session";
import { isSuperAdmin } from "@/lib/admin/permissions";

export async function POST(request: Request) {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  if (!isSuperAdmin(session.profile)) {
    return NextResponse.json({ error: "Solo administrador gabi puede publicar." }, { status: 403 });
  }

  try {
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Archivo .xlsm requerido." }, { status: 400 });
    }

    if (!/\.xlsm$/i.test(file.name)) {
      return NextResponse.json({ error: "Solo se acepta Simulador Master Investti (.xlsm)." }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const payload = extractInvesttiSimuladorFromBuffer(buffer, file.name);
    const meta = await publishInvesttiSimulador(payload, session.profile.id);

    return NextResponse.json({
      meta,
      reglas: payload.reglas,
      stats: payload.stats,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error al importar Excel" },
      { status: 400 },
    );
  }
}
