import { NextResponse } from "next/server";
import {
  capturaLogStatusLabel,
  listCapturaLogs,
  type CapturaLogStatus,
} from "@/lib/admin/captura-logs-service";
import { canAccessModule } from "@/lib/admin/permissions";
import { getAdminSession } from "@/lib/admin/session";

const VALID_STATUS = new Set(Object.keys(capturaLogStatusLabel));

export async function GET(request: Request) {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  if (!canAccessModule(session.profile, "leads")) {
    return NextResponse.json({ error: "Sin permiso" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const desarrolloId = searchParams.get("desarrolloId");
  const statusParam = searchParams.get("status");
  const limitParam = searchParams.get("limit");

  if (!desarrolloId) {
    return NextResponse.json({ error: "Falta desarrolloId." }, { status: 400 });
  }

  const status =
    statusParam && VALID_STATUS.has(statusParam) ? (statusParam as CapturaLogStatus) : undefined;
  const limit = limitParam ? Math.min(Number(limitParam) || 100, 200) : 100;

  try {
    const logs = await listCapturaLogs({ desarrolloId, status, limit }, session.profile);
    return NextResponse.json({ logs });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error al listar logs" },
      { status: 500 },
    );
  }
}
