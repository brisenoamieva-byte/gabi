import { NextResponse } from "next/server";
import { canAccessModule, canDeleteProspectos, canReassignProspectos } from "@/lib/admin/permissions";
import { getAdminSession } from "@/lib/admin/session";

export async function GET() {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ authenticated: false });
  }

  return NextResponse.json({
    authenticated: true,
    nombre: session.profile.nombre,
    rol: session.profile.rol,
    desarrollosIds: session.profile.desarrollosIds,
    canEditSembrado: canAccessModule(session.profile, "sembrado"),
    canDeleteProspectos: canDeleteProspectos(session.profile),
    canReassignProspectos: canReassignProspectos(session.profile),
  });
}
