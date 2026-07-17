import { NextResponse } from "next/server";
import { listProspectos } from "@/lib/admin/prospectos-service";
import { canAccessDesarrollo, canAccessModule } from "@/lib/admin/permissions";
import { getAdminSession } from "@/lib/admin/session";
import { buildXlsxBuffer, excelFilename, xlsxResponse } from "@/lib/admin/excel-export";
import { prospectosToExcelSheet } from "@/lib/admin/exports/prospectos-excel";

export async function GET(request: Request) {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  if (!canAccessModule(session.profile, "leads")) {
    return NextResponse.json({ error: "Sin permiso" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const desarrolloId = searchParams.get("desarrolloId")?.trim();
  if (!desarrolloId) {
    return NextResponse.json({ error: "desarrolloId requerido." }, { status: 400 });
  }
  if (!canAccessDesarrollo(session.profile, desarrolloId)) {
    return NextResponse.json({ error: "Sin permiso para este desarrollo." }, { status: 403 });
  }

  const etapa = searchParams.get("etapa") ?? undefined;
  const asesorId = searchParams.get("asesorId") ?? undefined;
  const campanaId = searchParams.get("campanaId") ?? undefined;
  const partnerId = searchParams.get("partnerId") ?? undefined;
  const search = searchParams.get("search") ?? undefined;
  const desde = searchParams.get("desde") ?? undefined;
  const hasta = searchParams.get("hasta") ?? undefined;
  const spam = (searchParams.get("spam") as "exclude" | "only" | "include" | null) ?? "include";
  const duplicados =
    (searchParams.get("duplicados") as "exclude" | "only" | "include" | null) ?? "include";
  const nivelInteres = searchParams.get("nivelInteres") ?? undefined;
  const calificacionLeadRaw = searchParams.get("calificacionLead");
  const calificacionLead =
    calificacionLeadRaw === "A" ||
    calificacionLeadRaw === "B" ||
    calificacionLeadRaw === "C" ||
    calificacionLeadRaw === "sin"
      ? calificacionLeadRaw
      : undefined;

  try {
    const prospectos = await listProspectos(
      {
        desarrolloId,
        etapa,
        asesorId,
        campanaId,
        partnerId,
        search,
        desde,
        hasta,
        spam,
        duplicados,
        nivelInteres,
        calificacionLead,
      },
      session.profile,
    );

    const buffer = buildXlsxBuffer([prospectosToExcelSheet(prospectos)]);
    return xlsxResponse(buffer, excelFilename("prospectos", desarrolloId));
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error al exportar prospectos." },
      { status: 400 },
    );
  }
}
