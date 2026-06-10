import { NextResponse } from "next/server";
import type { InvesttiDesarrolloReglas } from "@/lib/corredor/investti-simulador-data-types";
import { patchInvesttiSimuladorReglas } from "@/lib/admin/investti-simulador-service";
import { getAdminSession } from "@/lib/admin/session";
import { isSuperAdmin } from "@/lib/admin/permissions";

function validateReglas(reglas: Record<string, InvesttiDesarrolloReglas>): string | null {
  for (const [id, r] of Object.entries(reglas)) {
    if (!id.trim()) return "Desarrollo inválido.";
    if (r.engancheMinPct < 0.1 || r.engancheMinPct > 1) {
      return `Enganche mínimo fuera de rango en ${id}.`;
    }
    if (r.plazoMaxMeses < 1 || r.plazoMaxMeses > 120) {
      return `Plazo máximo fuera de rango en ${id}.`;
    }
    if (r.mensualidadMinima < 0) {
      return `Mensualidad mínima inválida en ${id}.`;
    }
    if (r.apartado < 0) {
      return `Apartado inválido en ${id}.`;
    }
  }
  return null;
}

export async function PATCH(request: Request) {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  if (!isSuperAdmin(session.profile)) {
    return NextResponse.json({ error: "Solo administrador gabi puede editar reglas." }, { status: 403 });
  }

  try {
    const body = (await request.json()) as {
      reglas?: Record<string, InvesttiDesarrolloReglas>;
    };

    if (!body.reglas || typeof body.reglas !== "object") {
      return NextResponse.json({ error: "reglas es requerido." }, { status: 400 });
    }

    const validation = validateReglas(body.reglas);
    if (validation) {
      return NextResponse.json({ error: validation }, { status: 400 });
    }

    const meta = await patchInvesttiSimuladorReglas(body.reglas, session.profile.id);
    return NextResponse.json({ meta, reglas: body.reglas });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error al guardar reglas" },
      { status: 400 },
    );
  }
}
