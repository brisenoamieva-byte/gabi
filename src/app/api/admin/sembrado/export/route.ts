import { NextResponse } from "next/server";
import {
  listOperaciones,
  listSembradoUnidades,
} from "@/lib/admin/operaciones-service";
import { canAccessDesarrollo, canAccessModule } from "@/lib/admin/permissions";
import { getAdminSession } from "@/lib/admin/session";
import { buildXlsxBuffer, excelFilename, xlsxResponse } from "@/lib/admin/excel-export";
import { sembradoToExcelSheets } from "@/lib/admin/exports/sembrado-excel";
import { createSupabaseServiceClient } from "@/lib/supabase/service";

export async function GET(request: Request) {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  if (!canAccessModule(session.profile, "sembrado")) {
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

  try {
    const [unidades, operaciones] = await Promise.all([
      listSembradoUnidades({ desarrolloId }, session.profile),
      listOperaciones({ desarrolloId, includeCanceladas: true }, session.profile),
    ]);

    const operacionIds = operaciones.map((op) => op.id);
    let cobranza: Array<{
      id: string;
      operacion_id: string;
      mes: string;
      monto: number;
      created_at?: string;
    }> = [];

    if (operacionIds.length) {
      const supabase = createSupabaseServiceClient();
      if (supabase) {
        const { data, error } = await supabase
          .from("cobranza_mensual")
          .select("id, operacion_id, mes, monto, created_at")
          .in("operacion_id", operacionIds)
          .order("mes", { ascending: true });
        if (error) {
          throw new Error(error.message);
        }
        cobranza = (data ?? []).map((row) => ({
          id: String(row.id),
          operacion_id: String(row.operacion_id),
          mes: String(row.mes).slice(0, 10),
          monto: Number(row.monto ?? 0),
          created_at: row.created_at ? String(row.created_at) : undefined,
        }));
      }
    }

    const buffer = buildXlsxBuffer(
      sembradoToExcelSheets({ unidades, operaciones, cobranza }),
    );
    return xlsxResponse(buffer, excelFilename("sembrado", desarrolloId));
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error al exportar sembrado." },
      { status: 400 },
    );
  }
}
