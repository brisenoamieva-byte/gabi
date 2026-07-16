import { NextResponse } from "next/server";
import { canAccessCrmComplianceApi, isSuperAdmin } from "@/lib/admin/permissions";
import { getAdminSession } from "@/lib/admin/session";
import {
  buildGarantiaReportForDesarrollo,
  sendGarantiaWeeklyForDesarrollo,
} from "@/lib/comercial/garantia-weekly-service";
import {
  buildGarantiaSlaPdfBytes,
  garantiaSlaPdfFilename,
} from "@/lib/comercial/garantia-sla-pdf";

export async function GET(request: Request) {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  if (!canAccessCrmComplianceApi(session.profile)) {
    return NextResponse.json({ error: "Sin permiso" }, { status: 403 });
  }

  const desarrolloId = new URL(request.url).searchParams.get("desarrolloId")?.trim();
  if (!desarrolloId) {
    return NextResponse.json({ error: "desarrolloId requerido." }, { status: 400 });
  }

  const format = new URL(request.url).searchParams.get("format");

  try {
    const { report, desarrolloNombre, campoConfig } =
      await buildGarantiaReportForDesarrollo(desarrolloId);

    if (format === "pdf") {
      const bytes = buildGarantiaSlaPdfBytes({
        desarrolloNombre,
        report,
        planLabel: campoConfig.garantiaContrato?.planLabel,
        contractNotes: campoConfig.garantiaContrato?.notes,
      });
      const filename = garantiaSlaPdfFilename(desarrolloNombre, report.generatedAt);
      return new NextResponse(Buffer.from(bytes), {
        status: 200,
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="${filename}"`,
        },
      });
    }

    return NextResponse.json({
      report,
      desarrolloNombre,
      contrato: campoConfig.garantiaContrato ?? null,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error al generar reporte." },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  if (!isSuperAdmin(session.profile) && !canAccessCrmComplianceApi(session.profile)) {
    return NextResponse.json({ error: "Sin permiso" }, { status: 403 });
  }

  try {
    const body = (await request.json()) as { desarrolloId?: string; force?: boolean };
    const desarrolloId = body.desarrolloId?.trim();
    if (!desarrolloId) {
      return NextResponse.json({ error: "desarrolloId requerido." }, { status: 400 });
    }

    const result = await sendGarantiaWeeklyForDesarrollo(desarrolloId, {
      force: body.force !== false,
    });

    return NextResponse.json({ ok: true, result });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error al enviar reporte." },
      { status: 500 },
    );
  }
}
